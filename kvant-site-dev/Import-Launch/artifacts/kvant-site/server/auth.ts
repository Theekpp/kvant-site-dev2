import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import {
  accounts, refreshTokens, emailTokens, users, bookings, subscriptions, scheduleSlots, recordings, studentProfiles,
  homeworkAssignments, homeworkSubmissions, lessonJournalEntries, studentMaterials, roadmapTopics,
} from "@shared/schema";
import { eq, and, gt, desc, asc, ne } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import crypto from "crypto";
import { AccessToken, EgressClient } from "livekit-server-sdk";

const LK_API_KEY = process.env.LIVEKIT_API_KEY || "APIE489774A8A86034D";
const LK_API_SECRET = process.env.LIVEKIT_API_SECRET || "e27ffd8d0268aa8c9f9ef04e2c2e3f7e7b9c69a9f78d2fe979370c073a06f6bb";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5000";
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Слишком много попыток. Попробуйте через 15 минут." },
});

const registerSchema = z.object({
  email: z.string().email("Неверный формат email"),
  password: z.string().min(8, "Минимум 8 символов"),
  firstName: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

declare global {
  namespace Express {
    interface Request {
      accountId?: number;
    }
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.accountId) {
    return res.status(401).json({ message: "Не авторизован" });
  }
  try {
    const [account] = await db.select({ role: accounts.role })
      .from(accounts)
      .where(eq(accounts.id, req.accountId));
    if (!account || account.role !== "admin") {
      return res.status(403).json({ message: "Недостаточно прав" });
    }
    next();
  } catch {
    return res.status(500).json({ message: "Ошибка сервера" });
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Не авторизован" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET) as { accountId: number };
    req.accountId = payload.accountId;
    next();
  } catch {
    return res.status(401).json({ message: "Токен недействителен" });
  }
}

async function notifyAdminNewBooking(
  booking: typeof bookings.$inferSelect,
  studentUser: typeof users.$inferSelect | undefined
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  // Try ADMIN_CHAT_ID env var first, then query DB for admin account's telegramId
  let adminTelegramId: number | null = null;
  const envAdminId = parseInt(process.env.ADMIN_CHAT_ID || "");
  if (!isNaN(envAdminId) && envAdminId > 0) {
    adminTelegramId = envAdminId;
  } else {
    const [adminAcc] = await db.select({ userId: accounts.userId })
      .from(accounts).where(eq(accounts.role, "admin")).limit(1);
    if (adminAcc?.userId) {
      const [adminUser] = await db.select({ telegramId: users.telegramId })
        .from(users).where(eq(users.id, adminAcc.userId)).limit(1);
      adminTelegramId = adminUser?.telegramId || null;
    }
  }
  if (!adminTelegramId) return;

  const name = studentUser
    ? `${studentUser.firstName || ""} ${studentUser.lastName || ""}`.trim() || "Без имени"
    : "Без имени";
  const typeText = booking.type === "individual" ? "Индивидуальное" : "Групповое";

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminTelegramId,
        text:
          `📝 Новая запись с сайта!\n\n` +
          `👤 ${name}\n` +
          `📱 ${studentUser?.phone || "телефон не указан"}\n` +
          `📚 ${typeText} занятие\n` +
          `📅 ${booking.date} в ${booking.time}\n` +
          `🆔 Запись #${booking.id}`,
        reply_markup: JSON.stringify({
          inline_keyboard: [[
            { text: "✅ Подтвердить", callback_data: `confirm_booking_${booking.id}` },
            { text: "❌ Отклонить", callback_data: `reject_booking_${booking.id}` },
          ]],
        }),
      }),
    });
  } catch (e) {
    console.error("[telegram] admin booking notification failed:", e);
  }
}

export function registerAuthRoutes(app: Express) {
  // ── Register ──────────────────────────────────────────────────────────────
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }
    const { email, password, firstName, phone } = parsed.data;

    try {
      const [existing] = await db.select().from(accounts)
        .where(eq(accounts.email, email.toLowerCase()));
      if (existing) {
        return res.status(409).json({ message: "Email уже зарегистрирован" });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      let userId: number | null = null;
      if (phone) {
        const [matchingUser] = await db.select().from(users)
          .where(eq(users.phone, phone));
        if (matchingUser) userId = matchingUser.id;
      }

      const [account] = await db.insert(accounts).values({
        email: email.toLowerCase(),
        passwordHash,
        firstName: firstName || null,
        phone: phone || null,
        userId,
      }).returning();

      const token = crypto.randomBytes(32).toString("hex");
      await db.insert(emailTokens).values({
        accountId: account.id,
        token,
        type: "verify",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      if (process.env.RESEND_API_KEY) {
        await getResend().emails.send({
          from: `Физика с Кириллом <${FROM_EMAIL}>`,
          to: email,
          subject: "Подтвердите email",
          html: `
            <h2>Подтверждение регистрации</h2>
            <p>Нажмите кнопку ниже, чтобы подтвердить email:</p>
            <a href="${FRONTEND_URL}/verify-email?token=${token}"
               style="display:inline-block;padding:12px 24px;background:#4F46E5;color:white;border-radius:8px;text-decoration:none;">
              Подтвердить email
            </a>
            <p style="color:#666;font-size:14px;">Ссылка действительна 24 часа.</p>
          `,
        });
      } else {
        const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
        console.log(`[DEV] Verification link for ${email}: ${verifyUrl}`);
      }

      return res.status(201).json({ message: "Проверьте почту для подтверждения регистрации" });
    } catch (err) {
      console.error("Register error:", err);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Неверные данные" });
    }
    const { email, password } = parsed.data;

    try {
      const [account] = await db.select().from(accounts)
        .where(eq(accounts.email, email.toLowerCase()));
      if (!account) {
        return res.status(401).json({ message: "Неверный email или пароль" });
      }
      if (!account.isEmailVerified) {
        return res.status(403).json({ message: "Подтвердите email перед входом" });
      }

      const isValid = await bcrypt.compare(password, account.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Неверный email или пароль" });
      }

      const accessToken = jwt.sign(
        { accountId: account.id },
        JWT_ACCESS_SECRET,
        { expiresIn: "15m" },
      );
      const refreshToken = jwt.sign(
        { accountId: account.id },
        JWT_REFRESH_SECRET,
        { expiresIn: "30d" },
      );

      const tokenHash = await bcrypt.hash(refreshToken, 10);
      await db.insert(refreshTokens).values({
        accountId: account.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        accessToken,
        account: { id: account.id, email: account.email, firstName: account.firstName },
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Refresh ───────────────────────────────────────────────────────────────
  app.post("/api/auth/refresh", async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Не авторизован" });
    }

    try {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { accountId: number };
      const tokens = await db.select().from(refreshTokens)
        .where(and(
          eq(refreshTokens.accountId, payload.accountId),
          gt(refreshTokens.expiresAt, new Date()),
        ));

      let matched: typeof tokens[0] | null = null;
      for (const t of tokens) {
        if (await bcrypt.compare(refreshToken, t.tokenHash)) {
          matched = t;
          break;
        }
      }

      if (!matched) {
        return res.status(401).json({ message: "Токен недействителен" });
      }

      const accessToken = jwt.sign(
        { accountId: payload.accountId },
        JWT_ACCESS_SECRET,
        { expiresIn: "15m" },
      );
      return res.json({ accessToken });
    } catch {
      return res.status(401).json({ message: "Токен недействителен" });
    }
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { accountId: number };
        const tokens = await db.select().from(refreshTokens)
          .where(eq(refreshTokens.accountId, payload.accountId));
        for (const t of tokens) {
          if (await bcrypt.compare(refreshToken, t.tokenHash)) {
            await db.delete(refreshTokens).where(eq(refreshTokens.id, t.id));
            break;
          }
        }
      } catch { /* ignore */ }
    }
    res.clearCookie("refreshToken", { httpOnly: true, sameSite: "none", secure: true });
    return res.json({ message: "Выход выполнен" });
  });

  // ── Me ────────────────────────────────────────────────────────────────────
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const [account] = await db.select({
        id: accounts.id,
        email: accounts.email,
        firstName: accounts.firstName,
        phone: accounts.phone,
        role: accounts.role,
        isEmailVerified: accounts.isEmailVerified,
        userId: accounts.userId,
        createdAt: accounts.createdAt,
      }).from(accounts).where(eq(accounts.id, req.accountId!));

      if (!account) return res.status(404).json({ message: "Аккаунт не найден" });
      return res.json({ account });
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Verify Email ──────────────────────────────────────────────────────────
  app.get("/api/auth/verify-email", async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Токен не указан" });
    }

    try {
      const [emailToken] = await db.select().from(emailTokens)
        .where(and(
          eq(emailTokens.token, token),
          eq(emailTokens.type, "verify"),
          gt(emailTokens.expiresAt, new Date()),
        ));

      if (!emailToken) {
        return res.status(400).json({ message: "Токен недействителен или истёк" });
      }

      await db.update(accounts)
        .set({ isEmailVerified: true })
        .where(eq(accounts.id, emailToken.accountId));

      await db.delete(emailTokens).where(eq(emailTokens.id, emailToken.id));

      return res.json({ message: "Email успешно подтверждён" });
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Forgot Password ───────────────────────────────────────────────────────
  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    const { email } = req.body;
    const OK = { message: "Если email зарегистрирован, письмо отправлено" };

    try {
      const [account] = await db.select().from(accounts)
        .where(eq(accounts.email, (email || "").toLowerCase()));

      if (account) {
        await db.delete(emailTokens)
          .where(and(
            eq(emailTokens.accountId, account.id),
            eq(emailTokens.type, "reset"),
          ));

        const token = crypto.randomBytes(32).toString("hex");
        await db.insert(emailTokens).values({
          accountId: account.id,
          token,
          type: "reset",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });

        if (process.env.RESEND_API_KEY) {
          await getResend().emails.send({
            from: `Физика с Кириллом <${FROM_EMAIL}>`,
            to: account.email,
            subject: "Сброс пароля",
            html: `
              <h2>Сброс пароля</h2>
              <p>Нажмите кнопку ниже для сброса пароля:</p>
              <a href="${FRONTEND_URL}/reset-password?token=${token}"
                 style="display:inline-block;padding:12px 24px;background:#4F46E5;color:white;border-radius:8px;text-decoration:none;">
                Сбросить пароль
              </a>
              <p style="color:#666;font-size:14px;">Ссылка действительна 1 час.</p>
            `,
          });
        } else {
          const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
          console.log(`[DEV] Password reset link for ${account.email}: ${resetUrl}`);
        }
      }

      return res.json(OK);
    } catch {
      return res.json(OK);
    }
  });

  // ── Reset Password ────────────────────────────────────────────────────────
  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "Неверные данные" });
    }

    try {
      const [emailToken] = await db.select().from(emailTokens)
        .where(and(
          eq(emailTokens.token, token),
          eq(emailTokens.type, "reset"),
          gt(emailTokens.expiresAt, new Date()),
        ));

      if (!emailToken) {
        return res.status(400).json({ message: "Токен недействителен или истёк" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await db.update(accounts)
        .set({ passwordHash })
        .where(eq(accounts.id, emailToken.accountId));

      await db.delete(refreshTokens)
        .where(eq(refreshTokens.accountId, emailToken.accountId));

      await db.delete(emailTokens).where(eq(emailTokens.id, emailToken.id));

      return res.json({ message: "Пароль успешно изменён" });
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Cabinet: Board room (one permanent room per user) ─────────────────────
  app.get("/api/cabinet/board-room", requireAuth, async (req, res) => {
    try {
      const [account] = await db.select({ userId: accounts.userId })
        .from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account?.userId) return res.status(404).json({ message: "Профиль ученика не привязан" });

      const [user] = await db.select({ id: users.id, boardRoomId: users.boardRoomId })
        .from(users).where(eq(users.id, account.userId));
      if (!user) return res.status(404).json({ message: "Ученик не найден" });

      let { boardRoomId } = user;
      if (!boardRoomId) {
        boardRoomId = crypto.randomUUID();
        await db.update(users).set({ boardRoomId }).where(eq(users.id, user.id));
      }
      return res.json({ boardRoomId });
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Cabinet: Profile ──────────────────────────────────────────────────────
  app.get("/api/cabinet/me", requireAuth, async (req, res) => {
    try {
      const [account] = await db.select({
        id: accounts.id,
        email: accounts.email,
        firstName: accounts.firstName,
        phone: accounts.phone,
        userId: accounts.userId,
        createdAt: accounts.createdAt,
      }).from(accounts).where(eq(accounts.id, req.accountId!));

      if (!account) return res.status(404).json({ message: "Аккаунт не найден" });
      return res.json(account);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.patch("/api/cabinet/me", requireAuth, async (req, res) => {
    const { firstName, phone } = req.body;
    try {
      const [account] = await db.update(accounts)
        .set({
          firstName: firstName ?? undefined,
          phone: phone ?? undefined,
        })
        .where(eq(accounts.id, req.accountId!))
        .returning();
      return res.json(account);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Cabinet: Bookings ─────────────────────────────────────────────────────
  app.get("/api/cabinet/bookings", requireAuth, async (req, res) => {
    try {
      const [account] = await db.select().from(accounts)
        .where(eq(accounts.id, req.accountId!));
      if (!account?.userId) return res.json([]);

      const userBookings = await db.select().from(bookings)
        .where(eq(bookings.userId, account.userId))
        .orderBy(desc(bookings.createdAt));
      return res.json(userBookings);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.post("/api/cabinet/bookings", requireAuth, async (req, res) => {
    const { type, date, time, groupScheduleId } = req.body;
    try {
      if (!type || !date || !time) {
        return res.status(400).json({ message: "Не хватает данных для записи" });
      }
      if (type !== "individual" && type !== "group") {
        return res.status(400).json({ message: "Неверный тип занятия" });
      }

      // Reject past dates (date format: DD.MM.YYYY)
      const dateMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date);
      if (!dateMatch) {
        return res.status(400).json({ message: "Неверный формат даты" });
      }
      const [, dd, mm, yyyy] = dateMatch;
      const slotDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (slotDate < today) {
        return res.status(400).json({ message: "Нельзя записаться на прошедшую дату" });
      }

      const [account] = await db.select().from(accounts)
        .where(eq(accounts.id, req.accountId!));
      if (!account?.userId) {
        return res.status(400).json({ message: "Аккаунт не привязан к пользователю" });
      }

      // Find an active paid subscription matching the booking type with remaining lessons
      const [activeSub] = await db.select().from(subscriptions)
        .where(and(
          eq(subscriptions.userId, account.userId),
          eq(subscriptions.type, type),
          eq(subscriptions.isPaid, true),
          eq(subscriptions.status, "active"),
          gt(subscriptions.remainingLessons, 0),
        ))
        .limit(1);

      // Booking requires an active paid subscription of the matching type
      if (!activeSub) {
        const typeLabel = type === "individual" ? "индивидуальные" : "групповые";
        return res.status(402).json({
          message: `Для записи нужен оплаченный абонемент на ${typeLabel} занятия. Оформите тариф в разделе «Выбрать тариф».`,
        });
      }

      // Create a pending booking (admin confirms) with a unique board room id
      const { randomUUID } = await import("crypto");
      const [booking] = await db.insert(bookings).values({
        userId: account.userId,
        type,
        date,
        time,
        groupScheduleId: groupScheduleId || null,
        status: "pending",
        isPaid: true,
        paymentMethod: "subscription",
        roomId: randomUUID(),
      }).returning();

      // Deduct one lesson from the subscription
      await db.update(subscriptions)
        .set({ remainingLessons: activeSub.remainingLessons - 1 })
        .where(eq(subscriptions.id, activeSub.id));

      // Notify admin via Telegram with inline confirm/reject buttons
      const [studentUser] = await db.select().from(users).where(eq(users.id, account.userId));
      notifyAdminNewBooking(booking, studentUser).catch(() => {});

      return res.status(201).json(booking);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.delete("/api/cabinet/bookings/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Неверный id" });

    const CANCELLATION_DEADLINE_HOURS = 24;

    try {
      const [account] = await db.select().from(accounts)
        .where(eq(accounts.id, req.accountId!));
      if (!account?.userId) return res.status(403).json({ message: "Нет доступа" });

      const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
      if (!booking) return res.status(404).json({ message: "Запись не найдена" });
      if (booking.userId !== account.userId) return res.status(403).json({ message: "Нет доступа" });
      if (booking.status !== "confirmed" && booking.status !== "pending") {
        return res.status(400).json({ message: "Можно отменить только подтверждённые или ожидающие занятия" });
      }

      // For confirmed bookings, validate 24h cancellation window
      if (booking.status === "confirmed") {
        const dm = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(booking.date);
        const tm = /^(\d{1,2}):(\d{2})$/.exec(booking.time);
        if (!dm || !tm) {
          return res.status(400).json({ message: "Некорректные дата/время записи" });
        }
        const lessonAt = new Date(
          Number(dm[3]), Number(dm[2]) - 1, Number(dm[1]),
          Number(tm[1]), Number(tm[2]), 0, 0
        );
        const hoursLeft = (lessonAt.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursLeft < CANCELLATION_DEADLINE_HOURS) {
          return res.status(400).json({
            message: `Отмена доступна не позднее чем за ${CANCELLATION_DEADLINE_HOURS} часа до начала занятия.`,
          });
        }
      }

      const [updated] = await db.update(bookings)
        .set({ status: "cancelled" })
        .where(eq(bookings.id, id))
        .returning();

      // Refund the lesson into an active paid subscription of the same type.
      // Pick a partially-used active subscription (remainingLessons < totalLessons),
      // preferring the oldest such sub so it gets used up first.
      if (booking.paymentMethod === "subscription") {
        const candidateSubs = await db.select().from(subscriptions)
          .where(and(
            eq(subscriptions.userId, account.userId),
            eq(subscriptions.type, booking.type),
            eq(subscriptions.isPaid, true),
            eq(subscriptions.status, "active"),
          ))
          .orderBy(asc(subscriptions.createdAt));

        const refundTarget = candidateSubs.find(s => s.remainingLessons < s.totalLessons)
          || candidateSubs[0];
        if (refundTarget) {
          const newRemaining = Math.min(
            refundTarget.totalLessons,
            refundTarget.remainingLessons + 1,
          );
          await db.update(subscriptions)
            .set({ remainingLessons: newRemaining })
            .where(eq(subscriptions.id, refundTarget.id));
        }
      }

      return res.json(updated);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Cabinet: Subscriptions ────────────────────────────────────────────────
  app.get("/api/cabinet/subscriptions", requireAuth, async (req, res) => {
    try {
      const [account] = await db.select().from(accounts)
        .where(eq(accounts.id, req.accountId!));
      if (!account?.userId) return res.json([]);

      const userSubs = await db.select().from(subscriptions)
        .where(eq(subscriptions.userId, account.userId))
        .orderBy(desc(subscriptions.createdAt));
      return res.json(userSubs);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.post("/api/cabinet/subscriptions", requireAuth, async (req, res) => {
    const { type, totalLessons } = req.body;
    if (!type || !totalLessons) {
      return res.status(400).json({ message: "Укажите тип и количество занятий" });
    }
    try {
      let [account] = await db.select().from(accounts)
        .where(eq(accounts.id, req.accountId!));
      if (!account) return res.status(404).json({ message: "Аккаунт не найден" });

      let userId = account.userId;
      if (!userId) {
        const [newUser] = await db.insert(users).values({
          firstName: account.firstName,
          phone: account.phone,
        }).returning();
        userId = newUser.id;
        await db.update(accounts).set({ userId }).where(eq(accounts.id, account.id));
      }

      const [sub] = await db.insert(subscriptions).values({
        userId,
        type,
        totalLessons,
        remainingLessons: totalLessons,
        isPaid: false,
      }).returning();
      return res.status(201).json(sub);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Public: Schedule ──────────────────────────────────────────────────────
  app.get("/api/schedule", async (_req, res) => {
    try {
      const slots = await db.select().from(scheduleSlots)
        .where(eq(scheduleSlots.isActive, true));
      return res.json(slots);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Video conference tokens ────────────────────────────────────────────────

  app.post("/api/cabinet/video-token", requireAuth, async (req, res) => {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: "bookingId обязателен" });
    try {
      const [account] = await db.select({ userId: accounts.userId, firstName: accounts.firstName })
        .from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account?.userId) return res.status(403).json({ message: "Нет профиля ученика" });

      const [booking] = await db.select({ id: bookings.id, userId: bookings.userId })
        .from(bookings).where(and(eq(bookings.id, Number(bookingId)), eq(bookings.userId, account.userId)));
      if (!booking) return res.status(403).json({ message: "Запись не найдена" });

      const roomName = `booking-${booking.id}`;
      const at = new AccessToken(LK_API_KEY, LK_API_SECRET, {
        identity: `student-${account.userId}`,
        name: account.firstName || `Ученик ${account.userId}`,
      });
      at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
      const token = await at.toJwt();
      return res.json({ token, roomName });
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.post("/api/admin/video-token", requireAuth, requireAdmin, async (req, res) => {
    const { bookingId, roomName: rawRoom } = req.body;
    if (!bookingId && !rawRoom) return res.status(400).json({ message: "bookingId или roomName обязателен" });
    try {
      const roomName = rawRoom || `booking-${bookingId}`;
      const at = new AccessToken(LK_API_KEY, LK_API_SECRET, {
        identity: "teacher",
        name: "Преподаватель",
      });
      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canUpdateOwnMetadata: true,
        roomAdmin: true,
      });
      const token = await at.toJwt();
      return res.json({ token, roomName });
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Recording (LiveKit Egress) ──────────────────────────────────────────────

  function getEgressClient(): EgressClient | null {
    const host = process.env.LIVEKIT_HOST;
    if (!host) return null;
    return new EgressClient(host, LK_API_KEY, LK_API_SECRET);
  }

  app.post("/api/admin/recording/start", requireAuth, requireAdmin, async (req, res) => {
    const { roomName, bookingId } = req.body;
    if (!roomName) return res.status(400).json({ message: "roomName обязателен" });
    const client = getEgressClient();
    if (!client) return res.status(503).json({ message: "Сервер записи не настроен. Добавьте LIVEKIT_HOST в переменные окружения." });
    try {
      const existing = await db.select().from(recordings)
        .where(and(eq(recordings.roomName, roomName), eq(recordings.status, "recording")));
      if (existing.length > 0) return res.status(409).json({ message: "Запись уже идёт", egressId: existing[0].egressId, id: existing[0].id });

      const filename = `${roomName}_${Date.now()}.mp4`;
      const info = await client.startRoomCompositeEgress(roomName, {
        file: { filepath: `/recordings/${filename}` },
      }, { layout: "speaker-dark" });

      const [rec] = await db.insert(recordings).values({
        egressId: info.egressId,
        roomName,
        bookingId: bookingId ? Number(bookingId) : null,
        filename,
        status: "recording",
      }).returning();
      return res.json({ egressId: info.egressId, id: rec.id });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Ошибка запуска записи" });
    }
  });

  app.post("/api/admin/recording/stop", requireAuth, requireAdmin, async (req, res) => {
    const { egressId } = req.body;
    if (!egressId) return res.status(400).json({ message: "egressId обязателен" });
    const client = getEgressClient();
    if (!client) return res.status(503).json({ message: "Сервер записи не настроен" });
    try {
      await client.stopEgress(egressId);
      const [rec] = await db.select().from(recordings).where(eq(recordings.egressId, egressId));
      if (rec) {
        const durationSec = rec.startedAt ? Math.round((Date.now() - new Date(rec.startedAt).getTime()) / 1000) : null;
        const baseUrl = process.env.RECORDINGS_BASE_URL || "";
        const fileUrl = baseUrl && rec.filename ? `${baseUrl}/${rec.filename}` : null;
        await db.update(recordings)
          .set({ status: "completed", endedAt: new Date(), durationSeconds: durationSec, fileUrl })
          .where(eq(recordings.egressId, egressId));
      }
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Ошибка остановки записи" });
    }
  });

  app.get("/api/admin/recording/active/:roomName", requireAuth, requireAdmin, async (req, res) => {
    const [active] = await db.select().from(recordings)
      .where(and(eq(recordings.roomName, req.params.roomName), eq(recordings.status, "recording")));
    return res.json({ active: active || null });
  });

  app.get("/api/admin/recordings", requireAuth, requireAdmin, async (req, res) => {
    const list = await db.select().from(recordings).orderBy(desc(recordings.startedAt));
    return res.json(list);
  });

  app.delete("/api/admin/recordings/:id", requireAuth, requireAdmin, async (req, res) => {
    await db.delete(recordings).where(eq(recordings.id, Number(req.params.id)));
    return res.json({ ok: true });
  });

  // ── Cabinet: Generate Telegram link token ─────────────────────────────────
  app.post("/api/cabinet/generate-telegram-link", requireAuth, async (req, res) => {
    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account) return res.status(404).json({ message: "Аккаунт не найден" });
      const token = crypto.randomBytes(3).toString("hex").toUpperCase();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await db.update(accounts)
        .set({ telegramLinkToken: token, telegramLinkTokenExpiresAt: expiresAt })
        .where(eq(accounts.id, account.id));
      return res.json({ token, expiresAt });
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Public: Link Telegram account (called by bot) ─────────────────────────
  app.post("/api/auth/link-telegram", async (req, res) => {
    try {
      const { token, telegramId, telegramUsername, firstName, lastName } = req.body;
      if (!token || !telegramId) return res.status(400).json({ message: "Неверные данные" });
      const allAccounts = await db.select().from(accounts)
        .where(eq(accounts.telegramLinkToken, token));
      const account = allAccounts[0];
      if (!account) return res.status(404).json({ message: "Токен недействителен" });
      const now = new Date();
      if (account.telegramLinkTokenExpiresAt && account.telegramLinkTokenExpiresAt < now) {
        return res.status(400).json({ message: "Токен истёк. Сгенерируйте новый в личном кабинете" });
      }
      if (account.userId) {
        // Remove this telegramId from any other user first (bot may have auto-created one on /start)
        await db.update(users)
          .set({ telegramId: null, telegramUsername: null })
          .where(and(eq(users.telegramId, telegramId), ne(users.id, account.userId)));
        // Now safely set on the target user
        await db.update(users)
          .set({ telegramId, telegramUsername: telegramUsername || null })
          .where(eq(users.id, account.userId));
      } else {
        // Find if a bot-created user with this telegramId already exists
        const existing = await db.select().from(users).where(eq(users.telegramId, telegramId));
        let userId: number;
        if (existing.length > 0) {
          userId = existing[0].id;
        } else {
          const [newUser] = await db.insert(users).values({
            telegramId,
            telegramUsername: telegramUsername || null,
            firstName: firstName || null,
            lastName: lastName || null,
          }).returning();
          userId = newUser.id;
        }
        await db.update(accounts).set({ userId }).where(eq(accounts.id, account.id));
      }
      await db.update(accounts)
        .set({ telegramLinkToken: null, telegramLinkTokenExpiresAt: null })
        .where(eq(accounts.id, account.id));
      return res.json({ success: true });
    } catch (e) {
      console.error("link-telegram error:", e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Public: Unlink Telegram account ──────────────────────────────────────
  app.post("/api/cabinet/unlink-telegram", requireAuth, async (req, res) => {
    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account?.userId) return res.status(400).json({ message: "Аккаунт не привязан" });
      await db.update(users)
        .set({ telegramId: null, telegramUsername: null })
        .where(eq(users.id, account.userId));
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Cabinet: Telegram link status ─────────────────────────────────────────
  app.get("/api/cabinet/telegram-status", requireAuth, async (req, res) => {
    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account?.userId) return res.json({ linked: false });
      const [user] = await db.select().from(users).where(eq(users.id, account.userId));
      return res.json({
        linked: !!user?.telegramId,
        telegramId: user?.telegramId || null,
        telegramUsername: user?.telegramUsername || null,
      });
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Cabinet: Student profile (read-only for student) ──────────────────────
  app.get("/api/cabinet/student-profile", requireAuth, async (req, res) => {
    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account?.userId) return res.json(null);
      const [profile] = await db.select().from(studentProfiles)
        .where(eq(studentProfiles.userId, account.userId));
      return res.json(profile || null);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Cabinet: Homework (student reads + submits) ─────────────────────────────
  app.get("/api/cabinet/homework", requireAuth, async (req, res) => {
    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account?.userId) return res.json([]);
      const list = await db.select().from(homeworkAssignments)
        .where(eq(homeworkAssignments.userId, account.userId))
        .orderBy(desc(homeworkAssignments.createdAt));
      const withSubs = await Promise.all(list.map(async (hw) => {
        const [sub] = await db.select().from(homeworkSubmissions)
          .where(eq(homeworkSubmissions.homeworkId, hw.id))
          .orderBy(desc(homeworkSubmissions.submittedAt)).limit(1);
        return { ...hw, submission: sub || null };
      }));
      return res.json(withSubs);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.post("/api/cabinet/homework/:id/submit", requireAuth, async (req, res) => {
    try {
      const hwId = Number(req.params.id);
      const [account] = await db.select().from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account?.userId) return res.status(403).json({ message: "Нет доступа" });
      const [hw] = await db.select().from(homeworkAssignments)
        .where(and(eq(homeworkAssignments.id, hwId), eq(homeworkAssignments.userId, account.userId)));
      if (!hw) return res.status(404).json({ message: "Задание не найдено" });
      const { text, linkUrl } = req.body;
      const [sub] = await db.insert(homeworkSubmissions).values({
        homeworkId: hwId,
        text: text || null,
        linkUrl: linkUrl || null,
        submittedAt: new Date(),
      }).returning();
      await db.update(homeworkAssignments)
        .set({ status: "submitted", updatedAt: new Date() })
        .where(eq(homeworkAssignments.id, hwId));
      return res.json(sub);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Cabinet: Lesson Journal (student reads) ─────────────────────────────────
  app.get("/api/cabinet/journal", requireAuth, async (req, res) => {
    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account?.userId) return res.json([]);
      const list = await db.select({
        id: lessonJournalEntries.id,
        date: lessonJournalEntries.date,
        topic: lessonJournalEntries.topic,
        coveredSummary: lessonJournalEntries.coveredSummary,
        nextSteps: lessonJournalEntries.nextSteps,
        createdAt: lessonJournalEntries.createdAt,
      }).from(lessonJournalEntries)
        .where(eq(lessonJournalEntries.userId, account.userId))
        .orderBy(desc(lessonJournalEntries.createdAt));
      return res.json(list);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Cabinet: Materials (student reads) ─────────────────────────────────────
  app.get("/api/cabinet/materials", requireAuth, async (req, res) => {
    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account?.userId) return res.json([]);
      const list = await db.select().from(studentMaterials)
        .where(eq(studentMaterials.userId, account.userId))
        .orderBy(desc(studentMaterials.createdAt));
      return res.json(list);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  // ── Cabinet: Roadmap (student reads) ───────────────────────────────────────
  app.get("/api/cabinet/roadmap", requireAuth, async (req, res) => {
    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account?.userId) return res.json([]);
      const list = await db.select().from(roadmapTopics)
        .where(eq(roadmapTopics.userId, account.userId))
        .orderBy(roadmapTopics.sortOrder, roadmapTopics.createdAt);
      return res.json(list);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });
}
