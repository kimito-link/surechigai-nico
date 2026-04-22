import type { Metadata } from "next";
import Link from "next/link";
import { getPrefectureSummaries, type PrefectureSummary } from "@/lib/creators";
import styles from "./creators.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "都道府県別クリエイター一覧 | すれちがいライト",
  description:
    "これまでに「すれちがいライト」に参加された方を都道府県ごとにまとめた一覧です。47都道府県すべてのクリエイターが集うことを目指しています。",
};

const REGION_ORDER = [
  "北海道",
  "東北",
  "関東",
  "中部",
  "近畿",
  "中国",
  "四国",
  "九州",
  "沖縄",
] as const;

type RegionGroup = {
  region: string;
  items: PrefectureSummary[];
};

function groupByRegion(list: PrefectureSummary[]): RegionGroup[] {
  const map = new Map<string, PrefectureSummary[]>();
  for (const r of REGION_ORDER) map.set(r, []);
  for (const p of list) {
    const bucket = map.get(p.region);
    if (bucket) bucket.push(p);
  }
  return REGION_ORDER.map((r) => ({
    region: r,
    items: map.get(r) ?? [],
  })).filter((g) => g.items.length > 0);
}

export default async function CreatorsIndexPage() {
  const {
    prefectures,
    totalCreators,
    totalLive,
    unknownLocationCount,
    grandTotal,
  } = await getPrefectureSummaries();
  const groups = groupByRegion(prefectures);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <nav className={styles.breadcrumb} aria-label="パンくず">
          <Link href="/">ホーム</Link>
          <span>›</span>
          <span>都道府県別クリエイター一覧</span>
        </nav>
        <h1 className={styles.title}>都道府県別クリエイター一覧</h1>
        <p className={styles.lead}>
          これまでに「すれちがいライト」に参加された方を、都道府県ごとにまとめています。
          転勤などで複数の県にお住まいになった方は、どちらの県にも表示されます。
          47都道府県すべてのクリエイターが集まる日を目指して。
        </p>
        <div className={styles.metaRow}>
          <span className={styles.metaChip}>
            参加者 <strong>{grandTotal.toLocaleString("ja-JP")}</strong> 人
          </span>
          {unknownLocationCount > 0 && (
            <span className={styles.metaChip}>
              位置情報マップ上 <strong>{totalCreators.toLocaleString("ja-JP")}</strong> 人
              {" / "}未送信 <strong>{unknownLocationCount.toLocaleString("ja-JP")}</strong> 人
            </span>
          )}
          {totalLive > 0 && (
            <span className={`${styles.metaChip} ${styles.metaChipLive}`}>
              <span className={styles.liveDot} aria-hidden="true" />{" "}
              いま <strong>{totalLive}</strong> 人オンライン
            </span>
          )}
        </div>
      </header>

      {groups.map((group) => (
        <section key={group.region} className={styles.regionBlock}>
          <h2 className={styles.regionHeading}>{group.region}</h2>
          <div className={styles.prefectureGrid}>
            {group.items.map((p) => {
              const isEmpty = p.count === 0;
              const className = `${styles.prefectureCard} ${
                isEmpty ? styles.prefectureCardEmpty : ""
              }`;
              return (
                <Link
                  key={p.name}
                  href={`/creators/${encodeURIComponent(p.name)}`}
                  className={className}
                  aria-label={`${p.name} の参加クリエイター一覧`}
                >
                  <span className={styles.prefectureName}>{p.name}</span>
                  <span className={styles.prefectureCount}>
                    <span className={styles.prefectureCountNum}>
                      {p.count.toLocaleString("ja-JP")}
                    </span>
                    人
                    {p.liveCount > 0 && (
                      <>
                        <span
                          className={styles.liveDot}
                          aria-hidden="true"
                        />
                        <span className={styles.liveLabel}>
                          {p.liveCount} LIVE
                        </span>
                      </>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {unknownLocationCount > 0 && (
        <section
          className={styles.regionBlock}
          aria-labelledby="unknown-location-heading"
        >
          <h2
            id="unknown-location-heading"
            className={styles.regionHeading}
          >
            まだ位置情報が届いていない参加者
          </h2>
          <div className={styles.prefectureGrid}>
            <div
              className={`${styles.prefectureCard} ${styles.prefectureCardEmpty}`}
              aria-label="位置情報未送信の参加者"
            >
              <span className={styles.prefectureName}>位置情報未送信</span>
              <span className={styles.prefectureCount}>
                <span className={styles.prefectureCountNum}>
                  {unknownLocationCount.toLocaleString("ja-JP")}
                </span>
                人
              </span>
            </div>
          </div>
          <p className={styles.regionNote}>
            すれちがいライトに登録済みですが、まだ一度も位置情報を送っていない参加者です。
            アプリを開いて位置情報を許可すると、お住まいの都道府県に表示されます。
          </p>
        </section>
      )}

      <div className={styles.backLinkRow}>
        <Link href="/" className={styles.backLink}>
          ← ホームに戻る
        </Link>
        <Link href="/app" className={styles.backLinkPrimary}>
          ダッシュボードへ
        </Link>
      </div>
    </main>
  );
}
