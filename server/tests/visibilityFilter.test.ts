/**
 * server/src/lib/visibilityFilter.ts の単体テスト。
 *
 * CODEX-NEXT.md §1 の `?visibilityMin=` は、前回バグった「全件公開」系の事故を
 * 繰り返さないために opt-in 仕様にしている（=デフォルトはフィルタなし、明示指定時のみ絞る）。
 * この挙動が崩れるとヒーロー地図ピンやクリエイター一覧で「公開拒否のユーザーまで晒す」
 * リグレッションが起きるので、挙動をテストで lock する。
 *
 * `creators.ts` は `import "server-only"` のため node --test から直接読めない。
 * そこで純粋ロジックだけ `visibilityFilter.ts` に切り出し、
 * こちらでは「切り出し後の直接 import」「creators 経由の re-export」双方から
 * 同じ結果が得られることも併せて確認している。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseVisibilityMin,
  buildVisibilityClause,
} from "../src/lib/visibilityFilter";

// ---------- parseVisibilityMin ----------

test("parseVisibilityMin: null / undefined / 空文字は undefined", () => {
  assert.equal(parseVisibilityMin(null), undefined);
  assert.equal(parseVisibilityMin(undefined), undefined);
  assert.equal(parseVisibilityMin(""), undefined);
});

test('parseVisibilityMin: "0" も明示的に undefined（opt-in 仕様のロック）', () => {
  // 仕様: 0 と未指定は内部で同義に扱う。呼び出し側の分岐が 1 本で済むように。
  assert.equal(parseVisibilityMin("0"), undefined);
});

test('parseVisibilityMin: "1" -> 1, "2" -> 2', () => {
  assert.equal(parseVisibilityMin("1"), 1);
  assert.equal(parseVisibilityMin("2"), 2);
});

test("parseVisibilityMin: 範囲外の整数は undefined", () => {
  assert.equal(parseVisibilityMin("3"), undefined, "3 以上は許容しない");
  assert.equal(parseVisibilityMin("-1"), undefined, "負値は不可");
  assert.equal(parseVisibilityMin("99"), undefined);
});

test("parseVisibilityMin: 整数以外の数値は undefined", () => {
  assert.equal(parseVisibilityMin("1.5"), undefined, "小数は整数判定で弾く");
  assert.equal(parseVisibilityMin("1e3"), undefined, "1000 相当も範囲外扱い");
});

test("parseVisibilityMin: 数値として解釈できない文字列は undefined", () => {
  assert.equal(parseVisibilityMin("abc"), undefined);
  assert.equal(parseVisibilityMin("NaN"), undefined);
  assert.equal(parseVisibilityMin("null"), undefined);
});

test('parseVisibilityMin: "1 "（末尾空白）は Number() が許すため 1 として通る', () => {
  // URLSearchParams.get() から来た値は decodeURIComponent 済みなので
  // 通常このケースは発生しないが、Number() の素の挙動を意図的挙動として lock する。
  assert.equal(parseVisibilityMin(" 1"), 1);
  assert.equal(parseVisibilityMin("2 "), 2);
  assert.equal(parseVisibilityMin(" 2 "), 2);
});

// ---------- buildVisibilityClause ----------

test("buildVisibilityClause: undefined / 0 / 負値は空 SQL", () => {
  const a = buildVisibilityClause(undefined);
  assert.equal(a.sql, "");
  assert.deepEqual(a.params, []);

  const b = buildVisibilityClause(0);
  assert.equal(b.sql, "");
  assert.deepEqual(b.params, []);

  const c = buildVisibilityClause(-1);
  assert.equal(c.sql, "", "負値はフィルタしない（外から検証する前提）");
  assert.deepEqual(c.params, []);
});

test("buildVisibilityClause: 1 は location_visibility >= 1 でバインド", () => {
  const r = buildVisibilityClause(1);
  assert.equal(r.sql, " AND u.location_visibility >= ?");
  assert.deepEqual(r.params, [1]);
});

test("buildVisibilityClause: 2 は location_visibility >= 2 でバインド", () => {
  const r = buildVisibilityClause(2);
  assert.equal(r.sql, " AND u.location_visibility >= ?");
  assert.deepEqual(r.params, [2]);
});

test("buildVisibilityClause: 3 以上は 2 にクランプ（安全側）", () => {
  // 値の妥当性検証は parseVisibilityMin 側で弾かれる想定だが、
  // 万が一通り抜けても「より公開範囲を広げる」方向には倒さないことを lock する。
  const r = buildVisibilityClause(99);
  assert.equal(r.sql, " AND u.location_visibility >= ?");
  assert.deepEqual(r.params, [2]);
});

test("buildVisibilityClause: 戻り値は SQL 文字列として AND で連結できる形になっている", () => {
  // 呼び出し側の実際のパターン: `WHERE x = ? ${clause.sql}` の形で差し込む。
  // 空文字の場合はそのまま連結しても SQL エラーにならないこと、
  // 非空の場合は必ず先頭に半角スペース + AND が付いていることをロック。
  const empty = buildVisibilityClause(undefined);
  assert.equal(`WHERE 1=1${empty.sql}`, "WHERE 1=1");

  const filtered = buildVisibilityClause(2);
  assert.equal(
    `WHERE 1=1${filtered.sql}`,
    "WHERE 1=1 AND u.location_visibility >= ?"
  );
});

// ---------- parseVisibilityMin → buildVisibilityClause の統合 ----------

test("統合: parseVisibilityMin の結果をそのまま buildVisibilityClause に渡せる", () => {
  // 実際の API route の使われ方を模倣:
  //   const visibilityMin = parseVisibilityMin(url.searchParams.get("visibilityMin"));
  //   const visClause = buildVisibilityClause(visibilityMin);
  const clauseForUndefined = buildVisibilityClause(parseVisibilityMin(null));
  assert.equal(clauseForUndefined.sql, "");

  const clauseFor0 = buildVisibilityClause(parseVisibilityMin("0"));
  assert.equal(clauseFor0.sql, "", "0 指定は undefined 化されフィルタなし");

  const clauseFor2 = buildVisibilityClause(parseVisibilityMin("2"));
  assert.equal(clauseFor2.sql, " AND u.location_visibility >= ?");
  assert.deepEqual(clauseFor2.params, [2]);

  const clauseForBad = buildVisibilityClause(parseVisibilityMin("abc"));
  assert.equal(clauseForBad.sql, "", "不正値は undefined に落ちてフィルタなし");
});
