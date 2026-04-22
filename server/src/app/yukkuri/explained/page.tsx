import type { Metadata } from "next";
import Link from "next/link";
import {
  countYukkuriExplainedArchive,
  listYukkuriExplainedArchive,
} from "@/lib/yukkuriExplainedArchive";
import styles from "./explained.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_LIMIT = 500;

export const metadata: Metadata = {
  title: "ゆっくり解説アーカイブ | すれちがいライト",
  description:
    "すれちがいライトのゆっくり解説で紹介された X アカウント一覧です。解説文は会場・Web から生成された内容がサイト上に残り、シェア用ページへもリンクできます。",
};

function excerpt(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default async function YukkuriExplainedIndexPage() {
  const [total, rows] = await Promise.all([
    countYukkuriExplainedArchive(),
    listYukkuriExplainedArchive(PAGE_LIMIT),
  ]);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <nav className={styles.breadcrumb} aria-label="パンくず">
          <Link href="/">ホーム</Link>
          <span aria-hidden="true">›</span>
          <Link href="/chokaigi">超会議LP</Link>
          <span aria-hidden="true">›</span>
          <span>ゆっくり解説アーカイブ</span>
        </nav>
        <h1 className={styles.title}>ゆっくり解説アーカイブ</h1>
        <p className={styles.lead}>
          ニコニコ超会議向けサイトの「ゆっくり解説」で、りんく・こん太・たぬ姉が紹介した X
          アカウントの一覧です。各カードから本文・シェア用リンクを開けます。
        </p>
        <div className={styles.metaRow}>
          <span className={styles.metaChip}>
            掲載 <strong>{total.toLocaleString("ja-JP")}</strong> アカウント
          </span>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className={styles.note}>
          まだアーカイブがありません。LP 上部の「ゆっくり解説してもらう」から生成すると、ここに順次反映されます（DB
          マイグレーション後の新規分から蓄積されます）。
        </p>
      ) : (
        <>
          <ul className={styles.list}>
            {rows.map((row) => (
              <li key={row.x_handle}>
                <Link
                  href={`/yukkuri/explained/${encodeURIComponent(row.x_handle)}`}
                  className={styles.cardLink}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.cardHandle}>@{row.x_handle}</span>
                    {row.display_name ? (
                      <span className={styles.cardName}>{row.display_name}</span>
                    ) : null}
                  </div>
                  <p className={styles.cardExcerpt}>{excerpt(row.rink)}</p>
                  <div className={styles.cardMeta}>
                    更新 {row.updated_at}
                    {row.source ? ` · ${row.source}` : ""}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {total > PAGE_LIMIT ? (
            <p className={styles.note}>
              直近 {PAGE_LIMIT.toLocaleString("ja-JP")}{" "}
              件を表示しています。全件数は上記のとおりです。
            </p>
          ) : null}
        </>
      )}

      <p className={styles.note}>
        <Link href="/chokaigi">← 超会議LPへ戻る</Link>
        {" · "}
        <Link href="/creators">都道府県別クリエイター一覧</Link>
      </p>
    </main>
  );
}
