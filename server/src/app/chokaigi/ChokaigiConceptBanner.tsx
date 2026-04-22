/**
 * ファーストビュー冒頭のコンセプトバナー。
 *
 * 目的（izanami 記事 3-1 / 4-1 に準拠）:
 * - 「全国の X ユーザーが幕張に集まり、また全国へ散り、いつかすれちがう」
 *   というコア体験を 3 秒で立ち上げる
 * - 下部 `JapanVenueLocator` と同じ地図モチーフを再利用し、
 *   スクロール後に「同じ地図だ」と気づかせる（ブランド反復）
 *
 * 情報の優先順位の考え方:
 * - 主役は下にある「X ID 入力 → ゆっくり解説」
 * - 本コンポーネントは地図を薄く背景化し、視線を入力フォームへ受け渡す
 */

import { JapanMapSilhouette } from "./JapanMapSilhouette";
import styles from "./chokaigi.module.css";

export function ChokaigiConceptBanner() {
  return (
    <aside className={styles.conceptBanner} aria-label="サービスコンセプト">
      <div className={styles.conceptMapLayer}>
        <JapanMapSilhouette variant="concept" />

        {/*
         * 呼吸アニメ: 「全国 → 幕張（集まる）」と「幕張 → 全国（散らばる）」
         * を前後半で交互に表示し、コンセプトを 1 ループで体験させる。
         * - 前半（0-50%）: inbound 線が描かれる
         * - 後半（50-100%）: outbound 線が描かれる
         */}
        <svg
          className={styles.conceptArrowsSvg}
          viewBox="0 0 320 220"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* 集まる（オレンジ） */}
          <g
            stroke="#DD6500"
            strokeWidth="1.2"
            strokeDasharray="3 4"
            fill="none"
            strokeLinecap="round"
          >
            <path d="M 65 195 Q 150 150 245 105" className={styles.conceptInbound1} />
            <path d="M 100 155 Q 170 130 245 105" className={styles.conceptInbound2} />
            <path d="M 140 115 Q 195 110 245 105" className={styles.conceptInbound3} />
            <path d="M 200 90 Q 220 95 245 105" className={styles.conceptInbound4} />
            <path d="M 255 40 Q 250 70 245 105" className={styles.conceptInbound5} />
          </g>
          {/* 散らばる（ネイビー） */}
          <g
            stroke="#1a5898"
            strokeWidth="1.2"
            strokeDasharray="3 4"
            fill="none"
            strokeLinecap="round"
          >
            <path d="M 245 105 Q 150 150 65 195" className={styles.conceptOutbound1} />
            <path d="M 245 105 Q 170 130 100 155" className={styles.conceptOutbound2} />
            <path d="M 245 105 Q 195 110 140 115" className={styles.conceptOutbound3} />
            <path d="M 245 105 Q 220 95 200 90" className={styles.conceptOutbound4} />
            <path d="M 245 105 Q 250 70 255 40" className={styles.conceptOutbound5} />
          </g>
        </svg>
      </div>

      <div className={styles.conceptCaption}>
        <p className={styles.conceptLine}>
          <span className={styles.conceptNationwide}>全国から</span>
          <span className={styles.conceptArrow} aria-hidden="true">→</span>
          <span className={styles.conceptMakuhari}>幕張</span>
          <span className={styles.conceptArrow} aria-hidden="true">→</span>
          <span className={styles.conceptNationwide}>また全国へ</span>
        </p>
        <p className={styles.conceptSub}>
          X でつながって、超会議で出会う。<br />
          全国に散らばっても、いつかまた<strong>すれちがう</strong>。
        </p>
      </div>
    </aside>
  );
}
