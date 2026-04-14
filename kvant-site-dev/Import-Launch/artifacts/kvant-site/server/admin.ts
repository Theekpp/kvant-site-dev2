import type { Express } from "express";
import { db } from "./db";
import { users, accounts, bookings, subscriptions, scheduleSlots, reviews } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "./auth";

export function registerAdminRoutes(app: Express) {
  const guard = [requireAuth, requireAdmin];

  app.get("/api/admin/users", ...guard, async (req, res) => {
    try {
      const all = await db.select().from(users).orderBy(desc(users.createdAt));
      res.json(all);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.post("/api/admin/users", ...guard, async (req, res) => {
    try {
      const { telegramId, firstName, lastName, age, grade, goal, phone, telegramUsername } = req.body;
      const [user] = await db.insert(users).values({
        telegramId: telegramId ?? null,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        age: age ?? null,
        grade: grade ?? null,
        goal: goal ?? null,
        phone: phone ?? null,
        telegramUsername: telegramUsername ?? null,
      }).returning();
      res.json(user);
    } catch (e: any) {
      if (e?.code === "23505") {
        res.status(409).json({ message: "Пользователь уже существует" });
      } else {
        res.status(500).json({ message: "Ошибка сервера" });
      }
    }
  });

  app.get("/api/admin/bookings", ...guard, async (req, res) => {
    try {
      const all = await db
        .select({
          id: bookings.id,
          userId: bookings.userId,
          type: bookings.type,
          date: bookings.date,
          time: bookings.time,
          status: bookings.status,
          isPaid: bookings.isPaid,
          createdAt: bookings.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            name: users.name,
            phone: users.phone,
            telegramUsername: users.telegramUsername,
          },
        })
        .from(bookings)
        .leftJoin(users, eq(bookings.userId, users.id))
        .orderBy(desc(bookings.createdAt));
      res.json(all);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.post("/api/admin/bookings", ...guard, async (req, res) => {
    try {
      const { userId, type, date, time, status, isPaid } = req.body;
      if (!userId || !date || !time) {
        return res.status(400).json({ message: "Обязательные поля: userId, date, time" });
      }
      const [booking] = await db.insert(bookings).values({
        userId: Number(userId),
        type: type ?? "individual",
        date,
        time,
        status: status ?? "confirmed",
        isPaid: isPaid ?? false,
      }).returning();
      res.json(booking);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.patch("/api/admin/bookings/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, isPaid } = req.body;
      const updates: Partial<typeof bookings.$inferInsert> = {};
      if (status !== undefined) updates.status = status;
      if (isPaid !== undefined) updates.isPaid = isPaid;
      const [updated] = await db.update(bookings).set(updates).where(eq(bookings.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Запись не найдена" });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.post("/api/admin/notify", ...guard, async (req, res) => {
    try {
      const { userId, message } = req.body;
      const [user] = await db.select().from(users).where(eq(users.id, Number(userId)));
      if (!user) return res.status(404).json({ message: "Пользователь не найден" });
      console.log(`[NOTIFY] user ${userId}: ${message}`);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.get("/api/admin/subscriptions", ...guard, async (req, res) => {
    try {
      const all = await db
        .select({
          id: subscriptions.id,
          userId: subscriptions.userId,
          type: subscriptions.type,
          totalLessons: subscriptions.totalLessons,
          remainingLessons: subscriptions.remainingLessons,
          isPaid: subscriptions.isPaid,
          createdAt: subscriptions.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            name: users.name,
            phone: users.phone,
          },
        })
        .from(subscriptions)
        .leftJoin(users, eq(subscriptions.userId, users.id))
        .orderBy(desc(subscriptions.createdAt));
      res.json(all);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.post("/api/admin/subscriptions", ...guard, async (req, res) => {
    try {
      const { userId, type, totalLessons, remainingLessons, isPaid } = req.body;
      if (!userId) return res.status(400).json({ message: "userId обязателен" });
      const [sub] = await db.insert(subscriptions).values({
        userId: Number(userId),
        type: type ?? "individual",
        totalLessons: Number(totalLessons) || 8,
        remainingLessons: Number(remainingLessons) || Number(totalLessons) || 8,
        isPaid: isPaid ?? false,
      }).returning();
      res.json(sub);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.patch("/api/admin/subscriptions/:id/paid", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [updated] = await db
        .update(subscriptions)
        .set({ isPaid: true })
        .where(eq(subscriptions.id, id))
        .returning();
      if (!updated) return res.status(404).json({ message: "Абонемент не найден" });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.get("/api/admin/schedule", ...guard, async (req, res) => {
    try {
      const all = await db.select().from(scheduleSlots).orderBy(scheduleSlots.dayOfWeek, scheduleSlots.time);
      res.json(all);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.post("/api/admin/schedule", ...guard, async (req, res) => {
    try {
      const { dayOfWeek, time, title, maxStudents, isActive, slotType, specificDate } = req.body;
      if (!time) return res.status(400).json({ message: "Время обязательно" });

      const existing = await db.select().from(scheduleSlots)
        .where(eq(scheduleSlots.time, time));
      const conflict = existing.find(s =>
        specificDate
          ? s.specificDate === specificDate
          : s.dayOfWeek === dayOfWeek && !s.specificDate
      );
      if (conflict) {
        return res.status(409).json({ message: `Слот ${time} уже существует` });
      }

      const [slot] = await db.insert(scheduleSlots).values({
        dayOfWeek: dayOfWeek ?? null,
        time,
        title: title ?? null,
        maxStudents: Number(maxStudents) || 1,
        isActive: isActive ?? true,
        slotType: slotType ?? "individual",
        specificDate: specificDate ?? null,
      }).returning();
      res.json(slot);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.delete("/api/admin/schedule/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(scheduleSlots).where(eq(scheduleSlots.id, id));
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.get("/api/reviews", async (_req, res) => {
    try {
      const all = await db.select().from(reviews)
        .where(eq(reviews.isVisible, true))
        .orderBy(desc(reviews.id));
      res.json(all);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.get("/api/admin/reviews", ...guard, async (_req, res) => {
    try {
      const all = await db.select().from(reviews).orderBy(desc(reviews.id));
      res.json(all);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.post("/api/admin/reviews", ...guard, async (req, res) => {
    try {
      const { name, date, subject, rating, text, isVisible } = req.body;
      const [review] = await db.insert(reviews).values({
        name,
        date,
        subject: subject ?? "Физика",
        rating: rating ?? 5,
        text,
        isVisible: isVisible ?? true,
      }).returning();
      res.json(review);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.patch("/api/admin/reviews/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, date, subject, rating, text, isVisible } = req.body;
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (date !== undefined) updates.date = date;
      if (subject !== undefined) updates.subject = subject;
      if (rating !== undefined) updates.rating = rating;
      if (text !== undefined) updates.text = text;
      if (isVisible !== undefined) updates.isVisible = isVisible;
      const [updated] = await db.update(reviews).set(updates).where(eq(reviews.id, id)).returning();
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.delete("/api/admin/reviews/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(reviews).where(eq(reviews.id, id));
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });
}
