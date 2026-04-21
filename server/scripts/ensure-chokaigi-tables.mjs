/**
 * 本番 Railway MySQL に locations / blocks を「無ければ作る」
 *
 * - Vercel の `next build` の前に走らせる（package.json の build）。接続情報が無ければスキップ。
 * - 手元で明示実行: `npm run db:ensure:chokaigi`（.env に mysql:// が無いと失敗）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const pick = (...values) =>
  values.find((v) => typeof v === "string" && v.length > 0);

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

function parseSqlStatements(sql) {
  const cleaned = sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return cleaned
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
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

function hostFromUri(u) {
  try {
    const s = u.startsWith("mysql2://") ? `mysql://${u.slice("mysql2://".length)}` : u;
    return new URL(s).hostname;
  } catch {
    return "";
  }
}

const mysqlUri = pickFirstMysqlUri();
const parsed = parseMysqlUrl(mysqlUri);

const host = pick(process.env.MYSQLHOST, process.env.DB_HOST, parsed.host);
const port = Number(pick(process.env.MYSQLPORT, process.env.DB_PORT, parsed.port) || "3306") || 3306;
const user = pick(process.env.MYSQLUSER, process.env.DB_USER, parsed.user);
const password = pick(
  process.env.MYSQLPASSWORD,
  process.env.DB_PASSWORD,
  parsed.password
);
const database = pick(
  process.env.MYSQLDATABASE,
  process.env.MYSQL_DATABASE,
  process.env.DB_NAME,
  parsed.database
);

const resolvedHost = mysqlUri ? hostFromUri(mysqlUri) : host || "";
const isLocalhost =
  resolvedHost === "127.0.0.1" ||
  resolvedHost === "localhost" ||
  resolvedHost === "::1";
const hostSuggestsCloudTls =
  resolvedHost.includes("rlwy.net") ||
  resolvedHost.includes("railway") ||
  resolvedHost.includes("proxy.rlwy.net");
const explicitSslOff =
  process.env.DATABASE_SSL === "0" || process.env.DATABASE_SSL === "false";
const useSsl =
  !isLocalhost &&
  !explicitSslOff &&
  (process.env.DATABASE_SSL === "1" || hostSuggestsCloudTls);

const hasCredentials =
  Boolean(mysqlUri && (mysqlUri.startsWith("mysql://") || mysqlUri.startsWith("mysql2://"))) ||
  Boolean(host && user && password && database);

const explicitEnsure = process.env.npm_lifecycle_event === "db:ensure:chokaigi";

if (!hasCredentials) {
  if (explicitEnsure) {
    console.error(
      "[ensure-chokaigi] 接続できません。server/.env.local に MYSQL_PUBLIC_URL（mysql://... 1行）を入れるか、\n" +
        "  Railway / Vercel の mysql 接続と同じ値を設定してから再実行してください。"
    );
    process.exit(1);
  }
  console.log(
    "[ensure-chokaigi] skip: MySQL の接続文字列なし（ローカル build では正常。Vercel 本番では MYSQL_PUBLIC_URL がビルド時に渡ればここで DDL が流れます）"
  );
  process.exit(0);
}

const sqlPath = path.join(__dirname, "ensure-chokaigi-tables.sql");
const sql = fs.readFileSync(sqlPath, "utf8");
const statements = parseSqlStatements(sql);

let conn;

if (mysqlUri && (mysqlUri.startsWith("mysql://") || mysqlUri.startsWith("mysql2://"))) {
  conn = await mysql.createConnection({
    uri: mysqlUri.startsWith("mysql2://")
      ? `mysql://${mysqlUri.slice("mysql2://".length)}`
      : mysqlUri,
    connectTimeout: 20_000,
    timezone: "+09:00",
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
} else {
  conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    connectTimeout: 20_000,
    timezone: "+09:00",
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

for (const st of statements) {
  await conn.query(st);
  console.log(
    "[ensure-chokaigi] ok:",
    st.slice(0, 72).replace(/\s+/g, " ") + (st.length > 72 ? "…" : "")
  );
}
await conn.end();
console.log(`[ensure-chokaigi] 完了 (${statements.length} 文)`);
