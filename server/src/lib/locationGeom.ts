/**
 * 位置情報の座標・グリッド・H3 を扱う共通ヘルパー。
 *
 * 重要な前提:
 * - MySQL 8.0 + SRID 4326 の軸順序は (lat, lng)。WKT も ST_SRID(POINT(x,y),4326) も同じ。
 * - 全ての書き込み/比較は (lat, lng) の順で統一する（歴史的に debug 系で逆順だったのを是正）。
 */

import { latLngToCell, cellToLatLng, gridDisk } from "h3-js";

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

/** H3 cell → 中心緯度経度 */
export function h3CellToLatLng(cell: string): { lat: number; lng: number } {
  const [lat, lng] = cellToLatLng(cell);
  return { lat, lng };
}

/**
 * 指定 cell の "k-ring"（自セル＋近傍 k 段）を返す。
 * matcher の近傍プレフィルタで使用。
 */
export function h3NeighborCells(cell: string, k: number): string[] {
  return gridDisk(cell, k);
}

/**
 * lat/lng が有限な実数かどうか。NaN/Infinity を弾く。
 * Type predicate で両引数をまとめて number に narrow する。
 */
export function isFiniteLatLng(
  lat: unknown,
  lng: unknown
): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

/**
 * isFiniteLatLng の type-predicate 版。tuple で narrow する。
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

/**
 * MySQL 8.0 SRID 4326 の (lat, lng) 順で POINT を作る SQL 式と bind 値のペア。
 *
 * 使い方:
 *   const { expr, bindings } = pointSqlLatLng(lat, lng);
 *   VALUES (?, ${expr}, ...)   // expr は "ST_SRID(POINT(?, ?), 4326)" を返す
 *   pool.execute(sql, [..., ...bindings, ...])
 */
export function pointSqlLatLng(
  lat: number,
  lng: number
): { expr: string; bindings: [number, number] } {
  return {
    expr: "ST_SRID(POINT(?, ?), 4326)",
    bindings: [lat, lng],
  };
}
