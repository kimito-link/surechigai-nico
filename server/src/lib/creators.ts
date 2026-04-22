import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { PREFECTURES, extractPrefecture, type PrefectureInfo } from "@/lib/prefectureCoords";

export const LIVE_WINDOW_MINUTES = 30;

export type CreatorEntry = {
  userId: number;
  twitterHandle: string | null;
  nickname: string;
  avatarUrl: string | null;
  lastActiveAt: string | null;
  lastSeenInPrefAt: string | null;
  isLive: boolean;
  minutesSinceActive: number | null;
};

export type PrefectureSummary = {
  name: string;
  region: PrefectureInfo["region"];
  count: number;
  liveCount: number;
};

export type PrefectureListResult = {
  prefectures: PrefectureSummary[];
  totalCreators: number;
  totalLive: number;
};

export type PrefectureDetailResult = {
  prefecture: string;
  total: number;
  liveCount: number;
  creators: CreatorEntry[];
};

export const VALID_PREFECTURE_NAMES = new Set(PREFECTURES.map((p) => p.name));

type PairRow = RowDataPacket & {
  user_id: number;
  municipality: string;
  last_active_at: Date | null;
};

type CreatorRow = RowDataPacket & {
  user_id: number;
  twitter_handle: string | null;
  nickname: string | null;
  avatar_url: string | null;
  last_active_at: Date | null;
  last_seen_in_pref: Date | null;
};

function buildEmptySummary(): PrefectureSummary[] {
  return PREFECTURES.map((p) => ({
    name: p.name,
    region: p.region,
    count: 0,
    liveCount: 0,
  }));
}

export async function getPrefectureSummaries(): Promise<PrefectureListResult> {
  try {
    // twitter_handle 未設定の参加者も一覧に含める（X 未連携でも都道府県に居た事実は残す）。
    const [rows] = await pool.execute<PairRow[]>(
      `SELECT DISTINCT
         l.user_id,
         l.municipality,
         u.last_active_at
       FROM locations l
       INNER JOIN users u ON u.id = l.user_id
       WHERE u.is_deleted = FALSE
         AND u.is_suspended = FALSE
         AND l.municipality IS NOT NULL`
    );

    const now = Date.now();
    const byPref = new Map<
      string,
      { users: Set<number>; live: Set<number> }
    >();
    for (const p of PREFECTURES) {
      byPref.set(p.name, { users: new Set(), live: new Set() });
    }

    for (const r of rows) {
      const pref = extractPrefecture(r.municipality);
      if (!pref) continue;
      const bucket = byPref.get(pref.name);
      if (!bucket) continue;
      bucket.users.add(r.user_id);
      if (r.last_active_at) {
        const minutes =
          (now - new Date(r.last_active_at).getTime()) / 60000;
        if (minutes < LIVE_WINDOW_MINUTES) {
          bucket.live.add(r.user_id);
        }
      }
    }

    const prefectures = PREFECTURES.map((p) => {
      const bucket = byPref.get(p.name)!;
      return {
        name: p.name,
        region: p.region,
        count: bucket.users.size,
        liveCount: bucket.live.size,
      };
    });

    return {
      prefectures,
      totalCreators: prefectures.reduce((a, p) => a + p.count, 0),
      totalLive: prefectures.reduce((a, p) => a + p.liveCount, 0),
    };
  } catch (err) {
    console.error("[getPrefectureSummaries] error", err);
    return {
      prefectures: buildEmptySummary(),
      totalCreators: 0,
      totalLive: 0,
    };
  }
}

export async function getCreatorsByPrefecture(
  prefectureName: string
): Promise<PrefectureDetailResult> {
  if (!VALID_PREFECTURE_NAMES.has(prefectureName)) {
    return {
      prefecture: prefectureName,
      total: 0,
      liveCount: 0,
      creators: [],
    };
  }

  try {
    // twitter_handle 未設定の参加者も含めて返す（X 未連携の方もニックネームで表示する）。
    const [rows] = await pool.execute<CreatorRow[]>(
      `SELECT
         u.id AS user_id,
         u.twitter_handle,
         u.nickname,
         u.avatar_url,
         u.last_active_at,
         MAX(l.created_at) AS last_seen_in_pref
       FROM users u
       INNER JOIN locations l ON l.user_id = u.id
       WHERE u.is_deleted = FALSE
         AND u.is_suspended = FALSE
         AND l.municipality LIKE ?
       GROUP BY u.id
       ORDER BY u.last_active_at DESC, last_seen_in_pref DESC`,
      [`${prefectureName}%`]
    );

    const now = Date.now();
    const creators: CreatorEntry[] = rows.map((r) => {
      const lastActive = r.last_active_at
        ? new Date(r.last_active_at).getTime()
        : 0;
      const minutesSinceActive =
        lastActive > 0
          ? Math.floor((now - lastActive) / 60000)
          : Number.POSITIVE_INFINITY;
      const trimmedHandle =
        typeof r.twitter_handle === "string"
          ? r.twitter_handle.trim().replace(/^@/, "")
          : "";
      return {
        userId: Number(r.user_id),
        twitterHandle: trimmedHandle ? trimmedHandle : null,
        nickname: r.nickname || "匿名さん",
        avatarUrl: r.avatar_url,
        lastActiveAt: r.last_active_at
          ? new Date(r.last_active_at).toISOString()
          : null,
        lastSeenInPrefAt: r.last_seen_in_pref
          ? new Date(r.last_seen_in_pref).toISOString()
          : null,
        isLive: minutesSinceActive < LIVE_WINDOW_MINUTES,
        minutesSinceActive: Number.isFinite(minutesSinceActive)
          ? minutesSinceActive
          : null,
      };
    });

    return {
      prefecture: prefectureName,
      total: creators.length,
      liveCount: creators.filter((c) => c.isLive).length,
      creators,
    };
  } catch (err) {
    console.error("[getCreatorsByPrefecture] error", err);
    return {
      prefecture: prefectureName,
      total: 0,
      liveCount: 0,
      creators: [],
    };
  }
}
