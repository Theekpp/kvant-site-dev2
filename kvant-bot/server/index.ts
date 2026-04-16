import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { startBot, setupGradeCallbacks } from "./bot";
import { setupReminders } from "./reminders";

export function log(message: string, source = "bot") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

(async () => {
  // Start Telegram bot
  const bot = startBot();
  if (bot) {
    setupGradeCallbacks(bot);
    setupReminders(bot);
    log("Telegram bot started with polling");
  } else {
    log("Warning: TELEGRAM_BOT_TOKEN not set — bot not started");
  }

  // Minimal Express server for health checks and process management
  const app = express();
  const httpServer = createServer(app);

  app.use(express.json());

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      }
    });
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "telegram-bot" });
  });

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Server error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`Health check server on port ${port}`);
  });
})();
