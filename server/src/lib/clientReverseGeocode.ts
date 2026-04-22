"use client";

/**
 * ブラウザ側で Geolonia Open Reverse Geocoder を使い、
 * Nominatim への同期依存を無くすためのラッパー。
 *
 * - ベクトルタイルを CDN から取得して client side で point-in-polygon 計算するので
 *   サーバー負荷ゼロ、Nominatim のレート制限とも無関係。
 * - 失敗した場合 (ネットワーク/領域外) は null を返し、呼び出し側は municipality を
 *   未指定のまま POST する。サーバー側 fallback (Nominatim) が補完を試みる。
 */

export type ClientReverseGeocodeResult = {
  prefecture: string | null;
  city: string | null;
  municipality: string | null; // `${prefecture}${city}` または city 単体
};

let cachedResult: {
  latRounded: number;
  lngRounded: number;
  value: ClientReverseGeocodeResult | null;
} | null = null;

function roundKey(v: number): number {
  // 500m 以内で同じ結果を返す前提で、0.005 度にスナップしてキャッシュ
  return Math.round(v / 0.005) * 0.005;
}

export async function clientReverseGeocode(
  lat: number,
  lng: number
): Promise<ClientReverseGeocodeResult | null> {
  if (typeof window === "undefined") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const keyLat = roundKey(lat);
  const keyLng = roundKey(lng);
  if (
    cachedResult &&
    cachedResult.latRounded === keyLat &&
    cachedResult.lngRounded === keyLng
  ) {
    return cachedResult.value;
  }

  try {
    const mod = await import("@geolonia/open-reverse-geocoder");
    // Geolonia は引数が [lng, lat] 順であることに注意
    const result = await mod.openReverseGeocoder([lng, lat]);
    const prefecture = result?.prefecture?.trim() || null;
    const city = result?.city?.trim() || null;
    const municipality =
      prefecture && city
        ? `${prefecture}${city}`
        : city || prefecture || null;
    const value: ClientReverseGeocodeResult = { prefecture, city, municipality };
    cachedResult = { latRounded: keyLat, lngRounded: keyLng, value };
    return value;
  } catch (err) {
    console.warn("[clientReverseGeocode] failed", err);
    cachedResult = { latRounded: keyLat, lngRounded: keyLng, value: null };
    return null;
  }
}
