export type HeaderNavLink = {
  href: string;
  label: string;
  description?: string;
};

export const SITE_NAV_LINKS: readonly HeaderNavLink[] = [
  { href: "/", label: "ホーム" },
  { href: "/chokaigi", label: "超会議で使う" },
  { href: "/chokaigi#usage-heading", label: "つかいかた" },
] as const;

/** ハンバーガー内: 主要ページ */
export const MOBILE_PRIMARY_LINKS: readonly HeaderNavLink[] = [
  { href: "/", label: "ホーム", description: "トップページ" },
  { href: "/chokaigi", label: "超会議LP", description: "企画ページ全体" },
  {
    href: "/chokaigi/special-thanks",
    label: "Special Thanks 一覧",
    description: "協力者リンク一覧",
  },
  { href: "/app", label: "ダッシュボード", description: "位置送信・ライブマップ" },
] as const;

/** ハンバーガー内: 超会議LPの全コンテンツ直リンク */
export const MOBILE_CHOKAIGI_SECTION_LINKS: readonly HeaderNavLink[] = [
  {
    href: "/chokaigi#yukkuri-dialogue-heading",
    label: "ゆっくり超解説",
    description: "3人の掛け合い",
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
    description: "協力者クレジット",
  },
] as const;

/** `pathname.startsWith` で隠すパス（必要なら追加） */
export const SITE_HEADER_HIDDEN_PATHS: string[] = [];
