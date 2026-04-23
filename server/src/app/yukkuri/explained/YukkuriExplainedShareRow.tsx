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

  const handleShareClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      // まずクリップボードに仕込んでおく（どの経路でも「貼り付け」で復旧できる）。
      void copy(clipboardBundle, "share");

      // モバイル（および対応ブラウザ）ではネイティブ共有シートを優先。
      // iOS/Android のシェアシート経由で X アプリに直接渡せるので、
      // intent URL が空白の composer で開く問題を回避できる。
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        e.preventDefault(); // `<a target="_blank">` のデフォルト遷移を止める
        try {
          await navigator.share({
            title: `@${handle} のゆっくり解説`,
            text: tweetText,
            url: pageUrl,
          });
        } catch {
          // ユーザーがキャンセル、または共有失敗。クリップボードに入っているので
          // X アプリ等を自分で開いて貼り付けてもらう。何もしない。
        }
        return;
      }
      // ネイティブ共有非対応環境（主にデスクトップ）では `<a target="_blank">` の
      // デフォルト動作に任せ、新規タブで x.com/intent/post を開く。
    },
    [clipboardBundle, copy, handle, pageUrl, tweetText]
  );

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
