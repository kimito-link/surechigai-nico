/**
 * X API 従量課金（Pay-Per-Use）の「1 日あたり支出ガード」の純粋ロジック。
 *
 * 背景:
 * - 2026-11-22 以降、`expansions` で `includes` に同梱されたオブジェクトも通常単価で課金される。
 *   例: `GET /2/tweets/:id?expansions=author_id` は post 1 件 + user 1 件 = 約 $0.015。
 * - 公開 API（未ログインで叩ける `/api/yukkuri-explain*`）なので、1 つの IP / bot が
 *   連打すると請求が青天井になる。そこで「全体」と「クライアント単位」の日次上限を持つ。
 *
 * 単位:
 * - 金額は整数の「mill（= $0.001）」で扱う（浮動小数点の誤差を避けるため）。
 *   user read $0.010 = 10 mill / post read $0.005 = 5 mill。
 *
 * このファイルは `server-only` を import しない（node --test から直接テストするため）。
 * Redis 実装は `xApiBudget.ts` 側。
 */

/** X API の単価（mill = $0.001）。オーナーの他プロダクトと同じ前提値。 */
export const X_API_PRICE_MILLS = {
  userRead: 10,
  postRead: 5,
} as const;

export type XApiBilled = { posts: number; users: number };

/** 返ってきたオブジェクト数（data + includes）から推定コストを出す。 */
export function estimateXApiCostMills(billed: XApiBilled): number {
  const posts = Math.max(0, Math.floor(billed.posts));
  const users = Math.max(0, Math.floor(billed.users));
  return posts * X_API_PRICE_MILLS.postRead + users * X_API_PRICE_MILLS.userRead;
}

export function millsToUsd(mills: number): number {
  return Math.round(mills) / 1000;
}

export type XApiBudgetConfig = {
  enabled: boolean;
  /** 全クライアント合計の 1 日上限（mill） */
  globalDailyMills: number;
  /** 1 クライアント（IP ハッシュ等）あたりの 1 日上限（mill） */
  perClientDailyMills: number;
};

/**
 * 既定値（環境変数未設定時）。コードから見た 1 回あたりの最大コスト:
 * - ハンドル解説（未キャッシュ）: user $0.010 + タイムライン最大 10 posts $0.050 = 約 $0.060
 * - ハンドル解説（解説キャッシュ + プロフィールキャッシュ hit）: $0
 * - ツイート解説: $0.015（投稿者キャッシュ hit なら $0.005）
 * - backfill Cron: 100 users × 3 回/日 = 約 $3/日
 *
 * - 全体 $30/日: 未キャッシュのハンドル解説 約 450 件/日 + Cron 分。
 * - 1 クライアント（既定は無制限）: $3/日 にすると未キャッシュのハンドル解説で約 50 件、ツイート解説で約 200 件。
 *   会場 Wi-Fi など同一 IP に多人数がいる場面では足りない可能性があるので、
 *   イベント当日は `X_API_DAILY_BUDGET_PER_CLIENT_USD` を上げるか 0（無制限）にする。
 */
export const DEFAULT_GLOBAL_DAILY_USD = 30;
export const DEFAULT_PER_CLIENT_DAILY_USD = 0;

function parseUsd(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

/**
 * 環境変数から設定を作る。
 * - `X_API_SPEND_GUARD`: `off` / `0` / `false` で無効化（既定は有効）
 * - `X_API_DAILY_BUDGET_USD`: 全体上限（既定 30）。0 は「上限なし」
 * - `X_API_DAILY_BUDGET_PER_CLIENT_USD`: クライアント上限（既定 0＝上限なし。会場 Wi-Fi など同一 IP に多人数がいるため）。0 は「上限なし」
 */
export function parseXApiBudgetConfig(
  env: Record<string, string | undefined>
): XApiBudgetConfig {
  const flag = (env.X_API_SPEND_GUARD ?? "").trim().toLowerCase();
  const enabled = !(flag === "off" || flag === "0" || flag === "false");
  return {
    enabled,
    globalDailyMills: Math.round(
      parseUsd(env.X_API_DAILY_BUDGET_USD, DEFAULT_GLOBAL_DAILY_USD) * 1000
    ),
    perClientDailyMills: Math.round(
      parseUsd(env.X_API_DAILY_BUDGET_PER_CLIENT_USD, DEFAULT_PER_CLIENT_DAILY_USD) * 1000
    ),
  };
}

/** 課金日の区切りは UTC 0 時（X の請求に合わせる）。 */
export function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function nextUtcMidnight(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
}

export function spendKeys(now: Date, clientKey: string | null): {
  global: string;
  client: string | null;
} {
  const day = utcDayKey(now);
  return {
    global: `xapi:spend:${day}:global`,
    client: clientKey ? `xapi:spend:${day}:c:${clientKey}` : null,
  };
}

/** キーの寿命。日付境界をまたいでも health で前日分を見られるよう 2 日。 */
export const SPEND_KEY_TTL_SEC = 2 * 24 * 60 * 60;

export type LimitReason = "x_api_daily_budget_global" | "x_api_daily_budget_client";

export type BudgetDecision =
  | { ok: true }
  | { ok: false; reason: LimitReason };

/**
 * 「加算後の合計」で判定する（予約方式）。上限 0 は無制限。
 * client を先に見る（global より先に bot 単体を止めたいので理由もそちらを優先）。
 */
export function evaluateBudget(args: {
  globalTotalAfter: number;
  clientTotalAfter: number | null;
  config: XApiBudgetConfig;
}): BudgetDecision {
  const { config } = args;
  if (!config.enabled) return { ok: true };
  if (
    config.perClientDailyMills > 0 &&
    args.clientTotalAfter != null &&
    args.clientTotalAfter > config.perClientDailyMills
  ) {
    return { ok: false, reason: "x_api_daily_budget_client" };
  }
  if (config.globalDailyMills > 0 && args.globalTotalAfter > config.globalDailyMills) {
    return { ok: false, reason: "x_api_daily_budget_global" };
  }
  return { ok: true };
}

/** 支出カウンタのストア。Redis 実装とメモリ実装を差し替えられるようにする。 */
export interface SpendStore {
  /** 各キーに amount を加算し、加算後の値を同じ順序で返す。 */
  incrBy(entries: Array<{ key: string; amount: number; ttlSec: number }>): Promise<number[]>;
  get(key: string): Promise<number>;
}

/** インスタンス内メモリのストア（Redis 未設定 / 障害時のフォールバック、テスト用）。 */
export function createMemorySpendStore(nowMs: () => number = Date.now): SpendStore {
  const map = new Map<string, { value: number; expiresAt: number }>();
  const read = (key: string): number => {
    const hit = map.get(key);
    if (!hit) return 0;
    if (hit.expiresAt <= nowMs()) {
      map.delete(key);
      return 0;
    }
    return hit.value;
  };
  return {
    async incrBy(entries) {
      return entries.map(({ key, amount, ttlSec }) => {
        const next = read(key) + amount;
        map.set(key, { value: next, expiresAt: nowMs() + ttlSec * 1000 });
        return next;
      });
    },
    async get(key) {
      return read(key);
    },
  };
}

export type SpendReservation = {
  keys: string[];
  amount: number;
};

export type ReserveResult =
  | { ok: true; reservation: SpendReservation | null }
  | { ok: false; reason: LimitReason; resetAt: string };

/**
 * 呼び出し前に推定コストを「予約」する。
 * 上限超過なら加算を巻き戻して拒否する。ストアが落ちていたら fail-open（体験を止めない）。
 */
export async function reserveSpend(args: {
  store: SpendStore;
  config: XApiBudgetConfig;
  clientKey: string | null;
  amountMills: number;
  now?: Date;
}): Promise<ReserveResult> {
  const { store, config } = args;
  const now = args.now ?? new Date();
  if (!config.enabled || args.amountMills <= 0) {
    return { ok: true, reservation: null };
  }
  const keys = spendKeys(now, args.clientKey);
  const entries = [{ key: keys.global, amount: args.amountMills, ttlSec: SPEND_KEY_TTL_SEC }];
  if (keys.client) {
    entries.push({ key: keys.client, amount: args.amountMills, ttlSec: SPEND_KEY_TTL_SEC });
  }
  let totals: number[];
  try {
    totals = await store.incrBy(entries);
  } catch {
    return { ok: true, reservation: null };
  }
  const decision = evaluateBudget({
    globalTotalAfter: totals[0] ?? 0,
    clientTotalAfter: keys.client ? (totals[1] ?? 0) : null,
    config,
  });
  const reservation: SpendReservation = {
    keys: entries.map((e) => e.key),
    amount: args.amountMills,
  };
  if (!decision.ok) {
    await settleSpend({ store, reservation, actualMills: 0 });
    return { ok: false, reason: decision.reason, resetAt: nextUtcMidnight(now).toISOString() };
  }
  return { ok: true, reservation };
}

/**
 * 予約額と実額の差分を精算する（失敗で 0 件しか返らなかった / 返却件数が少なかった等）。
 * 失敗しても例外は投げない。
 */
export async function settleSpend(args: {
  store: SpendStore;
  reservation: SpendReservation | null;
  actualMills: number;
}): Promise<void> {
  const { reservation } = args;
  if (!reservation) return;
  const delta = Math.max(0, Math.round(args.actualMills)) - reservation.amount;
  if (delta === 0) return;
  try {
    await args.store.incrBy(
      reservation.keys.map((key) => ({ key, amount: delta, ttlSec: SPEND_KEY_TTL_SEC }))
    );
  } catch {
    /* 精算失敗は無視（カウンタが多少ずれるだけ） */
  }
}

/**
 * 上限到達時にクライアントへ返す JSON（将来の有料プラン導線のフック）。
 * `limit.reason` を見て UI が「明日また来てね / プランを見る」等を出し分けられる。
 */
export function buildLimitReachedBody(args: {
  errorCode: string;
  reason: LimitReason;
  resetAt: string;
}): {
  error: string;
  error_code: string;
  limit: { reason: LimitReason; scope: "client" | "global"; resetAt: string; upgradeAvailable: false };
} {
  const scope = args.reason === "x_api_daily_budget_client" ? "client" : "global";
  return {
    error:
      scope === "client"
        ? "本日の解説回数の上限に達しました。日本時間の朝 9 時（UTC 0 時）以降にもう一度お試しください。"
        : "本日はアクセスが集中しており、解説の受付を一時停止しています。日本時間の朝 9 時以降に再開します。",
    error_code: args.errorCode,
    limit: { reason: args.reason, scope, resetAt: args.resetAt, upgradeAvailable: false },
  };
}
