import {
  YUKKURI_DIALOGUE_LEAD,
  YUKKURI_DIALOGUE_TITLE,
  YUKKURI_MAIN_SCRIPT,
  YUKKURI_SPEAKER_META,
  type YukkuriSpeakerId,
} from "./lp-content";
import styles from "./chokaigi.module.css";
import { YUKKURI_AVATAR_MOTION_CSS } from "./yukkuri-motion-style";

const AVATAR_MOTION: Record<YukkuriSpeakerId, string> = {
  rink: "yukkuri-chokaigi-mot--rink",
  konta: "yukkuri-chokaigi-mot--konta",
  tanunee: "yukkuri-chokaigi-mot--tanunee",
};

export function YukkuriDialogue() {
  return (
    <section
      className={`${styles.section} ${styles.yukkuriSection}`}
      aria-labelledby="yukkuri-dialogue-heading"
    >
      <h2 id="yukkuri-dialogue-heading">{YUKKURI_DIALOGUE_TITLE}</h2>
      <p className={styles.sectionLead}>{YUKKURI_DIALOGUE_LEAD}</p>
      <style
        // eslint-disable-next-line react/no-danger -- キーフレームを確実に DOM へ注入（グローバル CSS の読み込み差異を回避）
        dangerouslySetInnerHTML={{ __html: YUKKURI_AVATAR_MOTION_CSS }}
      />
      <div
        className={styles.yukkuriScript}
        role="region"
        aria-label="りんく・こん太・たぬ姉の掛け合い（ゆっくり風）"
      >
        {YUKKURI_MAIN_SCRIPT.map((line, i) => {
          const meta = YUKKURI_SPEAKER_META[line.speaker];
          const reverse = i % 2 === 1;
          return (
            <article
              key={i}
              className={`${styles.yukkuriRow} ${reverse ? styles.yukkuriRowReverse : ""}`}
              data-speaker={line.speaker}
            >
              <div className={styles.yukkuriAvatarBlock}>
                <div className={styles.yukkuriAvatarInner}>
                  <div
                    className={`${styles.yukkuriAvatarMotion} ${AVATAR_MOTION[line.speaker]}`}
                    role="img"
                    aria-label={meta.imageAlt}
                    style={{ backgroundImage: `url("${meta.imageSrc}")` }}
                  />
                </div>
                <span className={styles.yukkuriNameBadge}>{meta.label}</span>
              </div>
              <div className={styles.yukkuriBubble}>
                <p className={styles.yukkuriBubbleText}>{line.text}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
