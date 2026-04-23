/**
 * server/src/lib/aiErrorReport.ts の単体テスト。
 *
 * `maskToken` は UUID 等の機密値をエラーレポート文字列に混ぜる前に
 * マスクするための関数。ここが壊れると本物のトークンがそのまま
 * 画面やクリップボードに出るので、挙動を lock する。
 *
 * `buildAiErrorReport` は AI デバッグ用に渡す整形済みテキストを組み立てる。
 * 見出し行や [error] [request] [context_json] といったセクション
 * ヘッダが正しく入ること、未指定のセクションは出ないことを検証。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAiErrorReport, maskToken } from "../src/lib/aiErrorReport";

// ---------- maskToken ----------

test("maskToken: null / undefined / 空文字は (none)", () => {
  assert.equal(maskToken(null), "(none)");
  assert.equal(maskToken(undefined), "(none)");
  assert.equal(maskToken(""), "(none)");
});

test("maskToken: 8 文字以下は *** で全部隠す", () => {
  assert.equal(maskToken("a"), "***");
  assert.equal(maskToken("abcd"), "***");
  assert.equal(maskToken("12345678"), "***", "ちょうど 8 文字も隠す");
});

test("maskToken: 9 文字以上は 先頭4...末尾4", () => {
  assert.equal(maskToken("123456789"), "1234...6789");
  // 典型的な UUID (36 文字) を想定
  const uuid = "550e8400-e29b-41d4-a716-446655440000";
  assert.equal(maskToken(uuid), "550e...0000");
});

test("maskToken: マスク後に原文の中間部が含まれない（漏洩防止のロック）", () => {
  const secret = "SUPER_SECRET_TOKEN_PLEASE_DO_NOT_LEAK";
  const masked = maskToken(secret);
  // 先頭 4 と末尾 4 のみが見えるはず
  assert.equal(masked, "SUPE...LEAK");
  // 中間部の "SECRET_TOKEN" が残っていないこと
  assert.equal(masked.includes("SECRET"), false);
  assert.equal(masked.includes("TOKEN"), false);
  assert.equal(masked.includes("PLEASE"), false);
});

// ---------- buildAiErrorReport ----------

test("buildAiErrorReport: 必須セクションのヘッダが入る", () => {
  const report = buildAiErrorReport({
    feature: "test/feature",
    userMessage: "なんか壊れた",
  });
  assert.ok(report.startsWith("[AI_DEBUG_REPORT v1]"), "先頭はバージョンヘッダ");
  assert.ok(report.includes("feature: test/feature"));
  assert.ok(report.includes("user_message: なんか壊れた"));
  assert.ok(report.includes("[error]"), "[error] セクションは常に出る");
  assert.ok(report.includes("[stack]"));
});

test("buildAiErrorReport: Error インスタンスは name / message / stack を拾う", () => {
  const err = new TypeError("foo is not bar");
  const report = buildAiErrorReport({
    feature: "x",
    userMessage: "u",
    error: err,
  });
  assert.ok(report.includes("name: TypeError"));
  assert.ok(report.includes("message: foo is not bar"));
  // stack は少なくとも TypeError: foo... を含むはず
  assert.ok(report.includes("TypeError"));
});

test("buildAiErrorReport: string を投げた場合も落ちずに message に詰める", () => {
  const report = buildAiErrorReport({
    feature: "x",
    userMessage: "u",
    error: "bare-string-thrown",
  });
  assert.ok(report.includes("name: Error"));
  assert.ok(report.includes("message: bare-string-thrown"));
  assert.ok(report.includes("(non-error thrown value)"));
});

test("buildAiErrorReport: error 未指定は UnknownError プレースホルダ", () => {
  const report = buildAiErrorReport({ feature: "x", userMessage: "u" });
  assert.ok(report.includes("name: UnknownError"));
  assert.ok(report.includes("message: (unknown error object)"));
});

test("buildAiErrorReport: request 指定で [request] セクションが出る", () => {
  const report = buildAiErrorReport({
    feature: "x",
    userMessage: "u",
    request: { method: "POST", url: "/api/foo", status: 500 },
  });
  assert.ok(report.includes("[request]"));
  assert.ok(report.includes("method: POST"));
  assert.ok(report.includes("url: /api/foo"));
  assert.ok(report.includes("status: 500"));
});

test("buildAiErrorReport: request.status 未指定は (unknown)", () => {
  const report = buildAiErrorReport({
    feature: "x",
    userMessage: "u",
    request: { method: "GET", url: "/api/bar" },
  });
  assert.ok(report.includes("status: (unknown)"));
});

test("buildAiErrorReport: request 未指定なら [request] セクションごと出ない", () => {
  const report = buildAiErrorReport({ feature: "x", userMessage: "u" });
  assert.equal(report.includes("[request]"), false);
});

test("buildAiErrorReport: context は JSON で出力される", () => {
  const report = buildAiErrorReport({
    feature: "x",
    userMessage: "u",
    context: { authUuidMasked: "1234...5678", retry: 3 },
  });
  assert.ok(report.includes("[context_json]"));
  // インデント付き JSON (stringify の 2 スペースインデント) で書かれる
  assert.ok(report.includes('"authUuidMasked": "1234...5678"'));
  assert.ok(report.includes('"retry": 3'));
});

test("buildAiErrorReport: context 未指定なら [context_json] セクションごと出ない", () => {
  const report = buildAiErrorReport({ feature: "x", userMessage: "u" });
  assert.equal(report.includes("[context_json]"), false);
});

test("buildAiErrorReport + maskToken 統合: マスク結果が context に載せても原文が漏れない", () => {
  const secret = "550e8400-e29b-41d4-a716-446655440000";
  const report = buildAiErrorReport({
    feature: "dashboard/auth-sync",
    userMessage: "同期失敗",
    context: { authUuidMasked: maskToken(secret) },
  });
  assert.ok(report.includes("550e...0000"));
  // 原文の中間部 (-e29b-41d4-a716-) は含まれないこと
  assert.equal(report.includes("e29b-41d4"), false);
  assert.equal(report.includes("446655440000"), false, "末尾 4 は見えるが全体は見えない");
});
