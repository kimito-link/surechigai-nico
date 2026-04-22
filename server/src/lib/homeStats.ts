import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

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
    // 「すれちがい通信 登録」= これまでに 1 度でも位置情報を送った参加者の
    // ユニーク数に揃える。単に users を COUNT すると位置未送信ユーザーも
    // 含んでしまい、/creators 側 (locations INNER JOIN) と人数が食い違う。
    const [rows] = await pool.query<CountRow[]>(
      `SELECT COUNT(DISTINCT l.user_id) AS cnt
       FROM locations l
       INNER JOIN users u ON u.id = l.user_id
       WHERE u.is_deleted = FALSE
         AND u.is_suspended = FALSE`
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

async function loadYukkuriExplained(): Promise<number> {
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
