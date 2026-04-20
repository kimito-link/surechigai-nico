import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { searchTracks } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const url = new URL(req.url);
  const query = url.searchParams.get("q");

  if (!query || query.length < 1) {
    return Response.json({ error: "検索クエリを指定してください" }, { status: 400 });
  }

  try {
    const tracks = await searchTracks(query);
    return Response.json({ tracks });
  } catch (error) {
    console.error("Spotify検索エラー:", error);
    return Response.json(
      { error: "曲の検索に失敗しました" },
      { status: 500 }
    );
  }
}
