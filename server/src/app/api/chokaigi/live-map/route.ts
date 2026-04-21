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

const ACTIVE_WINDOW_MINUTES = 30;
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

    const params: Array<number> = [VENUE.lng, VENUE.lat, RADIUS_METERS];
    if (authUser) {
      params.push(authUser.id, authUser.id);
    }
    params.push(MAX_USERS);

    const [rows] = await pool.execute<LiveMapRow[]>(
       `WITH latest AS (
         SELECT l.user_id, l.lat_grid, l.lng_grid, l.municipality, l.created_at
         FROM locations l
         INNER JOIN (
           SELECT user_id, MAX(created_at) AS max_created_at
           FROM locations
           WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${ACTIVE_WINDOW_MINUTES} MINUTE)
           GROUP BY user_id
         ) last_loc
           ON last_loc.user_id = l.user_id
          AND last_loc.max_created_at = l.created_at
       )
       SELECT
         latest.user_id,
         u.nickname,
         u.twitter_handle,
         latest.lat_grid,
         latest.lng_grid,
         latest.municipality,
         CAST(UNIX_TIMESTAMP(latest.created_at) * 1000 AS UNSIGNED) AS created_at_ms
       FROM latest
       INNER JOIN users u ON u.id = latest.user_id
       WHERE
         u.is_deleted = FALSE
         AND u.is_suspended = FALSE
         AND ST_Distance_Sphere(
           ST_SRID(POINT(latest.lng_grid, latest.lat_grid), 4326),
           ST_SRID(POINT(?, ?), 4326)
         ) <= ?
         ${blockFilter}
       ORDER BY latest.created_at DESC
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

    return Response.json({
      ok: true,
      venue: VENUE,
      radiusMeters: RADIUS_METERS,
      users,
      generatedAtMs: Date.now(),
      publicMode: !authUser,
      note: authUser
        ? "位置は500mグリッドに丸めた概算です"
        : "公開モード: 匿名の500mグリッド位置を表示しています",
    });
  } catch (error) {
    // DBが未接続の場合も空の成功レスポンスを返してUIをエラーにしない
    console.error("会場ライブマップ取得エラー:", error);
    return Response.json({
      ok: true,
      venue: VENUE,
      radiusMeters: RADIUS_METERS,
      users: [],
      generatedAtMs: Date.now(),
      publicMode: true,
      note: "現在地送信済みユーザーのみ表示します。",
    });
  }
}
