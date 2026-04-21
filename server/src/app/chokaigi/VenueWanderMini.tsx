"use client";

import styles from "./chokaigi.module.css";

/* ============================================================
   幕張メッセ 会場ジオラマミニマップ
   viewBox: 0 0 300 190  （ wide / diorama style ）
   ============================================================ */

// ---- 座標定数 ----
const V = { w: 300, h: 190 } as const;

// メインホール (idx 0=H8 … 7=H1, 左→右)
const MH = { startX: 10, y: 12, h: 38, slotW: 27, hallW: 26 } as const;
function mhRect(idx: number) {
  return { x: MH.startX + idx * MH.slotW, y: MH.y, w: MH.hallW, h: MH.h };
}
const HALL_ORDER = [8, 7, 6, 5, 4, 3, 2, 1] as const;

// 各ホールの情報（エリア名・詳細は示意）
const HALL_INFO: Record<number, { area: string; details: string[] }> = {
  8: { area: "西入口・総合案内", details: ["チケット交換所", "案内・手荷物預かり", "コインロッカー"] },
  7: { area: "ニコニコ生放送", details: ["超ニコ生ブース", "公開生放送ステージ", "コメントアート"] },
  6: { area: "超クリエイター", details: ["超絵師ゾーン", "超ボカロPブース", "超作曲ライブ"] },
  5: { area: "ニコニコ動画館", details: ["殿堂入り動画展示", "ニコニコ歴史年表", "超ランキング"] },
  4: { area: "超VR / XR体験", details: ["VRアトラクション", "ARフォトスポット", "メタバース会場"] },
  3: { area: "超ゲーム・eスポーツ", details: ["大型ゲーム対戦台", "超eスポーツ舞台", "インディーゲーム"] },
  2: { area: "超アニメ・声優", details: ["声優サイン会", "アニメ新作展示", "超ラジオ公開収録"] },
  1: { area: "超メインステージ", details: ["ステージA・超パーティー", "超コンサート会場", "超ニコニコ大会議"] },
};

// サブホール
const SUB = [
  {
    n: 9, x: 10, y: 76, w: 68, h: 28,
    area: "超アイドル・ライブ",
    details: ["アイドルライブステージ", "握手・チェキ会", "超声援エリア"],
  },
  {
    n: 10, x: 81, y: 76, w: 68, h: 28,
    area: "超コスプレ広場",
    details: ["コスプレ撮影スポット", "衣装・造形展示", "超コスプレ大賞"],
  },
  {
    n: 11, x: 152, y: 76, w: 68, h: 28,
    area: "超ガジェット・Tech",
    details: ["最新ガジェット展示", "超ロボット体験", "電子工作ワークショップ"],
  },
] as const;

// 国際会議場
const CONF = { x: 233, y: 12, w: 45, h: 38 } as const;
const CONF_DETAILS = ["超トークショー会場", "アーティストトーク", "超プレスルーム"];

// 幕張イベントホール
const EH = { cx: 267, cy: 95, rx: 23, ry: 18 } as const;

// 2F メッセモール（歩行者通路）
const MALL = { x: 8, y: 51, w: 270, h: 13 } as const;

// ブリッジ（2F→1F 接続）各ホール中心 X
const BRIDGES = [23, 50, 77, 104, 131, 158, 185, 212, 250] as const;

// エスプラナード（南側屋外広場）
const ESPL = { x: 8, y: 108, w: 205, h: 14 } as const;

// ---- すれちがい済みユーザー（デモ） ----
// 実際のアプリでは APIから { imageUrl: twitterProfileUrl, handle, name } を受け取る
// 今は りんく・こん太・たぬ姉 がいる想定
const DEMO_ENCOUNTERS = [
  {
    id: "rink",
    name: "りんく",
    handle: "@rink",
    imageSrc: "/chokaigi/yukkuri/rink.png",
    cx: 158, cy: 34,     // H3 ゲームエリア中央
    location: "H3 超ゲーム",
    delay: 0,
  },
  {
    id: "konta",
    name: "こん太",
    handle: "@konta",
    imageSrc: "/chokaigi/yukkuri/konta.png",
    cx: 104, cy: 57.5,   // 2F メッセモール H5橋付近
    location: "2F 通路",
    delay: 0.8,
  },
  {
    id: "tanunee",
    name: "たぬ姉",
    handle: "@tanunee",
    imageSrc: "/chokaigi/yukkuri/tanunee.png",
    cx: 44, cy: 90,      // H9 超アイドルエリア
    location: "H9 ライブ",
    delay: 1.6,
  },
] as const;

const AR = 7.5; // アバター半径（SVGユニット）

// ---- カラーパレット ----
const C = {
  board: "#daf5fc",
  boardBorder: "#0077b6",
  grid: "#c0e8f4",

  hallFill: "#ffffff",
  hallStroke: "#0096c7",
  hallText: "#03045e",
  hallArea: "#1a6fa8",
  hallDetail: "#5ba3c4",
  hallDivider: "#c0e8f4",
  hallHighlight: "#e8f8ff",

  confFill: "#eef4ff",
  confStroke: "#3b82f6",
  confText: "#1e3a5f",
  confDetail: "#4a6fa8",

  mallFill: "#ade8f4",
  mallStroke: "#0077b6",
  mallText: "#023e8a",

  bridgeFill: "#d0f0fb",
  bridgeStroke: "#00b4d8",

  subFill: "#f0fdf4",
  subStroke: "#2d6a4f",
  subText: "#1b4332",
  subArea: "#2d6a4f",
  subDetail: "#4a8a6a",

  esplanadeFill: "#e8f5e9",
  esplanadeStroke: "#66bb6a",
  esplanadeText: "#2e7d32",

  ehFill: "#fff9e6",
  ehStroke: "#f9a825",
  ehText: "#5f4005",

  road: "#c8c8c8",
  roadLine: "#f0f0f0",

  gate: "#ef4444",
  twitter: "#1da1f2",
  caption: "#0077b6",
  badge: "#1da1f2",
};

// ============================================================
// コンポーネント
// ============================================================

export function VenueWanderMini() {
  const W = V.w;
  const H = V.h;
  const encounterCount = DEMO_ENCOUNTERS.length;

  return (
    <div className={styles.venueWanderMini}>
      <div
        className={styles.venueWanderMiniMap}
        role="img"
        aria-label="幕張メッセ 超会議会場マップ。ホール1〜11・国際会議場・幕張イベントホールを示意。すれちがったユーザーのアイコンが表示されます。"
      >
        <svg
          className={styles.venueWanderMiniSvg}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            {/* グリッドパターン（ジオラマ背景） */}
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke={C.grid} strokeWidth="0.25" />
            </pattern>
            {/* アバター円形クリップパス */}
            {DEMO_ENCOUNTERS.map((enc) => (
              <clipPath key={`clip-${enc.id}`} id={`clip-${enc.id}`}>
                <circle cx={enc.cx} cy={enc.cy} r={AR} />
              </clipPath>
            ))}
            {/* 影フィルタ */}
            <filter id="hallShadow" x="-5%" y="-5%" width="110%" height="115%">
              <feDropShadow dx="0" dy="0.8" stdDeviation="0.6" floodColor="rgba(0,100,160,0.18)" />
            </filter>
            <filter id="avatarShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="rgba(0,0,0,0.3)" />
            </filter>
          </defs>

          {/* ===== ボード背景 ===== */}
          <rect x="0" y="0" width={W} height={H} fill={C.board} rx="3" />
          <rect x="0" y="0" width={W} height={H} fill="url(#grid)" rx="3" />
          <rect x="0.7" y="0.7" width={W - 1.4} height={H - 1.4} fill="none" stroke={C.boardBorder} strokeWidth="1.2" rx="2.5" />

          {/* ===== 右上バッジ: すれちがい件数 ===== */}
          <rect x={W - 62} y="1.5" width="60" height="6" rx="3" fill={C.badge} />
          <text
            x={W - 32} y="6.1"
            textAnchor="middle" fill="white"
            fontSize="3.5" fontWeight={800}
            fontFamily="system-ui, sans-serif"
          >
            {encounterCount}人 すれちがい済み！
          </text>

          {/* ===== タイトル ===== */}
          <text
            x={W / 2 - 20} y="9.5"
            textAnchor="middle" fill={C.hallText}
            fontSize="4" fontWeight={800}
            fontFamily="system-ui, sans-serif"
          >
            幕張メッセ 超会議 会場マップ（示意）
          </text>

          {/* ===== 南入口ゲート ===== */}
          <rect x="1" y="50" width="7" height="3.5" rx="1.5" fill={C.gate} />
          <text x="4.5" y="52.8" textAnchor="middle" fill="white" fontSize="2" fontWeight={700} fontFamily="system-ui, sans-serif">西口</text>
          <rect x={MH.startX + 7 * MH.slotW + MH.hallW - 1} y="50" width="7" height="3.5" rx="1.5" fill={C.gate} />
          <text x={MH.startX + 7 * MH.slotW + MH.hallW + 2.5} y="52.8" textAnchor="middle" fill="white" fontSize="2" fontWeight={700} fontFamily="system-ui, sans-serif">東口</text>

          {/* ===== メインホール H8〜H1 ===== */}
          {HALL_ORDER.map((n, i) => {
            const r = mhRect(i);
            const info = HALL_INFO[n];
            const enc = DEMO_ENCOUNTERS.find(
              (e) => Math.abs(e.cx - (r.x + r.w / 2)) < r.w / 2 && e.cy > r.y && e.cy < r.y + r.h
            );
            const hasEnc = !!enc;
            const cx = r.x + r.w / 2;

            return (
              <g key={n} filter="url(#hallShadow)">
                {/* ホール背景 */}
                <rect
                  x={r.x} y={r.y} width={r.w} height={r.h}
                  rx="1"
                  fill={hasEnc ? C.hallHighlight : C.hallFill}
                  stroke={hasEnc ? C.twitter : C.hallStroke}
                  strokeWidth={hasEnc ? 1.2 : 0.8}
                />
                {/* 仕切り線（ブース列） */}
                {[1, 2].map((k) => (
                  <line
                    key={k}
                    x1={r.x + r.w * k / 3} y1={r.y + 1}
                    x2={r.x + r.w * k / 3} y2={r.y + r.h - 1}
                    stroke={C.hallDivider} strokeWidth="0.3"
                  />
                ))}
                {/* ホール番号 */}
                <text
                  x={cx}
                  y={hasEnc ? r.y + 6.5 : r.y + 12}
                  textAnchor="middle" fill={C.hallText}
                  fontSize={hasEnc ? "5.5" : "7"}
                  fontWeight={800}
                  fontFamily="system-ui, sans-serif"
                >
                  H{n}
                </text>
                {/* エリア名 */}
                <text
                  x={cx}
                  y={hasEnc ? r.y + 11.5 : r.y + 20}
                  textAnchor="middle" fill={C.hallArea}
                  fontSize={hasEnc ? "2.8" : "3.2"}
                  fontWeight={700}
                  fontFamily="system-ui, sans-serif"
                >
                  {info.area}
                </text>
                {/* 詳細（エンカウントなし時のみ） */}
                {!hasEnc && info.details.map((d, di) => (
                  <text
                    key={di}
                    x={cx}
                    y={r.y + 25 + di * 4.5}
                    textAnchor="middle" fill={C.hallDetail}
                    fontSize="2.2"
                    fontFamily="system-ui, sans-serif"
                  >
                    {d}
                  </text>
                ))}
              </g>
            );
          })}

          {/* ===== 国際会議場 ===== */}
          <g filter="url(#hallShadow)">
            <rect
              x={CONF.x} y={CONF.y} width={CONF.w} height={CONF.h}
              rx="1"
              fill={C.confFill}
              stroke={C.confStroke}
              strokeWidth="0.8"
            />
            <text x={CONF.x + CONF.w / 2} y={CONF.y + 8} textAnchor="middle" fill={C.confText} fontSize="4" fontWeight={800} fontFamily="system-ui, sans-serif">国際</text>
            <text x={CONF.x + CONF.w / 2} y={CONF.y + 13} textAnchor="middle" fill={C.confText} fontSize="4" fontWeight={800} fontFamily="system-ui, sans-serif">会議場</text>
            {CONF_DETAILS.map((d, i) => (
              <text key={i} x={CONF.x + CONF.w / 2} y={CONF.y + 22 + i * 4.5} textAnchor="middle" fill={C.confDetail} fontSize="2.2" fontFamily="system-ui, sans-serif">{d}</text>
            ))}
          </g>

          {/* ===== 2F メッセモール ===== */}
          <rect
            x={MALL.x} y={MALL.y} width={MALL.w} height={MALL.h}
            rx="2"
            fill={C.mallFill}
            stroke={C.mallStroke}
            strokeWidth="0.7"
          />
          {/* 通路の区切り線 */}
          <line x1={MALL.x + 2} y1={MALL.y + MALL.h / 2} x2={MALL.x + MALL.w - 2} y2={MALL.y + MALL.h / 2} stroke={C.mallStroke} strokeWidth="0.25" strokeDasharray="2 1.5" />
          <text
            x={MALL.x + MALL.w / 2 - 30} y={MALL.y + MALL.h * 0.58}
            textAnchor="middle" fill={C.mallText}
            fontSize="3" fontWeight={700}
            fontFamily="system-ui, sans-serif"
          >
            ← 2F 歩行者通路（メッセモール / エスプラナード） →
          </text>

          {/* ===== ブリッジ（2F→1F） ===== */}
          {BRIDGES.map((bx, i) => (
            <g key={`br-${i}`}>
              <rect
                x={bx - 1.5} y={MALL.y + MALL.h}
                width={3} height={14}
                rx="0.8"
                fill={C.bridgeFill}
                stroke={C.bridgeStroke}
                strokeWidth="0.4"
              />
            </g>
          ))}
          {/* 2F↔1F ラベル */}
          <text
            x={BRIDGES[3]} y={MALL.y + MALL.h + 10}
            textAnchor="middle" fill={C.mallText}
            fontSize="2"
            fontFamily="system-ui, sans-serif"
            transform={`rotate(-90, ${BRIDGES[3]}, ${MALL.y + MALL.h + 10})`}
          >
            2F↔1F
          </text>

          {/* ===== サブホール H9〜H11 ===== */}
          {SUB.map((s) => {
            const enc = DEMO_ENCOUNTERS.find(
              (e) => Math.abs(e.cx - (s.x + s.w / 2)) < s.w / 2 && e.cy > s.y && e.cy < s.y + s.h
            );
            const hasEnc = !!enc;
            const cx = s.x + s.w / 2;

            return (
              <g key={s.n} filter="url(#hallShadow)">
                <rect
                  x={s.x} y={s.y} width={s.w} height={s.h}
                  rx="1"
                  fill={hasEnc ? "#ecfdf5" : C.subFill}
                  stroke={hasEnc ? C.twitter : C.subStroke}
                  strokeWidth={hasEnc ? 1.2 : 0.8}
                />
                {[1, 2].map((k) => (
                  <line key={k}
                    x1={s.x + s.w * k / 3} y1={s.y + 1}
                    x2={s.x + s.w * k / 3} y2={s.y + s.h - 1}
                    stroke={C.subStroke} strokeWidth="0.25" opacity={0.5}
                  />
                ))}
                {/* ホール番号 */}
                <text
                  x={cx}
                  y={hasEnc ? s.y + 7.5 : s.y + 10}
                  textAnchor="middle" fill={C.subText}
                  fontSize={hasEnc ? "6" : "7.5"}
                  fontWeight={800}
                  fontFamily="system-ui, sans-serif"
                >
                  H{s.n}
                </text>
                {/* エリア名 */}
                <text
                  x={cx}
                  y={hasEnc ? s.y + 14 : s.y + 17}
                  textAnchor="middle" fill={C.subArea}
                  fontSize={hasEnc ? "3" : "3.5"}
                  fontWeight={700}
                  fontFamily="system-ui, sans-serif"
                >
                  {s.area}
                </text>
                {/* 詳細 */}
                {!hasEnc && s.details.map((d, di) => (
                  <text
                    key={di}
                    x={cx}
                    y={s.y + 22 + di * 4.2}
                    textAnchor="middle" fill={C.subDetail}
                    fontSize="2.3"
                    fontFamily="system-ui, sans-serif"
                  >
                    {d}
                  </text>
                ))}
              </g>
            );
          })}

          {/* ===== 幕張イベントホール ===== */}
          <ellipse cx={EH.cx} cy={EH.cy} rx={EH.rx + 1.5} ry={EH.ry + 1.5} fill="rgba(249,168,37,0.15)" />
          <ellipse cx={EH.cx} cy={EH.cy} rx={EH.rx} ry={EH.ry} fill={C.ehFill} stroke={C.ehStroke} strokeWidth="0.8" />
          <ellipse cx={EH.cx} cy={EH.cy} rx={EH.rx * 0.45} ry={EH.ry * 0.45} fill={C.ehStroke} opacity="0.2" />
          <text x={EH.cx} y={EH.cy - 5} textAnchor="middle" fill={C.ehText} fontSize="3.5" fontWeight={800} fontFamily="system-ui, sans-serif">幕張</text>
          <text x={EH.cx} y={EH.cy} textAnchor="middle" fill={C.ehText} fontSize="3.5" fontWeight={800} fontFamily="system-ui, sans-serif">イベント</text>
          <text x={EH.cx} y={EH.cy + 5} textAnchor="middle" fill={C.ehText} fontSize="3.5" fontWeight={800} fontFamily="system-ui, sans-serif">ホール</text>

          {/* ===== エスプラナード（南側屋外広場） ===== */}
          <rect
            x={ESPL.x} y={ESPL.y} width={ESPL.w} height={ESPL.h}
            rx="1.5"
            fill={C.esplanadeFill}
            stroke={C.esplanadeStroke}
            strokeWidth="0.5"
          />
          <text x={ESPL.x + ESPL.w / 2} y={ESPL.y + 8.5} textAnchor="middle" fill={C.esplanadeText} fontSize="3.5" fontWeight={700} fontFamily="system-ui, sans-serif">
            エスプラナード（屋外広場） ← → 海浜幕張駅
          </text>
          {/* 木のシンボル */}
          {[20, 35, 50, 65, 80, 95, 110].map((tx) => (
            <g key={tx}>
              <ellipse cx={tx} cy={ESPL.y + 5} rx="2.2" ry="2.2" fill="#81c784" opacity="0.7" />
              <rect x={tx - 0.5} y={ESPL.y + 6.5} width="1" height="3" fill="#795548" opacity="0.6" />
            </g>
          ))}

          {/* ===== 南側道路 ===== */}
          <rect x="0" y={ESPL.y + ESPL.h} width={W} height="7" fill={C.road} />
          <line x1="0" y1={ESPL.y + ESPL.h + 3.5} x2={W} y2={ESPL.y + ESPL.h + 3.5} stroke={C.roadLine} strokeWidth="0.5" strokeDasharray="8 5" />

          {/* ===== P 駐車場 ===== */}
          <rect x={ESPL.x + ESPL.w + 5} y={ESPL.y} width="35" height={ESPL.h} rx="1.5" fill="#e3f0ff" stroke="#5c8fc7" strokeWidth="0.5" />
          <text x={ESPL.x + ESPL.w + 22.5} y={ESPL.y + 9} textAnchor="middle" fill="#255d9b" fontSize="5" fontWeight={800} fontFamily="system-ui, sans-serif">P</text>
          <text x={ESPL.x + ESPL.w + 22.5} y={ESPL.y + 14.5} textAnchor="middle" fill="#255d9b" fontSize="2.5" fontFamily="system-ui, sans-serif">駐車場</text>

          {/* ===== すれちがい済みアバターピン ===== */}
          {DEMO_ENCOUNTERS.map((enc, i) => (
            <g key={enc.id} filter="url(#avatarShadow)">
              {/* パルスリング */}
              <circle cx={enc.cx} cy={enc.cy} r={AR + 2} fill="none" stroke={C.twitter} strokeWidth="0.8">
                <animate
                  attributeName="r"
                  values={`${AR + 1};${AR + 6}`}
                  dur="2.5s"
                  begin={`${enc.delay}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.7;0"
                  dur="2.5s"
                  begin={`${enc.delay}s`}
                  repeatCount="indefinite"
                />
              </circle>
              {/* Twitterブルーリング */}
              <circle cx={enc.cx} cy={enc.cy} r={AR + 1.3} fill={C.twitter} />
              {/* 白いフチ */}
              <circle cx={enc.cx} cy={enc.cy} r={AR + 0.4} fill="white" />
              {/* プロフィール画像（円形クリップ） */}
              <image
                href={enc.imageSrc}
                x={enc.cx - AR} y={enc.cy - AR}
                width={AR * 2} height={AR * 2}
                clipPath={`url(#clip-${enc.id})`}
                preserveAspectRatio="xMidYMid slice"
              />
              {/* 名前バッジ */}
              <rect
                x={enc.cx - 9} y={enc.cy + AR + 1.2}
                width={18} height={5.5}
                rx="2.8" fill={C.twitter}
              />
              <text
                x={enc.cx} y={enc.cy + AR + 5.3}
                textAnchor="middle" fill="white"
                fontSize="3.5" fontWeight={800}
                fontFamily="system-ui, sans-serif"
              >
                {enc.name}
              </text>
              {/* 場所ラベル */}
              <text
                x={enc.cx} y={enc.cy + AR + 10.5}
                textAnchor="middle" fill={C.caption}
                fontSize="2.8" fontWeight={600}
                fontFamily="system-ui, sans-serif"
              >
                {enc.location}
              </text>
            </g>
          ))}

          {/* ===== 凡例 ===== */}
          <circle cx="10" cy={H - 5} r="2" fill={C.twitter} />
          <text x="14" y={H - 3.8} fill={C.hallText} fontSize="2.8" fontFamily="system-ui, sans-serif" fontWeight={600}>
            = すれちがったユーザーのアイコン（デモ）
          </text>

          {/* ===== 注記 ===== */}
          <text
            x={W / 2} y={H - 0.8}
            textAnchor="middle" fill={C.caption}
            fontSize="2.2"
            fontFamily="system-ui, sans-serif"
          >
            ※ 区画・経路・コンテンツは示意。実際の配置は公式PDFと会場掲示を参照
          </text>
        </svg>

        {/* ===== 歩き回るキャラクター（現在地イメージ） ===== */}
        {(
          [
            { name: "りんく",  imageSrc: "/chokaigi/yukkuri/rink.png",    speech: "どこ？",         trackN: 1 },
            { name: "こん太",  imageSrc: "/chokaigi/yukkuri/konta.png",   speech: "あ、いたいた！",  trackN: 2 },
            { name: "たぬ姉",  imageSrc: "/chokaigi/yukkuri/tanunee.png", speech: "すれちがった！",  trackN: 3 },
          ] as const
        ).map((g) => (
          <div
            key={g.name}
            className={`${styles.venueWanderMiniTrack} ${styles[`venueWanderMiniTrack${g.trackN}`]}`}
          >
            <div
              className={styles.venueWanderMiniSprite}
              style={{ backgroundImage: `url("${g.imageSrc}")` }}
              aria-hidden="true"
            />
            <span
              className={`${styles.venueWanderMiniBubble} ${styles[`venueWanderMiniBubble${g.trackN}`]}`}
              aria-hidden="true"
            >
              {g.speech}
            </span>
          </div>
        ))}
      </div>

      <p className={styles.venueWanderMiniCaption}>
        国際展示場メイン棟（HALL1〜8）と9〜11棟は、2階の歩行者動線（メッセモール）で連結されます。
        すれちがった相手のアイコンが実際の場所に表示されます（上図はデモ）。
        正確な位置・出入口は公式PDFをご確認ください。
      </p>
      <p className={styles.venueWanderMiniSubcaption}>
        迷路のような広さのなか、<strong>すれちがった</strong>相手のアイコンが会場マップに記録されます
      </p>
    </div>
  );
}
