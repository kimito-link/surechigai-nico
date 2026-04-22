/**
 * ゆっくり解説 API 呼び出し（Ollama 等の長時間応答向けにブラウザ側タイムアウトを延長）
 */

export type YukkuriDialogue = { rink: string; konta: string; tanunee: string };

/** 長すぎる待機を避け、一定時間でフォールバック表示へ切り替える */
export const YUKKURI_EXPLAIN_TIMEOUT_MS = 90_000;

/**
 * サーバーが付与する `error_code` を保持するためのエラー型。
 * UI 側で `err instanceof YukkuriExplainError` で分岐できるようにする。
 */
export class YukkuriExplainError extends Error {
  readonly errorCode: string;
  readonly httpStatus: number;
  readonly cached: boolean;

  constructor(opts: {
    message: string;
    errorCode: string;
    httpStatus: number;
    cached?: boolean;
  }) {
    super(opts.message);
    this.name = "YukkuriExplainError";
    this.errorCode = opts.errorCode;
    this.httpStatus = opts.httpStatus;
    this.cached = opts.cached ?? false;
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
