import "server-only";

/**
 * X API から「1 つのツイート本文 + 投稿者プロフィール」をまとめて取得する。
 *
 * エンドポイント: `GET /2/tweets/:id`
 * - `expansions=author_id` でユーザーオブジェクトを同梱
 * - `tweet.fields`: テキスト・投稿日時・反応数（いいね / リプライ / RT / 引用）
 * - `user.fields`: 名前・自己紹介・アバター URL
 *
 * 1 API コールで取れるので、ハンドル解説と同じ料金感で動く。
 * 削除済み / 非公開ツイートの場合は 403 / 404 が返るので null を返す。
 */

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
  author: {
    id: string;
    username: string;
    name: string | null;
    description: string | null;
    profileImageUrl: string | null;
  };
};

function normalizeAvatarUrl(input: string | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.replace("_normal.", "_400x400.");
}

type RawResponse = {
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
  includes?: {
    users?: Array<{
      id?: string;
      username?: string;
      name?: string;
      description?: string;
      profile_image_url?: string;
    }>;
  };
  errors?: Array<{ title?: string; detail?: string }>;
};

async function fetchXTweetOnce(
  tweetId: string,
  bearerToken: string
): Promise<{ tweet: XTweetContext | null; status: number }> {
  try {
    const url =
      `https://api.twitter.com/2/tweets/${encodeURIComponent(tweetId)}` +
      `?tweet.fields=text,created_at,public_metrics,author_id` +
      `&expansions=author_id` +
      `&user.fields=name,username,description,profile_image_url`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(
        `[xTweet] fetch failed status=${res.status} tweetId=${tweetId}`
      );
      return { tweet: null, status: res.status };
    }
    const data = (await res.json()) as RawResponse;
    if (data.errors?.length) {
      console.warn(
        `[xTweet] upstream errors tweetId=${tweetId} errors=${JSON.stringify(data.errors).slice(0, 200)}`
      );
    }
    const tw = data.data;
    const user = data.includes?.users?.[0];
    if (!tw?.id || !tw.text || !user?.id || !user.username) {
      return { tweet: null, status: res.status };
    }
    return {
      tweet: {
        tweetId: tw.id,
        text: tw.text,
        createdAt: tw.created_at,
        metrics: {
          likeCount: tw.public_metrics?.like_count,
          replyCount: tw.public_metrics?.reply_count,
          retweetCount: tw.public_metrics?.retweet_count,
          quoteCount: tw.public_metrics?.quote_count,
        },
        author: {
          id: user.id,
          username: user.username,
          name: user.name ?? null,
          description: user.description ?? null,
          profileImageUrl: normalizeAvatarUrl(user.profile_image_url),
        },
      },
      status: res.status,
    };
  } catch (err) {
    console.warn(
      `[xTweet] threw=${(err as Error).name} message=${(err as Error).message}`
    );
    return { tweet: null, status: 0 };
  }
}

/**
 * 1 回リトライ付きのツイート取得。
 * - 401 / 403 / 404 は再試行しない（Bearer 不正 / 非公開 / 削除）
 * - 429 / 5xx / ネットワーク失敗のみ 2 秒待って 1 回リトライ
 */
export async function fetchXTweetWithAuthor(
  tweetId: string,
  bearerToken: string
): Promise<XTweetContext | null> {
  const first = await fetchXTweetOnce(tweetId, bearerToken);
  if (first.tweet) return first.tweet;
  if (first.status === 401 || first.status === 403 || first.status === 404) {
    return null;
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const second = await fetchXTweetOnce(tweetId, bearerToken);
  return second.tweet;
}
