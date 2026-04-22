import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { countYukkuriExplainedArchive } from "@/lib/yukkuriExplainedArchive";

/** 「現在参加中」の判定窓（分） */
export const ACTIVE_WINDOW_MINUTES = 30;

/** ゆっくり解説された固有ハンドル集合の Upstash Redis キー */
export const YUKKURI_EXPLAINED_SET_KEY = "yukkuri:explained:handles";

export type HomeStats = {
  /** 直近 ACTIVE_WINDOW_MINUTES 分以内に位置を送信したユニークユーザー数 */
  activeNow: number;
  /** すれちがい通信に登録済みの（有効な）ユーザー総数 */
  registeredTotal: number;
  /** 累計すれちがい回数 */
  encountersTotal: number;
  /** ゆっくり解説された（生成キャッシュが作られた）固有ハンドル数 */
  yukkuriExplained: number;
};

type CountRow = RowDataPacket & { cnt: number };

async function loadActiveNow(): Promise<number> {
  try {
    const [rows] = await pool.query<CountRow[]>(
      `SELECT COUNT(DISTINCT l.user_id) AS cnt
       FROM locations l
       INNER JOIN users u ON u.id = l.user_id
       WHERE u.is_deleted = FALSE
         AND u.is_suspended = FALSE
         AND l.created_at >= DATE_SUB(NOW(), INTERVAL ${ACTIVE_WINDOW_MINUTES} MINUTE)`
    );
    return rows.length > 0 ? Number(rows[0].cnt) : 0;
  } catch {
    return 0;
  }
}

async function loadRegisteredTotal(): Promise<number> {
  try {
    const [rows] = await pool.query<CountRow[]>(
      `SELECT COUNT(*) AS cnt
       FROM users
       WHERE is_deleted = FALSE
         AND is_suspended = FALSE`
    );
    return rows.length > 0 ? Number(rows[0].cnt) : 0;
  } catch {
    return 0;
  }
}

async function loadEncountersTotal(): Promise<number> {
  try {
    const [rows] = await pool.query<CountRow[]>(
      `SELECT COUNT(*) AS cnt FROM encounters`
    );
    return rows.length > 0 ? Number(rows[0].cnt) : 0;
  } catch {
    return 0;
  }
}

async function loadYukkuriExplainedRedis(): Promise<number> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return 0;
  try {
    const res = await fetch(
      `${url}/scard/${encodeURIComponent(YUKKURI_EXPLAINED_SET_KEY)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as { result?: number | string | null };
    const n = Number(data.result ?? 0);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * 解説成功時に固有ハンドル集合へ SADD（べき等）。
 * キャッシュヒット時は setCached が呼ばれないため、ここでも記録して TOP の件数と揃える。
 */
export async function recordYukkuriExplainedHandleRedis(handle: string): Promise<void> {
  const h = handle.replace(/^@+/, "").trim().toLowerCase();
  if (!h) return;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([["SADD", YUKKURI_EXPLAINED_SET_KEY, h]]),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("[homeStats] recordYukkuriExplainedHandleRedis pipeline not ok", res.status);
    }
  } catch {
    console.warn("[homeStats] recordYukkuriExplainedHandleRedis failed");
  }
}

/** DB アーカイブ件数と Redis 集合の大きい方（移行期間・Redis 未設定でも DB のみで表示できる） */
async function loadYukkuriExplained(): Promise<number> {
  const [fromRedis, fromDb] = await Promise.all([
    loadYukkuriExplainedRedis(),
    countYukkuriExplainedArchive(),
  ]);
  return Math.max(fromRedis, fromDb);
}

/**
 * ヒーローに出す 4 種類のメトリクスを並列で取得する。
 * それぞれ独立してエラー処理済みなので一つが落ちても他は 0 でなく最新値を返す。
 */
export async function loadHomeStats(): Promise<HomeStats> {
  const [activeNow, registeredTotal, encountersTotal, yukkuriExplained] =
    await Promise.all([
      loadActiveNow(),
      loadRegisteredTotal(),
      loadEncountersTotal(),
      loadYukkuriExplained(),
    ]);
  return { activeNow, registeredTotal, encountersTotal, yukkuriExplained };
}
