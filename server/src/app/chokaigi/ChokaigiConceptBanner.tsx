/**
 * ヒーローの背景を覆う日本地図レイヤー。
 *
 * 実体:
 * - 正確な日本列島のシルエット（Wikimedia Commons 由来, CC BY-SA 3.0）を
 *   `/chokaigi/japan-outline.svg` として読み込む
 * - その上に「全国 → 幕張（集まる）」「幕張 → 全国（散らばる）」の
 *   呼吸アニメ、幕張ピンをオーバーレイする
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

// 日本各地 → 幕張 への入射軌跡（主要地方の概略点から）
const INBOUND_LINES: { d: string; className: string }[] = [
  { d: `M 180 950 Q 450 720 ${MAKUHARI.x} ${MAKUHARI.y}`, className: styles.conceptInbound1 }, // 沖縄
  { d: `M 310 780 Q 500 640 ${MAKUHARI.x} ${MAKUHARI.y}`, className: styles.conceptInbound2 }, // 九州
  { d: `M 450 620 Q 600 560 ${MAKUHARI.x} ${MAKUHARI.y}`, className: styles.conceptInbound3 }, // 四国・中国
  { d: `M 600 420 Q 660 450 ${MAKUHARI.x} ${MAKUHARI.y}`, className: styles.conceptInbound4 }, // 近畿
  { d: `M 820 180 Q 780 320 ${MAKUHARI.x} ${MAKUHARI.y}`, className: styles.conceptInbound5 }, // 北海道
];

// 幕張 → 各地 の散出軌跡（同じ5方向）
const OUTBOUND_LINES: { d: string; className: string }[] = [
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 450 720 180 950`, className: styles.conceptOutbound1 },
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 500 640 310 780`, className: styles.conceptOutbound2 },
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 600 560 450 620`, className: styles.conceptOutbound3 },
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 660 450 600 420`, className: styles.conceptOutbound4 },
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 780 320 820 180`, className: styles.conceptOutbound5 },
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

      {/* 集まる／散らばる軌跡と幕張ピンを、同じ viewBox 上に重ねる */}
      <svg
        className={styles.heroBackdropOverlay}
        viewBox="0 0 1024 1024"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 集まる（オレンジ, 前半） */}
        <g
          stroke="#DD6500"
          strokeWidth="4"
          strokeDasharray="10 12"
          fill="none"
          strokeLinecap="round"
        >
          {INBOUND_LINES.map((line, i) => (
            <path key={`in-${i}`} d={line.d} className={line.className} />
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
         * 幕張メッセ（超会議会場）のシルエット。
         * 東ホールに代表される 4 連三角屋根 + 基礎 を簡略化したロゴ的シェイプ。
         * 幕張ピンのすぐ上に配置することで「ここが超会議の会場」という場所性を補強する。
         */}
        <g className={styles.chokaigiMesse} opacity="0.72">
          {/* 基礎（ホール本体） */}
          <rect
            x={MAKUHARI.x - 46}
            y={MAKUHARI.y - 14}
            width="92"
            height="10"
            fill="#1a5898"
            rx="1.5"
          />
          {/* 4連の三角屋根 */}
          <polygon
            points={`${MAKUHARI.x - 46},${MAKUHARI.y - 14} ${MAKUHARI.x - 34},${MAKUHARI.y - 36} ${MAKUHARI.x - 22},${MAKUHARI.y - 14}`}
            fill="#1a5898"
          />
          <polygon
            points={`${MAKUHARI.x - 24},${MAKUHARI.y - 14} ${MAKUHARI.x - 12},${MAKUHARI.y - 38} ${MAKUHARI.x},${MAKUHARI.y - 14}`}
            fill="#1a5898"
          />
          <polygon
            points={`${MAKUHARI.x - 2},${MAKUHARI.y - 14} ${MAKUHARI.x + 10},${MAKUHARI.y - 38} ${MAKUHARI.x + 22},${MAKUHARI.y - 14}`}
            fill="#1a5898"
          />
          <polygon
            points={`${MAKUHARI.x + 20},${MAKUHARI.y - 14} ${MAKUHARI.x + 32},${MAKUHARI.y - 36} ${MAKUHARI.x + 44},${MAKUHARI.y - 14}`}
            fill="#1a5898"
          />
          {/* 屋根のハイライト（立体感） */}
          <g fill="#DD6500" opacity="0.45">
            <polygon
              points={`${MAKUHARI.x - 34},${MAKUHARI.y - 36} ${MAKUHARI.x - 30},${MAKUHARI.y - 31} ${MAKUHARI.x - 30},${MAKUHARI.y - 14} ${MAKUHARI.x - 34},${MAKUHARI.y - 14}`}
            />
            <polygon
              points={`${MAKUHARI.x - 12},${MAKUHARI.y - 38} ${MAKUHARI.x - 8},${MAKUHARI.y - 32} ${MAKUHARI.x - 8},${MAKUHARI.y - 14} ${MAKUHARI.x - 12},${MAKUHARI.y - 14}`}
            />
            <polygon
              points={`${MAKUHARI.x + 10},${MAKUHARI.y - 38} ${MAKUHARI.x + 14},${MAKUHARI.y - 32} ${MAKUHARI.x + 14},${MAKUHARI.y - 14} ${MAKUHARI.x + 10},${MAKUHARI.y - 14}`}
            />
            <polygon
              points={`${MAKUHARI.x + 32},${MAKUHARI.y - 36} ${MAKUHARI.x + 36},${MAKUHARI.y - 31} ${MAKUHARI.x + 36},${MAKUHARI.y - 14} ${MAKUHARI.x + 32},${MAKUHARI.y - 14}`}
            />
          </g>
          {/* 地面ライン */}
          <rect
            x={MAKUHARI.x - 50}
            y={MAKUHARI.y - 3}
            width="100"
            height="2"
            fill="#5d4037"
            opacity="0.4"
          />
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
