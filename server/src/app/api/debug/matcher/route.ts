import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
// デバッグ用: 逆ジオコーディングはスキップ(速度優先)
import type { RowDataPacket } from "mysql2";

const TIERS = [
  { tier: 1, radius: 500, label: "すれ違い" },
  { tier: 2, radius: 3000, label: "ご近所" },
  { tier: 3, radius: 10000, label: "同じ街" },
  { tier: 4, radius: 50000, label: "同じ地域" },
] as const;

const TIER_NOTIFICATIONS: Record<number, { title: string; body: (area: string) => string }> = {
  1: { title: "すれちがい発見!", body: (area) => `${area}で誰かとすれちがいました` },
  2: { title: "ご近所さん発見!", body: (area) => `${area}の近くにいる人とすれちがいました` },
  3: { title: "同じ街の人を発見!", body: (area) => `${area}周辺で誰かとすれちがいました` },
  4: { title: "同じ地域の人を発見!", body: (area) => `${area}エリアで誰かとすれちがいました` },
};

const TIME_WINDOW_MINUTES = 30;
const COOLDOWN_HOURS = 8;

// デバッグ用: matcher実行API（時間制約を緩和）
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "本番環境では使用できません" }, { status: 403 });
  }

  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  try {
    // デバッグ用: scatterデータのタイムスタンプを直近に更新(最新100件のみ)
    await pool.execute(`
      UPDATE locations SET created_at = DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 10) MINUTE)
      WHERE id IN (
        SELECT id FROM (
          SELECT l.id FROM locations l
          JOIN users u ON u.id = l.user_id
          WHERE (u.uuid LIKE 'debug-scatter-%' OR u.uuid LIKE 'debug-ghost-test-%' OR u.uuid LIKE 'debug-%')
            AND l.created_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
          ORDER BY l.id DESC LIMIT 100
        ) AS tmp
      )
    `);

    const results: { tier: number; label: string; matches: string[] }[] = [];

    // 直近24時間すれ違い0件のユーザーを取得
    const [zeroEncounterUsers] = await pool.execute<RowDataPacket[]>(`
      SELECT u.id FROM users u
      WHERE u.is_deleted = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM encounters e
          WHERE (e.user1_id = u.id OR e.user2_id = u.id)
            AND e.encountered_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        )
        AND EXISTS (
          SELECT 1 FROM locations l WHERE l.user_id = u.id
        )
    `);
    const zeroUserIds = new Set(zeroEncounterUsers.map((r) => r.id as number));
    const matchedUserIds = new Set<number>();
    let totalMatches = 0;

    for (const { tier, radius, label } of TIERS) {
      // デバッグ用: gridで事前絞り込み + 距離計算
      const gridDeg = radius / 111000 + 0.01; // 半径をおおよその度数に変換
      const [encounters] = await pool.execute<RowDataPacket[]>(`
        SELECT
          LEAST(a.user_id, b.user_id) AS user1_id,
          GREATEST(a.user_id, b.user_id) AS user2_id,
          MIN(a.lat_grid) AS lat_grid,
          MIN(a.lng_grid) AS lng_grid,
          MIN(LEAST(a.created_at, b.created_at)) AS encountered_at,
          MIN(ST_Distance_Sphere(a.point, b.point)) AS distance_m
        FROM locations a
        JOIN locations b ON a.user_id < b.user_id
          AND ABS(a.lat_grid - b.lat_grid) <= ${gridDeg}
          AND ABS(a.lng_grid - b.lng_grid) <= ${gridDeg}
          AND ST_Distance_Sphere(a.point, b.point) <= ${radius}
          ${tier > 1 ? `AND ST_Distance_Sphere(a.point, b.point) > ${TIERS[tier - 2].radius}` : ""}
        WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
          AND b.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        AND NOT EXISTS (
          SELECT 1 FROM encounters e
          WHERE e.user1_id = LEAST(a.user_id, b.user_id)
            AND e.user2_id = GREATEST(a.user_id, b.user_id)
            AND e.encountered_at >= DATE_SUB(NOW(), INTERVAL ${COOLDOWN_HOURS} HOUR)
        )
        AND NOT EXISTS (
          SELECT 1 FROM blocks bl
          WHERE (bl.blocker_id = a.user_id AND bl.blocked_id = b.user_id)
             OR (bl.blocker_id = b.user_id AND bl.blocked_id = a.user_id)
        )
        GROUP BY user1_id, user2_id
      `);

      const filtered = tier === 1
        ? encounters
        : encounters.filter((enc) => {
            const u1 = enc.user1_id as number;
            const u2 = enc.user2_id as number;
            return (zeroUserIds.has(u1) || zeroUserIds.has(u2))
              && !matchedUserIds.has(u1)
              && !matchedUserIds.has(u2);
          });

      const tierResult: string[] = [];

      for (const enc of filtered) {
        // デバッグ用: 逆ジオコーディングをスキップして座標をエリア名にする
        const areaName = `${Number(enc.lat_grid).toFixed(3)}, ${Number(enc.lng_grid).toFixed(3)}`;
        const dist = Math.round(enc.distance_m as number);

        await pool.execute(
          `INSERT INTO encounters (user1_id, user2_id, lat_grid, lng_grid, area_name, tier, encountered_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [enc.user1_id, enc.user2_id, enc.lat_grid, enc.lng_grid, areaName, tier, enc.encountered_at]
        );

        matchedUserIds.add(enc.user1_id as number);
        matchedUserIds.add(enc.user2_id as number);
        totalMatches++;
        tierResult.push(`${enc.user1_id} ↔ ${enc.user2_id}: ${areaName} (${dist}m)`);
      }

      results.push({ tier, label, matches: tierResult });
    }

    // ストリーク更新
    for (const userId of matchedUserIds) {
      await pool.execute(
        `UPDATE users SET
          streak_count = CASE
            WHEN last_encounter_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN streak_count + 1
            WHEN last_encounter_date = CURDATE() THEN streak_count
            ELSE 1
          END,
          last_encounter_date = CURDATE()
        WHERE id = ? AND is_deleted = FALSE`,
        [userId]
      );
    }

    // 通知ログ記録(ユーザーごとに1通にまとめる)
    const notifications: string[] = [];
    if (totalMatches === 0) {
      return Response.json({
        ok: true,
        message: `ティア制マッチング完了: ${totalMatches}件`,
        zeroEncounterUsers: zeroUserIds.size,
        results,
        notifications,
      });
    }
    const [recentEncounters] = await pool.execute<RowDataPacket[]>(`
      SELECT e.id, e.user1_id, e.user2_id, e.tier, e.area_name
      FROM encounters e
      WHERE e.id NOT IN (SELECT encounter_id FROM notification_log WHERE encounter_id IS NOT NULL)
      ORDER BY e.id DESC
      LIMIT ${totalMatches}
    `);

    // ユーザーごとに集約
    const userEncounters = new Map<number, { id: number; tier: number; area: string }[]>();
    for (const enc of recentEncounters) {
      for (const userId of [enc.user1_id as number, enc.user2_id as number]) {
        if (!userEncounters.has(userId)) userEncounters.set(userId, []);
        userEncounters.get(userId)!.push({
          id: enc.id as number,
          tier: enc.tier as number,
          area: (enc.area_name as string) || "不明なエリア",
        });
      }
    }

    for (const [userId, encounters] of userEncounters) {
      const count = encounters.length;
      const bestTier = Math.min(...encounters.map((e) => e.tier));
      const notif = TIER_NOTIFICATIONS[bestTier] || TIER_NOTIFICATIONS[1];
      const title = count === 1 ? notif.title : `${count}人とすれちがいました!`;
      const areas = [...new Set(encounters.map((e) => e.area))];
      const body = count === 1
        ? notif.body(areas[0])
        : `${areas.slice(0, 2).join("・")}${areas.length > 2 ? "ほか" : ""}で${count}人とすれちがいました`;

      for (const enc of encounters) {
        await pool.execute(
          `INSERT INTO notification_log (user_id, encounter_id, type) VALUES (?, ?, 'encounter')`,
          [userId, enc.id]
        );
      }
      notifications.push(`user=${userId}: 「${title}」${body}`);
    }

    return Response.json({
      ok: true,
      message: `ティア制マッチング完了: ${totalMatches}件`,
      zeroEncounterUsers: zeroUserIds.size,
      results,
      notifications,
    });
  } catch (error) {
    console.error("デバッグmatcherエラー:", error);
    return Response.json({ error: "マッチング実行に失敗しました" }, { status: 500 });
  }
}
