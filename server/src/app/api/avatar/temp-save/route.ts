import { NextRequest } from "next/server";
import { parseAvatarPayload } from "@/lib/avatarPayload";

// temp-avatar-save.php の置き換え
export async function POST(req: NextRequest) {
  try {
    const payload = await parseAvatarPayload(req);
    return Response.json({
      ok: true,
      filename: payload.filename,
      format: payload.format,
      path: payload.dataUrl,
      avatarUrl: payload.dataUrl,
    });
  } catch (error) {
    console.error("一時アバター保存エラー:", error);
    return Response.json({ error: "一時アバターの保存に失敗しました" }, { status: 500 });
  }
}
