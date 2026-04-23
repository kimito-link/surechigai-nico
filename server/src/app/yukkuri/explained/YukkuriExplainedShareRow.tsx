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
      // 重要: デフォルト遷移を先に止める。こうしないと X デスクトップアプリが
      // intent URL を先取りして起動し、クリップボード書き込みが間に合わず
      // 「空白の composer」で開かれる（Ctrl+V しても何も出ない）バグになる。
      e.preventDefault();

      // まずクリップボードに仕込む（await で書き込み完了を保証する）。
      try {
        await copy(clipboardBundle, "share");
      } catch {}

      // 【ツイッター専用方針】navigator.share は以前使っていたが削除した。
      // 理由:
      //  - iOS/Android の共有シートは LINE / Instagram / Slack / Mastodon 等の
      //    選択肢も並べるため、「ツイッターに共有するはずが別 SNS に流れる」という
      //    誤タップ事故が起きる。ユーザー要望は「X だけに拡散」。
      //  - ネイティブ共有経由だと X アプリ内で `{text, url}` が別フィールドで
      //    渡されて OGP カードが揺れる（空 composer や URL だけ貼りの事例も観測）。
      //
      // 全ユーザー（Desktop / モバイル Safari / モバイル Chrome）で必ず
      // `x.com/intent/post?text=<本文+URL>` を直接開く経路に統一。
      // X アプリが iOS の Universal Link として intent URL を受け取る場合は
      // アプリが起動し、そうでなければ x.com の Web composer が開く。
      // いずれにせよ「宛先は X のみ」が保証される。
      window.open(tweetUrl, "_blank", "noopener,noreferrer");
    },
    [clipboardBundle, copy, tweetUrl]
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
