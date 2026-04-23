"use client";

import { useCallback, useState } from "react";
import { yukkuriExplainedPageUrl, yukkuriShareTweetUrl } from "@/lib/yukkuriShareUrls";
import styles from "./explained.module.css";

type Props = { handle: string };

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://surechigai-nico.link").replace(
    /\/$/,
    ""
  );
}

/** ツイート本文に載せるのはアカウント別の保存ページ（OG はそのページの metadata） */
function buildTweetUrl(handle: string) {
  return yukkuriShareTweetUrl(siteBase(), handle);
}

export function YukkuriExplainedShareRow({ handle }: Props) {
  const [copied, setCopied] = useState(false);
  const pageUrl = yukkuriExplainedPageUrl(siteBase(), handle);
  const tweetUrl = buildTweetUrl(handle);

  const copyPageUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("URL をコピーしてください", pageUrl);
    }
  }, [pageUrl]);

  return (
    <div className={styles.shareRow}>
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.shareBtn}
      >
        X でシェア（カード付き）
      </a>
      <button type="button" className={styles.shareBtnGhost} onClick={() => void copyPageUrl()}>
        {copied ? "コピーしました" : "この紹介ページのURLをコピー"}
      </button>
      <p className={styles.profileLink}>
        <a
          href={`https://x.com/${encodeURIComponent(handle)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          @{handle} の X プロフィール →
        </a>
      </p>
    </div>
  );
}
