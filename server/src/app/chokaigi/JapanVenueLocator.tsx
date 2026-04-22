"use client";

import styles from "./chokaigi.module.css";
import { JapanMapSilhouette } from "./JapanMapSilhouette";

/**
 * 超会議が終わったら全国に散らばるけど、みんな同じ方向を見ている
 * — エモーショナルな演出
 *
 * ベースの地図シルエット／幕張ピンは `JapanMapSilhouette` を使い、
 * ヒーローのコンセプトバナーと「同じ地図」で体験の一貫性を保つ。
 * ここでは散らばっていく人々と放射状の軌跡だけをレイヤーとして重ねる。
 */
export function JapanVenueLocator() {
  return (
    <figure
      className={styles.scatterWrap}
      aria-label="超会議で出会ったみんなが、全国へ散らばっていくイメージ"
    >
      <div className={styles.scatterMap}>
        <div className={styles.scatterBase}>
          <JapanMapSilhouette variant="scatter" />
        </div>
        <svg
          className={styles.scatterOverlay}
          viewBox="0 0 320 220"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* 散らばっていく人々（全員同じ方向を向いている） */}
          {/* 北海道 */}
          <g className={`${styles.scatterPerson} ${styles.scatterDelay1}`}>
            <circle cx="255" cy="40" r="5" fill="#255d9b" />
            <path d="M 258 38 L 262 40 L 258 42" fill="#255d9b" />
          </g>
          {/* 東北 */}
          <g className={`${styles.scatterPerson} ${styles.scatterDelay2}`}>
            <circle cx="250" cy="75" r="5" fill="#c98e2b" />
            <path d="M 253 73 L 257 75 L 253 77" fill="#c98e2b" />
          </g>
          {/* 北陸 */}
          <g className={`${styles.scatterPerson} ${styles.scatterDelay3}`}>
            <circle cx="200" cy="90" r="5" fill="#4f3558" />
            <path d="M 203 88 L 207 90 L 203 92" fill="#4f3558" />
          </g>
          {/* 関西 */}
          <g className={`${styles.scatterPerson} ${styles.scatterDelay4}`}>
            <circle cx="180" cy="125" r="5" fill="#255d9b" />
            <path d="M 183 123 L 187 125 L 183 127" fill="#255d9b" />
          </g>
          {/* 中国 */}
          <g className={`${styles.scatterPerson} ${styles.scatterDelay5}`}>
            <circle cx="140" cy="115" r="5" fill="#c98e2b" />
            <path d="M 143 113 L 147 115 L 143 117" fill="#c98e2b" />
          </g>
          {/* 四国 */}
          <g className={`${styles.scatterPerson} ${styles.scatterDelay6}`}>
            <circle cx="155" cy="150" r="5" fill="#4f3558" />
            <path d="M 158 148 L 162 150 L 158 152" fill="#4f3558" />
          </g>
          {/* 九州 */}
          <g className={`${styles.scatterPerson} ${styles.scatterDelay7}`}>
            <circle cx="100" cy="155" r="5" fill="#255d9b" />
            <path d="M 103 153 L 107 155 L 103 157" fill="#255d9b" />
          </g>
          {/* 沖縄 */}
          <g className={`${styles.scatterPerson} ${styles.scatterDelay8}`}>
            <circle cx="65" cy="195" r="5" fill="#c98e2b" />
            <path d="M 68 193 L 72 195 L 68 197" fill="#c98e2b" />
          </g>

          {/* 幕張から放射状の軌跡（薄く） */}
          <g stroke="#c62828" strokeWidth="1" strokeDasharray="4 3" opacity="0.25" fill="none">
            <path d="M 245 105 Q 250 70 255 40" />
            <path d="M 245 105 Q 248 88 250 75" />
            <path d="M 245 105 Q 220 95 200 90" />
            <path d="M 245 105 Q 210 115 180 125" />
            <path d="M 245 105 Q 190 110 140 115" />
            <path d="M 245 105 Q 195 130 155 150" />
            <path d="M 245 105 Q 170 130 100 155" />
            <path d="M 245 105 Q 150 150 65 195" />
          </g>
        </svg>
      </div>

      <figcaption className={styles.scatterCaption}>
        <p className={styles.scatterMessage}>
          超会議で出会ったみんなが、
          <br />
          <strong>全国へ散らばっても、同じ方向を見ている。</strong>
        </p>
        <p className={styles.scatterSub}>
          また、どこかで<span className={styles.scatterHighlight}>すれちがおう</span>。
        </p>
      </figcaption>
    </figure>
  );
}
