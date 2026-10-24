/**
 * server/src/lib/xApiBudgetCore.ts の単体テスト（X API 日次支出ガード）。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildLimitReachedBody,
  createMemorySpendStore,
  estimateXApiCostMills,
  evaluateBudget,
  nextUtcMidnight,
  parseXApiBudgetConfig,
  reserveSpend,
  settleSpend,
  spendKeys,
  type SpendStore,
  type XApiBudgetConfig,
} from "../src/lib/xApiBudgetCore";

const CFG: XApiBudgetConfig = { enabled: true, globalDailyMills: 100, perClientDailyMills: 30 };
const NOW = new Date("2026-11-22T10:00:00.000Z");

test("estimateXApiCostMills: tweet + expansions(author) = post 5 + user 10 = 15 mill ($0.015)", () => {
  assert.equal(estimateXApiCostMills({ posts: 1, users: 1 }), 15);
  assert.equal(estimateXApiCostMills({ posts: 1, users: 0 }), 5);
  assert.equal(estimateXApiCostMills({ posts: 0, users: 1 }), 10);
  assert.equal(estimateXApiCostMills({ posts: 10, users: 0 }), 50);
  assert.equal(estimateXApiCostMills({ posts: -3, users: 0 }), 0);
});

test("parseXApiBudgetConfig: 既定値は全体 $30 / クライアント無制限、ガード有効", () => {
  assert.deepEqual(parseXApiBudgetConfig({}), {
    enabled: true,
    globalDailyMills: 30_000,
    perClientDailyMills: 0,
  });
});

test("parseXApiBudgetConfig: env で上書き・無効化・不正値は既定に戻す", () => {
  const c = parseXApiBudgetConfig({
    X_API_DAILY_BUDGET_USD: "5.5",
    X_API_DAILY_BUDGET_PER_CLIENT_USD: "0",
  });
  assert.equal(c.globalDailyMills, 5_500);
  assert.equal(c.perClientDailyMills, 0);
  assert.equal(parseXApiBudgetConfig({ X_API_SPEND_GUARD: "off" }).enabled, false);
  assert.equal(parseXApiBudgetConfig({ X_API_SPEND_GUARD: "FALSE" }).enabled, false);
  assert.equal(parseXApiBudgetConfig({ X_API_DAILY_BUDGET_USD: "abc" }).globalDailyMills, 30_000);
  assert.equal(parseXApiBudgetConfig({ X_API_DAILY_BUDGET_USD: "-1" }).globalDailyMills, 30_000);
});

test("evaluateBudget: client 超過を優先、上限 0 は無制限、無効時は常に OK", () => {
  assert.deepEqual(
    evaluateBudget({ globalTotalAfter: 200, clientTotalAfter: 31, config: CFG }),
    { ok: false, reason: "x_api_daily_budget_client" }
  );
  assert.deepEqual(
    evaluateBudget({ globalTotalAfter: 101, clientTotalAfter: 10, config: CFG }),
    { ok: false, reason: "x_api_daily_budget_global" }
  );
  assert.deepEqual(
    evaluateBudget({ globalTotalAfter: 100, clientTotalAfter: 30, config: CFG }),
    { ok: true }
  );
  assert.deepEqual(
    evaluateBudget({
      globalTotalAfter: 1e9,
      clientTotalAfter: 1e9,
      config: { enabled: true, globalDailyMills: 0, perClientDailyMills: 0 },
    }),
    { ok: true }
  );
  assert.deepEqual(
    evaluateBudget({ globalTotalAfter: 1e9, clientTotalAfter: null, config: { ...CFG, enabled: false } }),
    { ok: true }
  );
});

test("spendKeys / nextUtcMidnight: UTC 日付で区切る", () => {
  assert.deepEqual(spendKeys(NOW, "abc"), {
    global: "xapi:spend:2026-11-22:global",
    client: "xapi:spend:2026-11-22:c:abc",
  });
  assert.equal(spendKeys(NOW, null).client, null);
  assert.equal(nextUtcMidnight(NOW).toISOString(), "2026-11-23T00:00:00.000Z");
});

test("reserveSpend: 1 クライアントは上限まで通り、超えると拒否され、カウンタは巻き戻る", async () => {
  const store = createMemorySpendStore();
  const r1 = await reserveSpend({ store, config: CFG, clientKey: "bot", amountMills: 15, now: NOW });
  const r2 = await reserveSpend({ store, config: CFG, clientKey: "bot", amountMills: 15, now: NOW });
  const r3 = await reserveSpend({ store, config: CFG, clientKey: "bot", amountMills: 15, now: NOW });
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.equal(r3.ok, false);
  if (!r3.ok) {
    assert.equal(r3.reason, "x_api_daily_budget_client");
    assert.equal(r3.resetAt, "2026-11-23T00:00:00.000Z");
  }
  const keys = spendKeys(NOW, "bot");
  assert.equal(await store.get(keys.client!), 30);
  assert.equal(await store.get(keys.global), 30);
  // 別クライアントは通る
  const other = await reserveSpend({ store, config: CFG, clientKey: "human", amountMills: 15, now: NOW });
  assert.equal(other.ok, true);
});

test("reserveSpend: 全体上限で全員止まる", async () => {
  const store = createMemorySpendStore();
  const cfg = { ...CFG, perClientDailyMills: 0 };
  for (let i = 0; i < 6; i++) {
    const r = await reserveSpend({ store, config: cfg, clientKey: `c${i}`, amountMills: 15, now: NOW });
    assert.equal(r.ok, true, `call ${i}`);
  }
  const r = await reserveSpend({ store, config: cfg, clientKey: "c9", amountMills: 15, now: NOW });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, "x_api_daily_budget_global");
});

test("reserveSpend: ストア障害時は fail-open（体験を止めない）", async () => {
  const broken: SpendStore = {
    incrBy: async () => {
      throw new Error("down");
    },
    get: async () => 0,
  };
  const r = await reserveSpend({ store: broken, config: CFG, clientKey: "x", amountMills: 15, now: NOW });
  assert.deepEqual(r, { ok: true, reservation: null });
});

test("reserveSpend: ガード無効なら何も記録しない", async () => {
  const store = createMemorySpendStore();
  const r = await reserveSpend({
    store,
    config: { ...CFG, enabled: false },
    clientKey: "x",
    amountMills: 999,
    now: NOW,
  });
  assert.deepEqual(r, { ok: true, reservation: null });
  assert.equal(await store.get(spendKeys(NOW, null).global), 0);
});

test("settleSpend: 予約額と実額の差分で精算（404 等で課金 0 なら全額戻す）", async () => {
  const store = createMemorySpendStore();
  // タイムライン最大 10 posts = 50 mill を予約 → 実際は 4 件（20 mill）だった
  const r = await reserveSpend({
    store,
    config: { ...CFG, perClientDailyMills: 60 },
    clientKey: "u",
    amountMills: 50,
    now: NOW,
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  await settleSpend({ store, reservation: r.reservation, actualMills: 20 });
  assert.equal(await store.get(spendKeys(NOW, null).global), 20);
  assert.equal(await store.get(spendKeys(NOW, "u").client!), 20);
  await settleSpend({ store, reservation: { keys: r.reservation!.keys, amount: 20 }, actualMills: 0 });
  assert.equal(await store.get(spendKeys(NOW, null).global), 0);
  // null 予約は no-op
  await settleSpend({ store, reservation: null, actualMills: 100 });
});

test("memory store: TTL 経過で 0 に戻る", async () => {
  let t = 0;
  const store = createMemorySpendStore(() => t);
  await store.incrBy([{ key: "k", amount: 5, ttlSec: 1 }]);
  assert.equal(await store.get("k"), 5);
  t = 1500;
  assert.equal(await store.get("k"), 0);
});

test("buildLimitReachedBody: クライアントが出し分けできる構造化レスポンス", () => {
  const b = buildLimitReachedBody({
    errorCode: "E_TWEET_EXPLAIN_LIMIT_REACHED",
    reason: "x_api_daily_budget_client",
    resetAt: "2026-11-23T00:00:00.000Z",
  });
  assert.equal(b.error_code, "E_TWEET_EXPLAIN_LIMIT_REACHED");
  assert.deepEqual(b.limit, {
    reason: "x_api_daily_budget_client",
    scope: "client",
    resetAt: "2026-11-23T00:00:00.000Z",
    upgradeAvailable: false,
  });
  assert.ok(b.error.length > 0);
  assert.equal(
    buildLimitReachedBody({ errorCode: "E", reason: "x_api_daily_budget_global", resetAt: "x" }).limit.scope,
    "global"
  );
});
