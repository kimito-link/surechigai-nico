import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

async function readUserIdBody(
  req: NextRequest
): Promise<number | Response> {
  let body: { userId?: unknown } | null;
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "JSON ボディが不正です" }, { status: 400 });
  }
  if (!isPositiveInt(body?.userId)) {
    return Response.json(
      { error: "userId は正の整数で指定してください" },
      { status: 400 }
    );
  }
  return body.userId;
}

// ブロック一覧
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT b.id, b.blocked_id, u.nickname, b.created_at
       FROM blocks b
       JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = ?
       ORDER BY b.created_at DESC`,
      [authResult.id]
    );
    return Response.json({ blocks: rows });
  } catch (err) {
    console.error("[blocks] GET failed", err);
    return Response.json(
      { error: "ブロック一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// ブロック追加
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const parsed = await readUserIdBody(req);
  if (parsed instanceof Response) return parsed;
  const userId = parsed;
  if (userId === authResult.id) {
    return Response.json({ error: "自分自身はブロックできません" }, { status: 400 });
  }

  try {
    await pool.execute(
      "INSERT IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)",
      [authResult.id, userId]
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[blocks] POST failed", err);
    return Response.json(
      { error: "ブロックの登録に失敗しました" },
      { status: 500 }
    );
  }
}

// ブロック解除
export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const parsed = await readUserIdBody(req);
  if (parsed instanceof Response) return parsed;
  const userId = parsed;

  try {
    await pool.execute(
      "DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?",
      [authResult.id, userId]
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[blocks] DELETE failed", err);
    return Response.json(
      { error: "ブロック解除に失敗しました" },
      { status: 500 }
    );
  }
}
