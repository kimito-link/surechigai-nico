import { NextRequest } from "next/server";
import { parseAvatarPayload } from "@/lib/avatarPayload";

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
    console.error("アバター保存エラー:", error);
    return Response.json({ error: "アバターの保存に失敗しました" }, { status: 500 });
  }
}
