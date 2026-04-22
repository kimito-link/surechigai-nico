"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * 次の主要動線を先読み（Hoshino: 摩擦ゼロ・速度至上）
 * - /chokaigi … LP・ホームからの離脱先
 */
export function PrefetchChokaigiRoutes() {
  const router = useRouter();
  const didPrefetch = useRef(false);

  useEffect(() => {
    if (didPrefetch.current) return;
    didPrefetch.current = true;
    router.prefetch("/chokaigi");
  }, [router]);

  return null;
}

/**
 * ビューポートに入ったら /chokaigi をプリフェッチ（ヒーロー下などに配置）
 */
export function PrefetchChokaigiWhenVisible({ children }: { children: ReactNode }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let done = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (done || !entries.some((e) => e.isIntersecting)) return;
        done = true;
        router.prefetch("/chokaigi");
        io.disconnect();
      },
      { rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [router]);

  return <div ref={wrapRef}>{children}</div>;
}
