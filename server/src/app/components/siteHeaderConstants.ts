export type HeaderNavLink = {
  href: string;
  label: string;
  description?: string;
};

export const SITE_NAV_LINKS: readonly HeaderNavLink[] = [
  { href: "/", label: "ホーム" },
  { href: "/chokaigi", label: "超会議で使う" },
  { href: "/chokaigi#usage-heading", label: "つかいかた" },
  { href: "/yukkuri/explained", label: "解説アーカイブ" },
] as const;

/** ハンバーガー内: 主要ページ */
export const MOBILE_PRIMARY_LINKS: readonly HeaderNavLink[] = [
  { href: "/", label: "ホーム", description: "トップページ" },
  { href: "/chokaigi", label: "超会議LP", description: "企画ページ全体" },
  {
    href: "/creators",
    label: "都道府県別クリエイター",
    description: "47 都道府県の参加者一覧",
  },
  {
    href: "/yukkuri/explained",
    label: "ゆっくり解説アーカイブ",
    description: "解説が掲載された X アカウント一覧",
  },
  {
    href: "/chokaigi/special-thanks",
    label: "サンクス一覧ページ",
    description: "Special Thanks の全リンク",
  },
  { href: "/app", label: "ダッシュボード", description: "位置送信・ライブマップ" },
] as const;

/** ハンバーガー内: 超会議LPの全コンテンツ直リンク */
export const MOBILE_CHOKAIGI_SECTION_LINKS: readonly HeaderNavLink[] = [
  {
    href: "/chokaigi/special-thanks#special-thanks-list-heading",
    label: "サンクス一覧（全件）",
    description: "協力者リンクページへ",
  },
  {
    href: "/chokaigi#features-heading",
    label: "機能まるごとガイド",
    description: "できること総まとめ",
  },
  {
    href: "/chokaigi#yukkuri-dialogue-heading",
    label: "ゆっくり超解説",
    description: "3人の掛け合い",
  },
  {
    href: "/chokaigi#venue-tour-3d-heading",
    label: "3D 会場ツアー",
    description: "全ホールを自動巡回",
  },
  {
    href: "/chokaigi#usage-heading",
    label: "つかいかた",
    description: "利用フロー",
  },
  {
    href: "/chokaigi#venue-heading",
    label: "会場の回り方",
    description: "ルートのコツ",
  },
  {
    href: "/chokaigi#map-heading",
    label: "会場マップ",
    description: "インタラクティブ地図",
  },
  {
    href: "/chokaigi#creator-cross-search-heading",
    label: "参加者検索",
    description: "Creator Cross 検索",
  },
  {
    href: "/chokaigi#after-event-heading",
    label: "超会議のあと",
    description: "全国展開の構想",
  },
  {
    href: "/chokaigi#guides-heading",
    label: "3人のガイド",
    description: "キャラ紹介",
  },
  {
    href: "/chokaigi#privacy-heading",
    label: "プライバシー",
    description: "位置情報の方針",
  },
  {
    href: "/chokaigi#special-thanks-heading",
    label: "Special Thanks",
    description: "協賛・協力者クレジット",
  },
] as const;

/** `pathname.startsWith` で隠すパス（必要なら追加） */
export const SITE_HEADER_HIDDEN_PATHS: string[] = [];
