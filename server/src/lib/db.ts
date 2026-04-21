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

const mysqlUrlConfig = parseMysqlUrl(
  pick(process.env.MYSQL_URL, process.env.DATABASE_URL, process.env.MYSQL_PUBLIC_URL)
);

const resolvedHost =
  pick(process.env.MYSQLHOST, process.env.DB_HOST, mysqlUrlConfig.host) || "127.0.0.1";
const isLocalhost =
  resolvedHost === "127.0.0.1" ||
  resolvedHost === "localhost" ||
  resolvedHost === "::1";

/**
 * Railway 等のクラウド MySQL / Vercel 本番は TLS が必要なことが多い。
 * 明示: DATABASE_SSL=1 または 0
 * 自動: ホスト名に rlwy.net / railway、または Vercel 上で 127.0.0.1 以外
 */
const explicitSslOff =
  process.env.DATABASE_SSL === "0" || process.env.DATABASE_SSL === "false";
const explicitSslOn =
  process.env.DATABASE_SSL === "1" || process.env.DATABASE_SSL === "true";
const hostSuggestsCloudTls =
  resolvedHost.includes("rlwy.net") || resolvedHost.includes("railway");
const useMysqlSsl =
  !isLocalhost &&
  !explicitSslOff &&
  (explicitSslOn || hostSuggestsCloudTls || process.env.VERCEL === "1");

const pool = mysql.createPool({
  host: resolvedHost,
  port: Number(pick(process.env.MYSQLPORT, process.env.DB_PORT, mysqlUrlConfig.port)) || 3306,
  user: pick(process.env.MYSQLUSER, process.env.DB_USER, mysqlUrlConfig.user) || "CHANGE_ME",
  password:
    pick(process.env.MYSQLPASSWORD, process.env.DB_PASSWORD, mysqlUrlConfig.password) ||
    "CHANGE_ME",
  database:
    pick(process.env.MYSQLDATABASE, process.env.DB_NAME, mysqlUrlConfig.database) || "surechigai",
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 20_000,
  timezone: "+09:00",
  ...(useMysqlSsl
    ? {
        ssl: {
          // Railway 公開接続は多くの場合この指定で接続可能（厳格CAは必要に応じて DATABASE_SSL_* で拡張）
          rejectUnauthorized: false,
        },
      }
    : {}),
});

export default pool;
