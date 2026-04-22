import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAdminAuth } from "@/lib/adminAuth";
import type { RowDataPacket } from "mysql2";

// 通報一覧(ユーザーごとに集約) — Basic 認証 (requireAdminAuth) で保護
export async function GET(req: NextRequest) {
  const unauth = requireAdminAuth(req);
  if (unauth) return unauth;

  const [rows] = await pool.execute<RowDataPacket[]>(`
    SELECT
      u.id AS user_id,
      u.nickname,
      u.hitokoto,
      u.avatar_url,
      u.is_suspended,
      u.suspended_at,
      u.created_at AS user_created_at,
      COUNT(DISTINCT r.reporter_id) AS report_count,
      GROUP_CONCAT(DISTINCT r.reason ORDER BY r.created_at DESC) AS reasons,
      MAX(r.created_at) AS last_reported_at,
      (SELECT detail FROM reports WHERE reported_user_id = u.id ORDER BY created_at DESC LIMIT 1) AS latest_detail
    FROM reports r
    JOIN users u ON u.id = r.reported_user_id
    WHERE u.is_deleted = FALSE
      AND r.status != 'resolved'
    GROUP BY u.id
    HAVING u.is_suspended = TRUE OR COUNT(DISTINCT r.reporter_id) >= 2
    ORDER BY u.is_suspended DESC, report_count DESC
  `);

  return Response.json({ reports: rows });
}

// 停止/解除 — Basic 認証 (requireAdminAuth) で保護
export async function PATCH(req: NextRequest) {
  const unauth = requireAdminAuth(req);
  if (unauth) return unauth;

  const { userId, action } = await req.json();

  if (!userId || !["suspend", "unsuspend"].includes(action)) {
    return Response.json({ error: "userId と action (suspend/unsuspend) は必須です" }, { status: 400 });
  }

  if (action === "suspend") {
    await pool.execute(
      `UPDATE users SET is_suspended = TRUE, suspended_at = NOW() WHERE id = ?`,
      [userId]
    );
  } else {
    await pool.execute(
      `UPDATE users SET is_suspended = FALSE, suspended_at = NULL WHERE id = ?`,
      [userId]
    );
    await pool.execute(
      `UPDATE reports SET status = 'resolved' WHERE reported_user_id = ? AND status = 'pending'`,
      [userId]
    );
  }

  return Response.json({ ok: true, action });
}
