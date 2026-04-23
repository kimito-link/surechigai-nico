import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getYukkuriExplainedTweet } from "@/lib/yukkuriExplainedTweetArchive";
import { yukkuriOgImageUrl } from "@/lib/yukkuriShareUrls";
import styles from "../../explained.module.css";

/**
 * ツイート URL 解説のアーカイブ詳細ページ。
 *
 * URL: `/yukkuri/explained/tweet/{tweetId}`
 *
 * 仕様メモ:
 * - 1 tweet_id 1 行の固定 URL。再解説した場合は本文と更新時刻が上書きされる。
 * - DB テーブル `yukkuri_explained_tweet` は Codex 担当領域（MEMORY.md）で、
 *   未作成環境でも `getYukkuriExplainedTweet` が null 返却で落ちないようにしてある。
 * - 未作成環境 / まだ DB に保存されていない tweetId → `notFound()` で 404。
 * - OGP 画像は既存ハンドル解説と同じ `yukkuriOgImageUrl` を流用（ツイート URL 解説でも
 *   「投稿者アバター＋ハンドル＋3 人のセリフ」が成立するため）。
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { tweetId: string };

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://surechigai-nico.link").replace(/\/$/, "");
}

function normalizeTweetIdParam(raw: string): string {
  return decodeURIComponent(raw).replace(/\D/g, "").slice(0, 32);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { tweetId } = await params;
  const id = normalizeTweetIdParam(tweetId);
  const row = await getYukkuriExplainedTweet(id);
  if (!row) {
    return { title: "ツイート解説が見つかりませんでした | すれちがいライト" };
  }
  const handle = row.x_handle;
  const title = `@${handle} のツイートをゆっくり解説（保存ページ）| すれちがいライト`;
  const description = `りんく・こん太・たぬ姉が @${handle} のツイートを解説。${row.rink.slice(0, 80)}…`;
  const ogImage = yukkuriOgImageUrl(
    siteBase(),
    handle,
    { rink: row.rink, konta: row.konta, tanunee: row.tanunee },
    { avatar: row.author_avatar_url, name: row.author_display_name }
  );
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function YukkuriExplainedTweetDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { tweetId } = await params;
  const id = normalizeTweetIdParam(tweetId);
  if (!id) notFound();
  const row = await getYukkuriExplainedTweet(id);
  if (!row) notFound();

  const handle = row.x_handle;
  const tweetUrl = `https://x.com/${encodeURIComponent(handle)}/status/${row.tweet_id}`;

  return (
    <main className={styles.detailShell}>
      <header className={styles.detailHeader}>
        <nav className={styles.breadcrumb} aria-label="パンくず">
          <Link href="/">ホーム</Link>
          <span aria-hidden="true">›</span>
          <Link href="/yukkuri/explained">ゆっくり解説アーカイブ</Link>
          <span aria-hidden="true">›</span>
          <Link href={`/yukkuri/explained/${encodeURIComponent(handle)}`}>@{handle}</Link>
          <span aria-hidden="true">›</span>
          <span>ツイート解説</span>
        </nav>
        <div className={styles.detailIdentity}>
          {row.author_avatar_url ? (
            // X の pbs.twimg.com を直参照（Next/Image を通さず既存ハンドル詳細と揃える）。
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.author_avatar_url}
              alt=""
              className={styles.detailAvatar}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className={styles.detailAvatarFallback} aria-hidden="true">
              @{handle.slice(0, 1).toUpperCase()}
            </span>
          )}
          <h1 className={styles.detailTitle}>@{handle} のツイート解説</h1>
        </div>
        {row.author_display_name ? (
          <p className={styles.detailSub}>{row.author_display_name}</p>
        ) : null}
      </header>

      {/* 解説対象のツイート本文。LLM がどのツイートに反応したかを可視化する。
          X のエンベッドは script 読み込みが重いので、本文をそのままテキストで出し、
          「X で見る」ボタンで元ツイートへ飛ばす構成にした。 */}
      <section className={styles.tweetQuote} aria-label="解説対象のツイート">
        <p className={styles.tweetQuoteLabel}>解説対象のツイート</p>
        <p className={styles.tweetQuoteBody}>{row.tweet_text}</p>
        <p className={styles.tweetQuoteMeta}>
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.tweetQuoteLink}
          >
            X で元ツイートを開く →
          </a>
          {row.tweeted_at ? (
            <span className={styles.tweetQuoteDate}>投稿: {row.tweeted_at}</span>
          ) : null}
        </p>
      </section>

      <section className={styles.dialogueBlock} aria-label="ゆっくり解説の本文">
        {(
          [
            ["りんく", row.rink, styles.badgeRink, "/chokaigi/yukkuri/rink.png"],
            ["こん太", row.konta, styles.badgeKonta, "/chokaigi/yukkuri/konta.png"],
            ["たぬ姉", row.tanunee, styles.badgeTanunee, "/chokaigi/yukkuri/tanunee.png"],
          ] as const
        ).map(([label, text, badgeClass, avatar]) => (
          <div key={label} className={styles.dialogueRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar}
              alt=""
              className={styles.charAvatar}
              width={48}
              height={48}
              loading="lazy"
              decoding="async"
            />
            <div className={styles.charColumn}>
              <span className={badgeClass}>{label}</span>
              <p className={styles.bubble}>{text}</p>
            </div>
          </div>
        ))}
      </section>

      <div className={styles.ctaRow}>
        <Link
          href={`/yukkuri/explained/${encodeURIComponent(handle)}`}
          className={styles.cta}
        >
          @{handle} のアカウント解説を見る
        </Link>
      </div>
      <p className={styles.note}>
        <Link href="/yukkuri/explained">← ゆっくり解説アーカイブへ戻る</Link>
      </p>
    </main>
  );
}
