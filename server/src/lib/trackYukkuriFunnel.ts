"use client";

import { trackProductEvent } from "@/lib/clientAnalytics";
import {
  buildYukkuriFunnelEvent,
  funnelEventsEnabled,
  type YukkuriFunnelStep,
} from "@/lib/yukkuriFunnel";

/** ゆっくり解説ファネルのイベント送信（失敗しても UI に影響しない）。 */
export function trackYukkuriFunnel(step: YukkuriFunnelStep): void {
  if (!funnelEventsEnabled(process.env.NEXT_PUBLIC_YUKKURI_FUNNEL_EVENTS)) return;
  try {
    const ev = buildYukkuriFunnelEvent(step);
    trackProductEvent(ev.name, ev.payload);
  } catch {
    /* 計測失敗は無視 */
  }
}
