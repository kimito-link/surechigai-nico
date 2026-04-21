import { NextRequest } from "next/server";
import pool from "./db";
import type { RowDataPacket } from "mysql2";

export interface AuthUser {
  id: number;
  uuid: string;
}

/**
 * Authorization ヘッダーからユーザーを認証する
 * 形式: "Bearer uuid:<uuid値>"
 */
export async function authenticateRequest(
  req: NextRequest
): Promise<AuthUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer uuid:")) return null;

  const uuid = authHeader.slice("Bearer uuid:".length);
  if (!uuid) return null;

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id, uuid FROM users WHERE uuid = ? AND is_deleted = FALSE",
      [uuid]
    );

    if (rows.length === 0) return null;
    return { id: rows[0].id, uuid: rows[0].uuid };
  } catch (e) {
    console.error("UUID 認可の DB 照会に失敗:", e);
    return null;
  }
}

/**
 * 認証必須のAPIで使うヘルパー / 未認証なら401レスポンスを返す
 */
export async function requireAuth(
  req: NextRequest
): Promise<AuthUser | Response> {
  const user = await authenticateRequest(req);
  if (!user) {
    return Response.json({ error: "認証が必要です" }, { status: 401 });
  }
  return user;
}
