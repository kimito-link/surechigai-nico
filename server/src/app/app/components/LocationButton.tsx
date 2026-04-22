"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getUuidToken } from "@/lib/clientAuth";
import { AiErrorShare } from "@/app/components/AiErrorShare";
import { buildAiErrorReport, maskToken } from "@/lib/aiErrorReport";
import { clientReverseGeocode } from "@/lib/clientReverseGeocode";
import { useLiveMapStream } from "@/lib/useLiveMapStream";
import { haversineMeters } from "@/lib/geoDistance";
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
import Link from "next/link";
import JapanMap from "./JapanMap";
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

/** 自動追尾のスロットル: 直前送信から 50m 以上 動いた or 60s 以上 経過で再送 */
const AUTO_SUBMIT_MIN_DISTANCE_METERS = 50;
const AUTO_SUBMIT_MIN_INTERVAL_MS = 60_000;
/** これ以内に他ユーザーが現れたらトースト通知（500m グリッド量子化の余裕を含め緩め） */
const NEARBY_THRESHOLD_METERS = 1000;
/** トースト自動消滅までの時間 */
const TOAST_DISMISS_MS = 8_000;
const AUTO_TRACK_STORAGE_KEY = "surechigai:autoTrack";

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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [mapPayload, setMapPayload] = useState<LiveMapPayload | null>(null);
  const [mapApiError, setMapApiError] = useState<string | null>(null);
  /** 0: 静的地図(WMS) 1: OSMタイル1枚 2: 画像なし */
  const [staticMapImageVariant, setStaticMapImageVariant] = useState<0 | 1 | 2>(
    0
  );
  const [alwaysAvailableReport, setAlwaysAvailableReport] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<{
    lat: number;
    lng: number;
    municipality: string | null;
    at: number;
  } | null>(null);
  const [autoTrack, setAutoTrack] = useState(false);
  const [autoTrackRunning, setAutoTrackRunning] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; text: string }>>([]);

  /** 直前に自動送信した座標と時刻（スロットル判定用） */
  const lastAutoSubmitRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  /** 前回チェック時に近接していた他ユーザー id のセット（新規到来検知用） */
  const prevNearbyRef = useRef<Set<number>>(new Set());

  const resolveUuid = useCallback(() => {
    if (authUuidProp !== undefined) return authUuidProp;
    return getUuidToken();
  }, [authUuidProp]);

  const fetchLiveMap = useCallback(async () => {
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
            authSyncing,
            authSyncError,
            authUuidMasked: maskToken(resolveUuid()),
          },
        })
      );
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
      setAiReport(null);
      const submittedAt = Date.now();
      setLastSubmission({
        lat: position.latitude,
        lng: position.longitude,
        municipality: reverseResult?.municipality ?? null,
        at: submittedAt,
      });
      // 手動送信直後の自動追尾 re-submit を抑止するため、参照点を更新
      lastAutoSubmitRef.current = {
        lat: position.latitude,
        lng: position.longitude,
        at: submittedAt,
      };
      await fetchLiveMap();
      // 地図更新後にメッセージを出す（自己位置が反映されたタイミングで表示）
      setMessage({ type: "success", text: "現在地を送信して地図に反映しました" });
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

  /** トースト追加（個別に自動消滅タイマーをセット） */
  const addToast = useCallback((text: string) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DISMISS_MS);
  }, []);

  /** UI フィードバックなしで静かに POST（自動追尾用） */
  const silentSubmit = useCallback(
    async (lat: number, lng: number, accuracy: number) => {
      try {
        const uuid = resolveUuid();
        if (!uuid) return;
        const reverseResult = await clientReverseGeocode(lat, lng).catch(() => null);
        const res = await fetch("/api/locations", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer uuid:${uuid}`,
          },
          body: JSON.stringify({
            lat,
            lng,
            accuracy,
            municipality: reverseResult?.municipality ?? null,
          }),
        });
        if (!res.ok) return;
        const at = Date.now();
        setLastSubmission({
          lat,
          lng,
          municipality: reverseResult?.municipality ?? null,
          at,
        });
        lastAutoSubmitRef.current = { lat, lng, at };
        await fetchLiveMap();
      } catch {
        /* 自動追尾失敗は UI には出さない（手動送信時にユーザーが気付ける） */
      }
    },
    [resolveUuid, fetchLiveMap]
  );

  // localStorage から自動追尾設定を復元
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(AUTO_TRACK_STORAGE_KEY);
      if (saved === "1") setAutoTrack(true);
    } catch {
      /* private mode などで localStorage が使えない場合は無視 */
    }
  }, []);

  // autoTrack 変更時に永続化
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(AUTO_TRACK_STORAGE_KEY, autoTrack ? "1" : "0");
    } catch {
      /* 同上 */
    }
  }, [autoTrack]);

  // 自動追尾: watchPosition でスロットル送信。タブ非表示中は停止。
  useEffect(() => {
    if (!autoTrack) {
      setAutoTrackRunning(false);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let watchId: number | null = null;
    let cancelled = false;

    const start = () => {
      if (watchId !== null || cancelled) return;
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const now = Date.now();
          const prev = lastAutoSubmitRef.current;
          const movedEnough = prev
            ? haversineMeters(prev.lat, prev.lng, latitude, longitude) >=
              AUTO_SUBMIT_MIN_DISTANCE_METERS
            : true;
          const intervalElapsed = prev
            ? now - prev.at >= AUTO_SUBMIT_MIN_INTERVAL_MS
            : true;
          if (!prev || movedEnough || intervalElapsed) {
            silentSubmit(latitude, longitude, accuracy);
          }
        },
        () => {
          /* 自動追尾のエラーは黙って無視（手動送信でユーザーが気付ける） */
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30_000,
          timeout: 30_000,
        }
      );
      setAutoTrackRunning(true);
    };

    const stop = () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      setAutoTrackRunning(false);
    };

    const handleVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible") start();
      else stop();
    };

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
  }, [autoTrack, silentSubmit]);

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

  // 接近検知: mapPayload / 自己位置が更新されるたびに、前回は遠く・今回は近い他ユーザーをトーストで通知
  useEffect(() => {
    const selfLat = lastSubmission?.lat ?? mapPayload?.selfLocation?.lat ?? null;
    const selfLng = lastSubmission?.lng ?? mapPayload?.selfLocation?.lng ?? null;
    if (selfLat == null || selfLng == null) return;

    const users = mapPayload?.users ?? [];
    const currentNearby = new Set<number>();
    const newcomers: Array<{ id: number; nickname: string; twitterHandle: string | null }> = [];

    for (const user of users) {
      if (user.isMe) continue;
      const dist = haversineMeters(selfLat, selfLng, user.lat, user.lng);
      if (dist <= NEARBY_THRESHOLD_METERS) {
        currentNearby.add(user.id);
        if (!prevNearbyRef.current.has(user.id)) {
          newcomers.push({
            id: user.id,
            nickname: user.nickname,
            twitterHandle: user.twitterHandle,
          });
        }
      }
    }

    // 初回に prevNearbyRef が空の場合は「既に居た人」を一気にトースト表示しない
    // → 最初の 1 回は検知だけして、以降の差分だけを通知する
    if (prevNearbyRef.current.size === 0 && currentNearby.size > 0) {
      prevNearbyRef.current = currentNearby;
      return;
    }

    for (const u of newcomers) {
      const who = u.twitterHandle ? `${u.nickname}（${u.twitterHandle}）` : u.nickname;
      addToast(`📡 近くに ${who} さんが現れました`);
    }

    prevNearbyRef.current = currentNearby;
  }, [mapPayload, lastSubmission, addToast]);

  const venue = mapPayload?.venue ?? LIVE_MAP_FALLBACK_VENUE;
  const points = useMemo(
    () =>
      (mapPayload?.users ?? [])
        .map((user) => liveMapToMapPoint(user, venue, LIVE_MAP_ZOOM))
        .filter((value): value is MapPoint => value !== null),
    [mapPayload?.users, venue]
  );

  const listUsers = mapPayload?.users ?? [];
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

        <label className={styles.autoTrackRow}>
          <input
            type="checkbox"
            checked={autoTrack}
            onChange={(e) => setAutoTrack(e.target.checked)}
            className={styles.autoTrackCheckbox}
            disabled={authSyncing || !resolveUuid()}
          />
          <span className={styles.autoTrackLabel}>
            自動で位置を更新
            <span className={styles.autoTrackHint}>
              動いた・一定時間経過で自動送信（タブ非表示時は停止）
            </span>
          </span>
          {autoTrack && (
            <span className={styles.autoTrackIndicator}>
              {autoTrackRunning ? "📡 追尾中" : "⏸ 一時停止"}
            </span>
          )}
        </label>
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

      {/* 送信済み表示: ローカル state 優先。refresh 後は API の selfLocation にフォールバック */}
      {(lastSubmission || mapPayload?.selfLocation) && (
        <div className={styles.selfLocationCard}>
          <span className={styles.selfLocationPin}>📍</span>
          <span className={styles.selfLocationText}>
            送信済み：{lastSubmission?.municipality ?? mapPayload?.selfLocation?.municipality ?? "位置取得済み"}
          </span>
          <span className={styles.selfLocationTime}>
            {liveMapFormatAgo(lastSubmission?.at ?? mapPayload?.selfLocation?.updatedAtMs ?? Date.now())}
          </span>
        </div>
      )}

      {/* 全国参加者マップ + エリアタグ */}
      {mapPayload?.areaStats && mapPayload.areaStats.length > 0 && (
        <div className={styles.areaStatsWrap}>
          <h5 className={styles.areaStatsTitle}>全国の参加者（過去30分）</h5>
          <JapanMap
            areaStats={mapPayload.areaStats}
            selfMunicipality={
              lastSubmission?.municipality ??
              mapPayload?.selfLocation?.municipality ??
              null
            }
          />
          <Link href="/creators" className={styles.creatorsDirectoryCta}>
            <span className={styles.creatorsDirectoryCtaIcon} aria-hidden="true">
              🗾
            </span>
            <span className={styles.creatorsDirectoryCtaText}>
              <span className={styles.creatorsDirectoryCtaTitle}>
                47都道府県別クリエイター一覧
              </span>
              <span className={styles.creatorsDirectoryCtaLead}>
                過去に参加された方も含めて、都道府県ごとに全員ズラッと見る →
              </span>
            </span>
          </Link>
          <ul className={styles.areaStatsList}>
            {mapPayload.areaStats.map((stat) => (
              <li key={stat.area} className={styles.areaStatItem}>
                <span className={styles.areaStatName}>{stat.area}</span>
                <span className={styles.areaStatCount}>{stat.count}人</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className={styles.liveMapWrap}>
        <summary className={styles.liveMapHeaderRow}>
          <h4 className={styles.liveMapTitle}>超会議会場マップ（β）</h4>
          <span className={styles.liveMapMeta}>
            {mapPayload ? `${points.length}人表示` : "読み込み中"}
          </span>
        </summary>

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
      </details>

      {toasts.length > 0 && (
        <div className={styles.toastStack} role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={styles.toast}>
              <span className={styles.toastText}>{t.text}</span>
              <button
                type="button"
                className={styles.toastClose}
                aria-label="通知を閉じる"
                onClick={() =>
                  setToasts((prev) => prev.filter((x) => x.id !== t.id))
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
