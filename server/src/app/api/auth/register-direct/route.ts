import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import type { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clerkId, email, twitterHandle, displayName, avatarUrl } = body;

    if (!clerkId || typeof clerkId !== "string") {
      return Response.json({ error: "clerkId が必要です" }, { status: 400 });
    }

    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT id, uuid, nickname, avatar_config FROM users WHERE clerk_id = ? AND is_deleted = FALSE",
      [clerkId]
    );

    if (existing.length > 0) {
      const user = existing[0];
      // 既存ユーザー: Twitter情報を最新に更新
      const avatarConfig = avatarUrl
        ? JSON.stringify({ type: "twitter", url: avatarUrl })
        : user.avatar_config;
      const nickname = displayName || user.nickname;
      await pool.execute(
        "UPDATE users SET nickname = ?, avatar_config = ?, twitter_handle = ?, clerk_email = ? WHERE id = ?",
        [nickname, avatarConfig, twitterHandle || null, email || null, user.id]
      );
      return Response.json({
        user: { uuid: user.uuid, nickname },
        isNew: false,
        isOnboarded: true,
      });
    }

    const newUuid = uuidv4();
    const nickname = displayName || "匿名さん";
    const avatarConfig = avatarUrl
      ? JSON.stringify({ type: "twitter", url: avatarUrl })
      : null;
    await pool.execute(
      `INSERT INTO users (uuid, clerk_id, clerk_email, twitter_handle, nickname, avatar_config)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newUuid, clerkId, email || null, twitterHandle || null, nickname, avatarConfig]
    );

    return Response.json({
      user: { uuid: newUuid, nickname },
      isNew: true,
      isOnboarded: true,
    });
  } catch (error) {
    console.error("register-direct error:", error);
    return Response.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
