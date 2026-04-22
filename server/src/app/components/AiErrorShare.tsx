"use client";

import { useState } from "react";
import styles from "./AiErrorShare.module.css";

type AiErrorShareProps = {
  report: string | null;
};

export function AiErrorShare({ report }: AiErrorShareProps) {
  const [copied, setCopied] = useState(false);

  if (!report) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.label}>
        AI相談用の開発レポートをコピーできます。この内容をそのまま貼ると原因調査が速くなります。
      </p>
      <div className={styles.actions}>
        <button type="button" onClick={handleCopy} className={styles.copyButton}>
          AI共有レポートをコピー
        </button>
        {copied ? <span className={styles.copied}>コピーしました</span> : null}
      </div>
      <details className={styles.preview}>
        <summary className={styles.summary}>開発情報をプレビュー</summary>
        <pre className={styles.pre}>{report}</pre>
      </details>
    </div>
  );
}
