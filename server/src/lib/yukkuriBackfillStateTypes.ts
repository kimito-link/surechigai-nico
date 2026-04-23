/**
 * `yukkuriBackfillState.ts` の型と型ガード。
 *
 * `yukkuriBackfillState.ts` 本体は `import "server-only"` で Upstash Redis を叩く
 * サーバー専用モジュール。テスト（node --test）からは server-only の import が
 * throw するため直接 import できない。
 *
 * 型と型ガードだけ別ファイルに切り出すことで:
 *   - 単体テストから import 可能になる
 *   - もし将来的に Client Component が型を参照したくなっても壊れない
 *   - server-only 本体は IO 専用になり責務が分かれる
 */

export type BackfillRunState = {
  /** この実行が完了（または中断）した時点の ISO タイムスタンプ */
  at: string;
  /** 全件ループを正常に回り切ったか（token_invalid 等で途中中断したら false） */
  ok: boolean;
  /** SELECT で取得した総行数 */
  total: number;
  /** X API から取得できて DB に UPDATE した行数（dryRun では will_update 相当） */
  updated: number;
  /** no_change + skipped_empty */
  skipped: number;
  /** X API fetch 失敗（401/403 abort 含む） */
  failed: number;
  /** 途中中断した理由（"token_invalid" 等）。正常終了なら null */
  aborted: string | null;
  /** 失敗時の短いメッセージ（200 文字まで）。正常終了なら null */
  error: string | null;
  /** 処理にかかった時間（ms） */
  durationMs: number;
  /** dryRun フラグ（= true なら DB は変更されていない） */
  dryRun: boolean;
};

/**
 * 型ガード: Redis から読み出した不明値が BackfillRunState として読めるか。
 *
 * /api/health/yukkuri が Redis の JSON をそのまま返す前の防波堤。
 * 配列は object 扱いでも全フィールド判定で落ちるので reject される。
 */
export function isBackfillRunState(v: unknown): v is BackfillRunState {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.at === "string" &&
    typeof r.ok === "boolean" &&
    typeof r.total === "number" &&
    typeof r.updated === "number" &&
    typeof r.skipped === "number" &&
    typeof r.failed === "number" &&
    (r.aborted === null || typeof r.aborted === "string") &&
    (r.error === null || typeof r.error === "string") &&
    typeof r.durationMs === "number" &&
    typeof r.dryRun === "boolean"
  );
}
