/**
 * 日本列島 + 幕張ピン（SVG）を共通化したモチーフ。
 *
 * - `variant="concept"` : ヒーロー冒頭で使うコンセプトバナー用（薄く、静かな演出）
 * - `variant="scatter"` : 下部セクションで使う「全国に散らばる」演出用
 *
 * 体験の一貫性（ブランディング）を保つため、ヒーローと本文の地図は
 * 同じ形状・同じ幕張ピンの位置を使う。
 */

import styles from "./chokaigi.module.css";

type Variant = "concept" | "scatter";

export function JapanMapSilhouette({
  variant,
  ariaLabel,
}: {
  variant: Variant;
  ariaLabel?: string;
}) {
  const isConcept = variant === "concept";
  const landFill = isConcept ? "rgba(26, 88, 152, 0.12)" : "#f5f0eb";
  const landStroke = isConcept ? "rgba(26, 88, 152, 0.3)" : "#c9b8a8";
  const seaTop = isConcept ? "rgba(255, 246, 235, 0)" : "#e8f4fc";
  const seaBottom = isConcept ? "rgba(232, 244, 252, 0.35)" : "#d4e9f7";

  return (
    <svg
      className={isConcept ? styles.conceptMapSvg : styles.scatterSvg}
      viewBox="0 0 320 220"
      xmlns="http://www.w3.org/2000/svg"
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <defs>
        <linearGradient id={`jms-sea-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={seaTop} />
          <stop offset="100%" stopColor={seaBottom} />
        </linearGradient>
      </defs>
      <rect width="320" height="220" fill={`url(#jms-sea-${variant})`} rx="12" />

      {/* 日本列島（シンプル。ヒーロー／下部で同じ形を使い回すのがブランド反復のキモ） */}
      <g
        fill={landFill}
        stroke={landStroke}
        strokeWidth={isConcept ? 1 : 1.2}
        strokeLinejoin="round"
      >
        {/* 北海道 */}
        <path d="M 230 25 Q 270 20 280 35 Q 285 50 270 55 Q 250 60 235 50 Q 225 40 230 25 Z" />
        {/* 本州 */}
        <path d="M 235 65 Q 260 60 270 75 Q 275 95 265 115 Q 250 135 230 145 Q 200 155 170 150 Q 140 145 120 130 Q 110 120 115 105 Q 125 90 145 85 Q 170 80 195 75 Q 220 70 235 65 Z" />
        {/* 四国 */}
        <path d="M 145 140 Q 170 135 175 150 Q 170 165 145 160 Q 130 155 145 140 Z" />
        {/* 九州 */}
        <path d="M 95 135 Q 120 130 125 150 Q 120 175 100 180 Q 80 175 75 160 Q 80 140 95 135 Z" />
        {/* 沖縄 */}
        <ellipse cx="65" cy="200" rx="18" ry="8" />
      </g>

      {/* 幕張ピン（両バリアントで共通） */}
      <g className={isConcept ? styles.conceptPin : styles.scatterCenter}>
        <circle
          cx="245"
          cy="105"
          r={isConcept ? 8 : 10}
          fill="#c62828"
          opacity={isConcept ? 0.9 : 0.9}
        />
        <circle cx="245" cy="105" r={isConcept ? 3 : 4} fill="#fff" />
        {!isConcept && (
          <text
            x="245"
            y="125"
            textAnchor="middle"
            fill="#5d4037"
            fontSize="9"
            fontWeight="700"
            fontFamily="inherit"
          >
            幕張
          </text>
        )}
      </g>
    </svg>
  );
}
