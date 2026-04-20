"use client";

import { useEffect, useState } from "react";
import styles from "./chokaigi.module.css";
import {
  MAP_PDF_DESKTOP_DETAILS_NOTE,
  MAP_PDF_DESKTOP_DETAILS_SUMMARY,
  VENUE_MAP_PDF_PATH,
} from "./lp-content";

const DESKTOP_QUERY = "(min-width: 900px)";

export function PdfDesktopEmbed() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(media.matches);
    update();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

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
