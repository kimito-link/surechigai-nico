import Link from "next/link";
import type { Metadata } from "next";
import styles from "../chokaigi.module.css";
import { SPECIAL_THANKS_LINKS } from "../special-thanks-links";

export const metadata: Metadata = {
  title: "Special Thanks 一覧 | すれちがいライト",
  description: "Special Thanks のリンク一覧ページです。",
};

export default function SpecialThanksPage() {
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
          <ul className={styles.footerThanksList}>
            {SPECIAL_THANKS_LINKS.map((link) => (
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
