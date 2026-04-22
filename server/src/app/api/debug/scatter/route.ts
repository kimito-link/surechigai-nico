import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { MUNICIPALITIES } from "@/lib/municipalities";
import { reverseGeocodeToMunicipality } from "@/lib/geocoding";
import { toGrid, toH3Cell } from "@/lib/locationGeom";
import type { ResultSetHeader } from "mysql2";

// 市区町村の代表座標(主要都市のみ、残りはランダムオフセット)
const MUNICIPALITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "千代田区": { lat: 35.6940, lng: 139.7536 },
  "渋谷区": { lat: 35.6640, lng: 139.6982 },
  "新宿区": { lat: 35.6938, lng: 139.7035 },
  "板橋区": { lat: 35.7512, lng: 139.7090 },
  "世田谷区": { lat: 35.6461, lng: 139.6530 },
  "品川区": { lat: 35.6092, lng: 139.7300 },
  "横浜市西区": { lat: 35.4660, lng: 139.6220 },
  "札幌市中央区": { lat: 43.0621, lng: 141.3544 },
  "大阪市北区": { lat: 34.7055, lng: 135.4983 },
  "福岡市博多区": { lat: 33.5902, lng: 130.4207 },
  "名古屋市中区": { lat: 35.1709, lng: 136.8815 },
};

// 都道府県の代表座標(市区町村の座標がない場合のフォールバック)
const PREF_COORDS: Record<string, { lat: number; lng: number }> = {
  "北海道": { lat: 43.06, lng: 141.35 }, "青森県": { lat: 40.82, lng: 140.74 },
  "岩手県": { lat: 39.70, lng: 141.15 }, "宮城県": { lat: 38.27, lng: 140.87 },
  "秋田県": { lat: 39.72, lng: 140.10 }, "山形県": { lat: 38.24, lng: 140.36 },
  "福島県": { lat: 37.75, lng: 140.47 }, "茨城県": { lat: 36.34, lng: 140.45 },
  "栃木県": { lat: 36.57, lng: 139.88 }, "群馬県": { lat: 36.39, lng: 139.06 },
  "埼玉県": { lat: 35.86, lng: 139.65 }, "千葉県": { lat: 35.60, lng: 140.12 },
  "東京都": { lat: 35.69, lng: 139.69 }, "神奈川県": { lat: 35.45, lng: 139.64 },
  "新潟県": { lat: 37.90, lng: 139.02 }, "富山県": { lat: 36.70, lng: 137.21 },
  "石川県": { lat: 36.59, lng: 136.63 }, "福井県": { lat: 36.07, lng: 136.22 },
  "山梨県": { lat: 35.66, lng: 138.57 }, "長野県": { lat: 36.23, lng: 138.18 },
  "岐阜県": { lat: 35.39, lng: 136.72 }, "静岡県": { lat: 34.98, lng: 138.38 },
  "愛知県": { lat: 35.18, lng: 136.91 }, "三重県": { lat: 34.73, lng: 136.51 },
  "滋賀県": { lat: 35.00, lng: 135.87 }, "京都府": { lat: 35.02, lng: 135.76 },
  "大阪府": { lat: 34.69, lng: 135.52 }, "兵庫県": { lat: 34.69, lng: 135.18 },
  "奈良県": { lat: 34.69, lng: 135.80 }, "和歌山県": { lat: 34.23, lng: 135.17 },
  "鳥取県": { lat: 35.50, lng: 134.24 }, "島根県": { lat: 35.47, lng: 133.05 },
  "岡山県": { lat: 34.66, lng: 133.93 }, "広島県": { lat: 34.40, lng: 132.46 },
  "山口県": { lat: 34.19, lng: 131.47 }, "徳島県": { lat: 34.07, lng: 134.56 },
  "香川県": { lat: 34.34, lng: 134.04 }, "愛媛県": { lat: 33.84, lng: 132.77 },
  "高知県": { lat: 33.56, lng: 133.53 }, "福岡県": { lat: 33.61, lng: 130.42 },
  "佐賀県": { lat: 33.25, lng: 130.30 }, "長崎県": { lat: 32.74, lng: 129.87 },
  "熊本県": { lat: 32.79, lng: 130.74 }, "大分県": { lat: 33.24, lng: 131.61 },
  "宮崎県": { lat: 31.91, lng: 131.42 }, "鹿児島県": { lat: 31.56, lng: 130.56 },
  "沖縄県": { lat: 26.21, lng: 127.68 },
};

const DUMMY_NAMES = [
  "はるか", "そうた", "ひなた", "りく", "めい",
  "こはる", "あきら", "ゆい", "れん", "さき",
  "たくみ", "みお", "かいと", "ほのか", "しょう",
  "あかり", "だいち", "なつみ", "こうき", "ももか",
];

function getMunicipalityCoords(pref: string, muni: string): { lat: number; lng: number } {
  if (MUNICIPALITY_COORDS[muni]) return MUNICIPALITY_COORDS[muni];
  const base = PREF_COORDS[pref] || { lat: 35.69, lng: 139.69 };
  return {
    lat: base.lat + (Math.random() - 0.5) * 0.1,
    lng: base.lng + (Math.random() - 0.5) * 0.1,
  };
}

// ダミーユーザーをランダムな都道府県の市区町村に配置
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "本番環境では使用できません" }, { status: 403 });
  }

  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  try {
    const url = new URL(req.url);
    const count = Math.min(Number(url.searchParams.get("count")) || 10, 50);

    const allPrefs = Object.keys(MUNICIPALITIES);
    const now = new Date();
    const results: { nickname: string; prefecture: string; municipality: string }[] = [];

    for (let i = 0; i < count; i++) {
      // ランダムな都道府県と市区町村を選択
      const pref = allPrefs[Math.floor(Math.random() * allPrefs.length)];
      const munis = MUNICIPALITIES[pref];
      const muni = munis[Math.floor(Math.random() * munis.length)];
      const coords = getMunicipalityCoords(pref, muni);

      // 少しランダムにずらす
      const lat = coords.lat + (Math.random() - 0.5) * 0.01;
      const lng = coords.lng + (Math.random() - 0.5) * 0.01;

      const nickname = DUMMY_NAMES[i % DUMMY_NAMES.length];
      const uuid = `debug-scatter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // ユーザー作成(年代・性別をランダム設定)
      const ages = ["10s", "20s", "20s", "30s", "30s", "40s", "50s_plus"];
      const genders = ["male", "female", "female", "other"];
      const age = ages[Math.floor(Math.random() * ages.length)];
      const gen = genders[Math.floor(Math.random() * genders.length)];
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO users (uuid, nickname, hitokoto, hitokoto_set_at, age_group, gender, show_age_group, show_gender) VALUES (?, ?, ?, NOW(), ?, ?, TRUE, TRUE)`,
        [uuid, nickname, `${pref}${muni}から`, age, gen]
      );
      const userId = result.insertId;

      // 位置情報を投入(municipality付き)
      // 軸順序: MySQL 8.0 SRID 4326 は (lat, lng) なので POINT(lat, lng) で統一する
      const { latGrid, lngGrid } = toGrid(lat, lng);
      const h3 = toH3Cell(lat, lng);
      const minutesAgo = Math.floor(Math.random() * 10);
      const locTime = new Date(now.getTime() - minutesAgo * 60 * 1000);

      await pool.execute(
        `INSERT INTO locations (user_id, point, lat_grid, lng_grid, h3_r8, municipality, created_at)
         VALUES (?, ST_SRID(POINT(?, ?), 4326), ?, ?, ?, ?, ?)`,
        [userId, lat, lng, latGrid, lngGrid, h3, muni, locTime]
      );

      // ダミーバッジをランダムに付与
      const badges = ["milestone_10", "milestone_50", "rare_weekend", "rare_music", "rare_ghost", "rare_night_owl", "rare_pref_10"];
      const badgeCount = 1 + Math.floor(Math.random() * 3);
      const shuffled = [...badges].sort(() => Math.random() - 0.5);
      for (const bid of shuffled.slice(0, badgeCount)) {
        await pool.execute(`INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)`, [userId, bid]);
      }

      results.push({ nickname, prefecture: pref, municipality: muni });
    }

    // 都道府県別に集計
    const prefCount = new Map<string, number>();
    for (const r of results) {
      prefCount.set(r.prefecture, (prefCount.get(r.prefecture) || 0) + 1);
    }
    const summary = [...prefCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([p, c]) => `${p}: ${c}人`)
      .join(", ");

    return Response.json({
      ok: true,
      message: `${count}人を全国にばらまきました`,
      summary,
      users: results,
    });
  } catch (error) {
    console.error("scatter エラー:", error);
    return Response.json({ error: "配置に失敗しました" }, { status: 500 });
  }
}
