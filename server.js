const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, ".env"),
});

const port = Number(process.env.PORT) || 3004; // Server Port

const pool = require("./src/config/db.js");

async function ensurePostgresConnection() {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await Promise.race([
        pool.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
      ]);
      client.release();
      console.log("✅ Postgres connection pool ready");
      return;
    } catch (err) {
      lastError = err;
      const authMessage = String(err?.message || "");
      if (/no pg_hba\.conf entry/i.test(authMessage) && /no encryption/i.test(authMessage)) {
        console.warn("PostgreSQL rejected non-SSL connection. Set PG_SSL=true (or PGSSLMODE=require) in deployment env.");
      }
      console.warn(`⚠️ Postgres connection attempt ${attempt}/${maxRetries} failed:`, err.message);

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`🔄 Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error("❌ Postgres initialization failed after all retries:", lastError);
  throw lastError;
}

async function closeDatabases() {
  try {
    await pool.end();
  } catch (err) {
    console.error("⚠️ Error closing database connections:", err);
  }
}

// Import CommonJS app module
const app = require("./src/app.js");

const server = app.listen(port, async () => {
  try {
    console.log("📡 Connecting to PostgreSQL databases...");

    try {
      await ensurePostgresConnection();
    } catch (pgErr) {
      console.warn("⚠️ PostgreSQL connection failed, continuing without it:", pgErr.message);
    }

    console.log(`🚀 Server running at http://localhost:${port}`);
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    await closeDatabases();
    process.exit(1);
  }
});

const handleSignal = (signal) => async () => {
  console.log(`⚠️ ${signal} received, shutting down...`);
  await closeDatabases();
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", handleSignal("SIGTERM"));
// Force server restart
process.on("SIGINT", handleSignal("SIGINT"));
