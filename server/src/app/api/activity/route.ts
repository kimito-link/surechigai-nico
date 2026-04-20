import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const VALID_EVENTS = [
  "app_open",
  "app_background",
  "encounter_view",
  "like",
  "hitokoto_set",
  "song_set",
];

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const body = await req.json();
  const eventType = body.event_type as string;

  if (!eventType || !VALID_EVENTS.includes(eventType)) {
    return Response.json({ error: "不正なevent_typeです" }, { status: 400 });
  }

  try {
    await pool.execute(
      "INSERT INTO user_activity_log (user_id, event_type) VALUES (?, ?)",
      [authResult.id, eventType]
    );

    // app_openの場合はlast_active_atも更新
    if (eventType === "app_open") {
      await pool.execute(
        "UPDATE users SET last_active_at = NOW() WHERE id = ?",
        [authResult.id]
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("行動ログ記録エラー:", error);
    return Response.json({ error: "記録に失敗しました" }, { status: 500 });
  }
}
