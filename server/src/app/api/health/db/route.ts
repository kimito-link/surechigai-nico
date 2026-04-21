import pool, { getDatabaseConnectionHints } from "@/lib/db";
import { mapDbErrorToUserMessage } from "@/lib/mapDbError";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 運用・デバッグ用: Vercel から MySQL へ届いているかをブラウザで確認（認証不要）
 */
export async function GET() {
  try {
    await pool.query("SELECT 1");
    const [countRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as c FROM users"
    );
    const userCount = Number(countRows[0]?.c ?? 0);
    return Response.json({
      ok: true,
      message: "MySQL 接続に成功しました",
      userCount,
      hints: getDatabaseConnectionHints(),
      note:
        userCount === 0
          ? "users は空です。/app にログインすると register-direct が1件 INSERT します"
          : undefined,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: mapDbErrorToUserMessage(error),
        hints: getDatabaseConnectionHints(),
      },
      { status: 503 }
    );
  }
}
