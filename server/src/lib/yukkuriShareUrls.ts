/**
 * ゆっくり解説の「アカウント別・固定の紹介ページ」URL。
 * DB `yukkuri_explained`（1ハンドル1行・再解説で上書き）と対応。
 */

export function normalizeYukkuriHandle(handle: string): string {
  return handle.replace(/^@+/, "").trim().toLowerCase();
}

/** サイト内パス（先頭スラッシュ付き） */
export function yukkuriExplainedPagePath(handle: string): string {
  const h = normalizeYukkuriHandle(handle);
  return `/yukkuri/explained/${encodeURIComponent(h)}`;
}

export function yukkuriExplainedPageUrl(siteBase: string, handle: string): string {
  const base = siteBase.replace(/\/$/, "");
  return `${base}${yukkuriExplainedPagePath(handle)}`;
}

/** X などで共有するときのカード画像（本文はクエリで渡す既存 `/api/og`） */
export function yukkuriOgImageUrl(
  siteBase: string,
  handle: string,
  dialogue: { rink: string; konta: string; tanunee: string }
): string {
  const base = siteBase.replace(/\/$/, "");
  const url = new URL(`${base}/api/og`);
  const h = normalizeYukkuriHandle(handle);
  url.searchParams.set("h", h || "???");
  url.searchParams.set("r", dialogue.rink);
  url.searchParams.set("k", dialogue.konta);
  url.searchParams.set("t", dialogue.tanunee);
  return url.toString();
}
