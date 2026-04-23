/**
 * server/src/lib/yukkuriShareUrls.ts の単体テスト。
 *
 * シェア URL は「X で押したときにちゃんと本文と URL がセットで入ること」
 * が UX 上の核なので、生成ロジックを契約として固める。
 * 特に `/intent/post` の text パラメータに「本文 + 改行 + URL」が連結されて
 * いないと、X の Desktop クライアントが text を無視して空白 composer に
 * 落ちる（過去に実害あり）。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeYukkuriHandle,
  yukkuriExplainedPagePath,
  yukkuriExplainedPageUrl,
  yukkuriOgImageUrl,
  yukkuriShareTweetText,
  yukkuriShareClipboardBundle,
  yukkuriShareTweetUrl,
  yukkuriTweetExplainedPagePath,
  yukkuriTweetExplainedPageUrl,
  yukkuriTweetShareTweetText,
  yukkuriTweetShareClipboardBundle,
  yukkuriTweetShareTweetUrl,
} from "../src/lib/yukkuriShareUrls";

const BASE = "https://surechigai-nico.link";

test("normalizeYukkuriHandle: @ を剥がし lowercase にする", () => {
  assert.equal(normalizeYukkuriHandle("@HOSINO_ROMI"), "hosino_romi");
  assert.equal(normalizeYukkuriHandle("HOSINO_ROMI"), "hosino_romi");
  assert.equal(normalizeYukkuriHandle("@@hosino_romi"), "hosino_romi");
  assert.equal(normalizeYukkuriHandle("  @hosino_romi  "), "hosino_romi");
});

test("yukkuriExplainedPagePath: 先頭スラッシュ付きでハンドルを URL エンコード", () => {
  assert.equal(
    yukkuriExplainedPagePath("hosino_romi"),
    "/yukkuri/explained/hosino_romi"
  );
});

test("yukkuriExplainedPageUrl: siteBase の末尾スラッシュを除去してから結合", () => {
  assert.equal(
    yukkuriExplainedPageUrl("https://example.com/", "user"),
    "https://example.com/yukkuri/explained/user"
  );
  assert.equal(
    yukkuriExplainedPageUrl("https://example.com", "user"),
    "https://example.com/yukkuri/explained/user"
  );
});

test("yukkuriOgImageUrl: 3 キャラ台詞を r/k/t パラメータで渡す", () => {
  const url = yukkuriOgImageUrl(BASE, "user", {
    rink: "こんにちは",
    konta: "よろしく",
    tanunee: "ふふふ",
  });
  const u = new URL(url);
  assert.equal(u.pathname, "/api/og");
  assert.equal(u.searchParams.get("h"), "user");
  assert.equal(u.searchParams.get("r"), "こんにちは");
  assert.equal(u.searchParams.get("k"), "よろしく");
  assert.equal(u.searchParams.get("t"), "ふふふ");
  assert.equal(u.searchParams.get("a"), null);
  assert.equal(u.searchParams.get("n"), null);
});

test("yukkuriOgImageUrl: extras で avatar / name を渡すと a / n が追加される", () => {
  const url = yukkuriOgImageUrl(
    BASE,
    "user",
    { rink: "r", konta: "k", tanunee: "t" },
    { avatar: "https://pbs.twimg.com/a.jpg", name: "星野さん" }
  );
  const u = new URL(url);
  assert.equal(u.searchParams.get("a"), "https://pbs.twimg.com/a.jpg");
  assert.equal(u.searchParams.get("n"), "星野さん");
});

test("yukkuriShareTweetText: ハンドルとハッシュタグを含む", () => {
  const text = yukkuriShareTweetText("hosino_romi");
  assert.match(text, /@hosino_romi/);
  assert.match(text, /#すれちがいライト/);
  assert.match(text, /#ニコニコ超会議2026/);
});

test("yukkuriShareClipboardBundle: 本文 + 改行 + URL 構造", () => {
  const b = yukkuriShareClipboardBundle(BASE, "user");
  const parts = b.split("\n");
  // 本文は複数行あり得るので、最終行が URL であることだけ確定
  assert.equal(parts[parts.length - 1], `${BASE}/yukkuri/explained/user`);
});

test("yukkuriShareTweetUrl: x.com/intent/post に text パラメータで本文+URL を連結", () => {
  const u = new URL(yukkuriShareTweetUrl(BASE, "user"));
  assert.equal(u.hostname, "x.com");
  assert.equal(u.pathname, "/intent/post");
  // url パラメータは使わない（Desktop で text が無視されるバグ回避）
  assert.equal(u.searchParams.get("url"), null);
  // text に本文と URL の両方が入っている
  const text = u.searchParams.get("text") ?? "";
  assert.match(text, /@user/, "本文にハンドルが含まれる");
  assert.ok(
    text.includes(`${BASE}/yukkuri/explained/user`),
    "text 内に紹介ページ URL が連結されていること"
  );
});

test("yukkuriTweetExplainedPagePath: 非数字を剥がして 32 桁に丸める", () => {
  assert.equal(
    yukkuriTweetExplainedPagePath("1234567890"),
    "/yukkuri/explained/tweet/1234567890"
  );
  // 非数字は全部剥がす
  assert.equal(
    yukkuriTweetExplainedPagePath("abc123def456"),
    "/yukkuri/explained/tweet/123456"
  );
  // 空文字でも壊れない
  assert.equal(yukkuriTweetExplainedPagePath(""), "/yukkuri/explained/tweet/");
});

test("yukkuriTweetExplainedPageUrl: フル URL を組み立てる", () => {
  assert.equal(
    yukkuriTweetExplainedPageUrl(BASE, "1234567890123456"),
    `${BASE}/yukkuri/explained/tweet/1234567890123456`
  );
});

test("yukkuriTweetShareTweetText: 「ツイートに反応」文言を含む", () => {
  const text = yukkuriTweetShareTweetText("hosino_romi");
  assert.match(text, /@hosino_romi/);
  assert.match(text, /ツイート/);
  // ハンドル解説用のテキストと区別できるマーカー（"反応"）を含む
  assert.match(text, /反応/);
});

test("yukkuriTweetShareClipboardBundle: ツイート解説ページの URL を含む", () => {
  const b = yukkuriTweetShareClipboardBundle(BASE, "1234567890", "user");
  const parts = b.split("\n");
  assert.equal(
    parts[parts.length - 1],
    `${BASE}/yukkuri/explained/tweet/1234567890`
  );
});

test("yukkuriTweetShareTweetUrl: ツイート解説ページへリンクするシェア URL", () => {
  const u = new URL(yukkuriTweetShareTweetUrl(BASE, "1234567890", "user"));
  assert.equal(u.hostname, "x.com");
  assert.equal(u.pathname, "/intent/post");
  assert.equal(u.searchParams.get("url"), null);
  const text = u.searchParams.get("text") ?? "";
  assert.ok(
    text.includes(`${BASE}/yukkuri/explained/tweet/1234567890`),
    "ツイート解説ページ URL が text 内に連結されていること"
  );
  assert.match(text, /@user/, "投稿者ハンドルが本文に含まれる");
  // ハンドル紹介ページ URL にはリンクしない（重要: 別ページへ飛ぶと OGP カードが誤る）
  assert.ok(
    !text.includes(`${BASE}/yukkuri/explained/user\n`) &&
      !text.endsWith(`${BASE}/yukkuri/explained/user`),
    "ハンドル紹介ページ URL にリンクしてはいけない"
  );
});
