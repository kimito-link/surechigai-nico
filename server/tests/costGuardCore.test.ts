/**
 * server/src/lib/costGuardCore.ts の単体テスト（COST_SAFETY_POLICY §4: 守りの効き目は
 * 「上限を小さくした環境で、実際に拒否されること」で確かめる）。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  COST_MILLI,
  DEFAULT_ANON_DAILY_BUDGET_MILLI,
  denialResponse,
  isFlagOn,
  isPaidModel,
  isValidXHandle,
  MAX_SINGLE_OPERATION_MILLI,
  orderModelsFreeFirst,
  readNonNegativeIntEnv,
  reserveMilli,
  type CounterStore,
} from "../src/lib/costGuardCore";

/** Redis の INCRBY/DECRBY/EXPIRE だけを真似る偽物。 */
function memoryStore(): CounterStore & { data: Map<string, number>; ttl: Map<string, number> } {
  const data = new Map<string, number>();
  const ttl = new Map<string, number>();
  return {
    data,
    ttl,
    async incrby(key, n) {
      const v = (data.get(key) ?? 0) + n;
      data.set(key, v);
      return v;
    },
    async decrby(key, n) {
      const v = (data.get(key) ?? 0) - n;
      data.set(key, v);
      return v;
    },
    async expire(key, seconds) {
      ttl.set(key, seconds);
      return 1;
    },
  };
}

/** つながらない Redis。 */
const brokenStore: CounterStore = {
  incrby: async () => {
    throw new Error("ECONNREFUSED");
  },
  decrby: async () => {
    throw new Error("ECONNREFUSED");
  },
  expire: async () => {
    throw new Error("ECONNREFUSED");
  },
};

const AT = new Date("2026-10-19T03:00:00Z");

// ---------------- 日次予算の予約（L2） ----------------

test("reserveMilli: 上限内なら通り、使用量が積まれる", async () => {
  const store = memoryStore();
  const r = await reserveMilli(store, { pool: "anon", costMilli: 60, limitMilli: 1000, at: AT });
  assert.equal(r.ok, true);
  assert.equal([...store.data.values()][0], 60);
  // 初回だけ TTL（14日）が付く
  assert.equal([...store.ttl.values()][0], 14 * 24 * 60 * 60);
});

test("reserveMilli: ★上限を小さくすると拒否され、予約は戻される", async () => {
  const store = memoryStore();
  // 1件目（60）は通り、2件目で 120 > 100 になるので拒否
  const first = await reserveMilli(store, { pool: "anon", costMilli: 60, limitMilli: 100, at: AT });
  const second = await reserveMilli(store, { pool: "anon", costMilli: 60, limitMilli: 100, at: AT });
  assert.equal(first.ok, true);
  assert.deepEqual(second, { ok: false, reason: "budget_exhausted", usedMilli: 60, limitMilli: 100 });
  // 拒否した分は戻っている（使っていないので）
  assert.equal([...store.data.values()][0], 60);
});

test("reserveMilli: 上限 0 なら最初の1件から拒否（実質のキルスイッチ）", async () => {
  const r = await reserveMilli(memoryStore(), { pool: "anon", costMilli: 3, limitMilli: 0, at: AT });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.reason, "budget_exhausted");
});

test("reserveMilli: ★Redis が無い・落ちている → 呼ばない（fail-closed）", async () => {
  const none = await reserveMilli(null, { pool: "anon", costMilli: 10, limitMilli: 1000, at: AT });
  const broken = await reserveMilli(brokenStore, { pool: "anon", costMilli: 10, limitMilli: 1000, at: AT });
  assert.deepEqual(none, { ok: false, reason: "unavailable" });
  assert.deepEqual(broken, { ok: false, reason: "unavailable" });
});

test("reserveMilli: ★上限が読めない（null）→ 呼ばない（既定値に黙って落とさない）", async () => {
  const r = await reserveMilli(memoryStore(), { pool: "anon", costMilli: 10, limitMilli: null, at: AT });
  assert.deepEqual(r, { ok: false, reason: "unavailable" });
});

test("reserveMilli: 日付が変われば別のカウンタ（UTC）", async () => {
  const store = memoryStore();
  await reserveMilli(store, { pool: "anon", costMilli: 60, limitMilli: 60, at: AT });
  const nextDay = await reserveMilli(store, {
    pool: "anon",
    costMilli: 60,
    limitMilli: 60,
    at: new Date("2026-10-20T00:00:01Z"),
  });
  assert.equal(nextDay.ok, true);
  assert.equal(store.data.size, 2);
});

test("既定の日次予算は最も高い1操作より大きい（構造的に「必ず拒否」にならない）", () => {
  assert.ok(DEFAULT_ANON_DAILY_BUDGET_MILLI >= MAX_SINGLE_OPERATION_MILLI + COST_MILLI.paidLlmCall);
});

// ---------------- IP ごとの上限（L4） ----------------

test("checkRateLimit: ★上限 2 なら 3 回目で拒否", async () => {
  const store = memoryStore();
  const opts = { scope: "handle", ip: "203.0.113.1", limit: 2, at: AT };
  assert.equal((await checkRateLimit(store, opts)).ok, true);
  assert.equal((await checkRateLimit(store, opts)).ok, true);
  const third = await checkRateLimit(store, opts);
  assert.deepEqual(third, { ok: false, reason: "rate_limited", count: 3, limit: 2 });
});

test("checkRateLimit: IP が違えば別に数える", async () => {
  const store = memoryStore();
  await checkRateLimit(store, { scope: "handle", ip: "203.0.113.1", limit: 1, at: AT });
  const other = await checkRateLimit(store, { scope: "handle", ip: "203.0.113.2", limit: 1, at: AT });
  assert.equal(other.ok, true);
});

test("checkRateLimit: ★Redis が無い・落ちている・上限が読めない → 通さない（fail-closed）", async () => {
  const base = { scope: "tweet", ip: "203.0.113.1", at: AT };
  assert.deepEqual(await checkRateLimit(null, { ...base, limit: 10 }), { ok: false, reason: "unavailable" });
  assert.deepEqual(await checkRateLimit(brokenStore, { ...base, limit: 10 }), {
    ok: false,
    reason: "unavailable",
  });
  assert.deepEqual(await checkRateLimit(memoryStore(), { ...base, limit: null }), {
    ok: false,
    reason: "unavailable",
  });
});

// ---------------- env の読み取り・キルスイッチ（L1） ----------------

test("readNonNegativeIntEnv: 未設定・空は既定値、数値はそのまま", () => {
  assert.equal(readNonNegativeIntEnv(undefined, 3000), 3000);
  assert.equal(readNonNegativeIntEnv("  ", 3000), 3000);
  assert.equal(readNonNegativeIntEnv("500", 3000), 500);
  assert.equal(readNonNegativeIntEnv("0", 3000), 0);
});

test("readNonNegativeIntEnv: ★読めない値は null（止める側）", () => {
  assert.equal(readNonNegativeIntEnv("abc", 3000), null);
  assert.equal(readNonNegativeIntEnv("-1", 3000), null);
  assert.equal(readNonNegativeIntEnv("1.5", 3000), null);
  assert.equal(readNonNegativeIntEnv("3,000", 3000), null);
});

test("isFlagOn: 1/true/yes/on だけ真", () => {
  for (const v of ["1", "true", "TRUE", "yes", "on", " 1 "]) assert.equal(isFlagOn(v), true, v);
  for (const v of [undefined, "", "0", "false", "off", "no"]) assert.equal(isFlagOn(v), false, String(v));
});

// ---------------- モデルの並び（無料を先に） ----------------

test("orderModelsFreeFirst: :free を先に、有料を後ろに（順序は保つ）", () => {
  const ordered = orderModelsFreeFirst([
    "anthropic/claude-3-5-haiku",
    "openai/gpt-4o-mini",
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
  ]);
  assert.deepEqual(ordered, [
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "anthropic/claude-3-5-haiku",
    "openai/gpt-4o-mini",
  ]);
  assert.equal(isPaidModel("openai/gpt-4o-mini"), true);
  assert.equal(isPaidModel("google/gemma-4-31b-it:free"), false);
});

// ---------------- 入力の形（存在しえない名前に払わない） ----------------

test("isValidXHandle: X のユーザー名の形だけ通す", () => {
  for (const ok of ["jack", "a", "Foo_Bar_123", "abcdefghijklmno"]) assert.equal(isValidXHandle(ok), true, ok);
  for (const ng of ["", "abcdefghijklmnop", "foo.bar", "https://x.com/foo", "日本語", "foo bar", "@foo"]) {
    assert.equal(isValidXHandle(ng), false, ng);
  }
});

// ---------------- 止まったときの見せ方（L6） ----------------

test("denialResponse: 予算切れは 429 で「無料枠が終了」と正直に言う", () => {
  const d = denialResponse("budget_exhausted", "E_YUKKURI");
  assert.equal(d.status, 429);
  assert.equal(d.body.error_code, "E_YUKKURI_BUDGET_EXHAUSTED");
  assert.match(d.body.error, /無料枠が終了/);
});

test("denialResponse: 理由ごとに error_code が分かれる", () => {
  assert.equal(denialResponse("rate_limited", "E_TWEET_EXPLAIN").body.error_code, "E_TWEET_EXPLAIN_RATE_LIMITED");
  assert.equal(denialResponse("disabled", "E_YUKKURI").status, 503);
  assert.equal(denialResponse("unavailable", "E_YUKKURI").body.error_code, "E_YUKKURI_GUARD_UNAVAILABLE");
});
