/**
 * `GET /2/tweets/:id` の URL 組み立てとレスポンス解釈（純粋関数。単体テスト対象）。
 * IO は `xTweet.ts`。
 */
import type { XApiBilled } from "@/lib/xApiBudgetCore";

export type XTweetAuthor = {
  id: string;
  username: string;
  name: string | null;
  description: string | null;
  profileImageUrl: string | null;
};

export type XTweetContext = {
  tweetId: string;
  text: string;
  createdAt?: string;
  metrics: {
    likeCount?: number;
    replyCount?: number;
    retweetCount?: number;
    quoteCount?: number;
  };
  author: XTweetAuthor;
};

export type RawUser = {
  id?: string;
  username?: string;
  name?: string;
  description?: string;
  profile_image_url?: string;
};

export type RawTweetResponse = {
  data?: {
    id?: string;
    text?: string;
    created_at?: string;
    author_id?: string;
    public_metrics?: {
      like_count?: number;
      reply_count?: number;
      retweet_count?: number;
      quote_count?: number;
    };
  };
  includes?: { users?: RawUser[] };
  errors?: Array<{ title?: string; detail?: string }>;
};

export const X_USER_FIELDS = "name,username,description,profile_image_url";

export function normalizeAvatarUrl(input: string | undefined | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.replace("_normal.", "_400x400.");
}

/**
 * @param withAuthorExpansion true なら `expansions=author_id`（post + user の 2 オブジェクト課金）。
 *   false なら post のみ（`author_id` は tweet.fields で受け取る）。
 */
export function buildTweetLookupUrl(tweetId: string, withAuthorExpansion: boolean): string {
  const base =
    `https://api.twitter.com/2/tweets/${encodeURIComponent(tweetId)}` +
    `?tweet.fields=text,created_at,public_metrics,author_id`;
  if (!withAuthorExpansion) return base;
  return `${base}&expansions=author_id&user.fields=${X_USER_FIELDS}`;
}

export function buildUserByIdUrl(userId: string): string {
  return `https://api.twitter.com/2/users/${encodeURIComponent(userId)}?user.fields=${X_USER_FIELDS}`;
}

/** 課金対象になったオブジェクト数（data + includes）を数える。 */
export function countBilledObjects(raw: RawTweetResponse | null | undefined): XApiBilled {
  if (!raw) return { posts: 0, users: 0 };
  return {
    posts: raw.data?.id ? 1 : 0,
    users: Array.isArray(raw.includes?.users) ? raw.includes!.users!.length : 0,
  };
}

export function toAuthor(user: RawUser | undefined | null): XTweetAuthor | null {
  if (!user?.id || !user.username) return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name ?? null,
    description: user.description ?? null,
    profileImageUrl: normalizeAvatarUrl(user.profile_image_url),
  };
}

/**
 * レスポンスからツイート部分を取り出す。author は includes にあればそれ、なければ引数 `author`。
 * author が決まらない場合は `{ tweetOnly, authorId }` を返して呼び出し側に解決させる。
 */
export function parseTweetResponse(
  raw: RawTweetResponse,
  author: XTweetAuthor | null
):
  | { kind: "ok"; tweet: XTweetContext }
  | { kind: "need_author"; authorId: string; partial: Omit<XTweetContext, "author"> }
  | { kind: "invalid" } {
  const tw = raw.data;
  if (!tw?.id || !tw.text) return { kind: "invalid" };
  const partial: Omit<XTweetContext, "author"> = {
    tweetId: tw.id,
    text: tw.text,
    createdAt: tw.created_at,
    metrics: {
      likeCount: tw.public_metrics?.like_count,
      replyCount: tw.public_metrics?.reply_count,
      retweetCount: tw.public_metrics?.retweet_count,
      quoteCount: tw.public_metrics?.quote_count,
    },
  };
  const included = toAuthor(raw.includes?.users?.find((u) => u.id === tw.author_id) ?? raw.includes?.users?.[0]);
  const resolved = included ?? (author && (!tw.author_id || author.id === tw.author_id) ? author : null);
  if (resolved) return { kind: "ok", tweet: { ...partial, author: resolved } };
  if (tw.author_id) return { kind: "need_author", authorId: tw.author_id, partial };
  return { kind: "invalid" };
}
