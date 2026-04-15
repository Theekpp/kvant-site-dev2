import type { Express } from "express";
import { db } from "./db";
import { accounts, subscriptions, payments } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "./auth";
import { randomUUID } from "crypto";

const SHOP_ID = process.env.YOOKASSA_SHOP_ID || "";
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5000";
const YOOKASSA_API = "https://api.yookassa.ru/v3";

function isConfigured() {
  return Boolean(SHOP_ID && SECRET_KEY);
}

async function yookassaRequest(method: string, path: string, body?: any, idempotenceKey?: string) {
  const credentials = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString("base64");
  const headers: Record<string, string> = {
    "Authorization": `Basic ${credentials}`,
    "Content-Type": "application/json",
  };
  if (idempotenceKey) headers["Idempotence-Key"] = idempotenceKey;

  const response = await fetch(`${YOOKASSA_API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`YooKassa API error ${response.status}: ${text}`);
  }

  return response.json();
}

function getPriceForSubscription(type: string, totalLessons: number): number | null {
  if (type === "individual") {
    if (totalLessons === 1) return 1500;
    if (totalLessons === 4) return 5700;
    if (totalLessons === 8) return 10800;
    return totalLessons * 1500;
  }
  if (type === "group") {
    return totalLessons * 1000;
  }
  return null;
}

function getLessonLabel(n: number): string {
  if (n === 1) return "1 занятие";
  if (n >= 2 && n <= 4) return `${n} занятия`;
  return `${n} занятий`;
}

function getTypeLabel(type: string): string {
  return type === "group" ? "Групповые занятия" : "Индивидуальные занятия";
}

export function registerPaymentRoutes(app: Express) {
  app.post("/api/cabinet/pay/:subscriptionId", requireAuth, async (req, res) => {
    if (!isConfigured()) {
      return res.status(503).json({
        message: "Платёжная система не настроена. Обратитесь к репетитору.",
      });
    }

    const subscriptionId = parseInt(req.params.subscriptionId);
    if (isNaN(subscriptionId)) {
      return res.status(400).json({ message: "Неверный ID абонемента" });
    }

    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account) return res.status(404).json({ message: "Аккаунт не найден" });

      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId));
      if (!sub) return res.status(404).json({ message: "Абонемент не найден" });
      if (sub.userId !== account.userId) return res.status(403).json({ message: "Нет доступа" });
      if (sub.isPaid) return res.status(400).json({ message: "Абонемент уже оплачен" });

      const amount = getPriceForSubscription(sub.type, sub.totalLessons);
      if (!amount) return res.status(400).json({ message: "Не удалось определить стоимость" });

      const description = `${getTypeLabel(sub.type)} по физике — ${getLessonLabel(sub.totalLessons)} (Кирилл Анисимов)`;
      const idempotenceKey = randomUUID();

      const payment = await yookassaRequest("POST", "/payments", {
        amount: { value: amount.toFixed(2), currency: "RUB" },
        confirmation: {
          type: "redirect",
          return_url: `${FRONTEND_URL}/cabinet?payment=success&sub=${subscriptionId}`,
        },
        description,
        capture: true,
        metadata: {
          subscriptionId: String(subscriptionId),
          accountId: String(account.id),
        },
        notification_url: `${FRONTEND_URL}/api/yookassa/webhook`,
      }, idempotenceKey);

      await db.insert(payments).values({
        subscriptionId,
        accountId: account.id,
        yookassaPaymentId: payment.id,
        status: payment.status,
        amount: amount.toFixed(2),
        currency: "RUB",
        description,
      });

      return res.json({
        paymentId: payment.id,
        confirmationUrl: payment.confirmation.confirmation_url,
        amount: amount.toFixed(2),
      });
    } catch (e: any) {
      console.error("[payments] Error creating payment:", e?.message || e);
      return res.status(500).json({ message: "Ошибка при создании платежа. Попробуйте позже." });
    }
  });

  app.post("/api/yookassa/webhook", async (req, res) => {
    try {
      const event = req.body;
      if (!event?.object?.id || !event?.event) {
        return res.status(400).json({ message: "Неверный формат webhook" });
      }

      const yookassaPaymentId: string = event.object.id;
      const eventType: string = event.event;
      const newStatus: string = event.object.status;

      const [payment] = await db.select().from(payments)
        .where(eq(payments.yookassaPaymentId, yookassaPaymentId));

      if (!payment) {
        return res.status(200).json({ ok: true });
      }

      await db.update(payments)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(payments.yookassaPaymentId, yookassaPaymentId));

      if (eventType === "payment.succeeded" && newStatus === "succeeded") {
        await db.update(subscriptions)
          .set({ isPaid: true })
          .where(eq(subscriptions.id, payment.subscriptionId));
        console.log(`[payments] Subscription ${payment.subscriptionId} marked as paid via webhook`);
      }

      if (eventType === "payment.canceled") {
        console.log(`[payments] Payment ${yookassaPaymentId} was cancelled`);
      }

      return res.status(200).json({ ok: true });
    } catch (e: any) {
      console.error("[payments] Webhook error:", e?.message || e);
      return res.status(500).json({ message: "Ошибка обработки webhook" });
    }
  });

  app.post("/api/cabinet/check-payment/:subscriptionId", requireAuth, async (req, res) => {
    const subscriptionId = parseInt(req.params.subscriptionId);
    if (isNaN(subscriptionId)) {
      return res.status(400).json({ message: "Неверный ID абонемента" });
    }

    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account) return res.status(404).json({ message: "Аккаунт не найден" });

      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId));
      if (!sub) return res.status(404).json({ message: "Абонемент не найден" });
      if (sub.userId !== account.userId) return res.status(403).json({ message: "Нет доступа" });

      if (sub.isPaid) {
        return res.json({ isPaid: true });
      }

      if (!isConfigured()) {
        return res.json({ isPaid: false });
      }

      const [payment] = await db.select().from(payments)
        .where(eq(payments.subscriptionId, subscriptionId))
        .orderBy(desc(payments.createdAt))
        .limit(1);

      if (!payment) {
        return res.json({ isPaid: false });
      }

      const ykPayment = await yookassaRequest("GET", `/payments/${payment.yookassaPaymentId}`);
      const status: string = ykPayment.status;

      await db.update(payments)
        .set({ status, updatedAt: new Date() })
        .where(eq(payments.yookassaPaymentId, payment.yookassaPaymentId));

      if (status === "succeeded") {
        await db.update(subscriptions)
          .set({ isPaid: true })
          .where(eq(subscriptions.id, subscriptionId));
        console.log(`[payments] Subscription ${subscriptionId} marked as paid via status check`);
        return res.json({ isPaid: true });
      }

      return res.json({ isPaid: false, status });
    } catch (e: any) {
      console.error("[payments] Error checking payment status:", e?.message || e);
      return res.status(500).json({ message: "Ошибка проверки статуса платежа" });
    }
  });

  app.get("/api/cabinet/payments", requireAuth, async (req, res) => {
    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account) return res.status(404).json({ message: "Аккаунт не найден" });

      const userPayments = await db.select().from(payments)
        .where(eq(payments.accountId, account.id));

      return res.json(userPayments);
    } catch {
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });
}
