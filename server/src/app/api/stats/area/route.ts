import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

// エリア内アクティブユーザー数を取得
// lat, lngから50km圏内で直近24時間に位置情報を送信したユーザー数
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return Response.json({ error: "lat, lngが必要です" }, { status: 400 });
  }

  try {
    // MySQL 8.0 SRID 4326 の軸順序は (lat, lng)。POINT(lat, lng) で統一する。
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT l.user_id) AS active_count
       FROM locations l
       JOIN users u ON u.id = l.user_id AND u.is_deleted = FALSE
       WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         AND ST_Distance_Sphere(l.point, ST_SRID(POINT(?, ?), 4326)) <= 50000
         AND l.user_id != ?`,
      [lat, lng, authResult.id]
    );

    return Response.json({
      active_count: rows[0].active_count as number,
    });
  } catch (error) {
    console.error("エリア統計エラー:", error);
    return Response.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
