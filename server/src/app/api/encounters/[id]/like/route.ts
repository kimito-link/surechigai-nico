import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

// いいねする
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { id } = await params;
  const encounterId = Number(id);
  if (isNaN(encounterId)) {
    return Response.json({ error: "不正なIDです" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const reactionType = (body as { reaction_type?: string }).reaction_type || "like";
    const validTypes = ["like", "wakaru", "ukeru", "iine_song"];
    if (!validTypes.includes(reactionType)) {
      return Response.json({ error: "不正なリアクションタイプです" }, { status: 400 });
    }

    // このユーザーがこのすれちがいの当事者か確認
    const [encounters] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM encounters
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [encounterId, authResult.id, authResult.id]
    );
    if (encounters.length === 0) {
      return Response.json({ error: "すれちがいが見つかりません" }, { status: 404 });
    }

    // 既存のリアクションを上書き(UPSERT)
    await pool.execute(
      `INSERT INTO likes (encounter_id, user_id, reaction_type)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE reaction_type = ?`,
      [encounterId, authResult.id, reactionType, reactionType]
    );

    return Response.json({ ok: true, reaction_type: reactionType });
  } catch (error) {
    console.error("いいねエラー:", error);
    return Response.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// いいね取り消し
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { id } = await params;
  const encounterId = Number(id);

  await pool.execute(
    "DELETE FROM likes WHERE encounter_id = ? AND user_id = ?",
    [encounterId, authResult.id]
  );

  return Response.json({ ok: true });
}
