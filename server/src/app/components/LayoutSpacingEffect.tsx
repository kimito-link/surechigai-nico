"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const MINIMAL_FOOTER_ROUTES = ["/sign-in", "/sign-up", "/onboarding"];

function footerPadForViewport(minimal: boolean): string {
  if (minimal) {
    return "max(1rem, env(safe-area-inset-bottom, 0px))";
  }
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches) {
    return "160px";
  }
  return "130px";
}

/**
 * 固定ヘッダー／フッターと pageShell の余白を CSS 変数で同期（ルート別にフッター CTA 非表示時は下余白を縮小）
 */
export function LayoutSpacingEffect() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    const minimal = MINIMAL_FOOTER_ROUTES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    const apply = () => {
      document.documentElement.style.setProperty(
        "--layout-footer-pad",
        footerPadForViewport(minimal)
      );
    };
    apply();
    const mq = window.matchMedia("(max-width: 640px)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pathname]);

  return null;
}
