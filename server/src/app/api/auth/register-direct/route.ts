import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** users.nickname は VARCHAR(20)。Clerk の表示名が長いと INSERT/UPDATE が失敗するため丸める */
const DB_NICKNAME_MAX = 20;
/** users.twitter_handle */
const DB_TWITTER_MAX = 30;

function clipNicknameForDb(raw: string | null | undefined, fallback: string): string {
  const base =
    (raw != null && String(raw).trim() !== "" ? String(raw).trim() : fallback) ||
    "匿名さん";
  const chars = Array.from(base);
  if (chars.length <= DB_NICKNAME_MAX) return base;
  return chars.slice(0, DB_NICKNAME_MAX).join("");
}

function clipTwitterHandleForDb(h: string | null | undefined): string | null {
  if (h == null) return null;
  const t = String(h).replace(/^@/, "").trim();
  if (!t) return null;
  const chars = Array.from(t);
  if (chars.length <= DB_TWITTER_MAX) return t;
  return chars.slice(0, DB_TWITTER_MAX).join("");
}

/**
 * MySQL JSON 型カラムは文字列で渡すのが最も安全（driver が返す object をそのまま渡すと環境差で 500 になる）
 */
function normalizeAvatarConfigForDb(
  nextAvatarUrl: string | null | undefined,
  previous: unknown
): string | null {
  if (nextAvatarUrl != null && String(nextAvatarUrl).trim() !== "") {
    return JSON.stringify({ type: "twitter", url: String(nextAvatarUrl) });
  }
  if (previous == null) return null;
  if (typeof previous === "string") return previous;
  if (Buffer.isBuffer(previous)) {
    return previous.length ? previous.toString("utf8") : null;
  }
  try {
    return JSON.stringify(previous);
  } catch {
    return null;
  }
}

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
      const avatarConfig = normalizeAvatarConfigForDb(avatarUrl, user.avatar_config);
      const nickname = clipNicknameForDb(
        displayName != null && String(displayName).trim() !== ""
          ? String(displayName)
          : null,
        String(user.nickname)
      );
      const tw = clipTwitterHandleForDb(
        typeof twitterHandle === "string" ? twitterHandle : null
      );
      await pool.execute(
        "UPDATE users SET nickname = ?, avatar_config = ?, twitter_handle = ?, clerk_email = ? WHERE id = ?",
        [nickname, avatarConfig, tw, email || null, user.id]
      );
      return Response.json({
        user: { uuid: user.uuid, nickname },
        isNew: false,
        isOnboarded: true,
      });
    }

    const newUuid = uuidv4();
    const nickname = clipNicknameForDb(displayName, "匿名さん");
    const avatarConfig = normalizeAvatarConfigForDb(avatarUrl, null);
    const tw = clipTwitterHandleForDb(
      typeof twitterHandle === "string" ? twitterHandle : null
    );
    await pool.execute(
      `INSERT INTO users (uuid, clerk_id, clerk_email, twitter_handle, nickname, avatar_config)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newUuid, clerkId, email || null, tw, nickname, avatarConfig]
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
