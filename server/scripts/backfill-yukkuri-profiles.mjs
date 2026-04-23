import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const WAIT_MS = 1500;
const dryRun = process.argv.includes("--dry-run");

function pick(...values) {
  return values.find((v) => typeof v === "string" && v.length > 0);
}

function parseMysqlUrl(value) {
  if (!value) return {};
  try {
    const normalized = value.startsWith("mysql://") ? value : `mysql://${value}`;
    const url = new URL(normalized);
    return {
      host: url.hostname || undefined,
      port: url.port || undefined,
      user: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      database: url.pathname ? url.pathname.replace(/^\//, "") || undefined : undefined,
    };
  } catch {
    return {};
  }
}

function pickFirstMysqlUri() {
  const candidates = [
    process.env.MYSQL_PUBLIC_URL,
    process.env.RAILWAY_MYSQL_URL,
    process.env.RAILWAY_DATABASE_URL,
    process.env.MYSQL_URL,
    process.env.DATABASE_URL,
  ];
  for (const c of candidates) {
    if (!c || typeof c !== "string") continue;
    const t = c.trim();
    if (t.startsWith("mysql://") || t.startsWith("mysql2://")) return t;
  }
  return undefined;
}

function normalizeXAvatarUrl(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.replace("_normal.", "_400x400.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchXProfile(handle, bearerToken) {
  const url = `https://api.twitter.com/2/users/by/username/${encodeURIComponent(
    handle
  )}?user.fields=name,description,public_metrics,profile_image_url`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    const data = await res.json();
    const user = data?.data;
    if (!user || typeof user !== "object") {
      return { ok: false, status: 200 };
    }
    const displayName =
      typeof user.name === "string" && user.name.trim().length > 0
        ? user.name.trim().slice(0, 200)
        : null;
    const avatarUrl = normalizeXAvatarUrl(user.profile_image_url);
    return { ok: true, displayName, avatarUrl };
  } catch (error) {
    return { ok: false, status: 0, error: (error).message };
  }
}

async function main() {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN?.trim();
  if (!bearerToken) {
    console.error("[backfill-yukkuri] TWITTER_BEARER_TOKEN が未設定です。");
    process.exit(1);
  }

  const mysqlUri = pickFirstMysqlUri();
  const parsed = parseMysqlUrl(mysqlUri);
  const host = pick(process.env.MYSQLHOST, process.env.DB_HOST, parsed.host);
  const port = Number(pick(process.env.MYSQLPORT, process.env.DB_PORT, parsed.port) || "3306") || 3306;
  const user = pick(process.env.MYSQLUSER, process.env.DB_USER, parsed.user);
  const password = pick(process.env.MYSQLPASSWORD, process.env.DB_PASSWORD, parsed.password);
  const database = pick(
    process.env.MYSQLDATABASE,
    process.env.MYSQL_DATABASE,
    process.env.DB_NAME,
    parsed.database
  );

  const hasCredentials =
    Boolean(mysqlUri && (mysqlUri.startsWith("mysql://") || mysqlUri.startsWith("mysql2://"))) ||
    Boolean(host && user && password && database);
  if (!hasCredentials) {
    console.error("[backfill-yukkuri] MySQL 接続情報が見つかりません。");
    process.exit(1);
  }

  const conn =
    mysqlUri && (mysqlUri.startsWith("mysql://") || mysqlUri.startsWith("mysql2://"))
      ? await mysql.createConnection({
          uri: mysqlUri.startsWith("mysql2://")
            ? `mysql://${mysqlUri.slice("mysql2://".length)}`
            : mysqlUri,
          connectTimeout: 20000,
          timezone: "+09:00",
          ssl: { rejectUnauthorized: false },
        })
      : await mysql.createConnection({
          host,
          port,
          user,
          password,
          database,
          connectTimeout: 20000,
          timezone: "+09:00",
        });

  const [rows] = await conn.query(
    `SELECT x_handle, display_name, avatar_url
     FROM yukkuri_explained
     ORDER BY updated_at DESC`
  );
  const list = rows;
  console.log(
    `[backfill-yukkuri] start total=${list.length} mode=${dryRun ? "dry-run" : "apply"} wait=${WAIT_MS}ms`
  );

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const handle = String(row.x_handle ?? "").trim().replace(/^@+/, "").toLowerCase();
    if (!handle) {
      skipped += 1;
      continue;
    }

    const profile = await fetchXProfile(handle, bearerToken);
    if (!profile.ok) {
      failed += 1;
      console.warn(
        `[backfill-yukkuri] ${i + 1}/${list.length} @${handle} fetch_failed status=${profile.status}${
          profile.error ? ` error=${profile.error}` : ""
        }`
      );
      if (i < list.length - 1) await sleep(WAIT_MS);
      continue;
    }

    const currentName =
      typeof row.display_name === "string" && row.display_name.trim().length > 0
        ? row.display_name.trim()
        : null;
    const currentAvatar =
      typeof row.avatar_url === "string" && row.avatar_url.trim().length > 0
        ? row.avatar_url.trim()
        : null;
    const nextName = profile.displayName ?? currentName;
    const nextAvatar = profile.avatarUrl ?? currentAvatar;

    if (nextName === currentName && nextAvatar === currentAvatar) {
      skipped += 1;
      console.log(`[backfill-yukkuri] ${i + 1}/${list.length} @${handle} no_change`);
      if (i < list.length - 1) await sleep(WAIT_MS);
      continue;
    }

    if (dryRun) {
      updated += 1;
      console.log(
        `[backfill-yukkuri] ${i + 1}/${list.length} @${handle} will_update name:${currentName ?? "-"} -> ${
          nextName ?? "-"
        }, avatar:${currentAvatar ? "set" : "-"} -> ${nextAvatar ? "set" : "-"}`
      );
      if (i < list.length - 1) await sleep(WAIT_MS);
      continue;
    }

    await conn.execute(
      `UPDATE yukkuri_explained
       SET display_name = ?, avatar_url = ?
       WHERE x_handle = ?`,
      [nextName, nextAvatar, handle]
    );
    updated += 1;
    console.log(`[backfill-yukkuri] ${i + 1}/${list.length} @${handle} updated`);
    if (i < list.length - 1) await sleep(WAIT_MS);
  }

  await conn.end();
  console.log(
    `[backfill-yukkuri] done total=${list.length} updated=${updated} skipped=${skipped} failed=${failed}`
  );
}

main().catch((error) => {
  console.error("[backfill-yukkuri] fatal", error);
  process.exit(1);
});
