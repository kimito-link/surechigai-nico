"use client";

import { useEffect, useId, useState } from "react";
import styles from "./chokaigi.module.css";
import { CharacterTip } from "./CharacterTip";
import { XLogoIcon } from "./XLogoIcon";
import tipStyles from "./YuriponThanksXListItem.module.css";
import { SPECIAL_THANKS_POKKURI_X_HREF } from "./special-thanks-links";

const RINK_MESSAGE =
  "ぽっくりさん、いつもいいねくれるの、ほんとうにありがとう。応援、ちゃんと届いてるよ。";

const KONTA_MESSAGE =
  "リプも丁寧で、こっちの気持ちが返ってくる感じがするんだ。だから「つながってる」ってわかる。";

const TANUNEE_MESSAGE =
  "配信を覗きに行くと、だいたいタイミング悪くてもう終わってるのだ……。開いたらアーカイブ、みたいなの、あるあるなのだ。";

export function PokkuriThanksXListItem() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <li className={`${styles.footerThanksItem} ${tipStyles.li}`}>
      <button
        type="button"
        className={styles.footerThanksLink}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <XLogoIcon className={styles.footerThanksLinkIcon} />
        <span className={styles.footerThanksLinkLabel}>@pokkuri0803</span>
      </button>
      {open ? (
        <div
          id={panelId}
          className={tipStyles.pop}
          role="region"
          aria-label="ぽっくりさんへ、ゆっくり3人より"
        >
          <CharacterTip
            character="rink"
            message={RINK_MESSAGE}
            className={tipStyles.tipTight}
          />
          <CharacterTip
            character="konta"
            message={KONTA_MESSAGE}
            position="right"
            className={tipStyles.tipTightMid}
          />
          <CharacterTip
            character="tanunee"
            message={TANUNEE_MESSAGE}
            className={tipStyles.tipTightMid}
          />
          <div className={tipStyles.popFooter}>
            <a
              href={SPECIAL_THANKS_POKKURI_X_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={tipStyles.xOpen}
            >
              ぽっくりさんの X を開く →
            </a>
            <button type="button" className={tipStyles.closeBtn} onClick={() => setOpen(false)}>
              閉じる
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
