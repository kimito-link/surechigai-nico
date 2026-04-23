import "server-only";

import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export type YukkuriExplainedArchiveRow = {
  x_handle: string;
  display_name: string | null;
  rink: string;
  konta: string;
  tanunee: string;
  source: string | null;
  first_explained_at: string;
  updated_at: string;
};

type CountRow = RowDataPacket & { cnt: number };

function normalizeHandle(handle: string): string {
  return handle.replace(/^@+/, "").trim().toLowerCase();
}

/**
 * ゆっくり解説の成功結果を DB に保存。
 * 同一 x_handle は 1 行（再解説で本文・updated_at が上書き）。蓄積は「ハンドル種類が増える」形。
 * 公開URL: `/yukkuri/explained/{handle}`（`yukkuriShareUrls`）。
 * テーブル未作成環境では握りつぶす。
 */
export async function upsertYukkuriExplainedArchive(input: {
  xHandle: string;
  displayName?: string | null;
  rink: string;
  konta: string;
  tanunee: string;
  source?: string | null;
}): Promise<void> {
  const h = normalizeHandle(input.xHandle);
  if (!h) return;
  try {
    await pool.execute(
      `INSERT INTO yukkuri_explained (x_handle, display_name, rink, konta, tanunee, source)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         display_name = VALUES(display_name),
         rink = VALUES(rink),
         konta = VALUES(konta),
         tanunee = VALUES(tanunee),
         source = VALUES(source),
         updated_at = CURRENT_TIMESTAMP`,
      [
        h,
        input.displayName && input.displayName.length > 0 ? input.displayName.slice(0, 200) : null,
        input.rink,
        input.konta,
        input.tanunee,
        input.source && input.source.length > 0 ? input.source.slice(0, 64) : null,
      ]
    );
  } catch (e) {
    console.warn("[yukkuri_explained] upsert failed", (e as Error).message);
  }
}

export async function countYukkuriExplainedArchive(): Promise<number> {
  try {
    const [rows] = await pool.query<CountRow[]>(
      `SELECT COUNT(*) AS cnt FROM yukkuri_explained`
    );
    return rows.length > 0 ? Number(rows[0].cnt) : 0;
  } catch {
    return 0;
  }
}

export async function listYukkuriExplainedArchive(
  limit = 500
): Promise<YukkuriExplainedArchiveRow[]> {
  const cap = Math.min(2000, Math.max(1, limit));
  try {
    const [rows] = await pool.query(
      `SELECT x_handle, display_name, rink, konta, tanunee, source,
              DATE_FORMAT(first_explained_at, '%Y-%m-%d %H:%i:%s') AS first_explained_at,
              DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
       FROM yukkuri_explained
       ORDER BY updated_at DESC
       LIMIT ?`,
      [cap]
    );
    return rows as YukkuriExplainedArchiveRow[];
  } catch {
    return [];
  }
}

export async function getYukkuriExplainedArchive(
  handle: string
): Promise<YukkuriExplainedArchiveRow | null> {
  const h = normalizeHandle(handle);
  if (!h) return null;
  try {
    const [rows] = await pool.query(
      `SELECT x_handle, display_name, rink, konta, tanunee, source,
              DATE_FORMAT(first_explained_at, '%Y-%m-%d %H:%i:%s') AS first_explained_at,
              DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
       FROM yukkuri_explained
       WHERE x_handle = ?
       LIMIT 1`,
      [h]
    );
    const list = rows as YukkuriExplainedArchiveRow[];
    return list[0] ?? null;
  } catch {
    return null;
  }
}
