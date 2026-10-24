import "server-only";

import {
  isCachedXProfile,
  parseProfileCacheTtlSec,
  profileCacheKey,
  type CachedXProfile,
} from "@/lib/xProfileCacheCore";

export type { CachedXProfile } from "@/lib/xProfileCacheCore";

/**
 * X プロフィールのキャッシュ IO（インスタンス内メモリ + Upstash Redis）。
 * Redis 未設定でもメモリだけで動く。失敗は全部握りつぶして「キャッシュなし」扱い。
 */

const memory = new Map<string, { value: CachedXProfile; expiresAt: number }>();
const MEMORY_MAX = 2000;

function ttlSec(): number {
  return parseProfileCacheTtlSec(process.env.X_PROFILE_CACHE_TTL_SEC);
}

export async function getCachedXProfile(username: string): Promise<CachedXProfile | null> {
  const ttl = ttlSec();
  if (ttl <= 0 || !username.trim()) return null;
  const key = profileCacheKey(username);
  const hit = memory.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  if (hit) memory.delete(key);

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string | null };
    if (!data.result) return null;
    const parsed = JSON.parse(data.result) as unknown;
    if (!isCachedXProfile(parsed)) return null;
    memory.set(key, { value: parsed, expiresAt: Date.now() + Math.min(ttl, 3600) * 1000 });
    return parsed;
  } catch {
    return null;
  }
}

export async function setCachedXProfile(profile: CachedXProfile): Promise<void> {
  const ttl = ttlSec();
  if (ttl <= 0 || !isCachedXProfile(profile)) return;
  const key = profileCacheKey(profile.username);
  if (memory.size >= MEMORY_MAX) memory.clear();
  memory.set(key, { value: profile, expiresAt: Date.now() + Math.min(ttl, 3600) * 1000 });

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["SET", key, JSON.stringify(profile), "EX", ttl]]),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* best-effort */
  }
}
