import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAdminAuth } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * 既存 `yukkuri_explained` の `display_name` / `avatar_url` を X API で再取得する
 * バックフィル用 admin API。
 *
 * なぜ API にしたか:
 * - `scripts/backfill-yukkuri-profiles.mjs` は同じ仕事をローカルで回せるが、
 *   `TWITTER_BEARER_TOKEN` をローカル `.env*` に持たせる必要がある。
 * - 本番 Vercel 環境変数だけが「X API が通るトークン」を持っている実情があるため、
 *   Vercel ランタイムでそのまま走らせて、結果だけ JSON で返すのが一番安全。
 *
 * 認証:
 * - 既存の Basic 認証（ADMIN_USER / ADMIN_PASS）を再利用。
 * - Clerk は通さない（middleware の isUnprotectedApiPath に追加してバイパス）。
 *
 * 挙動:
 * - `GET`  : ドライラン（DB は変更しない）。レート上限で弾かれても安全に結果が返る。
 * - `POST` : 実行。`UPDATE yukkuri_explained SET display_name, avatar_url` を反映。
 * - 共通クエリ:
 *   - `?limit=N`  : 1リクエストで処理する行数の上限（既定 50、最大 200）
 *   - `?waitMs=M` : X API 呼び出し間のスリープ（既定 1500ms）
 *
 * X API のレート上限や 300 秒の maxDuration を超えそうな件数は、
 * 何度か叩いて分割処理する前提。UPDATE 済みの行は `no_change` で即 skip される。
 */
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_WAIT_MS = 1500;

type Row = RowDataPacket & {
  x_handle: string;
  display_name: string | null;
  avatar_url: string | null;
};

type XProfile = {
  displayName: string | null;
  avatarUrl: string | null;
};

type FetchResult =
  | { ok: true; profile: XProfile }
  | { ok: false; status: number; error?: string };

function normalizeXAvatarUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  // VOICEVOX/アーカイブ側は _400x400 を想定。
  return trimmed.replace("_normal.", "_400x400.");
}

async function fetchXProfile(
  handle: string,
  bearerToken: string
): Promise<FetchResult> {
  const url = `https://api.twitter.com/2/users/by/username/${encodeURIComponent(
    handle
  )}?user.fields=name,description,public_metrics,profile_image_url`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    const data = (await res.json()) as {
      data?: { name?: string; profile_image_url?: string };
    };
    const user = data.data;
    if (!user) return { ok: false, status: 200, error: "empty_user" };
    const displayName =
      typeof user.name === "string" && user.name.trim().length > 0
        ? user.name.trim().slice(0, 200)
        : null;
    const avatarUrl = normalizeXAvatarUrl(user.profile_image_url);
    return { ok: true, profile: { displayName, avatarUrl } };
  } catch (err) {
    return { ok: false, status: 0, error: (err as Error).message };
  }
}

/** MySQL 名前付きロックキー。Cron/手動/API の多重起動を防ぐ。 */
const BACKFILL_LOCK_NAME = "yukkuri_backfill";

async function runBackfill(req: NextRequest, dryRun: boolean) {
  // 同時実行ロック取得（0秒タイムアウト = 既に保持されていれば即失敗）
  // pool.getConnection() で 1 本占有し、GET_LOCK → 本処理 → RELEASE_LOCK。
  // セッション紐付きの advisory lock なので、このリクエストが異常終了しても
  // 物理コネクション解放時に MySQL 側で自動解放される。
  let lockConn: Awaited<ReturnType<typeof pool.getConnection>> | null = null;
  let lockAcquired = false;
  try {
    lockConn = await pool.getConnection();
    const [lockRows] = await lockConn.query<RowDataPacket[]>(
      `SELECT GET_LOCK(?, 0) AS got`,
      [BACKFILL_LOCK_NAME]
    );
    lockAcquired = Number(lockRows[0]?.got ?? 0) === 1;
    if (!lockAcquired) {
      lockConn.release();
      lockConn = null;
      return NextResponse.json(
        {
          ok: false,
          error:
            "バックフィルは別プロセスが実行中です。完了後にもう一度実行してください。",
        },
        { status: 409 }
      );
    }
  } catch (err) {
    // ロック取得そのものが失敗した場合は conn を解放しつつベストエフォートで続行。
    // ロック無しでも整合性は崩れない（UPSERT は冪等）。ロギングだけ残す。
    console.warn(
      "[yukkuri-backfill] GET_LOCK acquisition failed; continuing without lock",
      (err as Error)?.message
    );
    if (lockConn) {
      try {
        lockConn.release();
      } catch {
        /* ignore */
      }
      lockConn = null;
    }
  }

  try {
    return await runBackfillCore(req, dryRun);
  } finally {
    if (lockAcquired && lockConn) {
      try {
        await lockConn.query(`SELECT RELEASE_LOCK(?)`, [BACKFILL_LOCK_NAME]);
      } catch (err) {
        console.warn(
          "[yukkuri-backfill] RELEASE_LOCK failed",
          (err as Error)?.message
        );
      }
    }
    if (lockConn) {
      try {
        lockConn.release();
      } catch {
        /* ignore */
      }
    }
  }
}

async function runBackfillCore(req: NextRequest, dryRun: boolean) {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN?.trim();
  if (!bearerToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "TWITTER_BEARER_TOKEN が未設定です（Vercel の環境変数を確認）",
      },
      { status: 503 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const limitRaw = Number.parseInt(sp.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(MAX_LIMIT, Math.max(1, limitRaw))
    : DEFAULT_LIMIT;
  const waitRaw = Number.parseInt(sp.get("waitMs") ?? "", 10);
  const waitMs = Number.isFinite(waitRaw)
    ? Math.min(10_000, Math.max(0, waitRaw))
    : DEFAULT_WAIT_MS;

  const [rows] = await pool.query<Row[]>(
    `SELECT x_handle, display_name, avatar_url
     FROM yukkuri_explained
     ORDER BY
       (display_name IS NULL OR avatar_url IS NULL) DESC,
       updated_at DESC
     LIMIT ?`,
    [limit]
  );

  const results: Array<{
    handle: string;
    action:
      | "updated"
      | "will_update"
      | "no_change"
      | "skipped_empty"
      | `fetch_failed_${number}`;
    from?: { name: string | null; avatar: "set" | null };
    to?: { name: string | null; avatar: "set" | null };
    error?: string;
  }> = [];
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const handle = row.x_handle.trim().replace(/^@+/, "").toLowerCase();
    if (!handle) {
      skipped += 1;
      results.push({ handle: row.x_handle, action: "skipped_empty" });
      continue;
    }

    const r = await fetchXProfile(handle, bearerToken);
    if (!r.ok) {
      failed += 1;
      results.push({
        handle,
        action: `fetch_failed_${r.status}`,
        error: r.error,
      });
      // 401/403 は Bearer Token 側の問題で、残り全件を回しても同じ結果になる。
      // レート枠と Vercel 実行時間の無駄遣いを避けるため即中断する。
      if (r.status === 401 || r.status === 403) {
        return NextResponse.json(
          {
            ok: false,
            dryRun,
            aborted: "token_invalid",
            error: `X API が ${r.status} を返しました。TWITTER_BEARER_TOKEN を確認してください（Vercel 環境変数）。`,
            total: rows.length,
            processed: i + 1,
            updated,
            skipped,
            failed,
            waitMs,
            limit,
            results,
          },
          { status: 503 }
        );
      }
      if (i < rows.length - 1 && waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      continue;
    }

    const currentName = row.display_name?.trim() || null;
    const currentAvatar = row.avatar_url?.trim() || null;
    const nextName = r.profile.displayName ?? currentName;
    const nextAvatar = r.profile.avatarUrl ?? currentAvatar;

    if (nextName === currentName && nextAvatar === currentAvatar) {
      skipped += 1;
      results.push({ handle, action: "no_change" });
      if (i < rows.length - 1 && waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      continue;
    }

    if (!dryRun) {
      await pool.execute(
        `UPDATE yukkuri_explained
         SET display_name = ?, avatar_url = ?
         WHERE x_handle = ?`,
        [nextName, nextAvatar, handle]
      );
    }
    updated += 1;
    results.push({
      handle,
      action: dryRun ? "will_update" : "updated",
      from: {
        name: currentName,
        avatar: currentAvatar ? "set" : null,
      },
      to: {
        name: nextName,
        avatar: nextAvatar ? "set" : null,
      },
    });
    if (i < rows.length - 1 && waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    total: rows.length,
    updated,
    skipped,
    failed,
    waitMs,
    limit,
    results,
  });
}

/**
 * 認証モデル:
 * - Vercel Cron: `Authorization: Bearer $CRON_SECRET` を Vercel が自動付与する公式経路。
 *   Bearer が一致した場合だけ GET で「実更新」を許可する。
 * - 手動 admin: Basic 認証（ADMIN_USER/ADMIN_PASS）を通して GET=dryRun / POST=実更新。
 *
 * `x-vercel-cron` ヘッダは Vercel 外部からでも任意に付与できる前提で扱い、
 * 単独では認証に使わない（補助情報として無視）。
 */
function hasValidCronBearer(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  if (authHeader.length !== expected.length) return false;
  // timingSafe 相当（短文字列でも一定時間にする）
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= authHeader.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export async function GET(req: NextRequest) {
  // 1) Vercel Cron（Bearer 一致）: 実更新モードで実行
  if (hasValidCronBearer(req)) {
    return runBackfill(req, /* dryRun */ false);
  }
  // 2) 手動 admin: Basic 認証 → GET は常に dryRun
  const unauth = requireAdminAuth(req);
  if (unauth) return unauth;
  return runBackfill(req, /* dryRun */ true);
}

export async function POST(req: NextRequest) {
  const unauth = requireAdminAuth(req);
  if (unauth) return unauth;
  const sp = req.nextUrl.searchParams;
  const dryRun = sp.get("dryRun") === "1";
  return runBackfill(req, dryRun);
}
