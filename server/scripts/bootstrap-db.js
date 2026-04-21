const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

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

function buildCandidates() {
  const urlConfigs = [
    { source: "MYSQL_URL", ...parseMysqlUrl(process.env.MYSQL_URL) },
    { source: "DATABASE_URL", ...parseMysqlUrl(process.env.DATABASE_URL) },
    { source: "MYSQL_PUBLIC_URL", ...parseMysqlUrl(process.env.MYSQL_PUBLIC_URL) },
  ];

  const candidates = [];
  const seen = new Set();

  const push = (source, config) => {
    if (!config.host || !config.user || !config.password || !config.database) return;
    const port = Number(config.port || "3306") || 3306;
    const key = `${config.host}|${port}|${config.user}|${config.database}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({
      source,
      host: config.host,
      port,
      user: config.user,
      password: config.password,
      database: config.database,
    });
  };

  push("MYSQL*", {
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
  });

  push("DB_*", {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  for (const cfg of urlConfigs) {
    push(cfg.source, cfg);
  }

  push("mixed-fallback", {
    host: pick(
      process.env.MYSQLHOST,
      process.env.DB_HOST,
      ...urlConfigs.map((cfg) => cfg.host)
    ),
    port: pick(
      process.env.MYSQLPORT,
      process.env.DB_PORT,
      ...urlConfigs.map((cfg) => cfg.port)
    ),
    user: pick(
      process.env.MYSQLUSER,
      process.env.DB_USER,
      ...urlConfigs.map((cfg) => cfg.user)
    ),
    password: pick(
      process.env.MYSQLPASSWORD,
      process.env.DB_PASSWORD,
      ...urlConfigs.map((cfg) => cfg.password)
    ),
    database: pick(
      process.env.MYSQLDATABASE,
      process.env.DB_NAME,
      ...urlConfigs.map((cfg) => cfg.database)
    ),
  });

  return candidates;
}

async function main() {
  const candidates = buildCandidates();
  if (candidates.length === 0) {
    console.warn(
      "[bootstrap-db] skipped (no usable DB credentials found in MYSQL*/DB_*/MYSQL_URL/DATABASE_URL)."
    );
    return;
  }

  const sqlPath = path.join(__dirname, "init-db.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const statements = parseSqlStatements(sql);

  let lastError = null;

  for (const candidate of candidates) {
    let connection;
    try {
      connection = await mysql.createConnection({
        host: candidate.host,
        port: candidate.port,
        user: candidate.user,
        password: candidate.password,
        database: candidate.database,
        connectTimeout: 8000,
        timezone: "+09:00",
      });

      for (const statement of statements) {
        await connection.query(statement);
      }
      console.log(
        `[bootstrap-db] schema ensured (${statements.length} statements) via ${candidate.source} (${candidate.host}:${candidate.port}/${candidate.database}).`
      );
      await connection.end();
      return;
    } catch (error) {
      lastError = error;
      console.warn(
        `[bootstrap-db] candidate failed (${candidate.source} ${candidate.host}:${candidate.port}/${candidate.database}): ${
          error?.message || error
        }`
      );
    } finally {
      if (connection) {
        try {
          await connection.end();
        } catch {}
      }
    }
  }

  console.warn(`[bootstrap-db] skipped after trying all candidates: ${lastError?.message || lastError}`);
}

main().catch((error) => {
  console.warn("[bootstrap-db] fatal error; continuing app startup:", error?.message || error);
});
