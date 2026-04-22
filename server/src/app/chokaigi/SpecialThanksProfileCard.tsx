import YukkuriIntroLink from "@/app/components/YukkuriIntroLink";
import { getYukkuriDialogue } from "@/app/components/yukkuri-service-dialogues";
import type { SpecialThanksProfile } from "./special-thanks-links";
import { XLogoIcon } from "./XLogoIcon";
import styles from "./SpecialThanksProfileCard.module.css";

type Props = {
  profile: SpecialThanksProfile;
  /** ヘッダ用の見出しレベル。LP では h3、詳細ページでは h2 を使いたいため可変。 */
  headingLevel?: "h2" | "h3";
  className?: string;
};

/**
 * Special Thanks の方々を 1 人 1 枚のカードで個別紹介するためのコンポーネント。
 * - `profile.highlight` が true のとき、ロゴ制作の Soletta さん専用の
 *   リッチな装飾（紫〜ピンクのグラデ、ややボリュームのある余白）に切り替わる。
 * - サイトリンク／X バッジどちらも、`getYukkuriDialogue(href)` で対応する解説が
 *   あれば YukkuriIntroLink を通して「ゆっくり解説モーダル → 外部遷移」に
 *   なる。公式サイトを持たず X だけの方でも、カードのトンマナを保ったまま
 *   バッジから同じ体験を提供できる。
 */

export function SpecialThanksProfileCard({
  profile,
  headingLevel = "h3",
  className,
}: Props) {
  const cardClass = [
    styles.card,
    profile.highlight ? styles.cardHighlight : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const headingId = `special-thanks-profile-${profile.id}`;
  const Heading = headingLevel;

  return (
    <section className={cardClass} aria-labelledby={headingId}>
      {profile.ribbon ? (
        <span className={styles.ribbon}>{profile.ribbon}</span>
      ) : null}
      <Heading id={headingId} className={styles.name}>
        {profile.name}
      </Heading>
      {profile.title ? <p className={styles.title}>{profile.title}</p> : null}

      <div className={styles.intro}>
        {profile.intro.map((para, i) => (
          <p key={i} className={styles.introPara}>
            {para}
          </p>
        ))}
      </div>

      {profile.sites && profile.sites.length > 0 ? (
        <ul className={styles.sitesList}>
          {profile.sites.map((site) => {
            const dialogue = getYukkuriDialogue(site.href);
            const content = (
              <>
                <span className={styles.siteName}>{site.label}</span>
                {site.tagline ? (
                  <span className={styles.siteTagline}>{site.tagline}</span>
                ) : null}
              </>
            );
            return (
              <li key={site.href}>
                {dialogue ? (
                  <YukkuriIntroLink
                    href={site.href}
                    className={styles.siteLink}
                    title={dialogue.title}
                    lines={dialogue.lines}
                    ctaLabel={dialogue.ctaLabel}
                    ctaHref={dialogue.ctaHref}
                  >
                    {content}
                  </YukkuriIntroLink>
                ) : (
                  <a
                    href={site.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.siteLink}
                  >
                    {content}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {profile.xHandles && profile.xHandles.length > 0 ? (
        <div className={styles.xRow}>
          {profile.xHandles.map((handle) => {
            const dialogue = getYukkuriDialogue(handle.href);
            const content = (
              <>
                <XLogoIcon className={styles.xBadgeIcon} />
                <span className={styles.xBadgeLabel}>{handle.label}</span>
              </>
            );
            if (dialogue) {
              return (
                <YukkuriIntroLink
                  key={handle.href}
                  href={handle.href}
                  className={styles.xBadge}
                  title={dialogue.title}
                  lines={dialogue.lines}
                  ctaLabel={dialogue.ctaLabel}
                  ctaHref={dialogue.ctaHref}
                >
                  {content}
                </YukkuriIntroLink>
              );
            }
            return (
              <a
                key={handle.href}
                href={handle.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.xBadge}
              >
                {content}
              </a>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
