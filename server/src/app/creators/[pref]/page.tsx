import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  VALID_PREFECTURE_NAMES,
  getCreatorsByPrefecture,
  type CreatorEntry,
} from "@/lib/creators";
import styles from "../creators.module.css";
import CreatorAvatar from "./CreatorAvatar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { pref: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { pref } = await params;
  const decoded = decodeURIComponent(pref);
  if (!VALID_PREFECTURE_NAMES.has(decoded)) {
    return { title: "都道府県が見つかりませんでした" };
  }
  return {
    title: `${decoded} のクリエイター一覧 | すれちがいライト`,
    description: `${decoded} から「すれちがいライト」にご参加された方の一覧です。`,
  };
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m} 分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 時間前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 日前`;
  const mon = Math.floor(d / 30);
  if (mon < 12) return `${mon} か月前`;
  const y = Math.floor(d / 365);
  return `${y} 年前`;
}

function CreatorRow({ c }: { c: CreatorEntry }) {
  const cls = `${styles.creatorCard} ${c.isLive ? styles.creatorCardLive : ""}`;
  const fallbackInitial = (c.nickname || c.twitterHandle || "?").slice(0, 1);
  const avatar = (
    <CreatorAvatar
      src={c.avatarUrl}
      alt={c.nickname}
      fallbackInitial={fallbackInitial}
      className={styles.avatar}
    />
  );
  const info = (
    <div className={styles.creatorInfo}>
      <span className={styles.creatorName}>{c.nickname}</span>
      {c.twitterHandle ? (
        <span className={styles.creatorHandle}>@{c.twitterHandle}</span>
      ) : null}
      <span className={styles.creatorMeta}>
        この県に最後に滞在: {formatRelative(c.lastSeenInPrefAt)}
      </span>
    </div>
  );
  const liveBadge = c.isLive ? (
    <span className={styles.liveBadge}>
      <span className={styles.liveDot} aria-hidden="true" />
      LIVE
    </span>
  ) : null;

  if (c.twitterHandle) {
    return (
      <a
        href={`https://x.com/${c.twitterHandle}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
      >
        {avatar}
        {info}
        {liveBadge}
      </a>
    );
  }
  return (
    <div className={cls}>
      {avatar}
      {info}
      {liveBadge}
    </div>
  );
}

export default async function PrefectureCreatorsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { pref } = await params;
  const decoded = decodeURIComponent(pref);

  if (!VALID_PREFECTURE_NAMES.has(decoded)) {
    notFound();
  }

  const { creators, total, liveCount } =
    await getCreatorsByPrefecture(decoded);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <nav className={styles.breadcrumb} aria-label="パンくず">
          <Link href="/">ホーム</Link>
          <span>›</span>
          <Link href="/creators">都道府県別</Link>
          <span>›</span>
          <span>{decoded}</span>
        </nav>
        <h1 className={styles.title}>
          {decoded} で参加しているクリエイター
        </h1>
        <p className={styles.lead}>
          これまでに「すれちがいライト」で{decoded}
          を訪れたことのある方の一覧です。転勤や旅行で一時的にいらした方も含まれます。
        </p>
        <div className={styles.metaRow}>
          <span className={styles.metaChip}>
            登録 <strong>{total.toLocaleString("ja-JP")}</strong> 人
          </span>
          {liveCount > 0 && (
            <span className={`${styles.metaChip} ${styles.metaChipLive}`}>
              <span className={styles.liveDot} aria-hidden="true" />{" "}
              いま <strong>{liveCount}</strong> 人オンライン
            </span>
          )}
        </div>
      </header>

      {creators.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateTitle}>
            まだ{decoded}からの参加者はいません
          </p>
          <p className={styles.emptyStateBody}>
            あなたが最初の参加者になれるかもしれません。
            ダッシュボードから位置情報を送ってみましょう。
          </p>
        </div>
      ) : (
        <div className={styles.creatorList}>
          {creators.map((c) => (
            <CreatorRow key={c.userId} c={c} />
          ))}
        </div>
      )}

      <div className={styles.backLinkRow}>
        <Link href="/creators" className={styles.backLink}>
          ← 都道府県別一覧に戻る
        </Link>
        <Link href="/app" className={styles.backLinkPrimary}>
          ダッシュボードへ
        </Link>
      </div>
    </main>
  );
}
