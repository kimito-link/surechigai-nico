import { NextRequest } from "next/server";

const ADMIN_USER = process.env.ADMIN_USER || "CHANGE_ME";
const ADMIN_PASS = process.env.ADMIN_PASS || "CHANGE_ME";

export function requireAdminAuth(req: NextRequest): Response | null {
  const auth = req.headers.get("authorization");

  if (!auth || !auth.startsWith("Basic ")) {
    return new Response("認証が必要です", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
    });
  }

  const decoded = atob(auth.slice(6));
  const [user, pass] = decoded.split(":");

  if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
    return new Response("認証に失敗しました", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
    });
  }

  return null;
}
