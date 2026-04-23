/**
 * server/src/lib/yukkuriBackfillState.ts の型ガード単体テスト。
 *
 * `isBackfillRunState` は `/api/health/yukkuri` が Redis から JSON を復元する時の
 * 防波堤。ここが緩むと health が壊れた JSON を表示したりクラッシュしたりするので、
 * 各フィールドの型・null 許容を lock する。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
// `server-only` import を含む yukkuriBackfillState.ts は node --test から直接
// 読めないので、純粋な型ガードだけ切り出した types 側から import する。
import {
  isBackfillRunState,
  type BackfillRunState,
} from "../src/lib/yukkuriBackfillStateTypes";

// 正常系の代表値（全フィールド埋め）
const VALID: BackfillRunState = {
  at: "2026-04-24T10:00:00.000Z",
  ok: true,
  total: 50,
  updated: 40,
  skipped: 8,
  failed: 2,
  aborted: null,
  error: null,
  durationMs: 45_000,
  dryRun: false,
};

test("isBackfillRunState: 完全な正常値を受け入れる", () => {
  assert.equal(isBackfillRunState(VALID), true);
});

test("isBackfillRunState: aborted / error は string も許容", () => {
  assert.equal(
    isBackfillRunState({ ...VALID, aborted: "token_invalid", error: "X API 401" }),
    true
  );
});

test("isBackfillRunState: null / undefined / 非オブジェクト / 配列は reject", () => {
  assert.equal(isBackfillRunState(null), false);
  assert.equal(isBackfillRunState(undefined), false);
  assert.equal(isBackfillRunState("string"), false);
  assert.equal(isBackfillRunState(123), false);
  assert.equal(isBackfillRunState([]), false, "空配列は object だが BackfillRunState ではない");
  assert.equal(isBackfillRunState([VALID]), false, "配列に詰めても reject される");
});

test("isBackfillRunState: 必須フィールドが欠けていると reject", () => {
  // 各フィールドを 1 つずつ欠落させて全部落ちることを確認
  const keys: Array<keyof BackfillRunState> = [
    "at",
    "ok",
    "total",
    "updated",
    "skipped",
    "failed",
    "aborted",
    "error",
    "durationMs",
    "dryRun",
  ];
  for (const k of keys) {
    const bad: Record<string, unknown> = { ...VALID };
    delete bad[k];
    assert.equal(isBackfillRunState(bad), false, `${k} を削ると reject されること`);
  }
});

test("isBackfillRunState: 各フィールドの型ミスマッチを reject", () => {
  // 数値が期待される場所に string を入れる / 真偽値に string を入れる等
  assert.equal(isBackfillRunState({ ...VALID, total: "50" }), false);
  assert.equal(isBackfillRunState({ ...VALID, ok: "true" }), false);
  assert.equal(isBackfillRunState({ ...VALID, at: Date.now() }), false, "at は string");
  assert.equal(
    isBackfillRunState({ ...VALID, aborted: 123 }),
    false,
    "aborted は string | null"
  );
  assert.equal(
    isBackfillRunState({ ...VALID, error: 123 }),
    false,
    "error は string | null"
  );
  assert.equal(isBackfillRunState({ ...VALID, durationMs: "fast" }), false);
  assert.equal(isBackfillRunState({ ...VALID, dryRun: 0 }), false);
});

test("isBackfillRunState: JSON のラウンドトリップが通る", () => {
  const json = JSON.stringify(VALID);
  const parsed = JSON.parse(json);
  assert.equal(isBackfillRunState(parsed), true);
});
