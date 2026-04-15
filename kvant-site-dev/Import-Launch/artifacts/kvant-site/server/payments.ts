import type { Express } from "express";
import { db } from "./db";
import { accounts, subscriptions, payments, refunds } from "@shared/schema";
import { eq, desc, inArray, isNotNull, and } from "drizzle-orm";
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

async function markSubscriptionsPaid(subIds: number[]) {
  for (const subId of subIds) {
    await db.update(subscriptions)
      .set({ isPaid: true })
      .where(eq(subscriptions.id, subId));
  }
}

export function registerPaymentRoutes(app: Express) {

  app.post("/api/cabinet/pay-cart", requireAuth, async (req, res) => {
    if (!isConfigured()) {
      return res.status(503).json({
        message: "Платёжная система не настроена. Обратитесь к репетитору.",
      });
    }

    const { subscriptionIds } = req.body;
    if (!Array.isArray(subscriptionIds) || subscriptionIds.length === 0) {
      return res.status(400).json({ message: "Нет абонементов для оплаты" });
    }

    const ids = subscriptionIds.map(Number).filter(n => !isNaN(n));
    if (ids.length === 0) {
      return res.status(400).json({ message: "Неверные идентификаторы абонементов" });
    }

    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, req.accountId!));
      if (!account) return res.status(404).json({ message: "Аккаунт не найден" });

      const subs = await db.select().from(subscriptions).where(inArray(subscriptions.id, ids));

      for (const sub of subs) {
        if (sub.userId !== account.userId) return res.status(403).json({ message: "Нет доступа к одному из абонементов" });
        if (sub.isPaid) return res.status(400).json({ message: `Абонемент #${sub.id} уже оплачен` });
      }

      let totalAmount = 0;
      for (const sub of subs) {
        const price = getPriceForSubscription(sub.type, sub.totalLessons);
        if (!price) return res.status(400).json({ message: "Не удалось определить стоимость одного из абонементов" });
        totalAmount += price;
      }

      const primarySubId = subs[0].id;
      const description = subs.length === 1
        ? `${getTypeLabel(subs[0].type)} по физике — ${getLessonLabel(subs[0].totalLessons)} (Кирилл Анисимов)`
        : `Абонементы по физике — ${subs.length} шт. (Кирилл Анисимов)`;

      const idempotenceKey = randomUUID();

      const payment = await yookassaRequest("POST", "/payments", {
        amount: { value: totalAmount.toFixed(2), currency: "RUB" },
        confirmation: {
          type: "redirect",
          return_url: `${FRONTEND_URL}/cabinet?payment=success`,
        },
        description,
        capture: true,
        metadata: {
          subscriptionId: String(primarySubId),
          subscriptionIds: JSON.stringify(ids),
          accountId: String(account.id),
        },
      }, idempotenceKey);

      await db.insert(payments).values({
        subscriptionId: primarySubId,
        accountId: account.id,
        yookassaPaymentId: payment.id,
        status: payment.status,
        amount: totalAmount.toFixed(2),
        currency: "RUB",
        description,
        cartSubscriptionIds: JSON.stringify(ids),
      });

      return res.json({
        paymentId: payment.id,
        confirmationUrl: payment.confirmation.confirmation_url,
        amount: totalAmount.toFixed(2),
      });
    } catch (e: any) {
      console.error("[payments] Error creating cart payment:", e?.message || e);
      return res.status(500).json({ message: "Ошибка при создании платежа. Попробуйте позже." });
    }
  });

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

          const subIds = payment.cartSubscriptionIds
            ? (JSON.parse(payment.cartSubscriptionIds) as number[])
            : [payment.subscriptionId];

          for (const subId of subIds) {
            await db.update(subscriptions)
              .set({ isPaid: false })
              .where(eq(subscriptions.id, subId));
          }

          console.log(`[payments] Refund ${yookassaRefundId} succeeded for subscriptions ${subIds.join(", ")}, amount: ${refundAmount} RUB`);
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
        const subIds = payment.cartSubscriptionIds
          ? (JSON.parse(payment.cartSubscriptionIds) as number[])
          : [payment.subscriptionId];

        await markSubscriptionsPaid(subIds);
        console.log(`[payments] Subscriptions ${subIds.join(", ")} marked as paid via webhook`);
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

      const [directPayment] = await db.select().from(payments)
        .where(eq(payments.subscriptionId, subscriptionId))
        .orderBy(desc(payments.createdAt))
        .limit(1);

      let targetPayment = directPayment || null;

      if (!targetPayment) {
        const cartPayments = await db.select().from(payments)
          .where(and(eq(payments.accountId, account.id), isNotNull(payments.cartSubscriptionIds)))
          .orderBy(desc(payments.createdAt));

        for (const cp of cartPayments) {
          const cartIds = JSON.parse(cp.cartSubscriptionIds!) as number[];
          if (cartIds.includes(subscriptionId)) {
            targetPayment = cp;
            break;
          }
        }
      }

      if (!targetPayment) {
        return res.json({ isPaid: false });
      }

      const ykPayment = await yookassaRequest("GET", `/payments/${targetPayment.yookassaPaymentId}`);
      const status: string = ykPayment.status;

      await db.update(payments)
        .set({ status, updatedAt: new Date() })
        .where(eq(payments.yookassaPaymentId, targetPayment.yookassaPaymentId));

      if (status === "succeeded") {
        const subIds = targetPayment.cartSubscriptionIds
          ? (JSON.parse(targetPayment.cartSubscriptionIds) as number[])
          : [targetPayment.subscriptionId];

        await markSubscriptionsPaid(subIds);
        console.log(`[payments] Subscriptions ${subIds.join(", ")} marked as paid via status check`);
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
