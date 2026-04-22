/**
 * A/B 最適化の置き場（小さく始める前提）
 *
 * 第1候補:
 * - CTA 文言（ヒーロー・フッター）
 * - 検索導線（プレースホルダ / サブコピー）
 * - ライブマップ訴求（見出し・バッジ）
 *
 * 運用: まずは `NEXT_PUBLIC_AB_VARIANT` や Cookie で variant を切り、
 * `clientAnalytics.trackProductEvent("ab_exposure", { experiment, variant })` を併用する。
 */

export const EXPERIMENTS_DOC_VERSION = "2026-04-22" as const;

/** 未設定時はコントロール扱い */
export function getAbVariant(key: string): "control" | "a" | "b" {
  if (typeof window === "undefined") return "control";
  try {
    const fromEnv = process.env.NEXT_PUBLIC_AB_VARIANT;
    if (fromEnv === "a" || fromEnv === "b") return fromEnv;
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${key}=`));
    const v = cookie?.split("=")[1];
    if (v === "a" || v === "b") return v;
  } catch {
    /* ignore */
  }
  return "control";
}
