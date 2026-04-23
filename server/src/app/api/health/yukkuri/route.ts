import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 運用・デバッグ用: ゆっくり解説まわりの「数字が 0 のまま」問題を切り分けるための診断。
 *
 * 調べる対象:
 * - yukkuri_explained テーブルの存在と件数（ゆっくり解説アーカイブ）
 * - locations テーブルの直近 30分件数（現在参加中）
 * - Upstash Redis 環境変数の有無（無いと Redis 集合カウントが常に 0）
 * - Upstash Redis SCARD の結果（設定されているなら件数）
 * - VOICEVOX_BASE_URL の有無（無いと音声プレイヤーが「未設定」表示）
 *
 * 秘匿値は返さない。値の存在フラグ (has*) と件数のみ。
 */
export async function GET() {
  const result: Record<string, unknown> = {};

  // MySQL: yukkuri_explained
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM yukkuri_explained"
    );
    result.yukkuriExplainedTable = {
      exists: true,
      count: Number(rows[0]?.c ?? 0),
    };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    result.yukkuriExplainedTable = {
      exists: false,
      error: msg.slice(0, 200),
      hint: /doesn't exist|Unknown table/i.test(msg)
        ? "scripts/ensure-chokaigi-tables.sql を本番 DB に適用してください"
        : undefined,
    };
  }

  // MySQL: locations 直近30分（activeNow と同ロジック）
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT l.user_id) AS c
       FROM locations l
       INNER JOIN users u ON u.id = l.user_id
       WHERE u.is_deleted = FALSE
         AND u.is_suspended = FALSE
         AND l.created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)`
    );
    result.activeNow30min = { ok: true, count: Number(rows[0]?.c ?? 0) };
  } catch (err) {
    result.activeNow30min = {
      ok: false,
      error: (err as Error).message.slice(0, 200),
    };
  }

  // Upstash Redis 環境変数フラグ
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasRedis = Boolean(redisUrl && redisToken);
  result.upstashRedis = {
    hasUrl: Boolean(redisUrl),
    hasToken: Boolean(redisToken),
    configured: hasRedis,
  };

  // Upstash Redis: ゆっくり解説ハンドル集合の SCARD
  if (hasRedis) {
    try {
      const res = await fetch(
        `${redisUrl}/scard/${encodeURIComponent("yukkuri:explained:handles")}`,
        {
          headers: { Authorization: `Bearer ${redisToken}` },
          cache: "no-store",
        }
      );
      if (!res.ok) {
        result.redisScard = {
          ok: false,
          status: res.status,
        };
      } else {
        const data = (await res.json()) as { result?: number | string | null };
        const n = Number(data.result ?? 0);
        result.redisScard = { ok: true, count: Number.isFinite(n) ? n : 0 };
      }
    } catch (err) {
      result.redisScard = {
        ok: false,
        error: (err as Error).message.slice(0, 200),
      };
    }
  }

  // VOICEVOX
  result.voicevox = {
    hasBaseUrl: Boolean(process.env.VOICEVOX_BASE_URL),
  };

  // TWITTER (既知確認)
  result.twitter = {
    hasBearerToken: Boolean(process.env.TWITTER_BEARER_TOKEN),
  };

  return Response.json({ ok: true, ...result });
}
