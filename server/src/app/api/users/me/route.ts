import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isValidPrefectureCode } from "@/lib/prefectureCodes";
import type { RowDataPacket } from "mysql2";

// プロフィール取得
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, uuid, nickname, avatar_config, avatar_url, hitokoto, hitokoto_set_at,
            spotify_track_id, spotify_track_name, spotify_artist_name, spotify_album_image_url,
            age_group, gender, show_age_group, show_gender,
            notification_enabled, location_paused_until, streak_count, last_encounter_date,
            home_prefecture, location_visibility, created_at
     FROM users WHERE id = ?`,
    [authResult.id]
  );

  if (rows.length === 0) {
    return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  const user = rows[0];
  // 24時間超えたひとことは期限切れとして返さない
  if (user.hitokoto && user.hitokoto_set_at) {
    const setAt = new Date(user.hitokoto_set_at as string).getTime();
    if (Date.now() - setAt > 24 * 60 * 60 * 1000) {
      user.hitokoto = null;
      user.hitokoto_expired = true;
    }
  }

  return Response.json({ user });
}

// プロフィール更新
export async function PATCH(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  // req.json() は body が空 / 不正 JSON のときに throw する。
  // また Object.entries(null) は TypeError になるので body が object であることも確認。
  let body: Record<string, unknown>;
  try {
    const parsed = (await req.json()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return Response.json(
        { error: "JSON ボディはオブジェクトを指定してください" },
        { status: 400 }
      );
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: "JSON ボディが不正です" }, { status: 400 });
  }

  // 更新可能なフィールド
  const allowedFields: Record<string, string> = {
    nickname: "VARCHAR",
    avatar_config: "JSON",
    hitokoto: "VARCHAR",
    spotify_track_id: "VARCHAR",
    spotify_track_name: "VARCHAR",
    spotify_artist_name: "VARCHAR",
    spotify_album_image_url: "VARCHAR",
    age_group: "ENUM",
    gender: "ENUM",
    show_age_group: "BOOLEAN",
    show_gender: "BOOLEAN",
    notification_enabled: "BOOLEAN",
    fcm_token: "VARCHAR",
    avatar_url: "VARCHAR",
    location_paused_until: "DATETIME",
    // 超会議 2026「参加県と公開範囲」（CODEX-NEXT.md §1）
    // - home_prefecture: JIS X 0401 "01".."47" or null。prefectureCodes.ts で検証
    // - location_visibility: 0=完全非公開 / 1=マッチ相手のみ / 2=全体公開
    home_prefecture: "VARCHAR",
    location_visibility: "TINYINT",
  };

  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (!(key in allowedFields)) continue;

    // バリデーション
    if (key === "nickname" && (typeof value !== "string" || value.length > 20)) {
      return Response.json(
        { error: "ニックネームは20文字以内で入力してください" },
        { status: 400 }
      );
    }
    if (key === "hitokoto" && value !== null && (typeof value !== "string" || value.length > 100)) {
      return Response.json(
        { error: "ひとことは100文字以内で入力してください" },
        { status: 400 }
      );
    }
    // 参加県。null は「設定解除」として許可。文字列なら "01".."47" のみ許可
    // （整数で投げられた場合も拒否。型揺れを避けるため）。
    if (key === "home_prefecture") {
      if (value !== null && !isValidPrefectureCode(value)) {
        return Response.json(
          { error: "home_prefecture は \"01\"〜\"47\" の文字列または null を指定してください" },
          { status: 400 }
        );
      }
    }
    // 公開レベル。0/1/2 の整数のみ受け付ける。boolean / 文字列は拒否。
    if (key === "location_visibility") {
      if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < 0 ||
        value > 2
      ) {
        return Response.json(
          { error: "location_visibility は 0 / 1 / 2 のいずれかで指定してください" },
          { status: 400 }
        );
      }
    }
    // ひとこと更新時にhitokoto_set_atも自動更新
    if (key === "hitokoto") {
      updates.push("hitokoto_set_at = ?");
      values.push(value ? new Date().toISOString().slice(0, 19).replace("T", " ") : null);
    }
    if (key === "avatar_config" && value !== null) {
      updates.push(`${key} = ?`);
      values.push(JSON.stringify(value));
      continue;
    }

    updates.push(`${key} = ?`);
    values.push(value as string | number | boolean | null);
  }

  if (updates.length === 0) {
    return Response.json({ error: "更新するフィールドがありません" }, { status: 400 });
  }

  values.push(authResult.id);
  try {
    await pool.execute(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[users/me] PATCH failed", err);
    return Response.json(
      { error: "プロフィール更新に失敗しました" },
      { status: 500 }
    );
  }
}

// アカウント削除（匿名化処理）
// - ユーザー情報を匿名化
// - 位置情報ログのuser_idをnull化
// - すれ違い記録は相手側に残すが自分の情報を匿名化
export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const userId = authResult.id;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // いいね・通報・ブロックを削除
    await conn.execute("DELETE FROM likes WHERE user_id = ?", [userId]);
    await conn.execute("DELETE FROM blocks WHERE blocker_id = ? OR blocked_id = ?", [userId, userId]);
    await conn.execute("DELETE FROM reports WHERE reporter_id = ?", [userId]);
    await conn.execute("DELETE FROM notification_log WHERE user_id = ?", [userId]);

    // 位置情報ログを削除
    await conn.execute("DELETE FROM locations WHERE user_id = ?", [userId]);

    // すれ違い記録は残すが、相手から見た時に匿名化される
    // ユーザー情報を匿名化してis_deleted=trueに
    await conn.execute(
      `UPDATE users SET
        nickname = '退会済みユーザー',
        avatar_config = NULL,
        avatar_url = NULL,
        hitokoto = NULL,
        spotify_track_id = NULL,
        spotify_track_name = NULL,
        spotify_artist_name = NULL,
        spotify_album_image_url = NULL,
        fcm_token = NULL,
        is_deleted = TRUE
      WHERE id = ?`,
      [userId]
    );

    await conn.commit();
    return Response.json({ ok: true, message: "アカウントを削除しました" });
  } catch (error) {
    await conn.rollback();
    console.error("アカウント削除エラー:", error);
    return Response.json({ error: "削除に失敗しました" }, { status: 500 });
  } finally {
    conn.release();
  }
}
