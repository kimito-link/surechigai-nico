"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getUuidToken } from "@/lib/clientAuth";
import styles from "./chokaigi.module.css";

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
  publicMode: boolean;
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
const AUTO_REFRESH_MS = 15000;

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

  return { ...user, leftPct, topPct };
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

export function VenueLiveMap() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<LiveMapPayload | null>(null);

  const fetchLiveMap = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    setError(null);

    try {
      const uuid = getUuidToken();
      const headers = uuid ? { Authorization: `Bearer uuid:${uuid}` } : undefined;
      const res = await fetch("/api/chokaigi/live-map", {
        headers,
      });

      if (!res.ok) {
        throw new Error("ライブマップの取得に失敗しました");
      }

      const data = (await res.json()) as LiveMapPayload;
      setPayload(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ライブマップ取得エラー");
    } finally {
      if (manual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveMap();
    const timer = setInterval(() => {
      fetchLiveMap();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchLiveMap]);

  const venue = payload?.venue ?? FALLBACK_VENUE;
  const points = useMemo(
    () =>
      (payload?.users ?? [])
        .map((user) => toMapPoint(user, venue, MAP_ZOOM))
        .filter((value): value is MapPoint => value !== null),
    [payload?.users, venue]
  );

  const userList = payload?.users ?? [];

  return (
    <div className={styles.venueLiveWrap}>
      <div className={styles.venueLiveHead}>
        <div>
          <h3 className={styles.mapSubheading}>会場ライブマップ（β）</h3>
          <p className={styles.mapFinePrint}>{payload?.note ?? "現在地送信済みユーザーのみ表示します。"}</p>
        </div>
        <button
          type="button"
          className={styles.venueLiveRefreshBtn}
          onClick={() => fetchLiveMap(true)}
          disabled={isRefreshing}
        >
          {isRefreshing ? "更新中..." : "更新"}
        </button>
      </div>

      {payload?.publicMode && (
        <p className={styles.venueLiveHint}>
          公開モードです（匿名ピン表示）。自分のピンを判別したい場合は <a href="/sign-in">ログイン</a> してください。
        </p>
      )}
      {error && <p className={styles.venueLiveError}>{error}</p>}

      <div className={styles.venueLiveMapFrame} aria-label="幕張メッセ周辺のライブマップ">
        <img
          src={buildMapImageUrl(venue)}
          alt={`${venue.name}周辺の地図`}
          className={styles.venueLiveMapImage}
          loading="lazy"
        />

        <div className={styles.venueLiveVenuePin}>
          <span className={styles.venueLiveVenueDot} />
          <span className={styles.venueLiveVenueLabel}>会場</span>
        </div>

        {points.map((point) => (
          <div
            key={`${point.id}-${point.updatedAtMs}`}
            className={`${styles.venueLivePin} ${point.isMe ? styles.venueLivePinMe : ""}`}
            style={{ left: `${point.leftPct}%`, top: `${point.topPct}%` }}
            title={`${point.nickname}${point.twitterHandle ? ` (${point.twitterHandle})` : ""} · ${formatAgo(point.updatedAtMs)}`}
            aria-label={`${point.nickname} ${formatAgo(point.updatedAtMs)}`}
          >
            <span className={styles.venueLivePinDot} />
            {point.isMe && <span className={styles.venueLivePinLabel}>あなた</span>}
          </div>
        ))}
      </div>

      <div className={styles.venueLiveSummaryRow}>
        <span>{points.length}人を表示中</span>
        {payload?.generatedAtMs && <span>最終更新: {formatAgo(payload.generatedAtMs)}</span>}
      </div>

      {userList.length > 0 ? (
        <ul className={styles.venueLiveList}>
          {userList.slice(0, 12).map((user) => (
            <li key={`${user.id}-${user.updatedAtMs}`} className={styles.venueLiveListItem}>
              <span className={styles.venueLiveListName}>
                {user.isMe ? "あなた" : user.nickname}
              </span>
              <span className={styles.venueLiveListArea}>
                {user.municipality ?? "幕張周辺"}
              </span>
              <span className={styles.venueLiveListTime}>{formatAgo(user.updatedAtMs)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.venueLiveEmpty}>会場付近のデータはまだありません。</p>
      )}
    </div>
  );
}
