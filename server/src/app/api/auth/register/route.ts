import { NextRequest } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uuid } = body;

    if (!uuid || typeof uuid !== "string" || uuid.length > 36) {
      return Response.json(
        { error: "有効なUUIDを指定してください" },
        { status: 400 }
      );
    }

    // 既存ユーザーチェック
    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT id, uuid, nickname FROM users WHERE uuid = ? AND is_deleted = FALSE",
      [uuid]
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

    // 新規ユーザー作成
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO users (uuid) VALUES (?)",
      [uuid]
    );

    return Response.json(
      {
        user: {
          id: result.insertId,
          uuid,
          nickname: "匿名さん",
        },
        isNew: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ユーザー登録エラー:", error);
    return Response.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
