import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

// CSP対応: script-srcをnonce + ホスト許可リストで厳格化するため、リクエストごとに
// nonceを生成してヘッダーに載せる。Clerk公式のclerkMiddleware({contentSecurityPolicy})は
// style-srcには便利だが、script-srcの'unsafe-inline'を除去する機能が無い(実装を確認済み:
// node_modules/@clerk/nextjs/dist/esm/server/content-security-policy.js の
// buildContentSecurityPolicyDirectives は strict:true でも 'unsafe-inline' を消さず、
// http:/https: の削除とstrict-dynamic/nonceの追加のみ行う)ため、自前でCSPを組み立てる。
// 実装はNext.js公式ドキュメント(nextjs.org/docs/15/app/guides/content-security-policy)の
// middlewareパターンに準拠。
//
// 【重要】'strict-dynamic'は使わない(2026-10-07判明): 'strict-dynamic'が指定されると、
// ブラウザ仕様によりscript-srcのホストベース許可リスト(URLの列挙)が完全に無視される
// ("Note that 'strict-dynamic' is present, so host-based allowlisting is disabled."という
// ブラウザのコンソールエラーで確認)。Clerkは<script src="https://clerk.<domain>/...">タグを
// 自前で生成し、そのタグにnonceを付与する手段が無いため、'strict-dynamic'方式とは
// 根本的に非互換。nonce(自社インラインscript用) + ホスト許可リスト(Clerk等の外部script用)
// の併用方式に統一する。
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  // script-src: 自社コードはnonce必須。Clerk/Stripe系のscriptはnonceが付かないため、
  // 'strict-dynamic'でnonce付きscriptから動的に読み込まれるものは許可する
  // (nonce-based CSPの標準パターン。ホワイトリストのURL列挙は不要になる)。
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    // 開発時はHMR(Fast Refresh)が eval を使うため許可。本番では付与しない。
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");
  // style-src: Clerkの公式ドキュメント(clerk.com/docs/guides/secure/best-practices/csp-headers)が
  // 「Clerkのランタイムcss-in-jsスタイル注入にunsafe-inlineが必須、撤廃は未定のロードマップ項目」と
  // 明言している。next/imageのプレースホルダースタイルも同様にインライン属性を使うため、
  // style-srcのみ不safe-inlineを許容する(script-srcは厳格化するので全体のCSP価値は維持される)。
  const styleSrc = "'self' 'unsafe-inline'";

  // Clerkのカスタムドメイン機能(自ドメイン配下に clerk.<自ドメイン> でAPI/scriptを
  // プロキシする構成)を使っているため、ワイルドカードの*.clerk.com等では
  // カバーできず明示的に含める必要がある(実ブラウザで2026-10-07に確認: connect-src/
  // script-srcの両方で clerk.surechigai-nico.link への通信がブロックされていた)。
  const clerkCustomDomain = "https://clerk.surechigai-nico.link";

  // Clerkが生成する<script src="...">タグにはnonceを付与できないため、
  // 'strict-dynamic'は使わずホスト許可リストで直接許可する(上のコメント参照)。
  const clerkScriptHosts =
    "https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com " +
    clerkCustomDomain;

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc} ${clerkScriptHosts}`,
    `style-src ${styleSrc}`,
    `img-src 'self' data: blob: https://img.clerk.com`,
    `font-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `connect-src 'self' https://clerk-telemetry.com https://*.clerk-telemetry.com https://img.clerk.com https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com ${clerkCustomDomain}`,
    `frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com ${clerkCustomDomain}`,
    `worker-src 'self' blob:`,
  ].join("; ");
}

function withPathnameHeader(req: NextRequest, nonce: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  requestHeaders.set("x-nonce", nonce);
  const cspHeader = buildCspHeader(nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
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
  /**
   * 都道府県別クリエイター一覧。/chokaigi LP のファーストビュー下と
   * 機能カードから未ログインで直接リンクされているので public。
   * 中身は `getPrefectureSummaries` / `getCreatorsByPrefecture` の公開集計データで
   * Clerk セッションは不要。
   */
  "/creators(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/logged-out",
  "/api/webhooks(.*)",
  /**
   * ゆっくり解説 API 群は /chokaigi LP から未ログインで叩かれる。
   * 新しい解説エンドポイントを追加したらここにも必ず足すこと。
   * （落ちると Clerk が sign-in にリダイレクトし、クライアントは E_*_CLIENT_BAD_SHAPE で落ちる）
   */
  "/api/yukkuri-explain",
  "/api/yukkuri-explain-tweet",
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
  const nonce = generateNonce();
  if (isUnprotectedApiPath(req.nextUrl.pathname) || isPublicRoute(req)) {
    return withPathnameHeader(req, nonce);
  }
  await auth.protect();
  return withPathnameHeader(req, nonce);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
