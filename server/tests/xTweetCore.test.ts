/**
 * server/src/lib/xTweetCore.ts / xProfileCacheCore.ts の単体テスト。
 * expansions の有無（= 課金オブジェクト数）とキャッシュ投稿者の採用条件を固定する。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTweetLookupUrl,
  buildUserByIdUrl,
  countBilledObjects,
  parseTweetResponse,
  type RawTweetResponse,
  type XTweetAuthor,
} from "../src/lib/xTweetCore";
import {
  cachedAuthorMatches,
  isCachedXProfile,
  parseProfileCacheTtlSec,
  profileCacheKey,
} from "../src/lib/xProfileCacheCore";
import { estimateXApiCostMills } from "../src/lib/xApiBudgetCore";

const AUTHOR: XTweetAuthor = {
  id: "42",
  username: "hosino_romi",
  name: "ほしのろみ",
  description: "bio",
  profileImageUrl: "https://pbs.twimg.com/a_400x400.jpg",
};

const RAW_WITH_INCLUDES: RawTweetResponse = {
  data: {
    id: "123",
    text: "hello",
    author_id: "42",
    created_at: "2026-11-22T00:00:00.000Z",
    public_metrics: { like_count: 3, reply_count: 1 },
  },
  includes: {
    users: [
      {
        id: "42",
        username: "hosino_romi",
        name: "ほしのろみ",
        description: "bio",
        profile_image_url: "https://pbs.twimg.com/a_normal.jpg",
      },
    ],
  },
};

test("buildTweetLookupUrl: expansions あり/なし", () => {
  const withExp = buildTweetLookupUrl("123", true);
  assert.match(withExp, /expansions=author_id/);
  assert.match(withExp, /user\.fields=/);
  const noExp = buildTweetLookupUrl("123", false);
  assert.doesNotMatch(noExp, /expansions/);
  assert.doesNotMatch(noExp, /user\.fields/);
  assert.match(noExp, /tweet\.fields=[^&]*author_id/);
  assert.match(buildUserByIdUrl("42"), /\/2\/users\/42\?user\.fields=/);
});

test("countBilledObjects: expansions 込みは post+user = $0.015、post のみは $0.005", () => {
  const withExp = countBilledObjects(RAW_WITH_INCLUDES);
  assert.deepEqual(withExp, { posts: 1, users: 1 });
  assert.equal(estimateXApiCostMills(withExp), 15);
  const noExp = countBilledObjects({ data: RAW_WITH_INCLUDES.data });
  assert.deepEqual(noExp, { posts: 1, users: 0 });
  assert.equal(estimateXApiCostMills(noExp), 5);
  assert.deepEqual(countBilledObjects(null), { posts: 0, users: 0 });
});

test("parseTweetResponse: includes の投稿者を使い、アバターを 400x400 に正規化", () => {
  const r = parseTweetResponse(RAW_WITH_INCLUDES, null);
  assert.equal(r.kind, "ok");
  if (r.kind !== "ok") return;
  assert.equal(r.tweet.author.username, "hosino_romi");
  assert.equal(r.tweet.author.profileImageUrl, "https://pbs.twimg.com/a_400x400.jpg");
  assert.equal(r.tweet.metrics.likeCount, 3);
});

test("parseTweetResponse: expansions なし + author_id 一致のキャッシュ投稿者を採用", () => {
  const r = parseTweetResponse({ data: RAW_WITH_INCLUDES.data }, AUTHOR);
  assert.equal(r.kind, "ok");
  if (r.kind === "ok") assert.equal(r.tweet.author, AUTHOR);
});

test("parseTweetResponse: author_id 不一致（URL ハンドル偽装等）は need_author", () => {
  const r = parseTweetResponse({ data: { ...RAW_WITH_INCLUDES.data, author_id: "999" } }, AUTHOR);
  assert.equal(r.kind, "need_author");
  if (r.kind === "need_author") {
    assert.equal(r.authorId, "999");
    assert.equal(r.partial.text, "hello");
  }
});

test("parseTweetResponse: 本文欠落は invalid", () => {
  assert.equal(parseTweetResponse({ data: { id: "1" } }, AUTHOR).kind, "invalid");
  assert.equal(parseTweetResponse({}, null).kind, "invalid");
});

test("xProfileCacheCore: キー正規化・TTL・型ガード・author_id 一致判定", () => {
  assert.equal(profileCacheKey("  @@Hosino_Romi "), "xprofile:v1:hosino_romi");
  assert.equal(parseProfileCacheTtlSec(undefined), 86_400);
  assert.equal(parseProfileCacheTtlSec("0"), 0);
  assert.equal(parseProfileCacheTtlSec("x"), 86_400);
  const p = { ...AUTHOR, followersCount: 10 };
  assert.equal(isCachedXProfile(p), true);
  assert.equal(isCachedXProfile({ ...p, id: "" }), false);
  assert.equal(isCachedXProfile({ ...p, followersCount: "10" }), false);
  assert.equal(isCachedXProfile(null), false);
  assert.equal(cachedAuthorMatches(p, "42"), true);
  assert.equal(cachedAuthorMatches(p, "43"), false);
  assert.equal(cachedAuthorMatches(null, "42"), false);
});
