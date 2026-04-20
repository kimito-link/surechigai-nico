/**
 * バッジ定義と評価ロジック
 */

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "milestone" | "rare" | "seasonal";
}

export interface UserStats {
  totalEncounters: number;
  prefectureCount: number;
  hasNightEncounter: boolean;   // 0-4時
  hasEarlyEncounter: boolean;   // 5-6時
  maxRepeatCount: number;       // 同一人物との最大すれちがい回数
  hasWeekendEncounter: boolean; // 土日
  hasMusicEncounter: boolean;   // 曲設定者とすれちがい
  hasGhostEncounter: boolean;   // おさんぽですれちがい
  currentSeason: string;        // "spring" | "summer" | "autumn" | "winter"
  currentYear: number;
  seasonalEncounterCount: number; // 今シーズンのすれちがい数
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // マイルストーン
  { id: "milestone_10", name: "はじめの一歩", description: "10人とすれちがい", icon: "👣", category: "milestone" },
  { id: "milestone_50", name: "顔なじみ", description: "50人とすれちがい", icon: "🌟", category: "milestone" },
  { id: "milestone_100", name: "街の人気者", description: "100人とすれちがい", icon: "🎉", category: "milestone" },
  { id: "milestone_500", name: "すれちがいマスター", description: "500人とすれちがい", icon: "🏆", category: "milestone" },
  { id: "milestone_1000", name: "レジェンド", description: "1000人とすれちがい", icon: "👑", category: "milestone" },

  // レア
  { id: "rare_night_owl", name: "夜ふかしさん", description: "深夜0-4時にすれちがい", icon: "🦉", category: "rare" },
  { id: "rare_early_bird", name: "早起きさん", description: "早朝5-6時にすれちがい", icon: "🐔", category: "rare" },
  { id: "rare_all_prefectures", name: "全国制覇", description: "47都道府県ですれちがい", icon: "🗾", category: "rare" },
  { id: "rare_repeat_3", name: "運命の人", description: "同じ人と3回すれちがい", icon: "🔄", category: "rare" },
  { id: "rare_repeat_10", name: "ソウルメイト", description: "同じ人と10回すれちがい", icon: "💫", category: "rare" },
  { id: "rare_weekend", name: "週末すれちがい", description: "土日にすれちがい", icon: "🎵", category: "rare" },
  { id: "rare_music", name: "音楽仲間", description: "曲を設定している人とすれちがい", icon: "🎧", category: "rare" },
  { id: "rare_ghost", name: "おさんぽマスター", description: "おさんぽで誰かとすれちがい", icon: "👻", category: "rare" },
  { id: "rare_pref_10", name: "旅人", description: "10都道府県ですれちがい", icon: "🧳", category: "rare" },
  { id: "rare_pref_25", name: "日本半周", description: "25都道府県ですれちがい", icon: "🚅", category: "rare" },
];

// シーズン判定
export function getCurrentSeason(): { season: string; label: string; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 3 && month <= 5) return { season: "spring", label: "春", year };
  if (month >= 6 && month <= 8) return { season: "summer", label: "夏", year };
  if (month >= 9 && month <= 11) return { season: "autumn", label: "秋", year };
  return { season: "winter", label: "冬", year };
}

// シーズンバッジを動的生成
export function getSeasonalBadge(): BadgeDefinition {
  const { season, label, year } = getCurrentSeason();
  return {
    id: `seasonal_${season}_${year}`,
    name: `${label}のすれちがい ${year}`,
    description: `${year}年${label}にすれちがい`,
    icon: season === "spring" ? "🌸" : season === "summer" ? "🌻" : season === "autumn" ? "🍁" : "⛄",
    category: "seasonal",
  };
}

// 全バッジ定義を取得(シーズンバッジ含む)
export function getAllBadgeDefinitions(): BadgeDefinition[] {
  return [...BADGE_DEFINITIONS, getSeasonalBadge()];
}

// バッジの評価: statsからどのバッジを獲得しているか判定
export function evaluateBadges(stats: UserStats): string[] {
  const earned: string[] = [];

  // マイルストーン
  if (stats.totalEncounters >= 10) earned.push("milestone_10");
  if (stats.totalEncounters >= 50) earned.push("milestone_50");
  if (stats.totalEncounters >= 100) earned.push("milestone_100");
  if (stats.totalEncounters >= 500) earned.push("milestone_500");
  if (stats.totalEncounters >= 1000) earned.push("milestone_1000");

  // レア
  if (stats.hasNightEncounter) earned.push("rare_night_owl");
  if (stats.hasEarlyEncounter) earned.push("rare_early_bird");
  if (stats.prefectureCount >= 47) earned.push("rare_all_prefectures");
  if (stats.prefectureCount >= 10) earned.push("rare_pref_10");
  if (stats.prefectureCount >= 25) earned.push("rare_pref_25");
  if (stats.maxRepeatCount >= 3) earned.push("rare_repeat_3");
  if (stats.maxRepeatCount >= 10) earned.push("rare_repeat_10");
  if (stats.hasWeekendEncounter) earned.push("rare_weekend");
  if (stats.hasMusicEncounter) earned.push("rare_music");
  if (stats.hasGhostEncounter) earned.push("rare_ghost");

  // シーズン
  if (stats.seasonalEncounterCount > 0) {
    const { season, year } = getCurrentSeason();
    earned.push(`seasonal_${season}_${year}`);
  }

  return earned;
}
