"use client";

import { useCallback, useState } from "react";
import styles from "./explained.module.css";

type Props = {
  handle: string;
  rink: string;
  konta: string;
  tanunee: string;
};

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://surechigai-nico.link").replace(
    /\/$/,
    ""
  );
}

function buildShareCardUrl(handle: string, dialogue: Pick<Props, "rink" | "konta" | "tanunee">) {
  const url = new URL(`${siteBase()}/yukkuri`);
  url.searchParams.set("h", handle);
  url.searchParams.set("r", dialogue.rink);
  url.searchParams.set("k", dialogue.konta);
  url.searchParams.set("t", dialogue.tanunee);
  return url.toString();
}

function buildTweetUrl(handle: string, dialogue: Pick<Props, "rink" | "konta" | "tanunee">) {
  const cardUrl = buildShareCardUrl(handle, dialogue);
  const text = `りんく・こん太・たぬ姉に @${handle} さんをゆっくり解説してもらったよ！\n#すれちがいライト #ニコニコ超会議2026\n${cardUrl}`;
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function YukkuriExplainedShareRow({ handle, rink, konta, tanunee }: Props) {
  const [copied, setCopied] = useState(false);
  const pageUrl = `${siteBase()}/yukkuri/explained/${encodeURIComponent(handle)}`;
  const tweetUrl = buildTweetUrl(handle, { rink, konta, tanunee });

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
