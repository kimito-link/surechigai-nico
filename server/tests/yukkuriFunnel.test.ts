/**
 * server/src/lib/yukkuriFunnel.ts と yukkuriExplainClient の limit パースの単体テスト。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildYukkuriFunnelEvent,
  elapsedBucket,
  funnelEventsEnabled,
  sanitizeErrorCode,
} from "../src/lib/yukkuriFunnel";
import {
  parseYukkuriLimitInfo,
  yukkuriExplainUserMessage,
  YukkuriExplainError,
} from "../src/lib/yukkuriExplainClient";

test("buildYukkuriFunnelEvent: イベント名と PII を含まない payload", () => {
  assert.deepEqual(buildYukkuriFunnelEvent({ step: "explain_start", mode: "tweet" }), {
    name: "yukkuri_explain_start",
    payload: { mode: "tweet" },
  });
  assert.deepEqual(
    buildYukkuriFunnelEvent({ step: "explain_success", mode: "handle", elapsedMs: 4_200 }),
    { name: "yukkuri_explain_success", payload: { mode: "handle", elapsed: "3-10s" } }
  );
  assert.deepEqual(
    buildYukkuriFunnelEvent({
      step: "explain_error",
      mode: "handle",
      errorCode: "e_yukkuri llm<script>",
      elapsedMs: 90_000,
    }),
    {
      name: "yukkuri_explain_error",
      payload: { mode: "handle", code: "E_YUKKURILLMSCRIPT", elapsed: ">=60s" },
    }
  );
  assert.deepEqual(buildYukkuriFunnelEvent({ step: "explain_limit", mode: "tweet", scope: "client" }), {
    name: "yukkuri_explain_limit",
    payload: { mode: "tweet", scope: "client" },
  });
  assert.equal(
    buildYukkuriFunnelEvent({ step: "share_click", mode: "handle", surface: "hero" }).name,
    "yukkuri_share_click"
  );
});

test("elapsedBucket / sanitizeErrorCode / funnelEventsEnabled", () => {
  assert.equal(elapsedBucket(0), "<3s");
  assert.equal(elapsedBucket(15_000), "10-30s");
  assert.equal(elapsedBucket(45_000), "30-60s");
  assert.equal(elapsedBucket(Number.NaN), "unknown");
  assert.equal(sanitizeErrorCode(""), "UNKNOWN");
  assert.equal(sanitizeErrorCode("x".repeat(100)).length, 64);
  assert.equal(funnelEventsEnabled(undefined), true);
  assert.equal(funnelEventsEnabled("0"), false);
  assert.equal(funnelEventsEnabled("off"), false);
});

test("parseYukkuriLimitInfo: サーバーの limit 構造を受け取り、不正形は null", () => {
  assert.deepEqual(
    parseYukkuriLimitInfo({
      reason: "x_api_daily_budget_client",
      scope: "client",
      resetAt: "2026-11-23T00:00:00.000Z",
      upgradeAvailable: false,
    }),
    {
      reason: "x_api_daily_budget_client",
      scope: "client",
      resetAt: "2026-11-23T00:00:00.000Z",
      upgradeAvailable: false,
    }
  );
  assert.equal(parseYukkuriLimitInfo({ reason: "x", scope: "team", resetAt: "y" }), null);
  assert.equal(parseYukkuriLimitInfo(undefined), null);
});

test("yukkuriExplainUserMessage: LIMIT_REACHED はサーバー文言をそのまま出す", () => {
  const err = new YukkuriExplainError({
    message: "本日の解説回数の上限に達しました。",
    errorCode: "E_TWEET_EXPLAIN_LIMIT_REACHED",
    httpStatus: 429,
  });
  assert.equal(yukkuriExplainUserMessage(err), "本日の解説回数の上限に達しました。");
});
