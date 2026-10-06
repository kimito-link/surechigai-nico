/**
 * CSP対応: Hall.headerColor の16進値を、CSS側の data-hall-color セレクタで使う
 * 識別子キーへ変換する。インライン style（style={{ backgroundColor }}）は
 * Content-Security-Policy の style-src 'self' に違反するため、色は CSS Modules の
 * 固定セレクタ（例: `.hallCardBar[data-hall-color="blue"]`）で定義する。
 *
 * venue-map-data.ts の HEADER_* 定数と一致させること（値を変えたらここも直す）。
 */
export const HEADER_COLOR_TO_KEY: Record<string, string> = {
  "#7e57c2": "purple",
  "#42a5f5": "blue",
  "#ec407a": "pink",
  "#66bb6a": "green",
  "#ff9800": "orange",
  "#26a69a": "teal",
};

export const hallColorKey = (hex: string): string =>
  HEADER_COLOR_TO_KEY[hex.toLowerCase()] ?? "blue";
