import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

function withPathnameHeader(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

/**
 * path-to-regexp の解釈やデプロイ差に依存せず、UUID / optional 認証の API だけ常に通す
 * （Clerk protect はセッション必須になり、fetch が落ちる）
 */
function isUnprotectedApiPath(pathname: string): boolean {
  if (pathname === "/api/locations" || pathname.startsWith("/api/locations/")) {
    return true;
  }
  if (
    pathname === "/api/chokaigi/live-map" ||
    pathname.startsWith("/api/chokaigi/live-map/")
  ) {
    return true;
  }
  if (
    pathname === "/api/chokaigi/creator-search" ||
    pathname.startsWith("/api/chokaigi/creator-search/")
  ) {
    return true;
  }
  if (pathname === "/api/analytics/beacon" || pathname.startsWith("/api/analytics/beacon/")) {
    return true;
  }
  if (
    pathname === "/api/auth/register-direct" ||
    pathname.startsWith("/api/auth/register-direct/")
  ) {
    return true;
  }
  // 管理 API は Clerk セッションではなく Basic 認証 (requireAdminAuth) で守る。
  // Clerk protect を通すとリダイレクトで 404 になるので、middleware ではバイパス。
  if (pathname.startsWith("/api/admin/yukkuri-backfill")) {
    return true;
  }
  if (pathname.startsWith("/api/admin/health/yukkuri")) {
    return true;
  }
  return false;
}

const isPublicRoute = createRouteMatcher([
  "/",
  "/chokaigi(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/logged-out",
  "/api/webhooks(.*)",
  "/api/yukkuri-explain",
  "/api/og(.*)",
  "/api/health/db",
  "/api/health/yukkuri",
  /**
   * Bearer uuid: は各 API 内の requireAuth / authenticateRequest で検証する。
   * Clerk の protect() を通すとセッション無しで 401/リダイレクトになり失敗するため public。
   */
  "/api/locations(.*)",
  /** optional 認証（未ログインは publicMode）。パターン末尾 (.*) は Clerk 推奨。 */
  "/api/chokaigi/live-map(.*)",
  "/api/chokaigi/creator-search(.*)",
  "/api/analytics/beacon(.*)",
  "/yukkuri(.*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isUnprotectedApiPath(req.nextUrl.pathname) || isPublicRoute(req)) {
    return withPathnameHeader(req);
  }
  await auth.protect();
  return withPathnameHeader(req);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
