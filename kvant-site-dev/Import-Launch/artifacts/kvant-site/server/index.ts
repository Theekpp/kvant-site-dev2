import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// Trust Replit's reverse proxy (needed for express-rate-limit to get real client IP)
app.set("trust proxy", 1);

// ── Security headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: [
          "'self'",
          "wss:",
          "ws:",
          "https:",
          "https://fonts.googleapis.com",
          "https://fonts.gstatic.com",
        ],
        mediaSrc: ["'self'", "blob:", "https:"],
        frameSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// ── Gzip/Brotli compression ──────────────────────────────────────────────────
app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }),
);

// ── Global rate limiting ─────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Слишком много запросов, попробуйте позже." },
  skip: (req) => req.path.startsWith("/board-app") || req.path.startsWith("/lk-ws"),
});
app.use(globalLimiter);

// ── Proxy to kvant-board service (Excalidraw collaboration board) ────────────
// Mounted BEFORE body parsers so request bodies are streamed unmodified.
const BOARD_TARGET =
  process.env.BOARD_INTERNAL_URL || "http://localhost:8000";
const boardProxy = createProxyMiddleware({
  target: BOARD_TARGET,
  changeOrigin: true,
  ws: true,
});
const boardWsProxy = createProxyMiddleware({
  target: BOARD_TARGET,
  changeOrigin: true,
  ws: true,
});
app.use("/board-app", boardProxy);
app.use("/board-ws", boardWsProxy);

// ── Proxy to LiveKit server (WebRTC video conferencing) ──────────────────────
const LK_TARGET = process.env.LIVEKIT_INTERNAL_URL || "http://localhost:9000";
const lkProxy = createProxyMiddleware({
  target: LK_TARGET,
  changeOrigin: true,
  ws: true,
  pathRewrite: { "^/lk-ws": "" },
});
app.use("/lk-ws", lkProxy);

// ── Forward HTTP UPGRADE (WebSocket handshake) ───────────────────────────────
httpServer.on("upgrade", (req, socket, head) => {
  if (req.url && req.url.startsWith("/board-ws")) {
    (boardWsProxy as any).upgrade(req, socket, head);
  } else if (req.url && req.url.startsWith("/board-app")) {
    (boardProxy as any).upgrade(req, socket, head);
  } else if (req.url && req.url.startsWith("/lk-ws")) {
    (lkProxy as any).upgrade(req, socket, head);
  }
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
