import "server-only";

import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export type YukkuriExplainedArchiveRow = {
  x_handle: string;
  display_name: string | null;
  avatar_url: string | null;
  rink: string;
  konta: string;
  tanunee: string;
  source: string | null;
  first_explained_at: string;
  updated_at: string;
  /**
   * users テーブルに同じハンドルで登録されているか（すれ違いライトの参加者か）。
   * CODEX-NEXT.md §2 対応。現状は users.twitter_handle がまだアプリ側で populate されていないので
   * 常に false に落ちるが、X 連携が入ったタイミングで自動的に true に切り替わる設計。
   */
  is_surechigai_member?: boolean;
  /**
   * users.home_prefecture を返すのは「本人が全体公開している（location_visibility >= 2）」ときだけ。
   * それ以外は null。JIS X 0401 の "01".."47" 形式。
   */
  home_prefecture?: string | null;
};

type CountRow = RowDataPacket & { cnt: number };
type SitemapRow = RowDataPacket & { x_handle: string; updated_at: string };

export type ListYukkuriExplainedArchiveOptions = {
  limit?: number;
  offset?: number;
  query?: string;
  since?: string;
};

function normalizeHandle(handle: string): string {
  // trim を先に行う。逆順だと「先頭空白 + @」の入力で `^@+` が一致せず @ が残る。
  return handle.trim().replace(/^@+/, "").toLowerCase();
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
  avatarUrl?: string | null;
  rink: string;
  konta: string;
  tanunee: string;
  source?: string | null;
}): Promise<void> {
  const h = normalizeHandle(input.xHandle);
  if (!h) return;
  try {
    await pool.execute(
      `INSERT INTO yukkuri_explained (x_handle, display_name, avatar_url, rink, konta, tanunee, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         display_name = COALESCE(VALUES(display_name), display_name),
         avatar_url = COALESCE(VALUES(avatar_url), avatar_url),
         rink = VALUES(rink),
         konta = VALUES(konta),
         tanunee = VALUES(tanunee),
         source = VALUES(source),
         updated_at = CURRENT_TIMESTAMP`,
      [
        h,
        input.displayName && input.displayName.length > 0 ? input.displayName.slice(0, 200) : null,
        input.avatarUrl && input.avatarUrl.length > 0 ? input.avatarUrl.slice(0, 500) : null,
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

function normalizeQueryPrefix(query: string | undefined): string | null {
  const q = (query ?? "").trim().replace(/^@+/, "");
  if (!q) return null;
  return q.slice(0, 100);
}

function normalizeSinceDate(since: string | undefined): string | null {
  const s = (since ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

export async function listYukkuriExplainedArchive(
  options: ListYukkuriExplainedArchiveOptions = {}
): Promise<YukkuriExplainedArchiveRow[]> {
  const cap = Math.min(2000, Math.max(1, options.limit ?? 500));
  const offset = Math.max(0, options.offset ?? 0);
  const queryPrefix = normalizeQueryPrefix(options.query);
  const sinceDate = normalizeSinceDate(options.since);
  const where: string[] = [];
  const params: Array<string | number> = [];
  if (queryPrefix) {
    where.push("(x_handle LIKE ? OR display_name LIKE ?)");
    params.push(`${queryPrefix.toLowerCase()}%`, `${queryPrefix}%`);
  }
  if (sinceDate) {
    where.push("updated_at >= ?");
    params.push(`${sinceDate} 00:00:00`);
  }
  try {
    // CODEX-NEXT.md §2: users.twitter_handle との LEFT JOIN で
    // - is_surechigai_member: users 行があれば true（すれ違いライト参加フラグ）
    // - home_prefecture: 本人が公開レベル 2 のときだけ返す（それ以外は NULL）
    // 現状 users.twitter_handle がアプリ側で populate されていないので JOIN 結果は常に NULL、
    // is_surechigai_member は常に false。X 連携が入れば自動的に true に切り替わる。
    const [rows] = await pool.query(
      `SELECT y.x_handle, y.display_name, y.avatar_url, y.rink, y.konta, y.tanunee, y.source,
              DATE_FORMAT(y.first_explained_at, '%Y-%m-%d %H:%i:%s') AS first_explained_at,
              DATE_FORMAT(y.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,
              (u.id IS NOT NULL) AS is_surechigai_member,
              CASE WHEN u.location_visibility >= 2 THEN u.home_prefecture ELSE NULL END AS home_prefecture
       FROM yukkuri_explained y
       LEFT JOIN users u
         ON LOWER(u.twitter_handle) = y.x_handle
        AND u.is_deleted = FALSE
       ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY y.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, cap, offset]
    );
    return normalizeArchiveRows(rows);
  } catch {
    return [];
  }
}

/**
 * MySQL の `(u.id IS NOT NULL)` は 1/0 の数値で返ってくるため boolean に寄せる。
 * home_prefecture は CASE の結果で NULL or string なのでそのまま通す。
 * CODEX-NEXT.md §2 の後方互換: フィールドが欠けている呼び出し側（旧テスト等）に配慮して
 * undefined にはしない（必ず boolean / string | null のいずれかを入れる）。
 */
function normalizeArchiveRows(rows: unknown): YukkuriExplainedArchiveRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((raw) => {
    const r = raw as Record<string, unknown>;
    const member =
      typeof r.is_surechigai_member === "number"
        ? r.is_surechigai_member !== 0
        : Boolean(r.is_surechigai_member);
    const pref =
      typeof r.home_prefecture === "string" && r.home_prefecture.length > 0
        ? r.home_prefecture
        : null;
    return {
      x_handle: String(r.x_handle ?? ""),
      display_name: (r.display_name as string | null) ?? null,
      avatar_url: (r.avatar_url as string | null) ?? null,
      rink: String(r.rink ?? ""),
      konta: String(r.konta ?? ""),
      tanunee: String(r.tanunee ?? ""),
      source: (r.source as string | null) ?? null,
      first_explained_at: String(r.first_explained_at ?? ""),
      updated_at: String(r.updated_at ?? ""),
      is_surechigai_member: member,
      home_prefecture: pref,
    };
  });
}

export async function listYukkuriExplainedArchiveSitemapRows(input: {
  limit: number;
  offset: number;
}): Promise<Array<{ x_handle: string; updated_at: string }>> {
  const cap = Math.min(1000, Math.max(1, input.limit));
  const offset = Math.max(0, input.offset);
  try {
    const [rows] = await pool.query<SitemapRow[]>(
      `SELECT x_handle,
              DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
       FROM yukkuri_explained
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      [cap, offset]
    );
    return rows.map((r) => ({ x_handle: r.x_handle, updated_at: r.updated_at }));
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
    // §2 と同じ LEFT JOIN を個別取得にも適用（詳細ページでも badge を出せるように）。
    const [rows] = await pool.query(
      `SELECT y.x_handle, y.display_name, y.avatar_url, y.rink, y.konta, y.tanunee, y.source,
              DATE_FORMAT(y.first_explained_at, '%Y-%m-%d %H:%i:%s') AS first_explained_at,
              DATE_FORMAT(y.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,
              (u.id IS NOT NULL) AS is_surechigai_member,
              CASE WHEN u.location_visibility >= 2 THEN u.home_prefecture ELSE NULL END AS home_prefecture
       FROM yukkuri_explained y
       LEFT JOIN users u
         ON LOWER(u.twitter_handle) = y.x_handle
        AND u.is_deleted = FALSE
       WHERE y.x_handle = ?
       LIMIT 1`,
      [h]
    );
    const list = normalizeArchiveRows(rows);
    return list[0] ?? null;
  } catch {
    return null;
  }
}
