import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { startBot, setupGradeCallbacks } from "./bot";
import { setupReminders } from "./reminders";
import { insertScheduleSlotSchema, scheduleSlots, bookings, subscriptions, users } from "@shared/schema";
import { registerAuthRoutes, requireAuth, requireAdmin } from "./auth";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import TelegramBot from "node-telegram-bot-api";

let botInstance: TelegramBot | null = null;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const bot = startBot();
  botInstance = bot;
  if (bot) {
    setupGradeCallbacks(bot);
    setupReminders(bot);
  }

  registerAuthRoutes(app);

  // ── Users ─────────────────────────────────────────────────────────────────
  app.get("/api/users", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const result = await storage.getAllUsers();
      res.json(result);
    } catch {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      res.json(user);
    } catch {
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/users/:userId/notify", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) return res.status(400).json({ message: "Invalid userId" });
      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "Message is required" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (!user.telegramId) return res.status(400).json({ message: "User has no Telegram account" });
      if (!botInstance) return res.status(503).json({ message: "Bot is not running" });

      await botInstance.sendMessage(user.telegramId, message);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // ── Bookings ──────────────────────────────────────────────────────────────
  app.get("/api/bookings", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const result = await db.query.bookings.findMany({
        with: { user: true },
        orderBy: (b, { desc }) => [desc(b.createdAt)],
      });
      res.json(result);
    } catch {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", requireAuth, requireAdmin, async (req, res) => {
    try {
      const booking = await storage.createBooking(req.body);
      res.json(booking);
    } catch {
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/bookings/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) return res.status(400).json({ message: "Invalid userId" });
      const result = await storage.getBookingsByUserId(userId);
      res.json(result);
    } catch {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.patch("/api/bookings/:id/status", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const { status } = req.body;
      if (!status || !["pending", "confirmed", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const oldBooking = await storage.getBooking(id);
      const booking = await storage.updateBookingStatus(id, status);

      if (oldBooking && oldBooking.status !== status && botInstance) {
        try {
          const user = await storage.getUser(oldBooking.userId);
          if (user && user.telegramId) {
            const typeText = oldBooking.type === "individual" ? "Индивидуальное" : "Групповое";

            if (status === "confirmed" && oldBooking.status === "pending") {
              await botInstance.sendMessage(user.telegramId,
                `\u{2705} Запись подтверждена!\n\n` +
                `${typeText} занятие ${oldBooking.date} в ${oldBooking.time} подтверждено ментором.\n\n` +
                `Мы пришлём напоминание за день до занятия. Если нужно изменить запись — свяжись с Кириллом: @anisimovvd`
              );
            }

            if (status === "cancelled" && oldBooking.status !== "cancelled") {
              await botInstance.sendMessage(user.telegramId,
                `\u{274C} Запись отменена\n\n` +
                `${typeText} занятие ${oldBooking.date} в ${oldBooking.time} было отменено.\n\n` +
                `Если у тебя есть вопросы, свяжись с ментором:\n` +
                `\u{1F4AC} @anisimovvd\n` +
                `\u{1F4F1} +7 (964) 882-36-78`
              );
            }

            if (status === "completed" && oldBooking.status !== "completed") {
              await botInstance.sendMessage(user.telegramId,
                `\u{2705} Занятие завершено!\n\n` +
                `${typeText} занятие ${oldBooking.date} в ${oldBooking.time} отмечено как завершённое.\n\n` +
                `Спасибо за занятие! \u{1F4AA} Жду тебя снова!`
              );

              const subs = await storage.getSubscriptionsByUserId(user.id);
              const activeSub = subs.find(s =>
                s.isPaid && s.remainingLessons > 0 && s.type === oldBooking.type
              ) || subs.find(s => s.isPaid && s.remainingLessons > 0);

              if (activeSub) {
                const newRemaining = activeSub.remainingLessons - 1;
                await storage.updateSubscription(activeSub.id, { remainingLessons: newRemaining });

                if (newRemaining === 0) {
                  await botInstance.sendMessage(user.telegramId,
                    `\u{26A0}\u{FE0F} Твой абонемент на ${activeSub.totalLessons} занятий израсходован!\n\n` +
                    `Для продолжения обучения оформи новый абонемент или запишись на разовое занятие.`
                  );
                } else {
                  await botInstance.sendMessage(user.telegramId,
                    `\u{1F4B3} По абонементу осталось занятий: ${newRemaining} из ${activeSub.totalLessons}`
                  );
                }
              }
            }
          }
        } catch (notifyErr) {
          console.error("Failed to send notification:", notifyErr);
        }
      }

      res.json(booking);
    } catch {
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  app.patch("/api/bookings/:id/paid", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const { isPaid } = req.body;
      const [booking] = await db.update(bookings)
        .set({ isPaid: !!isPaid })
        .where(eq(bookings.id, id))
        .returning();
      res.json(booking);
    } catch {
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // ── Schedule ──────────────────────────────────────────────────────────────
  app.get("/api/schedule", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { type } = req.query;
      let result;
      if (type && typeof type === "string") {
        result = await db.select().from(scheduleSlots)
          .where(eq(scheduleSlots.slotType, type))
          .orderBy(scheduleSlots.dayOfWeek);
      } else {
        result = await db.select().from(scheduleSlots)
          .orderBy(scheduleSlots.dayOfWeek);
      }
      res.json(result);
    } catch {
      res.status(500).json({ message: "Failed to fetch schedule" });
    }
  });

  app.post("/api/schedule", requireAuth, requireAdmin, async (req, res) => {
    try {
      const parsed = insertScheduleSlotSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const result = await storage.createScheduleSlot(parsed.data);
      res.json(result);
    } catch {
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  app.patch("/api/schedule/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const result = await storage.updateScheduleSlot(id, req.body);
      res.json(result);
    } catch {
      res.status(500).json({ message: "Failed to update schedule" });
    }
  });

  app.delete("/api/schedule/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      await storage.deleteScheduleSlot(id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });

  // ── Subscriptions ─────────────────────────────────────────────────────────
  app.get("/api/subscriptions", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const result = await db.query.subscriptions.findMany({
        with: { user: true },
        orderBy: (s, { desc }) => [desc(s.createdAt)],
      });
      res.json(result);
    } catch {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.get("/api/subscriptions/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) return res.status(400).json({ message: "Invalid userId" });
      const result = await storage.getSubscriptionsByUserId(userId);
      res.json(result);
    } catch {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.post("/api/subscriptions", requireAuth, requireAdmin, async (req, res) => {
    try {
      const sub = await storage.createSubscription(req.body);
      res.json(sub);
    } catch {
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.patch("/api/subscriptions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const sub = await storage.updateSubscription(id, req.body);
      res.json(sub);
    } catch {
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  app.patch("/api/subscriptions/:id/paid", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const [sub] = await db.update(subscriptions)
        .set({ isPaid: true })
        .where(eq(subscriptions.id, id))
        .returning();
      res.json(sub);
    } catch {
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  app.get("/api/stats", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const usersAll = await storage.getAllUsers();
      const bookingsAll = await storage.getAllBookings();
      const subsAll = await storage.getAllSubscriptions();

      res.json({
        totalUsers: usersAll.length,
        activeBookings: bookingsAll.filter(b => b.status === "confirmed").length,
        totalBookings: bookingsAll.length,
        activeSubs: subsAll.filter(s => s.isPaid && s.remainingLessons > 0).length,
        totalSubs: subsAll.length,
      });
    } catch {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  return httpServer;
}
