import "server-only";

import type { XApiBilled } from "@/lib/xApiBudgetCore";
import {
  buildTweetLookupUrl,
  buildUserByIdUrl,
  countBilledObjects,
  parseTweetResponse,
  toAuthor,
  type RawTweetResponse,
  type RawUser,
  type XTweetAuthor,
  type XTweetContext,
} from "@/lib/xTweetCore";

export type { XTweetContext, XTweetAuthor } from "@/lib/xTweetCore";

/**
 * X API から「1 つのツイート本文 + 投稿者プロフィール」を取得する。
 *
 * エンドポイント: `GET /2/tweets/:id`
 * - `tweet.fields`: テキスト・投稿日時・反応数（いいね / リプライ / RT / 引用）・author_id
 * - 投稿者は 2 通り:
 *   a) `expansions=author_id`（+ `user.fields`）で同梱
 *   b) 呼び出し側が渡した `knownAuthor`（キャッシュ済みプロフィール）を使い、expansions を付けない
 *
 * 料金（X API Pay-Per-Use。2026-11-22 以降は expansions の `includes` も通常単価で課金）:
 * - a) post read $0.005 + user read $0.010 = **約 $0.015 / 回**。
 *   ハンドル解説の `users/by/username`（$0.010）より高く、「同じ料金感」ではない。
 * - b) post read のみ **$0.005 / 回**。ただし `author_id` がキャッシュと食い違った場合は
 *   `GET /2/users/:id` を追加で 1 回叩く（合計 $0.015 で a と同額、往復が 1 回増えるだけ）。
 * - 返り値の `billed` に「実際に返ってきた課金対象オブジェクト数」を入れるので、
 *   呼び出し側はこれで日次支出ガード（xApiBudget）を精算すること。
 *
 * 削除済み / 非公開ツイートの場合は 403 / 404 が返るので tweet: null を返す（課金 0）。
 */

type OnceResult = {
  tweet: XTweetContext | null;
  status: number;
  billed: XApiBilled;
};

const NO_BILL: XApiBilled = { posts: 0, users: 0 };

function addBilled(a: XApiBilled, b: XApiBilled): XApiBilled {
  return { posts: a.posts + b.posts, users: a.users + b.users };
}

async function fetchUserById(
  userId: string,
  bearerToken: string
): Promise<{ author: XTweetAuthor | null; billed: XApiBilled }> {
  try {
    const res = await fetch(buildUserByIdUrl(userId), {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { author: null, billed: NO_BILL };
    const data = (await res.json()) as { data?: RawUser };
    const author = toAuthor(data.data);
    return { author, billed: { posts: 0, users: data.data?.id ? 1 : 0 } };
  } catch {
    return { author: null, billed: NO_BILL };
  }
}

async function fetchXTweetOnce(
  tweetId: string,
  bearerToken: string,
  knownAuthor: XTweetAuthor | null
): Promise<OnceResult> {
  try {
    const res = await fetch(buildTweetLookupUrl(tweetId, !knownAuthor), {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[xTweet] fetch failed status=${res.status} tweetId=${tweetId}`);
      return { tweet: null, status: res.status, billed: NO_BILL };
    }
    const data = (await res.json()) as RawTweetResponse;
    if (data.errors?.length) {
      console.warn(
        `[xTweet] upstream errors tweetId=${tweetId} errors=${JSON.stringify(data.errors).slice(0, 200)}`
      );
    }
    let billed = countBilledObjects(data);
    const parsed = parseTweetResponse(data, knownAuthor);
    if (parsed.kind === "ok") return { tweet: parsed.tweet, status: res.status, billed };
    if (parsed.kind === "invalid") return { tweet: null, status: res.status, billed };
    // キャッシュの投稿者と author_id が食い違った（URL のハンドル偽装やハンドル変更）。
    const u = await fetchUserById(parsed.authorId, bearerToken);
    billed = addBilled(billed, u.billed);
    if (!u.author) return { tweet: null, status: res.status, billed };
    return { tweet: { ...parsed.partial, author: u.author }, status: res.status, billed };
  } catch (err) {
    console.warn(`[xTweet] threw=${(err as Error).name} message=${(err as Error).message}`);
    return { tweet: null, status: 0, billed: NO_BILL };
  }
}

/**
 * 1 回リトライ付きのツイート取得。
 * - 401 / 403 / 404 は再試行しない（Bearer 不正 / 非公開 / 削除）
 * - 429 / 5xx / ネットワーク失敗のみ 2 秒待って 1 回リトライ
 *
 * @param opts.knownAuthor キャッシュ済み投稿者。渡すと expansions を付けずに post のみ課金で取る。
 */
export async function fetchXTweetWithAuthor(
  tweetId: string,
  bearerToken: string,
  opts?: { knownAuthor?: XTweetAuthor | null }
): Promise<{ tweet: XTweetContext | null; billed: XApiBilled; authorFromCache: boolean }> {
  const knownAuthor = opts?.knownAuthor ?? null;
  const first = await fetchXTweetOnce(tweetId, bearerToken, knownAuthor);
  const fromCache = (t: XTweetContext | null) =>
    Boolean(t && knownAuthor && t.author === knownAuthor);
  if (first.tweet) {
    return { tweet: first.tweet, billed: first.billed, authorFromCache: fromCache(first.tweet) };
  }
  if (first.status === 401 || first.status === 403 || first.status === 404) {
    return { tweet: null, billed: first.billed, authorFromCache: false };
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const second = await fetchXTweetOnce(tweetId, bearerToken, knownAuthor);
  return {
    tweet: second.tweet,
    billed: addBilled(first.billed, second.billed),
    authorFromCache: fromCache(second.tweet),
  };
}
