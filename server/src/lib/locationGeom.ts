/**
 * 位置情報の座標・グリッド・H3 を扱う共通ヘルパー。
 *
 * 重要な前提:
 * - MySQL 8.0 + SRID 4326 の軸順序は (lat, lng)。WKT も ST_SRID(POINT(x,y),4326) も同じ。
 * - 全ての書き込み/比較は (lat, lng) の順で統一する（歴史的に debug 系で逆順だったのを是正）。
 */

import { latLngToCell } from "h3-js";

/** グリッド1セルの緯度方向ステップ（約 500m 相当） */
export const LAT_GRID = 0.0045;
/** グリッド1セルの経度方向ステップ（日本の緯度35度付近で約 500m 相当） */
export const LNG_GRID = 0.0055;

/**
 * H3 の解像度。
 * r8: エッジ長 ~ 460m。これまでの 500m 四角グリッドとほぼ等価で、会場内すれちがい用途に丁度よい。
 */
export const H3_RES_DEFAULT = 8;

export type GridValues = {
  latGrid: number;
  lngGrid: number;
};

/** 500m グリッドにスナップ（従来互換: Math.floor ベース） */
export function toGrid(lat: number, lng: number): GridValues {
  return {
    latGrid: Math.floor(lat / LAT_GRID) * LAT_GRID,
    lngGrid: Math.floor(lng / LNG_GRID) * LNG_GRID,
  };
}

/** 緯度経度 → H3 cell (string) */
export function toH3Cell(lat: number, lng: number, res = H3_RES_DEFAULT): string {
  return latLngToCell(lat, lng, res);
}

/**
 * lat/lng が有限な実数かどうかを判定しつつ、`{ lat, lng }` を narrow して返す。
 * NaN/Infinity/非 number を弾く。
 */
export function assertFiniteLatLng(
  lat: unknown,
  lng: unknown
): { lat: number; lng: number } | null {
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return { lat, lng };
  }
  return null;
}

