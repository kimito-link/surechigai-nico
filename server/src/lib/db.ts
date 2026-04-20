import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "CHANGE_ME",
  password: process.env.DB_PASSWORD || "CHANGE_ME",
  database: process.env.DB_NAME || "surechigai",
  waitForConnections: true,
  connectionLimit: 10,
  timezone: "+09:00",
});

export default pool;
