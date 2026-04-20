import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import type { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clerkId, email, twitterHandle } = body;

    if (!clerkId || typeof clerkId !== "string") {
      return Response.json({ error: "clerkId が必要です" }, { status: 400 });
    }

    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT id, uuid, nickname, avatar_config FROM users WHERE clerk_id = ? AND is_deleted = FALSE",
      [clerkId]
    );

    if (existing.length > 0) {
      const user = existing[0];
      const isOnboarded = !!user.avatar_config;
      return Response.json({
        user: { uuid: user.uuid, nickname: user.nickname },
        isNew: false,
        isOnboarded,
      });
    }

    const newUuid = uuidv4();
    await pool.execute(
      `INSERT INTO users (uuid, clerk_id, clerk_email, twitter_handle, nickname)
       VALUES (?, ?, ?, ?, ?)`,
      [newUuid, clerkId, email || null, twitterHandle || null, "匿名さん"]
    );

    return Response.json({
      user: { uuid: newUuid, nickname: "匿名さん" },
      isNew: true,
      isOnboarded: false,
    });
  } catch (error) {
    console.error("register-direct error:", error);
    return Response.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
