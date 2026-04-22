import { NextResponse, type NextRequest } from "next/server";
import { runCreatorCrossSearch } from "@/lib/creatorCrossSearch/runSearch";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const hall = req.nextUrl.searchParams.get("hall") ?? "";
  const body = runCreatorCrossSearch(q, hall);
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
