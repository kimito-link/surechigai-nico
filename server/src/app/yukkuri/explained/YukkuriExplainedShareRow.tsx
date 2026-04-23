"use client";

import { useCallback, useState } from "react";
import {
  yukkuriExplainedPageUrl,
  yukkuriShareClipboardBundle,
  yukkuriShareTweetText,
  yukkuriShareTweetUrl,
} from "@/lib/yukkuriShareUrls";
import styles from "./explained.module.css";

type Props = { handle: string };

type Copied = "share" | "text" | "url" | "page" | null;

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://surechigai-nico.link").replace(
    /\/$/,
    ""
  );
}

/**
 * シェア導線の UI。
 *
 * 「X でシェア（カード付き）」ボタンの挙動:
 * - 押した瞬間に「本文＋URL」をクリップボードに入れる
 * - その直後に X の `/intent/post?text=...&url=...` を開く（カード付き OGP 経由）
 * - この順にするのは、X の Windows/Mac デスクトップアプリが intent の `text`/`url`
 *   パラメータを無視して空白の composer を開くケースがあるため。空白で開いても
 *   ユーザーは `Ctrl+V` / `⌘V` でそのまま投稿できる（UI にも案内文）。
 *
 * その下に「本文だけ」「URL だけ」「このページのURL」の個別コピー導線を並べる。
 * すれ違いライトの UX として「迷ったらどれか押せば共有できる」を担保する。
 */
export function YukkuriExplainedShareRow({ handle }: Props) {
  const [copied, setCopied] = useState<Copied>(null);
  const base = siteBase();
  const pageUrl = yukkuriExplainedPageUrl(base, handle);
  const tweetText = yukkuriShareTweetText(handle);
  const tweetUrl = yukkuriShareTweetUrl(base, handle);
  const clipboardBundle = yukkuriShareClipboardBundle(base, handle);

  const flashCopied = useCallback((kind: Exclude<Copied, null>) => {
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 2200);
  }, []);

  const copy = useCallback(
    async (text: string, kind: Exclude<Copied, null>) => {
      try {
        await navigator.clipboard.writeText(text);
        flashCopied(kind);
      } catch {
        // クリップボード API が使えない環境（古い Safari / 非 HTTPS 等）向け。
        // 手動でコピーしてもらうため window.prompt に落とす。
        window.prompt("コピーしてください", text);
      }
    },
    [flashCopied]
  );

  const handleShareClick = useCallback(() => {
    // 画面遷移は `<a target="_blank">` 側のデフォルト動作に任せる。
    // こちらは「開く前にクリップボードを仕込んでおく」役目のみ。
    void copy(clipboardBundle, "share");
  }, [clipboardBundle, copy]);

  return (
    <div className={styles.shareRow}>
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.shareBtn}
        onClick={handleShareClick}
      >
        {copied === "share" ? "コピーしました！Xで貼り付けてください" : "X でシェア（カード付き）"}
      </a>
      <button
        type="button"
        className={styles.shareBtnGhost}
        onClick={() => void copy(tweetText, "text")}
      >
        {copied === "text" ? "本文をコピーしました" : "本文だけコピー"}
      </button>
      <button
        type="button"
        className={styles.shareBtnGhost}
        onClick={() => void copy(pageUrl, "url")}
      >
        {copied === "url" ? "URLをコピーしました" : "URLだけコピー"}
      </button>
      <p className={styles.shareHint}>
        Xアプリで空白のまま開いた場合は、<strong>そのまま貼り付け</strong>でOKです（本文＋URLはコピー済み）。
      </p>
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
