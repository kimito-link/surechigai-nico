import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

// すれちがい一覧取得（90日以内）
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const offset = (page - 1) * limit;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        e.id,
        e.encountered_at,
        e.lat_grid,
        e.lng_grid,
        e.area_name,
        e.tier,
        u.id AS other_user_id,
        u.nickname AS other_nickname,
        u.twitter_handle AS other_twitter_handle,
        u.avatar_config AS other_avatar_config,
        u.avatar_url AS other_avatar_url,
        CASE
          WHEN e.tier = 5 AND u.ghost_hitokoto IS NOT NULL THEN u.ghost_hitokoto
          WHEN u.hitokoto_set_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND u.is_suspended = FALSE THEN u.hitokoto
          ELSE NULL
        END AS other_hitokoto,
        u.spotify_track_name AS other_spotify_track_name,
        u.spotify_artist_name AS other_spotify_artist_name,
        u.spotify_album_image_url AS other_spotify_album_image_url,
        u.spotify_track_id AS other_spotify_track_id,
        CASE WHEN u.show_age_group THEN u.age_group ELSE NULL END AS other_age_group,
        CASE WHEN u.show_gender THEN u.gender ELSE NULL END AS other_gender,
        -- CODEX-NEXT.md §1: マッチ相手の参加県は location_visibility >= 1（マッチ相手のみ）
        -- のときだけ返す。未設定 / 非公開 (=0) / 未ログインユーザー扱いの相手は NULL。
        CASE WHEN u.location_visibility >= 1 THEN u.home_prefecture ELSE NULL END AS other_home_prefecture,
        (SELECT COUNT(*) FROM likes l WHERE l.encounter_id = e.id AND l.user_id = ?) AS my_like,
        (SELECT reaction_type FROM likes l WHERE l.encounter_id = e.id AND l.user_id = ? LIMIT 1) AS my_reaction_type,
        (SELECT COUNT(*) FROM likes l WHERE l.encounter_id = e.id AND l.user_id != ?) AS other_like,
        (SELECT reaction_type FROM likes l WHERE l.encounter_id = e.id AND l.user_id != ? LIMIT 1) AS other_reaction_type,
        CASE WHEN e.tier = 5 AND e.ghost_owner_id = ? THEN TRUE ELSE FALSE END AS is_my_ghost,
        (SELECT COUNT(DISTINCT CASE WHEN e2.user1_id = u.id THEN e2.user2_id ELSE e2.user1_id END)
         FROM encounters e2 WHERE e2.user1_id = u.id OR e2.user2_id = u.id) AS other_encounter_count
      FROM encounters e
      JOIN users u ON u.id = CASE
        WHEN e.user1_id = ? THEN e.user2_id
        ELSE e.user1_id
      END
      WHERE (e.user1_id = ? OR e.user2_id = ?)
        AND e.encountered_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        AND u.is_deleted = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
        )
      ORDER BY e.encountered_at DESC
      LIMIT ? OFFSET ?`,
      [
        authResult.id, authResult.id,
        authResult.id, authResult.id,
        authResult.id,
        authResult.id,
        authResult.id, authResult.id,
        authResult.id,
        String(limit), String(offset),
      ]
    );

    return Response.json({ encounters: rows, page, limit });
  } catch (error) {
    console.error("すれちがい一覧取得エラー:", error);
    return Response.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
