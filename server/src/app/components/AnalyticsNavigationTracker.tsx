"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackProductEvent } from "@/lib/clientAnalytics";

/** SPA 遷移ごとの page_view（匿名・path のみ） */
export function AnalyticsNavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prev = useRef<string | null>(null);

  useEffect(() => {
    const qs = searchParams?.toString();
    const full = qs ? `${pathname}?${qs}` : pathname;
    if (prev.current === full) return;
    prev.current = full;
    trackProductEvent("page_view", { path: full });
  }, [pathname, searchParams]);

  return null;
}
