/**
 * server/src/lib/mapDbError.ts の単体テスト。
 *
 * `mapDbErrorToUserMessage` は DB 由来の例外をユーザー向け日本語文字列に
 * 変換する。フォーマットが変わると UI 側の「エラー表示」が壊れるほか、
 * 接続情報や SQL 本文が UI に漏れていないことも保証したい。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapDbErrorToUserMessage } from "../src/lib/mapDbError";

// ---------- 認証系 ----------

test("mapDbErrorToUserMessage: ER_ACCESS_DENIED_ERROR → ユーザー/パスワード案内", () => {
  const msg = mapDbErrorToUserMessage({ code: "ER_ACCESS_DENIED_ERROR" });
  assert.ok(msg.includes("ユーザー名"));
  assert.ok(msg.includes("パスワード"));
});

test("mapDbErrorToUserMessage: ER_ACCESS_DENIED_NO_PASSWORD_ERROR も認証案内", () => {
  const msg = mapDbErrorToUserMessage({ code: "ER_ACCESS_DENIED_NO_PASSWORD_ERROR" });
  assert.ok(msg.includes("ユーザー名"));
});

// ---------- ネットワーク系 ----------

test("mapDbErrorToUserMessage: ECONNREFUSED → 接続案内 (Railway Public Network)", () => {
  const msg = mapDbErrorToUserMessage({ code: "ECONNREFUSED" });
  assert.ok(msg.includes("接続できません"));
  assert.ok(msg.includes("Public"));
});

test("mapDbErrorToUserMessage: ETIMEDOUT / ENOTFOUND / ECONNRESET も同じ案内", () => {
  for (const code of ["ETIMEDOUT", "ENOTFOUND", "ECONNRESET"]) {
    const msg = mapDbErrorToUserMessage({ code });
    assert.ok(msg.includes("接続できません"), `${code} で接続案内が出る`);
  }
});

// ---------- スキーマ系 ----------

test("mapDbErrorToUserMessage: ER_BAD_DB_ERROR → DB 名不存在案内", () => {
  const msg = mapDbErrorToUserMessage({ code: "ER_BAD_DB_ERROR" });
  assert.ok(msg.includes("データベース名"));
});

test("mapDbErrorToUserMessage: errno 1049 も DB 名案内 (code がなくても動く)", () => {
  const msg = mapDbErrorToUserMessage({ errno: 1049 });
  assert.ok(msg.includes("データベース名"));
});

test("mapDbErrorToUserMessage: ER_NO_SUCH_TABLE → ensure 再実行案内", () => {
  const msg = mapDbErrorToUserMessage({ code: "ER_NO_SUCH_TABLE" });
  assert.ok(msg.includes("テーブル"));
  assert.ok(msg.includes("ensure") || msg.includes("再デプロイ"));
});

test("mapDbErrorToUserMessage: errno 1146 も同じテーブル案内", () => {
  const msg = mapDbErrorToUserMessage({ errno: 1146 });
  assert.ok(msg.includes("テーブル"));
});

test("mapDbErrorToUserMessage: ER_BAD_FIELD_ERROR → 列定義ずれ案内", () => {
  const msg = mapDbErrorToUserMessage({ code: "ER_BAD_FIELD_ERROR" });
  assert.ok(msg.includes("列定義") || msg.includes("マイグレーション"));
});

// ---------- 接続切断系 ----------

test("mapDbErrorToUserMessage: PROTOCOL_CONNECTION_LOST → 再読み込み案内", () => {
  const msg = mapDbErrorToUserMessage({ code: "PROTOCOL_CONNECTION_LOST" });
  assert.ok(msg.includes("接続が切れ"));
});

// ---------- SSL / TLS (sqlMessage ベース) ----------

test("mapDbErrorToUserMessage: SSL キーワードを含む sqlMessage は SSL 案内", () => {
  const msg = mapDbErrorToUserMessage({
    sqlMessage: "SSL connection failed on handshake",
  });
  assert.ok(msg.includes("SSL"));
});

test("mapDbErrorToUserMessage: certificate キーワードでも SSL 案内", () => {
  const msg = mapDbErrorToUserMessage({ message: "invalid certificate chain" });
  assert.ok(msg.includes("SSL"));
});

// ---------- データ系 ----------

test("mapDbErrorToUserMessage: ER_DATA_TOO_LONG → 長すぎ案内", () => {
  const msg = mapDbErrorToUserMessage({ code: "ER_DATA_TOO_LONG" });
  assert.ok(msg.includes("長すぎ"));
});

test("mapDbErrorToUserMessage: ER_DUP_ENTRY → 重複案内", () => {
  const msg = mapDbErrorToUserMessage({ code: "ER_DUP_ENTRY" });
  assert.ok(msg.includes("重複"));
});

// ---------- 空間データ ----------

test("mapDbErrorToUserMessage: ER_CANT_CREATE_GEOMETRY_OBJECT → 空間データ案内", () => {
  const msg = mapDbErrorToUserMessage({ code: "ER_CANT_CREATE_GEOMETRY_OBJECT" });
  assert.ok(msg.includes("位置"));
  assert.ok(msg.includes("SRID") || msg.includes("空間"));
});

test("mapDbErrorToUserMessage: geometry/srid キーワードの sqlMessage も空間データ案内", () => {
  const msg = mapDbErrorToUserMessage({
    sqlMessage: "Cannot get geometry from point with wrong SRID",
  });
  assert.ok(msg.includes("位置"));
});

// ---------- フォールバック ----------

test("mapDbErrorToUserMessage: 未知のエラーは汎用案内", () => {
  assert.equal(
    mapDbErrorToUserMessage({ code: "ER_SOMETHING_NEW" }),
    "サーバーエラーが発生しました"
  );
  assert.equal(
    mapDbErrorToUserMessage(undefined),
    "サーバーエラーが発生しました"
  );
  assert.equal(
    mapDbErrorToUserMessage(null),
    "サーバーエラーが発生しました"
  );
  assert.equal(
    mapDbErrorToUserMessage({}),
    "サーバーエラーが発生しました"
  );
});

// ---------- 情報漏洩チェック ----------

test("mapDbErrorToUserMessage: SQL 本文は UI メッセージに含めない（機密漏洩防止）", () => {
  // sqlMessage に SQL 本文が混じっても、出力には含めない
  const msg = mapDbErrorToUserMessage({
    code: "ER_BAD_FIELD_ERROR",
    sqlMessage: "Unknown column 'users.secret_api_key' in 'field list'",
  });
  assert.ok(!msg.includes("secret_api_key"));
  assert.ok(!msg.includes("field list"));
});

test("mapDbErrorToUserMessage: stack trace が漏れない", () => {
  const err = new Error("secret detail");
  const msg = mapDbErrorToUserMessage(err);
  // メッセージ自体は 「サーバーエラーが発生しました」 のフォールバックになるはず
  // （code / errno が無いので）
  assert.ok(!msg.includes("secret detail"));
});
