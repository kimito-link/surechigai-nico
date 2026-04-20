/**
 * ニコニコ超会議2026 会場マップの概略データ。
 * 公式PDF (public/chokaigi/map/chokaigi2026_map.pdf) の出展情報を元に、
 * 各ホールの主要ブース/ステージを手書きベースで概略配置した。
 *
 * 注意: 寸法・位置は公式の雰囲気を寄せた概略値。正確なブース位置・当日変更は
 * 必ず公式PDF/会場掲示を参照のこと。
 */

export type AreaKind =
  | "stage"
  | "food"
  | "cc"
  | "exp"
  | "goods"
  | "info"
  | "toilet"
  | "shrine"
  | "cosplay"
  | "gaming"
  | "entrance"
  | "smoking"
  | "charge";

/** 1ホール内の小エリア（ブース/ステージ単位） */
export type Section = {
  /** 公式ブース記号 (A1, B89 等) */
  code?: string;
  /** 表示名（短め） */
  name: string;
  /** 副題（必要なら） */
  sub?: string;
  /** エリア種別（色分けに使用） */
  area: AreaKind;
  /** ホール左上からの相対座標 */
  x: number;
  y: number;
  w: number;
  h: number;
  /** メインステージなど目立たせる */
  featured?: boolean;
  /** ホール別ガイドでの代表表示優先度（1が最優先） */
  guidePriority?: number;
  /** フォントサイズ上書き */
  fs?: number;
};

/** ホール1つ */
export type Hall = {
  no: number | string;
  /** 表示ラベル (例: "HALL 8") */
  label: string;
  /** 絶対座標（ホールの外枠） */
  x: number;
  y: number;
  w: number;
  h: number;
  /** ヘッダー帯の色 */
  headerColor: string;
  /** ホール内背景色（薄） */
  bodyFill: string;
  /** セクション群（相対座標、ヘッダー下の内部領域基準） */
  sections: Section[];
  /** 備考メモ（ホール脇の注釈） */
  note?: string;
};

/** 座標: メイン棟 上段 HALL 8→1 */
const MAIN_Y = 90;
const MAIN_H = 300;
const HEADER_H = 22;
const BODY_Y = MAIN_Y + HEADER_H;
const BODY_H = MAIN_H - HEADER_H;

const BG_PINK = "#fff0f5";
const BG_PINK_2 = "#fce4ec";
const BG_PEACH = "#fff3e0";
const HEADER_PURPLE = "#7e57c2";
const HEADER_BLUE = "#42a5f5";
const HEADER_PINK = "#ec407a";
const HEADER_GREEN = "#66bb6a";
const HEADER_ORANGE = "#ff9800";
const HEADER_TEAL = "#26a69a";

/** メイン棟 HALL 1〜8 (左=8, 右=1) */
export const MAIN_HALLS: Hall[] = [
  // HALL 8: 超音楽祭 + 配信/遊戯/痛車 + CC
  {
    no: 8,
    label: "HALL 8",
    x: 60,
    y: MAIN_Y,
    w: 162,
    h: MAIN_H,
    headerColor: HEADER_PURPLE,
    bodyFill: BG_PINK,
    sections: [
      {
        code: "C11",
        name: "超音楽祭2026",
        sub: "●World Wide Words ●推しグルライブ ●歌踊超対バン",
        area: "stage",
        featured: true,
        guidePriority: 1,
        x: 6,
        y: 6,
        w: 150,
        h: 102,
        fs: 10,
      },
      { code: "C3", name: "超配信者", area: "exp", guidePriority: 2, x: 6, y: 114, w: 48, h: 58, fs: 7 },
      { code: "C4", name: "超遊戯2026", area: "exp", guidePriority: 3, x: 57, y: 114, w: 48, h: 58, fs: 6 },
      { code: "C5", name: "超痛車天国", area: "exp", guidePriority: 4, x: 108, y: 114, w: 48, h: 58, fs: 6 },
      {
        name: "クリエイタークロス",
        sub: "分散配置",
        area: "cc",
        guidePriority: 5,
        x: 6,
        y: 178,
        w: 150,
        h: 92,
      },
    ],
  },
  // HALL 7: コンパスST + 神社 + コスプレ + ファミマ
  {
    no: 7,
    label: "HALL 7",
    x: 224,
    y: MAIN_Y,
    w: 110,
    h: MAIN_H,
    headerColor: HEADER_BLUE,
    bodyFill: BG_PINK,
    sections: [
      {
        code: "C1",
        name: "超「＃コンパス」",
        sub: "ステージ",
        area: "stage",
        featured: true,
        guidePriority: 1,
        x: 4,
        y: 6,
        w: 102,
        h: 76,
      },
      { code: "C7", name: "超神社", area: "shrine", guidePriority: 3, x: 4, y: 88, w: 48, h: 46 },
      { code: "C8", name: "VTuber ASMR足湯", area: "exp", guidePriority: 5, x: 54, y: 88, w: 52, h: 46, fs: 5.5 },
      {
        code: "C9",
        name: "超コスプレ",
        sub: "ファミマ協賛",
        area: "cosplay",
        guidePriority: 2,
        x: 4,
        y: 140,
        w: 102,
        h: 68,
      },
      { code: "C6", name: "大ヤンキー展", area: "exp", guidePriority: 6, x: 4, y: 214, w: 48, h: 56, fs: 7 },
      { code: "C10", name: "ファミマ", area: "goods", guidePriority: 4, x: 54, y: 214, w: 52, h: 56, fs: 8 },
    ],
  },
  // HALL 6: カレー + 盆踊り + トリィガチャ + Google Play 等
  {
    no: 6,
    label: "HALL 6",
    x: 336,
    y: MAIN_Y,
    w: 110,
    h: MAIN_H,
    headerColor: HEADER_PINK,
    bodyFill: BG_PEACH,
    sections: [
      { code: "B39", name: "超カレー", area: "food", guidePriority: 1, x: 4, y: 6, w: 102, h: 34 },
      { code: "B87", name: "超巨大トリィガチャ", area: "exp", guidePriority: 4, x: 4, y: 44, w: 102, h: 36, fs: 7 },
      {
        code: "B88",
        name: "超ニコニコ盆踊り",
        area: "stage",
        guidePriority: 2,
        x: 4,
        y: 84,
        w: 102,
        h: 54,
        fs: 8,
      },
      { code: "B84", name: "東北ずん子", sub: "ずんだもん", area: "cc", x: 4, y: 142, w: 48, h: 42, fs: 7 },
      { code: "B85", name: "メイカーズ", area: "exp", x: 54, y: 142, w: 52, h: 42, fs: 8 },
      { code: "B86", name: "家庭科の", sub: "ドラゴン", area: "exp", x: 4, y: 188, w: 48, h: 38, fs: 7 },
      { code: "B100", name: "展軸祭", sub: "ZEN大学祭", area: "exp", x: 54, y: 188, w: 52, h: 38, fs: 7 },
      { code: "B101", name: "Google Play", area: "goods", guidePriority: 3, x: 4, y: 230, w: 102, h: 40 },
    ],
  },
  // HALL 5: 最大・フード密集 + 体験 + 大学
  {
    no: 5,
    label: "HALL 5",
    x: 448,
    y: MAIN_Y,
    w: 172,
    h: MAIN_H,
    headerColor: HEADER_ORANGE,
    bodyFill: BG_PEACH,
    sections: [
      // 上段: 飲食上段 B4-B9
      { code: "B4", name: "Bistroたしろ", area: "food", x: 4, y: 6, w: 52, h: 30, fs: 7 },
      { code: "B5", name: "ユニフルーティー", area: "food", x: 58, y: 6, w: 52, h: 30, fs: 7 },
      { code: "B6", name: "肉の万世", area: "food", x: 112, y: 6, w: 52, h: 30, fs: 7 },
      { code: "B7", name: "神戸コロッケ", area: "food", x: 4, y: 40, w: 52, h: 30, fs: 7 },
      { code: "B8", name: "超凄麺", area: "food", x: 58, y: 40, w: 52, h: 30, fs: 7 },
      { code: "B9", name: "ミクワゴン", area: "food", x: 112, y: 40, w: 52, h: 30, fs: 7 },
      // 中段上: B22-B38 飲食密集
      {
        name: "B22〜B38 飲食・体験",
        area: "food",
        guidePriority: 1,
        x: 4,
        y: 74,
        w: 160,
        h: 46,
        fs: 8,
      },
      // 中段下: B53-B82 体験密集
      {
        name: "B53〜B82 体験・物販",
        sub: "AVIOT / HMV / Kuroe / 音ゲー 他",
        area: "exp",
        guidePriority: 2,
        x: 4,
        y: 124,
        w: 160,
        h: 62,
        fs: 8,
      },
      // 下段: 大学 B90-B99
      { code: "B98", name: "超スパコン", sub: "富岳", area: "exp", guidePriority: 3, x: 4, y: 190, w: 52, h: 32, fs: 7 },
      { code: "B99", name: "磁石祭", sub: "N校", area: "exp", guidePriority: 4, x: 58, y: 190, w: 52, h: 32, fs: 7 },
      { code: "B90〜", name: "大学系", sub: "KEK/文教/湘南工科/産総研", area: "exp", guidePriority: 5, x: 112, y: 190, w: 52, h: 32, fs: 7 },
      // 最下段: トイレ + インフォ + 四駆
      { code: "B102", name: "超おトイレ", area: "toilet", x: 4, y: 226, w: 48, h: 44, fs: 7 },
      { code: "B103", name: "超ニコニコインフォ", area: "info", x: 54, y: 226, w: 58, h: 44, fs: 7 },
      { code: "D5", name: "超ニコ四駆", area: "exp", x: 114, y: 226, w: 50, h: 44, fs: 7 },
    ],
  },
  // HALL 4: KADOKAWA + 中央エントランス + 超インフォ
  {
    no: 4,
    label: "HALL 4",
    x: 622,
    y: MAIN_Y,
    w: 140,
    h: MAIN_H,
    headerColor: HEADER_PINK,
    bodyFill: BG_PINK_2,
    sections: [
      { code: "B89", name: "KADOKAWA", area: "goods", featured: true, guidePriority: 1, x: 4, y: 6, w: 132, h: 52 },
      { code: "B10", name: "Gugenka", area: "exp", x: 4, y: 62, w: 62, h: 28, fs: 7 },
      { code: "B12", name: "超REALITY", area: "exp", x: 70, y: 62, w: 66, h: 28, fs: 7 },
      { code: "B1", name: "NTE", area: "exp", x: 4, y: 94, w: 62, h: 26, fs: 7 },
      { code: "B3", name: "超ハラミ祭り", area: "food", x: 70, y: 94, w: 66, h: 26, fs: 7 },
      { code: "B40", name: "PIGG PARTY", area: "exp", x: 4, y: 124, w: 62, h: 26, fs: 7 },
      { code: "B47", name: "War Thunder", area: "exp", x: 70, y: 124, w: 66, h: 26, fs: 7 },
      { code: "B49", name: "デンソーロボット", area: "exp", x: 4, y: 154, w: 62, h: 26, fs: 7 },
      { code: "B50", name: "超コンペイトウ", area: "exp", x: 70, y: 154, w: 66, h: 26, fs: 7 },
      { name: "超インフォメーション", area: "info", guidePriority: 2, x: 4, y: 184, w: 132, h: 26, fs: 8 },
      // 中央エントランス表示エリア
      { name: "↓ 中央エントランス", sub: "正面入口", area: "entrance", guidePriority: 3, x: 4, y: 214, w: 132, h: 56, fs: 10 },
    ],
  },
  // HALL 3: 超スペシャルステージ + クリエイター系
  {
    no: 3,
    label: "HALL 3",
    x: 764,
    y: MAIN_Y,
    w: 128,
    h: MAIN_H,
    headerColor: HEADER_BLUE,
    bodyFill: BG_PINK,
    sections: [
      {
        code: "A7",
        name: "超スペシャルステージ",
        sub: "メメントリ / キスマイ宮田 / 自衛隊",
        area: "stage",
        featured: true,
        guidePriority: 1,
        x: 4,
        y: 6,
        w: 120,
        h: 90,
      },
      { code: "A8", name: "超乗合馬車", area: "exp", x: 4, y: 100, w: 58, h: 28, fs: 7 },
      { code: "A9", name: "超ボカ名刺交換", area: "cc", x: 66, y: 100, w: 58, h: 28, fs: 7 },
      { code: "A10", name: "クリエイター全員集合", area: "cc", guidePriority: 2, x: 4, y: 132, w: 120, h: 28, fs: 8 },
      { code: "A15", name: "超絵師展", sub: "IF楽曲世界展", area: "cc", guidePriority: 3, x: 4, y: 164, w: 120, h: 30, fs: 8 },
      { code: "A16", name: "セゾン", area: "cc", x: 4, y: 198, w: 58, h: 26, fs: 7 },
      { code: "A17", name: "クリプトン", area: "cc", x: 66, y: 198, w: 58, h: 26, fs: 7 },
      { code: "A18", name: "りらいぶ", area: "cc", x: 4, y: 228, w: 58, h: 22, fs: 7 },
      { code: "A19", name: "超教育番組", area: "exp", x: 66, y: 228, w: 58, h: 22, fs: 7 },
      { code: "A20", name: "超演奏してみた", sub: "大和コネクト", area: "cc", guidePriority: 4, x: 4, y: 254, w: 120, h: 20, fs: 7 },
    ],
  },
  // HALL 2: 自衛隊 + 物販 + ボカマス
  {
    no: 2,
    label: "HALL 2",
    x: 894,
    y: MAIN_Y,
    w: 92,
    h: MAIN_H,
    headerColor: HEADER_GREEN,
    bodyFill: BG_PINK,
    sections: [
      { code: "A5", name: "自衛隊", area: "exp", guidePriority: 3, x: 4, y: 6, w: 84, h: 62, fs: 9 },
      { code: "A6", name: "超物販", area: "goods", featured: true, guidePriority: 1, x: 4, y: 72, w: 84, h: 90 },
      {
        code: "A14",
        name: "THE VOC@LOiD",
        sub: "超 M@STER 62",
        area: "cc",
        guidePriority: 2,
        x: 4,
        y: 166,
        w: 84,
        h: 104,
        fs: 8,
      },
    ],
  },
  // HALL 1: 歌・踊・休憩（2F通路・入口側）
  {
    no: 1,
    label: "HALL 1",
    x: 988,
    y: MAIN_Y,
    w: 130,
    h: MAIN_H,
    headerColor: HEADER_TEAL,
    bodyFill: BG_PINK,
    sections: [
      {
        code: "A1",
        name: "超踊ってみた",
        sub: "超合わせてみた",
        area: "stage",
        featured: true,
        guidePriority: 1,
        x: 4,
        y: 6,
        w: 122,
        h: 60,
      },
      { code: "A11", name: "超歌ってみた", area: "stage", guidePriority: 2, x: 4, y: 70, w: 122, h: 50 },
      { code: "A4", name: "超年表", sub: "大百科", area: "exp", x: 4, y: 124, w: 122, h: 32, fs: 8 },
      {
        code: "A2/A3",
        name: "トリィあえず休憩所",
        area: "exp",
        guidePriority: 3,
        x: 4,
        y: 160,
        w: 122,
        h: 30,
        fs: 8,
      },
      { code: "A12", name: "超休憩所", sub: "ネオバターロール", area: "exp", x: 4, y: 194, w: 62, h: 36, fs: 7 },
      { code: "A13", name: "ネオバターロール", sub: "フジパン", area: "food", x: 70, y: 194, w: 56, h: 36, fs: 7 },
      { name: "2F 入口", area: "entrance", x: 4, y: 234, w: 122, h: 36, fs: 10 },
    ],
    note: "2F通路入口",
  },
];

/** サブ棟: HALL 9-11 横並び */
const SUB_Y = 440;
const SUB_H = 270;

/** HALL 9-11 コンテナ */
export const SUB_HALLS_CONTAINER = {
  x: 60,
  y: SUB_Y,
  w: 500,
  h: SUB_H,
  label: "HALL 9〜11",
};

export const SUB_HALLS: Hall[] = [
  {
    no: 9,
    label: "HALL 9",
    x: 64,
    y: SUB_Y + 26,
    w: 204,
    h: SUB_H - 30,
    headerColor: HEADER_GREEN,
    bodyFill: "#f1f8e9",
    sections: [
      {
        code: "D1",
        name: "超ゲームエリアメインステージ",
        sub: "CDエナジー / ゲーム実況者超大集合 他",
        area: "stage",
        featured: true,
        guidePriority: 1,
        x: 4,
        y: 4,
        w: 196,
        h: 110,
        fs: 8,
      },
      { code: "D2", name: "CDエナジーブース", area: "exp", x: 4, y: 118, w: 94, h: 44, fs: 7 },
      { code: "D11", name: "超プレミアム会員", area: "info", x: 102, y: 118, w: 98, h: 44, fs: 7 },
      {
        code: "D12",
        name: "マイクラスクエア2026",
        sub: "×マイスポ！",
        area: "gaming",
        guidePriority: 2,
        x: 4,
        y: 166,
        w: 196,
        h: 72,
        fs: 8,
      },
    ],
  },
  {
    no: 10,
    label: "HALL 10",
    x: 272,
    y: SUB_Y + 26,
    w: 144,
    h: SUB_H - 30,
    headerColor: HEADER_GREEN,
    bodyFill: "#f1f8e9",
    sections: [
      { code: "D3", name: "超デスゲーム", area: "exp", guidePriority: 1, x: 4, y: 4, w: 136, h: 32, fs: 8 },
      { code: "D4", name: "超・思考実験展", area: "exp", x: 4, y: 40, w: 136, h: 28, fs: 7 },
      { code: "D7", name: "有吉ぃぃeeeee", area: "exp", x: 4, y: 72, w: 66, h: 28, fs: 7 },
      { code: "D8", name: "超てんちゃん", area: "exp", x: 74, y: 72, w: 66, h: 28, fs: 7 },
      { code: "D9", name: "超秋葉原 REAL AKIBA", area: "cc", guidePriority: 2, x: 4, y: 104, w: 136, h: 28, fs: 7 },
      { code: "D10", name: "超ポーカー", area: "exp", guidePriority: 3, x: 4, y: 136, w: 66, h: 28, fs: 7 },
      { code: "D13", name: "音声合成", sub: "×オフ会", area: "cc", guidePriority: 4, x: 74, y: 136, w: 66, h: 28, fs: 7 },
      { code: "D14", name: "ギビング", sub: "リリーフ", area: "exp", x: 4, y: 168, w: 66, h: 70, fs: 7 },
      { code: "D15", name: "ZUN/ひろゆき", sub: "ビール", area: "food", x: 74, y: 168, w: 66, h: 70, fs: 6 },
    ],
  },
  {
    no: 11,
    label: "HALL 11",
    x: 420,
    y: SUB_Y + 26,
    w: 136,
    h: SUB_H - 30,
    headerColor: HEADER_PINK,
    bodyFill: "#fce4ec",
    sections: [
      {
        code: "D16",
        name: "超ヤバシティ2026",
        sub: "ペイディ協賛",
        area: "cosplay",
        featured: true,
        guidePriority: 1,
        x: 4,
        y: 4,
        w: 128,
        h: 176,
      },
      { code: "D17", name: "ペイディコーナー", area: "goods", guidePriority: 2, x: 4, y: 184, w: 128, h: 54 },
    ],
  },
];

/** 幕張イベントホール */
export const EVENT_HALL = {
  x: 580,
  y: SUB_Y,
  w: 280,
  h: SUB_H,
  label: "幕張イベントホール",
  arena: {
    cx: 720,
    cy: 590,
    rx: 95,
    ry: 62,
  },
  sections: [
    {
      code: "E1",
      name: "超ボカニコ2026",
      sub: "タイミー協賛",
      area: "stage" as AreaKind,
      featured: true,
      guidePriority: 1,
      x: 700,
      y: 580,
      w: 0,
      h: 0,
    },
    {
      code: "E2",
      name: "超スキマ勇者",
      area: "exp" as AreaKind,
      guidePriority: 2,
      x: 600,
      y: 550,
      w: 66,
      h: 22,
    },
    {
      code: "E3",
      name: "超しりとり『バベル』",
      area: "exp" as AreaKind,
      guidePriority: 3,
      x: 772,
      y: 550,
      w: 80,
      h: 22,
    },
  ],
};

/** 会場全体図（ミニマップ） */
export const OVERVIEW_MAP = {
  x: 880,
  y: SUB_Y,
  w: 340,
  h: SUB_H,
  label: "会場全体図",
};

/** 凡例エリア */
export const LEGEND_AREA = { x: 40, y: 740, w: 1200, h: 76 };

/** 色凡例 */
export const LEGEND_ENTRIES: { area: AreaKind; label: string }[] = [
  { area: "stage", label: "メインステージ" },
  { area: "cc", label: "クリエイタークロス" },
  { area: "food", label: "フード・飲食" },
  { area: "exp", label: "体験ブース" },
  { area: "goods", label: "物販・企業" },
  { area: "cosplay", label: "コスプレ・ヤバシティ" },
  { area: "gaming", label: "ゲーム関連" },
  { area: "info", label: "インフォメーション" },
  { area: "entrance", label: "入口・エントランス" },
  { area: "shrine", label: "超神社" },
  { area: "toilet", label: "超おトイレ" },
];

/** エリア種別→色 */
export const AREA_COLORS: Record<AreaKind, { fill: string; stroke: string; text?: string }> = {
  stage: { fill: "#1565c0", stroke: "#0d47a1", text: "#ffffff" },
  food: { fill: "#ffe0b2", stroke: "#ef6c00" },
  cc: { fill: "#c8e6c9", stroke: "#2e7d32" },
  exp: { fill: "#fce4ec", stroke: "#e91e63" },
  goods: { fill: "#b3e5fc", stroke: "#0288d1" },
  info: { fill: "#fff59d", stroke: "#f9a825" },
  toilet: { fill: "#e1bee7", stroke: "#6a1b9a", text: "#4a148c" },
  shrine: { fill: "#ffcdd2", stroke: "#c62828", text: "#b71c1c" },
  cosplay: { fill: "#e1bee7", stroke: "#8e24aa" },
  gaming: { fill: "#dcedc8", stroke: "#689f38" },
  entrance: { fill: "#bbdefb", stroke: "#1565c0", text: "#0d47a1" },
  smoking: { fill: "#eceff1", stroke: "#546e7a" },
  charge: { fill: "#fff9c4", stroke: "#f57f17" },
};
