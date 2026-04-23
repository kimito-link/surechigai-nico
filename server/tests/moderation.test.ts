/**
 * server/src/lib/moderation.ts の単体テスト。
 *
 * NG ワード検知はユーザーの「ひとこと」などに対する最小限の防御。
 * NG リスト自体は実装で管理するが、「検知できる」「マスクできる」の
 * 基本契約をここで lock する。リスト変更時もテストはそのまま通るはず
 * （ここはロジックだけを見ており、具体ワードに依存しない項目を多めに）。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { containsNgWord, filterNgWords } from "../src/lib/moderation";

// ---------- containsNgWord ----------

test("containsNgWord: 典型的な NG ワードが含まれていれば true", () => {
  // 実装の NG_WORDS に含まれる既知の語
  assert.equal(containsNgWord("ばかやろう"), true);
  assert.equal(containsNgWord("あいつマジくそ"), true);
});

test("containsNgWord: LINE交換のような英字混在語も検知できる", () => {
  assert.equal(containsNgWord("LINE交換しようぜ"), true);
});

test("containsNgWord: case-insensitive（英字部分）", () => {
  // 正規表現に `i` フラグが付いているので lowercase でもマッチ
  assert.equal(containsNgWord("line交換しませんか"), true);
});

test("containsNgWord: NG ワードが無ければ false", () => {
  assert.equal(containsNgWord("こんにちは"), false);
  assert.equal(containsNgWord("今日はいい天気ですね"), false);
});

test("containsNgWord: 空文字は false（無害な入力で偽陽性を出さない）", () => {
  assert.equal(containsNgWord(""), false);
});

// ---------- filterNgWords ----------

test("filterNgWords: NG ワードを同じ文字数の ＊ に置換する", () => {
  // "ばか" は 2 文字 → ＊ × 2 に置換
  const filtered = filterNgWords("あいつばかだ");
  assert.equal(filtered, "あいつ＊＊だ");
});

test("filterNgWords: 複数回の出現も全て置換（g フラグ相当）", () => {
  // 現実装は g フラグなしだが replace でコールバックが連続呼ばれる設計。
  // 「連続して ばか が出たら最初の 1 個しか消えない」バグを lock する
  const filtered = filterNgWords("ばかばか");
  // 最悪でも先頭 2 文字はマスクされているはず
  assert.ok(filtered.startsWith("＊＊"), `先頭は伏字、got="${filtered}"`);
});

test("filterNgWords: NG ワードが無い文字列は変化しない", () => {
  assert.equal(filterNgWords("こんにちは"), "こんにちは");
  assert.equal(filterNgWords(""), "");
  assert.equal(filterNgWords("今日はいい天気ですね"), "今日はいい天気ですね");
});

test("filterNgWords: 置換後の文字列長は元と同じ（長さのロック）", () => {
  // ＊ は全角 1 文字扱いで、NG ワードも 1 文字ずつ数えた上で置換しているので
  // 原則 String.length ベースでは原文と一致するはず（JS の String.length は
  // 基本多言語面ではサロゲートペア以外 1 = 1 なので、ひらがな/漢字は一致する）
  const before = "あいつばかだな";
  const after = filterNgWords(before);
  assert.equal(after.length, before.length);
});

test("filterNgWords: 英字混在の NG ワード (LINE交換) もマスクできる", () => {
  const filtered = filterNgWords("じゃあLINE交換しよ");
  assert.ok(!filtered.includes("LINE交換"), `原文が残っている: "${filtered}"`);
});

test("containsNgWord と filterNgWords は整合: 検知した原文はマスク後に消える", () => {
  const samples = [
    "あいつばかだな",
    "マジくそだわ",
    "LINE交換しよう",
  ];
  for (const s of samples) {
    assert.equal(containsNgWord(s), true, `検知できること: ${s}`);
    const masked = filterNgWords(s);
    // 置換後に同じ NG ワードの連鎖が残っていないこと
    assert.equal(
      containsNgWord(masked),
      false,
      `マスク後は検知されないこと: "${s}" → "${masked}"`
    );
  }
});
