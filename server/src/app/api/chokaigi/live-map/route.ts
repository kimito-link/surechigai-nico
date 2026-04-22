import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authenticateRequest } from "@/lib/auth";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

const VENUE = {
  name: "幕張メッセ（ニコニコ超会議）",
  lat: 35.64831,
  lng: 140.03459,
};

const RADIUS_METERS = 5000;
const MAX_USERS = 200;

type LiveMapRow = RowDataPacket & {
  user_id: number;
  nickname: string;
  twitter_handle: string | null;
  lat_grid: string | number;
  lng_grid: string | number;
  municipality: string | null;
  created_at_ms: string | number;
};

export async function GET(req: NextRequest) {
  const authUser = await authenticateRequest(req);

  try {
    const blockFilter = authUser
      ? `AND NOT EXISTS (
           SELECT 1
           FROM blocks b
           WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
              OR (b.blocker_id = u.id AND b.blocked_id = ?)
         )`
      : "";

    // 5000m を度数に変換（幕張付近 lat35度）
    const LAT_DELTA = RADIUS_METERS / 111320;
    const LNG_DELTA = RADIUS_METERS / (111320 * Math.cos((VENUE.lat * Math.PI) / 180));

    const params: Array<number> = [
      VENUE.lat - LAT_DELTA, VENUE.lat + LAT_DELTA,
      VENUE.lng - LNG_DELTA, VENUE.lng + LNG_DELTA,
    ];
    if (authUser) {
      params.push(authUser.id, authUser.id);
    }
    params.push(MAX_USERS);

    const [rows] = await pool.query<LiveMapRow[]>(
      `SELECT
         l.user_id,
         u.nickname,
         u.twitter_handle,
         l.lat_grid,
         l.lng_grid,
         l.municipality,
         CAST(UNIX_TIMESTAMP(l.created_at) * 1000 AS UNSIGNED) AS created_at_ms
       FROM locations l
       INNER JOIN (
         SELECT user_id, MAX(created_at) AS max_created_at
         FROM locations
         GROUP BY user_id
       ) latest_times
         ON l.user_id = latest_times.user_id
        AND l.created_at = latest_times.max_created_at
       INNER JOIN users u ON u.id = l.user_id
       WHERE
         u.is_deleted = FALSE
         AND u.is_suspended = FALSE
         AND l.lat_grid BETWEEN ? AND ?
         AND l.lng_grid BETWEEN ? AND ?
         ${blockFilter}
       ORDER BY l.created_at DESC
       LIMIT ?`,
      params
    );

    const users = rows.map((row, index) => {
      const rowUserId = Number(row.user_id);
      const isMe = Boolean(authUser && rowUserId === authUser.id);

      if (!authUser) {
        return {
          id: index + 1,
          nickname: `参加者${index + 1}`,
          twitterHandle: null,
          lat: Number(row.lat_grid),
          lng: Number(row.lng_grid),
          municipality: null,
          updatedAtMs: Number(row.created_at_ms),
          isMe: false,
        };
      }

      return {
        id: rowUserId,
        nickname: row.nickname,
        twitterHandle: row.twitter_handle,
        lat: Number(row.lat_grid),
        lng: Number(row.lng_grid),
        municipality: row.municipality,
        updatedAtMs: Number(row.created_at_ms),
        isMe,
      };
    });

    // 自分が会場マップ範囲外の場合のみ自分の最新位置を別途取得
    type SelfRow = RowDataPacket & {
      lat_grid: string | number;
      lng_grid: string | number;
      municipality: string | null;
      created_at_ms: string | number;
    };
    let selfLocation: { lat: number; lng: number; municipality: string | null; updatedAtMs: number } | null = null;
    if (authUser && !users.some((u) => u.id === authUser.id)) {
      try {
        const [selfRows] = await pool.query<SelfRow[]>(
          `SELECT l.lat_grid, l.lng_grid, l.municipality,
                  CAST(UNIX_TIMESTAMP(l.created_at) * 1000 AS UNSIGNED) AS created_at_ms
           FROM locations l
           WHERE l.user_id = ?
           ORDER BY l.created_at DESC
           LIMIT 1`,
          [authUser.id]
        );
        if (selfRows.length > 0) {
          const r = selfRows[0];
          selfLocation = {
            lat: Number(r.lat_grid),
            lng: Number(r.lng_grid),
            municipality: r.municipality,
            updatedAtMs: Number(r.created_at_ms),
          };
        }
      } catch {
        /* 自己位置取得失敗は非致命的 */
      }
    }

    // 全国参加者エリア統計（市区町村ごとの人数）
    // 時間窓は設けない：ユーザーごとの最新位置のみを集計して累計として常時表示する。
    type AreaRow = RowDataPacket & { area: string; cnt: number };
    let areaStats: Array<{ area: string; count: number }> = [];
    try {
      const [areaRows] = await pool.query<AreaRow[]>(
        `SELECT l.municipality AS area, COUNT(DISTINCT l.user_id) AS cnt
         FROM locations l
         INNER JOIN (
           SELECT user_id, MAX(created_at) AS max_created_at
           FROM locations
           GROUP BY user_id
         ) latest ON l.user_id = latest.user_id AND l.created_at = latest.max_created_at
         INNER JOIN users u ON u.id = l.user_id
         WHERE u.is_deleted = FALSE AND u.is_suspended = FALSE
           AND l.municipality IS NOT NULL
         GROUP BY l.municipality
         ORDER BY cnt DESC
         LIMIT 15`
      );
      areaStats = areaRows.map((r) => ({ area: String(r.area), count: Number(r.cnt) }));
    } catch {
      /* エリア統計取得失敗は非致命的 */
    }

    return Response.json({
      ok: true,
      venue: VENUE,
      radiusMeters: RADIUS_METERS,
      users,
      selfLocation,
      areaStats,
      generatedAtMs: Date.now(),
      publicMode: !authUser,
      note: authUser
        ? "位置は500mグリッドに丸めた概算です"
        : "公開モード: 匿名の500mグリッド位置を表示しています",
    });
  } catch (error) {
    console.error("会場ライブマップ取得エラー:", error);
    return Response.json(
      {
        ok: true,
        degraded: true,
        venue: VENUE,
        radiusMeters: RADIUS_METERS,
        users: [],
        selfLocation: null,
        areaStats: [],
        generatedAtMs: Date.now(),
        publicMode: !authUser,
        note: "ライブマップを準備中です。しばらくしてから再読み込みしてください。",
      },
      { status: 200 }
    );
  }
}
