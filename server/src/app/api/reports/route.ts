import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { reportedUserId, encounterId, reason, detail } = await req.json();

  if (!reportedUserId || !reason) {
    return Response.json(
      { error: "reportedUserId と reason は必須です" },
      { status: 400 }
    );
  }

  const validReasons = ["inappropriate_hitokoto", "spam", "harassment", "other"];
  if (!validReasons.includes(reason)) {
    return Response.json({ error: "不正な通報理由です" }, { status: 400 });
  }

  if (reportedUserId === authResult.id) {
    return Response.json({ error: "自分自身は通報できません" }, { status: 400 });
  }

  await pool.execute(
    `INSERT INTO reports (reporter_id, reported_user_id, encounter_id, reason, detail)
     VALUES (?, ?, ?, ?, ?)`,
    [authResult.id, reportedUserId, encounterId || null, reason, detail || null]
  );

  // 通報3件以上で自動停止(異なるユーザーからの通報のみカウント)
  const AUTO_SUSPEND_THRESHOLD = 3;
  const [rows] = await pool.execute<import("mysql2").RowDataPacket[]>(
    `SELECT COUNT(DISTINCT reporter_id) as cnt FROM reports WHERE reported_user_id = ?`,
    [reportedUserId]
  );
  const reportCount = (rows[0]?.cnt as number) || 0;
  if (reportCount >= AUTO_SUSPEND_THRESHOLD) {
    await pool.execute(
      `UPDATE users SET is_suspended = TRUE, suspended_at = NOW() WHERE id = ? AND is_suspended = FALSE`,
      [reportedUserId]
    );
  }

  return Response.json({ ok: true }, { status: 201 });
}
