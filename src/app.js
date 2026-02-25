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

const defaultLocalOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174"
];

const getOriginFromUrl = (value) => {
  if (!value) {
    return null;
  }
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const baseUrlOrigin = getOriginFromUrl(process.env.BASE_URL);

const fallbackOrigins = isProduction
  ? [...(baseUrlOrigin ? [baseUrlOrigin] : []), ...defaultLocalOrigins]
  : ["*"];

const allowedOrigins = Array.from(
  new Set(configuredOrigins.length > 0 ? configuredOrigins : fallbackOrigins)
);

const allowWildcardOrigin = allowedOrigins.includes("*");

if (isProduction && configuredOrigins.length === 0) {
  console.warn(
    `[WARN] CORS_ORIGINS is empty in production. Using fallback origins: ${allowedOrigins.join(", ")}`
  );
}

if (isProduction && allowWildcardOrigin) {
  console.warn(
    "[SECURITY] CORS is wildcard in production. Set CORS_ORIGINS to explicit frontend domains."
  );
}

console.log("[BOOT] CORS Configuration:", {
  enabled: true,
  allowedOrigins: allowWildcardOrigin ? "ALL (*)" : allowedOrigins,
  credentials: true
});

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowWildcardOrigin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(
      `CORS: Origin ${origin} not allowed. Allowed origins: ${allowedOrigins.join(", ")}`
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

app.use((req, _res, next) => {
  const [pathname, query = ""] = String(req.url || "").split("?");
  const normalizedPathname = pathname.replace(/\/{2,}/g, "/");
  if (normalizedPathname !== pathname) {
    req.url = query ? `${normalizedPathname}?${query}` : normalizedPathname;
  }
  next();
});

const uploadsPath = path.resolve(__dirname, "..", "uploads");
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
