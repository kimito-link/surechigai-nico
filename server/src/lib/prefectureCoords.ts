/**
 * 47都道府県の代表座標（県庁所在地近傍）と地域分類。
 * municipality 文字列（例: "千葉県美浜区"）から都道府県を抽出し、
 * 日本地図上の座標 (lat, lng) に解決するために使う。
 */

export type Region =
  | "北海道"
  | "東北"
  | "関東"
  | "中部"
  | "近畿"
  | "中国"
  | "四国"
  | "九州"
  | "沖縄";

export type PrefectureInfo = {
  name: string;
  lat: number;
  lng: number;
  region: Region;
};

export const PREFECTURES: PrefectureInfo[] = [
  { name: "北海道", lat: 43.06417, lng: 141.34694, region: "北海道" },
  { name: "青森県", lat: 40.82444, lng: 140.74, region: "東北" },
  { name: "岩手県", lat: 39.70361, lng: 141.1525, region: "東北" },
  { name: "宮城県", lat: 38.26889, lng: 140.87194, region: "東北" },
  { name: "秋田県", lat: 39.71861, lng: 140.1025, region: "東北" },
  { name: "山形県", lat: 38.24056, lng: 140.36333, region: "東北" },
  { name: "福島県", lat: 37.75, lng: 140.46778, region: "東北" },
  { name: "茨城県", lat: 36.34139, lng: 140.44667, region: "関東" },
  { name: "栃木県", lat: 36.56583, lng: 139.88361, region: "関東" },
  { name: "群馬県", lat: 36.39111, lng: 139.06083, region: "関東" },
  { name: "埼玉県", lat: 35.85694, lng: 139.64889, region: "関東" },
  { name: "千葉県", lat: 35.60472, lng: 140.12333, region: "関東" },
  { name: "東京都", lat: 35.68944, lng: 139.69167, region: "関東" },
  { name: "神奈川県", lat: 35.44778, lng: 139.6425, region: "関東" },
  { name: "新潟県", lat: 37.90222, lng: 139.02361, region: "中部" },
  { name: "富山県", lat: 36.69528, lng: 137.21139, region: "中部" },
  { name: "石川県", lat: 36.59444, lng: 136.62556, region: "中部" },
  { name: "福井県", lat: 36.06528, lng: 136.22194, region: "中部" },
  { name: "山梨県", lat: 35.66389, lng: 138.56833, region: "中部" },
  { name: "長野県", lat: 36.65139, lng: 138.18111, region: "中部" },
  { name: "岐阜県", lat: 35.39111, lng: 136.72222, region: "中部" },
  { name: "静岡県", lat: 34.97694, lng: 138.38306, region: "中部" },
  { name: "愛知県", lat: 35.18028, lng: 136.90667, region: "中部" },
  { name: "三重県", lat: 34.73028, lng: 136.50861, region: "近畿" },
  { name: "滋賀県", lat: 35.00444, lng: 135.86833, region: "近畿" },
  { name: "京都府", lat: 35.02139, lng: 135.75556, region: "近畿" },
  { name: "大阪府", lat: 34.68639, lng: 135.52, region: "近畿" },
  { name: "兵庫県", lat: 34.69139, lng: 135.18306, region: "近畿" },
  { name: "奈良県", lat: 34.68528, lng: 135.83278, region: "近畿" },
  { name: "和歌山県", lat: 34.22611, lng: 135.1675, region: "近畿" },
  { name: "鳥取県", lat: 35.50361, lng: 134.23833, region: "中国" },
  { name: "島根県", lat: 35.47222, lng: 133.05056, region: "中国" },
  { name: "岡山県", lat: 34.66167, lng: 133.935, region: "中国" },
  { name: "広島県", lat: 34.39639, lng: 132.45944, region: "中国" },
  { name: "山口県", lat: 34.18583, lng: 131.47139, region: "中国" },
  { name: "徳島県", lat: 34.06583, lng: 134.55944, region: "四国" },
  { name: "香川県", lat: 34.34028, lng: 134.04333, region: "四国" },
  { name: "愛媛県", lat: 33.84167, lng: 132.76611, region: "四国" },
  { name: "高知県", lat: 33.55972, lng: 133.53111, region: "四国" },
  { name: "福岡県", lat: 33.60639, lng: 130.41806, region: "九州" },
  { name: "佐賀県", lat: 33.24944, lng: 130.29889, region: "九州" },
  { name: "長崎県", lat: 32.74472, lng: 129.87361, region: "九州" },
  { name: "熊本県", lat: 32.78972, lng: 130.74167, region: "九州" },
  { name: "大分県", lat: 33.23806, lng: 131.6125, region: "九州" },
  { name: "宮崎県", lat: 31.91111, lng: 131.42389, region: "九州" },
  { name: "鹿児島県", lat: 31.56028, lng: 130.55806, region: "九州" },
  { name: "沖縄県", lat: 26.2125, lng: 127.68111, region: "沖縄" },
];

const SORTED_PREFECTURES = [...PREFECTURES].sort(
  (a, b) => b.name.length - a.name.length
);

/**
 * "千葉県美浜区" のような municipality 文字列から都道府県を抽出する。
 * 見つからない場合は null。
 */
export function extractPrefecture(municipality: string | null | undefined): PrefectureInfo | null {
  if (!municipality) return null;
  for (const pref of SORTED_PREFECTURES) {
    if (municipality.startsWith(pref.name)) return pref;
  }
  return null;
}

/**
 * lat/lng から最寄りの都道府県を返す。逆ジオ（municipality 文字列）が欠損しているときの
 * フォールバックとして使う。県庁所在地との単純な二乗距離で比較。
 */
export function nearestPrefectureByLatLng(
  lat: number | null | undefined,
  lng: number | null | undefined
): PrefectureInfo | null {
  if (lat == null || lng == null) return null;
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  let best: { pref: PrefectureInfo; dist: number } | null = null;
  for (const p of PREFECTURES) {
    const dLat = p.lat - la;
    const dLng = p.lng - lo;
    const dist = dLat * dLat + dLng * dLng;
    if (best == null || dist < best.dist) {
      best = { pref: p, dist };
    }
  }
  return best ? best.pref : null;
}

/**
 * 位置レコードを都道府県に分類するヘルパ。
 *  1) municipality が "長野県…" のように県プレフィックスを持てばそれを採用
 *  2) なければ lat/lng から最寄り県にフォールバック
 * 逆ジオ補完が終わっていない古い行（municipality=NULL）も集計に乗せるために使う。
 */
export function classifyLocationToPrefecture(
  municipality: string | null | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined
): PrefectureInfo | null {
  const fromMuni = extractPrefecture(municipality);
  if (fromMuni) return fromMuni;
  return nearestPrefectureByLatLng(lat, lng);
}

/**
 * 日本本土の概算バウンディングボックス（沖縄は別扱い）。
 * 北海道最北端〜本州南端 + 九州南端までをカバー。
 */
export const JAPAN_MAIN_BOUNDS = {
  minLat: 31.0,
  maxLat: 45.6,
  minLng: 129.5,
  maxLng: 146.0,
};

/**
 * lat/lng を JAPAN_MAIN_BOUNDS 内の %座標 (0..100) に変換。
 * 本土範囲外 (沖縄など) は null を返し、呼び出し側で別扱いする。
 */
export function latLngToPercent(
  lat: number,
  lng: number
): { leftPct: number; topPct: number } | null {
  if (
    lat < JAPAN_MAIN_BOUNDS.minLat ||
    lat > JAPAN_MAIN_BOUNDS.maxLat ||
    lng < JAPAN_MAIN_BOUNDS.minLng ||
    lng > JAPAN_MAIN_BOUNDS.maxLng
  ) {
    return null;
  }
  const leftPct =
    ((lng - JAPAN_MAIN_BOUNDS.minLng) /
      (JAPAN_MAIN_BOUNDS.maxLng - JAPAN_MAIN_BOUNDS.minLng)) *
    100;
  // lat は上（大きい数字）が北なので反転
  const topPct =
    ((JAPAN_MAIN_BOUNDS.maxLat - lat) /
      (JAPAN_MAIN_BOUNDS.maxLat - JAPAN_MAIN_BOUNDS.minLat)) *
    100;
  return { leftPct, topPct };
}
