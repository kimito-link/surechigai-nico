/**
 * X ユーザープロフィールの短期キャッシュ（純粋部分）。
 *
 * 目的（コスト）:
 * - ハンドル解説は「解説キャッシュヒット時でも」毎回 `users/by/username` を叩いていた（$0.010/回）。
 * - ツイート解説は `expansions=author_id` で毎回 user を同梱していた（+$0.010/回）。
 * 同じ人のプロフィールは数時間で変わらないので、両ルートで共有キャッシュする。
 */

export type CachedXProfile = {
  id: string;
  username: string;
  name: string | null;
  description: string | null;
  profileImageUrl: string | null;
  followersCount?: number;
  tweetCount?: number;
};

/** 既定 24 時間。`X_PROFILE_CACHE_TTL_SEC=0` で無効化（従来どおり毎回取得）。 */
export const DEFAULT_X_PROFILE_CACHE_TTL_SEC = 24 * 60 * 60;

export function parseProfileCacheTtlSec(raw: string | undefined): number {
  if (raw == null || raw.trim() === "") return DEFAULT_X_PROFILE_CACHE_TTL_SEC;
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_X_PROFILE_CACHE_TTL_SEC;
  return n;
}

export function profileCacheKey(username: string): string {
  return `xprofile:v1:${username.trim().replace(/^@+/, "").toLowerCase()}`;
}

export function isCachedXProfile(v: unknown): v is CachedXProfile {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const optStr = (x: unknown) => x === null || typeof x === "string";
  const optNum = (x: unknown) => x === undefined || typeof x === "number";
  return (
    typeof o.id === "string" &&
    o.id.length > 0 &&
    typeof o.username === "string" &&
    o.username.length > 0 &&
    optStr(o.name) &&
    optStr(o.description) &&
    optStr(o.profileImageUrl) &&
    optNum(o.followersCount) &&
    optNum(o.tweetCount)
  );
}

/**
 * ツイート解説で「投稿者を expansions で取らずにキャッシュで済ませてよいか」の判定。
 * URL 中のハンドルは偽装可能（x.com/誰でも/status/ID で開ける）ので、
 * ツイートの `author_id` とキャッシュの `id` が一致したときだけ採用する。
 */
export function cachedAuthorMatches(
  cached: CachedXProfile | null,
  authorId: string | undefined
): cached is CachedXProfile {
  return Boolean(cached && authorId && cached.id === authorId);
}
