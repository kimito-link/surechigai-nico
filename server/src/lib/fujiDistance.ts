/**
 * 富士山（剣ヶ峰）までの距離・方位を返すユーティリティ。
 *
 * 距離は Haversine（球面）、方位は初期方位（initial bearing / forward azimuth）
 * を返す。日本国内のスケール（〜1500km）では Haversine の誤差は無視できるため、
 * 既存の haversineMeters と同じ式を再利用する。
 *
 * 既存アプリの「位置情報を送る」UI に「🗻 富士山まで XX km / YY°（方位）」を
 * 1 行で添えるための薄い計算層。
 */
import { haversineMeters } from "./geoDistance";

/** 富士山頂（剣ヶ峰）の代表座標（国土地理院 三角点）。 */
export const FUJI_LAT = 35.360622;
export const FUJI_LNG = 138.727411;

const COMPASS_16 = [
  "北", "北北東", "北東", "東北東",
  "東", "東南東", "南東", "南南東",
  "南", "南南西", "南西", "西南西",
  "西", "西北西", "北西", "北北西",
] as const;

export type FujiCardinal16 = typeof COMPASS_16[number];

/**
 * 2 点間の初期方位（度・北を 0、東を 90）。
 */
export function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const deg = (toDeg(θ) + 360) % 360;
  return deg;
}

export function bearingTo16Direction(deg: number): FujiCardinal16 {
  const idx = Math.round(((deg % 360) + 360) / 22.5) % 16;
  return COMPASS_16[idx];
}

export type FujiProximity = {
  /** メートル単位の距離 */
  distanceMeters: number;
  /** km 単位の整数距離（表示用） */
  distanceKm: number;
  /** 方位（北 0°、東 90°） */
  bearingDeg: number;
  /** 16 方位日本語表記（例：「南西」） */
  cardinal: FujiCardinal16;
};

/**
 * 現在地から富士山頂までの距離・方位を計算。
 * 富士山頂直近（< 100m）は方位が不安定なので、cardinal は便宜的に「北」を返す。
 */
export function getFujiProximity(lat: number, lng: number): FujiProximity {
  const m = haversineMeters(lat, lng, FUJI_LAT, FUJI_LNG);
  const deg = m < 100 ? 0 : bearingDeg(lat, lng, FUJI_LAT, FUJI_LNG);
  return {
    distanceMeters: m,
    distanceKm: Math.round(m / 1000),
    bearingDeg: Math.round(deg),
    cardinal: bearingTo16Direction(deg),
  };
}

/**
 * 「🗻 富士山まで XX km・南西（225°）」のような 1 行表示用テキスト。
 *
 * - 1km 未満は「すぐそこ」
 * - 50m 未満は「山頂付近」
 */
export function formatFujiProximityLine(p: FujiProximity): string {
  if (p.distanceMeters < 50) return "🗻 富士山頂付近";
  if (p.distanceMeters < 1000) return "🗻 富士山まですぐそこ";
  return `🗻 富士山まで ${p.distanceKm}km・${p.cardinal}（${p.bearingDeg}°）`;
}
