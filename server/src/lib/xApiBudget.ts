import "server-only";

import { createHash } from "node:crypto";
import {
  createMemorySpendStore,
  parseXApiBudgetConfig,
  reserveSpend,
  settleSpend,
  spendKeys,
  type ReserveResult,
  type SpendReservation,
  type SpendStore,
} from "@/lib/xApiBudgetCore";

/**
 * X API 日次支出ガードの IO 側（Upstash Redis REST）。
 * ロジックは `xApiBudgetCore.ts`（単体テスト済み）。
 *
 * - Redis 設定あり: `xapi:spend:{UTC日付}:global` / `...:c:{clientKey}` を INCRBY で共有カウント
 * - Redis 未設定 / 障害: インスタンス内メモリで代用（Vercel のインスタンス単位でしか効かないが、0 よりマシ）
 */

const memoryStore = createMemorySpendStore();

function redisEnv(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

function createRedisSpendStore(url: string, token: string): SpendStore {
  return {
    async incrBy(entries) {
      const commands: Array<Array<string | number>> = [];
      for (const e of entries) {
        commands.push(["INCRBY", e.key, e.amount]);
        commands.push(["EXPIRE", e.key, e.ttlSec]);
      }
      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(commands),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error(`upstash ${res.status}`);
      const data = (await res.json()) as Array<{ result?: unknown; error?: string }>;
      return entries.map((_, i) => {
        const n = Number(data[i * 2]?.result);
        if (!Number.isFinite(n)) throw new Error("upstash bad result");
        return n;
      });
    },
    async get(key) {
      const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return 0;
      const data = (await res.json()) as { result?: string | null };
      const n = Number(data.result ?? 0);
      return Number.isFinite(n) ? n : 0;
    },
  };
}

/** Redis が落ちていたらメモリにフォールバックするストア。 */
function getStore(): SpendStore {
  const env = redisEnv();
  if (!env) return memoryStore;
  const redis = createRedisSpendStore(env.url, env.token);
  return {
    async incrBy(entries) {
      try {
        return await redis.incrBy(entries);
      } catch (err) {
        console.warn(`[xApiBudget] redis incr failed, using memory: ${(err as Error).message}`);
        return memoryStore.incrBy(entries);
      }
    },
    async get(key) {
      try {
        return await redis.get(key);
      } catch {
        return memoryStore.get(key);
      }
    },
  };
}

/**
 * リクエスト元のクライアント識別子（IP の SHA-256 先頭 16 桁）。
 * 生 IP は Redis に保存しない。取れなければ null（全体上限のみ適用）。
 */
export function clientKeyFromHeaders(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = xff || headers.get("x-real-ip")?.trim() || "";
  if (!ip) return null;
  return createHash("sha256").update(`xapi:${ip}`).digest("hex").slice(0, 16);
}

export async function reserveXApiSpend(
  clientKey: string | null,
  amountMills: number
): Promise<ReserveResult> {
  return reserveSpend({
    store: getStore(),
    config: parseXApiBudgetConfig(process.env),
    clientKey,
    amountMills,
  });
}

export async function settleXApiSpend(
  reservation: SpendReservation | null,
  actualMills: number
): Promise<void> {
  await settleSpend({ store: getStore(), reservation, actualMills });
}

/** health 用: 今日（UTC）の全体推定支出（mill）と上限設定。 */
export async function loadTodayXApiSpend(): Promise<{
  day: string;
  globalMills: number;
  config: ReturnType<typeof parseXApiBudgetConfig>;
}> {
  const now = new Date();
  const keys = spendKeys(now, null);
  const globalMills = await getStore().get(keys.global);
  return {
    day: now.toISOString().slice(0, 10),
    globalMills,
    config: parseXApiBudgetConfig(process.env),
  };
}
