import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT prefecture, first_encountered_at, encounter_count
     FROM user_prefectures
     WHERE user_id = ?
     ORDER BY first_encountered_at ASC`,
    [authResult.id]
  );

  return Response.json({
    prefectures: rows,
    total: rows.length,
  });
}
