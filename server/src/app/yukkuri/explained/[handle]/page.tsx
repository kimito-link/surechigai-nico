import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getYukkuriExplainedArchive } from "@/lib/yukkuriExplainedArchive";
import { YukkuriExplainedShareRow } from "../YukkuriExplainedShareRow";
import styles from "../explained.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { handle: string };

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
  const title = `@${row.x_handle} のゆっくり解説（アーカイブ）| すれちがいライト`;
  const description = `りんく・こん太・たぬ姉による @${row.x_handle} さんの紹介（保存済み）。${row.rink.slice(0, 80)}…`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
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
        <h1 className={styles.detailTitle}>@{row.x_handle}</h1>
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

      <YukkuriExplainedShareRow
        handle={row.x_handle}
        rink={row.rink}
        konta={row.konta}
        tanunee={row.tanunee}
      />

      <div className={styles.ctaRow}>
        <Link href="/yukkuri/explained" className={styles.cta}>
          一覧へ戻る
        </Link>
      </div>
    </main>
  );
}
