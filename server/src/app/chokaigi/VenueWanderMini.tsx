"use client";

import styles from "./chokaigi.module.css";
import {
  BRIDGE_X,
  MAZE_VIEW,
  MALL_BAND,
  SUB_HALLS_LAYOUT,
  VENUE_MAZE_TOPOLOGY_NOTE,
  WALKWAY_CENTER_SEGMENTS,
  mainHallRect,
  pelletsAlongSegments,
} from "./venue-maze-topology";

/** lp-content の GUIDES と同じパス（クライアントから lp-content 丸ごと読み込まない：HMR/チャンク不整合回避） */
const WANDER_GUIDE_SPRITES = [
  { name: "りんく", imageSrc: "/chokaigi/yukkuri/rink.png" },
  { name: "こん太", imageSrc: "/chokaigi/yukkuri/konta.png" },
  { name: "たぬ姉", imageSrc: "/chokaigi/yukkuri/tanunee.png" },
] as const;

const SPEECH = ["どこ？", "あ、いたいた！", "すれちがった！"] as const;

/** 通路を細かく取るほどペレット密度アップ */
const PELLETS = pelletsAlongSegments(WALKWAY_CENTER_SEGMENTS, 2.05);

const HALL_ORDER = [8, 7, 6, 5, 4, 3, 2, 1] as const;
const SUB_LABELS = [9, 10, 11] as const;

/**
 * 幕張メッセ周辺のニコニコ超会議会場イメージ（示意）。
 * 公式の2階歩行者動線を迷路として細分化し、パックマン風に表現。
 */
export function VenueWanderMini() {
  const vb = `${MAZE_VIEW.w} ${MAZE_VIEW.h}`;

  return (
    <div className={styles.venueWanderMini}>
      <div
        className={styles.venueWanderMiniMap}
        role="img"
        aria-label="幕張メッセ周辺の会場イメージ。国際展示場ホールを細分化した通路網と2階歩行者動線をパックマン風に示意し、3人のキャラクターが通路を移動する様子です。"
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
              <feGaussianBlur stdDeviation="0.35" result="b" />
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

          <text
            x="50"
            y="5.2"
            textAnchor="middle"
            fill="#93c5fd"
            fontSize="2.85"
            fontWeight={700}
            fontFamily="system-ui, sans-serif"
          >
            国際展示場 HALL 1〜8（メイン棟・区画示意）
          </text>

          {HALL_ORDER.map((n, i) => {
            const r = mainHallRect(i);
            const ix1 = r.x + r.w / 3;
            const ix2 = r.x + (2 * r.w) / 3;
            const iy1 = r.y + r.h / 3;
            const iy2 = r.y + (2 * r.h) / 3;
            return (
              <g key={n}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx="0.85"
                  fill="#0f172a"
                  stroke="url(#vm-wall)"
                  strokeWidth="0.5"
                  filter="url(#vm-glow)"
                />
                {/* ホール内をブース列風に細分化 */}
                <line
                  x1={ix1}
                  y1={r.y + 0.6}
                  x2={ix1}
                  y2={r.y + r.h - 0.6}
                  stroke="rgba(56,189,248,0.35)"
                  strokeWidth="0.28"
                />
                <line
                  x1={ix2}
                  y1={r.y + 0.6}
                  x2={ix2}
                  y2={r.y + r.h - 0.6}
                  stroke="rgba(56,189,248,0.35)"
                  strokeWidth="0.28"
                />
                <line
                  x1={r.x + 0.5}
                  y1={iy1}
                  x2={r.x + r.w - 0.5}
                  y2={iy1}
                  stroke="rgba(56,189,248,0.28)"
                  strokeWidth="0.26"
                />
                <line
                  x1={r.x + 0.5}
                  y1={iy2}
                  x2={r.x + r.w - 0.5}
                  y2={iy2}
                  stroke="rgba(56,189,248,0.28)"
                  strokeWidth="0.26"
                />
                <text
                  x={r.x + r.w / 2}
                  y={r.y + r.h / 2 + 1.1}
                  textAnchor="middle"
                  fill="#fde68a"
                  fontSize="3.1"
                  fontWeight={700}
                  fontFamily="system-ui, sans-serif"
                >
                  H{n}
                </text>
              </g>
            );
          })}

          <rect
            x={MALL_BAND.x}
            y={MALL_BAND.y}
            width={MALL_BAND.w}
            height={MALL_BAND.h}
            rx="1.2"
            fill="#0c1929"
            stroke="#38bdf8"
            strokeWidth="0.42"
            opacity={0.96}
          />
          <line
            x1={MALL_BAND.x + 1}
            y1={MALL_BAND.y + MALL_BAND.h * 0.5}
            x2={MALL_BAND.x + MALL_BAND.w - 1}
            y2={MALL_BAND.y + MALL_BAND.h * 0.5}
            stroke="rgba(56,189,248,0.4)"
            strokeWidth="0.32"
            strokeDasharray="1.2 0.9"
          />
          <text
            x="50"
            y={MALL_BAND.y + MALL_BAND.h * 0.55}
            textAnchor="middle"
            fill="#7dd3fc"
            fontSize="2.35"
            fontWeight={600}
            fontFamily="system-ui, sans-serif"
          >
            2F 歩行者動線（二重レーン示意）
          </text>

          {BRIDGE_X.map((bx, i) => (
            <rect
              key={`bridge-${i}`}
              x={bx - 1.1}
              y={28.5}
              width={2.2}
              height={14.8}
              rx="0.45"
              fill="#0c1929"
              stroke="#60a5fa"
              strokeWidth="0.35"
              opacity={0.96}
            />
          ))}

          <text
            x="50"
            y="41"
            textAnchor="middle"
            fill="#86efac"
            fontSize="2.75"
            fontWeight={700}
            fontFamily="system-ui, sans-serif"
          >
            国際展示場 HALL 9〜11（区画示意）
          </text>

          {SUB_HALLS_LAYOUT.map((hall, i) => {
            const n = SUB_LABELS[i];
            const ix1 = hall.x + hall.w / 3;
            const ix2 = hall.x + (2 * hall.w) / 3;
            const iy1 = hall.y + hall.h / 3;
            const iy2 = hall.y + (2 * hall.h) / 3;
            return (
              <g key={n}>
                <rect
                  x={hall.x}
                  y={hall.y}
                  width={hall.w}
                  height={hall.h}
                  rx="0.75"
                  fill="#052e16"
                  stroke="#4ade80"
                  strokeWidth="0.42"
                  filter="url(#vm-glow)"
                />
                <line
                  x1={ix1}
                  y1={hall.y + 0.5}
                  x2={ix1}
                  y2={hall.y + hall.h - 0.5}
                  stroke="rgba(74,222,128,0.4)"
                  strokeWidth="0.28"
                />
                <line
                  x1={ix2}
                  y1={hall.y + 0.5}
                  x2={ix2}
                  y2={hall.y + hall.h - 0.5}
                  stroke="rgba(74,222,128,0.4)"
                  strokeWidth="0.28"
                />
                <line
                  x1={hall.x + 0.6}
                  y1={iy1}
                  x2={hall.x + hall.w - 0.6}
                  y2={iy1}
                  stroke="rgba(74,222,128,0.32)"
                  strokeWidth="0.26"
                />
                <line
                  x1={hall.x + 0.6}
                  y1={iy2}
                  x2={hall.x + hall.w - 0.6}
                  y2={iy2}
                  stroke="rgba(74,222,128,0.32)"
                  strokeWidth="0.26"
                />
                <text
                  x={hall.x + hall.w / 2}
                  y={hall.y + hall.h / 2 + 1}
                  textAnchor="middle"
                  fill="#ecfccb"
                  fontSize="3"
                  fontWeight={700}
                  fontFamily="system-ui, sans-serif"
                >
                  H{n}
                </text>
              </g>
            );
          })}

          <text
            x="88"
            y="39"
            textAnchor="middle"
            fill="#93c5fd"
            fontSize="2.05"
            fontWeight={700}
            fontFamily="system-ui, sans-serif"
          >
            幕張イベントホール
          </text>
          <ellipse
            cx="88"
            cy="63"
            rx="9"
            ry="6.5"
            fill="#0c1929"
            stroke="#38bdf8"
            strokeWidth="0.42"
          />
          <circle cx="88" cy="63" r="2.6" fill="#2563eb" opacity={0.92} />

          {PELLETS.map((p, i) => (
            <circle
              key={i}
              cx={p.cx}
              cy={p.cy}
              r="0.5"
              fill="#fde047"
              stroke="#eab308"
              strokeWidth="0.1"
            />
          ))}

          <rect
            x="2"
            y="2"
            width="96"
            height={MAZE_VIEW.h - 4}
            rx="2"
            fill="none"
            stroke="#1e3a8a"
            strokeWidth="0.6"
            opacity={0.88}
          />

          <text
            x="50"
            y={MAZE_VIEW.h - 2}
            textAnchor="middle"
            fill="#64748b"
            fontSize="1.95"
            fontFamily="system-ui, sans-serif"
          >
            ※ 区画・迷路は示意です。フロア・出入口は公式PDFを参照
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
