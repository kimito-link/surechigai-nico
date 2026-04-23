/**
 * server/src/lib/tweetUrl.ts の単体テスト。
 *
 * ツイート URL の解析は UI の送信振り分け (/api/yukkuri-explain vs
 * /api/yukkuri-explain-tweet) を決める核なので、「この URL を投げたときに
 * どちらに行くか」を契約として固める。
 *
 * 実行: `npm run test:unit` (node --import tsx --test tests/*.test.ts)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractTweetId, classifyYukkuriInput } from "../src/lib/tweetUrl";

test("extractTweetId: x.com のツイート URL から ID とハンドルを取り出す", () => {
  assert.deepEqual(extractTweetId("https://x.com/hosino_romi/status/1234567890123456789"), {
    tweetId: "1234567890123456789",
    handle: "hosino_romi",
  });
});

test("extractTweetId: twitter.com も同様に扱う", () => {
  assert.deepEqual(extractTweetId("https://twitter.com/HOSINO_ROMI/status/12345678901"), {
    tweetId: "12345678901",
    handle: "hosino_romi",
  });
});

test("extractTweetId: mobile.twitter.com も同様", () => {
  assert.deepEqual(
    extractTweetId("https://mobile.twitter.com/abc/status/9999999999999"),
    { tweetId: "9999999999999", handle: "abc" }
  );
});

test("extractTweetId: /i/status/ は handle を null にする", () => {
  assert.deepEqual(extractTweetId("https://x.com/i/status/1122334455667788"), {
    tweetId: "1122334455667788",
    handle: null,
  });
});

test("extractTweetId: 末尾スラッシュ / /photo/1 / クエリ / フラグメント を剥がす", () => {
  const variations = [
    "https://x.com/user/status/1234567890/",
    "https://x.com/user/status/1234567890/photo/1",
    "https://x.com/user/status/1234567890?ref_src=twsrc%5Etfw",
    "https://x.com/user/status/1234567890#abc",
  ];
  for (const url of variations) {
    const parsed = extractTweetId(url);
    assert.equal(parsed?.tweetId, "1234567890", `${url} が正しくパースされること`);
    assert.equal(parsed?.handle, "user");
  }
});

test("extractTweetId: https:// 省略も補って受け付ける", () => {
  assert.deepEqual(extractTweetId("x.com/user/status/12345678"), {
    tweetId: "12345678",
    handle: "user",
  });
});

test("extractTweetId: プロフィール URL は null", () => {
  assert.equal(extractTweetId("https://x.com/hosino_romi"), null);
});

test("extractTweetId: 他ドメインは null", () => {
  assert.equal(extractTweetId("https://example.com/user/status/12345"), null);
  assert.equal(extractTweetId("https://fake-x.com/user/status/12345"), null);
});

test("extractTweetId: 極端に短い / 長い ID は拒否", () => {
  assert.equal(extractTweetId("https://x.com/u/status/123"), null); // 4 桁以下
  assert.equal(
    extractTweetId("https://x.com/u/status/12345678901234567890123456"),
    null
  ); // 26 桁
});

test("extractTweetId: 空文字 / 空白 / null は null", () => {
  assert.equal(extractTweetId(""), null);
  assert.equal(extractTweetId("   "), null);
  assert.equal(extractTweetId(null), null);
  assert.equal(extractTweetId(undefined), null);
});

test("classifyYukkuriInput: ツイート URL は kind: tweet", () => {
  assert.deepEqual(
    classifyYukkuriInput("https://x.com/user/status/1234567890123"),
    { kind: "tweet", tweetId: "1234567890123", handle: "user" }
  );
});

test("classifyYukkuriInput: 裸のハンドルは kind: handle", () => {
  assert.deepEqual(classifyYukkuriInput("hosino_romi"), {
    kind: "handle",
    handle: "hosino_romi",
  });
  assert.deepEqual(classifyYukkuriInput("@HOSINO_ROMI"), {
    kind: "handle",
    handle: "hosino_romi",
  });
});

test("classifyYukkuriInput: プロフィール URL もハンドル扱い", () => {
  assert.deepEqual(classifyYukkuriInput("https://x.com/hosino_romi"), {
    kind: "handle",
    handle: "hosino_romi",
  });
});

test("classifyYukkuriInput: 16 文字以上のハンドルは unknown", () => {
  // X のハンドルは最大 15 文字。それ以上はハンドルと認識させない。
  assert.deepEqual(classifyYukkuriInput("a".repeat(16)), { kind: "unknown" });
});

test("classifyYukkuriInput: 記号混じり・空白・日本語混じりは unknown", () => {
  assert.deepEqual(classifyYukkuriInput("hello world"), { kind: "unknown" });
  assert.deepEqual(classifyYukkuriInput("日本語"), { kind: "unknown" });
  assert.deepEqual(classifyYukkuriInput("a.b"), { kind: "unknown" });
  assert.deepEqual(classifyYukkuriInput(""), { kind: "unknown" });
});

// --- 正規化の順序リグレッション防止 ---------------------------------
// 旧実装は `.replace(/^@+/, "").trim()` の順で、先頭に空白がある場合は
// `^@+` が一致せず @ が残っていた（結果 kind: unknown に落ちていた）。
// `.trim().replace(/^@+/, "")` の順に揃えることで、貼り付け由来の前後空白や
// モバイルの自動スペース挿入でも正しくハンドルを拾えるようになる。
test("classifyYukkuriInput: 先頭に空白がある @handle も handle 扱い（正規化順リグレッション）", () => {
  assert.deepEqual(classifyYukkuriInput("  @hosino_romi  "), {
    kind: "handle",
    handle: "hosino_romi",
  });
  assert.deepEqual(classifyYukkuriInput("\t@HOSINO_ROMI\n"), {
    kind: "handle",
    handle: "hosino_romi",
  });
});

test("classifyYukkuriInput: 複数 @ で始まっても 1 つ目のハンドルだけ拾う", () => {
  assert.deepEqual(classifyYukkuriInput(" @@hosino_romi"), {
    kind: "handle",
    handle: "hosino_romi",
  });
});
