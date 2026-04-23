/**
 * server/src/lib/yukkuriDialogueClamp.ts の単体テスト。
 *
 * 1 人あたり 118 字上限は、OG カード / DB カラム / UI のバブル幅の
 * 三者で守るべき視覚的契約。LLM が指示を無視して長文を返してきた時の
 * セーフティネットなので、境界値を lock しておく。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clampYukkuriSpeakerLine,
  clampYukkuriDialogue,
  YUKKURI_DIALOGUE_MAX_CHARS_PER_SPEAKER,
} from "../src/lib/yukkuriDialogueClamp";

test("clampYukkuriSpeakerLine: 上限以内ならそのまま（ただし連続空白は 1 個に圧縮）", () => {
  assert.equal(clampYukkuriSpeakerLine("こんにちは"), "こんにちは");
  assert.equal(clampYukkuriSpeakerLine("  前後に空白  "), "前後に空白");
  assert.equal(clampYukkuriSpeakerLine("連続  な  空白"), "連続 な 空白");
});

test("clampYukkuriSpeakerLine: 上限超過時は 1 文字減らして末尾に … を付ける", () => {
  const longText = "あ".repeat(200);
  const clamped = clampYukkuriSpeakerLine(longText);
  // 末尾 1 文字は … なので合計は max に等しい
  assert.equal(clamped.length, YUKKURI_DIALOGUE_MAX_CHARS_PER_SPEAKER);
  assert.ok(clamped.endsWith("…"), "末尾に … が付くこと");
});

test("clampYukkuriSpeakerLine: ちょうど max 文字は省略されない", () => {
  const text = "あ".repeat(YUKKURI_DIALOGUE_MAX_CHARS_PER_SPEAKER);
  const clamped = clampYukkuriSpeakerLine(text);
  assert.equal(clamped, text);
  assert.ok(!clamped.endsWith("…"));
});

test("clampYukkuriSpeakerLine: max+1 文字から省略が発生する", () => {
  const text = "あ".repeat(YUKKURI_DIALOGUE_MAX_CHARS_PER_SPEAKER + 1);
  const clamped = clampYukkuriSpeakerLine(text);
  assert.ok(clamped.endsWith("…"));
  assert.equal(clamped.length, YUKKURI_DIALOGUE_MAX_CHARS_PER_SPEAKER);
});

test("clampYukkuriSpeakerLine: 空文字 / 空白のみは空文字", () => {
  assert.equal(clampYukkuriSpeakerLine(""), "");
  assert.equal(clampYukkuriSpeakerLine("   "), "");
  assert.equal(clampYukkuriSpeakerLine("\n\t"), "");
});

test("clampYukkuriSpeakerLine: 明示的な maxChars 引数で短く切れる", () => {
  assert.equal(clampYukkuriSpeakerLine("あいうえおかきくけこ", 5), "あいうえ…");
});

test("clampYukkuriDialogue: 3 キャラすべてに clamp が適用される", () => {
  const over = "あ".repeat(200);
  const result = clampYukkuriDialogue({
    rink: over,
    konta: over,
    tanunee: over,
  });
  assert.equal(result.rink.length, YUKKURI_DIALOGUE_MAX_CHARS_PER_SPEAKER);
  assert.equal(result.konta.length, YUKKURI_DIALOGUE_MAX_CHARS_PER_SPEAKER);
  assert.equal(result.tanunee.length, YUKKURI_DIALOGUE_MAX_CHARS_PER_SPEAKER);
  assert.ok(result.rink.endsWith("…"));
  assert.ok(result.konta.endsWith("…"));
  assert.ok(result.tanunee.endsWith("…"));
});

test("clampYukkuriDialogue: 3 キャラそれぞれ独立に判定される（短いやつは触らない）", () => {
  const result = clampYukkuriDialogue({
    rink: "短い",
    konta: "あ".repeat(200), // 長い
    tanunee: "ちょっとだけ",
  });
  assert.equal(result.rink, "短い");
  assert.ok(result.konta.endsWith("…"));
  assert.equal(result.tanunee, "ちょっとだけ");
});
