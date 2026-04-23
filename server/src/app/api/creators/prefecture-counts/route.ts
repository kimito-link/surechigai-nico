import { NextRequest } from "next/server";
import { getPrefectureSummaries, parseVisibilityMin } from "@/lib/creators";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  // CODEX-NEXT.md §1 表 4 行目: 任意で `?visibilityMin=1|2` を受け、
  // 「本人が公開を許可した位置情報」だけに絞り込めるようにする（opt-in）。
  // 既存呼び出し（クエリなし）は従来挙動のまま。
  const url = new URL(req.url);
  const visibilityMin = parseVisibilityMin(url.searchParams.get("visibilityMin"));
  const result = await getPrefectureSummaries({ visibilityMin });
  return Response.json({
    prefectures: result.prefectures,
    total: result.prefectures.length,
    totalCreators: result.totalCreators,
    totalLive: result.totalLive,
  });
}
