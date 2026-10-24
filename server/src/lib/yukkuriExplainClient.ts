/**
 * ゆっくり解説 API 呼び出し（Ollama 等の長時間応答向けにブラウザ側タイムアウトを延長）
 */

export type YukkuriDialogue = { rink: string; konta: string; tanunee: string };

/** 長すぎる待機を避け、一定時間でフォールバック表示へ切り替える */
export const YUKKURI_EXPLAIN_TIMEOUT_MS = 90_000;

/**
 * 日次上限到達時にサーバーが返す構造化情報（`/api/yukkuri-explain*` の 429）。
 * 将来の有料プラン導線（「プランを見る」等）はここの `upgradeAvailable` で出し分ける。
 */
export type YukkuriLimitInfo = {
  reason: string;
  scope: "client" | "global";
  resetAt: string;
  upgradeAvailable: boolean;
};

export function parseYukkuriLimitInfo(v: unknown): YukkuriLimitInfo | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.reason !== "string" || typeof o.resetAt !== "string") return null;
  if (o.scope !== "client" && o.scope !== "global") return null;
  return {
    reason: o.reason,
    scope: o.scope,
    resetAt: o.resetAt,
    upgradeAvailable: o.upgradeAvailable === true,
  };
}

/**
 * サーバーが付与する `error_code` を保持するためのエラー型。
 * UI 側で `err instanceof YukkuriExplainError` で分岐できるようにする。
 */
export class YukkuriExplainError extends Error {
  readonly errorCode: string;
  readonly httpStatus: number;
  readonly cached: boolean;
  /** 日次上限到達（429）のときだけ非 null */
  readonly limit: YukkuriLimitInfo | null;

  constructor(opts: {
    message: string;
    errorCode: string;
    httpStatus: number;
    cached?: boolean;
    limit?: YukkuriLimitInfo | null;
  }) {
    super(opts.message);
    this.name = "YukkuriExplainError";
    this.errorCode = opts.errorCode;
    this.httpStatus = opts.httpStatus;
    this.cached = opts.cached ?? false;
    this.limit = opts.limit ?? null;
  }
}

export async function fetchYukkuriExplain(
  body: Record<string, unknown>,
  options?: { signal?: AbortSignal }
): Promise<YukkuriDialogue> {
  const signal =
    options?.signal ?? AbortSignal.timeout(YUKKURI_EXPLAIN_TIMEOUT_MS);
  const res = await fetch("/api/yukkuri-explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    error_code?: string;
    cached?: boolean;
    limit?: unknown;
    rink?: string;
    konta?: string;
    tanunee?: string;
  };
  if (!res.ok) {
    throw new YukkuriExplainError({
      message:
        typeof data.error === "string" && data.error.length > 0
          ? data.error
          : `HTTP ${res.status}`,
      errorCode: data.error_code ?? `E_YUKKURI_HTTP_${res.status}`,
      httpStatus: res.status,
      cached: Boolean(data.cached),
      limit: parseYukkuriLimitInfo(data.limit),
    });
  }
  if (
    typeof data.rink === "string" &&
    typeof data.konta === "string" &&
    typeof data.tanunee === "string"
  ) {
    return { rink: data.rink, konta: data.konta, tanunee: data.tanunee };
  }
  throw new YukkuriExplainError({
    message: "応答の形式が不正です",
    errorCode: "E_YUKKURI_CLIENT_BAD_SHAPE",
    httpStatus: res.status,
  });
}

/**
 * ツイート URL 解説 API の返り値に添付されるツイート情報。
 * UI 側で「元ツイートへのリンク」「投稿者の表示名・アバター」を出すために使う。
 */
export type YukkuriTweetContext = {
  tweetId: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  text: string;
};

/**
 * ツイート URL 解説 API（`/api/yukkuri-explain-tweet`）を叩く。
 *
 * 返り値は `{ dialogue, tweet }`:
 * - `dialogue`: 既存ハンドル解説と同じ 3 キャラのセリフ
 * - `tweet`: 元ツイート情報（UI で「この投稿を解説中」と示すのに使う）
 */
export async function fetchYukkuriExplainTweet(
  tweetUrl: string,
  options?: { signal?: AbortSignal }
): Promise<{ dialogue: YukkuriDialogue; tweet: YukkuriTweetContext }> {
  const signal =
    options?.signal ?? AbortSignal.timeout(YUKKURI_EXPLAIN_TIMEOUT_MS);
  const res = await fetch("/api/yukkuri-explain-tweet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tweetUrl }),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    error_code?: string;
    limit?: unknown;
    rink?: string;
    konta?: string;
    tanunee?: string;
    tweet?: {
      id?: string;
      handle?: string;
      displayName?: string | null;
      avatarUrl?: string | null;
      text?: string;
    };
  };
  if (!res.ok) {
    throw new YukkuriExplainError({
      message:
        typeof data.error === "string" && data.error.length > 0
          ? data.error
          : `HTTP ${res.status}`,
      errorCode: data.error_code ?? `E_TWEET_EXPLAIN_HTTP_${res.status}`,
      httpStatus: res.status,
      limit: parseYukkuriLimitInfo(data.limit),
    });
  }
  if (
    typeof data.rink === "string" &&
    typeof data.konta === "string" &&
    typeof data.tanunee === "string" &&
    data.tweet?.id &&
    data.tweet?.handle &&
    typeof data.tweet?.text === "string"
  ) {
    return {
      dialogue: { rink: data.rink, konta: data.konta, tanunee: data.tanunee },
      tweet: {
        tweetId: data.tweet.id,
        handle: data.tweet.handle,
        displayName: data.tweet.displayName ?? null,
        avatarUrl: data.tweet.avatarUrl ?? null,
        text: data.tweet.text,
      },
    };
  }
  throw new YukkuriExplainError({
    message: "応答の形式が不正です",
    errorCode: "E_TWEET_EXPLAIN_CLIENT_BAD_SHAPE",
    httpStatus: res.status,
  });
}

/**
 * サーバーから返った `error_code` と `DOMException` / `Error` を人間向け文に変換する。
 */
export function yukkuriExplainUserMessage(err: unknown): string {
  if (err instanceof YukkuriExplainError) {
    switch (err.errorCode) {
      case "E_YUKKURI_LLM_UPSTREAM_401":
      case "E_YUKKURI_LLM_UPSTREAM_402":
        return "解説 AI の設定に不具合があります。運営にお知らせいただけると助かります。";
      case "E_YUKKURI_LLM_UPSTREAM_429":
        return "解説 AI が混雑しています。30 秒ほど待ってからもう一度お試しください。";
      case "E_YUKKURI_LLM_UPSTREAM_404":
        return "解説 AI のモデル設定が古くなっているかもしれません。運営にお知らせください。";
      case "E_YUKKURI_LLM_TIMEOUT":
        return "生成に時間がかかりすぎました。もう一度試すと早く返ることがあります。";
      case "E_YUKKURI_LLM_UPSTREAM_5XX":
        return "解説 AI の上流サービスが一時的に不安定です。少し待ってから再試行してください。";
      case "E_YUKKURI_LLM_NETWORK":
        return "解説 AI への接続に失敗しました。通信状況を確認して再試行してください。";
      case "E_YUKKURI_LLM_MIXED_FAILED":
        return "解説 AI の複数モデルで失敗しました。少し待ってから再試行してください。";
      case "E_YUKKURI_LLM_NOT_CONFIGURED":
        return "解説 AI が未設定です。運営にお知らせください。";
      case "E_YUKKURI_LIMIT_REACHED":
      case "E_TWEET_EXPLAIN_LIMIT_REACHED":
        return err.message || "本日の解説回数の上限に達しました。明日またお試しください。";
      case "E_YUKKURI_BAD_REQUEST":
        return "リクエストの形式が不正でした。画面を再読み込みしてやり直してください。";
      default:
        if (err.message) return err.message;
        return "解説の取得に失敗しました。もう一度お試しください。";
    }
  }
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    if (err.name === "TimeoutError") {
      return "応答に時間がかかりすぎました。ローカル LLM は初回が長いことがあります。もう一度お試しください。";
    }
  }
  if (err instanceof Error) {
    if (err.name === "AbortError" || err.message === "The operation was aborted.") {
      return "通信が中断されました。もう一度お試しください。";
    }
    if (err.message.length > 0 && err.message.length < 220) {
      return err.message;
    }
  }
  return "解説の取得に失敗しました。もう一度お試しください。";
}
