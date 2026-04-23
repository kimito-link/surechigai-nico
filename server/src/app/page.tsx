import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Suspense } from "react";
import {
  GUIDES,
  HOME_HERO_BADGE,
  HOME_HERO_LEAD,
  HOME_USAGE_HIGHLIGHTS,
  HOME_USAGE_SECTION_INTRO,
  HOME_USAGE_SECTION_TITLE,
  LP_DESCRIPTION,
  LP_TITLE,
  USAGE_SECTION_HEADING_ID,
} from "./chokaigi/lp-content";
import { HomeVenueWander } from "./HomeVenueWander";
import { PrefetchChokaigiWhenVisible } from "./components/PrefetchChokaigiRoutes";
import HeroStats from "./components/HeroStats";
import LiveParticipants from "./components/LiveParticipants";
import { CreatorCrossSearch } from "./chokaigi/CreatorCrossSearch";
import { YukkuriHero } from "./chokaigi/YukkuriHero";
import styles from "./page.module.css";

// HeroStats（Redis/MySQL からカウンタを取得）を毎リクエスト再計算するため、
// ページ自体を明示的に動的化する。SiteHeader の headers() 呼び出しに暗黙依存していた
// 従来挙動は、ヘッダー改修で容易に崩れるため。router.refresh() で確実に数字が更新される。
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: LP_TITLE,
  description: LP_DESCRIPTION,
  openGraph: {
    title: LP_TITLE,
    description: LP_DESCRIPTION,
    locale: "ja_JP",
    type: "website",
    siteName: "すれちがいライト",
  },
};

const AVATAR_FRAME: [string, string][] = [
  [styles.avatarFrameRink, styles.avatarNameRink],
  [styles.avatarFrameKonta, styles.avatarNameKonta],
  [styles.avatarFrameTanunee, styles.avatarNameTanunee],
];

export default function Home() {
  return (
    <main className={styles.shell}>
      {/* 最上部の統計バンド：どの画面サイズでもファーストビューに収まる高さに抑える */}
      <div className={styles.heroStatsBand} aria-label="参加状況サマリー">
        <Suspense fallback={null}>
          <HeroStats />
        </Suspense>
      </div>
      <div className={styles.homeYukkuriHeroWrap}>
        <YukkuriHero />
      </div>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.logoRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/chokaigi/logos/kimito-link-logo.png"
                alt="kimito-link"
                className={styles.heroLogo}
              />
            </div>
            <span className={styles.badge}>
              <span className={styles.badgeDot} aria-hidden="true" />
              {HOME_HERO_BADGE}
            </span>
            <h1 className={styles.title}>すれちがいライト</h1>
            <p className={styles.lead}>{HOME_HERO_LEAD}</p>
            <PrefetchChokaigiWhenVisible>
              <div className={styles.ctaRow}>
                <Link href="/chokaigi" className={styles.ctaPrimary}>
                  ニコニコ超会議 企画予告（LP）を見る
                </Link>
                <a
                  href="https://kimito-link.com/"
                  className={styles.ctaGhost}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  kimito-link 公式
                </a>
              </div>
            </PrefetchChokaigiWhenVisible>
          </div>

          <div className={styles.heroStage}>
            <div className={styles.avatarRow}>
              {GUIDES.map((g, i) => {
                const [frameClass, nameClass] = AVATAR_FRAME[i] ?? ["", ""];
                return (
                  <a
                    key={g.name}
                    href={g.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.avatarCard}
                    aria-label={`${g.name}のキャラ紹介（kimito-link）`}
                  >
                    <div className={styles.avatarFrame}>
                      <div
                        className={`${styles.avatarFrameFloat} ${frameClass}`}
                        style={{ backgroundImage: `url("${g.imageSrc}")` }}
                        aria-hidden
                      />
                    </div>
                    <span className={`${styles.avatarName} ${nameClass}`}>
                      {g.name}
                    </span>
                  </a>
                );
              })}
            </div>
            <p className={styles.stageCaption}>
              君斗りんくのゆっくり3人組 — タップでプロフィールへ
            </p>
          </div>
        </div>
        <HomeVenueWander />
      </header>

      <section className={styles.section} aria-labelledby="live-participants-heading">
        <div className={styles.sectionInner}>
          <h2 id="live-participants-heading" className={styles.sectionTitle}>
            いま参加中のひと
          </h2>
          <Suspense fallback={null}>
            <LiveParticipants />
          </Suspense>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <Suspense fallback={null}>
            <CreatorCrossSearch />
          </Suspense>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="home-usage-heading">
        <div className={styles.sectionInner}>
          <h2 id="home-usage-heading" className={styles.sectionTitle}>
            {HOME_USAGE_SECTION_TITLE}
          </h2>
          <p className={styles.sectionLead}>{HOME_USAGE_SECTION_INTRO}</p>
          <ul className={styles.usageList}>
            {HOME_USAGE_HIGHLIGHTS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className={styles.usageMore}>
            <Link href={`/chokaigi#${USAGE_SECTION_HEADING_ID}`}>
              すれ違い通信の使いかた（詳しい流れ）は超会議ページへ
            </Link>
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="guides-heading">
        <div className={styles.sectionInner}>
          <h2 id="guides-heading" className={styles.sectionTitle}>
            3人のゆっくりガイド
          </h2>
          <p className={styles.sectionLead}>
            アプリ内でも同じトーンで案内する想定のキャラクターです。世界観は
            kimito-link に準拠しています。
          </p>
          <div className={styles.cardGrid}>
            {GUIDES.map((g) => (
              <article key={g.name} className={styles.detailCard}>
                <a
                  href={g.profileUrl}
                  className={styles.detailCardAvatar}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${g.name}のキャラ紹介（kimito-link）へ`}
                >
                  <Image
                    src={g.imageSrc}
                    alt=""
                    width={160}
                    height={160}
                    className={styles.detailCardAvatarImg}
                    sizes="(max-width: 640px) 120px, 160px"
                  />
                </a>
                <h3 className={styles.cardName}>{g.name}</h3>
                <p className={styles.detailRole}>{g.role}</p>
                <p className={styles.detailBody}>{g.body}</p>
                <a
                  href={g.profileUrl}
                  className={styles.detailLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  キャラ紹介を見る →
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          <Link href="/chokaigi">/chokaigi</Link>
          {" · "}
          <a href="https://kimito-link.com/characters/" target="_blank" rel="noopener noreferrer">
            キャラクター一覧
          </a>
        </p>
      </footer>
    </main>
  );
}
