import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { mapDbErrorToUserMessage } from "@/lib/mapDbError";
import { reverseGeocodeToMunicipality } from "@/lib/geocoding";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

const MUNICIPALITY_MAX = 50;

// 500mグリッドに丸める
function toGrid(lat: number, lng: number) {
  const LAT_GRID = 0.0045; // 約500m（緯度方向）
  const LNG_GRID = 0.0055; // 約500m（経度方向 / 日本の緯度35度付近）
  return {
    latGrid: Math.floor(lat / LAT_GRID) * LAT_GRID,
    lngGrid: Math.floor(lng / LNG_GRID) * LNG_GRID,
  };
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "JSON の形式が不正です" },
        { status: 400 }
      );
    }
    const { lat, lng } = body as { lat?: unknown; lng?: unknown };

    if (typeof lat !== "number" || typeof lng !== "number") {
      return Response.json(
        { error: "lat, lng は数値で指定してください" },
        { status: 400 }
      );
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return Response.json(
        { error: "緯度経度の範囲が不正です" },
        { status: 400 }
      );
    }

    // 位置情報一時停止チェック
    const [userRows] = await pool.execute<RowDataPacket[]>(
      "SELECT location_paused_until FROM users WHERE id = ?",
      [authResult.id]
    );
    if (userRows.length > 0 && userRows[0].location_paused_until) {
      const pausedUntil = new Date(userRows[0].location_paused_until);
      if (pausedUntil > new Date()) {
        console.log(`[位置送信] user_id=${authResult.id}: 一時停止中 (until: ${pausedUntil.toISOString()})`);
        return Response.json({ ok: true, paused: true });
      }
      // 一時停止期間が過ぎたらクリア
      await pool.execute(
        "UPDATE users SET location_paused_until = NULL WHERE id = ?",
        [authResult.id]
      );
    }

    const { latGrid, lngGrid } = toGrid(lat, lng);

    // 市区町村を逆ジオコーディングで取得(失敗してもエラーにはしない)
    const rawMunicipality = await reverseGeocodeToMunicipality(lat, lng).catch(
      () => null
    );
    const municipality =
      rawMunicipality != null && String(rawMunicipality).trim() !== ""
        ? String(rawMunicipality).trim().slice(0, MUNICIPALITY_MAX)
        : null;

    // WKT: MySQL 8.0 + SRID 4326 は軸順序が POINT(緯度 経度) = POINT(lat lng)
    const pointWkt = `POINT(${Number(lat)} ${Number(lng)})`;
    await pool.execute(
      `INSERT INTO locations (user_id, point, lat_grid, lng_grid, municipality)
       VALUES (?, ST_GeomFromText(?, 4326), ?, ?, ?)`,
      [authResult.id, pointWkt, latGrid, lngGrid, municipality]
    );

    console.log(`[位置送信成功] user_id=${authResult.id}, lat=${lat}, lng=${lng}, grid=(${latGrid},${lngGrid}), municipality=${municipality}`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("位置情報保存エラー:", error);
    if (error instanceof SyntaxError) {
      return Response.json({ error: "JSON の形式が不正です" }, { status: 400 });
    }
    return Response.json(
      { error: mapDbErrorToUserMessage(error) },
      { status: 500 }
    );
  }
}
