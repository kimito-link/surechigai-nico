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

async function runBackfill(req: NextRequest, dryRun: boolean) {
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

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") != null;
  if (!isVercelCron) {
    const unauth = requireAdminAuth(req);
    if (unauth) return unauth;
  }
  const isCron = req.nextUrl.searchParams.get("cron") === "1";
  return runBackfill(req, /* dryRun */ !isCron);
}

export async function POST(req: NextRequest) {
  const unauth = requireAdminAuth(req);
  if (unauth) return unauth;
  const sp = req.nextUrl.searchParams;
  const dryRun = sp.get("dryRun") === "1";
  return runBackfill(req, dryRun);
}
