"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./SiteFooterCta.module.css";

export function SiteFooterCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
