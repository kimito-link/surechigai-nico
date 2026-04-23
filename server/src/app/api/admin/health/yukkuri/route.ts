import type { NextRequest } from "next/server";
import { gatherYukkuriHealth } from "@/lib/yukkuriHealth";
import { requireAdminAuth } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 管理者向け詳細 health。
 *
 * 公開版 `/api/health/yukkuri` に加えて、以下の「環境変数の有無」フラグを返す:
 * - upstashRedis.hasUrl / hasToken / configured / redisScard
 * - twitter.hasBearerToken
 *
 * これらは外部に列挙されると弱い情報開示になるため Basic 認証を要求する。
 * 秘匿値そのものは返さず、常に真偽値のみ。
 */
export async function GET(req: NextRequest) {
  const unauth = requireAdminAuth(req);
  if (unauth) return unauth;
  const data = await gatherYukkuriHealth({ detailed: true });
  return Response.json({ ok: true, ...data });
}
