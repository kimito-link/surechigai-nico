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

/**
 * X へのシェア用 intent URL を生成する。
 *
 * 重要:
 * - エンドポイントは `/intent/post`。旧 `/intent/tweet` は一部の X クライアント
 *   で `text` パラメータが無視される事象（tweet composer が空で開く）が報告されて
 *   いるため使わない。
 * - `text`（本文）と `url`（カード URL）は別パラメータで渡す。こうすると X 側が
 *   URL を OGP プレビュー対象として認識し、280 字制限の文字カウントからも外れる。
 * - 本文に URL を連結してはいけない。X が URL を本文文字列の一部と見なして OGP
 *   カードを生成しない/文字数を無駄に食う、といった副作用が起きる。
 */
export function yukkuriShareTweetUrl(siteBase: string, handle: string): string {
  const cardUrl = yukkuriExplainedPageUrl(siteBase, handle);
  const text = `りんく・こん太・たぬ姉に @${handle} さんをゆっくり解説してもらったよ！\n#すれちがいライト #ニコニコ超会議2026`;
  const params = new URLSearchParams({ text, url: cardUrl });
  return `https://x.com/intent/post?${params.toString()}`;
}
