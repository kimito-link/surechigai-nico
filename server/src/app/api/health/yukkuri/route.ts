import { gatherYukkuriHealth } from "@/lib/yukkuriHealth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 公開用 health エンドポイント。
 *
 * 公開情報は意図的に最小化:
 * - yukkuri_explained テーブルの件数とカバレッジ
 * - activeNow30min（LP ヒーロー表示に使う既知の公開情報）
 *
 * 返さない: Upstash/Twitter の環境変数有無（どの外部サービスを
 * 使っているかの弱い情報開示を避ける）。詳細版は Basic 認証付きで
 * `/api/admin/health/yukkuri` から参照する。
 */
export async function GET() {
  const data = await gatherYukkuriHealth({ detailed: false });
  return Response.json({ ok: true, ...data });
}
