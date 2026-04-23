/**
 * X / Twitter のツイート URL を解析する。
 *
 * 対応する URL パターン:
 * - `https://x.com/{handle}/status/{id}`
 * - `https://twitter.com/{handle}/status/{id}`
 * - `https://mobile.twitter.com/{handle}/status/{id}`
 * - `https://x.com/i/status/{id}`（X が出力する author 不明な汎用リンク）
 * - `https://x.com/{handle}/status/{id}/` 末尾スラッシュ付き
 * - クエリ（`?ref_src=...`）・フラグメント付きも剥がして ID だけ取る
 *
 * 拾わないもの:
 * - `/photo/1`, `/video/1` など status 後ろのサブセグメント（ID は取る）
 * - `x.com/{handle}` のプロフィール URL（tweet ID 無し → null 返却）
 * - 他ドメイン（`example.com/status/123` など）
 *
 * 返り値:
 * - 成功: `{ tweetId: string; handle: string | null }`
 *   - `handle` は `/i/status/` など URL から author 不明の場合は null
 * - 失敗: null
 */
export type ParsedTweetUrl = {
  tweetId: string;
  handle: string | null;
};

const X_HOSTS = /^(?:(?:m|mobile|www)\.)?(?:x|twitter)\.com$/i;

/**
 * 文字列からツイート URL を検出して tweet_id を返す。
 *
 * 入力が裸の数値 ID（`1234567890`）の場合も許容する設計にしたかったが、
 * それだと「ハンドル検索のつもりで数字だけ入れた」誤爆が起きるため、
 * 必ず URL の形で受け取ることに限定。
 */
export function extractTweetId(input: string | null | undefined): ParsedTweetUrl | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  // 生の URL か、`https://` が省略された形か、両方を受け付ける
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return null;
  }
  if (!X_HOSTS.test(url.hostname)) return null;
  const segments = url.pathname.split("/").filter(Boolean);
  const statusIdx = segments.indexOf("status");
  if (statusIdx < 0) return null;
  const tweetId = segments[statusIdx + 1];
  if (!tweetId) return null;
  // X のツイート ID は最大 19 桁程度の純数字。将来の拡張を見越し 5〜25 桁を許容
  if (!/^\d{5,25}$/.test(tweetId)) return null;
  const rawHandle = segments[0];
  const handle =
    rawHandle && rawHandle.toLowerCase() !== "i" && statusIdx === 1
      ? rawHandle.replace(/^@+/, "").toLowerCase()
      : null;
  return { tweetId, handle };
}

/**
 * ユーザー入力を「ハンドル」と「ツイート URL」のどちらかに分類するヘルパー。
 * 呼び出し側 UI が 2 つの API（/api/yukkuri-explain と /api/yukkuri-explain-tweet）
 * を振り分けるために使う。
 */
export function classifyYukkuriInput(input: string): {
  kind: "tweet";
  tweetId: string;
  handle: string | null;
} | {
  kind: "handle";
  handle: string;
} | {
  kind: "unknown";
} {
  const parsed = extractTweetId(input);
  if (parsed) return { kind: "tweet", ...parsed };
  const handle = (input ?? "")
    .trim()
    .replace(/^@+/, "")
    // x.com/{handle} のような URL 末尾もハンドル扱い（status が無い場合）
    .replace(/^https?:\/\/[^/]+\//i, "")
    .split(/[/?#]/)[0]
    ?.trim()
    .toLowerCase() ?? "";
  if (!handle) return { kind: "unknown" };
  if (!/^[a-z0-9_]{1,15}$/i.test(handle)) return { kind: "unknown" };
  return { kind: "handle", handle };
}
