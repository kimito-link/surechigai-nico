"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getUuidToken } from "@/lib/clientAuth";
import styles from "../app.module.css";

type LiveMapUser = {
  id: number;
  nickname: string;
  twitterHandle: string | null;
  lat: number;
  lng: number;
  municipality: string | null;
  updatedAtMs: number;
  isMe: boolean;
};

type LiveMapPayload = {
  venue: {
    name: string;
    lat: number;
    lng: number;
  };
  radiusMeters: number;
  note: string;
  users: LiveMapUser[];
  generatedAtMs: number;
};

type MapPoint = LiveMapUser & {
  leftPct: number;
  topPct: number;
};

const MAP_WIDTH = 640;
const MAP_HEIGHT = 420;
const MAP_ZOOM = 15;

const FALLBACK_VENUE = {
  name: "幕張メッセ（ニコニコ超会議）",
  lat: 35.64831,
  lng: 140.03459,
};

function toWorldPixel(lat: number, lng: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function toMapPoint(
  user: LiveMapUser,
  venue: { lat: number; lng: number },
  zoom: number
): MapPoint | null {
  const venuePixel = toWorldPixel(venue.lat, venue.lng, zoom);
  const userPixel = toWorldPixel(user.lat, user.lng, zoom);

  const px = MAP_WIDTH / 2 + (userPixel.x - venuePixel.x);
  const py = MAP_HEIGHT / 2 + (userPixel.y - venuePixel.y);

  if (px < -24 || px > MAP_WIDTH + 24 || py < -24 || py > MAP_HEIGHT + 24) {
    return null;
  }

  const jitterX = user.isMe ? 0 : ((user.id * 13) % 5) - 2;
  const jitterY = user.isMe ? 0 : ((user.id * 7) % 5) - 2;

  const leftPct = ((px + jitterX) / MAP_WIDTH) * 100;
  const topPct = ((py + jitterY) / MAP_HEIGHT) * 100;

  return {
    ...user,
    leftPct,
    topPct,
  };
}

function formatAgo(updatedAtMs: number) {
  const diffSec = Math.max(0, Math.floor((Date.now() - updatedAtMs) / 1000));
  if (diffSec < 20) return "たった今";
  if (diffSec < 60) return `${diffSec}秒前`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分前`;
  return `${Math.floor(diffSec / 3600)}時間前`;
}

function buildMapImageUrl(venue: { lat: number; lng: number }) {
  const center = `${venue.lat},${venue.lng}`;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${center}&zoom=${MAP_ZOOM}&size=${MAP_WIDTH}x${MAP_HEIGHT}&maptype=mapnik`;
}

export default function LocationButton() {
  const [isSending, setIsSending] = useState(false);
  const [isRefreshingMap, setIsRefreshingMap] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mapPayload, setMapPayload] = useState<LiveMapPayload | null>(null);

  const fetchLiveMap = useCallback(async (manual = false) => {
    if (manual) {
      setIsRefreshingMap(true);
    }

    try {
      const uuid = getUuidToken();
      const headers: Record<string, string> = {};
      if (uuid) {
        headers["Authorization"] = `Bearer uuid:${uuid}`;
      }

      const res = await fetch("/api/chokaigi/live-map", { headers });

      if (!res.ok) {
        throw new Error("ライブマップの取得に失敗しました");
      }

      const data = (await res.json()) as LiveMapPayload;
      setMapPayload(data);
    } catch (error) {
      if (manual) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "ライブマップ取得エラー",
        });
      }
    } finally {
      if (manual) {
        setIsRefreshingMap(false);
      }
    }
  }, []);

  const handleLocationSubmit = async () => {
    setIsSending(true);
    setMessage(null);

    try {
      const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          reject,
          { timeout: 10000 }
        );
      });

      const uuid = getUuidToken();
      if (!uuid) {
        throw new Error("認証トークンが見つかりません");
      }

      const res = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer uuid:${uuid}`,
        },
        body: JSON.stringify({
          lat: position.latitude,
          lng: position.longitude,
        }),
      });

      if (!res.ok) {
        throw new Error("位置情報の送信に失敗しました");
      }

      setMessage({ type: "success", text: "位置情報を送信しました（500mグリッドで共有）" });
      await fetchLiveMap();
    } catch (error) {
      const errorMsg =
        error instanceof GeolocationPositionError
          ? "位置情報の許可が必要です"
          : error instanceof Error
            ? error.message
            : "位置情報送信エラー";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setIsSending(false);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  useEffect(() => {
    fetchLiveMap();
    const timer = setInterval(() => {
      fetchLiveMap();
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchLiveMap]);

  const venue = mapPayload?.venue ?? FALLBACK_VENUE;
  const points = useMemo(
    () =>
      (mapPayload?.users ?? [])
        .map((user) => toMapPoint(user, venue, MAP_ZOOM))
        .filter((value): value is MapPoint => value !== null),
    [mapPayload?.users, venue]
  );

  const listUsers = mapPayload?.users ?? [];

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>位置情報</h3>
      <p className={styles.cardDescription}>
        会場内での正確なマッチングのために位置情報を送信してください
      </p>

      <div className={styles.mapActionRow}>
        <button
          onClick={handleLocationSubmit}
          disabled={isSending}
          className={styles.button}
        >
          {isSending ? "送信中..." : "現在地を送信"}
        </button>
        <button
          onClick={() => fetchLiveMap(true)}
          disabled={isRefreshingMap}
          className={styles.mapRefreshButton}
        >
          {isRefreshingMap ? "更新中..." : "地図を更新"}
        </button>
      </div>

      {message && (
        <p className={message.type === "success" ? styles.successMessage : styles.errorMessage}>
          {message.text}
        </p>
      )}

      <div className={styles.liveMapWrap}>
        <div className={styles.liveMapHeaderRow}>
          <h4 className={styles.liveMapTitle}>超会議ライブマップ（β）</h4>
          <span className={styles.liveMapMeta}>
            {mapPayload ? `${points.length}人表示` : "読み込み中"}
          </span>
        </div>

        <p className={styles.liveMapNote}>
          {mapPayload?.note ?? "会場周辺の参加者位置を表示します"}
        </p>

        <div className={styles.liveMapFrame} aria-label="超会議会場のライブマップ">
          <img
            src={buildMapImageUrl(venue)}
            alt="幕張メッセ周辺地図"
            className={styles.liveMapImage}
            loading="lazy"
          />

          <div className={styles.liveMapVenuePin}>
            <span className={styles.liveMapVenueDot} />
            <span className={styles.liveMapVenueLabel}>会場</span>
          </div>

          {points.map((point) => (
            <div
              key={`${point.id}-${point.updatedAtMs}`}
              className={`${styles.liveMapPin} ${point.isMe ? styles.liveMapPinMe : ""}`}
              style={{
                left: `${point.leftPct}%`,
                top: `${point.topPct}%`,
              }}
              title={`${point.nickname}${point.twitterHandle ? ` (${point.twitterHandle})` : ""} · ${formatAgo(point.updatedAtMs)}`}
              aria-label={`${point.nickname} ${formatAgo(point.updatedAtMs)}`}
            >
              <span className={styles.liveMapPinDot} />
              {point.isMe && <span className={styles.liveMapPinLabel}>あなた</span>}
            </div>
          ))}
        </div>

        {listUsers.length > 0 ? (
          <ul className={styles.liveMapList}>
            {listUsers.slice(0, 12).map((user) => (
              <li key={`${user.id}-${user.updatedAtMs}`} className={styles.liveMapListItem}>
                <span className={styles.liveMapListName}>
                  {user.isMe ? "あなた" : user.nickname}
                </span>
                <span className={styles.liveMapListArea}>
                  {user.municipality ?? "幕張周辺"}
                </span>
                <span className={styles.liveMapListTime}>{formatAgo(user.updatedAtMs)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.liveMapEmpty}>まだ会場付近の参加者データがありません</p>
        )}
      </div>
    </div>
  );
}
