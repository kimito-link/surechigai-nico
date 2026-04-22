export const SITE_NAV_LINKS = [
  { href: "/", label: "ホーム" },
  { href: "/chokaigi", label: "超会議で使う" },
  { href: "/chokaigi#usage-heading", label: "つかいかた" },
] as const;

/** `pathname.startsWith` で隠すパス（必要なら追加） */
export const SITE_HEADER_HIDDEN_PATHS: string[] = [];
