import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

// ブロック一覧
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT b.id, b.blocked_id, u.nickname, b.created_at
     FROM blocks b
     JOIN users u ON u.id = b.blocked_id
     WHERE b.blocker_id = ?
     ORDER BY b.created_at DESC`,
    [authResult.id]
  );

  return Response.json({ blocks: rows });
}

// ブロック追加
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { userId } = await req.json();
  if (!userId || typeof userId !== "number") {
    return Response.json({ error: "userId を指定してください" }, { status: 400 });
  }
  if (userId === authResult.id) {
    return Response.json({ error: "自分自身はブロックできません" }, { status: 400 });
  }

  await pool.execute(
    "INSERT IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)",
    [authResult.id, userId]
  );

  return Response.json({ ok: true });
}

// ブロック解除
export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { userId } = await req.json();
  if (!userId) {
    return Response.json({ error: "userId を指定してください" }, { status: 400 });
  }

  await pool.execute(
    "DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?",
    [authResult.id, userId]
  );

  return Response.json({ ok: true });
}
