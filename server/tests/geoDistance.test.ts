/**
 * server/src/lib/geoDistance.ts の haversineMeters の単体テスト。
 *
 * すれ違い判定は 500m グリッドで動くので、この関数の計算が狂うと
 * 会場内で近くにいる人同士がマッチできなくなる（= 企画の根幹が壊れる）。
 * 既知の距離と数学的プロパティで挙動を lock する。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { haversineMeters } from "../src/lib/geoDistance";

// 実装と同じ地球半径 (m)
const EARTH_R = 6_371_000;
// 球体地球での緯度 1° ≈ 111,194.9 m
const ONE_DEG_LAT_M = (2 * Math.PI * EARTH_R) / 360;

// 浮動小数の許容差で近いかを判定
const near = (got: number, want: number, tol: number) =>
  Math.abs(got - want) <= tol;

test("haversineMeters: 同一点は厳密に 0", () => {
  assert.equal(haversineMeters(35.681, 139.767, 35.681, 139.767), 0);
  assert.equal(haversineMeters(0, 0, 0, 0), 0);
  assert.equal(haversineMeters(-90, 180, -90, 180), 0);
});

test("haversineMeters: 緯度 1 度の差 ≈ 111.2 km", () => {
  const d = haversineMeters(0, 0, 1, 0);
  assert.ok(
    near(d, ONE_DEG_LAT_M, 1),
    `expected ~${ONE_DEG_LAT_M.toFixed(2)} m, got ${d.toFixed(2)} m`
  );
});

test("haversineMeters: 赤道上の経度 1 度差 ≈ 緯度 1 度差", () => {
  const d = haversineMeters(0, 0, 0, 1);
  assert.ok(
    near(d, ONE_DEG_LAT_M, 1),
    `expected ~${ONE_DEG_LAT_M.toFixed(2)} m, got ${d.toFixed(2)} m`
  );
});

test("haversineMeters: 高緯度では経度 1 度差が cos(lat) 倍に縮む", () => {
  // 北緯 60° では 1° ≈ cos(60°) × 111.2 km = 55.6 km
  const d = haversineMeters(60, 0, 60, 1);
  const expected = ONE_DEG_LAT_M * Math.cos((60 * Math.PI) / 180);
  assert.ok(
    near(d, expected, 2),
    `expected ~${expected.toFixed(2)} m, got ${d.toFixed(2)} m`
  );
});

test("haversineMeters: 対称性 A→B と B→A は完全一致", () => {
  // 浮動小数演算の順序差で微小ずれる可能性はあるが、
  // 実装の式は dLat^2, dLng^2, cos()*cos() が可換なので等しいはず
  const a = haversineMeters(35.681, 139.767, 34.702, 135.496);
  const b = haversineMeters(34.702, 135.496, 35.681, 139.767);
  assert.equal(a, b);
});

test("haversineMeters: 東京駅 ↔ 大阪駅 ≈ 約 400 km（既知距離ロック）", () => {
  // 東京駅: 35.681236, 139.767125
  // 大阪駅: 34.702485, 135.495951
  // 大圏距離は各種ツール・公式で 395-405 km の範囲で一致
  const d = haversineMeters(35.681236, 139.767125, 34.702485, 135.495951);
  assert.ok(
    d > 395_000 && d < 410_000,
    `expected ~400 km, got ${(d / 1000).toFixed(2)} km`
  );
});

test("haversineMeters: 会場内の 500m 精度（マッチング grid 相当）", () => {
  // 幕張メッセ付近 (35.649, 140.035) から 0.005° 北 = 約 556 m
  const d = haversineMeters(35.649, 140.035, 35.654, 140.035);
  assert.ok(
    d > 500 && d < 600,
    `expected ~556 m, got ${d.toFixed(2)} m`
  );
});

test("haversineMeters: 南半球・西半球の負座標でも動く", () => {
  // シドニー (-33.8688, 151.2093) ↔ ロサンゼルス (34.0522, -118.2437)
  // 既知の大圏距離 ≈ 12,050 km (ツールにより 12,000-12,100 km)
  const d = haversineMeters(-33.8688, 151.2093, 34.0522, -118.2437);
  assert.ok(
    d > 11_900_000 && d < 12_200_000,
    `expected ~12,050 km, got ${(d / 1000).toFixed(2)} km`
  );
});

test("haversineMeters: 日付変更線またぎ (+179° ↔ -179°) は短い方の 2° で返る", () => {
  // dLng = -358° になるが sin(dLng/2)^2 は周期的なので
  // sin(1°)^2 と等価。つまり自動的に「短い方 = 2°」の距離になる。
  // これが効かないと世界地図の端で誤マッチする。
  const d = haversineMeters(0, 179, 0, -179);
  const expected = 2 * ONE_DEG_LAT_M; // 赤道上 2° ≈ 222.4 km
  assert.ok(
    near(d, expected, 10),
    `expected ~${expected.toFixed(2)} m (短い側), got ${d.toFixed(2)} m`
  );
});

test("haversineMeters: ~10m の極小距離も計算できる", () => {
  // 緯度差 0.00009° ≈ 10.01 m
  const d = haversineMeters(35.6490, 140.0356, 35.64909, 140.0356);
  assert.ok(d > 9 && d < 11, `expected ~10 m, got ${d.toFixed(2)} m`);
});

test("haversineMeters: 極点 (北極 ↔ 南極) は地球半周 ≈ 20,015 km", () => {
  // 180° の緯度差 = π·R メートル
  const d = haversineMeters(90, 0, -90, 0);
  const expected = Math.PI * EARTH_R;
  assert.ok(
    near(d, expected, 1),
    `expected ~${(expected / 1000).toFixed(2)} km, got ${(d / 1000).toFixed(2)} km`
  );
});

test("haversineMeters: NaN を渡したら NaN が返る（防御は呼び出し側の契約）", () => {
  // 現状の実装は NaN / Infinity に無防備。この挙動を lock することで
  // 「NaN 防御は呼び出し側でやる」という契約を明示する。
  // 将来防御を足すときはこのテストも同時に更新すること。
  assert.ok(Number.isNaN(haversineMeters(NaN, 0, 0, 0)));
  assert.ok(Number.isNaN(haversineMeters(0, NaN, 0, 0)));
  assert.ok(Number.isNaN(haversineMeters(0, 0, NaN, 0)));
  assert.ok(Number.isNaN(haversineMeters(0, 0, 0, NaN)));
});
