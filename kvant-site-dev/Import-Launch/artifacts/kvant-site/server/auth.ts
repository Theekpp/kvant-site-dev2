import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import {
  accounts, refreshTokens, emailTokens, users, bookings, subscriptions, scheduleSlots,
} from "@shared/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import crypto from "crypto";

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

      // Create the confirmed, paid booking
      const [booking] = await db.insert(bookings).values({
        userId: account.userId,
        type,
        date,
        time,
        groupScheduleId: groupScheduleId || null,
        status: "confirmed",
        isPaid: true,
        paymentMethod: "subscription",
      }).returning();

      // Deduct one lesson from the subscription
      await db.update(subscriptions)
        .set({ remainingLessons: activeSub.remainingLessons - 1 })
        .where(eq(subscriptions.id, activeSub.id));

      return res.status(201).json(booking);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  app.delete("/api/cabinet/bookings/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Неверный id" });

    try {
      const [account] = await db.select().from(accounts)
        .where(eq(accounts.id, req.accountId!));
      if (!account?.userId) return res.status(403).json({ message: "Нет доступа" });

      const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
      if (!booking) return res.status(404).json({ message: "Запись не найдена" });
      if (booking.userId !== account.userId) return res.status(403).json({ message: "Нет доступа" });
      if (booking.status !== "confirmed") {
        return res.status(400).json({ message: "Можно отменить только подтверждённые занятия" });
      }

      const [updated] = await db.update(bookings)
        .set({ status: "cancelled" })
        .where(eq(bookings.id, id))
        .returning();
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
}
