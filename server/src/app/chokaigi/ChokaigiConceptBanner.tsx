/**
 * ヒーローの背景を覆う日本地図レイヤー。
 *
 * 実体:
 * - 正確な日本列島のシルエット（Wikimedia Commons 由来, CC BY-SA 3.0）を
 *   `/chokaigi/japan-outline.svg` として読み込む
 * - その上に「全国 → 幕張（集まる）」「幕張 → 全国（散らばる）」の
 *   呼吸アニメと幕張ピンをオーバーレイする
 * - 入射軌跡を実在の X アカウントのアバター画像が SMIL `animateMotion`
 *   で実際に流れてくる（「みんなが幕張に集まってくる」を literal に可視化）
 * - 幕張の会場は「4連三角屋根＋旗＋スポットライト＋群衆」でイベント感を出す
 *
 * MAKUHARI 座標について:
 * - 元 SVG (1024x1024) における千葉県幕張メッセの位置を目視合わせ。
 *   東京湾東岸・関東の東端。東日本に寄せた座標。
 *
 * 位置は `position: absolute` で親ヒーロー section に広がり、
 * 入力フォームやキャラクターは前面（z-index）で視認性を担保する。
 */

import styles from "./chokaigi.module.css";

// 幕張メッセの SVG viewBox (0..1024) 上の座標（千葉・Kanto 東端）。
// `.conceptPinLarge` / `.chokaigiMesse` / `.makuhariHalo` 他の
// CSS `transform-origin` もこの座標と一致させること。
const MAKUHARI = { x: 820, y: 432 };

type LineSpec = {
  /** `<mpath href>` で参照するための id */
  id: string;
  /** SVG パス文字列 */
  d: string;
  /** 軌跡自体の描画制御 class */
  lineClass: string;
  /** 軌跡上を流れるアバターの class（reduced-motion 等で使用） */
  travelerClass: string;
  /** 使用するアバター画像（実在の X アカウントから抽出） */
  avatarSrc: string;
  /** アバター外周リングの色（アカウント性を色でも示す） */
  ringColor: string;
  /** X アカウントのハンドル（@は含めない。URL とラベル生成に使用） */
  accountHandle: string;
  /** 日本語表示名（tooltip / aria-label 用） */
  accountLabel: string;
};

/**
 * X (旧 Twitter) のプロフィール URL を生成する。
 * `twitter.com` → `x.com` に転送されるため、新ドメインを使用。
 */
function xAccountUrl(handle: string): string {
  return `https://x.com/${handle}`;
}

// 日本各地 → 幕張 への入射軌跡（各地方の代表点から）。
// 終点 (MAKUHARI) は変更があれば一括で反映される。
const INBOUND_LINES: readonly LineSpec[] = [
  {
    id: "inbPath-okinawa",
    d: `M 180 950 Q 500 760 ${MAKUHARI.x} ${MAKUHARI.y}`,
    lineClass: styles.conceptInbound1,
    travelerClass: styles.accountTraveler1,
    avatarSrc: "/chokaigi/avatars/streamerfunch.png",
    ringColor: "#1a5898",
    accountHandle: "streamerfunch",
    accountLabel: "君斗りんく＠クリエイター応援",
  },
  {
    id: "inbPath-kyushu",
    d: `M 310 780 Q 540 680 ${MAKUHARI.x} ${MAKUHARI.y}`,
    lineClass: styles.conceptInbound2,
    travelerClass: styles.accountTraveler2,
    avatarSrc: "/chokaigi/avatars/yukkuritanunee.png",
    ringColor: "#DD6500",
    accountHandle: "yukkuritanunee",
    accountLabel: "たぬ姉",
  },
  {
    id: "inbPath-chugoku",
    d: `M 450 620 Q 620 560 ${MAKUHARI.x} ${MAKUHARI.y}`,
    lineClass: styles.conceptInbound3,
    travelerClass: styles.accountTraveler3,
    avatarSrc: "/chokaigi/avatars/yukkurilink.png",
    ringColor: "#e91e63",
    accountHandle: "yukkurilink",
    accountLabel: "ゆっくりりんく",
  },
  {
    id: "inbPath-kinki",
    d: `M 620 500 Q 720 480 ${MAKUHARI.x} ${MAKUHARI.y}`,
    lineClass: styles.conceptInbound4,
    travelerClass: styles.accountTraveler4,
    avatarSrc: "/chokaigi/avatars/yukkurikonta.png",
    ringColor: "#ff9800",
    accountHandle: "yukkurikonta",
    accountLabel: "こん太",
  },
  {
    id: "inbPath-hokkaido",
    d: `M 830 200 Q 830 320 ${MAKUHARI.x} ${MAKUHARI.y}`,
    lineClass: styles.conceptInbound5,
    travelerClass: styles.accountTraveler5,
    avatarSrc: "/chokaigi/avatars/idolfunch.png",
    ringColor: "#00897b",
    accountHandle: "idolfunch",
    accountLabel: "君斗りんく＠動員ちゃれんじ",
  },
];

// 幕張 → 各地 の散出軌跡（同じ 5 方向）
const OUTBOUND_LINES: { d: string; className: string }[] = [
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 500 760 180 950`, className: styles.conceptOutbound1 },
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 540 680 310 780`, className: styles.conceptOutbound2 },
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 620 560 450 620`, className: styles.conceptOutbound3 },
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 720 480 620 500`, className: styles.conceptOutbound4 },
  { d: `M ${MAKUHARI.x} ${MAKUHARI.y} Q 830 320 830 200`, className: styles.conceptOutbound5 },
];

// 幕張の周りに集まっている群衆の配置（アバター点）
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

/**
 * 軌跡上を流れるアバターの半径（SVG 座標単位, 1024 viewBox）。
 * ここを小さくすると誰のアカウントか視認できないため、
 * 最低 18〜20 程度は確保する。到着時のみ CSS の `accountAvatarPop`
 * で一瞬 1.8x までスケールアップして顔を読みやすくする。
 */
const AVATAR_R = 20;

export function ChokaigiConceptBanner() {
  return (
    // 以前はコンテナ全体に aria-hidden="true" を付けていたが、内部に
    // 実在 X アカウントへリンクする <a> 要素（軌跡上のアバター）を
    // 追加したため、aria-hidden を外してキーボード／AT アクセスを確保する。
    // 装飾要素は個別に aria-hidden="true" を付け、ランドマーク的ノイズを抑制。
    <div className={styles.heroBackdrop}>
      {/* 正確な日本列島シルエット（装飾） */}
      <div className={styles.heroBackdropMap} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/chokaigi/japan-outline.svg"
          alt=""
          className={styles.heroBackdropMapImg}
          loading="eager"
          decoding="async"
        />
      </div>

      {/* 集まる／散らばる軌跡と幕張の会場、群衆、アバター移動を重ねる。
          SVG 全体の意味ラベルだけ aria-label で与え、内部の <a> 要素は
          個別に aria-label を持つ（role="img" にすると子要素が読み上げ対象外
          になるため付けない）。 */}
      <svg
        className={styles.heroBackdropOverlay}
        viewBox="0 0 1024 1024"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        aria-label="全国の X アカウントが幕張に集まってくる演出"
      >
        <defs>
          {/* 集まる軌跡を mpath で参照するため、defs に id 付きで定義 */}
          {INBOUND_LINES.map((line) => (
            <path key={line.id} id={line.id} d={line.d} />
          ))}

          {/*
           * アバターを円形に切り抜くための共通クリップパス。
           * `<g>` が animateMotion で動いても、g の local 座標系で適用されるため
           * 円の中心 (0,0) を自動で追従する。
           */}
          <clipPath id="avatarClip">
            <circle cx="0" cy="0" r={AVATAR_R - 1.2} />
          </clipPath>

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
         * X アカウント（＝参加者のアバター）を表すアイコンが
         * 各地 → 幕張 の軌跡上を流れてくる演出。
         * 「みんなが幕張に向かって集まってくる」を literal に見せる。
         *
         * 技術:
         * - `<g>` に animateMotion を掛けることで中身の <image> / <circle>
         *   がまとめて path を追従する
         * - 画像は <clipPath> で円形に切り抜き、枠は白＋アカウント色の二重線
         * - `<animate attributeName="opacity">` で到着時にフェードアウト
         */}
        <g className={styles.accountTravelers}>
          {INBOUND_LINES.map((line, i) => {
            const delay = i * 0.25;
            const accountUrl = xAccountUrl(line.accountHandle);
            const labelText = `${line.accountLabel}（@${line.accountHandle}）を X で開く`;
            return (
              <g key={`traveler-${line.id}`} className={line.travelerClass}>
                {/*
                 * SVG <a> は href を指定することで HTML アンカーと同等に動作する。
                 * - target="_blank" + rel="noopener noreferrer" で新規タブ & セキュリティ確保
                 * - <title> が hover 時のネイティブツールチップ
                 * - aria-label は読み上げ対応（親 div は aria-hidden のため
                 *   読み上げ経路には乗らないが、将来 aria-hidden を外すケースに備える）
                 * - CSS `.accountTravelers a` で pointer-events を復活させてクリック可能化
                 */}
                <a
                  href={accountUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={labelText}
                  className={styles.accountTravelerLink}
                >
                  <title>{labelText}</title>
                  {/*
                   * 内側のスケール用 <g>。親 <g> は animateMotion で移動だけを担当し、
                   * このネスト <g> が CSS keyframes (accountAvatarPop) でスケール変化を
                   * 行うことで「移動の transform」と「スケールの transform」が
                   * 衝突せずに合成される。animation-delay は親の animateMotion begin と
                   * 同一にして、到着タイミングとスケールピークを同期させる。
                   */}
                  <g
                    className={styles.accountAvatarPop}
                    style={{ animationDelay: `${delay}s` }}
                  >
                    <image
                      href={line.avatarSrc}
                      x={-AVATAR_R + 1.2}
                      y={-AVATAR_R + 1.2}
                      width={(AVATAR_R - 1.2) * 2}
                      height={(AVATAR_R - 1.2) * 2}
                      clipPath="url(#avatarClip)"
                      preserveAspectRatio="xMidYMid slice"
                    />
                    {/* 白枠（読みやすさ） */}
                    <circle
                      r={AVATAR_R - 0.6}
                      fill="none"
                      stroke="#fff"
                      strokeWidth="1.8"
                    />
                    {/* アカウント色の外リング */}
                    <circle
                      r={AVATAR_R + 0.6}
                      fill="none"
                      stroke={line.ringColor}
                      strokeWidth="1.6"
                      opacity="0.85"
                    />
                  </g>
                </a>
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
