/**
 * ゆっくり解説のファネル計測イベント（純粋関数。PII は載せない）。
 *
 * ファネル: explain_start → explain_success / explain_error / explain_limit
 *           → share_click / register_click
 *
 * - ハンドル・ツイート ID・本文は送らない（匿名ビーコンの方針に合わせる）。
 * - 送信は既存の `clientAnalytics.trackProductEvent`（/api/analytics/beacon）。
 * - `NEXT_PUBLIC_YUKKURI_FUNNEL_EVENTS=0` で送信停止できる。
 */

export type YukkuriMode = "handle" | "tweet";

export type YukkuriFunnelStep =
  | { step: "explain_start"; mode: YukkuriMode }
  | { step: "explain_success"; mode: YukkuriMode; elapsedMs: number }
  | { step: "explain_error"; mode: YukkuriMode; errorCode: string; elapsedMs: number }
  | { step: "explain_limit"; mode: YukkuriMode; scope: "client" | "global" }
  | { step: "share_click"; mode: YukkuriMode; surface: string }
  | { step: "register_click"; mode: YukkuriMode; surface: string };

export type FunnelEvent = {
  name: string;
  payload: Record<string, string | number | boolean>;
};

/** 経過時間はバケット化（細かすぎる値で個人を特定しにくくする + 集計しやすく） */
export function elapsedBucket(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "unknown";
  if (ms < 3_000) return "<3s";
  if (ms < 10_000) return "3-10s";
  if (ms < 30_000) return "10-30s";
  if (ms < 60_000) return "30-60s";
  return ">=60s";
}

/** error_code は英大文字・数字・_ のみ・64 文字以内に正規化（自由文の混入防止） */
export function sanitizeErrorCode(code: string): string {
  const c = (code || "").toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 64);
  return c || "UNKNOWN";
}

export function buildYukkuriFunnelEvent(s: YukkuriFunnelStep): FunnelEvent {
  const name = `yukkuri_${s.step}`;
  switch (s.step) {
    case "explain_start":
      return { name, payload: { mode: s.mode } };
    case "explain_success":
      return { name, payload: { mode: s.mode, elapsed: elapsedBucket(s.elapsedMs) } };
    case "explain_error":
      return {
        name,
        payload: {
          mode: s.mode,
          code: sanitizeErrorCode(s.errorCode),
          elapsed: elapsedBucket(s.elapsedMs),
        },
      };
    case "explain_limit":
      return { name, payload: { mode: s.mode, scope: s.scope } };
    case "share_click":
    case "register_click":
      return { name, payload: { mode: s.mode, surface: s.surface.slice(0, 32) } };
  }
}

export function funnelEventsEnabled(flag: string | undefined): boolean {
  const f = (flag ?? "").trim().toLowerCase();
  return !(f === "0" || f === "off" || f === "false");
}
