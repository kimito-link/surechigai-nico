import { getPrefectureSummaries } from "@/lib/creators";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const result = await getPrefectureSummaries();
  return Response.json({
    prefectures: result.prefectures,
    total: result.prefectures.length,
    totalCreators: result.totalCreators,
    totalLive: result.totalLive,
  });
}
