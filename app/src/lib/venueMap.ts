import { Platform } from "react-native";
import { SERVER_BASE } from "@/lib/api";

/** Next.js public に置いた会場マップ PDF（サーバーと同じオリジン） */
export const VENUE_MAP_PDF_PATH = "/chokaigi/map/chokaigi2026_map.pdf";

export function getVenueMapPdfUrl(): string {
  return `${SERVER_BASE}${VENUE_MAP_PDF_PATH}`;
}

/**
 * WebView 用。Android は PDF の直接表示が不安定なことがあるため、
 * 本番 HTTPS のときは Google ドキュメントビューアを挟む。
 */
export function getVenueMapWebViewUri(): string {
  const raw = getVenueMapPdfUrl();
  if (Platform.OS === "android" && raw.startsWith("https://")) {
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(raw)}`;
  }
  return raw;
}
