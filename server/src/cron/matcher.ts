// すれちがいマッチング cron ジョブ
// crontab: */5 * * * * cd /path/to/server && npx tsx src/cron/matcher.ts
// crontab: 0 * * * *   cd /path/to/server && npx tsx src/cron/resetHitokoto.ts
//
// ティア制マッチング:
// 1. ティア1(500m): 全ユーザー対象
// 2. ティア2(3km): 直近24時間すれ違い0件のユーザーのみ
// 3. ティア3(10km): ティア2でもマッチしなかったユーザーのみ
// 4. ティア4(50km): ティア3でもマッチしなかったユーザーのみ
//
// クールダウン: 同一ペア8時間
// ブロック済みペアは除外
// 逆ジオコーディングでエリア名を取得

import mysql from "mysql2/promise";
import "dotenv/config";
import { reverseGeocodeWithPrefecture } from "../lib/geocoding";

const TIERS = [
  { tier: 1, radius: 500, label: "すれ違い" },
  { tier: 2, radius: 3000, label: "ご近所" },
  { tier: 3, radius: 10000, label: "同じ街" },
  { tier: 4, radius: 50000, label: "同じ地域" },
] as const;

const GHOST_COOLDOWN_HOURS = 24; // 分身同士のクールダウン

// ティア別の通知テンプレート
const TIER_NOTIFICATIONS: Record<number, { title: string; body: (area: string) => string }> = {
  1: { title: "すれちがい発見!", body: (area) => `${area}で誰かとすれちがいました` },
  2: { title: "ご近所さん発見!", body: (area) => `${area}の近くにいる人とすれちがいました` },
  3: { title: "同じ街の人を発見!", body: (area) => `${area}周辺で誰かとすれちがいました` },
  4: { title: "同じ地域の人を発見!", body: (area) => `${area}エリアで誰かとすれちがいました` },
  5: { title: "おさんぽ先ですれちがい!", body: (area) => `${area}で誰かとすれちがいました` },
};

const TIME_WINDOW_MINUTES = 30;
const COOLDOWN_HOURS = 8;

async function runMatcher() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "CHANGE_ME",
    password: process.env.DB_PASSWORD || "CHANGE_ME",
    database: process.env.DB_NAME || "surechigai",
    timezone: "+09:00",
  });

  const conn = await pool.getConnection();

  try {
    console.log(`[matcher] 開始: ${new Date().toISOString()}`);

    // 直近24時間ですれ違い0件のユーザーIDを取得
    const [zeroEncounterUsers] = await conn.execute<mysql.RowDataPacket[]>(`
      SELECT u.id FROM users u
      WHERE u.is_deleted = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM encounters e
          WHERE (e.user1_id = u.id OR e.user2_id = u.id)
            AND e.encountered_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        )
        AND EXISTS (
          SELECT 1 FROM locations l
          WHERE l.user_id = u.id
            AND l.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        )
    `);
    const zeroUserIds = new Set(zeroEncounterUsers.map((r) => r.id as number));
    console.log(`[matcher] 直近24時間すれ違い0件のアクティブユーザー: ${zeroUserIds.size}人`);

    // このマッチング実行でマッチしたユーザーを追跡（上位ティアから除外用）
    const matchedUserIds = new Set<number>();
    let totalMatches = 0;

    for (const { tier, radius, label } of TIERS) {
      // ティア2以上は直近24時間すれ違い0件かつまだマッチしていないユーザーのみ
      const findEncounters = async () => {
        const [rows] = await conn.execute<mysql.RowDataPacket[]>(`
          SELECT
            LEAST(a.user_id, b.user_id) AS user1_id,
            GREATEST(a.user_id, b.user_id) AS user2_id,
            MIN(a.lat_grid) AS lat_grid,
            MIN(a.lng_grid) AS lng_grid,
            MIN(LEAST(a.created_at, b.created_at)) AS encountered_at,
            MIN(ST_Distance_Sphere(a.point, b.point)) AS distance_m
          FROM locations a
          JOIN locations b ON a.user_id < b.user_id
            AND ABS(TIMESTAMPDIFF(MINUTE, a.created_at, b.created_at)) <= ${TIME_WINDOW_MINUTES}
            AND ABS(a.lat_grid - b.lat_grid) <= ${radius / 111000 + 0.01}
            AND ABS(a.lng_grid - b.lng_grid) <= ${radius / 111000 + 0.01}
            AND ST_Distance_Sphere(a.point, b.point) <= ${radius}
            ${tier > 1 ? `AND ST_Distance_Sphere(a.point, b.point) > ${TIERS[tier - 2].radius}` : ""}
          WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
            AND b.created_at >= DATE_SUB(NOW(), INTERVAL ${TIME_WINDOW_MINUTES + 15} MINUTE)
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
        return rows;
      };

      const encounters = await findEncounters();

      // ティア2以上はフィルタリング
      const filtered = tier === 1
        ? encounters
        : encounters.filter((enc) => {
            const u1 = enc.user1_id as number;
            const u2 = enc.user2_id as number;
            // 両方のユーザーが直近24時間すれ違い0件で、まだマッチしていない
            return (zeroUserIds.has(u1) || zeroUserIds.has(u2))
              && !matchedUserIds.has(u1)
              && !matchedUserIds.has(u2);
          });

      if (filtered.length > 0) {
        console.log(`[matcher] ティア${tier}（${label} ${radius}m）: ${filtered.length}件検出`);
      }

      for (const enc of filtered) {
        const { area: areaName, prefecture } = await reverseGeocodeWithPrefecture(
          Number(enc.lat_grid),
          Number(enc.lng_grid)
        );
        const dist = Math.round(enc.distance_m as number);
        console.log(`[matcher] T${tier} ${enc.user1_id} ↔ ${enc.user2_id}: ${areaName} [${prefecture}] (${dist}m)`);

        await conn.execute(
          `INSERT INTO encounters (user1_id, user2_id, lat_grid, lng_grid, area_name, prefecture, tier, encountered_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [enc.user1_id, enc.user2_id, enc.lat_grid, enc.lng_grid, areaName, prefecture, tier, enc.encountered_at]
        );

        // 都道府県記録
        if (prefecture) {
          for (const uid of [enc.user1_id as number, enc.user2_id as number]) {
            await conn.execute(
              `INSERT INTO user_prefectures (user_id, prefecture, first_encountered_at)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE encounter_count = encounter_count + 1`,
              [uid, prefecture, enc.encountered_at]
            );
          }
        }

        matchedUserIds.add(enc.user1_id as number);
        matchedUserIds.add(enc.user2_id as number);
        totalMatches++;
      }
    }

    // ストリーク更新: マッチしたユーザーの連続日数を更新
    if (matchedUserIds.size > 0) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      for (const userId of matchedUserIds) {
        await conn.execute(
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
      console.log(`[matcher] ${matchedUserIds.size}人のストリークを更新`);
    }

    // T5: 分身マッチング
    // 分身を配置しているユーザーと、同じ市区町村にいる実ユーザーをマッチング
    const [ghosts] = await conn.execute<mysql.RowDataPacket[]>(`
      SELECT u.id AS ghost_owner_id, u.ghost_municipality, u.ghost_area_name, u.ghost_placed_at, u.ghost_prefecture
      FROM users u
      WHERE u.ghost_municipality IS NOT NULL
        AND u.is_deleted = FALSE
        AND u.is_suspended = FALSE
    `);

    const GHOST_MAX_ENCOUNTERS = 10; // 1回のおさんぽでの最大マッチ数

    for (const ghost of ghosts) {
      // このおさんぽで既にマッチした数を確認
      const [existingMatches] = await conn.execute<mysql.RowDataPacket[]>(`
        SELECT COUNT(*) AS cnt FROM encounters
        WHERE tier = 5
          AND (user1_id = ? OR user2_id = ?)
          AND encountered_at >= ?
      `, [ghost.ghost_owner_id, ghost.ghost_owner_id, ghost.ghost_placed_at]);
      const alreadyMatched = (existingMatches[0]?.cnt as number) || 0;
      const remaining = GHOST_MAX_ENCOUNTERS - alreadyMatched;

      if (remaining <= 0) {
        continue; // このおさんぽは上限到達済み
      }

      // 同じ市区町村にいる実ユーザー(15分以内の位置情報)を探す
      const [nearbyUsers] = await conn.execute<mysql.RowDataPacket[]>(`
        SELECT DISTINCT l.user_id
        FROM locations l
        WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
          AND l.user_id != ?
          AND l.municipality = ?
          AND NOT EXISTS (
            SELECT 1 FROM encounters e
            WHERE ((e.user1_id = LEAST(?, l.user_id) AND e.user2_id = GREATEST(?, l.user_id)))
              AND e.encountered_at >= DATE_SUB(NOW(), INTERVAL ${GHOST_COOLDOWN_HOURS} HOUR)
          )
          AND NOT EXISTS (
            SELECT 1 FROM blocks bl
            WHERE (bl.blocker_id = ? AND bl.blocked_id = l.user_id) OR (bl.blocker_id = l.user_id AND bl.blocked_id = ?)
          )
      `, [ghost.ghost_owner_id, ghost.ghost_municipality,
          ghost.ghost_owner_id, ghost.ghost_owner_id,
          ghost.ghost_owner_id, ghost.ghost_owner_id]);

      // エリア人数に応じてcron1回あたりの上限を変動
      const candidateCount = nearbyUsers.length;
      const perRunLimit = candidateCount <= 5 ? candidateCount
        : candidateCount <= 20 ? 3
        : candidateCount <= 100 ? 2
        : 1;

      // おさんぽ全体の残り枠も考慮
      const matchLimit = Math.min(perRunLimit, remaining);

      // ランダムに選出
      const shuffled = [...nearbyUsers].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, matchLimit);

      const area = ghost.ghost_area_name || ghost.ghost_municipality || "不明なエリア";
      if (selected.length > 0) {
        console.log(`[matcher] T5(分身) ${ghost.ghost_municipality}: 候補${candidateCount}人 → ${selected.length}人マッチ (累計${alreadyMatched + selected.length}/${GHOST_MAX_ENCOUNTERS})`);
      }

      const ghostPref = ghost.ghost_prefecture as string | null;

      for (const nearby of selected) {
        const u1 = Math.min(ghost.ghost_owner_id, nearby.user_id);
        const u2 = Math.max(ghost.ghost_owner_id, nearby.user_id);

        await conn.execute(
          `INSERT INTO encounters (user1_id, user2_id, lat_grid, lng_grid, area_name, prefecture, tier, ghost_owner_id, encountered_at)
           VALUES (?, ?, 0, 0, ?, ?, 5, ?, NOW())`,
          [u1, u2, area, ghostPref, ghost.ghost_owner_id]
        );

        // 都道府県記録(おさんぽ先の都道府県を両ユーザーに記録)
        if (ghostPref) {
          for (const uid of [ghost.ghost_owner_id as number, nearby.user_id as number]) {
            await conn.execute(
              `INSERT INTO user_prefectures (user_id, prefecture, first_encountered_at)
               VALUES (?, ?, NOW())
               ON DUPLICATE KEY UPDATE encounter_count = encounter_count + 1`,
              [uid, ghostPref]
            );
          }
        }

        matchedUserIds.add(ghost.ghost_owner_id as number);
        matchedUserIds.add(nearby.user_id as number);
        totalMatches++;
        console.log(`[matcher] T5(分身) ${ghost.ghost_owner_id} ↔ ${nearby.user_id}: ${area} [${ghostPref}]`);
      }
    }

    // すれ違い通知送信(ユーザーごとに1通にまとめる)
    if (matchedUserIds.size > 0) {
      const [recentEncounters] = await conn.execute<mysql.RowDataPacket[]>(`
        SELECT e.id, e.user1_id, e.user2_id, e.tier, e.area_name,
               u1.fcm_token AS u1_token, u1.notification_enabled AS u1_notif,
               u2.fcm_token AS u2_token, u2.notification_enabled AS u2_notif
        FROM encounters e
        JOIN users u1 ON u1.id = e.user1_id
        JOIN users u2 ON u2.id = e.user2_id
        WHERE e.encountered_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
          AND e.id NOT IN (SELECT encounter_id FROM notification_log WHERE encounter_id IS NOT NULL)
      `);

      // ユーザーごとにすれ違いを集約
      const userEncounters = new Map<number, { token: string | null; enabled: boolean; encounters: { id: number; tier: number; area: string }[] }>();
      for (const enc of recentEncounters) {
        for (const { userId, token, enabled } of [
          { userId: enc.user1_id as number, token: enc.u1_token as string | null, enabled: Boolean(enc.u1_notif) },
          { userId: enc.user2_id as number, token: enc.u2_token as string | null, enabled: Boolean(enc.u2_notif) },
        ]) {
          if (!userEncounters.has(userId)) {
            userEncounters.set(userId, { token, enabled, encounters: [] });
          }
          userEncounters.get(userId)!.encounters.push({
            id: enc.id as number,
            tier: enc.tier as number,
            area: (enc.area_name as string) || "不明なエリア",
          });
        }
      }

      // ユーザーごとに1通の通知を送信
      for (const [userId, data] of userEncounters) {
        const count = data.encounters.length;
        const bestTier = Math.min(...data.encounters.map((e) => e.tier));
        const notif = TIER_NOTIFICATIONS[bestTier] || TIER_NOTIFICATIONS[1];
        const title = count === 1
          ? notif.title
          : `${count}人とすれちがいました!`;
        const areas = [...new Set(data.encounters.map((e) => e.area))];
        const body = count === 1
          ? notif.body(areas[0])
          : `${areas.slice(0, 2).join("・")}${areas.length > 2 ? "ほか" : ""}で${count}人とすれちがいました`;

        // notification_logに記録(全encounter分)
        for (const enc of data.encounters) {
          await conn.execute(
            `INSERT INTO notification_log (user_id, encounter_id, type) VALUES (?, ?, 'encounter')`,
            [userId, enc.id]
          );
        }

        if (!data.enabled || !data.token) continue;

        // TODO: FCM送信（Firebase Admin SDK導入後に有効化）
        // await admin.messaging().send({
        //   token: data.token,
        //   notification: { title, body },
        //   data: { count: String(count), tier: String(bestTier) },
        // });
        console.log(`[matcher] 通知: user=${userId} 「${title}」${body}`);
      }
    }

    console.log(`[matcher] 完了: 合計${totalMatches}件 ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[matcher] エラー:", error);
  } finally {
    conn.release();
    await pool.end();
  }
}

runMatcher();
