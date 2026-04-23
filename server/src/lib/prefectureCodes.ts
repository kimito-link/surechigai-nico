/**
 * 都道府県コード（JIS X 0401）ヘルパ。
 *
 * - 01 = 北海道, 02 = 青森県, ... , 47 = 沖縄県
 * - DB 側 users.home_prefecture / API 境界では **"01".."47" の 0 パディング文字列**で保持する。
 *   整数 ("1" 〜 "47") ではなく文字列に固定する理由:
 *     - JSON にしたときの型揺れ（number / string）を避ける
 *     - 先頭ゼロの都道府県（01〜09）を 1 桁に縮めないで済む
 *     - URL パラメータや CSV ダンプでそのまま扱える
 *
 * 表示名は `server/src/lib/prefectureCoords.ts` の `PREFECTURES` 配列と一致させている。
 * 名前の重複（例: 京都府と京都市）を避けるため、一覧はここでは再定義せず、
 * 名前→コード変換は `prefectureCoords.ts` に同居させてもよかったが、
 *   - `prefectureCoords.ts` は緯度経度用途で読み込まれがち
 *   - コード変換は「LP 以外の API / ユニットテスト」でも使う
 * という理由で別ファイルに切り出している。
 *
 * CODEX-NEXT.md §1 「参加県と公開範囲」対応。
 */

/** 正規表現: 01 〜 47 の 0 パディング文字列のみ許容。 */
export const PREFECTURE_CODE_PATTERN = /^(0[1-9]|[1-3][0-9]|4[0-7])$/;

/**
 * コードが "01".."47" のフォーマットに合致するかだけを見る軽量バリデータ。
 * API 入力は基本これで十分。名前→コード逆引きが必要な場合は
 * `prefectureCodeToName` 側で null を見て弾く。
 */
export function isValidPrefectureCode(code: unknown): code is string {
  return typeof code === "string" && PREFECTURE_CODE_PATTERN.test(code);
}

/**
 * 01..47 のインデックス順に都道府県名を並べた配列。
 * `PREFECTURE_NAMES[0] = "北海道"`, `PREFECTURE_NAMES[12] = "東京都"` など。
 * この順序は JIS X 0401 規格順序に準拠し、`prefectureCoords.ts` の `PREFECTURES` と一致している。
 */
export const PREFECTURE_NAMES: readonly string[] = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

/**
 * コード "01".."47" → 都道府県名。不正コードは null。
 * 呼び出し側でフォーマット済み（ゼロパディング文字列）を渡す前提。
 */
export function prefectureCodeToName(code: string | null | undefined): string | null {
  if (!isValidPrefectureCode(code)) return null;
  const index = Number.parseInt(code, 10) - 1;
  return PREFECTURE_NAMES[index] ?? null;
}

/**
 * 都道府県名（"東京都" / "大阪府" / "北海道" など）→ "01".."47" コード。
 * 不完全一致（"東京"）は受け付けず null。必要なら呼び出し側で補正する。
 */
export function prefectureNameToCode(name: string | null | undefined): string | null {
  if (!name || typeof name !== "string") return null;
  const index = PREFECTURE_NAMES.indexOf(name);
  if (index < 0) return null;
  const code = String(index + 1).padStart(2, "0");
  return code;
}
