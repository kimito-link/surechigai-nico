import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import {
  PREFECTURES,
  classifyLocationToPrefecture,
  type PrefectureInfo,
} from "@/lib/prefectureCoords";

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
  municipality: string | null;
  lat_grid: string | number | null;
  lng_grid: string | number | null;
  last_active_at: Date | null;
};

type PrefCreatorRow = RowDataPacket & {
  user_id: number;
  twitter_handle: string | null;
  nickname: string | null;
  avatar_url: string | null;
  last_active_at: Date | null;
  municipality: string | null;
  lat_grid: string | number | null;
  lng_grid: string | number | null;
  created_at: Date | null;
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
    // twitter_handle 未設定の参加者も、逆ジオが未完了で municipality=NULL の行も含める。
    // NULL の場合は lat_grid/lng_grid から最寄り都道府県にフォールバック（分類ミスは許容）。
    const [rows] = await pool.execute<PairRow[]>(
      `SELECT DISTINCT
         l.user_id,
         l.municipality,
         l.lat_grid,
         l.lng_grid,
         u.last_active_at
       FROM locations l
       INNER JOIN users u ON u.id = l.user_id
       WHERE u.is_deleted = FALSE
         AND u.is_suspended = FALSE`
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
      const pref = classifyLocationToPrefecture(
        r.municipality,
        r.lat_grid != null ? Number(r.lat_grid) : null,
        r.lng_grid != null ? Number(r.lng_grid) : null
      );
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
    // 逆ジオ未完了 (municipality=NULL) の行も含めて取得し、JS 側で県分類する。
    // municipality が LIKE "<県>%" に一致する行のみに絞ると、NULL 行が丸ごと漏れる。
    const [rows] = await pool.execute<PrefCreatorRow[]>(
      `SELECT
         u.id AS user_id,
         u.twitter_handle,
         u.nickname,
         u.avatar_url,
         u.last_active_at,
         l.municipality,
         l.lat_grid,
         l.lng_grid,
         l.created_at
       FROM users u
       INNER JOIN locations l ON l.user_id = u.id
       WHERE u.is_deleted = FALSE
         AND u.is_suspended = FALSE
       ORDER BY u.last_active_at DESC, l.created_at DESC`
    );

    // ユーザーごとに「この県で最後に観測した時刻」と代表プロフィールを集約する。
    type Agg = {
      userId: number;
      twitterHandle: string | null;
      nickname: string;
      avatarUrl: string | null;
      lastActiveAt: Date | null;
      lastSeenInPref: number; // epoch ms, 0 なら未確定
    };
    const byUser = new Map<number, Agg>();
    for (const r of rows) {
      const pref = classifyLocationToPrefecture(
        r.municipality,
        r.lat_grid != null ? Number(r.lat_grid) : null,
        r.lng_grid != null ? Number(r.lng_grid) : null
      );
      if (!pref || pref.name !== prefectureName) continue;

      const uid = Number(r.user_id);
      const createdAtMs = r.created_at ? new Date(r.created_at).getTime() : 0;
      const existing = byUser.get(uid);
      if (existing) {
        if (createdAtMs > existing.lastSeenInPref) {
          existing.lastSeenInPref = createdAtMs;
        }
        continue;
      }
      const trimmedHandle =
        typeof r.twitter_handle === "string"
          ? r.twitter_handle.trim().replace(/^@/, "")
          : "";
      byUser.set(uid, {
        userId: uid,
        twitterHandle: trimmedHandle ? trimmedHandle : null,
        nickname: r.nickname || "匿名さん",
        avatarUrl: r.avatar_url,
        lastActiveAt: r.last_active_at,
        lastSeenInPref: createdAtMs,
      });
    }

    const now = Date.now();
    const creators: CreatorEntry[] = Array.from(byUser.values())
      .sort((a, b) => {
        const la = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const lb = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        if (lb !== la) return lb - la;
        return b.lastSeenInPref - a.lastSeenInPref;
      })
      .map((a) => {
        const lastActive = a.lastActiveAt
          ? new Date(a.lastActiveAt).getTime()
          : 0;
        const minutesSinceActive =
          lastActive > 0
            ? Math.floor((now - lastActive) / 60000)
            : Number.POSITIVE_INFINITY;
        return {
          userId: a.userId,
          twitterHandle: a.twitterHandle,
          nickname: a.nickname,
          avatarUrl: a.avatarUrl,
          lastActiveAt: a.lastActiveAt
            ? new Date(a.lastActiveAt).toISOString()
            : null,
          lastSeenInPrefAt:
            a.lastSeenInPref > 0
              ? new Date(a.lastSeenInPref).toISOString()
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
