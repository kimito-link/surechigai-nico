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

  // req.json() は body が空 / 不正 JSON のときに throw する。
  // null を返すケース（beacon 送信で body 0 バイト）もあり、直後に body.event_type を
  // 読むと TypeError になる。両方ここで握って 400 JSON に置き換える。
  let body: { event_type?: unknown } | null;
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "JSON ボディが不正です" }, { status: 400 });
  }
  const eventType = typeof body?.event_type === "string" ? body.event_type : "";

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
