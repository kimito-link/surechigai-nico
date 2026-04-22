"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getUuidToken } from "@/lib/clientAuth";
import { AiErrorShare } from "@/app/components/AiErrorShare";
import { buildAiErrorReport, maskToken } from "@/lib/aiErrorReport";
import { clientReverseGeocode } from "@/lib/clientReverseGeocode";
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
import styles from "../app.module.css";

/** 端末・ブラウザの測位（Geolocation API）失敗を人が直せる文言に */
function messageForGeolocationFailure(error: unknown): string {
  const e = error as { code?: number; message?: string };
  const code = typeof e?.code === "number" ? e.code : undefined;
  // 1 PERMISSION_DENIED / 2 POSITION_UNAVAILABLE / 3 TIMEOUT
  if (code === 1) {
    return "位置情報がオフです。アドレスバー左の鍵アイコン → サイトの設定で「位置」を許可するか、OSの設定でブラウザの位置を許可してください。";
  }
  if (code === 2) {
    return "端末が位置を返せませんでした。GPSをオンにし、屋内は窓際・屋外を試すか、PCの場合はWi‑Fi位置推定が有効か確認してください。";
  }
  if (code === 3) {
    return "位置取得が時間切れです。通信を確認し、もう一度「現在地を送信」を押してください。";
  }
  return "位置情報の取得に失敗しました。HTTPSで開いているか、別ブラウザでも試してください。";
}

async function readFetchErrorMessage(
  res: Response,
  fallback: string
): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data?.error === "string" && data.error.trim() !== "") {
      return data.error;
    }
  } catch {
    /* 本文が JSON でない場合（Clerk の HTML など） */
  }
  if (res.status === 401 || res.status === 403) {
    return "認証に失敗しました。ページを再読み込みするか、一度ログアウトして入り直してください。";
  }
  return fallback;
}

type LocationButtonProps = {
  /** 親で解決済みの UUID（localStorage と同期）。未設定時は従来どおり getUuidToken を参照 */
  authUuid?: string | null;
  authSyncing?: boolean;
  authSyncError?: string | null;
};

export default function LocationButton({
  authUuid: authUuidProp,
  authSyncing = false,
  authSyncError = null,
}: LocationButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [isRefreshingMap, setIsRefreshingMap] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [mapPayload, setMapPayload] = useState<LiveMapPayload | null>(null);
  const [mapApiError, setMapApiError] = useState<string | null>(null);
  /** 0: 静的地図(WMS) 1: OSMタイル1枚 2: 画像なし */
  const [staticMapImageVariant, setStaticMapImageVariant] = useState<0 | 1 | 2>(
    0
  );

  const resolveUuid = useCallback(() => {
    if (authUuidProp !== undefined) return authUuidProp;
    return getUuidToken();
  }, [authUuidProp]);

  const fetchLiveMap = useCallback(async (manual = false) => {
    if (manual) {
      setIsRefreshingMap(true);
    }

    try {
      const uuid = resolveUuid();
      const headers: Record<string, string> = {};
      if (uuid) {
        headers["Authorization"] = `Bearer uuid:${uuid}`;
      }

      const res = await fetch("/api/chokaigi/live-map", {
        credentials: "include",
        headers,
      });

      if (!res.ok) {
        const message = await readFetchErrorMessage(res, "ライブマップの取得に失敗しました");
        throw new Error(`HTTP ${res.status}: ${message}`);
      }

      const data = (await res.json()) as LiveMapPayload;
      setMapPayload(data);
      setMapApiError(null);
      setAiReport(null);
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "ライブマップ取得エラー";
      setMapApiError(text);
      setAiReport(
        buildAiErrorReport({
          feature: "dashboard/live-map",
          userMessage: text,
          error,
          request: {
            method: "GET",
            url: "/api/chokaigi/live-map",
          },
          context: {
            manualRefresh: manual,
            authSyncing,
            authSyncError,
            authUuidMasked: maskToken(resolveUuid()),
          },
        })
      );
      if (manual) {
        setMessage({ type: "error", text });
      }
    } finally {
      if (manual) {
        setIsRefreshingMap(false);
      }
    }
  }, [resolveUuid]);

  const handleLocationSubmit = async () => {
    setIsSending(true);
    setMessage(null);
    let messageDismissMs = 4500;

    try {
      const uuid = resolveUuid();
      if (!uuid) {
        if (authSyncing) {
          throw new Error(
            "アカウント情報を同期しています。数秒待ってから再度お試しください"
          );
        }
        if (authSyncError) {
          throw new Error(authSyncError);
        }
        throw new Error(
          "認証トークンが見つかりません。ページを再読み込みしてください"
        );
      }

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        throw new Error(
          "このブラウザでは位置情報を使えません。スマホのChrome/Safariで https:// から開いてください。"
        );
      }

      const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          reject,
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 25_000,
          }
        );
      });

      // クライアント側でベクトルタイル逆ジオコーディング（Nominatim 依存を回避）
      const reverseResult = await clientReverseGeocode(
        position.latitude,
        position.longitude
      ).catch(() => null);

      const res = await fetch("/api/locations", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer uuid:${uuid}`,
        },
        body: JSON.stringify({
          lat: position.latitude,
          lng: position.longitude,
          accuracy: position.accuracy,
          municipality: reverseResult?.municipality ?? null,
        }),
      });

      if (!res.ok) {
        const errorMsg = await readFetchErrorMessage(res, "位置情報の送信に失敗しました");
        console.error(`[位置送信エラー] ステータス: ${res.status}, メッセージ: ${errorMsg}`);
        throw new Error(`HTTP ${res.status}: ${errorMsg}`);
      }

      console.log(`[位置送信成功] 座標: (${position.latitude}, ${position.longitude})`);
      setMessage({ type: "success", text: "位置情報を送信しました（500mグリッドで共有）" });
      setAiReport(null);
      await fetchLiveMap();
    } catch (error) {
      const isGeo =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as GeolocationPositionError).code === "number" &&
        [1, 2, 3].includes((error as GeolocationPositionError).code);
      const errorMsg = isGeo
        ? messageForGeolocationFailure(error)
        : error instanceof Error
          ? error.message
          : "位置情報送信エラー";
      setMessage({ type: "error", text: errorMsg });
      setAiReport(
        buildAiErrorReport({
          feature: "dashboard/location-submit",
          userMessage: errorMsg,
          error,
          request: {
            method: "POST",
            url: "/api/locations",
          },
          context: {
            authSyncing,
            authSyncError,
            authUuidMasked: maskToken(resolveUuid()),
            geolocationCode:
              typeof error === "object" &&
              error !== null &&
              "code" in error &&
              typeof (error as GeolocationPositionError).code === "number"
                ? (error as GeolocationPositionError).code
                : null,
            geolocationSupported:
              typeof navigator !== "undefined" && Boolean(navigator.geolocation),
          },
        })
      );
      messageDismissMs = 9000;
    } finally {
      setIsSending(false);
      setTimeout(() => setMessage(null), messageDismissMs);
    }
  };

  // Page Visibility に応じてポーリングを一時停止する。
  // 画面非表示タブからの無駄なリクエストを避け、
  // 画面復帰時は即時 1 回再取得して鮮度を担保する。
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
        if (cancelled) return;
        fetchLiveMap();
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

  // SSE で他ユーザーの送信を push 受信。届くたびに最新の live-map を取り直して反映する。
  // polling は残してあるので SSE が接続できない環境でも致命的ではない。
  useLiveMapStream(() => {
    fetchLiveMap();
  });

  const venue = mapPayload?.venue ?? LIVE_MAP_FALLBACK_VENUE;
  const points = useMemo(
    () =>
      (mapPayload?.users ?? [])
        .map((user) => liveMapToMapPoint(user, venue, LIVE_MAP_ZOOM))
        .filter((value): value is MapPoint => value !== null),
    [mapPayload?.users, venue]
  );

  const listUsers = mapPayload?.users ?? [];
  const [alwaysAvailableReport, setAlwaysAvailableReport] = useState<string | null>(null);
  useEffect(() => {
    setAlwaysAvailableReport(
      buildAiErrorReport({
        feature: "dashboard/location-debug-snapshot",
        userMessage: "エラー未発生時の状態スナップショット",
        request: {
          method: "GET/POST",
          url: "/api/chokaigi/live-map + /api/locations",
        },
        context: {
          authSyncing,
          authSyncError,
          authUuidMasked: maskToken(resolveUuid()),
          hasMapPayload: Boolean(mapPayload),
          mapApiError,
          currentMessageType: message?.type ?? null,
          currentMessageText: message?.text ?? null,
          visibleUsers: listUsers.length,
          geolocationSupported: Boolean(navigator?.geolocation),
        },
      })
    );
  }, [authSyncing, authSyncError, mapPayload, mapApiError, message, listUsers.length, resolveUuid]);

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>位置情報</h3>
      <p className={styles.cardDescription}>
        会場内での正確なマッチングのために位置情報を送信してください
      </p>

      {authSyncing && (
        <p className={styles.cardDescription}>アカウントをサーバーと同期しています…</p>
      )}

      <div className={styles.mapActionRow}>
        <button
          onClick={handleLocationSubmit}
          disabled={isSending || authSyncing || !resolveUuid()}
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

      {mapApiError && !message && (
        <p className={styles.errorMessage} role="status">
          ライブマップ: {mapApiError}
        </p>
      )}
      <AiErrorShare report={aiReport ?? alwaysAvailableReport} />

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
          {staticMapImageVariant < 2 && (
            <img
              src={
                staticMapImageVariant === 0
                  ? liveMapBuildStaticImageUrl(venue)
                  : liveMapBuildOsmTileImageUrl(venue.lat, venue.lng, 14)
              }
              alt="幕張メッセ周辺地図"
              className={styles.liveMapImage}
              loading="lazy"
              onError={() =>
                setStaticMapImageVariant((v) => (v < 1 ? 1 : 2) as 0 | 1 | 2)
              }
            />
          )}
          {staticMapImageVariant === 2 && (
            <p className={styles.liveMapImageFallback} role="img" aria-label="地図プレースホルダ">
              地図画像の取得に失敗しました（回線・広告ブロッカー等）。下の会場周辺の目安はピン表示をご利用ください。© OpenStreetMap
            </p>
          )}

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
              title={`${point.nickname}${point.twitterHandle ? ` (${point.twitterHandle})` : ""} · ${liveMapFormatAgo(point.updatedAtMs)}`}
              aria-label={`${point.nickname} ${liveMapFormatAgo(point.updatedAtMs)}`}
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
                <span className={styles.liveMapListTime}>{liveMapFormatAgo(user.updatedAtMs)}</span>
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
