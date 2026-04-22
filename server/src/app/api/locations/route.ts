import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { mapDbErrorToUserMessage } from "@/lib/mapDbError";
import { reverseGeocodeToMunicipality } from "@/lib/geocoding";
import { toGrid, toH3Cell, assertFiniteLatLng } from "@/lib/locationGeom";
import { publishLiveMapEvent } from "@/lib/liveMapBus";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

const MUNICIPALITY_MAX = 50;

function normalizeMunicipality(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, MUNICIPALITY_MAX);
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
    const {
      lat: rawLat,
      lng: rawLng,
      accuracy,
      municipality: clientMunicipality,
    } = body as {
      lat?: unknown;
      lng?: unknown;
      accuracy?: unknown;
      municipality?: unknown;
    };

    const coords = assertFiniteLatLng(rawLat, rawLng);
    if (!coords) {
      return Response.json(
        { error: "lat, lng は有限の数値で指定してください" },
        { status: 400 }
      );
    }
    const { lat, lng } = coords;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return Response.json(
        { error: "緯度経度の範囲が不正です" },
        { status: 400 }
      );
    }
    // 極端に粗い位置情報は捨てる（> 10km は IP ベースの可能性が高く事故の元）
    if (typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy > 10_000) {
      return Response.json(
        { error: "位置精度が粗すぎるため保存をスキップしました", skipped: true },
        { status: 200 }
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
        return Response.json({ ok: true, paused: true, paused_until: pausedUntil.toISOString() });
      }
      await pool.execute(
        "UPDATE users SET location_paused_until = NULL WHERE id = ?",
        [authResult.id]
      );
    }

    const { latGrid, lngGrid } = toGrid(lat, lng);
    const h3 = toH3Cell(lat, lng);

    // 市区町村:
    //  1) クライアント（Geolonia Open Reverse Geocoder）が付けてきたらそれを優先
    //  2) なければ Nominatim を同期呼び出しせず、後で非同期に補完する
    const eagerMunicipality = normalizeMunicipality(clientMunicipality);

    // MySQL 8.0 + SRID 4326 の軸順序は (lat, lng)
    const pointWkt = `POINT(${lat} ${lng})`;
    let rawInsert: unknown;
    try {
      [rawInsert] = await pool.execute(
        `INSERT INTO locations (user_id, point, lat_grid, lng_grid, h3_r8, municipality)
         VALUES (?, ST_GeomFromText(?, 4326), ?, ?, ?, ?)`,
        [authResult.id, pointWkt, latGrid, lngGrid, h3, eagerMunicipality]
      );
    } catch (insertErr: unknown) {
      // h3_r8 カラムが未作成（MySQL 1054）の場合は省いて再試行
      if ((insertErr as { errno?: number }).errno === 1054) {
        [rawInsert] = await pool.execute(
          `INSERT INTO locations (user_id, point, lat_grid, lng_grid, municipality)
           VALUES (?, ST_GeomFromText(?, 4326), ?, ?, ?)`,
          [authResult.id, pointWkt, latGrid, lngGrid, eagerMunicipality]
        );
      } else {
        throw insertErr;
      }
    }
    const insertedId = (rawInsert as { insertId?: number }).insertId;

    // ライブマップ購読者へブロードキャスト（SSE）
    publishLiveMapEvent({
      userId: authResult.id,
      lat,
      lng,
      h3,
      ts: Date.now(),
    });

    // Nominatim 逆ジオは非同期で補完（レスポンスをブロックしない）
    if (!eagerMunicipality && insertedId) {
      void (async () => {
        try {
          const raw = await reverseGeocodeToMunicipality(lat, lng);
          const m = normalizeMunicipality(raw);
          if (m) {
            await pool.execute(
              "UPDATE locations SET municipality = ? WHERE id = ?",
              [m, insertedId]
            );
          }
        } catch (err) {
          console.warn("[逆ジオ非同期補完失敗]", err);
        }
      })();
    }

    return Response.json({ ok: true, h3, municipality: eagerMunicipality });
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
