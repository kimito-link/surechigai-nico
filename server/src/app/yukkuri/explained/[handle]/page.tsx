import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getYukkuriExplainedArchive } from "@/lib/yukkuriExplainedArchive";
import { yukkuriOgImageUrl } from "@/lib/yukkuriShareUrls";
import { YukkuriExplainedShareRow } from "../YukkuriExplainedShareRow";
import styles from "../explained.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { handle: string };

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://surechigai-nico.link").replace(/\/$/, "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const decoded = decodeURIComponent(handle).replace(/^@/, "").trim();
  const row = await getYukkuriExplainedArchive(decoded);
  if (!row) {
    return { title: "解説が見つかりませんでした | すれちがいライト" };
  }
  const title = `@${row.x_handle} のゆっくり解説（保存ページ）| すれちがいライト`;
  const description = `りんく・こん太・たぬ姉による @${row.x_handle} さんの紹介（アカウント別URL・保存済み）。${row.rink.slice(0, 80)}…`;
  const ogImage = yukkuriOgImageUrl(siteBase(), row.x_handle, {
    rink: row.rink,
    konta: row.konta,
    tanunee: row.tanunee,
  });
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

export default async function YukkuriExplainedDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle } = await params;
  const decoded = decodeURIComponent(handle).replace(/^@/, "").trim();
  const row = await getYukkuriExplainedArchive(decoded);
  if (!row) notFound();

  return (
    <main className={styles.detailShell}>
      <header className={styles.detailHeader}>
        <nav className={styles.breadcrumb} aria-label="パンくず">
          <Link href="/">ホーム</Link>
          <span aria-hidden="true">›</span>
          <Link href="/yukkuri/explained">ゆっくり解説アーカイブ</Link>
          <span aria-hidden="true">›</span>
          <span>@{row.x_handle}</span>
        </nav>
        <div className={styles.detailIdentity}>
          {row.avatar_url ? (
            <img
              src={row.avatar_url}
              alt=""
              className={styles.detailAvatar}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className={styles.detailAvatarFallback} aria-hidden="true">
              @{row.x_handle.slice(0, 1).toUpperCase()}
            </span>
          )}
          <h1 className={styles.detailTitle}>@{row.x_handle}</h1>
        </div>
        {row.display_name ? (
          <p className={styles.detailSub}>{row.display_name}</p>
        ) : null}
      </header>

      <section className={styles.dialogueBlock} aria-label="ゆっくり解説の本文">
        {(
          [
            ["りんく", row.rink, styles.badgeRink],
            ["こん太", row.konta, styles.badgeKonta],
            ["たぬ姉", row.tanunee, styles.badgeTanunee],
          ] as const
        ).map(([label, text, badgeClass]) => (
          <div key={label} className={styles.dialogueRow}>
            <span className={badgeClass}>{label}</span>
            <p className={styles.bubble}>{text}</p>
          </div>
        ))}
        {row.source ? (
          <p className={styles.sourceNote}>保存時ソース: {row.source}</p>
        ) : null}
      </section>

      <YukkuriExplainedShareRow handle={row.x_handle} />

      <div className={styles.ctaRow}>
        <Link href="/yukkuri/explained" className={styles.cta}>
          一覧へ戻る
        </Link>
      </div>
    </main>
  );
}
