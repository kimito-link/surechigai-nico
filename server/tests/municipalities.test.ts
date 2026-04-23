/**
 * server/src/lib/municipalities.ts の単体テスト。
 *
 * おさんぽ機能でランダムに「行き先」を決めるのに使う。県名をキーにした辞書。
 * - 47 県すべてに最低 1 件以上の市区町村が入っていること
 * - 知らない県を渡したら null が返ること（壊れないこと）
 *
 * ランダム関数のテストは `Math.random` を差し替えて決定的にする。
 *
 * 実行: `npm run test:unit`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MUNICIPALITIES,
  getRandomMunicipality,
} from "../src/lib/municipalities";

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県",
  "沖縄県",
];

// ---------- MUNICIPALITIES ----------

test("MUNICIPALITIES: 47 都道府県すべてがキーとして存在", () => {
  for (const pref of PREFECTURES) {
    assert.ok(
      MUNICIPALITIES[pref],
      `${pref} のエントリが存在すること`
    );
  }
  // 余計なキーが混ざっていないこと
  assert.equal(
    Object.keys(MUNICIPALITIES).length,
    PREFECTURES.length,
    "47 県ちょうど（多すぎても少なすぎても NG）"
  );
});

test("MUNICIPALITIES: 各県のリストは空でない（= おさんぽが null を返さない保証）", () => {
  for (const [pref, list] of Object.entries(MUNICIPALITIES)) {
    assert.ok(
      Array.isArray(list) && list.length > 0,
      `${pref} は 1 件以上の市区町村を持つ`
    );
  }
});

test("MUNICIPALITIES: 各要素は非空文字列", () => {
  for (const [pref, list] of Object.entries(MUNICIPALITIES)) {
    for (const m of list) {
      assert.equal(typeof m, "string", `${pref} のエントリは文字列`);
      assert.ok(m.length > 0, `${pref} に空文字のエントリが無い`);
    }
  }
});

test("MUNICIPALITIES: 政令指定都市の区分け (例: 札幌市の各区) が含まれる", () => {
  // 北海道: 札幌市の 10 区が含まれているはず
  const hokkaido = MUNICIPALITIES["北海道"];
  const sapporoWards = hokkaido.filter((m) => m.startsWith("札幌市"));
  assert.ok(sapporoWards.length >= 10, "札幌市は 10 区以上入っている");

  // 東京都: 23 区が含まれているはず
  const tokyo = MUNICIPALITIES["東京都"];
  const wards23 = tokyo.filter((m) => m.endsWith("区"));
  assert.ok(wards23.length >= 23, `東京 23 区、got ${wards23.length} 区`);
});

test("MUNICIPALITIES: 県内の市区町村に重複が無い", () => {
  for (const [pref, list] of Object.entries(MUNICIPALITIES)) {
    const unique = new Set(list);
    assert.equal(list.length, unique.size, `${pref} に重複エントリが無い`);
  }
});

// ---------- getRandomMunicipality ----------

test("getRandomMunicipality: 存在する県は必ずそのリストのどれかを返す", () => {
  const originalRandom = Math.random;
  try {
    // 0.5 に固定 → 中央付近のインデックスを選ぶ
    Math.random = () => 0.5;
    const m = getRandomMunicipality("東京都");
    assert.ok(m !== null);
    assert.ok(MUNICIPALITIES["東京都"].includes(m as string));

    // 0 に固定 → 先頭
    Math.random = () => 0;
    assert.equal(getRandomMunicipality("東京都"), MUNICIPALITIES["東京都"][0]);

    // 0.9999... に固定 → 末尾 (floor で length-1)
    Math.random = () => 1 - Number.EPSILON;
    const last = MUNICIPALITIES["東京都"][MUNICIPALITIES["東京都"].length - 1];
    assert.equal(getRandomMunicipality("東京都"), last);
  } finally {
    Math.random = originalRandom;
  }
});

test("getRandomMunicipality: 存在しない県は null", () => {
  assert.equal(getRandomMunicipality("XX県"), null);
  assert.equal(getRandomMunicipality(""), null);
  assert.equal(getRandomMunicipality("Tokyo"), null);
});

test("getRandomMunicipality: 47 県すべて null を返さない（おさんぽの頑健性）", () => {
  const originalRandom = Math.random;
  try {
    Math.random = () => 0;
    for (const pref of PREFECTURES) {
      const m = getRandomMunicipality(pref);
      assert.ok(m !== null, `${pref} で null が返る`);
    }
  } finally {
    Math.random = originalRandom;
  }
});
