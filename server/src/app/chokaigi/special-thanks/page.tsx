import Link from "next/link";
import type { Metadata } from "next";
import styles from "../chokaigi.module.css";
import {
  SPECIAL_THANKS_PROFILES,
  SPECIAL_THANKS_X_ONLY,
} from "../special-thanks-links";
import { THIRD_PARTY_CREDITS } from "../third-party-credits";
import { RomiProfileCard } from "../RomiProfileCard";
import { SpecialThanksProfileCard } from "../SpecialThanksProfileCard";
import { XLogoIcon } from "../XLogoIcon";

export const metadata: Metadata = {
  title: "Special Thanks・クレジット | すれちがいライト",
  description:
    "Special Thanks のみなさま（佐藤ゆうかさん／Soletta、大木ハルミさん、アフランカフェ、oto1to1 ほか）の個別紹介と、本アプリで利用している第三者素材（地図・音声・ライブラリ等）のクレジット・帰属表示ページです。",
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

export default function SpecialThanksPage() {
  const highlightProfiles = SPECIAL_THANKS_PROFILES.filter((p) => p.highlight);
  const normalProfiles = SPECIAL_THANKS_PROFILES.filter((p) => !p.highlight);

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
            本企画にご協力・応援いただいたみなさまを、ひとりずつご紹介します。
            そして、このアプリのベースとなるプログラムを公開してくださった星野ロミさん、
            ロゴを創ってくださった佐藤ゆうかさん（Soletta）、本当にありがとうございます。
          </p>

          <RomiProfileCard ribbonText="このアプリをつくる、きっかけをくださった方" />

          {highlightProfiles.length > 0 ? (
            <section
              className={styles.specialThanksGroup}
              aria-labelledby="special-thanks-highlight-heading"
            >
              <h2
                id="special-thanks-highlight-heading"
                className={styles.specialThanksGroupHeading}
              >
                ロゴとブランドの原点
              </h2>
              <div className={styles.thanksHighlight}>
                {highlightProfiles.map((profile) => (
                  <SpecialThanksProfileCard
                    key={profile.id}
                    profile={profile}
                    headingLevel="h3"
                  />
                ))}
              </div>
            </section>
          ) : null}

          {normalProfiles.length > 0 ? (
            <section
              className={styles.specialThanksGroup}
              aria-labelledby="special-thanks-profiles-heading"
            >
              <h2
                id="special-thanks-profiles-heading"
                className={styles.specialThanksGroupHeading}
              >
                ご協力・応援いただいているみなさま
              </h2>
              <div className={styles.thanksProfileGrid}>
                {normalProfiles.map((profile) => (
                  <SpecialThanksProfileCard
                    key={profile.id}
                    profile={profile}
                    headingLevel="h3"
                  />
                ))}
              </div>
            </section>
          ) : null}

          {SPECIAL_THANKS_X_ONLY.length > 0 ? (
            <section
              className={styles.specialThanksGroup}
              aria-labelledby="special-thanks-id-heading"
            >
              <h2
                id="special-thanks-id-heading"
                className={styles.specialThanksGroupHeading}
              >
                X でご応援いただいているみなさま
              </h2>
              <ul className={styles.footerThanksList}>
                {SPECIAL_THANKS_X_ONLY.map((link) => (
                  <li key={link.href} className={styles.footerThanksItem}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.footerThanksLink}
                    >
                      <XLogoIcon className={styles.footerThanksLinkIcon} />
                      <span className={styles.footerThanksLinkLabel}>
                        {link.label}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

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
