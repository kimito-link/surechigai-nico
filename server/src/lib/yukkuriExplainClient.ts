/**
 * ゆっくり解説 API 呼び出し（Ollama 等の長時間応答向けにブラウザ側タイムアウトを延長）
 */

export type YukkuriDialogue = { rink: string; konta: string; tanunee: string };

/** サーバー maxDuration 300s + 余裕 */
export const YUKKURI_EXPLAIN_TIMEOUT_MS = 360_000;

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
    rink?: string;
    konta?: string;
    tanunee?: string;
  };
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" && data.error.length > 0
        ? data.error
        : `HTTP ${res.status}`
    );
  }
  if (
    typeof data.rink === "string" &&
    typeof data.konta === "string" &&
    typeof data.tanunee === "string"
  ) {
    return { rink: data.rink, konta: data.konta, tanunee: data.tanunee };
  }
  throw new Error("応答の形式が不正です");
}

export function yukkuriExplainUserMessage(err: unknown): string {
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    if (err.name === "TimeoutError") {
      return "応答に時間がかかりすぎました。ローカルLLMは初回が長いことがあります。もう一度お試しください。";
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
