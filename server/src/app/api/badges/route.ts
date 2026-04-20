import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getAllBadgeDefinitions, evaluateBadges, getCurrentSeason } from "@/lib/badges";
import type { UserStats } from "@/lib/badges";
import type { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  // ユーザーの統計情報を取得
  const [encounterCount] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT CASE WHEN user1_id = ? THEN user2_id ELSE user1_id END) AS total
     FROM encounters WHERE user1_id = ? OR user2_id = ?`,
    [authResult.id, authResult.id, authResult.id]
  );

  const [prefCount] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM user_prefectures WHERE user_id = ?`,
    [authResult.id]
  );

  const [nightCheck] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 AS has_it FROM encounters
     WHERE (user1_id = ? OR user2_id = ?) AND HOUR(encountered_at) BETWEEN 0 AND 3
     LIMIT 1`,
    [authResult.id, authResult.id]
  );

  const [earlyCheck] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 AS has_it FROM encounters
     WHERE (user1_id = ? OR user2_id = ?) AND HOUR(encountered_at) BETWEEN 5 AND 6
     LIMIT 1`,
    [authResult.id, authResult.id]
  );

  const [repeatCheck] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM encounters
     WHERE (user1_id = ? OR user2_id = ?)
     GROUP BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)
     ORDER BY cnt DESC LIMIT 1`,
    [authResult.id, authResult.id]
  );

  const [weekendCheck] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 AS has_it FROM encounters
     WHERE (user1_id = ? OR user2_id = ?) AND DAYOFWEEK(encountered_at) IN (1, 7)
     LIMIT 1`,
    [authResult.id, authResult.id]
  );

  const [musicCheck] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 AS has_it FROM encounters e
     JOIN users u ON u.id = CASE WHEN e.user1_id = ? THEN e.user2_id ELSE e.user1_id END
     WHERE (e.user1_id = ? OR e.user2_id = ?) AND u.spotify_track_name IS NOT NULL
     LIMIT 1`,
    [authResult.id, authResult.id, authResult.id]
  );

  const [ghostCheck] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 AS has_it FROM encounters
     WHERE (user1_id = ? OR user2_id = ?) AND tier = 5
     LIMIT 1`,
    [authResult.id, authResult.id]
  );

  // 今シーズンのすれちがい数
  const { season, year } = getCurrentSeason();
  const seasonStart = season === "spring" ? `${year}-03-01`
    : season === "summer" ? `${year}-06-01`
    : season === "autumn" ? `${year}-09-01`
    : `${year}-12-01`;
  const [seasonCount] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM encounters
     WHERE (user1_id = ? OR user2_id = ?) AND encountered_at >= ?`,
    [authResult.id, authResult.id, seasonStart]
  );

  const stats: UserStats = {
    totalEncounters: (encounterCount[0]?.total as number) || 0,
    prefectureCount: (prefCount[0]?.cnt as number) || 0,
    hasNightEncounter: nightCheck.length > 0,
    hasEarlyEncounter: earlyCheck.length > 0,
    maxRepeatCount: (repeatCheck[0]?.cnt as number) || 0,
    hasWeekendEncounter: weekendCheck.length > 0,
    hasMusicEncounter: musicCheck.length > 0,
    hasGhostEncounter: ghostCheck.length > 0,
    currentSeason: season,
    currentYear: year,
    seasonalEncounterCount: (seasonCount[0]?.cnt as number) || 0,
  };

  // バッジ評価
  const earnedBadgeIds = evaluateBadges(stats);

  // 既存のバッジを取得
  const [existingBadges] = await pool.execute<RowDataPacket[]>(
    `SELECT badge_id, earned_at FROM user_badges WHERE user_id = ?`,
    [authResult.id]
  );
  const existingMap = new Map(existingBadges.map((b) => [b.badge_id as string, b.earned_at as string]));

  // 新しく獲得したバッジをINSERT
  for (const badgeId of earnedBadgeIds) {
    if (!existingMap.has(badgeId)) {
      await pool.execute(
        `INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)`,
        [authResult.id, badgeId]
      );
      existingMap.set(badgeId, new Date().toISOString());
    }
  }

  // 全バッジ定義に取得状態を付与
  const allDefs = getAllBadgeDefinitions();
  const badges = allDefs.map((def) => ({
    ...def,
    earned_at: existingMap.get(def.id) || null,
  }));

  return Response.json({
    badges,
    stats: {
      totalEncounters: stats.totalEncounters,
      prefectureCount: stats.prefectureCount,
    },
  });
}
