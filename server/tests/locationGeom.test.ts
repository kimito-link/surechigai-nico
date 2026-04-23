/**
 * server/src/lib/locationGeom.ts の単体テスト。
 *
 * - `toGrid` は 500m グリッド判定の核。floor ベースなので正負の向きで
 *   挙動が微妙に変わる。すれ違い判定がずれると「近くにいるのに合わない」。
 * - `assertFiniteLatLng` は API 入口の防御。NaN / Infinity / 型違いを
 *   弾くことで、`latLngToCell` や SQL に毒入りの値を渡さない。
 * - `toH3Cell` は h3-js を使った新しいセル化。決定的性と同一セル性を lock。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertFiniteLatLng,
  H3_RES_DEFAULT,
  LAT_GRID,
  LNG_GRID,
  toGrid,
  toH3Cell,
} from "../src/lib/locationGeom";

// ---------- grid 定数 ----------

test("LAT_GRID / LNG_GRID: 既定値のロック（約 500m 相当）", () => {
  // 緯度方向 0.0045° ≈ 500m
  assert.equal(LAT_GRID, 0.0045);
  // 緯度 35° 付近の経度方向 0.0055° ≈ 500m
  assert.equal(LNG_GRID, 0.0055);
});

test("H3_RES_DEFAULT: エッジ ~460m 相当の解像度 8 をデフォルトに固定", () => {
  assert.equal(H3_RES_DEFAULT, 8);
});

// ---------- toGrid ----------

test("toGrid: (0, 0) はそのまま (0, 0)", () => {
  const g = toGrid(0, 0);
  assert.equal(g.latGrid, 0);
  assert.equal(g.lngGrid, 0);
});

test("toGrid: 微小な正の値は floor で 0 に切り捨て", () => {
  // 0.001 / 0.0045 = 0.22 → floor 0 → 0
  const g = toGrid(0.001, 0.001);
  assert.equal(g.latGrid, 0);
  assert.equal(g.lngGrid, 0);
});

test("toGrid: グリッド境界ちょうどは「次のグリッド」に入る", () => {
  // 0.0045 / 0.0045 = 1 → floor 1 → 0.0045
  const g = toGrid(LAT_GRID, LNG_GRID);
  assert.ok(Math.abs(g.latGrid - LAT_GRID) < 1e-9);
  assert.ok(Math.abs(g.lngGrid - LNG_GRID) < 1e-9);
});

test("toGrid: 500m 以内のずれは同じグリッドに入る（会場内マッチングの根拠）", () => {
  // 幕張メッセ付近で 10m 程度の差では同じグリッドに入るべき
  const a = toGrid(35.6490, 140.0356);
  const b = toGrid(35.6491, 140.0357);
  assert.equal(a.latGrid, b.latGrid);
  assert.equal(a.lngGrid, b.lngGrid);
});

test("toGrid: 負の座標は floor が -∞ 方向に丸まる", () => {
  // -0.001 / 0.0045 = -0.22 → floor -1 → -0.0045
  const g = toGrid(-0.001, -0.001);
  assert.ok(Math.abs(g.latGrid - -LAT_GRID) < 1e-9);
  assert.ok(Math.abs(g.lngGrid - -LNG_GRID) < 1e-9);
});

// ---------- assertFiniteLatLng ----------

test("assertFiniteLatLng: 有限数値のペアはそのまま narrow されて返る", () => {
  const r = assertFiniteLatLng(35.68, 139.76);
  assert.deepEqual(r, { lat: 35.68, lng: 139.76 });
});

test("assertFiniteLatLng: null / undefined は null", () => {
  assert.equal(assertFiniteLatLng(null, null), null);
  assert.equal(assertFiniteLatLng(undefined, undefined), null);
  assert.equal(assertFiniteLatLng(35.68, null), null);
  assert.equal(assertFiniteLatLng(null, 139.76), null);
});

test("assertFiniteLatLng: NaN / Infinity は null", () => {
  assert.equal(assertFiniteLatLng(NaN, 0), null);
  assert.equal(assertFiniteLatLng(0, NaN), null);
  assert.equal(assertFiniteLatLng(Infinity, 0), null);
  assert.equal(assertFiniteLatLng(0, -Infinity), null);
});

test("assertFiniteLatLng: 文字列の数値は弾く（型厳格）", () => {
  // 暗黙変換に頼らないのは意図的。JSON パース後に string が残っていたら
  // そのままバリデーションエラーにする。
  assert.equal(assertFiniteLatLng("35.68", "139.76"), null);
  assert.equal(assertFiniteLatLng("0", "0"), null);
});

test("assertFiniteLatLng: 0 は有効値として通る（falsy trap 防止）", () => {
  // 0 を null 扱いするバグを絶対に入れない。赤道や本初子午線上で事故る。
  assert.deepEqual(assertFiniteLatLng(0, 0), { lat: 0, lng: 0 });
});

test("assertFiniteLatLng: 負の値も通る", () => {
  assert.deepEqual(
    assertFiniteLatLng(-33.8688, -118.2437),
    { lat: -33.8688, lng: -118.2437 }
  );
});

// ---------- toH3Cell ----------

test("toH3Cell: 同じ入力は同じセルを返す（決定的）", () => {
  const a = toH3Cell(35.6490, 140.0356);
  const b = toH3Cell(35.6490, 140.0356);
  assert.equal(a, b);
});

test("toH3Cell: res 省略時はデフォルト解像度と同じ結果", () => {
  const a = toH3Cell(35.6490, 140.0356);
  const b = toH3Cell(35.6490, 140.0356, H3_RES_DEFAULT);
  assert.equal(a, b);
});

test("toH3Cell: 30m 程度離れた点は同じセル（r8 のエッジ ~460m）", () => {
  // 0.0003° ≈ 33m だけ緯度を動かしても同じ r8 セル
  const a = toH3Cell(35.6490, 140.0356);
  const b = toH3Cell(35.6493, 140.0356);
  assert.equal(a, b);
});

test("toH3Cell: 大きく離れた点は違うセル", () => {
  const tokyo = toH3Cell(35.6812, 139.7671);
  const osaka = toH3Cell(34.7025, 135.4960);
  assert.notEqual(tokyo, osaka);
});
