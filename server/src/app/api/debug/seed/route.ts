import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ResultSetHeader } from "mysql2";

const AGE_GROUPS = ["10s", "20s", "20s", "30s", "30s", "40s"] as const;
const GENDERS = ["male", "female", "female", "other"] as const;

const DUMMY_USERS = [
  { nickname: "さくら", hitokoto: "桜がきれいだった", track: "Lemon", artist: "米津玄師", gender: "female", age: "20s" },
  { nickname: "たける", hitokoto: "今日も残業つらい", track: "Pretender", artist: "Official髭男dism", gender: "male", age: "30s" },
  { nickname: "みさき", hitokoto: "カフェでまったり中", track: null, artist: null, gender: "female", age: "20s" },
  { nickname: "ゆうた", hitokoto: null, track: "夜に駆ける", artist: "YOASOBI", gender: "male", age: "10s" },
  { nickname: "あおい", hitokoto: "散歩中 天気がいい", track: "ドライフラワー", artist: "優里", gender: "female", age: "30s" },
];

const LOCATIONS_NEARBY = [
  { lat: 35.6815, lng: 139.7670 }, // 東京駅付近 (~30m)
  { lat: 35.6820, lng: 139.7680 }, // 東京駅東側 (~100m)
  { lat: 35.6805, lng: 139.7660 }, // 東京駅西側 (~100m)
  { lat: 35.6830, lng: 139.7690 }, // 大手町方面 (~200m)
  { lat: 35.6800, lng: 139.7650 }, // 丸の内方面 (~200m)
];

// 東京駅(35.6812, 139.7671)からの各ティア距離に合わせた位置
const LOCATIONS_FAR = [
  { lat: 35.6900, lng: 139.7750 }, // ~1.2km ティア2(ご近所 500m-3km)
  { lat: 35.6950, lng: 139.7800 }, // ~2km ティア2
  { lat: 35.7100, lng: 139.8100 }, // ~5km ティア3(同じ街 3km-10km)
  { lat: 35.7300, lng: 139.8400 }, // ~9km ティア3
  { lat: 35.4500, lng: 139.6300 }, // ~28km ティア4(同じ地域 10km-50km) 横浜付近
];

// 開発環境のみ有効
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "本番環境では使用できません" }, { status: 403 });
  }

  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  try {
    const far = req.nextUrl.searchParams.get("far") === "1";
    const locations = far ? LOCATIONS_FAR : LOCATIONS_NEARBY;
    const createdUsers: number[] = [];

    for (const user of DUMMY_USERS) {
      const uuid = `debug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO users (uuid, nickname, hitokoto, hitokoto_set_at, spotify_track_name, spotify_artist_name, age_group, gender, show_age_group, show_gender)
         VALUES (?, ?, ?, ${user.hitokoto ? "NOW()" : "NULL"}, ?, ?, ?, ?, TRUE, TRUE)`,
        [uuid, user.nickname, user.hitokoto, user.track, user.artist, user.age, user.gender]
      );
      createdUsers.push(result.insertId);
    }

    // ダミーバッジをランダムに付与
    const DUMMY_BADGES = [
      "milestone_10", "milestone_50", "rare_weekend", "rare_music",
      "rare_ghost", "rare_night_owl", "rare_early_bird", "rare_pref_10",
    ];
    for (const userId of createdUsers) {
      const count = 1 + Math.floor(Math.random() * 4); // 1〜4個
      const shuffled = [...DUMMY_BADGES].sort(() => Math.random() - 0.5);
      for (const badgeId of shuffled.slice(0, count)) {
        await pool.execute(
          `INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)`,
          [userId, badgeId]
        );
      }
    }

    const now = new Date();

    // 自分のlocationsも投入（基準点: 東京駅付近）
    const myLoc = { lat: 35.6812, lng: 139.7671 };
    const latGrid = Math.floor(myLoc.lat / 0.0045) * 0.0045;
    const lngGrid = Math.floor(myLoc.lng / 0.0055) * 0.0055;
    await pool.execute(
      `INSERT INTO locations (user_id, point, lat_grid, lng_grid, created_at)
       VALUES (?, ST_SRID(POINT(?, ?), 4326), ?, ?, ?)`,
      [authResult.id, myLoc.lng, myLoc.lat, latGrid, lngGrid, now]
    );

    for (let i = 0; i < createdUsers.length; i++) {
      const loc = locations[i % locations.length];
      const minutesAgo = (i + 1) * 5;
      const locTime = new Date(now.getTime() - minutesAgo * 60 * 1000);
      const locLatGrid = Math.floor(loc.lat / 0.0045) * 0.0045;
      const locLngGrid = Math.floor(loc.lng / 0.0055) * 0.0055;

      // locationsテーブルに投入（matcherで検出させる）
      await pool.execute(
        `INSERT INTO locations (user_id, point, lat_grid, lng_grid, created_at)
         VALUES (?, ST_SRID(POINT(?, ?), 4326), ?, ?, ?)`,
        [createdUsers[i], loc.lng, loc.lat, locLatGrid, locLngGrid, locTime]
      );
    }

    return Response.json({
      ok: true,
      message: `${createdUsers.length}人のダミーユーザーと位置データを生成しました（マッチング実行で検出されます）`,
      userIds: createdUsers,
    });
  } catch (error) {
    console.error("テストデータ生成エラー:", error);
    return Response.json({ error: "テストデータ生成に失敗しました" }, { status: 500 });
  }
}
