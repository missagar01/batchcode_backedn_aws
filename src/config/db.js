const { Pool } = require("pg");

const parseBoolean = (value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return undefined;
};

const isLocalHost = (hostValue) => {
  const host = String(hostValue || "").trim().toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
};

const pgSslEnv = parseBoolean(process.env.PG_SSL);
const pgSslMode = String(process.env.PGSSLMODE || "").trim().toLowerCase();
const requiresSslByMode = ["require", "verify-ca", "verify-full"].includes(pgSslMode);
const disablesSslByMode = pgSslMode === "disable";

const sslEnabled =
  pgSslEnv !== undefined
    ? pgSslEnv
    : disablesSslByMode
      ? false
      : requiresSslByMode || !isLocalHost(process.env.DB_HOST);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false
});

module.exports = pool;
