import { NextRequest, NextResponse } from "next/server";

const ADMIN_USER = process.env.ADMIN_USER || "CHANGE_ME";
const ADMIN_PASS = process.env.ADMIN_PASS || "CHANGE_ME";
const COOKIE_NAME = "admin_auth";
const COOKIE_VALUE = "authenticated";

export function middleware(req: NextRequest) {
  // Cookieで認証済みならOK
  const cookie = req.cookies.get(COOKIE_NAME);
  if (cookie?.value === COOKIE_VALUE) {
    return NextResponse.next();
  }

  // Basic認証チェック
  const auth = req.headers.get("authorization");
  if (auth && auth.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const [user, pass] = decoded.split(":");
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      // 認証成功: Cookieをセットしてfetchでも認証が通るようにする
      const res = NextResponse.next();
      res.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24時間
        path: "/",
      });
      return res;
    }
  }

  return new NextResponse("認証が必要です", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
