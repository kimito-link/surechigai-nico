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
    const { lat, lng } = await req.json();

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

    // WKT: POINT(経度 緯度) + ST_GeomFromText（ST_SRID(POINT) より本番の MySQL / MariaDB で安定）
    const pointWkt = `POINT(${Number(lng)} ${Number(lat)})`;
    await pool.execute(
      `INSERT INTO locations (user_id, point, lat_grid, lng_grid, municipality)
       VALUES (?, ST_GeomFromText(?, 4326), ?, ?, ?)`,
      [authResult.id, pointWkt, latGrid, lngGrid, municipality]
    );

    return Response.json({ ok: true });
  } catch (error) {
    console.error("位置情報保存エラー:", error);
    return Response.json(
      { error: mapDbErrorToUserMessage(error) },
      { status: 500 }
    );
  }
}
