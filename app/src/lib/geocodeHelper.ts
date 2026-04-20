import * as Location from "expo-location";

// 現在地の都道府県を取得(Expoの逆ジオコーディング使用)
export async function reverseGeocodeLocal(lat: number, lng: number): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (results.length > 0) {
      const r = results[0];
      // Expoのregionが都道府県に対応
      return r.region || null;
    }
  } catch {}
  return null;
}
