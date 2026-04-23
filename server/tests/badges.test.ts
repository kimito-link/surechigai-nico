/**
 * server/src/lib/badges.ts の単体テスト。
 *
 * バッジは「獲得しきい値」が変わるとユーザー体験に直結するので、
 * 閾値 (10, 50, 100, 500, 1000 / 10, 25, 47 / 3, 10) のロックをここでやる。
 * 将来しきい値を変えるときはこのテストも同時に更新するのが正解。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BADGE_DEFINITIONS,
  evaluateBadges,
  getAllBadgeDefinitions,
  getCurrentSeason,
  getSeasonalBadge,
  type UserStats,
} from "../src/lib/badges";

// baseStats: すべて 0 / false の出発点
const baseStats = (): UserStats => ({
  totalEncounters: 0,
  prefectureCount: 0,
  hasNightEncounter: false,
  hasEarlyEncounter: false,
  maxRepeatCount: 0,
  hasWeekendEncounter: false,
  hasMusicEncounter: false,
  hasGhostEncounter: false,
  currentSeason: "spring",
  currentYear: 2026,
  seasonalEncounterCount: 0,
});

// ---------- evaluateBadges ----------

test("evaluateBadges: 全 0 ステータスではバッジなし", () => {
  assert.deepEqual(evaluateBadges(baseStats()), []);
});

test("evaluateBadges: milestone_10 は 10 件ちょうどで獲得、9 件では未獲得", () => {
  const s = baseStats();
  s.totalEncounters = 9;
  assert.ok(!evaluateBadges(s).includes("milestone_10"));
  s.totalEncounters = 10;
  assert.ok(evaluateBadges(s).includes("milestone_10"));
  s.totalEncounters = 11;
  assert.ok(evaluateBadges(s).includes("milestone_10"));
});

test("evaluateBadges: 1000 件でマイルストーン 5 段階が全部スタックする", () => {
  const s = baseStats();
  s.totalEncounters = 1000;
  const badges = evaluateBadges(s);
  for (const id of [
    "milestone_10",
    "milestone_50",
    "milestone_100",
    "milestone_500",
    "milestone_1000",
  ]) {
    assert.ok(badges.includes(id), `${id} が含まれていること`);
  }
});

test("evaluateBadges: 499 件では 100 まで、500 から milestone_500 が生える", () => {
  const s = baseStats();
  s.totalEncounters = 499;
  const b499 = evaluateBadges(s);
  assert.ok(b499.includes("milestone_100"));
  assert.ok(!b499.includes("milestone_500"));
  s.totalEncounters = 500;
  assert.ok(evaluateBadges(s).includes("milestone_500"));
});

test("evaluateBadges: 都道府県バッジは 10 / 25 / 47 の 3 段階でスタック", () => {
  const s = baseStats();
  s.prefectureCount = 9;
  assert.ok(!evaluateBadges(s).includes("rare_pref_10"));

  s.prefectureCount = 10;
  const at10 = evaluateBadges(s);
  assert.ok(at10.includes("rare_pref_10"));
  assert.ok(!at10.includes("rare_pref_25"));
  assert.ok(!at10.includes("rare_all_prefectures"));

  s.prefectureCount = 25;
  const at25 = evaluateBadges(s);
  assert.ok(at25.includes("rare_pref_10"));
  assert.ok(at25.includes("rare_pref_25"));
  assert.ok(!at25.includes("rare_all_prefectures"));

  s.prefectureCount = 47;
  const at47 = evaluateBadges(s);
  assert.ok(at47.includes("rare_pref_10"));
  assert.ok(at47.includes("rare_pref_25"));
  assert.ok(at47.includes("rare_all_prefectures"));
});

test("evaluateBadges: 同一人物 3 回 / 10 回のリピートバッジはスタック", () => {
  const s = baseStats();
  s.maxRepeatCount = 2;
  assert.ok(!evaluateBadges(s).includes("rare_repeat_3"));

  s.maxRepeatCount = 3;
  const at3 = evaluateBadges(s);
  assert.ok(at3.includes("rare_repeat_3"));
  assert.ok(!at3.includes("rare_repeat_10"));

  s.maxRepeatCount = 10;
  const at10 = evaluateBadges(s);
  assert.ok(at10.includes("rare_repeat_3"));
  assert.ok(at10.includes("rare_repeat_10"));
});

test("evaluateBadges: boolean フラグはそのまま対応バッジに紐づく", () => {
  const withFlag = (key: keyof UserStats): UserStats => ({
    ...baseStats(),
    [key]: true,
  });
  assert.ok(
    evaluateBadges(withFlag("hasNightEncounter")).includes("rare_night_owl")
  );
  assert.ok(
    evaluateBadges(withFlag("hasEarlyEncounter")).includes("rare_early_bird")
  );
  assert.ok(
    evaluateBadges(withFlag("hasWeekendEncounter")).includes("rare_weekend")
  );
  assert.ok(
    evaluateBadges(withFlag("hasMusicEncounter")).includes("rare_music")
  );
  assert.ok(
    evaluateBadges(withFlag("hasGhostEncounter")).includes("rare_ghost")
  );
});

test("evaluateBadges: seasonalEncounterCount > 0 で今シーズンバッジが 1 つ追加される", () => {
  const s = baseStats();
  s.seasonalEncounterCount = 1;
  const badges = evaluateBadges(s);
  const { season, year } = getCurrentSeason();
  assert.ok(badges.includes(`seasonal_${season}_${year}`));
});

test("evaluateBadges: seasonalEncounterCount = 0 ならシーズンバッジ無し", () => {
  const badges = evaluateBadges(baseStats());
  assert.ok(!badges.some((id) => id.startsWith("seasonal_")));
});

// ---------- getCurrentSeason / getSeasonalBadge ----------

test("getCurrentSeason: 4 種類のいずれかを返す", () => {
  const { season } = getCurrentSeason();
  assert.ok(["spring", "summer", "autumn", "winter"].includes(season));
});

test("getSeasonalBadge: id は seasonal_{season}_{year} 形式", () => {
  const badge = getSeasonalBadge();
  const { season, year } = getCurrentSeason();
  assert.equal(badge.id, `seasonal_${season}_${year}`);
  assert.equal(badge.category, "seasonal");
  // アイコンは季節ごとに決まっている
  assert.ok(["🌸", "🌻", "🍁", "⛄"].includes(badge.icon));
});

// ---------- 定義の整合性 ----------

test("BADGE_DEFINITIONS: 各 id は一意 (重複があると UI 表示が壊れる)", () => {
  const ids = BADGE_DEFINITIONS.map((b) => b.id);
  const unique = new Set(ids);
  assert.equal(ids.length, unique.size);
});

test("getAllBadgeDefinitions: 基本バッジ + シーズンバッジ 1 つ", () => {
  const all = getAllBadgeDefinitions();
  assert.equal(all.length, BADGE_DEFINITIONS.length + 1);
  assert.equal(all[all.length - 1].category, "seasonal");
});

test("BADGE_DEFINITIONS: category は milestone / rare のいずれか", () => {
  for (const b of BADGE_DEFINITIONS) {
    assert.ok(
      ["milestone", "rare"].includes(b.category),
      `${b.id} の category が想定外: ${b.category}`
    );
  }
});
