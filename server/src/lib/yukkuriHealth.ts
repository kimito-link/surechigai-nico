import "server-only";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

/**
 * `/api/health/yukkuri` と `/api/admin/health/yukkuri` 共通の診断ロジック。
 *
 * `detailed: false`（公開用）では、外部から列挙可能な環境変数の
 * 有無フラグ（hasUrl, hasToken, hasBearerToken 等）を返さない。
 * これらは攻撃者に「このサービスは Upstash / VOICEVOX / Twitter を使っている」
 * を教える弱い情報開示になるため、詳細版は Basic 認証の admin 配下へ分離する。
 */
export async function gatherYukkuriHealth(
  options: { detailed: boolean } = { detailed: false }
) {
  const { detailed } = options;
  const result: Record<string, unknown> = {};

  // MySQL: yukkuri_explained テーブル件数 + カバレッジ
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM yukkuri_explained"
    );
    const [coverageRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total,
         SUM(display_name IS NOT NULL) AS withName,
         SUM(avatar_url IS NOT NULL) AS withAvatar,
         SUM(display_name IS NOT NULL AND avatar_url IS NOT NULL) AS withBoth
       FROM yukkuri_explained`
    );
    const total = Number(coverageRows[0]?.total ?? 0);
    const withName = Number(coverageRows[0]?.withName ?? 0);
    const withAvatar = Number(coverageRows[0]?.withAvatar ?? 0);
    const withBoth = Number(coverageRows[0]?.withBoth ?? 0);
    const coveragePct =
      total > 0 ? Math.round(((withBoth / total) * 100) * 10) / 10 : 0;
    result.yukkuriExplainedTable = {
      exists: true,
      count: Number(rows[0]?.c ?? 0),
    };
    result.archive = {
      total,
      withName,
      withAvatar,
      withBoth,
      coveragePct,
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
    result.archive = {
      total: 0,
      withName: 0,
      withAvatar: 0,
      withBoth: 0,
      coveragePct: 0,
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

  // --- 以下は detailed === true の時だけ返す（admin 専用） ---
  if (!detailed) {
    return result;
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasRedis = Boolean(redisUrl && redisToken);
  result.upstashRedis = {
    hasUrl: Boolean(redisUrl),
    hasToken: Boolean(redisToken),
    configured: hasRedis,
  };

  if (hasRedis) {
    try {
      const res = await fetch(
        `${redisUrl}/scard/${encodeURIComponent("yukkuri:explained:handles")}`,
        {
          headers: { Authorization: `Bearer ${redisToken}` },
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        }
      );
      if (!res.ok) {
        result.redisScard = { ok: false, status: res.status };
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

  result.voicevox = {
    hasBaseUrl: Boolean(process.env.VOICEVOX_BASE_URL),
  };
  result.twitter = {
    hasBearerToken: Boolean(process.env.TWITTER_BEARER_TOKEN),
  };

  return result;
}
