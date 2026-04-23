import "server-only";
import { isBackfillRunState, type BackfillRunState } from "./yukkuriBackfillStateTypes";

/**
 * yukkuri プロフィール backfill の「最後に走った実行結果」を Upstash Redis に保存する。
 *
 * なぜ Redis か:
 * - DB に 1 行しかないメタ情報を置くために専用テーブルを作るのは大げさ。
 * - Vercel Cron → /api/admin/yukkuri-backfill の実行結果を、他の Vercel Function
 *   （/api/health/yukkuri / /api/admin/health/yukkuri）から軽量に参照したい。
 * - Upstash REST はこの repo の他の場所（yukkuri-explain route / homeStats / liveMapBus）
 *   と同じ使い方で、認証・TLS 設定を追加で考える必要が無い。
 *
 * TTL:
 * - 30 日。「直近の backfill は 30 日以上前」という事実自体がアラート材料（Cron が壊れている）
 *   になるため、無限 TTL にはしない。
 *
 * 型と型ガードは `yukkuriBackfillStateTypes.ts` に切り出してある（`server-only`
 * の制約でテストから直接 import できないため）。ここは IO 専用。
 */
const KEY = "yukkuri:backfill:last";
const TTL_SECONDS = 30 * 24 * 60 * 60;

// 呼び出し側の既存 import を壊さないため re-export しておく。
export type { BackfillRunState };
export { isBackfillRunState };

/**
 * backfill 実行結果を Redis に上書き保存する。
 * Redis 未設定、書き込み失敗は握りつぶす（backfill 本処理の失敗扱いにしない）。
 * dryRun は記録しない（実運用の最終実行時刻を汚さないため）。
 */
export async function recordBackfillRun(state: BackfillRunState): Promise<void> {
  if (state.dryRun) return;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["SET", KEY, JSON.stringify(state), "EX", TTL_SECONDS],
      ]),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Redis 書き込みは best-effort。失敗時は黙る。
  }
}

/**
 * 直近の backfill 実行結果を Redis から読み出す。
 * 未設定・未読込・破損 JSON はすべて null を返す（health 側で null を「未知」として扱う）。
 */
export async function loadLastBackfillRun(): Promise<BackfillRunState | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(KEY)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string | null };
    if (!data.result) return null;
    const parsed = JSON.parse(data.result);
    if (!isBackfillRunState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
