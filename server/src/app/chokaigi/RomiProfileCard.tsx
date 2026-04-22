import YukkuriIntroLink from "@/app/components/YukkuriIntroLink";
import { getYukkuriDialogue } from "@/app/components/yukkuri-service-dialogues";
import { ROMI_PROFILE } from "./special-thanks-links";
import { XLogoIcon } from "./XLogoIcon";
import styles from "./RomiProfileCard.module.css";

type Props = {
  className?: string;
  ribbonText?: string;
};

export function RomiProfileCard({
  className,
  ribbonText = "このアプリを生んだ、きっかけの方",
}: Props) {
  return (
    <section
      className={`${styles.card}${className ? ` ${className}` : ""}`}
      aria-labelledby="romi-profile-heading"
    >
      <span className={styles.ribbon}>🙏 {ribbonText}</span>
      <h2 id="romi-profile-heading" className={styles.name}>
        {ROMI_PROFILE.name}
      </h2>
      <p className={styles.intro}>{ROMI_PROFILE.intro}</p>

      <div className={styles.xRow}>
        {ROMI_PROFILE.xHandles.map((handle) => (
          <a
            key={handle.href}
            href={handle.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.xBadge}
          >
            <XLogoIcon className={styles.xBadgeIcon} />
            <span className={styles.xBadgeLabel}>{handle.label}</span>
          </a>
        ))}
      </div>

      <div className={styles.sitesTitle}>
        ✨ 星野ロミさんが手掛けた、偉大なサービスたち ✨
      </div>
      <ul className={styles.sitesList}>
        {ROMI_PROFILE.operatedSites.map((site) => {
          const dialogue = getYukkuriDialogue(site.href);
          const content = (
            <>
              <span className={styles.siteName}>{site.label}</span>
              <span className={styles.siteTagline}>{site.tagline}</span>
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
    </section>
  );
}
