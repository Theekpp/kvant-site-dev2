import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { startBot, setupGradeCallbacks } from "./bot";
import { setupReminders } from "./reminders";
import { storage } from "./storage";

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
  const bot = startBot();
  if (bot) {
    setupGradeCallbacks(bot);
    setupReminders(bot);
    log("Telegram bot started with polling");
  } else {
    log("Warning: TELEGRAM_BOT_TOKEN not set — bot not started");
  }

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

  // ─── YooKassa webhook ─────────────────────────────────────────────────────
  app.post("/api/yookassa/webhook", async (req, res) => {
    try {
      const event = req.body;
      log(`YooKassa webhook: ${event?.event} payment ${event?.object?.id}`);

      if (event?.event === "payment.succeeded" && event?.object) {
        const paymentObj = event.object;
        const subIdStr = paymentObj?.metadata?.subscriptionId;
        if (subIdStr) {
          const subId = parseInt(subIdStr, 10);
          if (!isNaN(subId)) {
            const sub = await storage.getSubscription(subId);
            if (sub && !sub.isPaid) {
              await storage.updateSubscription(subId, { isPaid: true, status: "active" });
              log(`Subscription #${subId} activated via YooKassa payment ${paymentObj.id}`);

              // Notify student
              if (bot) {
                const user = await storage.getUser(sub.userId);
                if (user?.telegramId) {
                  await bot.sendMessage(
                    user.telegramId,
                    `✅ Оплата получена!\n\n` +
                    `Абонемент на ${sub.totalLessons} занятий активирован.\n` +
                    `Доступно занятий: ${sub.remainingLessons}\n\n` +
                    `Теперь вы можете записываться на занятия! 🎓`
                  );
                }
              }
            }
          }
        }
      }

      res.json({ status: "ok" });
    } catch (err) {
      console.error("YooKassa webhook error:", err);
      res.status(500).json({ status: "error" });
    }
  });

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Server error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  const port = parseInt(process.env.PORT || "5000", 10);

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      log(`Port ${port} in use, retrying in 2s...`);
      setTimeout(() => {
        httpServer.close();
        httpServer.listen({ port, host: "0.0.0.0" }, () => {
          log(`Health check server on port ${port}`);
        });
      }, 2000);
    } else {
      console.error("HTTP server error:", err);
      process.exit(1);
    }
  });

  process.on("SIGTERM", () => {
    log("SIGTERM received, shutting down...");
    httpServer.close(() => {
      log("HTTP server closed");
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000);
  });

  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    log(`Health check server on port ${port}`);
  });
})();
