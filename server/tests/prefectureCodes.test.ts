/**
 * server/src/lib/prefectureCodes.ts の単体テスト。
 *
 * home_prefecture は JIS X 0401 の "01".."47" を 0 パディング文字列で API 境界で扱う約束。
 * 境界値（"00" / "48" / 整数 / 短い "1"）が入ってきたときに拒否されること、
 * および 01→北海道・47→沖縄県といった代表値の変換が壊れないことを lock する。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidPrefectureCode,
  prefectureCodeToName,
  prefectureNameToCode,
  PREFECTURE_NAMES,
  PREFECTURE_CODE_PATTERN,
} from "../src/lib/prefectureCodes";

test("isValidPrefectureCode: 01〜47 の 0 パディング文字列だけ true", () => {
  assert.equal(isValidPrefectureCode("01"), true);
  assert.equal(isValidPrefectureCode("09"), true);
  assert.equal(isValidPrefectureCode("10"), true);
  assert.equal(isValidPrefectureCode("13"), true); // 東京都
  assert.equal(isValidPrefectureCode("47"), true);
});

test("isValidPrefectureCode: 範囲外・整数・0 非パディングは全部 false", () => {
  assert.equal(isValidPrefectureCode("00"), false);
  assert.equal(isValidPrefectureCode("48"), false);
  assert.equal(isValidPrefectureCode("1"), false, "1 桁は不可");
  assert.equal(isValidPrefectureCode("9"), false, "1 桁は不可");
  assert.equal(isValidPrefectureCode("99"), false);
  assert.equal(isValidPrefectureCode(""), false);
  assert.equal(isValidPrefectureCode(null), false);
  assert.equal(isValidPrefectureCode(undefined), false);
  assert.equal(isValidPrefectureCode(13), false, "number は拒否（型揺れ防止）");
  assert.equal(isValidPrefectureCode("13 "), false, "前後空白あり不可");
  assert.equal(isValidPrefectureCode("＋1"), false, "全角不可");
});

test("PREFECTURE_CODE_PATTERN は 01..47 の全 47 値にマッチする", () => {
  for (let i = 1; i <= 47; i++) {
    const code = String(i).padStart(2, "0");
    assert.equal(
      PREFECTURE_CODE_PATTERN.test(code),
      true,
      `コード ${code} がパターンに一致するべき`
    );
  }
});

test("PREFECTURE_NAMES: 配列の長さは 47、先頭と末尾は北海道と沖縄県", () => {
  assert.equal(PREFECTURE_NAMES.length, 47);
  assert.equal(PREFECTURE_NAMES[0], "北海道");
  assert.equal(PREFECTURE_NAMES[46], "沖縄県");
});

test("prefectureCodeToName: 代表値の変換が正しい", () => {
  assert.equal(prefectureCodeToName("01"), "北海道");
  assert.equal(prefectureCodeToName("13"), "東京都");
  assert.equal(prefectureCodeToName("27"), "大阪府");
  assert.equal(prefectureCodeToName("26"), "京都府");
  assert.equal(prefectureCodeToName("47"), "沖縄県");
});

test("prefectureCodeToName: 不正値は null", () => {
  assert.equal(prefectureCodeToName(null), null);
  assert.equal(prefectureCodeToName(undefined), null);
  assert.equal(prefectureCodeToName(""), null);
  assert.equal(prefectureCodeToName("00"), null);
  assert.equal(prefectureCodeToName("48"), null);
  assert.equal(prefectureCodeToName("1"), null, "1 桁は無効");
});

test("prefectureNameToCode: 代表値の逆引き", () => {
  assert.equal(prefectureNameToCode("北海道"), "01");
  assert.equal(prefectureNameToCode("東京都"), "13");
  assert.equal(prefectureNameToCode("大阪府"), "27");
  assert.equal(prefectureNameToCode("沖縄県"), "47");
});

test("prefectureNameToCode: 部分一致や未知の名前は null", () => {
  assert.equal(prefectureNameToCode("東京"), null, "『都』抜きは拒否");
  assert.equal(prefectureNameToCode("大阪"), null, "『府』抜きは拒否");
  assert.equal(prefectureNameToCode(""), null);
  assert.equal(prefectureNameToCode(null), null);
  assert.equal(prefectureNameToCode(undefined), null);
  assert.equal(prefectureNameToCode("火星"), null);
});

test("ラウンドトリップ: code -> name -> code が 47 全件で一致", () => {
  for (let i = 1; i <= 47; i++) {
    const code = String(i).padStart(2, "0");
    const name = prefectureCodeToName(code);
    assert.ok(name, `コード ${code} の名前解決`);
    const roundtrip = prefectureNameToCode(name!);
    assert.equal(roundtrip, code, `コード ${code} でラウンドトリップ一致`);
  }
});
