/**
 * ヒーローの背景を覆う日本地図レイヤー。
 *
 * 実体:
 * - 正確な日本列島のシルエット（Wikimedia Commons 由来, CC BY-SA 3.0）を
 *   `/chokaigi/japan-outline.svg` として読み込む
 * - その上に「全国 → 幕張（集まる）」「幕張 → 全国（散らばる）」の
 *   呼吸アニメと幕張ピンをオーバーレイする
 * - さらに、X アカウント（＝参加者のアバター）を表すドットが各地から
 *   幕張に向かって軌跡の上を流れてくる（gathering 演出）
 * - 幕張の会場は「4連三角屋根＋旗＋スポットライト＋群衆」でイベント感を出す
 *
 * 位置は `position: absolute` で親ヒーロー section に広がり、
 * 入力フォームやキャラクターは前面（z-index）で視認性を担保する。
 *
 * izanami 記事の原則:
 * - 情報の優先順位: 入力フォームが主役なので、地図は薄く（opacity 低め）
 * - 体験の一貫性: 下部 `JapanVenueLocator` と同じ幕張赤ピン、同じ配色
 */

import styles from "./chokaigi.module.css";

// 幕張の SVG viewBox (0..1024) 上の座標（日本の原画に対してだいたい千葉のあたり）
// 原 SVG は 1024x1024, 東京湾は viewBox の右下寄りなので手動調整。
const MAKUHARI = { x: 730, y: 480 };

type LineSpec = {
  id: string;
  d: string;
  lineClass: string;
  travelerClass: string;
  /** アバタードットの色（流入者の多様性を出す） */
  color: string;
};

// 日本各地 → 幕張 への入射軌跡（主要地方の概略点から）
const INBOUND_LINES: readonly LineSpec[] = [
  {
    id: "inbPath-okinawa",
    d: `M 180 950 Q 450 720 ${MAKUHARI.x} ${MAKUHARI.y}`,
    lineClass: styles.conceptInbound1,
    travelerClass: styles.accountTraveler1,
    color: "#e91e63",
  },
  {
    id: "inbPath-kyushu",
    d: `M 310 780 Q 500 640 ${MAKUHARI.x} ${MAKUHARI.y}`,
    lineClass: styles.conceptInbound2,
    travelerClass: styles.accountTraveler2,
    color: "#DD6500",
  },
  {
    id: "inbPath-chugoku",
    d: `M 450 620 Q 600 560 ${MAKUHARI.x} ${MAKUHARI.y}`,
    lineClass: styles.conceptInbound3,
    travelerClass: styles.accountTraveler3,
    color: "#00897b",
  },
  {
    id: "inbPath-kinki",
    d: `M 600 420 Q 660 450 ${MAKUHARI.x} ${MAKUHARI.y}`,
    lineClass: styles.conceptInbound4,
    travelerClass: styles.accountTraveler4,
    color: "#7b1fa2",
  },
  {
    id: "inbPath-hokkaido",
    d: `M 820 180 Q 780 320 ${MAKUHARI.x} ${MAKUHARI.y}`,
    lineClass: styles.conceptInbound5,
    travelerClass: styles.accountTraveler5,
    color: "#1a5898",
  },
];

// 幕張 → 各地 の散出軌跡（同じ 5 方向）
const OUTBOUND_LINES: { d: string; className: string }[] = [
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 450 720 180 950`, className: styles.conceptOutbound1 },
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 500 640 310 780`, className: styles.conceptOutbound2 },
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 600 560 450 620`, className: styles.conceptOutbound3 },
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 660 450 600 420`, className: styles.conceptOutbound4 },
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 780 320 820 180`, className: styles.conceptOutbound5 },
];

// 幕張の周りに集まっている群衆の配置（アバター点）
// 会場の下、左右に自然に散らばるように。順序は視線の流れに合わせる。
const CROWD_DOTS: { dx: number; dy: number; r: number; color: string; delay: number }[] = [
  { dx: -46, dy: 16, r: 3.2, color: "#e91e63", delay: 0 },
  { dx: -32, dy: 20, r: 3.6, color: "#DD6500", delay: 0.15 },
  { dx: -18, dy: 18, r: 3.2, color: "#1a5898", delay: 0.3 },
  { dx: -4, dy: 22, r: 3.8, color: "#00897b", delay: 0.45 },
  { dx: 10, dy: 20, r: 3.2, color: "#7b1fa2", delay: 0.6 },
  { dx: 24, dy: 18, r: 3.6, color: "#e91e63", delay: 0.75 },
  { dx: 38, dy: 22, r: 3.2, color: "#DD6500", delay: 0.9 },
  { dx: 50, dy: 16, r: 3.2, color: "#1a5898", delay: 1.05 },
  { dx: -38, dy: 28, r: 2.8, color: "#7b1fa2", delay: 1.2 },
  { dx: -6, dy: 30, r: 2.8, color: "#00897b", delay: 1.35 },
  { dx: 28, dy: 30, r: 2.8, color: "#e91e63", delay: 1.5 },
  { dx: 46, dy: 28, r: 2.8, color: "#DD6500", delay: 1.65 },
];

export function ChokaigiConceptBanner() {
  return (
    <div className={styles.heroBackdrop} aria-hidden="true">
      {/* 正確な日本列島シルエット */}
      <div className={styles.heroBackdropMap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/chokaigi/japan-outline.svg"
          alt=""
          className={styles.heroBackdropMapImg}
          loading="eager"
          decoding="async"
        />
      </div>

      {/* 集まる／散らばる軌跡と幕張の会場、群衆、アバター移動を重ねる */}
      <svg
        className={styles.heroBackdropOverlay}
        viewBox="0 0 1024 1024"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* 集まる軌跡を mpath で参照するため、defs に id 付きで定義 */}
          {INBOUND_LINES.map((line) => (
            <path key={line.id} id={line.id} d={line.d} />
          ))}

          {/* 幕張の上空に浮かぶ光（会場のスポットライト／お祭り感） */}
          <radialGradient id="makuhariGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD54F" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#FFB300" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FFB300" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 幕張を中心に広がる光のハロー（「ここが目的地」のアフォーダンス） */}
        <circle
          className={styles.makuhariHalo}
          cx={MAKUHARI.x}
          cy={MAKUHARI.y - 10}
          r="120"
          fill="url(#makuhariGlow)"
        />

        {/* 集まる（オレンジ, 前半） */}
        <g
          stroke="#DD6500"
          strokeWidth="4"
          strokeDasharray="10 12"
          fill="none"
          strokeLinecap="round"
        >
          {INBOUND_LINES.map((line) => (
            <use key={`in-use-${line.id}`} href={`#${line.id}`} className={line.lineClass} />
          ))}
        </g>

        {/* 散らばる（ネイビー, 後半） */}
        <g
          stroke="#1a5898"
          strokeWidth="4"
          strokeDasharray="10 12"
          fill="none"
          strokeLinecap="round"
        >
          {OUTBOUND_LINES.map((line, i) => (
            <path key={`out-${i}`} d={line.d} className={line.className} />
          ))}
        </g>

        {/*
         * X アカウント（＝参加者のアバター）を表すドット。
         * 各軌跡に紐付けて SMIL の animateMotion で移動させる。
         * 「みんなが幕張に向かって集まってくる」を literal に見せるための演出。
         */}
        <g className={styles.accountTravelers}>
          {INBOUND_LINES.map((line, i) => {
            const delay = i * 0.25; // 軌跡のドロー開始と合わせる
            return (
              <g key={`traveler-${line.id}`} className={line.travelerClass}>
                {/* 外側リング（アバター枠っぽく） */}
                <circle r="8" fill="#fff" stroke={line.color} strokeWidth="2.5">
                  <animateMotion
                    dur="8s"
                    begin={`${delay}s`}
                    repeatCount="indefinite"
                    rotate="auto"
                    keyPoints="0;1;1"
                    keyTimes="0;0.4;1"
                    calcMode="linear"
                  >
                    <mpath href={`#${line.id}`} />
                  </animateMotion>
                  <animate
                    attributeName="opacity"
                    values="0;1;1;0;0"
                    keyTimes="0;0.05;0.38;0.45;1"
                    dur="8s"
                    begin={`${delay}s`}
                    repeatCount="indefinite"
                  />
                </circle>
                {/* 内側のドット（アバター中身） */}
                <circle r="4" fill={line.color}>
                  <animateMotion
                    dur="8s"
                    begin={`${delay}s`}
                    repeatCount="indefinite"
                    keyPoints="0;1;1"
                    keyTimes="0;0.4;1"
                    calcMode="linear"
                  >
                    <mpath href={`#${line.id}`} />
                  </animateMotion>
                  <animate
                    attributeName="opacity"
                    values="0;1;1;0;0"
                    keyTimes="0;0.05;0.38;0.45;1"
                    dur="8s"
                    begin={`${delay}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          })}
        </g>

        {/*
         * 幕張メッセ（超会議会場）のシルエット。
         * 東ホールに代表される 4 連三角屋根 + 基礎 + 旗 + 群衆 で
         * 「大きなイベント会場にみんなが集まっている」空気を演出する。
         */}
        <g className={styles.chokaigiMesse}>
          {/* 基礎（ホール本体） */}
          <rect
            x={MAKUHARI.x - 50}
            y={MAKUHARI.y - 16}
            width="100"
            height="12"
            fill="#1a5898"
            rx="1.5"
          />
          {/* 4連の三角屋根 */}
          <polygon
            points={`${MAKUHARI.x - 50},${MAKUHARI.y - 16} ${MAKUHARI.x - 37},${MAKUHARI.y - 40} ${MAKUHARI.x - 24},${MAKUHARI.y - 16}`}
            fill="#1a5898"
          />
          <polygon
            points={`${MAKUHARI.x - 26},${MAKUHARI.y - 16} ${MAKUHARI.x - 13},${MAKUHARI.y - 42} ${MAKUHARI.x},${MAKUHARI.y - 16}`}
            fill="#1a5898"
          />
          <polygon
            points={`${MAKUHARI.x - 2},${MAKUHARI.y - 16} ${MAKUHARI.x + 11},${MAKUHARI.y - 42} ${MAKUHARI.x + 24},${MAKUHARI.y - 16}`}
            fill="#1a5898"
          />
          <polygon
            points={`${MAKUHARI.x + 22},${MAKUHARI.y - 16} ${MAKUHARI.x + 35},${MAKUHARI.y - 40} ${MAKUHARI.x + 48},${MAKUHARI.y - 16}`}
            fill="#1a5898"
          />

          {/* 屋根のハイライト（立体感） */}
          <g fill="#DD6500" opacity="0.45">
            <polygon
              points={`${MAKUHARI.x - 37},${MAKUHARI.y - 40} ${MAKUHARI.x - 32},${MAKUHARI.y - 34} ${MAKUHARI.x - 32},${MAKUHARI.y - 16} ${MAKUHARI.x - 37},${MAKUHARI.y - 16}`}
            />
            <polygon
              points={`${MAKUHARI.x - 13},${MAKUHARI.y - 42} ${MAKUHARI.x - 8},${MAKUHARI.y - 35} ${MAKUHARI.x - 8},${MAKUHARI.y - 16} ${MAKUHARI.x - 13},${MAKUHARI.y - 16}`}
            />
            <polygon
              points={`${MAKUHARI.x + 11},${MAKUHARI.y - 42} ${MAKUHARI.x + 16},${MAKUHARI.y - 35} ${MAKUHARI.x + 16},${MAKUHARI.y - 16} ${MAKUHARI.x + 11},${MAKUHARI.y - 16}`}
            />
            <polygon
              points={`${MAKUHARI.x + 35},${MAKUHARI.y - 40} ${MAKUHARI.x + 40},${MAKUHARI.y - 34} ${MAKUHARI.x + 40},${MAKUHARI.y - 16} ${MAKUHARI.x + 35},${MAKUHARI.y - 16}`}
            />
          </g>

          {/* 旗（お祭り感）: 屋根の上にゆれる旗を 2 本 */}
          <g className={styles.chokaigiFlag1}>
            <line
              x1={MAKUHARI.x - 13}
              y1={MAKUHARI.y - 42}
              x2={MAKUHARI.x - 13}
              y2={MAKUHARI.y - 58}
              stroke="#5d4037"
              strokeWidth="1.5"
            />
            <polygon
              points={`${MAKUHARI.x - 13},${MAKUHARI.y - 58} ${MAKUHARI.x - 3},${MAKUHARI.y - 55} ${MAKUHARI.x - 13},${MAKUHARI.y - 50}`}
              fill="#e91e63"
            />
          </g>
          <g className={styles.chokaigiFlag2}>
            <line
              x1={MAKUHARI.x + 11}
              y1={MAKUHARI.y - 42}
              x2={MAKUHARI.x + 11}
              y2={MAKUHARI.y - 56}
              stroke="#5d4037"
              strokeWidth="1.5"
            />
            <polygon
              points={`${MAKUHARI.x + 11},${MAKUHARI.y - 56} ${MAKUHARI.x + 21},${MAKUHARI.y - 53} ${MAKUHARI.x + 11},${MAKUHARI.y - 48}`}
              fill="#DD6500"
            />
          </g>

          {/* 地面ライン */}
          <rect
            x={MAKUHARI.x - 54}
            y={MAKUHARI.y - 4}
            width="108"
            height="2"
            fill="#5d4037"
            opacity="0.4"
          />

          {/* 群衆のアバター（会場下に集まっている人々）: 時間差でポップイン */}
          <g className={styles.crowdGroup}>
            {CROWD_DOTS.map((dot, i) => (
              <g
                key={`crowd-${i}`}
                style={{ animationDelay: `${dot.delay}s` }}
                className={styles.crowdDot}
              >
                <circle
                  cx={MAKUHARI.x + dot.dx}
                  cy={MAKUHARI.y + dot.dy}
                  r={dot.r + 1.2}
                  fill="#fff"
                  opacity="0.85"
                />
                <circle
                  cx={MAKUHARI.x + dot.dx}
                  cy={MAKUHARI.y + dot.dy}
                  r={dot.r}
                  fill={dot.color}
                />
              </g>
            ))}
          </g>
        </g>

        {/* 幕張ピン（呼吸） */}
        <g className={styles.conceptPinLarge}>
          <circle
            cx={MAKUHARI.x}
            cy={MAKUHARI.y}
            r="18"
            fill="#c62828"
            opacity="0.28"
          />
          <circle cx={MAKUHARI.x} cy={MAKUHARI.y} r="9" fill="#c62828" />
          <circle cx={MAKUHARI.x} cy={MAKUHARI.y} r="3" fill="#fff" />
        </g>
      </svg>
    </div>
  );
}
