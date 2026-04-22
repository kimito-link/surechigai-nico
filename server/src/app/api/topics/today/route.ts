import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT topic FROM daily_topics WHERE scheduled_date = CURDATE() LIMIT 1`
    );

    if (rows.length === 0) {
      // 該当日のお題がなければランダムに1件返す
      const [fallback] = await pool.execute<RowDataPacket[]>(
        `SELECT topic FROM daily_topics ORDER BY RAND() LIMIT 1`
      );
      return Response.json({ topic: fallback[0]?.topic || null });
    }

    return Response.json({ topic: rows[0].topic });
  } catch (error) {
    console.error("お題取得エラー:", error);
    return Response.json(
      {
        topic: null,
        error: "daily_topics の取得に失敗しました",
      },
      { status: 503 }
    );
  }
}
