import "server-only";

import type { Redis } from "@upstash/redis";
import {
  checkRateLimit,
  DEFAULT_ANON_DAILY_BUDGET_MILLI,
  DEFAULT_IP_LIMIT_PER_HOUR,
  isFlagOn,
  readNonNegativeIntEnv,
  reserveMilli,
  type CostGuardDenial,
  type CounterStore,
  type ReserveResult,
} from "@/lib/costGuardCore";

/**
 * 原価の守りを Upstash Redis に配線する（判定ロジックは costGuardCore.ts）。
 *
 * env（すべて任意。★読めない値を入れたら「止まる」側に倒れる）:
 *   PAID_CALLS_DISABLED=1          … キルスイッチ。X と有料 LLM を全停止（キャッシュ済みの結果は見られる）
 *   YUKKURI_DAILY_BUDGET_MILLI     … 匿名の日次予算（ミリドル）。既定 3000 = $3/日
 *   YUKKURI_IP_LIMIT_PER_HOUR      … IP ごとの上限（キャッシュに当たらなかった分だけ）。既定 10
 *   YUKKURI_OPENROUTER_DISABLED=1  … OpenRouter だけ止める（Ollama・静的フォールバックは動く）
 *
 * ★Upstash が未設定・落ちている → 予約も IP 上限も「通さない」（fail-closed）。
 *   キャッシュは「無いだけ」なので費用は増えないが、予約は数えられないなら使わない。
 */

let redisPromise: Promise<Redis | null> | null = null;

async function getRedis(): Promise<Redis | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  if (!redisPromise) {
    redisPromise = import("@upstash/redis")
      .then((mod) => new mod.Redis({ url, token }))
      .catch((err) => {
        console.warn("[costGuard] Upstash init failed", err);
        redisPromise = null;
        return null;
      });
  }
  return redisPromise;
}

async function getCounterStore(): Promise<CounterStore | null> {
  const redis = await getRedis();
  if (!redis) return null;
  return {
    incrby: (key, n) => redis.incrby(key, n),
    decrby: (key, n) => redis.decrby(key, n),
    expire: (key, seconds) => redis.expire(key, seconds),
  };
}

/** キルスイッチ（L1）。 */
export function paidCallsDisabled(): boolean {
  return isFlagOn(process.env.PAID_CALLS_DISABLED);
}

/** OpenRouter だけを止める（旧: コード内の定数 OPENROUTER_DISABLED）。 */
export function openRouterDisabled(): boolean {
  return paidCallsDisabled() || isFlagOn(process.env.YUKKURI_OPENROUTER_DISABLED);
}

/** 呼び出し元 IP。Vercel は x-forwarded-for の先頭に実 IP を入れる。 */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * 有料呼び出しにつながる入口の門番（L1 + L4）。通すなら null、止めるなら理由。
 * ★キャッシュに当たらなかったときだけ呼ぶ（キャッシュは原価 0 なので数えない）。
 */
export async function guardPaidEntry(
  headers: Headers,
  scope: "handle" | "tweet"
): Promise<CostGuardDenial | null> {
  if (paidCallsDisabled()) return "disabled";
  const limit = readNonNegativeIntEnv(
    process.env.YUKKURI_IP_LIMIT_PER_HOUR,
    DEFAULT_IP_LIMIT_PER_HOUR
  );
  const r = await checkRateLimit(await getCounterStore(), {
    scope,
    ip: clientIp(headers),
    limit,
  });
  if (r.ok) return null;
  return r.reason;
}

/**
 * 日次予算の予約（L2）。★有料呼び出しの「前」に呼ぶ。通らなければ呼ばない。
 * 名前は ai-hub/bin/cost-scan.mjs の検査（reserve*Budget）に合わせている。
 */
export async function reserveYukkuriBudget(costMilli: number): Promise<ReserveResult> {
  if (paidCallsDisabled()) return { ok: false, reason: "unavailable" };
  const limitMilli = readNonNegativeIntEnv(
    process.env.YUKKURI_DAILY_BUDGET_MILLI,
    DEFAULT_ANON_DAILY_BUDGET_MILLI
  );
  const r = await reserveMilli(await getCounterStore(), {
    pool: "anon",
    costMilli,
    limitMilli,
  });
  if (!r.ok) {
    console.warn(`[costGuard] reserve denied reason=${r.reason} cost=${costMilli}`);
  }
  return r;
}

/** 永続キャッシュの読み出し（L3）。失敗は「無い」扱い（費用は増えない側）。 */
export async function readCacheJson<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  if (!redis) return null;
  try {
    const v = await redis.get<T>(key);
    return v ?? null;
  } catch {
    return null;
  }
}

/** 永続キャッシュの書き込み（L3）。失敗は握りつぶす。 */
export async function writeCacheJson(key: string, value: unknown, ttlSec: number): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: Math.max(1, Math.floor(ttlSec)) });
  } catch {
    console.warn(`[costGuard] cache write failed key=${key}`);
  }
}
