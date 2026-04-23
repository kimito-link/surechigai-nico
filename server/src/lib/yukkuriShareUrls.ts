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

/**
 * X などで共有するときのカード画像（本文はクエリで渡す既存 `/api/og`）。
 *
 * `extras` に `avatar` / `name` が渡されたときは、シェアカード中央に対象アカウントの
 * アバター円とユーザー名を表示する（りんく・こん太・たぬ姉が「紹介している」構図）。
 * どちらも optional。未指定時はイニシャルのみのフォールバック表示になる。
 */
export function yukkuriOgImageUrl(
  siteBase: string,
  handle: string,
  dialogue: { rink: string; konta: string; tanunee: string },
  extras?: { avatar?: string | null; name?: string | null }
): string {
  const base = siteBase.replace(/\/$/, "");
  const url = new URL(`${base}/api/og`);
  const h = normalizeYukkuriHandle(handle);
  url.searchParams.set("h", h || "???");
  url.searchParams.set("r", dialogue.rink);
  url.searchParams.set("k", dialogue.konta);
  url.searchParams.set("t", dialogue.tanunee);
  if (extras?.avatar) url.searchParams.set("a", extras.avatar);
  if (extras?.name) url.searchParams.set("n", extras.name);
  return url.toString();
}

/**
 * X に流すときのツイート本文（URL を含まない）。
 *
 * OGP カード表示のために URL は `url` パラメータで別に渡す前提。
 * デスクトップアプリ向けフォールバックでは本文＋URL を連結してクリップボードに入れる。
 */
export function yukkuriShareTweetText(handle: string): string {
  return `りんく・こん太・たぬ姉に @${handle} さんをゆっくり解説してもらったよ！\n#すれちがいライト #ニコニコ超会議2026`;
}

/**
 * X デスクトップアプリが intent URL を開いた時に「空の composer」に落ちた時用の
 * ペースト前提テキスト。本文の末尾に改行で URL を連結する。
 */
export function yukkuriShareClipboardBundle(siteBase: string, handle: string): string {
  return `${yukkuriShareTweetText(handle)}\n${yukkuriExplainedPageUrl(siteBase, handle)}`;
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
 *
 * なお X の Windows / Mac デスクトップアプリが `x.com` のリンクをインターセプト
 * した際に intent パラメータを無視して空白の composer を開くことが確認されている。
 * その対策として UI 側では「シェアを押した瞬間に本文＋URL をクリップボードに入れる」
 * `yukkuriShareClipboardBundle` を併用する（ユーザーは貼り付けでリカバリできる）。
 */
export function yukkuriShareTweetUrl(siteBase: string, handle: string): string {
  const cardUrl = yukkuriExplainedPageUrl(siteBase, handle);
  const text = yukkuriShareTweetText(handle);
  const params = new URLSearchParams({ text, url: cardUrl });
  return `https://x.com/intent/post?${params.toString()}`;
}
