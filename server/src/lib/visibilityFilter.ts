/**
 * CODEX-NEXT.md §1 の `location_visibility` フィルタに関する純粋ヘルパー。
 *
 * `creators.ts` は先頭で `import "server-only"` しているため、
 * 単体テスト（node --test + tsx）から直接 import できない。
 * ここは DB を触らないロジックだけを切り出して、
 *   - `creators.ts` から re-export して既存の `@/lib/creators` 経路を壊さない
 *   - `server/tests/visibilityFilter.test.ts` から直接 import してリグレッション防止
 * の両立を狙う。
 *
 * どちらも opt-in。既存挙動（フィルタなし）は必ず維持する。
 */

/**
 * `?visibilityMin=0|1|2` 相当のクエリ入力を受けるオプション。
 * - 0（= `undefined`）: フィルタなし。ヒーローの総登録者数表示用。
 * - 1: `location_visibility >= 1` のユーザーのみ（マッチ相手向け）
 * - 2: `location_visibility >= 2` のユーザーのみ（全体公開、ヒーロー地図ピン）
 */
export type PrefectureQueryOptions = {
  visibilityMin?: 0 | 1 | 2;
};

/**
 * visibility フィルタを SQL 断片に変換する。
 * SQL は必ず `AND u.location_visibility >= ?` の形で、呼び出し側は
 * `users u` にエイリアスを当てている前提（`creators.ts` の既存パターン）。
 *
 * - `undefined` / `0` / 負値: 空 SQL / 空 params（＝フィルタなし）
 * - `1`: `[1]` を束縛
 * - `2` 以上（誤値含む）: `[2]` にクランプ（過剰に公開しないための安全側）
 */
export function buildVisibilityClause(
  visibilityMin: number | undefined
): { sql: string; params: number[] } {
  if (!visibilityMin || visibilityMin < 1) return { sql: "", params: [] };
  const v = visibilityMin >= 2 ? 2 : 1;
  return { sql: " AND u.location_visibility >= ?", params: [v] };
}

/**
 * `URLSearchParams.get("visibilityMin")` の戻り値を安全に 0|1|2|undefined に落とす。
 *
 * - 未指定 / 空文字 / 不正値 → `undefined`（＝フィルタしない）
 * - `"0"` も「明示的にフィルタしない」意図として `undefined`
 *   （`0` と `undefined` を内部で同義に扱うことで、呼び出し側の if 分岐を 1 本に減らす）
 * - 整数以外（`"1.5"` / `"abc"` / `"NaN"`）も `undefined`
 *
 * `Number(" 2 ")` のように前後空白は `Number()` が許すので `2` として通る点は
 * URLSearchParams からは発生しない（`decodeURIComponent` 経由）が、意図的挙動として
 * テストで lock している。
 */
export function parseVisibilityMin(
  raw: string | null | undefined
): 0 | 1 | 2 | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n)) return undefined;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return undefined;
}
