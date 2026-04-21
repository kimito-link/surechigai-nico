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

const pool = mysql.createPool({
  host: pick(process.env.MYSQLHOST, process.env.DB_HOST, mysqlUrlConfig.host) || "127.0.0.1",
  port: Number(pick(process.env.MYSQLPORT, process.env.DB_PORT, mysqlUrlConfig.port)) || 3306,
  user: pick(process.env.MYSQLUSER, process.env.DB_USER, mysqlUrlConfig.user) || "CHANGE_ME",
  password:
    pick(process.env.MYSQLPASSWORD, process.env.DB_PASSWORD, mysqlUrlConfig.password) ||
    "CHANGE_ME",
  database:
    pick(process.env.MYSQLDATABASE, process.env.DB_NAME, mysqlUrlConfig.database) || "surechigai",
  waitForConnections: true,
  connectionLimit: 10,
  timezone: "+09:00",
});

export default pool;
