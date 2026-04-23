"use client";

import Link from "next/link";
import styles from "./SegmentErrorFallback.module.css";

type Props = {
  title: string;
  description: string;
  reset: () => void;
};

export function SegmentErrorFallback({ title, description, reset }: Props) {
  return (
    <main className={styles.wrap}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.lead}>{description}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => reset()}>
          再試行
        </button>
        <Link href="/" className={styles.secondary}>
          トップへ
        </Link>
      </div>
    </main>
  );
}
