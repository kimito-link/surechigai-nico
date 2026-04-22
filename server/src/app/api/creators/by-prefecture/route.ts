import { NextRequest } from "next/server";
import {
  VALID_PREFECTURE_NAMES,
  getCreatorsByPrefecture,
} from "@/lib/creators";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pref = url.searchParams.get("pref");
  if (!pref || !VALID_PREFECTURE_NAMES.has(pref)) {
    return Response.json(
      { error: "invalid prefecture", creators: [], total: 0, liveCount: 0 },
      { status: 400 }
    );
  }
  const result = await getCreatorsByPrefecture(pref);
  return Response.json(result);
}
