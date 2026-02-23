const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, ".env")
});

const app = require("./src/app.js");
const pool = require("./src/config/db.js");

const port = Number(process.env.PORT) || 3004;
const isProduction = process.env.NODE_ENV === "production";
const advertisedBaseUrl = String(process.env.BASE_URL || `http://localhost:${port}`);

let server;
let isShuttingDown = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensurePostgresConnection() {
  const maxRetries = Number(process.env.DB_CONNECT_RETRIES || 3);
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const client = await Promise.race([
        pool.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout")), 10000)
        )
      ]);

      client.release();
      console.log("[BOOT] PostgreSQL connection pool ready");
      return;
    } catch (error) {
      lastError = error;
      const authMessage = String(error?.message || "");

      if (/no pg_hba\.conf entry/i.test(authMessage) && /no encryption/i.test(authMessage)) {
        console.warn(
          "[WARN] PostgreSQL rejected non-SSL connection. Set PG_SSL=true (or PGSSLMODE=require)."
        );
      }

      console.warn(
        `[WARN] PostgreSQL connection attempt ${attempt}/${maxRetries} failed: ${error.message}`
      );

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[BOOT] Retrying PostgreSQL connection in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

async function closeDatabases() {
  try {
    await pool.end();
  } catch (error) {
    console.error("[WARN] Error while closing database pool:", error.message);
  }
}

async function startServer() {
  try {
    console.log(`[BOOT] Starting backend in ${process.env.NODE_ENV || "development"} mode`);
    console.log("[BOOT] Connecting to PostgreSQL...");

    try {
      await ensurePostgresConnection();
    } catch (error) {
      if (isProduction) {
        throw new Error(`PostgreSQL is required in production: ${error.message}`);
      }
      console.warn(
        `[WARN] PostgreSQL unavailable in non-production mode, continuing startup: ${error.message}`
      );
    }

    server = app.listen(port, () => {
      console.log(`[BOOT] Server running at ${advertisedBaseUrl}`);
    });

    server.on("error", (error) => {
      console.error("[FATAL] HTTP server error:", error);
      shutdown("SERVER_ERROR", 1);
    });
  } catch (error) {
    console.error("[FATAL] Failed to start backend:", error.message);
    await closeDatabases();
    process.exit(1);
  }
}

async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`[BOOT] ${signal} received, shutting down...`);

  if (server) {
    await new Promise((resolve) => {
      server.close(() => resolve());
    });
  }

  await closeDatabases();
  console.log("[BOOT] Shutdown complete");
  process.exit(exitCode);
}

process.on("SIGTERM", () => shutdown("SIGTERM", 0));
process.on("SIGINT", () => shutdown("SIGINT", 0));

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled promise rejection:", reason);
  shutdown("UNHANDLED_REJECTION", isProduction ? 1 : 0);
});

process.on("uncaughtException", (error) => {
  console.error("[FATAL] Uncaught exception:", error);
  shutdown("UNCAUGHT_EXCEPTION", 1);
});

startServer();
