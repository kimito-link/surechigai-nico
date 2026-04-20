import {
  JAPAN_LOCATOR_CAPTION,
  JAPAN_LOCATOR_MAP_LINK_LABEL,
  JAPAN_LOCATOR_PREF_HEADING,
  JAPAN_PREFECTURE_NAMES,
  VENUE_GOOGLE_MAPS_URL,
} from "./lp-content";
import styles from "./chokaigi.module.css";

/**
 * 日本列島の示意シルエット（地方ごとの塗り分け）＋関東7都県の拡大＋幕張目印。
 * 正確な海岸線・県境ではありません。
 */
export function JapanVenueLocator() {
  return (
    <figure
      className={styles.mapJapanLocator}
      aria-labelledby="japan-locator-caption"
    >
      <div className={styles.mapJapanSvgWrap}>
        <svg
          className={styles.mapJapanSvg}
          viewBox="0 0 400 248"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="japanSea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e3f2fd" />
              <stop offset="100%" stopColor="#bbdefb" />
            </linearGradient>
            <filter id="japanInsetShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.12" />
            </filter>
          </defs>
          <rect width="400" height="248" rx="10" fill="url(#japanSea)" />

          {/* 関東7都県（拡大パネル） */}
          <g filter="url(#japanInsetShadow)">
            <rect
              x="6"
              y="36"
              width="118"
              height="176"
              rx="9"
              fill="rgba(255, 255, 255, 0.92)"
              stroke="rgba(141, 110, 99, 0.55)"
              strokeWidth="1"
            />
            <text
              x="65"
              y="54"
              textAnchor="middle"
              fill="#37474f"
              fontSize="10"
              fontWeight={700}
              fontFamily="inherit"
            >
              関東（拡大）
            </text>
            {/* 3×2 + 千葉 */}
            <g fontSize="7.5" fontWeight={600} fill="#4e342e" fontFamily="inherit">
              <rect x="12" y="62" width="34" height="26" rx="4" fill="#efebe9" stroke="#a1887f" />
              <text x="29" y="79" textAnchor="middle">
                茨城
              </text>
              <rect x="48" y="62" width="34" height="26" rx="4" fill="#efebe9" stroke="#a1887f" />
              <text x="65" y="79" textAnchor="middle">
                栃木
              </text>
              <rect x="84" y="62" width="34" height="26" rx="4" fill="#efebe9" stroke="#a1887f" />
              <text x="101" y="79" textAnchor="middle">
                群馬
              </text>
              <rect x="12" y="92" width="34" height="26" rx="4" fill="#efebe9" stroke="#a1887f" />
              <text x="29" y="109" textAnchor="middle">
                埼玉
              </text>
              <rect x="48" y="92" width="34" height="26" rx="4" fill="#efebe9" stroke="#a1887f" />
              <text x="65" y="109" textAnchor="middle">
                東京
              </text>
              <rect x="84" y="92" width="34" height="26" rx="4" fill="#efebe9" stroke="#a1887f" />
              <text x="101" y="109" textAnchor="middle">
                神奈川
              </text>
              <rect
                x="30"
                y="124"
                width="70"
                height="32"
                rx="5"
                fill="rgba(255, 235, 59, 0.42)"
                stroke="rgba(198, 40, 40, 0.75)"
                strokeWidth="1.2"
              />
              <text x="65" y="144" textAnchor="middle" fill="#b71c1c" fontWeight={700} fontSize="9">
                千葉（会場）
              </text>
            </g>
            <text x="65" y="174" textAnchor="middle" fill="#6d4c41" fontSize="6.5" fontFamily="inherit">
              幕張メッセは
            </text>
            <text x="65" y="184" textAnchor="middle" fill="#6d4c41" fontSize="6.5" fontFamily="inherit">
              東京湾側・沿岸
            </text>
          </g>

          {/* 本島群（地方ごとに塗り分け） */}
          <g transform="translate(128, 4)" strokeLinejoin="round">
            <text
              x="136"
              y="20"
              textAnchor="middle"
              fill="#37474f"
              fontSize="11"
              fontWeight={700}
              fontFamily="inherit"
            >
              日本（示意）
            </text>
            {/* 北海道 */}
            <ellipse
              cx="178"
              cy="36"
              rx="62"
              ry="19"
              fill="#efebe9"
              stroke="#8d6e63"
              strokeWidth="1"
            />
            <text x="178" y="40" textAnchor="middle" fill="#5d4037" fontSize="7" fontWeight={600} fontFamily="inherit">
              北海道
            </text>
            {/* 東北 */}
            <path
              d="M 128 58 L 198 52 L 212 98 L 168 108 L 118 88 Z"
              fill="#efebe9"
              stroke="#8d6e63"
              strokeWidth="0.9"
            />
            <text x="158" y="82" textAnchor="middle" fill="#5d4037" fontSize="7" fontWeight={600} fontFamily="inherit">
              東北
            </text>
            {/* 関東（ハイライト） */}
            <path
              d="M 168 108 L 212 98 L 228 132 L 198 142 L 172 132 Z"
              fill="rgba(255, 235, 59, 0.32)"
              stroke="rgba(245, 127, 23, 0.55)"
              strokeWidth="1"
            />
            <text x="198" y="122" textAnchor="middle" fill="#5d4037" fontSize="7" fontWeight={700} fontFamily="inherit">
              関東
            </text>
            {/* 中部 */}
            <path
              d="M 172 132 L 228 132 L 238 178 L 192 185 L 165 155 Z"
              fill="#efebe9"
              stroke="#8d6e63"
              strokeWidth="0.9"
            />
            <text x="200" y="158" textAnchor="middle" fill="#5d4037" fontSize="7" fontWeight={600} fontFamily="inherit">
              中部
            </text>
            {/* 近畿 */}
            <path
              d="M 192 185 L 238 178 L 232 208 L 188 215 L 175 198 Z"
              fill="#efebe9"
              stroke="#8d6e63"
              strokeWidth="0.9"
            />
            <text x="205" y="200" textAnchor="middle" fill="#5d4037" fontSize="7" fontWeight={600} fontFamily="inherit">
              近畿
            </text>
            {/* 中国 */}
            <path
              d="M 175 198 L 232 208 L 215 235 L 138 228 L 148 205 Z"
              fill="#efebe9"
              stroke="#8d6e63"
              strokeWidth="0.9"
            />
            <text x="178" y="220" textAnchor="middle" fill="#5d4037" fontSize="7" fontWeight={600} fontFamily="inherit">
              中国
            </text>
            {/* 四国 */}
            <path
              d="M 118 168 L 158 162 L 165 195 L 128 200 Z"
              fill="#efebe9"
              stroke="#8d6e63"
              strokeWidth="0.85"
            />
            <text x="142" y="184" textAnchor="middle" fill="#5d4037" fontSize="7" fontWeight={600} fontFamily="inherit">
              四国
            </text>
            {/* 九州 */}
            <path
              d="M 38 175 L 118 168 L 132 218 L 72 232 L 22 205 Z"
              fill="#efebe9"
              stroke="#8d6e63"
              strokeWidth="0.9"
            />
            <text x="78" y="200" textAnchor="middle" fill="#5d4037" fontSize="7" fontWeight={600} fontFamily="inherit">
              九州
            </text>
            {/* 沖縄（示意） */}
            <ellipse cx="48" cy="238" rx="14" ry="5" fill="#efebe9" stroke="#8d6e63" strokeWidth="0.7" />
            <text x="48" y="240" textAnchor="middle" fill="#5d4037" fontSize="6" fontWeight={600} fontFamily="inherit">
              沖縄
            </text>
            {/* 幕張ピン（千葉・太平洋岸寄りのイメージ） */}
            <g transform="translate(222 118)">
              <circle r="6.5" fill="#c62828" opacity="0.92" />
              <circle r="2.8" fill="#fff" />
            </g>
            <text x="238" y="122" fill="#4e342e" fontSize="7.5" fontWeight={700} fontFamily="inherit">
              幕張
            </text>
          </g>

          <text
            x="200"
            y="240"
            textAnchor="middle"
            fill="#6d4c41"
            fontSize="7"
            fontFamily="inherit"
          >
            ※ 形状・県境・距離はイメージです
          </text>
        </svg>
      </div>

      <figcaption id="japan-locator-caption" className={styles.mapJapanCaption}>
        {JAPAN_LOCATOR_CAPTION}{" "}
        <a
          href={VENUE_GOOGLE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.mapJapanMapLink}
        >
          {JAPAN_LOCATOR_MAP_LINK_LABEL}
        </a>
      </figcaption>

      <div className={styles.mapJapanPrefBlock}>
        <p className={styles.mapJapanPrefHeading} id="japan-pref-heading">
          {JAPAN_LOCATOR_PREF_HEADING}
        </p>
        <ul
          className={styles.mapJapanPrefList}
          aria-labelledby="japan-pref-heading"
        >
          {JAPAN_PREFECTURE_NAMES.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
