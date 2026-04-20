"use client";

import { GUIDES } from "./chokaigi/lp-content";
import styles from "./page.module.css";

const TRACK_CLASS = [
  styles.venueWanderTrackRink,
  styles.venueWanderTrackKonta,
  styles.venueWanderTrackTanunee,
] as const;

const BUBBLE_CLASS = [
  styles.venueWanderBubbleRink,
  styles.venueWanderBubbleKonta,
  styles.venueWanderBubbleTanunee,
] as const;

const SPEECH = ["どこかなー？", "あ、いたいた！", "すれちがった！"] as const;

/** トップヒーロー：会場をイメージした通路に3人がループ移動（示意） */
export function HomeVenueWander() {
  return (
    <div className={styles.venueWanderWrap}>
      <p className={styles.venueWanderLead} id="home-venue-wander-desc">
        会場内で<strong>すれちがう</strong>イメージ
      </p>
      <div
        className={styles.venueWander}
        role="img"
        aria-labelledby="home-venue-wander-desc"
      >
        <svg
          className={styles.venueWanderFloor}
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
            className={`${styles.venueWanderTrack} ${TRACK_CLASS[i] ?? ""}`}
          >
            <div
              className={styles.venueWanderSprite}
              style={{ backgroundImage: `url("${g.imageSrc}")` }}
              aria-hidden="true"
            />
            <span
              className={`${styles.venueWanderBubble} ${BUBBLE_CLASS[i] ?? ""}`}
              aria-hidden="true"
            >
              {SPEECH[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
