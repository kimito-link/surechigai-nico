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

function isHashScrollRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === "") return true;
  return pathname.startsWith("/chokaigi");
}

/**
 * トップ `/` と `/chokaigi` 配下で、hash 付き URL の着地を確実にする。
 * 固定ヘッダー分は各ページの CSS scroll-margin で吸収する。
 */
export function DocumentHashScroll() {
  const pathname = usePathname() ?? "";

  useLayoutEffect(() => {
    if (!isHashScrollRoute(pathname)) return;
    scrollToLocationHash();
    const retry = window.setTimeout(() => scrollToLocationHash(), 220);
    return () => window.clearTimeout(retry);
  }, [pathname]);

  useLayoutEffect(() => {
    if (!isHashScrollRoute(pathname)) return;
    const onHash = () => scrollToLocationHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [pathname]);

  return null;
}
