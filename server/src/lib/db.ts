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
 * Vercel: 外部から Railway に届かせるなら Public 用URLを最優先。
 * 手動で MYSQLHOST だけ入れるのは中身が内部ホストのことが多い。
 */
const primaryMysqlUri = isVercel
  ? pick(
      process.env.MYSQL_PUBLIC_URL,
      process.env.DATABASE_URL,
      process.env.MYSQL_URL
    )
  : pick(
      process.env.MYSQL_URL,
      process.env.DATABASE_URL,
      process.env.MYSQL_PUBLIC_URL
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

export default pool;
