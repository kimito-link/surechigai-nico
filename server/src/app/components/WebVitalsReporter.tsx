"use client";

import { useReportWebVitals } from "next/web-vitals";
import { getAnalyticsSessionId, sendAnalyticsBeacon } from "@/lib/clientAnalytics";

/** LCP / INP / CLS / FCP / TTFB などを匿名ビーコンで送る */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const path =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "";
    void sendAnalyticsBeacon({
      kind: "web_vital",
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating: metric.rating,
      path,
      sid: getAnalyticsSessionId(),
      ts: Date.now(),
    });
  });

  return null;
}
