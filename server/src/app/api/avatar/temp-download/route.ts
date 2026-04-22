import { NextRequest } from "next/server";
import { parseAvatarPayload } from "@/lib/avatarPayload";

// temp-avatar-download.php の置き換え
export async function POST(req: NextRequest) {
  try {
    const payload = await parseAvatarPayload(req);

    return new Response(new Uint8Array(payload.buffer), {
      headers: {
        "Content-Type": payload.contentType,
        "Content-Disposition": `attachment; filename="${payload.filename}"`,
      },
    });
  } catch (error) {
    console.error("一時アバターダウンロードエラー:", error);
    return Response.json({ error: "ダウンロード用データがありません" }, { status: 400 });
  }
}
