import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAdminAuth } from "@/lib/adminAuth";
import type { RowDataPacket } from "mysql2";

// 通報一覧(ユーザーごとに集約) — Basic 認証 (requireAdminAuth) で保護
export async function GET(req: NextRequest) {
  const unauth = requireAdminAuth(req);
  if (unauth) return unauth;

  try {
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
  } catch (err) {
    console.error("[admin/reports] GET failed", err);
    return Response.json(
      { error: "通報一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// 停止/解除 — Basic 認証 (requireAdminAuth) で保護
export async function PATCH(req: NextRequest) {
  const unauth = requireAdminAuth(req);
  if (unauth) return unauth;

  // req.json() は body が空 / 不正 JSON のときに throw する。
  // ハンドラ全体を try/catch で囲うと 500 になって「操作の成否」と
  // 「リクエスト形式エラー」の区別が UI からつかないため、先に parse を試す。
  let body: { userId?: unknown; action?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json(
      { error: "JSON ボディが不正です" },
      { status: 400 }
    );
  }

  const action = typeof body.action === "string" ? body.action : "";
  // userId は BIGINT の ID。number 以外（string / boolean / 非整数）を拒否する。
  // 過去に JSON stringify 経由で文字列化した userId が DB 側で暗黙キャストされ、
  // 想定外の行を更新しかけた事故があるためここで厳しく弾く。
  const userId =
    typeof body.userId === "number" &&
    Number.isInteger(body.userId) &&
    body.userId > 0
      ? body.userId
      : null;

  if (userId === null || !["suspend", "unsuspend"].includes(action)) {
    return Response.json(
      { error: "userId (正の整数) と action (suspend/unsuspend) は必須です" },
      { status: 400 }
    );
  }

  try {
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
  } catch (err) {
    console.error("[admin/reports] PATCH failed", err);
    return Response.json(
      { error: "停止/解除処理に失敗しました" },
      { status: 500 }
    );
  }
}
