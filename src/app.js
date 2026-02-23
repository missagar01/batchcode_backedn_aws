const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const path = require("path");

const sharedAuthRoutes = require("./routes/login.routes.js");
const batchcodeRoutes = require("./routes/index.js");
const requestLogger = require("./middlewares/requestLogger");
const { StatusCodes, getReasonPhrase } = require("http-status-codes");
const ApiError = require("./utils/apiError");
const { logger } = require("./utils/logger");

const isProduction = process.env.NODE_ENV === "production";
const configuredOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowWildcardOrigin =
  configuredOrigins.length === 0 ? !isProduction : configuredOrigins.includes("*");

if (isProduction && allowWildcardOrigin) {
  console.warn(
    "[SECURITY] CORS is wildcard in production. Set CORS_ORIGINS to explicit frontend domains."
  );
}

console.log("[BOOT] CORS Configuration:", {
  enabled: true,
  allowedOrigins: allowWildcardOrigin ? "ALL (*)" : configuredOrigins,
  credentials: true
});

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowWildcardOrigin || configuredOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(
      `CORS: Origin ${origin} not allowed. Allowed origins: ${configuredOrigins.join(", ")}`
    );
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  optionsSuccessStatus: 200
};

const apiRouter = express.Router();
apiRouter.use("/batchcode", batchcodeRoutes);
apiRouter.use("/auth", sharedAuthRoutes);

const app = express();
app.set("trust proxy", isProduction ? 1 : false);
app.use(requestLogger);

app.use(cors(corsOptions));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
  })
);

app.use(compression());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.URLENCODED_BODY_LIMIT || "1mb"
  })
);

const uploadsPath = path.join(process.cwd(), "uploads");
console.log("[BOOT] Static uploads path:", uploadsPath);
app.use(
  "/uploads",
  express.static(uploadsPath, {
    dotfiles: "ignore",
    etag: true,
    lastModified: true,
    maxAge: "1d"
  })
);

app.use("/api", apiRouter);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    err instanceof ApiError
      ? err.statusCode
      : err.statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || getReasonPhrase(statusCode);

  if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
    logger.error(message, err);
  } else {
    logger.warn(message, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: err instanceof ApiError ? err.details : undefined,
    error:
      process.env.NODE_ENV === "development" && !(err instanceof ApiError)
        ? err.stack
        : undefined
  });
});

module.exports = app;
