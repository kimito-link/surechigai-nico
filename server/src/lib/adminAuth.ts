import { NextRequest } from "next/server";

/**
 * 管理 API 用の Basic 認証。
 *
 * - `ADMIN_USER` / `ADMIN_PASS` が未設定 or デフォルト値の場合、
 *   本番では 503 を返し「未設定です」と明示する（無限に無認証で叩けるのを防ぐ）。
 * - 開発環境では `admin/admin` をデフォルトにする。
 */
const ADMIN_USER_ENV = process.env.ADMIN_USER;
const ADMIN_PASS_ENV = process.env.ADMIN_PASS;

const IS_PROD = process.env.NODE_ENV === "production";

const ADMIN_USER = ADMIN_USER_ENV || (IS_PROD ? null : "admin");
const ADMIN_PASS = ADMIN_PASS_ENV || (IS_PROD ? null : "admin");

function unauthorized(message: string): Response {
  return new Response(message, {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function requireAdminAuth(req: NextRequest): Response | null {
  if (!ADMIN_USER || !ADMIN_PASS) {
    console.warn(
      "[adminAuth] ADMIN_USER / ADMIN_PASS が未設定のため、管理 API を 503 で閉じます"
    );
    return new Response("管理 API が未設定です（ADMIN_USER / ADMIN_PASS を設定してください）", {
      status: 503,
    });
  }

  const auth = req.headers.get("authorization");

  if (!auth || !auth.startsWith("Basic ")) {
    return unauthorized("認証が必要です");
  }

  let decoded: string;
  try {
    decoded = atob(auth.slice(6));
  } catch {
    return unauthorized("認証情報が不正です");
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return unauthorized("認証情報が不正です");
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);

  if (!timingSafeStringEqual(user, ADMIN_USER) || !timingSafeStringEqual(pass, ADMIN_PASS)) {
    return unauthorized("認証に失敗しました");
  }

  return null;
}
