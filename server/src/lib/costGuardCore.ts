/**
 * 原価の守り（純粋ロジック・外部 I/O なし）。
 *
 * 正本: ai-generic-rules/docs/policies/COST_SAFETY_POLICY.md
 *   - L1 止めるスイッチ（env 1つで有料呼び出しを全停止）
 *   - L2 日次予算の予約（呼ぶ「前」に原子的に積む・fail-closed）
 *   - L4 IP ごとの上限（fail-closed）
 * 見本: kimitolink-linktree/lib/server/ouen/budget.ts の reserveMilli を写したもの。
 *
 * ★なぜ要るか（2026-10-19 監査）:
 *   /api/yukkuri-explain(-tweet) は未ログインで叩ける公開 API で、
 *   任意のハンドル・ツイートを渡すたびに X API（有料）と有料 LLM を呼んでいた。
 *   「あなたを〇〇に例えると」系の診断サイトが X 取得＋AI 分析で
 *   1日1万円を溶かした実例と同じ形。
 *
 * このファイルは `server-only` を import しない（node --test から直接読むため）。
 * Upstash への配線は `costGuard.ts` 側。
 */

/** 予約カウンタの最小インタフェース（Upstash Redis / テスト用の偽物の両方が満たす）。 */
export type CounterStore = {
  incrby(key: string, n: number): Promise<number>;
  decrby(key: string, n: number): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
};

/**
 * 1回あたりの原価の見積り（ミリドル = 1/1000 USD）。
 *
 * ★数字は提案（公開価格から安全側に丸めた値。実測で見直す）:
 *   - X API 従量課金: ユーザー1件の読み取り ≈ $0.010、ポスト1件の読み取り ≈ $0.005
 *   - claude-3-5-haiku: 入力 ~1,500 tok + 出力 380 tok ≈ $0.003（gpt-4o-mini はさらに安い）
 *   - `:free` モデル・自前の Ollama は 0（予算に数えない）
 * ★見積りと上限は同じファイルから導く（budget.ts の教訓: 別々に置くと「必ず拒否」になる）。
 */
export const COST_MILLI = {
  /** /2/users/by/username/:handle（1ユーザー） */
  xUserLookup: 10,
  /** /2/users/:id/tweets?max_results=10（10ポスト） */
  xTimeline10: 50,
  /** /2/tweets/:id + expansions=author_id（1ポスト + 1ユーザー） */
  xTweetWithAuthor: 15,
  /** 有料 LLM 1回（max_tokens 380） */
  paidLlmCall: 3,
} as const;

/** 最も高い1操作（ハンドル解説の X 部分）。日次予算はこれ以上でないと1件も通らない。 */
export const MAX_SINGLE_OPERATION_MILLI = COST_MILLI.xUserLookup + COST_MILLI.xTimeline10;

/**
 * 匿名の入口の日次予算（ミリドル）。既定 $3/日 ≈ 450円/日。
 * ★提案値。新規のハンドル解説 1件 ≈ X 60 + LLM 3 = 63 ミリドル なので、1日 約47件ぶん。
 *   キャッシュに当たった分は 0 円なので、この枠は「新しい名前・新しい投稿」の数にだけ効く。
 */
export const DEFAULT_ANON_DAILY_BUDGET_MILLI = 3000;

/** IP ごとの上限（キャッシュに当たらなかった呼び出しだけ数える）。既定 1時間 10回。 */
export const DEFAULT_IP_LIMIT_PER_HOUR = 10;

export type BudgetPool = "anon";

export type ReserveResult =
  | { ok: true; reservedMilli: number; usedMilli: number; limitMilli: number }
  | { ok: false; reason: "budget_exhausted"; usedMilli: number; limitMilli: number }
  | { ok: false; reason: "unavailable" };

export type RateLimitResult =
  | { ok: true; count: number; limit: number }
  | { ok: false; reason: "rate_limited"; count: number; limit: number }
  | { ok: false; reason: "unavailable" };

/**
 * env から非負整数の上限を読む。
 * - 未設定・空 → fallback
 * - ★数値として読めない・負数・小数 → null（＝止める。既定値に黙って落とさない）
 */
export function readNonNegativeIntEnv(
  raw: string | undefined,
  fallback: number
): number | null {
  if (raw === undefined || raw === null || raw.trim() === "") return fallback;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  return n;
}

/**
 * キルスイッチ（L1）。`PAID_CALLS_DISABLED=1|true|yes|on` で X と有料 LLM を全停止する。
 * ★コードの定数ではなく env にする（コミット＋デプロイが要るスイッチはスイッチではない）。
 */
export function isFlagOn(raw: string | undefined): boolean {
  if (!raw) return false;
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

/** `:free` で終わるモデルは原価 0（ただし可用性は保証されない）。 */
export function isPaidModel(model: string): boolean {
  return !/:free$/i.test(model.trim());
}

/** 無料モデルを先に、有料モデルを後ろに並べ替える（同じ種類の中の順序は保つ）。 */
export function orderModelsFreeFirst(models: readonly string[]): string[] {
  return [...models.filter((m) => !isPaidModel(m)), ...models.filter(isPaidModel)];
}

/** UTC の日付キー（YYYY-MM-DD）。 */
export function utcDateKey(at: Date): string {
  return at.toISOString().slice(0, 10);
}

export function budgetKey(pool: BudgetPool, at: Date): string {
  return `costguard:yukkuri:budget:${pool}:${utcDateKey(at)}`;
}

/**
 * 予算の予約（L2・fail-closed）。
 * ★INCRBY で先に積んでから判定し、超えていたら DECRBY で戻す（原子的。同時に2人来ても両方は通らない）。
 * ★呼んだ後に失敗しても戻さない（課金済みかもしれないので、多く数える側に倒す）。
 * ★store が無い・上限が読めない・store が例外 → { ok:false, reason:"unavailable" }（呼ばない）。
 */
export async function reserveMilli(
  store: CounterStore | null,
  opts: { pool: BudgetPool; costMilli: number; limitMilli: number | null; at?: Date }
): Promise<ReserveResult> {
  const { pool, costMilli, limitMilli } = opts;
  if (limitMilli === null) return { ok: false, reason: "unavailable" };
  if (!Number.isFinite(costMilli) || costMilli <= 0) return { ok: false, reason: "unavailable" };
  if (!store) return { ok: false, reason: "unavailable" };

  const key = budgetKey(pool, opts.at ?? new Date());
  let after: number;
  try {
    after = Number(await store.incrby(key, costMilli));
    if (!Number.isFinite(after)) return { ok: false, reason: "unavailable" };
    // 初回だけ TTL。★14日残す（見直しのときに実際の消費を読むため）。
    if (after === costMilli) await store.expire(key, 14 * 24 * 60 * 60);
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  if (after > limitMilli) {
    try {
      await store.decrby(key, costMilli);
    } catch {
      // 戻せなくても止めるのが正しい（多く数える側に倒す）。
    }
    return { ok: false, reason: "budget_exhausted", usedMilli: after - costMilli, limitMilli };
  }
  return { ok: true, reservedMilli: costMilli, usedMilli: after, limitMilli };
}

/**
 * IP ごとの上限（L4・fail-closed）。固定窓（既定 1時間）で INCR して数える。
 * ★store が無い・例外・上限が読めない → 通さない。
 */
export async function checkRateLimit(
  store: CounterStore | null,
  opts: { scope: string; ip: string; limit: number | null; windowSec?: number; at?: Date }
): Promise<RateLimitResult> {
  const { scope, ip, limit } = opts;
  const windowSec = opts.windowSec ?? 3600;
  if (limit === null) return { ok: false, reason: "unavailable" };
  if (!store) return { ok: false, reason: "unavailable" };
  const nowSec = Math.floor((opts.at ?? new Date()).getTime() / 1000);
  const bucket = Math.floor(nowSec / windowSec);
  const key = `costguard:yukkuri:rl:${scope}:${ip || "unknown"}:${bucket}`;
  let count: number;
  try {
    count = Number(await store.incrby(key, 1));
    if (!Number.isFinite(count)) return { ok: false, reason: "unavailable" };
    if (count === 1) await store.expire(key, windowSec + 60);
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  if (count > limit) return { ok: false, reason: "rate_limited", count, limit };
  return { ok: true, count, limit };
}

/**
 * X のハンドルとして正しい形か（英数字と _ の 1〜15 文字）。
 * ★形が正しくないものは X に問い合わせる前に弾く（存在しえない名前に払わない）。
 */
export function isValidXHandle(handle: string): boolean {
  return /^[A-Za-z0-9_]{1,15}$/.test(handle);
}

/** 利用者向けの文言（L6: 正直に。未取得を「解説できた」と見せない）。 */
export const COST_GUARD_MESSAGES = {
  budgetExhausted:
    "本日の無料枠が終了しました。すでに解説済みのアカウント・投稿は引き続き見られます。新しい解説は明日またお試しください。",
  rateLimited:
    "短時間に続けて解説できる回数を超えました。1時間ほど空けてからもう一度お試しください。",
  disabled:
    "新しい解説は現在一時停止しています。すでに解説済みのアカウント・投稿は引き続き見られます。",
  unavailable:
    "利用回数を確認できなかったため、新しい解説を止めています。少し時間をおいてお試しください。",
} as const;

export type CostGuardDenial = "budget_exhausted" | "rate_limited" | "disabled" | "unavailable";

/** 拒否理由 → HTTP ステータス・error_code・文言。 */
export function denialResponse(
  reason: CostGuardDenial,
  prefix: "E_YUKKURI" | "E_TWEET_EXPLAIN"
): { status: number; body: { error: string; error_code: string } } {
  switch (reason) {
    case "budget_exhausted":
      return {
        status: 429,
        body: { error: COST_GUARD_MESSAGES.budgetExhausted, error_code: `${prefix}_BUDGET_EXHAUSTED` },
      };
    case "rate_limited":
      return {
        status: 429,
        body: { error: COST_GUARD_MESSAGES.rateLimited, error_code: `${prefix}_RATE_LIMITED` },
      };
    case "disabled":
      return {
        status: 503,
        body: { error: COST_GUARD_MESSAGES.disabled, error_code: `${prefix}_PAID_DISABLED` },
      };
    case "unavailable":
    default:
      return {
        status: 503,
        body: { error: COST_GUARD_MESSAGES.unavailable, error_code: `${prefix}_GUARD_UNAVAILABLE` },
      };
  }
}
