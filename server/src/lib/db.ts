import mysql from "mysql2/promise";

const pick = (...values: Array<string | undefined>) =>
  values.find((v) => typeof v === "string" && v.length > 0);

const pool = mysql.createPool({
  host: pick(process.env.DB_HOST, process.env.MYSQLHOST) || "127.0.0.1",
  port: Number(pick(process.env.DB_PORT, process.env.MYSQLPORT)) || 3306,
  user: pick(process.env.DB_USER, process.env.MYSQLUSER) || "CHANGE_ME",
  password:
    pick(process.env.DB_PASSWORD, process.env.MYSQLPASSWORD) || "CHANGE_ME",
  database: pick(process.env.DB_NAME, process.env.MYSQLDATABASE) || "surechigai",
  waitForConnections: true,
  connectionLimit: 10,
  timezone: "+09:00",
});

export default pool;
