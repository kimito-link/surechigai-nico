"use client";

import Link from "next/link";
import styles from "./SiteFooterCta.module.css";

export function SiteFooterCta() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.message}>超会議ですれちがおう</p>
        <Link href="/chokaigi#usage-heading" className={styles.ctaButton}>
          つかいかたを見る
        </Link>
      </div>
    </footer>
  );
}
