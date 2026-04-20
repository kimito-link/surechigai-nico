import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const uid = authResult.id;

  // 総すれちがい人数(ユニーク/90日以内)
  const [totalRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT CASE WHEN user1_id = ? THEN user2_id ELSE user1_id END) AS total
     FROM encounters
     WHERE (user1_id = ? OR user2_id = ?)
       AND encountered_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)`,
    [uid, uid, uid]
  );

  // 時間帯別集計
  const [hourRows] = await pool.execute<RowDataPacket[]>(
    `SELECT HOUR(encountered_at) AS h, COUNT(*) AS cnt
     FROM encounters
     WHERE (user1_id = ? OR user2_id = ?)
       AND encountered_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
     GROUP BY h ORDER BY cnt DESC`,
    [uid, uid]
  );

  // エリア別ランキング(上位5件)
  const [areaRows] = await pool.execute<RowDataPacket[]>(
    `SELECT area_name, COUNT(*) AS cnt
     FROM encounters
     WHERE (user1_id = ? OR user2_id = ?)
       AND encountered_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
       AND area_name IS NOT NULL
     GROUP BY area_name ORDER BY cnt DESC LIMIT 5`,
    [uid, uid]
  );

  // ストリーク
  const [streakRows] = await pool.execute<RowDataPacket[]>(
    `SELECT streak_count FROM users WHERE id = ?`,
    [uid]
  );

  const hourCounts = Array(24).fill(0);
  for (const row of hourRows) {
    hourCounts[row.h as number] = row.cnt as number;
  }

  return Response.json({
    totalEncounters: (totalRows[0]?.total as number) || 0,
    streakCount: (streakRows[0]?.streak_count as number) || 0,
    hourCounts,
    topAreas: areaRows.map((r) => ({ area: r.area_name as string, count: r.cnt as number })),
  });
}
