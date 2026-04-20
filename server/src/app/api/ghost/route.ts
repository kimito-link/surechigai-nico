import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { MUNICIPALITIES, getRandomMunicipality } from "@/lib/municipalities";
import type { RowDataPacket } from "mysql2";

// 分身情報取得
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ghost_prefecture, ghost_municipality, ghost_area_name, ghost_placed_at, ghost_hitokoto FROM users WHERE id = ?`,
    [authResult.id]
  );

  const user = rows[0];
  if (!user || !user.ghost_municipality) {
    // おさんぽ中ではないが、次回配置可能時間を返す
    const placedAt = user?.ghost_placed_at;
    const canPlaceAfter = placedAt
      ? new Date(new Date(placedAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    // リアルユーザーがいる都道府県一覧を返す(おさんぽ分身がいる町は除外)
    const [activeRows] = await pool.execute<RowDataPacket[]>(`
      SELECT DISTINCT l.municipality
      FROM locations l
      WHERE l.municipality IS NOT NULL
        AND l.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND l.user_id != ?
        AND l.municipality NOT IN (
          SELECT ghost_municipality FROM users
          WHERE ghost_municipality IS NOT NULL AND id != ?
        )
    `, [authResult.id, authResult.id]);

    // 市区町村 → 都道府県の逆引き
    const activePrefectures = new Set<string>();
    const muniSet = new Set(activeRows.map((r) => r.municipality as string));
    for (const [pref, munis] of Object.entries(MUNICIPALITIES)) {
      if (munis.some((m) => muniSet.has(m))) {
        activePrefectures.add(pref);
      }
    }

    return Response.json({
      ghost: null,
      canPlaceAfter,
      activePrefectures: [...activePrefectures],
    });
  }

  return Response.json({
    ghost: {
      prefecture: user.ghost_prefecture,
      municipality: user.ghost_municipality,
      area_name: user.ghost_area_name,
      placed_at: user.ghost_placed_at,
      hitokoto: user.ghost_hitokoto || null,
    },
    canPlaceAfter: null,
    activePrefectures: null,
  });
}

// 分身配置/移動
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { prefecture, ghost_hitokoto } = await req.json();
  const hitokoto = typeof ghost_hitokoto === "string" ? ghost_hitokoto.trim().slice(0, 100) || null : null;

  if (!prefecture || !MUNICIPALITIES[prefecture]) {
    return Response.json(
      { error: "有効な都道府県名を指定してください", prefectures: Object.keys(MUNICIPALITIES) },
      { status: 400 }
    );
  }

  // クールダウンチェック
  // 24時間経過で自然帰還 → すぐ次を選べる
  // 早めに帰った場合 → 元の24時間が経つまでクールダウン
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ghost_municipality, ghost_placed_at FROM users WHERE id = ?`,
    [authResult.id]
  );
  const lastPlaced = rows[0]?.ghost_placed_at;
  const isActive = rows[0]?.ghost_municipality != null;
  if (lastPlaced && !isActive) {
    // 早めに帰った場合: placed_atから24時間経つまで待つ
    const diff = Date.now() - new Date(lastPlaced).getTime();
    if (diff < 24 * 60 * 60 * 1000) {
      const remainHours = Math.ceil((24 * 60 * 60 * 1000 - diff) / (60 * 60 * 1000));
      return Response.json(
        { error: `次のおさんぽまであと${remainHours}時間です` },
        { status: 429 }
      );
    }
  }

  // 都道府県内でリアルユーザー(おさんぽ分身ではない)がいる市区町村から選択
  const prefMunicipalities = MUNICIPALITIES[prefecture];
  const placeholders = prefMunicipalities.map(() => "?").join(",");
  const [activeMunis] = await pool.execute<RowDataPacket[]>(
    `SELECT DISTINCT l.municipality
     FROM locations l
     WHERE l.municipality IN (${placeholders})
       AND l.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       AND l.user_id != ?
       AND l.municipality NOT IN (
         SELECT ghost_municipality FROM users
         WHERE ghost_municipality IS NOT NULL AND id != ?
       )`,
    [...prefMunicipalities, authResult.id, authResult.id]
  );
  const activeList = activeMunis.map((r) => r.municipality as string);

  if (activeList.length === 0) {
    return Response.json(
      { error: `${prefecture}には現在すれちがえる人がいません` },
      { status: 400 }
    );
  }

  const municipality = activeList[Math.floor(Math.random() * activeList.length)];
  const areaName = `${prefecture} ${municipality}`;

  await pool.execute(
    `UPDATE users SET ghost_lat = NULL, ghost_lng = NULL, ghost_area_name = ?, ghost_prefecture = ?, ghost_municipality = ?, ghost_placed_at = NOW(), ghost_hitokoto = ? WHERE id = ?`,
    [areaName, prefecture, municipality, hitokoto, authResult.id]
  );

  return Response.json({
    ok: true,
    ghost: { prefecture, municipality, area_name: areaName, hitokoto },
  });
}

// 分身撤去
export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const url = new URL(req.url);
  const expired = url.searchParams.get("expired") === "1";

  if (expired) {
    // 24時間経過の自然帰還: placed_atもクリア → すぐ次を選べる
    await pool.execute(
      `UPDATE users SET ghost_lat = NULL, ghost_lng = NULL, ghost_area_name = NULL, ghost_prefecture = NULL, ghost_municipality = NULL, ghost_placed_at = NULL, ghost_hitokoto = NULL WHERE id = ?`,
      [authResult.id]
    );
  } else {
    // 早めに帰る: placed_atは残す → クールダウン発生
    await pool.execute(
      `UPDATE users SET ghost_lat = NULL, ghost_lng = NULL, ghost_area_name = NULL, ghost_prefecture = NULL, ghost_municipality = NULL, ghost_hitokoto = NULL WHERE id = ?`,
      [authResult.id]
    );
  }

  return Response.json({ ok: true });
}
