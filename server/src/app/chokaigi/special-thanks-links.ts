/**
 * Special Thanks データ定義
 *
 * - SPECIAL_THANKS_PROFILES: 「ロミさんカード」のように個別紹介したい方々
 * - SPECIAL_THANKS_X_ONLY: X アカウントのみでの軽量ご協力者
 * - SPECIAL_THANKS_LINKS: 後方互換用（フラット一覧）。既存のプレビュー処理や
 *   クレジットページのチップ表示等で利用している箇所があるため残しておく。
 *
 * LP から詳細ページ、`/chokaigi/special-thanks` への導線は
 * SPECIAL_THANKS_PROFILES を優先して使う想定。
 */

export type SpecialThanksSiteLink = {
  label: string;
  href: string;
  tagline?: string;
};

export type SpecialThanksXLink = {
  label: string;
  href: string;
};

export type SpecialThanksProfile = {
  /** 安定した DOM id / React key として使う識別子 */
  id: string;
  /** 表示名（人物名 or 屋号） */
  name: string;
  /** 肩書き・所在地など、1 行で添える短いタイトル */
  title?: string;
  /** リボン文言（未指定ならリボンを出さない） */
  ribbon?: string;
  /** 紹介文。段落を分けたいときは配列で複数渡す */
  intro: ReadonlyArray<string>;
  /**
   * ハイライト扱い（カードを特別に装飾）。
   * 現状は「ロゴ制作の Soletta さん」のみが true。
   */
  highlight?: boolean;
  /** 公式サイトなどの外部リンク */
  sites?: ReadonlyArray<SpecialThanksSiteLink>;
  /** X アカウント */
  xHandles?: ReadonlyArray<SpecialThanksXLink>;
};

export const SPECIAL_THANKS_PROFILES: ReadonlyArray<SpecialThanksProfile> = [
  {
    id: "soletta",
    highlight: true,
    ribbon: "🎨 ロゴを創ってくださった方",
    name: "佐藤 ゆうか さん（Soletta／ソレッタ）",
    title: "大阪・高槻のロゴ・ブランディング伴走デザイナー",
    intro: [
      "すれちがいライト、そして星屑のように広がる『クリエイターのシンセカイ』の世界観は、佐藤さんの手で生まれたロゴとコンセプトからすべてが始まりました。",
      "『見た目』ではなく『伝わる軸』を、プロジェクトの根っこにそっと授けてくださったほんとうの意味でのデザインの原点です。40 項目のヒアリングで、ふわっとした想いを言葉に、そして一枚のロゴへ——。ロゴをクリックすると、りんく・こん太・たぬ姉が少し長めに解説してくれます。",
    ],
    sites: [
      {
        label: "Soletta（ソレッタ）公式サイト",
        href: "https://soletta.jp/",
        tagline: "大阪・北摂（高槻）／ロゴ・ブランディング・伴走デザイナー",
      },
    ],
    xHandles: [{ label: "@yuka_designer", href: "https://x.com/yuka_designer" }],
  },
  {
    id: "oki-harumi",
    name: "大木 ハルミ さん",
    title: "アーティスト／シンガーソングライター",
    intro: [
      "企画の初期段階から温かく応援してくださった大木ハルミさん。世界観づくりの相談や、やさしい言葉選びのヒントをたくさんいただきました。",
    ],
    sites: [
      {
        label: "大木ハルミさん 公式サイト",
        href: "https://ohalu.bitfan.id/",
        tagline: "Official Site（オフィシャル）",
      },
    ],
  },
  {
    id: "ahuran",
    name: "アフランカフェ",
    title: "クリエイターたちが集う、やさしいカフェ",
    intro: [
      "企画のひらめきや相談を、いつも心地よい席で受け止めてくださるカフェです。『人が人と出会う場』のイメージは、ここでの時間がベースになっています。",
    ],
    sites: [
      {
        label: "アフランカフェ 公式ホームページ",
        href: "https://www.ahuranproject.com/",
        tagline: "Ahuran Project / Cafe Official Site",
      },
    ],
    xHandles: [{ label: "@oomayu12345", href: "https://x.com/oomayu12345" }],
  },
  {
    id: "oto1to1",
    name: "oto1to1（おといちといち）",
    title: "音楽とクリエイターをつなぐプラットフォーム",
    intro: [
      "世界観に寄り添う音まわりの相談に乗ってくださっています。『クリエイター同士がやさしく出会う』という姿勢は、oto1to1 さんの在り方からも多くを学びました。",
    ],
    sites: [
      {
        label: "oto1to1 公式サイト",
        href: "https://oto1to1.com/",
        tagline: "Official Site",
      },
    ],
    xHandles: [{ label: "@OTO1to1", href: "https://x.com/OTO1to1" }],
  },
] as const;

/**
 * X アカウントのみでご協力・応援してくださっているみなさま。
 * プロフィールカード化はせず、アットマーク一覧として表示します。
 */
export const SPECIAL_THANKS_X_ONLY: ReadonlyArray<SpecialThanksXLink> = [
  { label: "@abuso2525", href: "https://x.com/abuso2525" },
  { label: "@shirase_0404", href: "https://x.com/shirase_0404" },
  { label: "@ewbcwj_lv", href: "https://x.com/ewbcwj_lv" },
  { label: "@sinseinaru", href: "https://x.com/sinseinaru" },
  { label: "@yuzuchis_mammy", href: "https://x.com/yuzuchis_mammy" },
  { label: "@bakusyokuM", href: "https://x.com/bakusyokuM" },
  { label: "@m20210411", href: "https://x.com/m20210411" },
  { label: "@flap_shizuku", href: "https://x.com/flap_shizuku" },
] as const;

/**
 * 後方互換用のフラットなリンク一覧。
 * プロフィールと X-only をまとめて平坦化しています。
 */
export const SPECIAL_THANKS_LINKS: ReadonlyArray<{ label: string; href: string }> =
  [
    ...SPECIAL_THANKS_PROFILES.flatMap((p) => [
      ...(p.sites ?? []).map((s) => ({ label: s.label, href: s.href })),
      ...(p.xHandles ?? []).map((x) => ({ label: x.label, href: x.href })),
    ]),
    ...SPECIAL_THANKS_X_ONLY.map((x) => ({ label: x.label, href: x.href })),
  ] as const;

export const ROMI_PROFILE = {
  name: "星野 ロミ さん",
  intro:
    "このアプリのベースとなったプログラムを公開してくださった、偉大なプログラマー。たくさんの人が日常的に使う「すごいサービス」を、自身の手で次々と作り上げてきた、今も走り続ける現役の開発者です。",
  xHandles: [
    { label: "@romi_hoshino", href: "https://x.com/romi_hoshino" },
    { label: "@romi63hoshino", href: "https://x.com/romi63hoshino" },
  ],
  operatedSites: [
    {
      label: "SocialXup",
      href: "https://socialxup.com/",
      tagline: "X ユーザー数推移ツール（フォロワー・フォロー数の推移を追跡できる神ツール）",
    },
    {
      label: "SocialXup for Threads",
      href: "https://threads.socialxup.com/",
      tagline: "Threads 版のユーザー数推移ツール",
    },
    {
      label: "mmake.net",
      href: "https://mmake.net/",
      tagline:
        "漫画村元運営者が教えるプログラミングスクール／プログラミングを学べる初心者向けのオンラインスクール",
    },
    {
      label: "mangamura.org",
      href: "https://mangamura.org/",
      tagline: "星野ロミさんが手掛けた、伝説のサービス",
    },
  ],
} as const;
