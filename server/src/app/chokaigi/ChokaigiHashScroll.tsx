"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

function scrollToLocationHash(): boolean {
  const hash = window.location.hash;
  if (!hash || hash === "#") return false;
  const id = decodeURIComponent(hash.slice(1));
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ block: "start" });
  return true;
}

/**
 * App Router では同一ページへの hash 付き遷移や、クライアント遷移直後に
 * ブラウザ既定のスクロールが効かないことがある。固定ヘッダー分は CSS の
 * scroll-margin で吸収する。
 */
export function ChokaigiHashScroll() {
  const pathname = usePathname() ?? "";

  useLayoutEffect(() => {
    if (!pathname.startsWith("/chokaigi")) return;
    scrollToLocationHash();
    const retry = window.setTimeout(() => scrollToLocationHash(), 220);
    return () => window.clearTimeout(retry);
  }, [pathname]);

  useLayoutEffect(() => {
    if (!pathname.startsWith("/chokaigi")) return;
    const onHash = () => scrollToLocationHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [pathname]);

  return null;
}
