import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getAllBadgeDefinitions } from "@/lib/badges";
import type { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { id } = await params;
  const userId = Number(id);
  if (!userId) return Response.json({ error: "無効なユーザーID" }, { status: 400 });

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT badge_id, earned_at FROM user_badges WHERE user_id = ?`,
    [userId]
  );

  const earnedMap = new Map(rows.map((r) => [r.badge_id as string, r.earned_at as string]));
  const allDefs = getAllBadgeDefinitions();
  const earned = allDefs
    .filter((d) => earnedMap.has(d.id))
    .map((d) => ({ id: d.id, name: d.name, icon: d.icon, category: d.category }));

  return Response.json({ badges: earned });
}
