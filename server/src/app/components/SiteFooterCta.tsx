"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteFooterCta.module.css";

const HIDDEN_PATHS = ["/sign-in", "/sign-up", "/onboarding", "/app"];

export function SiteFooterCta() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (HIDDEN_PATHS.some((p) => pathname?.startsWith(p))) return null;

  return (
    <footer className={`${styles.footer} ${visible ? styles.visible : ""}`}>
      <div className={styles.inner}>
        <p className={styles.message}>超会議ですれちがおう</p>
        <Link href="/chokaigi#usage-heading" className={styles.ctaButton}>
          つかいかたを見る
        </Link>
      </div>
    </footer>
  );
}
