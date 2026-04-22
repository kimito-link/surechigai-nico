import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { PREFECTURES, extractPrefecture, type PrefectureInfo } from "@/lib/prefectureCoords";

export const LIVE_WINDOW_MINUTES = 30;

export type CreatorEntry = {
  twitterHandle: string;
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
    const [rows] = await pool.execute<PairRow[]>(
      `SELECT DISTINCT
         l.user_id,
         l.municipality,
         u.last_active_at
       FROM locations l
       INNER JOIN users u ON u.id = l.user_id
       WHERE u.is_deleted = FALSE
         AND u.is_suspended = FALSE
         AND u.twitter_handle IS NOT NULL
         AND u.twitter_handle <> ''
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
    const [rows] = await pool.execute<CreatorRow[]>(
      `SELECT
         u.twitter_handle,
         u.nickname,
         u.avatar_url,
         u.last_active_at,
         MAX(l.created_at) AS last_seen_in_pref
       FROM users u
       INNER JOIN locations l ON l.user_id = u.id
       WHERE u.is_deleted = FALSE
         AND u.is_suspended = FALSE
         AND u.twitter_handle IS NOT NULL
         AND u.twitter_handle <> ''
         AND l.municipality LIKE ?
       GROUP BY u.id
       ORDER BY u.last_active_at DESC, last_seen_in_pref DESC`,
      [`${prefectureName}%`]
    );

    const now = Date.now();
    const creators: CreatorEntry[] = rows
      .filter((r): r is CreatorRow & { twitter_handle: string } =>
        Boolean(r.twitter_handle)
      )
      .map((r) => {
        const lastActive = r.last_active_at
          ? new Date(r.last_active_at).getTime()
          : 0;
        const minutesSinceActive =
          lastActive > 0
            ? Math.floor((now - lastActive) / 60000)
            : Number.POSITIVE_INFINITY;
        return {
          twitterHandle: r.twitter_handle,
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
