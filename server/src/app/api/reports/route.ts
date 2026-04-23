import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

const VALID_REASONS = [
  "inappropriate_hitokoto",
  "spam",
  "harassment",
  "other",
] as const;

/** detail は自由入力テキスト。UI は textarea なので常識的な上限で打ち切る。 */
const DETAIL_MAX_LEN = 2000;

/** 通報 3 件以上（異なる reporter）で自動停止する閾値。 */
const AUTO_SUSPEND_THRESHOLD = 3;

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  // req.json() は空 body / 不正 JSON で throw する。HTML 500 ではなく 400 JSON で返す。
  let body: {
    reportedUserId?: unknown;
    encounterId?: unknown;
    reason?: unknown;
    detail?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "JSON ボディが不正です" }, { status: 400 });
  }

  // reportedUserId は BIGINT。文字列化された ID を渡されると DB 側で暗黙キャストされ、
  // 想定外の行にマッチし得るため、正の整数のみ許可する。
  if (!isPositiveInt(body.reportedUserId)) {
    return Response.json(
      { error: "reportedUserId は正の整数です" },
      { status: 400 }
    );
  }
  const reportedUserId: number = body.reportedUserId;

  if (reportedUserId === authResult.id) {
    return Response.json({ error: "自分自身は通報できません" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason : "";
  if (!(VALID_REASONS as readonly string[]).includes(reason)) {
    return Response.json({ error: "不正な通報理由です" }, { status: 400 });
  }

  // encounterId は任意。渡された場合のみ正の整数で検証。null / undefined は DB NULL。
  let encounterId: number | null = null;
  if (body.encounterId != null) {
    if (!isPositiveInt(body.encounterId)) {
      return Response.json(
        { error: "encounterId は正の整数です" },
        { status: 400 }
      );
    }
    encounterId = body.encounterId;
  }

  // detail は任意。長さ上限を越えたら 400 で弾く（UI 側でも切るが、API 単独でも守る）。
  let detail: string | null = null;
  if (typeof body.detail === "string" && body.detail.length > 0) {
    if (body.detail.length > DETAIL_MAX_LEN) {
      return Response.json(
        { error: `detail は ${DETAIL_MAX_LEN} 文字以内です` },
        { status: 400 }
      );
    }
    detail = body.detail;
  }

  try {
    await pool.execute(
      `INSERT INTO reports (reporter_id, reported_user_id, encounter_id, reason, detail)
       VALUES (?, ?, ?, ?, ?)`,
      [authResult.id, reportedUserId, encounterId, reason, detail]
    );

    // 通報3件以上で自動停止（異なるユーザーからの通報のみカウント）
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT reporter_id) as cnt FROM reports WHERE reported_user_id = ?`,
      [reportedUserId]
    );
    const reportCount = Number(rows[0]?.cnt ?? 0);
    if (Number.isFinite(reportCount) && reportCount >= AUTO_SUSPEND_THRESHOLD) {
      await pool.execute(
        `UPDATE users SET is_suspended = TRUE, suspended_at = NOW() WHERE id = ? AND is_suspended = FALSE`,
        [reportedUserId]
      );
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[reports] POST failed", err);
    return Response.json(
      { error: "通報の登録に失敗しました。少し待ってから再試行してください。" },
      { status: 500 }
    );
  }
}
