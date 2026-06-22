import type { Express, Request } from "express";
import { db } from "./db";
import { users, accounts, bookings, subscriptions, scheduleSlots, reviews, adminActions, botActivity, payments, studentProfiles, homeworkAssignments, homeworkSubmissions, lessonJournalEntries, studentMaterials, roadmapTopics, siteSettings } from "@shared/schema";
import { eq, desc, and, gte, lte, sql, ne, isNotNull, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "./auth";

function getAdminEmail(req: Request): string {
  const user = req.user as any;
  return user?.email || user?.account?.email || "admin";
}

async function sendTelegramNotification(telegramId: number | null | undefined, text: string) {
  if (!telegramId) return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: telegramId, text }),
    });
  } catch (e) {
    console.error("[telegram] notification failed:", e);
  }
}

async function logAction(
  performedBy: string,
  action: string,
  entity: string,
  entityId: number | null,
  details: Record<string, any>
) {
  try {
    await db.insert(adminActions).values({
      action,
      entity,
      entityId: entityId ?? null,
      details: JSON.stringify(details),
      performedBy,
    });
  } catch (e) {
    console.error("[admin_log] Failed to log action:", e);
  }
}

export function registerAdminRoutes(app: Express) {
  const guard = [requireAuth, requireAdmin];

  // ─── USERS ────────────────────────────────────────────────────────────────

  app.get("/api/admin/users", ...guard, async (req, res) => {
    try {
      const all = await db
        .select({
          id: users.id,
          telegramId: users.telegramId,
          firstName: users.firstName,
          lastName: users.lastName,
          age: users.age,
          grade: users.grade,
          goal: users.goal,
          phone: users.phone,
          telegramUsername: users.telegramUsername,
          name: users.name,
          boardRoomId: users.boardRoomId,
          createdAt: users.createdAt,
          accountEmail: accounts.email,
          accountRole: accounts.role,
        })
        .from(users)
        .leftJoin(accounts, eq(accounts.userId, users.id))
        .orderBy(desc(users.createdAt));
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
      await logAction(getAdminEmail(req), "create_user", "user", user.id, {
        firstName, lastName, phone, telegramUsername
      });
      res.json(user);
    } catch (e: any) {
      if (e?.code === "23505") {
        res.status(409).json({ message: "Пользователь уже существует" });
      } else {
        res.status(500).json({ message: "Ошибка сервера" });
      }
    }
  });

  app.get("/api/admin/users/:id/details", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) return res.status(404).json({ message: "Ученик не найден" });

      const userBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.userId, id))
        .orderBy(desc(bookings.createdAt));

      const userSubs = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, id))
        .orderBy(desc(subscriptions.createdAt));

      const userPayments = await db
        .select()
        .from(payments)
        .leftJoin(subscriptions, eq(payments.subscriptionId, subscriptions.id))
        .where(and(eq(subscriptions.userId, id), eq(payments.status, "succeeded")));

      const totalPaid = userPayments.reduce((sum, p) => sum + parseFloat(p.payments.amount || "0"), 0);

      const lastActivity = await db
        .select()
        .from(botActivity)
        .where(eq(botActivity.userId, id))
        .orderBy(desc(botActivity.date))
        .limit(1);

      res.json({
        user,
        bookings: userBookings,
        subscriptions: userSubs,
        totalPaid,
        lastBotActivity: lastActivity[0]?.date ?? null,
      });
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ─── BOOKINGS ─────────────────────────────────────────────────────────────

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
          paymentMethod: bookings.paymentMethod,
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
      const { userId, type, date, time, status, isPaid, paymentMethod } = req.body;
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
        paymentMethod: paymentMethod ?? null,
      }).returning();
      await logAction(getAdminEmail(req), "create_booking", "booking", booking.id, {
        userId, date, time, type, status, isPaid, paymentMethod
      });
      res.json(booking);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.patch("/api/admin/bookings/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, isPaid, paymentMethod, subscriptionId } = req.body;
      const [prevBooking] = await db.select().from(bookings).where(eq(bookings.id, id));
      const updates: Partial<typeof bookings.$inferInsert> = {};
      if (status !== undefined) updates.status = status;
      if (isPaid !== undefined) updates.isPaid = isPaid;
      if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;

      const [updated] = await db.update(bookings).set(updates).where(eq(bookings.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Запись не найдена" });

      if (isPaid === true && paymentMethod === "subscription" && subscriptionId) {
        const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, Number(subscriptionId)));
        if (sub && sub.remainingLessons > 0) {
          await db.update(subscriptions)
            .set({ remainingLessons: sub.remainingLessons - 1 })
            .where(eq(subscriptions.id, Number(subscriptionId)));
          await logAction(getAdminEmail(req), "deduct_lesson_on_payment", "subscription", Number(subscriptionId), {
            bookingId: id, remainingBefore: sub.remainingLessons
          });
        }
      }

      // Send Telegram notification when booking status changes
      if (status && prevBooking && status !== prevBooking.status) {
        const [bookingUser] = await db.select().from(users).where(eq(users.id, updated.userId));
        if (bookingUser?.telegramId) {
          const typeText = updated.type === "individual" ? "индивидуальное" : "групповое";
          if (status === "confirmed") {
            await sendTelegramNotification(bookingUser.telegramId,
              `✅ Ваша запись подтверждена!\n\n📚 ${typeText.charAt(0).toUpperCase() + typeText.slice(1)} занятие\n📅 ${updated.date} в ${updated.time}\n\nДо встречи! 🎓`
            );
          } else if (status === "cancelled") {
            await sendTelegramNotification(bookingUser.telegramId,
              `❌ Ваша запись отменена.\n\n📚 ${typeText.charAt(0).toUpperCase() + typeText.slice(1)} занятие\n📅 ${updated.date} в ${updated.time}\n\nЕсли у вас вопросы, напишите @anisimovvd`
            );
          } else if (status === "completed") {
            await sendTelegramNotification(bookingUser.telegramId,
              `🎓 Занятие завершено!\n\n📅 ${updated.date} в ${updated.time}\nСпасибо за работу! До следующего раза 🚀`
            );
          }
        }
      }

      await logAction(getAdminEmail(req), "update_booking", "booking", id, { status, isPaid, paymentMethod });
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
      if (user.telegramId) {
        await sendTelegramNotification(user.telegramId, message);
      }
      console.log(`[NOTIFY] user ${userId} (tg:${user.telegramId}): ${message}`);
      await logAction(getAdminEmail(req), "notify_user", "user", Number(userId), { message });
      res.json({ success: true, sentToTelegram: !!user.telegramId });
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────

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
          status: subscriptions.status,
          createdAt: subscriptions.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            name: users.name,
            phone: users.phone,
            telegramUsername: users.telegramUsername,
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
        status: "active",
      }).returning();
      await logAction(getAdminEmail(req), "create_subscription", "subscription", sub.id, {
        userId, type, totalLessons, remainingLessons, isPaid
      });
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
        .set({ isPaid: true, status: "active" })
        .where(eq(subscriptions.id, id))
        .returning();
      if (!updated) return res.status(404).json({ message: "Абонемент не найден" });
      await logAction(getAdminEmail(req), "mark_subscription_paid", "subscription", id, {});
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.patch("/api/admin/subscriptions/:id/adjust", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { delta, reason } = req.body;
      if (typeof delta !== "number") return res.status(400).json({ message: "delta обязателен" });

      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
      if (!sub) return res.status(404).json({ message: "Абонемент не найден" });

      const newRemaining = Math.max(0, sub.remainingLessons + delta);
      const newTotal = delta > 0 ? sub.totalLessons + delta : sub.totalLessons;

      const [updated] = await db
        .update(subscriptions)
        .set({ remainingLessons: newRemaining, totalLessons: newTotal })
        .where(eq(subscriptions.id, id))
        .returning();

      const actionName = delta > 0 ? "add_lessons" : "deduct_lesson";
      await logAction(getAdminEmail(req), actionName, "subscription", id, {
        delta,
        reason: reason || "",
        remainingBefore: sub.remainingLessons,
        remainingAfter: newRemaining,
      });

      res.json(updated);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.patch("/api/admin/subscriptions/:id/cancel", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { reason } = req.body;
      const [updated] = await db
        .update(subscriptions)
        .set({ status: "cancelled" })
        .where(eq(subscriptions.id, id))
        .returning();
      if (!updated) return res.status(404).json({ message: "Абонемент не найден" });
      await logAction(getAdminEmail(req), "cancel_subscription", "subscription", id, {
        reason: reason || ""
      });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ─── SCHEDULE ─────────────────────────────────────────────────────────────

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

      const existing = await db.select().from(scheduleSlots).where(eq(scheduleSlots.time, time));
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
      await logAction(getAdminEmail(req), "create_schedule_slot", "schedule", slot.id, { time, dayOfWeek, slotType });
      res.json(slot);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.delete("/api/admin/schedule/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(scheduleSlots).where(eq(scheduleSlots.id, id));
      await logAction(getAdminEmail(req), "delete_schedule_slot", "schedule", id, {});
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ─── REVIEWS ──────────────────────────────────────────────────────────────

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
      await logAction(getAdminEmail(req), "create_review", "review", review.id, { name, rating });
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
      await logAction(getAdminEmail(req), "update_review", "review", id, { isVisible });
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.delete("/api/admin/reviews/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(reviews).where(eq(reviews.id, id));
      await logAction(getAdminEmail(req), "delete_review", "review", id, {});
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ─── HISTORY ──────────────────────────────────────────────────────────────

  app.get("/api/admin/actions", ...guard, async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const offset = (page - 1) * limit;

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(adminActions);

      const actions = await db
        .select()
        .from(adminActions)
        .orderBy(desc(adminActions.createdAt))
        .limit(limit)
        .offset(offset);

      res.json({ actions, total, page, limit, pages: Math.ceil(total / limit) });
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ─── ANALYTICS ────────────────────────────────────────────────────────────

  app.get("/api/admin/analytics", ...guard, async (req, res) => {
    try {
      const allUsers = await db.select({ id: users.id, createdAt: users.createdAt }).from(users);
      const allAccounts = await db.select({ isEmailVerified: accounts.isEmailVerified, userId: accounts.userId }).from(accounts);
      const allBookings = await db.select({ userId: bookings.userId, isPaid: bookings.isPaid, createdAt: bookings.createdAt }).from(bookings);
      const allSubs = await db.select({ userId: subscriptions.userId, isPaid: subscriptions.isPaid, createdAt: subscriptions.createdAt }).from(subscriptions);
      const allPayments = await db.select({ amount: payments.amount, status: payments.status, createdAt: payments.createdAt }).from(payments);

      const totalUsers = allUsers.length;
      const verifiedEmailUserIds = new Set(
        allAccounts.filter(a => a.isEmailVerified && a.userId).map(a => a.userId!)
      );
      const verifiedEmails = verifiedEmailUserIds.size;

      const usersWithBooking = new Set(allBookings.map(b => b.userId)).size;
      const usersWithPaidBooking = new Set(
        allBookings.filter(b => b.isPaid).map(b => b.userId)
      ).size;
      const usersWithActiveSub = new Set(
        allSubs.filter(s => s.isPaid).map(s => s.userId)
      ).size;
      const usersPaid = Math.max(usersWithPaidBooking, usersWithActiveSub);

      const revenueByMonth: Record<string, number> = {};
      for (const p of allPayments) {
        if (p.status === "succeeded") {
          const d = new Date(p.createdAt);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          revenueByMonth[key] = (revenueByMonth[key] || 0) + parseFloat(p.amount || "0");
        }
      }

      const sortedRevenue = Object.entries(revenueByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({ month, amount }));

      const activityByDay = await db
        .select({
          date: botActivity.date,
          count: sql<number>`count(distinct ${botActivity.userId})::int`,
        })
        .from(botActivity)
        .groupBy(botActivity.date)
        .orderBy(botActivity.date);

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      const lastBookingByUser: Record<number, Date> = {};
      for (const b of allBookings) {
        const d = new Date(b.createdAt);
        if (!lastBookingByUser[b.userId] || d > lastBookingByUser[b.userId]) {
          lastBookingByUser[b.userId] = d;
        }
      }

      const attentionUserIds = Object.entries(lastBookingByUser)
        .filter(([, d]) => d < cutoff)
        .map(([id]) => Number(id));

      const attentionUsers = allUsers
        .filter(u => attentionUserIds.includes(u.id))
        .map(u => ({
          id: u.id,
          lastBookingDate: lastBookingByUser[u.id]?.toISOString() ?? null,
        }));

      const attentionWithNames = await Promise.all(
        attentionUsers.slice(0, 10).map(async (u) => {
          const [user] = await db.select({ firstName: users.firstName, lastName: users.lastName, telegramUsername: users.telegramUsername }).from(users).where(eq(users.id, u.id));
          return { ...u, ...user };
        })
      );

      res.json({
        funnel: { totalUsers, verifiedEmails, hadBooking: usersWithBooking, paid: usersPaid },
        revenueByMonth: sortedRevenue,
        botActivityByDay: activityByDay,
        attentionStudents: attentionWithNames,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Student profiles ───────────────────────────────────────────────────────
  app.get("/api/admin/users/:id/profile", ...guard, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const [profile] = await db.select().from(studentProfiles)
        .where(eq(studentProfiles.userId, userId));
      return res.json(profile || null);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.put("/api/admin/users/:id/profile", ...guard, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { roadmap, tutorNotes, homework, materials, lessonNotes } = req.body;
      const [existing] = await db.select().from(studentProfiles)
        .where(eq(studentProfiles.userId, userId));
      const data = {
        roadmap: roadmap ?? null,
        tutorNotes: tutorNotes ?? null,
        homework: homework ?? null,
        materials: materials ?? null,
        lessonNotes: lessonNotes ?? null,
        updatedAt: new Date(),
      };
      let profile;
      if (existing) {
        [profile] = await db.update(studentProfiles).set(data)
          .where(eq(studentProfiles.userId, userId)).returning();
      } else {
        [profile] = await db.insert(studentProfiles).values({ userId, ...data }).returning();
      }
      await logAction(getAdminEmail(req), "update_student_profile", "user", userId, {});
      return res.json(profile);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Homework Assignments ────────────────────────────────────────────────────
  app.get("/api/admin/users/:userId/homework", ...guard, async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const list = await db.select().from(homeworkAssignments)
        .where(eq(homeworkAssignments.userId, userId))
        .orderBy(desc(homeworkAssignments.createdAt));
      const withSubs = await Promise.all(list.map(async (hw) => {
        const [sub] = await db.select().from(homeworkSubmissions)
          .where(eq(homeworkSubmissions.homeworkId, hw.id)).orderBy(desc(homeworkSubmissions.submittedAt)).limit(1);
        return { ...hw, submission: sub || null };
      }));
      return res.json(withSubs);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.post("/api/admin/users/:userId/homework", ...guard, async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const { title, description, dueDate, bookingId } = req.body;
      if (!title) return res.status(400).json({ message: "Название обязательно" });
      const [hw] = await db.insert(homeworkAssignments).values({
        userId, title, description: description || null,
        dueDate: dueDate || null, bookingId: bookingId || null, status: "assigned",
      }).returning();
      await logAction(getAdminEmail(req), "create_homework", "homework", hw.id, { userId, title });
      return res.json(hw);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.patch("/api/admin/homework/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { title, description, dueDate, status, adminFeedback } = req.body;
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (dueDate !== undefined) updates.dueDate = dueDate;
      if (status !== undefined) updates.status = status;
      if (adminFeedback !== undefined) updates.adminFeedback = adminFeedback;
      const [updated] = await db.update(homeworkAssignments).set(updates).where(eq(homeworkAssignments.id, id)).returning();
      await logAction(getAdminEmail(req), "update_homework", "homework", id, { status });
      return res.json(updated);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.delete("/api/admin/homework/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(homeworkAssignments).where(eq(homeworkAssignments.id, id));
      await logAction(getAdminEmail(req), "delete_homework", "homework", id, {});
      return res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Lesson Journal ──────────────────────────────────────────────────────────
  app.get("/api/admin/users/:userId/journal", ...guard, async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const list = await db.select().from(lessonJournalEntries)
        .where(eq(lessonJournalEntries.userId, userId))
        .orderBy(desc(lessonJournalEntries.createdAt));
      return res.json(list);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.post("/api/admin/users/:userId/journal", ...guard, async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const { date, topic, coveredSummary, nextSteps, parentNote, bookingId } = req.body;
      if (!date || !topic) return res.status(400).json({ message: "Дата и тема обязательны" });
      const [entry] = await db.insert(lessonJournalEntries).values({
        userId, date, topic,
        coveredSummary: coveredSummary || null,
        nextSteps: nextSteps || null,
        parentNote: parentNote || null,
        bookingId: bookingId || null,
      }).returning();
      await logAction(getAdminEmail(req), "create_journal_entry", "journal", entry.id, { userId, date, topic });
      return res.json(entry);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.patch("/api/admin/journal/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { date, topic, coveredSummary, nextSteps, parentNote } = req.body;
      const updates: Record<string, any> = {};
      if (date !== undefined) updates.date = date;
      if (topic !== undefined) updates.topic = topic;
      if (coveredSummary !== undefined) updates.coveredSummary = coveredSummary;
      if (nextSteps !== undefined) updates.nextSteps = nextSteps;
      if (parentNote !== undefined) updates.parentNote = parentNote;
      const [updated] = await db.update(lessonJournalEntries).set(updates).where(eq(lessonJournalEntries.id, id)).returning();
      await logAction(getAdminEmail(req), "update_journal_entry", "journal", id, {});
      return res.json(updated);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.delete("/api/admin/journal/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(lessonJournalEntries).where(eq(lessonJournalEntries.id, id));
      await logAction(getAdminEmail(req), "delete_journal_entry", "journal", id, {});
      return res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Student Materials ────────────────────────────────────────────────────────
  app.get("/api/admin/users/:userId/materials", ...guard, async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const list = await db.select().from(studentMaterials)
        .where(eq(studentMaterials.userId, userId))
        .orderBy(desc(studentMaterials.createdAt));
      return res.json(list);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.post("/api/admin/users/:userId/materials", ...guard, async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const { title, url, type, topicTag } = req.body;
      if (!title || !url) return res.status(400).json({ message: "Название и ссылка обязательны" });
      const [mat] = await db.insert(studentMaterials).values({
        userId, title, url,
        type: type || "theory",
        topicTag: topicTag || null,
      }).returning();
      await logAction(getAdminEmail(req), "create_material", "material", mat.id, { userId, title });
      return res.json(mat);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.patch("/api/admin/materials/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { title, url, type, topicTag } = req.body;
      const updates: Record<string, any> = {};
      if (title !== undefined) updates.title = title;
      if (url !== undefined) updates.url = url;
      if (type !== undefined) updates.type = type;
      if (topicTag !== undefined) updates.topicTag = topicTag;
      const [updated] = await db.update(studentMaterials).set(updates).where(eq(studentMaterials.id, id)).returning();
      await logAction(getAdminEmail(req), "update_material", "material", id, {});
      return res.json(updated);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.delete("/api/admin/materials/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(studentMaterials).where(eq(studentMaterials.id, id));
      await logAction(getAdminEmail(req), "delete_material", "material", id, {});
      return res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Roadmap Topics ───────────────────────────────────────────────────────────
  app.get("/api/admin/users/:userId/roadmap", ...guard, async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const list = await db.select().from(roadmapTopics)
        .where(eq(roadmapTopics.userId, userId))
        .orderBy(roadmapTopics.sortOrder, roadmapTopics.createdAt);
      return res.json(list);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.post("/api/admin/users/:userId/roadmap", ...guard, async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const { section, title, status, sortOrder } = req.body;
      if (!title) return res.status(400).json({ message: "Название темы обязательно" });
      const [topic] = await db.insert(roadmapTopics).values({
        userId,
        section: section || "Общее",
        title,
        status: status || "planned",
        sortOrder: sortOrder ?? 0,
      }).returning();
      await logAction(getAdminEmail(req), "create_roadmap_topic", "roadmap", topic.id, { userId, title });
      return res.json(topic);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.patch("/api/admin/roadmap/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { section, title, status, sortOrder } = req.body;
      const updates: Record<string, any> = {};
      if (section !== undefined) updates.section = section;
      if (title !== undefined) updates.title = title;
      if (status !== undefined) updates.status = status;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      const [updated] = await db.update(roadmapTopics).set(updates).where(eq(roadmapTopics.id, id)).returning();
      await logAction(getAdminEmail(req), "update_roadmap_topic", "roadmap", id, { status });
      return res.json(updated);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.delete("/api/admin/roadmap/:id", ...guard, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(roadmapTopics).where(eq(roadmapTopics.id, id));
      await logAction(getAdminEmail(req), "delete_roadmap_topic", "roadmap", id, {});
      return res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ─── SETTINGS ─────────────────────────────────────────────────────────────

  app.get("/api/admin/settings", ...guard, async (req, res) => {
    try {
      const rows = await db.select().from(siteSettings);
      const result: Record<string, string | null> = {};
      for (const row of rows) result[row.key] = row.value;
      res.json(result);
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.put("/api/admin/settings", ...guard, async (req, res) => {
    try {
      const { key, value } = req.body as { key: string; value: string | null };
      if (!key) return res.status(400).json({ message: "Не указан ключ" });
      await db.insert(siteSettings)
        .values({ key, value: value || null, updatedAt: new Date() })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: value || null, updatedAt: new Date() } });
      await logAction(getAdminEmail(req), "update_setting", "settings", 0, { key, value });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });
}
