"use client";

import { useEffect } from "react";

/**
 * /api/chokaigi/live-stream (SSE) を購読し、"location" イベントで onEvent を呼ぶ。
 * EventSource 非対応環境や接続失敗時は何もしない（polling 側が担保する）。
 */
export function useLiveMapStream(
  onEvent: (event: { type: "location"; userId: number; lat: number; lng: number; h3?: string; ts: number }) => void,
  options?: { disabled?: boolean }
): void {
  useEffect(() => {
    if (options?.disabled) return;
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;

    let es: EventSource | null = null;
    let cancelled = false;
    let backoffMs = 2_000;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      try {
        es = new EventSource("/api/chokaigi/live-stream", { withCredentials: true });
      } catch (err) {
        console.warn("[useLiveMapStream] EventSource init failed", err);
        scheduleReconnect();
        return;
      }

      es.addEventListener("open", () => {
        backoffMs = 2_000;
      });

      const handleLocation = (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data);
          onEvent(data);
        } catch {
          /* noop */
        }
      };
      es.addEventListener("location", handleLocation as EventListener);
      es.addEventListener("catchup", (evt) => {
        try {
          const data = JSON.parse((evt as MessageEvent).data);
          if (Array.isArray(data?.events)) {
            for (const e of data.events) onEvent(e);
          }
        } catch {
          /* noop */
        }
      });

      es.addEventListener("error", () => {
        es?.close();
        es = null;
        scheduleReconnect();
      });
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      const delay = Math.min(backoffMs, 30_000);
      backoffMs = Math.min(backoffMs * 2, 30_000);
      reconnectTimer = setTimeout(() => {
        connect();
      }, delay);
    };

    connect();

    const handleVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible" && !es) {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        connect();
      } else if (document.visibilityState === "hidden" && es) {
        es.close();
        es = null;
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (es) es.close();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.disabled]);
}
