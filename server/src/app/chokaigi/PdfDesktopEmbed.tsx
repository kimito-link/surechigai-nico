"use client";

import { useSyncExternalStore } from "react";
import styles from "./chokaigi.module.css";
import {
  MAP_PDF_DESKTOP_DETAILS_NOTE,
  MAP_PDF_DESKTOP_DETAILS_SUMMARY,
  VENUE_MAP_PDF_PATH,
} from "./lp-content";

const DESKTOP_QUERY = "(min-width: 900px)";

function subscribeDesktop(callback: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  const handler = () => callback();
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }
  mq.addListener(handler);
  return () => mq.removeListener(handler);
}

function getDesktopSnapshot(): boolean {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getDesktopServerSnapshot(): boolean {
  return false;
}

export function PdfDesktopEmbed() {
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    getDesktopServerSnapshot
  );

  if (!isDesktop) {
    return null;
  }

  return (
    <div className={styles.mapPdfDesktopOnly}>
      <p className={`${styles.mapFinePrint} ${styles.mapPdfDesktopNote}`}>
        {MAP_PDF_DESKTOP_DETAILS_NOTE}
      </p>
      <details className={styles.mapPdfDetails}>
        <summary className={styles.mapPdfSummary}>
          {MAP_PDF_DESKTOP_DETAILS_SUMMARY}
        </summary>
        <div className={styles.mapEmbedWrap}>
          <iframe
            className={styles.mapFrame}
            title="ニコニコ超会議 会場マップ（PDF）"
            src={VENUE_MAP_PDF_PATH}
            loading="lazy"
          />
        </div>
      </details>
    </div>
  );
}
