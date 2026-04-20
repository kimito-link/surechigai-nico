import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  GUIDES,
  HOME_USAGE_HIGHLIGHTS,
  HOME_USAGE_SECTION_INTRO,
  HOME_USAGE_SECTION_TITLE,
  LP_DESCRIPTION,
  LP_TITLE,
  USAGE_SECTION_HEADING_ID,
} from "./chokaigi/lp-content";
import styles from "./page.module.css";

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
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.badge}>
              <span className={styles.badgeDot} aria-hidden="true" />
              API サーバー稼働中
            </span>
            <h1 className={styles.title}>すれちがいライト</h1>
            <p className={styles.lead}>
              会場ですれ違った縁を、匿名で短くつなぐアプリの API
              サーバーです。ニコニコ超会議向けの企画予告ページでは、りんく・こん太・たぬ姉がゆっくりガイドします。
            </p>
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
          </div>

          <div className={styles.heroStage} aria-hidden="false">
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
                    <div className={`${styles.avatarFrame} ${frameClass}`}>
                      <Image
                        src={g.imageSrc}
                        alt=""
                        width={140}
                        height={180}
                        sizes="(max-width: 639px) 28vw, 140px"
                        className={styles.avatarImg}
                        priority={i === 0}
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
      </header>

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
