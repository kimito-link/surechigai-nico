import mysql from "mysql2/promise";

const pick = (...values: Array<string | undefined>) =>
  values.find((v) => typeof v === "string" && v.length > 0);

const parseMysqlUrl = (value?: string) => {
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
};

const isVercel = process.env.VERCEL === "1";

/**
 * Vercel では Postgres 用の DATABASE_URL が別途入っていることが多い。
 * 先頭の pick でそれを拾うと mysql ではないため、127.0.0.1 / 誤ホストに落ちて ECONNREFUSED になる。
 */
function pickFirstMysqlConnectionString(
  ...candidates: Array<string | undefined>
): string | undefined {
  for (const c of candidates) {
    if (!c || typeof c !== "string") continue;
    const t = c.trim();
    if (t.startsWith("mysql://") || t.startsWith("mysql2://")) {
      return t;
    }
  }
  return undefined;
}

/**
 * Vercel: Public 用を最優先。Railway のテンプレ名（RAILWAY_*）も走査。
 */
const primaryMysqlUri = isVercel
  ? pickFirstMysqlConnectionString(
      process.env.MYSQL_PUBLIC_URL,
      process.env.RAILWAY_MYSQL_URL,
      process.env.RAILWAY_DATABASE_URL,
      process.env.DATABASE_URL,
      process.env.MYSQL_URL
    )
  : pickFirstMysqlConnectionString(
      process.env.MYSQL_URL,
      process.env.DATABASE_URL,
      process.env.MYSQL_PUBLIC_URL,
      process.env.RAILWAY_MYSQL_URL,
      process.env.RAILWAY_DATABASE_URL
    );

const mysqlUrlConfig = parseMysqlUrl(primaryMysqlUri);
const canUseUri = Boolean(
  primaryMysqlUri &&
    (primaryMysqlUri.startsWith("mysql://") || primaryMysqlUri.startsWith("mysql2://"))
);

function hostFromConnectionString(u: string): string {
  try {
    if (u.startsWith("mysql2://")) {
      return new URL(`mysql://${u.slice("mysql2://".length)}`).hostname;
    }
    return new URL(u).hostname;
  } catch {
    return "";
  }
}

const explicitSslOff =
  process.env.DATABASE_SSL === "0" || process.env.DATABASE_SSL === "false";
const explicitSslOn =
  process.env.DATABASE_SSL === "1" || process.env.DATABASE_SSL === "true";

const resolvedHost = canUseUri
  ? hostFromConnectionString(primaryMysqlUri!)
  : pick(process.env.MYSQLHOST, process.env.DB_HOST, mysqlUrlConfig.host) || "127.0.0.1";

const isLocalhost =
  resolvedHost === "127.0.0.1" ||
  resolvedHost === "localhost" ||
  resolvedHost === "::1";

const hostSuggestsCloudTls =
  resolvedHost.includes("rlwy.net") ||
  resolvedHost.includes("railway") ||
  resolvedHost.includes("proxy.rlwy.net");
const useMysqlSsl =
  !isLocalhost &&
  !explicitSslOff &&
  (explicitSslOn || hostSuggestsCloudTls || (isVercel && canUseUri));

const poolOptions: mysql.PoolOptions = {
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 20_000,
  timezone: "+09:00",
  enableKeepAlive: true,
  /**
   * 明示しないと mysql2 は `UTF8_GENERAL_CI`（= utf8mb3, 3-byte UTF-8）で接続する。
   * X プロフィール名に 4-byte 文字（絵文字・一部 CJK 拡張漢字）が混ざると
   * `Quma(�N�[�}])` のように `�` 化するため utf8mb4 を強制する。
   * テーブル側の charset が違っていても、接続側で utf8mb4 を使えば
   * サーバが変換可能なケースでは往復時の破損を防げる。
   */
  charset: "utf8mb4",
  ...(useMysqlSsl
    ? {
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {}),
};

/**
 * 接続に mysql:// 文字列を使う（mysql2 のパーサ。パスワードに @ や + がある場合の手抜きパースより安全）
 */
const pool = canUseUri
  ? mysql.createPool({
      uri: primaryMysqlUri!,
      ...poolOptions,
    })
  : mysql.createPool({
      host: resolvedHost,
      port: Number(pick(process.env.MYSQLPORT, process.env.DB_PORT, mysqlUrlConfig.port)) || 3306,
      user: pick(process.env.MYSQLUSER, process.env.DB_USER, mysqlUrlConfig.user) || "CHANGE_ME",
      password:
        pick(
          process.env.MYSQLPASSWORD,
          process.env.DB_PASSWORD,
          mysqlUrlConfig.password
        ) || "CHANGE_ME",
      database:
        pick(
          process.env.MYSQLDATABASE,
          process.env.DB_NAME,
          mysqlUrlConfig.database
        ) || "surechigai",
      ...poolOptions,
    });

function envMysqlKind(
  v: string | undefined
): "missing" | "mysql" | "other_scheme" {
  if (v == null || String(v).trim() === "") return "missing";
  return /^mysql2?:\/\//i.test(String(v).trim()) ? "mysql" : "other_scheme";
}

/**
 * デバッグ用（秘匿値は出さない）: /api/health/db などで利用
 */
export function getDatabaseConnectionHints() {
  const dbUrl = process.env.DATABASE_URL;
  const hasDatabaseUrl = Boolean(dbUrl && String(dbUrl).length > 0);
  const databaseUrlIsMysql = Boolean(
    dbUrl && /^mysql2?:\/\//i.test(String(dbUrl).trim())
  );
  const vercel = process.env.VERCEL === "1";
  return {
    vercel,
    usingMysqlConnectionUri: canUseUri,
    hasNonMysqlDatabaseUrl: hasDatabaseUrl && !databaseUrlIsMysql,
    hasReadableMysqlPublicUrl: Boolean(
      process.env.MYSQL_PUBLIC_URL &&
        /^mysql2?:\/\//i.test(String(process.env.MYSQL_PUBLIC_URL).trim())
    ),
    /** どの名義の変数に mysql:// があるか（値は出さない） */
    envMysql: {
      MYSQL_PUBLIC_URL: envMysqlKind(process.env.MYSQL_PUBLIC_URL),
      RAILWAY_MYSQL_URL: envMysqlKind(process.env.RAILWAY_MYSQL_URL),
      RAILWAY_DATABASE_URL: envMysqlKind(process.env.RAILWAY_DATABASE_URL),
      DATABASE_URL: envMysqlKind(process.env.DATABASE_URL),
      MYSQL_URL: envMysqlKind(process.env.MYSQL_URL),
    },
    nextSteps:
      vercel && !canUseUri
        ? [
            "1) Railway ダッシュボード → MySQL サービス →「Connect」または Variables → 外部(Public)用の接続。mysql:// で始まる1行をコピー。",
            "2) Vercel → 該当プロジェクト → Settings → Environment Variables → Environment「Production」→ 名前 MYSQL_PUBLIC_URL、値にその1行を貼る。",
            "3) Save 後、Deployments で Redeploy（環境変数の反映のため本番の再デプロイが必須）。",
            "4) この URL を再確認: /api/health/db → ok true になれば接続成功。",
          ]
        : undefined,
  };
}

export default pool;
