"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteFooterCta.module.css";

const HIDE_FOOTER_CTA_PREFIXES = ["/sign-in", "/sign-up", "/onboarding"];

export function SiteFooterCta() {
  const pathname = usePathname() ?? "";
  if (
    HIDE_FOOTER_CTA_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )
  ) {
    return null;
  }

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
