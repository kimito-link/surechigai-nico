import Link from "next/link";
import type { Metadata } from "next";
import styles from "../chokaigi.module.css";
import { SPECIAL_THANKS_LINKS } from "../special-thanks-links";

export const metadata: Metadata = {
  title: "Special Thanks 一覧 | すれちがいライト",
  description: "Special Thanks のリンク一覧ページです。",
};

const isXAccountLink = (href: string) =>
  href.startsWith("https://x.com/") || href.startsWith("http://x.com/");

export default function SpecialThanksPage() {
  const websiteLinks = SPECIAL_THANKS_LINKS.filter((link) => !isXAccountLink(link.href));
  const idLinks = SPECIAL_THANKS_LINKS.filter((link) => isXAccountLink(link.href));

  return (
    <main className={styles.shell}>
      <article>
        <section className={styles.section} aria-labelledby="special-thanks-list-heading">
          <h1 id="special-thanks-list-heading" className={styles.specialThanksPageTitle}>
            Special Thanks 一覧
          </h1>
          <p className={styles.sectionLead}>
            プログラムの提供と公開に感謝します。星野ロミさん、ありがとうございます。
          </p>

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
