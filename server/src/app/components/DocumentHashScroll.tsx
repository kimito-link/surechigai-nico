"use client";

import { useLayoutEffect, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * 現在の `location.hash` に対応する要素へスクロールする。
 * `getElementById` は文書内の最初の一致のみ（重複 id は避けること）。
 */
function scrollToHashFromLocation(): boolean {
  const hash = window.location.hash;
  if (!hash || hash === "#") return false;
  const id = decodeURIComponent(hash.slice(1));
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ block: "start", behavior: "auto" });
  return true;
}

function isHashScrollRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === "") return true;
  return pathname.startsWith("/chokaigi");
}

/** レイアウト・遅延描画後にターゲットが現れるまで複数回試す */
function scheduleScrollToHash() {
  const run = () => scrollToHashFromLocation();
  run();
  requestAnimationFrame(run);
  window.setTimeout(run, 0);
  window.setTimeout(run, 120);
  window.setTimeout(run, 300);
  window.setTimeout(run, 650);
  window.setTimeout(run, 1100);
}

export function DocumentHashScroll() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  useLayoutEffect(() => {
    if (!isHashScrollRoute(pathname)) return;
    scheduleScrollToHash();
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isHashScrollRoute(pathname)) return;

    const onHashOrPop = () => scheduleScrollToHash();
    window.addEventListener("hashchange", onHashOrPop);
    window.addEventListener("popstate", onHashOrPop);

    /**
     * Next.js の <Link> は同一 pathname で hash だけ変えるとき `hashchange` を出さないことがある。
     * キャプチャで同一オリジン・同一 pathname の # 付きリンクを拾い、遷移後に再スクロールする。
     */
    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      const raw = a.getAttribute("href");
      if (!raw || raw.startsWith("mailto:") || raw.startsWith("javascript:")) return;
      let url: URL;
      try {
        url = new URL(raw, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname !== window.location.pathname) return;
      if (!url.hash || url.hash === "#") return;

      queueMicrotask(() => scheduleScrollToHash());
      window.setTimeout(() => scheduleScrollToHash(), 0);
      window.setTimeout(() => scheduleScrollToHash(), 300);
      window.setTimeout(() => scheduleScrollToHash(), 700);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("hashchange", onHashOrPop);
      window.removeEventListener("popstate", onHashOrPop);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [pathname]);

  return null;
}
