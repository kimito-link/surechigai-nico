"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getUuidToken } from "@/lib/clientAuth";
import { useLiveMapStream } from "@/lib/useLiveMapStream";
import {
  LIVE_MAP_FALLBACK_VENUE,
  LIVE_MAP_POLL_MS,
  LIVE_MAP_ZOOM,
  liveMapBuildOsmTileImageUrl,
  liveMapBuildStaticImageUrl,
  liveMapFormatAgo,
  liveMapToMapPoint,
  type LiveMapPayload,
  type MapPoint,
} from "@/lib/liveMapShared";
import styles from "./chokaigi.module.css";

export function VenueLiveMap() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<LiveMapPayload | null>(null);
  const [staticMapImageVariant, setStaticMapImageVariant] = useState<0 | 1 | 2>(0);

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

  // Page Visibility 対応: タブが非表示の間はポーリングを止め、可視復帰時に即時フェッチ。
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const start = () => {
      if (timer !== null) return;
      timer = setInterval(() => {
        if (!cancelled) fetchLiveMap();
      }, LIVE_MAP_POLL_MS);
    };

    const handleVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible") {
        fetchLiveMap();
        start();
      } else {
        stop();
      }
    };

    fetchLiveMap();
    if (typeof document === "undefined" || document.visibilityState === "visible") {
      start();
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      cancelled = true;
      stop();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [fetchLiveMap]);

  // SSE が接続できれば push でも更新する（polling は保険として継続）。
  useLiveMapStream(() => {
    fetchLiveMap();
  });

  const venue = payload?.venue ?? LIVE_MAP_FALLBACK_VENUE;
  const points = useMemo(
    () =>
      (payload?.users ?? [])
        .map((user) => liveMapToMapPoint(user, venue, LIVE_MAP_ZOOM))
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
        {staticMapImageVariant < 2 && (
          <img
            src={
              staticMapImageVariant === 0
                ? liveMapBuildStaticImageUrl(venue)
                : liveMapBuildOsmTileImageUrl(venue.lat, venue.lng, 14)
            }
            alt={`${venue.name}周辺の地図`}
            className={styles.venueLiveMapImage}
            loading="lazy"
            onError={() =>
              setStaticMapImageVariant((v) => (v < 1 ? 1 : 2) as 0 | 1 | 2)
            }
          />
        )}
        {staticMapImageVariant === 2 && (
          <p className={styles.venueLiveError} style={{ minHeight: "12rem" }}>
            地図画像の取得に失敗しました。ピン表示は有効な場合があります。© OpenStreetMap
          </p>
        )}

        <div className={styles.venueLiveVenuePin}>
          <span className={styles.venueLiveVenueDot} />
          <span className={styles.venueLiveVenueLabel}>会場</span>
        </div>

        {points.map((point) => (
          <div
            key={`${point.id}-${point.updatedAtMs}`}
            className={`${styles.venueLivePin} ${point.isMe ? styles.venueLivePinMe : ""}`}
            style={{ left: `${point.leftPct}%`, top: `${point.topPct}%` }}
            title={`${point.nickname}${point.twitterHandle ? ` (${point.twitterHandle})` : ""} · ${liveMapFormatAgo(point.updatedAtMs)}`}
            aria-label={`${point.nickname} ${liveMapFormatAgo(point.updatedAtMs)}`}
          >
            <span className={styles.venueLivePinDot} />
            {point.isMe && <span className={styles.venueLivePinLabel}>あなた</span>}
          </div>
        ))}
      </div>

      <div className={styles.venueLiveSummaryRow}>
        <span>{points.length}人を表示中</span>
        {payload?.generatedAtMs && <span>最終更新: {liveMapFormatAgo(payload.generatedAtMs)}</span>}
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
              <span className={styles.venueLiveListTime}>{liveMapFormatAgo(user.updatedAtMs)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.venueLiveEmpty}>会場付近のデータはまだありません。</p>
      )}
    </div>
  );
}
