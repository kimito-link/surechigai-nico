/**
 * ゆっくり解説の「アカウント別・固定の紹介ページ」URL。
 * DB `yukkuri_explained`（1ハンドル1行・再解説で上書き）と対応。
 */

export function normalizeYukkuriHandle(handle: string): string {
  // 順序重要: trim() を先にしないと「  @hosino_romi  」のような
  // 先頭空白 + @ の入力で @ が剥がれない（空白が先頭にあるため ^@+ に一致しない）。
  return handle.trim().replace(/^@+/, "").toLowerCase();
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
 * 仕様（2026-04 時点の挙動に合わせて変更）:
 * - エンドポイントは `/intent/post`
 * - **`text` パラメータに「本文 + 改行 + URL」を連結して渡す**。
 *   `url` パラメータは付けない。X 側が `text` 内の URL を自動検出して
 *   OGP カードを生成する（本文文字数カウントからは URL が除外される）。
 *
 * なぜこの仕様になったか（履歴メモ）:
 * - 旧実装は `text=<本文>` と `url=<URL>` を別パラメータで渡していた。
 *   この方式は X Web の古い挙動では「URL は OGP カード化される（本文と分離）」
 *   と想定されていたが、**2026-04 現在、X の Windows / Mac デスクトップアプリ
 *   および一部の Web セッションで `text` が完全に無視され、composer に URL
 *   文字列だけが貼られる現象**が再現した（ユーザー報告 + 開発者による再現確認）。
 * - `text` に本文 + URL を連結する方式なら、composer に本文が必ず入り、
 *   URL もそのまま貼られるため OGP カードも自動で生成される。文字数カウント
 *   では URL はオートリンク化時に「t.co 23 字」に短縮される。
 * - 「本文に URL を連結すると OGP カードが生成されない」という旧コメントは、
 *   さらに昔の Twitter Cards v1 時代の話で、現行の X では当てはまらない。
 *
 * 併用する UX 対策:
 * - UI 側ではシェアを押した瞬間に `yukkuriShareClipboardBundle` でクリップボード
 *   に本文＋URL を入れている。X デスクトップアプリが intent パラメータを
 *   完全に無視して空白の composer を開いた場合でも、ユーザーが Ctrl+V / ⌘V で
 *   即座にリカバリできる（案内文も表示）。
 */
export function yukkuriShareTweetUrl(siteBase: string, handle: string): string {
  const cardUrl = yukkuriExplainedPageUrl(siteBase, handle);
  const text = yukkuriShareTweetText(handle);
  // 本文 + 改行 + URL の 1 本の string として text に渡す。
  // Desktop / Web / iOS / Android のどのクライアントでも composer に本文と URL
  // が両方入り、URL から OGP カードが自動生成される。
  const body = `${text}\n${cardUrl}`;
  const params = new URLSearchParams({ text: body });
  return `https://x.com/intent/post?${params.toString()}`;
}

/* =========================================================
 * ツイート URL 解説モード用のシェア URL 群
 *
 * ハンドル解説（上記）はアカウント紹介ページを共有するが、ツイート解説は
 * 「この 1 ツイートに 3 キャラが反応した結果」を共有する別の体験。
 * カード URL を `/yukkuri/explained/tweet/{tweetId}` にすることで、
 * シェアカードにツイート本文と 3 キャラの反応が写る（`/api/og` は同関数で生成）。
 * ========================================================= */

export function yukkuriTweetExplainedPagePath(tweetId: string): string {
  const t = tweetId.replace(/\D/g, "").slice(0, 32);
  return `/yukkuri/explained/tweet/${encodeURIComponent(t)}`;
}

export function yukkuriTweetExplainedPageUrl(siteBase: string, tweetId: string): string {
  const base = siteBase.replace(/\/$/, "");
  return `${base}${yukkuriTweetExplainedPagePath(tweetId)}`;
}

/**
 * X に流すツイート解説のシェア本文（URL を含まない）。
 * `yukkuriShareTweetText` と同じトーンでまとめるが、「ツイート」を名指しする。
 */
export function yukkuriTweetShareTweetText(handle: string): string {
  return `りんく・こん太・たぬ姉が @${handle} のツイートに反応してくれたよ！\n#すれちがいライト #ニコニコ超会議2026`;
}

export function yukkuriTweetShareClipboardBundle(
  siteBase: string,
  tweetId: string,
  handle: string
): string {
  return `${yukkuriTweetShareTweetText(handle)}\n${yukkuriTweetExplainedPageUrl(siteBase, tweetId)}`;
}

/**
 * ツイート解説用の `x.com/intent/post` URL。
 * ハンドル用と同じ方針: `text` に「本文 + 改行 + URL」を連結、`url` パラメータは使わない。
 */
export function yukkuriTweetShareTweetUrl(
  siteBase: string,
  tweetId: string,
  handle: string
): string {
  const cardUrl = yukkuriTweetExplainedPageUrl(siteBase, tweetId);
  const text = yukkuriTweetShareTweetText(handle);
  const body = `${text}\n${cardUrl}`;
  const params = new URLSearchParams({ text: body });
  return `https://x.com/intent/post?${params.toString()}`;
}
