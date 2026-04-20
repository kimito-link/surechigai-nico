import { NextRequest } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clerkId } = body;

    if (!clerkId || typeof clerkId !== "string") {
      return Response.json(
        { error: "有効な clerkId を指定してください" },
        { status: 400 }
      );
    }

    // Clerk ID から既存ユーザーを取得
    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT id, uuid, nickname FROM users WHERE clerk_id = ? AND is_deleted = FALSE",
      [clerkId]
    );

    if (existing.length > 0) {
      return Response.json({
        user: {
          id: existing[0].id,
          uuid: existing[0].uuid,
          nickname: existing[0].nickname,
        },
        isNew: false,
      });
    }

    // Clerkウェブフックで既にユーザーが作成されているはず
    // (user.created イベント で UUID が発行されている)
    // ここでは確認のためのレスポンスを返す
    return Response.json(
      { error: "ユーザーが見つかりません。もう一度ログインしてください。" },
      { status: 404 }
    );
  } catch (error) {
    console.error("ユーザー登録エラー:", error);
    return Response.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
