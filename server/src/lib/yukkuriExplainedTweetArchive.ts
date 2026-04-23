import "server-only";

import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

/**
 * 「ツイート URL 単位」のゆっくり解説アーカイブ。
 *
 * 既存 `yukkuri_explained`（ハンドル単位）とは別テーブル。
 * 同じハンドルでも複数ツイートを解説する想定なので PK は `tweet_id`。
 *
 * ⚠️ テーブル作成は Codex 担当領域（MEMORY.md 参照）。
 *    このモジュールは DB が未作成の環境でも握りつぶして動作するように
 *    すべての DB 操作を try/catch でラップしている（既存 archive と同じ方針）。
 *
 * Codex 向けの CREATE TABLE 仕様は `server/TWEET_EXPLAIN_HANDOFF.md` を参照。
 */

export type YukkuriExplainedTweetRow = {
  tweet_id: string;
  x_handle: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  tweet_text: string;
  tweeted_at: string | null;
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

function normalizeTweetId(tweetId: string): string {
  return tweetId.replace(/\D/g, "").slice(0, 32);
}

/**
 * ツイート解説を UPSERT する。
 * 同じ tweet_id を再解説したら本文・updated_at が上書きされる。
 * DB が未作成環境では警告ログのみ残して握りつぶす。
 */
export async function upsertYukkuriExplainedTweet(input: {
  tweetId: string;
  xHandle: string;
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
  tweetText: string;
  tweetedAt?: string | null; // ISO8601
  rink: string;
  konta: string;
  tanunee: string;
  source?: string | null;
}): Promise<void> {
  const t = normalizeTweetId(input.tweetId);
  const h = normalizeHandle(input.xHandle);
  if (!t || !h) return;
  try {
    await pool.execute(
      `INSERT INTO yukkuri_explained_tweet
         (tweet_id, x_handle, author_display_name, author_avatar_url,
          tweet_text, tweeted_at, rink, konta, tanunee, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         x_handle = VALUES(x_handle),
         author_display_name = COALESCE(VALUES(author_display_name), author_display_name),
         author_avatar_url = COALESCE(VALUES(author_avatar_url), author_avatar_url),
         tweet_text = VALUES(tweet_text),
         tweeted_at = COALESCE(VALUES(tweeted_at), tweeted_at),
         rink = VALUES(rink),
         konta = VALUES(konta),
         tanunee = VALUES(tanunee),
         source = VALUES(source),
         updated_at = CURRENT_TIMESTAMP`,
      [
        t,
        h,
        input.authorDisplayName && input.authorDisplayName.length > 0
          ? input.authorDisplayName.slice(0, 200)
          : null,
        input.authorAvatarUrl && input.authorAvatarUrl.length > 0
          ? input.authorAvatarUrl.slice(0, 500)
          : null,
        input.tweetText.slice(0, 4000),
        input.tweetedAt ?? null,
        input.rink,
        input.konta,
        input.tanunee,
        input.source && input.source.length > 0 ? input.source.slice(0, 64) : null,
      ]
    );
  } catch (e) {
    console.warn(
      "[yukkuri_explained_tweet] upsert failed (table may not exist yet)",
      (e as Error).message
    );
  }
}

export async function getYukkuriExplainedTweet(
  tweetId: string
): Promise<YukkuriExplainedTweetRow | null> {
  const t = normalizeTweetId(tweetId);
  if (!t) return null;
  try {
    const [rows] = await pool.query(
      `SELECT tweet_id, x_handle, author_display_name, author_avatar_url,
              tweet_text,
              DATE_FORMAT(tweeted_at, '%Y-%m-%d %H:%i:%s') AS tweeted_at,
              rink, konta, tanunee, source,
              DATE_FORMAT(first_explained_at, '%Y-%m-%d %H:%i:%s') AS first_explained_at,
              DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
       FROM yukkuri_explained_tweet
       WHERE tweet_id = ?
       LIMIT 1`,
      [t]
    );
    const list = rows as YukkuriExplainedTweetRow[];
    return list[0] ?? null;
  } catch {
    return null;
  }
}

export async function countYukkuriExplainedTweet(): Promise<number> {
  try {
    const [rows] = await pool.query<CountRow[]>(
      `SELECT COUNT(*) AS cnt FROM yukkuri_explained_tweet`
    );
    return rows.length > 0 ? Number(rows[0].cnt) : 0;
  } catch {
    return 0;
  }
}

export async function listYukkuriExplainedTweetByHandle(
  handle: string,
  limit = 20
): Promise<YukkuriExplainedTweetRow[]> {
  const h = normalizeHandle(handle);
  if (!h) return [];
  const cap = Math.min(100, Math.max(1, limit));
  try {
    const [rows] = await pool.query(
      `SELECT tweet_id, x_handle, author_display_name, author_avatar_url,
              tweet_text,
              DATE_FORMAT(tweeted_at, '%Y-%m-%d %H:%i:%s') AS tweeted_at,
              rink, konta, tanunee, source,
              DATE_FORMAT(first_explained_at, '%Y-%m-%d %H:%i:%s') AS first_explained_at,
              DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
       FROM yukkuri_explained_tweet
       WHERE x_handle = ?
       ORDER BY updated_at DESC
       LIMIT ?`,
      [h, cap]
    );
    return rows as YukkuriExplainedTweetRow[];
  } catch {
    return [];
  }
}
