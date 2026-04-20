"use client";

import { GUIDES } from "./lp-content";
import styles from "./chokaigi.module.css";

const SPEECH = ["どこかなー？", "あ、いたいた！", "すれちがった！"] as const;

/** 会場内で3人がすれちがうイメージ（示意） */
export function VenueWanderMini() {
  return (
    <div className={styles.venueWanderMini}>
      <div
        className={styles.venueWanderMiniMap}
        role="img"
        aria-label="会場内ですれちがうイメージ"
      >
        <svg
          className={styles.venueWanderMiniSvg}
          viewBox="0 0 100 56"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <rect
            x="4"
            y="4"
            width="92"
            height="48"
            fill="none"
            stroke="rgba(88,62,28,0.18)"
            strokeWidth="1.5"
            rx="2"
          />
          <path
            d="M 16 44 L 84 44 M 16 28 L 72 28 M 44 12 L 44 44 M 72 12 L 72 28 M 28 12 L 72 12"
            fill="none"
            stroke="rgba(37,93,155,0.15)"
            strokeWidth="1.2"
            strokeLinecap="square"
          />
          <rect
            x="52"
            y="16"
            width="14"
            height="10"
            fill="rgba(201,142,43,0.08)"
            stroke="rgba(201,142,43,0.15)"
            strokeWidth="0.5"
            rx="1"
          />
          <rect
            x="18"
            y="16"
            width="18"
            height="10"
            fill="rgba(37,93,155,0.05)"
            stroke="rgba(37,93,155,0.12)"
            strokeWidth="0.5"
            rx="1"
          />
        </svg>
        {GUIDES.map((g, i) => (
          <div
            key={g.name}
            className={`${styles.venueWanderMiniTrack} ${styles[`venueWanderMiniTrack${i + 1}`]}`}
          >
            <div
              className={styles.venueWanderMiniSprite}
              style={{ backgroundImage: `url("${g.imageSrc}")` }}
              aria-hidden="true"
            />
            <span
              className={`${styles.venueWanderMiniBubble} ${styles[`venueWanderMiniBubble${i + 1}`]}`}
              aria-hidden="true"
            >
              {SPEECH[i]}
            </span>
          </div>
        ))}
      </div>
      <p className={styles.venueWanderMiniCaption}>
        会場内で<strong>すれちがう</strong>イメージ
      </p>
    </div>
  );
}
