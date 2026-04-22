import Link from "next/link";
import type { Metadata } from "next";
import styles from "../chokaigi.module.css";
import { SPECIAL_THANKS_LINKS } from "../special-thanks-links";
import { THIRD_PARTY_CREDITS } from "../third-party-credits";
import { RomiProfileCard } from "../RomiProfileCard";

export const metadata: Metadata = {
  title: "Special Thanks・クレジット | すれちがいライト",
  description:
    "Special Thanks のリンク一覧と、本アプリで利用している第三者素材（地図・音声・ライブラリ等）のクレジット・帰属表示ページです。",
};

const CREDIT_CATEGORY_HEADINGS: Record<
  (typeof THIRD_PARTY_CREDITS)[number]["category"],
  string
> = {
  map: "地図・地理データ",
  voice: "音声合成（VOICEVOX）",
  data: "データ・ライブラリ",
  character: "キャラクター・アートワーク",
  other: "その他",
};

const isXAccountLink = (href: string) =>
  href.startsWith("https://x.com/") || href.startsWith("http://x.com/");

export default function SpecialThanksPage() {
  const websiteLinks = SPECIAL_THANKS_LINKS.filter((link) => !isXAccountLink(link.href));
  const idLinks = SPECIAL_THANKS_LINKS.filter((link) => isXAccountLink(link.href));

  const creditCategories = (
    Object.keys(CREDIT_CATEGORY_HEADINGS) as (keyof typeof CREDIT_CATEGORY_HEADINGS)[]
  )
    .map((category) => ({
      category,
      heading: CREDIT_CATEGORY_HEADINGS[category],
      items: THIRD_PARTY_CREDITS.filter((credit) => credit.category === category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <main className={styles.shell}>
      <article>
        <section className={styles.section} aria-labelledby="special-thanks-list-heading">
          <h1 id="special-thanks-list-heading" className={styles.specialThanksPageTitle}>
            Special Thanks・クレジット
          </h1>
          <p className={styles.sectionLead}>
            プログラムの提供と公開に感謝します。星野ロミさん、ありがとうございます。
          </p>

          <RomiProfileCard ribbonText="このアプリをつくる、きっかけをくださった方" />

          <section className={styles.specialThanksGroup} aria-labelledby="special-thanks-web-heading">
            <h2 id="special-thanks-web-heading" className={styles.specialThanksGroupHeading}>
              WEBサイト
            </h2>
            <ul className={styles.footerThanksList}>
              {websiteLinks.map((link) => (
                <li key={link.href} className={styles.footerThanksItem}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.footerThanksLink}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.specialThanksGroup} aria-labelledby="special-thanks-id-heading">
            <h2 id="special-thanks-id-heading" className={styles.specialThanksGroupHeading}>
              X ID
            </h2>
            <ul className={styles.footerThanksList}>
              {idLinks.map((link) => (
                <li key={link.href} className={styles.footerThanksItem}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.footerThanksLink}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section
            className={styles.specialThanksGroup}
            aria-labelledby="special-thanks-credits-heading"
          >
            <h2
              id="special-thanks-credits-heading"
              className={styles.specialThanksGroupHeading}
            >
              クレジット（外部素材・ライブラリ）
            </h2>
            <p className={styles.creditsIntro}>
              本アプリでは、以下の第三者素材・ライブラリを利用しています。
              ライセンス条件に基づき、帰属表示を行います。
            </p>

            {creditCategories.map((group) => (
              <div key={group.category} className={styles.creditsGroup}>
                <h3 className={styles.creditsGroupHeading}>{group.heading}</h3>
                <ul className={styles.creditsList}>
                  {group.items.map((credit) => (
                    <li key={credit.label} className={styles.creditsItem}>
                      <div className={styles.creditsItemHeader}>
                        {credit.href ? (
                          <a
                            href={credit.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.creditsItemTitle}
                          >
                            {credit.label}
                          </a>
                        ) : (
                          <span className={styles.creditsItemTitle}>
                            {credit.label}
                          </span>
                        )}
                        <span className={styles.creditsLicense}>
                          {credit.licenseHref ? (
                            <a
                              href={credit.licenseHref}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {credit.license}
                            </a>
                          ) : (
                            credit.license
                          )}
                        </span>
                      </div>
                      {credit.usedFor && (
                        <p className={styles.creditsUsage}>利用箇所: {credit.usedFor}</p>
                      )}
                      {credit.note && (
                        <p className={styles.creditsNote}>{credit.note}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <div className={styles.specialThanksBackRow}>
            <Link href="/chokaigi#special-thanks-heading" className={styles.footerThanksMoreButton}>
              LPに戻る
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
