"use client";

import styles from "./chokaigi.module.css";

/* ============================================================
   幕張メッセ 超会議 会場詳細マップ
   viewBox 1000 × ~4000 — 縦スクロール全画面
   左列: ホール番号＋アバター  中列: 展示内容  右列: クリエイタークロス
   ============================================================ */

const W        = 1000;
const TITLE_H  = 72;
const HALL_H   = 400;   // 各ホール帯の高さ
const HALL_GAP = 10;
const HALL_STEP= HALL_H + HALL_GAP; // 410
const LEFT_W   = 185;   // ホール番号列
const SPLIT_X  = 620;   // 中列終端 / 右列開始
const CONT_X   = 200;   // 展示内容 開始 X
const AR       = 33;    // アバター半径

function hallY(idx: number) { return TITLE_H + idx * HALL_STEP; }

const HALL_ORDER = [8, 7, 6, 5, 4, 3, 2, 1] as const;

// ---- ホール情報（2026実データ） ----
const HALL_INFO: Record<
  number,
  { area: string; color: string; bg: string; items: readonly string[] }
> = {
  8: {
    area: "超音楽祭 2026",
    color: "#1565c0", bg: "rgba(207,226,255,0.95)",
    items: ["らっぷびと World Wide Words LIVE", "超推しグルライブ 特設ステージ",
            "ニコニコ音楽大賞 2026 授賞式", "超バンドセッション 公開演奏",
            "音楽クリエイター ブース展示", "超カラオケ選手権 2026",
            "音楽制作体験 ワークショップ", "超音楽フィナーレ グランドLIVE"],
  },
  7: {
    area: "超VTuber・コスプレ・神社",
    color: "#0277bd", bg: "rgba(200,232,255,0.95)",
    items: ["超VTuberのASMR足湯（整理券制）", "おめがシスターズ 出演",
            "因幡はねる 出演", "えのぐ 特別パフォーマンス",
            "花京院ちえり 出演", "超コスプレ大賞 2026",
            "超神社（縁結びスポット）", "VTuberサイン会エリア"],
  },
  6: {
    area: "超ニコニコ盆踊り 2026",
    color: "#6a1b9a", bg: "rgba(237,215,255,0.95)",
    items: ["盆踊りメインステージ（小林幸子）", "鬼龍院翔 出演（4/25）",
            "AKINO with bless4（4/26）", "高橋洋子 出演（4/26）",
            "振付体験コーナー（誰でも参加）", "浴衣レンタル＆フォトスポット",
            "縁日マーケット", "超祭りフード・屋台エリア"],
  },
  5: {
    area: "ニコニコ動画 20周年記念館",
    color: "#1a237e", bg: "rgba(210,228,255,0.95)",
    items: ["ニコニコ動画20周年 特別展示", "殿堂入り動画 大上映会",
            "懐かしの名物コメント体験台", "ニコニコ歴史年表ウォーク",
            "投稿者インタビュー 映像コーナー", "超ランキング発表 LIVE",
            "MAD作品 アーカイブ展", "メモリアル映像 上映シアター"],
  },
  4: {
    area: "超政治・超討論・超ニコニコ党",
    color: "#4527a0", bg: "rgba(230,218,255,0.95)",
    items: ["超ニコニコ党 政策発表会", "政治家 ニコ生出演コーナー",
            "超討論バトル ステージ", "リアルタイム投票参加型企画",
            "超選挙速報 コーナー", "政策アンケート 投票ブース",
            "超ニコニコ党 グッズ販売", "未来への提言 ステージ"],
  },
  3: {
    area: "超スペシャルステージ・演奏してみた",
    color: "#0d47a1", bg: "rgba(205,220,255,0.95)",
    items: ["超スペシャルステージ（ふぉ〜ゆ〜 4/26）", "宮田俊哉 出演（4/26）",
            "東京アクティブNEETs 演奏", "みきとP バンドLIVE",
            "Ayasa バイオリン特別演奏", "超演奏してみた コンテスト",
            "楽器体験 ワークショップ", "超セッション 飛び入り参加"],
  },
  2: {
    area: "超ユーザー企画・ニコニコ文化",
    color: "#bf360c", bg: "rgba(255,225,210,0.95)",
    items: ["超ユーザー企画 大集合ステージ", "ニコニコ名物企画 総選挙",
            "超わかりやすい動画大賞 授賞", "ニコニコ哲学討論コーナー",
            "超コラボ実況コーナー", "ファン交流エリア",
            "超MAD上映会", "ニコニコ文化 アーカイブ展"],
  },
  1: {
    area: "超踊ってみた・歌ってみた",
    color: "#e65100", bg: "rgba(255,243,205,0.95)",
    items: ["超踊ってみたステージ（足太ぺんた 他）", "えまちゃんこ鍋・おうどん 出演",
            "とげち・ぽるし・わた 出演", "超歌ってみた Collection LIVE",
            "ゴム・ピコ・ぽこた Guest（4/25）", "みちゃおん・わかみょ（4/26）",
            "小林幸子×亜沙×鈴華ゆう子 Collection THE LIVE",
            "ダンス体験 ワークショップ"],
  },
};

// ---- クリエイタークロス スケジュール ----
type Slot = { time: string; name: string; role: string; activity: string };

// ---- クリエイタークロス スケジュール（2026実データ） ----
const CC_SCHEDULE: Record<number, Slot[]> = {
  8: [
    { time: "11:00", name: "らっぷびと",           role: "ラッパー/ボカロP",     activity: "World Wide Words 特別ライブ" },
    { time: "14:00", name: "超推しグルライブ MC",   role: "MC",                  activity: "超推しグルライブ ステージ 司会" },
    { time: "16:30", name: "音楽大賞 授賞者",       role: "クリエイター出演",     activity: "超音楽大賞 2026 フィナーレ" },
  ],
  7: [
    { time: "10:30", name: "おめがシスターズ",      role: "VTuber",              activity: "超VTuberのASMR足湯 出演" },
    { time: "12:30", name: "因幡はねる",            role: "VTuber",              activity: "ASMR足湯 トークライブ" },
    { time: "14:30", name: "えのぐ",               role: "VTuber",              activity: "えのぐ 特別パフォーマンス" },
    { time: "16:30", name: "花京院ちえり",          role: "VTuber",              activity: "超コスプレ 審査ゲスト登場" },
  ],
  6: [
    { time: "11:00", name: "小林幸子",              role: "歌手",                activity: "超ニコニコ盆踊り オープニング" },
    { time: "13:30", name: "鬼龍院翔",              role: "歌手（ゴールデンボンバー）", activity: "盆踊りスペシャル（4/25）" },
    { time: "13:30", name: "高橋洋子",              role: "歌手",                activity: "盆踊りスペシャル（4/26）" },
    { time: "16:00", name: "AKINO with bless4",    role: "歌手",                activity: "超盆踊り フィナーレ（4/26）" },
  ],
  5: [
    { time: "10:00", name: "ニコニコ公式",          role: "運営",                activity: "20周年記念 特別トーク" },
    { time: "12:30", name: "殿堂入り解説MC",        role: "解説者",              activity: "殿堂入り動画 特別上映＆解説" },
    { time: "15:00", name: "超ランキング委員会",     role: "特別企画",            activity: "超ランキング発表 LIVE" },
    { time: "17:00", name: "名物投稿者ゲスト",      role: "ニコ動クリエイター",   activity: "投稿者インタビュー＆トーク" },
  ],
  4: [
    { time: "11:00", name: "超ニコニコ党 議員",     role: "政治家",              activity: "超ニコニコ党 政策発表会" },
    { time: "13:30", name: "討論バトル MC",         role: "MC",                  activity: "超討論バトルステージ 司会" },
    { time: "15:30", name: "政策投票 特別企画",     role: "特別企画",            activity: "リアルタイム投票参加型 超政策会議" },
    { time: "17:30", name: "未来提言 ゲスト",       role: "スペシャルゲスト",    activity: "未来への提言 ステージ" },
  ],
  3: [
    { time: "11:00", name: "東京アクティブNEETs",   role: "演奏してみたグループ", activity: "超演奏してみた 特別ステージ" },
    { time: "13:00", name: "みきとP",               role: "ボカロP/バンドマン",   activity: "みきとP バンドLIVE" },
    { time: "14:30", name: "Ayasa",                role: "バイオリニスト",        activity: "Ayasa バイオリン特別演奏" },
    { time: "16:30", name: "ふぉ〜ゆ〜",            role: "アイドル",             activity: "超スペシャルステージ（4/26）" },
  ],
  2: [
    { time: "10:30", name: "超ユーザー企画 MC",     role: "MC",                  activity: "超ユーザー企画 大集合 オープニング" },
    { time: "13:00", name: "ニコニコ哲学会",        role: "ユーザー企画",         activity: "超わかりやすい動画大賞 審査" },
    { time: "15:00", name: "超MAD上映委員会",       role: "クリエイター",         activity: "超MAD上映会＆解説トーク" },
    { time: "17:00", name: "ニコニコ文化継承委",    role: "特別企画",             activity: "ニコニコ文化アーカイブ トーク" },
  ],
  1: [
    { time: "10:30", name: "足太ぺんた",            role: "踊ってみた",           activity: "超踊ってみた オープニングステージ" },
    { time: "12:30", name: "ゴム・ピコ・ぽこた",    role: "歌ってみた",           activity: "超歌ってみた Collection LIVE（4/25）" },
    { time: "12:30", name: "みちゃおん・わかみょ",  role: "歌ってみた",           activity: "超歌ってみた Collection LIVE（4/26）" },
    { time: "15:00", name: "小林幸子・亜沙・鈴華ゆう子", role: "アーティスト",  activity: "Collection THE LIVE スペシャル" },
  ],
};

// ---- サブホール ----
const SUB_SECTION_Y = TITLE_H + 8 * HALL_STEP + 30;
const SUB_LABEL_H   = 52;
const SUB_START_Y   = SUB_SECTION_Y + SUB_LABEL_H;
const SUB_H         = 430;
const SUB_SLOTS = [{ x: 0, w: 330 }, { x: 340, w: 330 }, { x: 680, w: 320 }] as const;

// ---- サブホール（2026実データ） ----
const SUB_INFO = [
  {
    n: 9,  area: "ゲーム実況者超大集合 2026",  color: "#1b5e20", bg: "rgba(200,242,210,0.95)",
    items: ["ゲーム実況者 大集合ステージ", "MC：ドグマ風見・クサカアキラ",
            "有吉ぃぃeeeee!（アンガールズ田中）", "大型ゲーム対戦台",
            "ゲーム実況コーナー", "インディーゲーム 展示",
            "eスポーツ対抗戦", "実況者サイン会エリア"],
    creators: [
      { time: "11:00", name: "ドグマ風見",      role: "ゲーム実況MC",   activity: "ゲーム実況者超大集合 開幕MC" },
      { time: "13:30", name: "クサカアキラ",     role: "ゲーム実況MC",   activity: "大集合ステージ 司会" },
      { time: "15:00", name: "アンガールズ田中", role: "芸人/ゲーマー",  activity: "有吉ぃぃeeeee! 特別出演" },
    ],
  },
  {
    n: 10, area: "超音声合成×オフ会",         color: "#2e7d32", bg: "rgba(210,245,220,0.95)",
    items: ["ずんだもん ブース", "琴葉茜・葵 出演",
            "東北ずん子 出演", "超VOICEVOX 体験コーナー",
            "音声合成技術 展示", "音声合成クリエイター ブース",
            "ボイス収録体験", "合成音声カラオケ"],
    creators: [
      { time: "10:30", name: "ずんだもん",       role: "音声合成キャラ", activity: "ずんだもんブース オープニング" },
      { time: "13:00", name: "琴葉茜・葵",       role: "音声合成キャラ", activity: "超音声合成 オフ会トーク" },
      { time: "15:30", name: "東北ずん子",       role: "音声合成キャラ", activity: "超VOICEVOX 体験 解説MC" },
    ],
  },
  {
    n: 11, area: "超ニコニコ技術・ドワンゴ展示", color: "#00695c", bg: "rgba(200,245,240,0.95)",
    items: ["ドワンゴ最新技術 展示", "超AI・VR 体験コーナー",
            "ニコ動システム 公開展示", "超プログラミング ハッカソン",
            "テクノロジー年表 展示ウォーク", "超エンジニア 登壇トーク",
            "N高・S高 教育展示", "超スタートアップ 展示"],
    creators: [
      { time: "11:00", name: "ドワンゴエンジニア", role: "エンジニア", activity: "ニコ動システム 公開解説トーク" },
      { time: "13:30", name: "N高生 発表者",       role: "N高生",     activity: "超N高 最優秀作品 発表" },
      { time: "15:30", name: "AI研究者",           role: "研究者",    activity: "超AI体験コーナー ガイド解説" },
    ],
  },
] as const;

// ---- デモ遭遇ユーザー ----
const DEMO_ENCOUNTERS = [
  { id: "rink",    name: "りんく",  imageSrc: "/chokaigi/yukkuri/rink.png",    hallIdx: 5,    subIdx: null, delay: 0   },
  { id: "konta",   name: "こん太",  imageSrc: "/chokaigi/yukkuri/konta.png",   hallIdx: 1,    subIdx: null, delay: 0.8 },
  { id: "tanunee", name: "たぬ姉", imageSrc: "/chokaigi/yukkuri/tanunee.png",  hallIdx: null, subIdx: 0,    delay: 1.6 },
] as const;

// ---- 国際会議場 + 幕張イベントホール ----
const EXTRA_Y  = SUB_START_Y + SUB_H + 28;
const EXTRA_H  = 260;
const ESPL_Y   = EXTRA_Y + EXTRA_H + 22;
const ESPL_H   = 80;
const ROAD_Y   = ESPL_Y + ESPL_H;
const LEGEND_Y = ROAD_Y + 48;
const V_H      = LEGEND_Y + 85;

// ============================================================
// アバターピン（左列用・自己完結clipPath）
// ============================================================
function AvatarPin({ cx, cy, r, imageSrc, name, delay }: {
  cx: number; cy: number; r: number;
  imageSrc: string; name: string; delay: number;
}) {
  const clipId = `avclip-${cx.toFixed(0)}-${cy.toFixed(0)}`;
  const bw = name.length * 12 + 22;
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="#1da1f2" strokeWidth="2.5">
        <animate attributeName="r"       values={`${r + 2};${r + 20}`} dur="2.5s" begin={`${delay}s`} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.75;0"               dur="2.5s" begin={`${delay}s`} repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={r + 5}   fill="#1da1f2" />
      <circle cx={cx} cy={cy} r={r + 2}   fill="white" />
      <image
        href={imageSrc} x={cx - r} y={cy - r} width={r * 2} height={r * 2}
        clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice"
      />
      <rect x={cx - bw / 2} y={cy + r + 7}  width={bw} height={24} rx={12} fill="#1da1f2" />
      <text
        x={cx} y={cy + r + 23}
        textAnchor="middle" fill="white" fontSize={14}
        fontWeight={800} fontFamily="system-ui, sans-serif"
      >
        {name}
      </text>
    </g>
  );
}

// ============================================================
// クリエイタークロス スケジュール描画
// ============================================================
function CreatorSchedule({ slots, sy, color }: { slots: Slot[]; sy: number; color: string }) {
  const PX    = SPLIT_X + 14;   // 右列 X 開始
  const ROW_H = 72;              // 1スロットの高さ
  const START_Y = sy + 48;      // ヘッダの下
  return (
    <g>
      {/* 右列背景 */}
      <rect x={SPLIT_X} y={sy + 1} width={W - SPLIT_X} height={HALL_H - 2}
        fill={color} opacity={0.06} rx={8} />
      <line x1={SPLIT_X} y1={sy + 14} x2={SPLIT_X} y2={sy + HALL_H - 14}
        stroke={color} strokeWidth={1.5} opacity={0.2} />

      {/* ヘッダ */}
      <rect x={SPLIT_X + 8} y={sy + 10} width={W - SPLIT_X - 18} height={28} rx={6} fill={color} opacity={0.15} />
      <text x={PX + 4} y={sy + 28} fill={color} fontSize={16} fontWeight={900}
        fontFamily="system-ui, 'BIZ UDPGothic', sans-serif" letterSpacing={1}>
        ▶ クリエイタークロス
      </text>

      {slots.map((s, i) => {
        const ry = START_Y + i * ROW_H;
        return (
          <g key={i}>
            {/* 時刻バッジ */}
            <rect x={PX} y={ry} width={70} height={22} rx={11} fill={color} opacity={0.85} />
            <text x={PX + 35} y={ry + 15} textAnchor="middle" fill="white" fontSize={13}
              fontWeight={800} fontFamily="system-ui, sans-serif">{s.time}</text>

            {/* 名前 */}
            <text x={PX + 80} y={ry + 16} fill={color} fontSize={18} fontWeight={800}
              fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">{s.name}</text>

            {/* 役割バッジ */}
            <rect x={PX + 80} y={ry + 22} width={s.role.length * 10 + 12} height={18} rx={4}
              fill={color} opacity={0.12} />
            <text x={PX + 86} y={ry + 35} fill={color} fontSize={12} fontWeight={700}
              fontFamily="system-ui, sans-serif" opacity={0.8}>{s.role}</text>

            {/* 活動内容 */}
            <text x={PX} y={ry + 56} fill={color} fontSize={16} fontWeight={500}
              fontFamily="system-ui, 'BIZ UDPGothic', sans-serif" opacity={0.85}>
              {s.activity}
            </text>

            {/* 区切り */}
            {i < slots.length - 1 && (
              <line x1={PX} y1={ry + 66} x2={W - 16} y2={ry + 66}
                stroke={color} strokeWidth={0.7} opacity={0.15} />
            )}
          </g>
        );
      })}
    </g>
  );
}

// ============================================================
// メインホール帯
// ============================================================
function HallStrip({ n, idx }: { n: number; idx: number }) {
  const sy   = hallY(idx);
  const info = HALL_INFO[n];
  const slots = CC_SCHEDULE[n] ?? [];
  const enc  = DEMO_ENCOUNTERS.find((e) => e.hallIdx === idx);
  const hasEnc = !!enc;

  // アバターは左列下部に配置
  const avCx = LEFT_W / 2;
  const avCy = sy + (hasEnc ? 320 : 0);

  return (
    <g>
      {/* 背景 */}
      <rect x={0} y={sy} width={W} height={HALL_H} rx={10} fill={info.bg} />
      <rect x={0} y={sy} width={W} height={HALL_H} rx={10} fill="none"
        stroke={info.color} strokeWidth={1.8} opacity={0.38} />

      {/* 左列アクセント */}
      <rect x={0} y={sy} width={LEFT_W} height={HALL_H} rx={10}
        fill={info.color} opacity={0.08} />
      <line x1={LEFT_W} y1={sy + 14} x2={LEFT_W} y2={sy + HALL_H - 14}
        stroke={info.color} strokeWidth={2} opacity={0.22} />

      {/* ホール番号（大） */}
      <text
        x={LEFT_W / 2} y={sy + 115}
        textAnchor="middle" fill={info.color}
        fontSize={98} fontWeight={900} fontFamily="system-ui, sans-serif" opacity={0.88}
      >
        H{n}
      </text>

      {/* すれちがいバッジ */}
      {hasEnc && (
        <rect x={14} y={sy + 133} width={LEFT_W - 28} height={28} rx={14} fill="#1da1f2" />
      )}
      {hasEnc && (
        <text x={LEFT_W / 2} y={sy + 152} textAnchor="middle" fill="white" fontSize={14}
          fontWeight={800} fontFamily="system-ui, sans-serif">★ すれちがい！</text>
      )}

      {/* アバター（左列下部） */}
      {hasEnc && enc && (
        <AvatarPin cx={avCx} cy={avCy} r={AR}
          imageSrc={enc.imageSrc} name={enc.name} delay={enc.delay} />
      )}

      {/* エリア名（アバターがない場合は下部に、ある場合は上部に） */}
      {info.area.split("・").map((part, pi) => (
        <text
          key={pi}
          x={LEFT_W / 2}
          y={sy + (hasEnc ? 185 : 195) + pi * 22}
          textAnchor="middle" fill={info.color}
          fontSize={16} fontWeight={700}
          fontFamily="system-ui, 'BIZ UDPGothic', sans-serif"
        >
          {part}
        </text>
      ))}

      {/* 展示内容ヘッダ */}
      <text x={CONT_X + 6} y={sy + 30} fill={info.color} fontSize={17} fontWeight={800}
        fontFamily="system-ui, sans-serif" opacity={0.65}>展示・イベント内容</text>
      <line x1={CONT_X} y1={sy + 38} x2={SPLIT_X - 10} y2={sy + 38}
        stroke={info.color} strokeWidth={1} opacity={0.2} />

      {/* アイテムリスト */}
      {info.items.map((item, i) => {
        const iy = sy + 58 + i * 42;
        return (
          <g key={i}>
            <circle cx={CONT_X + 12} cy={iy}     r={8}   fill={info.color} opacity={0.18} />
            <circle cx={CONT_X + 12} cy={iy}     r={4.5} fill={info.color} opacity={0.9} />
            <text x={CONT_X + 28} y={iy + 7} fill={info.color} fontSize={20}
              fontWeight={600} fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">
              {item}
            </text>
          </g>
        );
      })}

      {/* クリエイタークロス（右列） */}
      <CreatorSchedule slots={slots} sy={sy} color={info.color} />
    </g>
  );
}

// ============================================================
// サブホール帯（H9 / H10 / H11 横並び）
// ============================================================
function SubHallStrip({ info, slotIdx }: {
  info: (typeof SUB_INFO)[number];
  slotIdx: number;
}) {
  const slot   = SUB_SLOTS[slotIdx];
  const sy     = SUB_START_Y;
  const enc    = DEMO_ENCOUNTERS.find((e) => e.subIdx === slotIdx);
  const hasEnc = !!enc;

  const avCx = slot.x + slot.w / 2;
  const avCy = sy + 88;
  const ITEM_H  = 26;
  const ITEM_SY = sy + (hasEnc ? 200 : 158);

  return (
    <g>
      <rect x={slot.x} y={sy} width={slot.w} height={SUB_H} rx={8} fill={info.bg} />
      <rect x={slot.x} y={sy} width={slot.w} height={SUB_H} rx={8} fill="none"
        stroke={info.color} strokeWidth={1.8} opacity={0.4} />

      {/* ホール番号 */}
      <text x={avCx} y={sy + (hasEnc ? 48 : 62)} textAnchor="middle" fill={info.color}
        fontSize={hasEnc ? 40 : 60} fontWeight={900}
        fontFamily="system-ui, sans-serif" opacity={0.85}>
        H{info.n}
      </text>

      {/* アバター + バッジ */}
      {hasEnc && enc && (
        <>
          <AvatarPin cx={avCx} cy={avCy} r={28}
            imageSrc={enc.imageSrc} name={enc.name} delay={enc.delay} />
          <rect x={slot.x + 18} y={sy + 128} width={slot.w - 36} height={24} rx={12} fill="#1da1f2" />
          <text x={avCx} y={sy + 144} textAnchor="middle" fill="white" fontSize={13}
            fontWeight={800} fontFamily="system-ui, sans-serif">★ すれちがい！</text>
        </>
      )}

      {/* エリア名 */}
      <text x={avCx} y={sy + (hasEnc ? 175 : 130)} textAnchor="middle" fill={info.color}
        fontSize={16} fontWeight={700} fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">
        {info.area}
      </text>
      <line x1={slot.x + 12} y1={sy + (hasEnc ? 182 : 138)}
        x2={slot.x + slot.w - 12} y2={sy + (hasEnc ? 182 : 138)}
        stroke={info.color} strokeWidth={1} opacity={0.2} />

      {/* 展示内容 */}
      {info.items.map((item, i) => {
        const iy = ITEM_SY + i * ITEM_H;
        if (iy + ITEM_H > sy + SUB_H - 100) return null;
        return (
          <g key={i}>
            <circle cx={slot.x + 20} cy={iy}     r={5}   fill={info.color} opacity={0.2} />
            <circle cx={slot.x + 20} cy={iy}     r={3}   fill={info.color} opacity={0.9} />
            <text x={slot.x + 32} y={iy + 6} fill={info.color} fontSize={16}
              fontWeight={600} fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">
              {item}
            </text>
          </g>
        );
      })}

      {/* クリエイタークロス（サブホール） */}
      {info.creators.map((cr, i) => {
        const ry = sy + SUB_H - 120 + i * 38;
        return (
          <g key={i}>
            {i === 0 && (
              <>
                <line x1={slot.x + 10} y1={ry - 14} x2={slot.x + slot.w - 10} y2={ry - 14}
                  stroke={info.color} strokeWidth={0.8} opacity={0.2} />
                <text x={slot.x + 14} y={ry - 2} fill={info.color} fontSize={12} fontWeight={800}
                  fontFamily="system-ui, sans-serif" opacity={0.7}>▶ クリエイタークロス</text>
              </>
            )}
            <rect x={slot.x + 14} y={ry + 6} width={52} height={18} rx={9} fill={info.color} opacity={0.8} />
            <text x={slot.x + 40} y={ry + 19} textAnchor="middle" fill="white" fontSize={11}
              fontWeight={800} fontFamily="system-ui, sans-serif">{cr.time}</text>
            <text x={slot.x + 74} y={ry + 20} fill={info.color} fontSize={15} fontWeight={800}
              fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">{cr.name}</text>
            <text x={slot.x + 14} y={ry + 34} fill={info.color} fontSize={12} fontWeight={500}
              fontFamily="system-ui, 'BIZ UDPGothic', sans-serif" opacity={0.8}>{cr.activity}</text>
          </g>
        );
      })}
    </g>
  );
}

// ============================================================
// メインコンポーネント
// ============================================================
export function VenueWanderMini() {
  return (
    <div className={styles.venueWanderMini}>
      <div className={styles.venueWanderMiniOuter}>
        <div
          className={styles.venueWanderMiniMap}
          role="img"
          aria-label="幕張メッセ 超会議 会場マップ（示意）。HALL1〜11・国際会議場・幕張イベントホールの全エリア詳細＆クリエイタークロス出演スケジュール。"
        >
          <svg
            className={styles.venueWanderMiniSvg}
            viewBox={`0 0 ${W} ${V_H}`}
            preserveAspectRatio="xMidYMin meet"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="vmTitleBg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#0d47a1" />
                <stop offset="55%"  stopColor="#1565c0" />
                <stop offset="100%" stopColor="#0277bd" />
              </linearGradient>
            </defs>

            {/* 全体背景 */}
            <rect x={0} y={0} width={W} height={V_H} fill="#eaf5fc" />

            {/* ===== タイトルバナー ===== */}
            <rect x={0} y={0} width={W} height={TITLE_H} fill="url(#vmTitleBg)" />
            <text x={20} y={28} fill="rgba(255,255,255,0.95)" fontSize={20} fontWeight={900}
              fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">
              幕張メッセ 超会議 会場マップ
            </text>
            <text x={20} y={52} fill="rgba(255,255,255,0.82)" fontSize={14}
              fontFamily="system-ui, sans-serif">
              Xでログイン中のユーザーが会場に出現！ ▸ 展示内容＆クリエイタークロス 出演スケジュール
            </text>
            {/* Xログイン中カウント */}
            <rect x={W - 205} y={8} width={196} height={54} rx={12} fill="rgba(255,255,255,0.18)" />
            {/* X(Twitter)ロゴ */}
            <text x={W - 190} y={30} fill="white" fontSize={14} fontWeight={900}
              fontFamily="system-ui, sans-serif">𝕏</text>
            <text x={W - 174} y={30} fill="rgba(255,255,255,0.9)" fontSize={13}
              fontWeight={700} fontFamily="system-ui, sans-serif">ログイン中</text>
            <text x={W - 108} y={56} textAnchor="middle" fill="white" fontSize={24}
              fontWeight={900} fontFamily="system-ui, sans-serif">
              {DEMO_ENCOUNTERS.length}人 参加中！
            </text>

            {/* メイン棟ラベル */}
            <rect x={0} y={TITLE_H} width={W} height={14} fill="rgba(21,101,192,0.1)" />
            <text x={W / 2} y={TITLE_H + 10} textAnchor="middle" fill="#0d47a1" fontSize={9}
              fontWeight={700} fontFamily="system-ui, sans-serif" letterSpacing={3}>
              国際展示場 メイン棟  HALL 1〜8
            </text>

            {/* ===== メインホール ===== */}
            {HALL_ORDER.map((n, idx) => (
              <HallStrip key={n} n={n} idx={idx} />
            ))}

            {/* 2F メッセモール */}
            <rect x={0} y={TITLE_H + 8 * HALL_STEP - 4} width={W} height={22}
              fill="#0288d1" opacity={0.15} />
            <text x={W / 2} y={TITLE_H + 8 * HALL_STEP + 11} textAnchor="middle"
              fill="#01579b" fontSize={12} fontWeight={700} fontFamily="system-ui, sans-serif">
              ← 2F 歩行者通路（メッセモール）— HALL 1〜8 を東西に連結 →
            </text>

            {/* ===== サブホール セクション ===== */}
            <rect x={0} y={SUB_SECTION_Y} width={W} height={SUB_LABEL_H}
              fill="rgba(200,242,210,0.7)" />
            <text x={W / 2} y={SUB_SECTION_Y + 20} textAnchor="middle" fill="#1b5e20" fontSize={18}
              fontWeight={800} fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">
              国際展示場 9〜11 棟
            </text>
            <text x={W / 2} y={SUB_SECTION_Y + 40} textAnchor="middle" fill="#2e7d32" fontSize={13}
              fontFamily="system-ui, sans-serif">
              HALL 9 / HALL 10 / HALL 11 — メイン棟と 2F メッセモールで連結
            </text>

            <line x1={330} y1={SUB_START_Y} x2={330} y2={SUB_START_Y + SUB_H}
              stroke="#2e7d32" strokeWidth={1.5} opacity={0.22} />
            <line x1={670} y1={SUB_START_Y} x2={670} y2={SUB_START_Y + SUB_H}
              stroke="#2e7d32" strokeWidth={1.5} opacity={0.22} />

            {SUB_INFO.map((info, i) => (
              <SubHallStrip key={info.n} info={info} slotIdx={i} />
            ))}

            {/* ===== 国際会議場 + 幕張イベントホール ===== */}
            <rect x={0} y={EXTRA_Y} width={W} height={EXTRA_H} fill="rgba(232,240,255,0.85)" rx={8} />
            <rect x={0} y={EXTRA_Y} width={W} height={EXTRA_H} rx={8} fill="none"
              stroke="#1565c0" strokeWidth={1} opacity={0.2} />

            {/* 国際会議場 — 思考実験展 2026 */}
            <rect x={8} y={EXTRA_Y + 8} width={480} height={EXTRA_H - 16} rx={7}
              fill="rgba(21,101,192,0.08)" stroke="#1565c0" strokeWidth={1.2} opacity={0.6} />
            <text x={248} y={EXTRA_Y + 36} textAnchor="middle" fill="#0d47a1" fontSize={22}
              fontWeight={900} fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">国際会議場</text>
            <text x={248} y={EXTRA_Y + 54} textAnchor="middle" fill="#c62828" fontSize={16}
              fontWeight={800} fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">思考実験展 2026</text>
            {["杉田智和・安元洋貴・立花慎之介（声優）", "k4sen・スタンミ（ストリーマー）",
              "ズズ・千燈ゆうひ・蝶屋はなび（VTuber）", "超トークショー（各日入替）",
              "VIPラウンジ・超スポンサーブース", "記者会見エリア・超プレスルーム"].map((t, i) => (
              <text key={i}
                x={22} y={EXTRA_Y + 80 + i * 32}
                fill="#1565c0" fontSize={15} fontWeight={600}
                fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">
                ● {t}
              </text>
            ))}

            {/* 幕張イベントホール — 超ボカニコ 2026 */}
            <rect x={496} y={EXTRA_Y + 8} width={496} height={EXTRA_H - 16} rx={7}
              fill="rgba(230,130,0,0.08)" stroke="#f57f17" strokeWidth={1.2} opacity={0.6} />
            <text x={744} y={EXTRA_Y + 36} textAnchor="middle" fill="#e65100" fontSize={22}
              fontWeight={900} fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">幕張イベントホール</text>
            <text x={744} y={EXTRA_Y + 54} textAnchor="middle" fill="#c62828" fontSize={16}
              fontWeight={800} fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">超ボカニコ 2026</text>
            {["鬱P・八王子P・TeddyLoid・kz 出演", "ササノマリイ・フロクロ 出演",
              "超ボカロ名曲 スペシャルセット", "大型スクリーン 超演出",
              "バックステージツアー（整理券）", "超コラボ サプライズ企画"].map((t, i) => (
              <text key={i}
                x={510} y={EXTRA_Y + 80 + i * 32}
                fill="#e65100" fontSize={15} fontWeight={600}
                fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">
                ● {t}
              </text>
            ))}

            {/* ===== エスプラナード ===== */}
            <rect x={0} y={ESPL_Y} width={W} height={ESPL_H} rx={6}
              fill="#dff0da" stroke="#66bb6a" strokeWidth={1} />
            <text x={W / 2} y={ESPL_Y + 28} textAnchor="middle" fill="#2e7d32" fontSize={20}
              fontWeight={800} fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">
              エスプラナード（屋外広場）— 超フードコート・フリーマーケット・海浜幕張駅 直結
            </text>
            {[60, 130, 200, 270, 340, 410, 480, 550, 620, 690, 760, 830, 900].map((tx) => (
              <g key={tx}>
                <ellipse cx={tx} cy={ESPL_Y + 56} rx={10} ry={10} fill="#81c784" opacity={0.7} />
                <rect x={tx - 2} y={ESPL_Y + 63} width={4} height={10} fill="#795548" opacity={0.55} />
              </g>
            ))}

            {/* 道路 */}
            <rect x={0} y={ROAD_Y} width={W} height={32} fill="#c8c8c8" />
            <line x1={0} y1={ROAD_Y + 16} x2={W} y2={ROAD_Y + 16}
              stroke="#e8e8e8" strokeWidth={1.5} strokeDasharray="18 10" />
            <text x={W / 2} y={ROAD_Y + 22} textAnchor="middle" fill="#888" fontSize={11}
              fontFamily="system-ui, sans-serif">海浜幕張駅前 通り</text>

            {/* 凡例 */}
            <rect x={0} y={LEGEND_Y} width={W} height={83} fill="rgba(255,255,255,0.55)" />
            <circle cx={20} cy={LEGEND_Y + 20} r={11} fill="#1da1f2" />
            <text x={38} y={LEGEND_Y + 26} fill="#0d47a1" fontSize={16} fontWeight={700}
              fontFamily="system-ui, sans-serif">
              = X（Twitter）アカウントでログインしたユーザーのアイコン（デモ表示）
            </text>
            <text x={W / 2} y={LEGEND_Y + 52} textAnchor="middle" fill="#1565c0" fontSize={14}
              fontWeight={700} fontFamily="system-ui, 'BIZ UDPGothic', sans-serif">
              Xでログインすると、あなたのアイコンが今いる会場エリアにリアルタイムで表示されます
            </text>
            <text x={W / 2} y={LEGEND_Y + 70} textAnchor="middle" fill="#8ab4d8" fontSize={12}
              fontFamily="system-ui, sans-serif">
              ※ 出演者・スケジュールは2026年4月時点の情報。最新情報は公式サイト・会場掲示をご確認ください。
            </text>
          </svg>
        </div>
      </div>

      <p className={styles.venueWanderMiniCaption}>
        国際展示場メイン棟（HALL 1〜8）と 9〜11 棟は、2F メッセモールで連結されます。
        すれちがった相手のアイコンが実際のエリアに表示されます（上図はデモ）。
      </p>
      <p className={styles.venueWanderMiniSubcaption}>
        迷路のような広さのなか、<strong>すれちがった</strong>相手のアイコンが会場マップに記録されます
      </p>
    </div>
  );
}
