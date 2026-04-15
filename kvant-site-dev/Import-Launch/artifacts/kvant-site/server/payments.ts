import type { Express } from "express";
import { db } from "./db";
import { accounts, subscriptions, payments, refunds } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "./auth";
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

      const eventType: string = event.event;

      if (eventType === "refund.succeeded") {
        const yookassaRefundId: string = event.object.id;
        const yookassaPaymentId: string = event.object.payment_id;
        const refundAmount: string = event.object.amount?.value || "0";

        await db.update(refunds)
          .set({ status: "succeeded", updatedAt: new Date() })
          .where(eq(refunds.yookassaRefundId, yookassaRefundId));

        const [payment] = await db.select().from(payments)
          .where(eq(payments.yookassaPaymentId, yookassaPaymentId));

        if (payment) {
          await db.update(payments)
            .set({ status: "refunded", updatedAt: new Date() })
            .where(eq(payments.yookassaPaymentId, yookassaPaymentId));

          await db.update(subscriptions)
            .set({ isPaid: false })
            .where(eq(subscriptions.id, payment.subscriptionId));

          console.log(`[payments] Refund ${yookassaRefundId} succeeded for subscription ${payment.subscriptionId}, amount: ${refundAmount} RUB`);
        }

        return res.status(200).json({ ok: true });
      }

      const yookassaPaymentId: string = event.object.id;
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

  app.post("/api/admin/subscriptions/:id/refund", requireAuth, requireAdmin, async (req, res) => {
    if (!isConfigured()) {
      return res.status(503).json({ message: "Платёжная система не настроена" });
    }

    const subscriptionId = parseInt(req.params.id);
    if (isNaN(subscriptionId)) {
      return res.status(400).json({ message: "Неверный ID абонемента" });
    }

    try {
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId));
      if (!sub) return res.status(404).json({ message: "Абонемент не найден" });
      if (!sub.isPaid) return res.status(400).json({ message: "Абонемент не оплачен — возврат невозможен" });

      const [payment] = await db.select().from(payments)
        .where(eq(payments.subscriptionId, subscriptionId))
        .orderBy(desc(payments.createdAt))
        .limit(1);

      if (!payment || payment.status !== "succeeded") {
        return res.status(400).json({ message: "Нет успешного платежа для этого абонемента" });
      }

      const existingRefund = await db.select().from(refunds)
        .where(eq(refunds.paymentId, payment.id))
        .limit(1);

      if (existingRefund.length > 0) {
        return res.status(400).json({ message: "Возврат по этому платежу уже был инициирован" });
      }

      const idempotenceKey = randomUUID();
      const refundData = await yookassaRequest("POST", "/refunds", {
        payment_id: payment.yookassaPaymentId,
        amount: { value: payment.amount, currency: payment.currency },
        description: `Возврат средств за абонемент #${subscriptionId}`,
      }, idempotenceKey);

      const [newRefund] = await db.insert(refunds).values({
        paymentId: payment.id,
        subscriptionId,
        yookassaRefundId: refundData.id,
        amount: payment.amount,
        currency: payment.currency,
        status: refundData.status,
      }).returning();

      if (refundData.status === "succeeded") {
        await db.update(payments)
          .set({ status: "refunded", updatedAt: new Date() })
          .where(eq(payments.id, payment.id));

        await db.update(subscriptions)
          .set({ isPaid: false })
          .where(eq(subscriptions.id, subscriptionId));

        console.log(`[payments] Instant refund ${refundData.id} succeeded for subscription ${subscriptionId}`);
      } else {
        console.log(`[payments] Refund ${refundData.id} initiated for subscription ${subscriptionId}, status: ${refundData.status}`);
      }

      return res.json({
        refundId: refundData.id,
        status: refundData.status,
        amount: payment.amount,
      });
    } catch (e: any) {
      console.error("[payments] Refund error:", e?.message || e);
      return res.status(500).json({ message: "Ошибка при создании возврата. " + (e?.message || "") });
    }
  });
}
