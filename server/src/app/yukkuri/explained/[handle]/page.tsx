import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getYukkuriExplainedArchive } from "@/lib/yukkuriExplainedArchive";
import { prefectureCodeToName } from "@/lib/prefectureCodes";
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
  // trim を先に行う。逆順だと「先頭空白 + @」の入力で `^@` が一致せず @ が残る。
  const decoded = decodeURIComponent(handle).trim().replace(/^@+/, "");
  const row = await getYukkuriExplainedArchive(decoded);
  if (!row) {
    return { title: "解説が見つかりませんでした | すれちがいライト" };
  }
  const title = `@${row.x_handle} のゆっくり解説（保存ページ）| すれちがいライト`;
  const description = `りんく・こん太・たぬ姉による @${row.x_handle} さんの紹介（アカウント別URL・保存済み）。${row.rink.slice(0, 80)}…`;
  const ogImage = yukkuriOgImageUrl(
    siteBase(),
    row.x_handle,
    {
      rink: row.rink,
      konta: row.konta,
      tanunee: row.tanunee,
    },
    {
      // シェアカード中央にアバターを円形で表示する。
      // avatar_url は X の pbs.twimg.com なので Edge ランタイムから fetch 可能。
      avatar: row.avatar_url,
      name: row.display_name,
    }
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

export default async function YukkuriExplainedDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle } = await params;
  // trim を先に行う。逆順だと「先頭空白 + @」の入力で `^@` が一致せず @ が残る。
  const decoded = decodeURIComponent(handle).trim().replace(/^@+/, "");
  const row = await getYukkuriExplainedArchive(decoded);
  if (!row) notFound();

  // CODEX-NEXT.md §2: users.location_visibility >= 2 のときだけ home_prefecture が返る。
  const prefName = prefectureCodeToName(row.home_prefecture ?? null);

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
        {(row.is_surechigai_member || prefName) && (
          <div className={styles.detailBadgeRow}>
            {row.is_surechigai_member && (
              <span className={styles.surechigaiBadge}>📍 すれちがい参加中</span>
            )}
            {prefName && (
              <span className={styles.prefectureBadge}>🏠 {prefName}から</span>
            )}
          </div>
        )}
      </header>

      <section className={styles.dialogueBlock} aria-label="ゆっくり解説の本文">
        {(
          [
            ["りんく", row.rink, styles.badgeRink, "/chokaigi/yukkuri/rink.png"],
            ["こん太", row.konta, styles.badgeKonta, "/chokaigi/yukkuri/konta.png"],
            ["たぬ姉", row.tanunee, styles.badgeTanunee, "/chokaigi/yukkuri/tanunee.png"],
          ] as const
        ).map(([label, text, badgeClass, avatar]) => (
          <div key={label} className={styles.dialogueRow}>
            {/* キャラアイコン（48×48 円形）: バッジだけでは誰が喋っているか分かりづらいので、
                LP の YukkuriHero と同じ 3 キャラの PNG をアーカイブにも揃える。 */}
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
        {/* 保存時ソース（openrouter / ollama / fallback_llm 等）は運営デバッグ用途のため
            ユーザー向けには表示しない。Admin ヘルス API で確認可能。 */}
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
