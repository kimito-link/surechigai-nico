const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

const pick = (...values) =>
  values.find((v) => typeof v === "string" && v.length > 0);

function parseSqlStatements(sql) {
  const cleaned = sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  return cleaned
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
    .filter((statement) => {
      const upper = statement.toUpperCase();
      return (
        !upper.startsWith("CREATE DATABASE ") &&
        !upper.startsWith("USE ") &&
        !upper.startsWith("CREATE USER ") &&
        !upper.startsWith("GRANT ") &&
        !upper.startsWith("FLUSH PRIVILEGES")
      );
    });
}

async function main() {
  const host = pick(process.env.DB_HOST, process.env.MYSQLHOST);
  const port = Number(pick(process.env.DB_PORT, process.env.MYSQLPORT) || "3306");
  const user = pick(process.env.DB_USER, process.env.MYSQLUSER);
  const password = pick(process.env.DB_PASSWORD, process.env.MYSQLPASSWORD);
  const database = pick(process.env.DB_NAME, process.env.MYSQLDATABASE);

  if (!host || !user || !password || !database) {
    console.warn(
      "[bootstrap-db] skipped (DB env vars are missing: need host/user/password/database)"
    );
    return;
  }

  const sqlPath = path.join(__dirname, "init-db.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const statements = parseSqlStatements(sql);

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    timezone: "+09:00",
  });

  try {
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log(`[bootstrap-db] schema ensured (${statements.length} statements).`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[bootstrap-db] failed:", error?.message || error);
  process.exit(1);
});

