"use client";

import styles from "./chokaigi.module.css";
import {
  MAZE_VIEW,
  VENUE_MAZE_TOPOLOGY_NOTE,
  WALKWAY_CENTER_SEGMENTS,
  pelletsAlongSegments,
} from "./venue-maze-topology";

/** lp-content の GUIDES と同じパス（クライアントから lp-content 丸ごと読み込まない：HMR/チャンク不整合回避） */
const WANDER_GUIDE_SPRITES = [
  { name: "りんく", imageSrc: "/chokaigi/yukkuri/rink.png" },
  { name: "こん太", imageSrc: "/chokaigi/yukkuri/konta.png" },
  { name: "たぬ姉", imageSrc: "/chokaigi/yukkuri/tanunee.png" },
] as const;

/** 会場イメージに合わせたセリフ（上の箇条書きとトーンを揃える） */
const SPEECH = ["どこ？", "あ、いたいた！", "すれちがった！"] as const;

const PELLETS = pelletsAlongSegments(WALKWAY_CENTER_SEGMENTS, 3.2);

/**
 * 幕張メッセ周辺のニコニコ超会議会場イメージ（示意）。
 * 公式の2階歩行者動線（複数連絡口）を迷路として簡略化し、パックマン風に表現。
 * 詳細は公式PDF・会場掲示を優先してください。
 */
export function VenueWanderMini() {
  const vb = `${MAZE_VIEW.w} ${MAZE_VIEW.h}`;

  return (
    <div className={styles.venueWanderMini}>
      <div
        className={styles.venueWanderMiniMap}
        role="img"
        aria-label="幕張メッセ周辺の会場イメージ。国際展示場ホール1から8、9から11、幕張イベントホールをつなぐ2階歩行者動線をパックマン風の迷路として示意し、3人のキャラクターが通路を移動する様子です。"
      >
        <svg
          className={styles.venueWanderMiniSvg}
          viewBox={`0 0 ${vb}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="vm-floor" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#070d18" />
              <stop offset="100%" stopColor="#030810" />
            </linearGradient>
            <linearGradient id="vm-wall" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <filter id="vm-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect
            x="0"
            y="0"
            width={MAZE_VIEW.w}
            height={MAZE_VIEW.h}
            fill="url(#vm-floor)"
          />

          {/* メイン棟 H8→H1（壁で区切られた「部屋」） */}
          <text
            x="50"
            y="6.5"
            textAnchor="middle"
            fill="#93c5fd"
            fontSize="3"
            fontWeight={700}
            fontFamily="system-ui, sans-serif"
          >
            国際展示場 HALL 1〜8（メイン棟・示意）
          </text>
          {[8, 7, 6, 5, 4, 3, 2, 1].map((n, i) => {
            const slot = 11.2;
            const hx = 4.5 + i * slot;
            return (
              <g key={n}>
                <rect
                  x={hx}
                  y="8.5"
                  width={slot - 0.55}
                  height="13"
                  rx="1"
                  fill="#0f172a"
                  stroke="url(#vm-wall)"
                  strokeWidth="0.55"
                  filter="url(#vm-glow)"
                />
                <text
                  x={hx + (slot - 0.55) / 2}
                  y="16.8"
                  textAnchor="middle"
                  fill="#fde68a"
                  fontSize="3.4"
                  fontWeight={700}
                  fontFamily="system-ui, sans-serif"
                >
                  H{n}
                </text>
              </g>
            );
          })}

          {/* 2階歩行者帯（メッセモール／セントラルモール的な東西動線のイメージ） */}
          <rect
            x="4"
            y="23.5"
            width="92"
            height="5.2"
            rx="1.2"
            fill="#0c1929"
            stroke="#38bdf8"
            strokeWidth="0.45"
            opacity={0.95}
          />
          <text
            x="50"
            y="27.2"
            textAnchor="middle"
            fill="#7dd3fc"
            fontSize="2.4"
            fontWeight={600}
            fontFamily="system-ui, sans-serif"
          >
            2F 歩行者動線（示意）
          </text>

          {/* 連絡口×3（公式で複数連絡がある前提の簡略化） */}
          {[
            [22, 30, 6, 11],
            [50, 30, 6, 11],
            [78, 30, 6, 11],
          ].map(([x, y, w, h], i) => (
            <rect
              key={`bridge-${i}`}
              x={x}
              y={y}
              width={w}
              height={h}
              rx="0.6"
              fill="#0c1929"
              stroke="#60a5fa"
              strokeWidth="0.4"
              opacity={0.95}
            />
          ))}

          {/* H9〜11 */}
          <text
            x="50"
            y="44.5"
            textAnchor="middle"
            fill="#86efac"
            fontSize="3"
            fontWeight={700}
            fontFamily="system-ui, sans-serif"
          >
            国際展示場 HALL 9〜11（示意）
          </text>
          {[9, 10, 11].map((n, i) => {
            const w = 25.5;
            const hx = 5.5 + i * (w + 1.1);
            return (
              <g key={n}>
                <rect
                  x={hx}
                  y="46.5"
                  width={w}
                  height="10"
                  rx="0.9"
                  fill="#052e16"
                  stroke="#4ade80"
                  strokeWidth="0.45"
                  filter="url(#vm-glow)"
                />
                <text
                  x={hx + w / 2}
                  y="53"
                  textAnchor="middle"
                  fill="#ecfccb"
                  fontSize="3.2"
                  fontWeight={700}
                  fontFamily="system-ui, sans-serif"
                >
                  H{n}
                </text>
              </g>
            );
          })}

          {/* 幕張イベントホール + 連絡のイメージ */}
          <text
            x="88"
            y="42"
            textAnchor="middle"
            fill="#93c5fd"
            fontSize="2.2"
            fontWeight={700}
            fontFamily="system-ui, sans-serif"
          >
            幕張イベントホール
          </text>
          <ellipse
            cx="88"
            cy="58"
            rx="10"
            ry="7"
            fill="#0c1929"
            stroke="#38bdf8"
            strokeWidth="0.45"
          />
          <circle cx="88" cy="58" r="3" fill="#2563eb" opacity={0.9} />

          {/* パックマン風：通路にペレット */}
          {PELLETS.map((p, i) => (
            <circle
              key={i}
              cx={p.cx}
              cy={p.cy}
              r="0.65"
              fill="#fde047"
              stroke="#facc15"
              strokeWidth="0.12"
            />
          ))}

          {/* 外周レース（アーケード迷路の枠） */}
          <rect
            x="2"
            y="2"
            width="96"
            height={MAZE_VIEW.h - 4}
            rx="2"
            fill="none"
            stroke="#1e3a8a"
            strokeWidth="0.65"
            opacity={0.85}
          />

          <text
            x="50"
            y={MAZE_VIEW.h - 2.2}
            textAnchor="middle"
            fill="#64748b"
            fontSize="2.1"
            fontFamily="system-ui, sans-serif"
          >
            ※ 迷路・連絡口の位置は示意です。フロア・出入口は公式PDFを参照
          </text>
        </svg>

        {WANDER_GUIDE_SPRITES.map((g, i) => (
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
        {VENUE_MAZE_TOPOLOGY_NOTE}
      </p>
      <p className={styles.venueWanderMiniSubcaption}>
        迷路のような広さのなかを歩きながら<strong>すれちがう</strong>イメージ
      </p>
    </div>
  );
}
