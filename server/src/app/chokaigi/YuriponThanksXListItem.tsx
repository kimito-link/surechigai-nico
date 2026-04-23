"use client";

import { useEffect, useId, useState } from "react";
import styles from "./chokaigi.module.css";
import { CharacterTip } from "./CharacterTip";
import { XLogoIcon } from "./XLogoIcon";
import yStyles from "./YuriponThanksXListItem.module.css";
import { SPECIAL_THANKS_YURIPON_X_HREF } from "./special-thanks-links";

const RINK_MESSAGE =
  "英語の勉強、ちゃんと積み上げてるの伝わってくるよ。毎日のコツコツ、ほんとにすごいと思う。";

const KONTA_MESSAGE =
  "有名とか無名とかより、いいねやリプをくれる人を大事にできるかどうか。そこが「応援」の芯だと思うんだ。";

const TANUNEE_MESSAGE =
  "だから“差”より先に、気持ちのほうが来てるのがうれしいのだー。それが応援って名前の気持ちなのだ。";

export function YuriponThanksXListItem() {
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
    <li className={`${styles.footerThanksItem} ${yStyles.li}`}>
      <button
        type="button"
        className={styles.footerThanksLink}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <XLogoIcon className={styles.footerThanksLinkIcon} />
        <span className={styles.footerThanksLinkLabel}>@yuripon7777</span>
      </button>
      {open ? (
        <div
          id={panelId}
          className={yStyles.pop}
          role="region"
          aria-label="ゆっくり3人より"
        >
          <CharacterTip
            character="rink"
            message={RINK_MESSAGE}
            className={yStyles.tipTight}
          />
          <CharacterTip
            character="konta"
            message={KONTA_MESSAGE}
            position="right"
            className={yStyles.tipTightMid}
          />
          <CharacterTip
            character="tanunee"
            message={TANUNEE_MESSAGE}
            className={yStyles.tipTightMid}
          />
          <div className={yStyles.popFooter}>
            <a
              href={SPECIAL_THANKS_YURIPON_X_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={yStyles.xOpen}
            >
              金里さんの X を開く →
            </a>
            <button type="button" className={yStyles.closeBtn} onClick={() => setOpen(false)}>
              閉じる
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
