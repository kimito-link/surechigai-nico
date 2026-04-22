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
//
// 実装メモ:
//   従来は SQL 内で locations テーブルを自己 JOIN し O(N²) の組合せを評価していた。
//   本実装では
//     1) 対象期間内の locations を 1 回だけフェッチ
//     2) ユーザーごとに最新の位置のみを採用
//     3) H3 セル (res 8/7/6/5) でユーザーをバケット化し、各バケット内 + k-ring 近傍内だけで
//        Haversine + tier 判定を行う
//   これにより実効的に N × (k-ring サイズ) ≈ 線形で処理できる。
//   時間窓も (a: 15分, b: 45分) の非対称を修正し、対称 TIME_WINDOW_MINUTES に統一した。

import mysql from "mysql2/promise";
import "dotenv/config";
import { latLngToCell, gridDisk } from "h3-js";
import { reverseGeocodeWithPrefecture } from "../lib/geocoding";

const TIERS = [
  { tier: 1, radius: 500, label: "すれ違い", h3Res: 8, k: 1 },
  { tier: 2, radius: 3_000, label: "ご近所", h3Res: 7, k: 2 },
  { tier: 3, radius: 10_000, label: "同じ街", h3Res: 6, k: 2 },
  { tier: 4, radius: 50_000, label: "同じ地域", h3Res: 5, k: 3 },
] as const;

const GHOST_COOLDOWN_HOURS = 24;

const TIER_NOTIFICATIONS: Record<number, { title: string; body: (area: string) => string }> = {
  1: { title: "すれちがい発見!", body: (area) => `${area}で誰かとすれちがいました` },
  2: { title: "ご近所さん発見!", body: (area) => `${area}の近くにいる人とすれちがいました` },
  3: { title: "同じ街の人を発見!", body: (area) => `${area}周辺で誰かとすれちがいました` },
  4: { title: "同じ地域の人を発見!", body: (area) => `${area}エリアで誰かとすれちがいました` },
  5: { title: "おさんぽ先ですれちがい!", body: (area) => `${area}で誰かとすれちがいました` },
};

const TIME_WINDOW_MINUTES = 30;
const COOLDOWN_HOURS = 8;

type RecentLocation = {
  userId: number;
  lat: number;
  lng: number;
  latGrid: number;
  lngGrid: number;
  createdAt: Date;
};

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

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

    // アクティブユーザー一覧（直近 TIME_WINDOW_MINUTES の位置情報があり、削除されていない）
    const [recentRows] = await conn.execute<mysql.RowDataPacket[]>(
      `
      SELECT l.user_id, l.lat_grid, l.lng_grid, l.created_at,
             ST_Longitude(l.point) AS lng, ST_Latitude(l.point) AS lat
      FROM locations l
      JOIN users u ON u.id = l.user_id AND u.is_deleted = FALSE
      INNER JOIN (
        SELECT user_id, MAX(created_at) AS max_created_at
        FROM locations
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
        GROUP BY user_id
      ) latest
        ON latest.user_id = l.user_id
       AND latest.max_created_at = l.created_at
    `,
      [TIME_WINDOW_MINUTES]
    );

    const locs: RecentLocation[] = recentRows.map((r) => ({
      userId: Number(r.user_id),
      lat: Number(r.lat),
      lng: Number(r.lng),
      latGrid: Number(r.lat_grid),
      lngGrid: Number(r.lng_grid),
      createdAt: new Date(r.created_at as string),
    }));
    console.log(`[matcher] 直近 ${TIME_WINDOW_MINUTES}分 のアクティブユーザー位置: ${locs.length}件`);

    // 0件ユーザー（24h 内ですれ違い 0）
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
    const zeroUserIds = new Set(zeroEncounterUsers.map((r) => Number(r.id)));

    // ブロック関係 (対称的に格納)
    const [blockRows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT blocker_id, blocked_id FROM blocks`
    );
    const blockSet = new Set<string>();
    for (const b of blockRows) {
      const a = Number(b.blocker_id);
      const c = Number(b.blocked_id);
      blockSet.add(`${Math.min(a, c)}-${Math.max(a, c)}`);
    }

    // クールダウン中のペア
    const [cooldownRows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT user1_id, user2_id
       FROM encounters
       WHERE encountered_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [COOLDOWN_HOURS]
    );
    const cooldownSet = new Set<string>();
    for (const c of cooldownRows) {
      cooldownSet.add(`${Number(c.user1_id)}-${Number(c.user2_id)}`);
    }

    const matchedUserIds = new Set<number>();
    const matchedPairs = new Set<string>();
    let totalMatches = 0;

    type PairCandidate = {
      user1Id: number;
      user2Id: number;
      latGrid: number;
      lngGrid: number;
      encounteredAt: Date;
      distanceM: number;
    };

    for (const { tier, radius, label, h3Res, k } of TIERS) {
      // H3 バケットに配置
      const buckets = new Map<string, RecentLocation[]>();
      for (const loc of locs) {
        const cell = latLngToCell(loc.lat, loc.lng, h3Res);
        const arr = buckets.get(cell);
        if (arr) arr.push(loc);
        else buckets.set(cell, [loc]);
      }

      // 各セル × k-ring 内で総当たり
      const candidates: PairCandidate[] = [];
      const seenPair = new Set<string>();
      for (const [cell, group] of buckets) {
        const ring = gridDisk(cell, k);
        const neighbors: RecentLocation[] = [];
        for (const nCell of ring) {
          const g = buckets.get(nCell);
          if (g) neighbors.push(...g);
        }
        for (const a of group) {
          for (const b of neighbors) {
            if (a.userId >= b.userId) continue;
            const key = `${a.userId}-${b.userId}`;
            if (seenPair.has(key)) continue;
            seenPair.add(key);

            if (blockSet.has(key)) continue;
            if (cooldownSet.has(key)) continue;
            if (matchedPairs.has(key)) continue;

            const minutesDiff = Math.abs(
              (a.createdAt.getTime() - b.createdAt.getTime()) / 60000
            );
            if (minutesDiff > TIME_WINDOW_MINUTES) continue;

            const dist = haversineMeters(a, b);
            if (dist > radius) continue;
            if (tier > 1 && dist <= TIERS[tier - 2].radius) continue;

            // ティア 2 以上は 0件ユーザーに限定 & まだマッチしていない条件
            if (tier > 1) {
              if (!(zeroUserIds.has(a.userId) || zeroUserIds.has(b.userId))) continue;
              if (matchedUserIds.has(a.userId) || matchedUserIds.has(b.userId)) continue;
            }

            candidates.push({
              user1Id: a.userId,
              user2Id: b.userId,
              latGrid: Math.min(a.latGrid, b.latGrid),
              lngGrid: Math.min(a.lngGrid, b.lngGrid),
              encounteredAt: new Date(
                Math.min(a.createdAt.getTime(), b.createdAt.getTime())
              ),
              distanceM: dist,
            });
          }
        }
      }

      if (candidates.length > 0) {
        console.log(`[matcher] ティア${tier}（${label} ${radius}m, h3r${h3Res} k=${k}）: ${candidates.length}件検出`);
      }

      for (const enc of candidates) {
        const { area: areaName, prefecture } = await reverseGeocodeWithPrefecture(
          enc.latGrid,
          enc.lngGrid
        );
        console.log(
          `[matcher] T${tier} ${enc.user1Id} ↔ ${enc.user2Id}: ${areaName} [${prefecture}] (${Math.round(enc.distanceM)}m)`
        );

        await conn.execute(
          `INSERT INTO encounters (user1_id, user2_id, lat_grid, lng_grid, area_name, prefecture, tier, encountered_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [enc.user1Id, enc.user2Id, enc.latGrid, enc.lngGrid, areaName, prefecture, tier, enc.encounteredAt]
        );

        if (prefecture) {
          for (const uid of [enc.user1Id, enc.user2Id]) {
            await conn.execute(
              `INSERT INTO user_prefectures (user_id, prefecture, first_encountered_at)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE encounter_count = encounter_count + 1`,
              [uid, prefecture, enc.encounteredAt]
            );
          }
        }

        matchedUserIds.add(enc.user1Id);
        matchedUserIds.add(enc.user2Id);
        matchedPairs.add(`${enc.user1Id}-${enc.user2Id}`);
        totalMatches++;
      }
    }

    // ストリーク更新
    if (matchedUserIds.size > 0) {
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

    // T5: 分身マッチング（従来ロジックを踏襲）
    const [ghosts] = await conn.execute<mysql.RowDataPacket[]>(`
      SELECT u.id AS ghost_owner_id, u.ghost_municipality, u.ghost_area_name, u.ghost_placed_at, u.ghost_prefecture
      FROM users u
      WHERE u.ghost_municipality IS NOT NULL
        AND u.is_deleted = FALSE
        AND u.is_suspended = FALSE
    `);

    const GHOST_MAX_ENCOUNTERS = 10;

    for (const ghost of ghosts) {
      const [existingMatches] = await conn.execute<mysql.RowDataPacket[]>(
        `
        SELECT COUNT(*) AS cnt FROM encounters
        WHERE tier = 5
          AND (user1_id = ? OR user2_id = ?)
          AND encountered_at >= ?
      `,
        [ghost.ghost_owner_id, ghost.ghost_owner_id, ghost.ghost_placed_at]
      );
      const alreadyMatched = Number(existingMatches[0]?.cnt) || 0;
      const remaining = GHOST_MAX_ENCOUNTERS - alreadyMatched;

      if (remaining <= 0) continue;

      const [nearbyUsers] = await conn.execute<mysql.RowDataPacket[]>(
        `
        SELECT DISTINCT l.user_id
        FROM locations l
        WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
          AND l.user_id != ?
          AND l.municipality = ?
          AND NOT EXISTS (
            SELECT 1 FROM encounters e
            WHERE ((e.user1_id = LEAST(?, l.user_id) AND e.user2_id = GREATEST(?, l.user_id)))
              AND e.encountered_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
          )
          AND NOT EXISTS (
            SELECT 1 FROM blocks bl
            WHERE (bl.blocker_id = ? AND bl.blocked_id = l.user_id)
               OR (bl.blocker_id = l.user_id AND bl.blocked_id = ?)
          )
      `,
        [
          ghost.ghost_owner_id,
          ghost.ghost_municipality,
          ghost.ghost_owner_id,
          ghost.ghost_owner_id,
          GHOST_COOLDOWN_HOURS,
          ghost.ghost_owner_id,
          ghost.ghost_owner_id,
        ]
      );

      const candidateCount = nearbyUsers.length;
      const perRunLimit = candidateCount <= 5 ? candidateCount
        : candidateCount <= 20 ? 3
        : candidateCount <= 100 ? 2
        : 1;
      const matchLimit = Math.min(perRunLimit, remaining);
      const shuffled = [...nearbyUsers].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, matchLimit);

      const area = ghost.ghost_area_name || ghost.ghost_municipality || "不明なエリア";
      if (selected.length > 0) {
        console.log(
          `[matcher] T5(分身) ${ghost.ghost_municipality}: 候補${candidateCount}人 → ${selected.length}人マッチ (累計${alreadyMatched + selected.length}/${GHOST_MAX_ENCOUNTERS})`
        );
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

    // すれ違い通知送信
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

      const userEncounters = new Map<
        number,
        { token: string | null; enabled: boolean; encounters: { id: number; tier: number; area: string }[] }
      >();
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

      for (const [userId, data] of userEncounters) {
        const count = data.encounters.length;
        const bestTier = Math.min(...data.encounters.map((e) => e.tier));
        const notif = TIER_NOTIFICATIONS[bestTier] || TIER_NOTIFICATIONS[1];
        const title = count === 1 ? notif.title : `${count}人とすれちがいました!`;
        const areas = [...new Set(data.encounters.map((e) => e.area))];
        const body =
          count === 1
            ? notif.body(areas[0])
            : `${areas.slice(0, 2).join("・")}${areas.length > 2 ? "ほか" : ""}で${count}人とすれちがいました`;

        for (const enc of data.encounters) {
          await conn.execute(
            `INSERT INTO notification_log (user_id, encounter_id, type) VALUES (?, ?, 'encounter')`,
            [userId, enc.id]
          );
        }

        if (!data.enabled || !data.token) continue;

        // TODO: FCM送信（Firebase Admin SDK導入後に有効化）
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
