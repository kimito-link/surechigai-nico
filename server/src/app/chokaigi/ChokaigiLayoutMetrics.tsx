"use client";

import { useEffect } from "react";

/** /chokaigi 配下で StickyXSearchBar 分のオフセットを CSS 変数に反映 */
export function ChokaigiLayoutMetrics() {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--layout-sticky-x-h", "52px");
    return () => {
      root.style.removeProperty("--layout-sticky-x-h");
    };
  }, []);
  return null;
}
