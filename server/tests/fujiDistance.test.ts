/**
 * server/src/lib/fujiDistance.ts のテスト。
 *
 * 「現在地から富士山までの距離・方位」を 1 行で表示するための
 * 計算ロジックを lock する。距離は Haversine、方位は初期方位。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bearingDeg,
  bearingTo16Direction,
  formatFujiProximityLine,
  getFujiProximity,
  FUJI_LAT,
  FUJI_LNG,
} from "../src/lib/fujiDistance";

const near = (got: number, want: number, tol: number) =>
  Math.abs(got - want) <= tol;

test("bearingDeg: 真北は 0°（北に進む = 緯度が増える）", () => {
  const deg = bearingDeg(35.0, 139.0, 36.0, 139.0);
  assert.ok(near(deg, 0, 0.01), `expected ~0, got ${deg}`);
});

test("bearingDeg: 真東は 90°（経度が増える）", () => {
  const deg = bearingDeg(35.0, 139.0, 35.0, 140.0);
  assert.ok(near(deg, 90, 0.5), `expected ~90, got ${deg}`);
});

test("bearingDeg: 東京駅 → 富士山頂 は概ね西南西（240° 付近）", () => {
  const deg = bearingDeg(35.681, 139.767, FUJI_LAT, FUJI_LNG);
  assert.ok(deg > 235 && deg < 250, `expected 240±10, got ${deg}`);
});

test("bearingTo16Direction: 0° は北、90° は東、180° は南、270° は西", () => {
  assert.equal(bearingTo16Direction(0), "北");
  assert.equal(bearingTo16Direction(90), "東");
  assert.equal(bearingTo16Direction(180), "南");
  assert.equal(bearingTo16Direction(270), "西");
});

test("bearingTo16Direction: 範囲外（負・360超）も 0..360 に正規化", () => {
  assert.equal(bearingTo16Direction(-90), "西");
  assert.equal(bearingTo16Direction(450), "東");
});

test("getFujiProximity: 富士山頂自身は距離 0、cardinal は北（防御）", () => {
  const p = getFujiProximity(FUJI_LAT, FUJI_LNG);
  assert.equal(p.distanceMeters, 0);
  assert.equal(p.distanceKm, 0);
  assert.equal(p.cardinal, "北");
});

test("getFujiProximity: 東京駅は ~100km、方位は南西〜西南西寄り", () => {
  const p = getFujiProximity(35.681, 139.767);
  assert.ok(p.distanceKm >= 95 && p.distanceKm <= 110, `km=${p.distanceKm}`);
  assert.ok(["南西", "西南西", "西"].includes(p.cardinal), `cardinal=${p.cardinal}`);
});

test("formatFujiProximityLine: 通常距離は『🗻 富士山まで Nkm・<方位>（D°）』", () => {
  const p = getFujiProximity(35.681, 139.767);
  const line = formatFujiProximityLine(p);
  assert.match(line, /^🗻 富士山まで \d+km・(北|北北東|北東|東北東|東|東南東|南東|南南東|南|南南西|南西|西南西|西|西北西|北西|北北西)（\d+°）$/);
});

test("formatFujiProximityLine: 50m 未満は『山頂付近』", () => {
  const p = getFujiProximity(FUJI_LAT + 0.0001, FUJI_LNG + 0.0001);
  const line = formatFujiProximityLine(p);
  assert.equal(line, "🗻 富士山頂付近");
});

test("formatFujiProximityLine: 1km 未満は『すぐそこ』", () => {
  const p = getFujiProximity(FUJI_LAT + 0.005, FUJI_LNG);
  const line = formatFujiProximityLine(p);
  assert.equal(line, "🗻 富士山まですぐそこ");
});
