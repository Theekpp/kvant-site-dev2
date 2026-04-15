import { sql } from "drizzle-orm";
import { pgTable, text, integer, bigint, boolean, timestamp, serial } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: bigint("telegram_id", { mode: "number" }).unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  age: integer("age"),
  grade: text("grade"),
  goal: text("goal"),
  phone: text("phone").unique(),
  telegramUsername: text("telegram_username"),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  phone: text("phone"),
  userId: integer("user_id").references(() => users.id),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const emailTokens = pgTable("email_tokens", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  type: text("type").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("individual"),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: text("status").notNull().default("confirmed"),
  isPaid: boolean("is_paid").notNull().default(false),
  paymentMethod: text("payment_method"),
  groupScheduleId: integer("group_schedule_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("individual"),
  totalLessons: integer("total_lessons").notNull().default(8),
  remainingLessons: integer("remaining_lessons").notNull().default(8),
  isPaid: boolean("is_paid").notNull().default(false),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  yookassaPaymentId: text("yookassa_payment_id").notNull().unique(),
  status: text("status").notNull().default("pending"),
  amount: text("amount").notNull(),
  currency: text("currency").notNull().default("RUB"),
  description: text("description"),
  cartSubscriptionIds: text("cart_subscription_ids"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const scheduleSlots = pgTable("schedule_slots", {
  id: serial("id").primaryKey(),
  dayOfWeek: integer("day_of_week"),
  time: text("time").notNull(),
  title: text("title"),
  maxStudents: integer("max_students").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  slotType: text("slot_type").notNull().default("individual"),
  specificDate: text("specific_date"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  subject: text("subject").notNull().default("Физика"),
  rating: integer("rating").notNull().default(5),
  text: text("text").notNull(),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  yookassaRefundId: text("yookassa_refund_id").notNull().unique(),
  amount: text("amount").notNull(),
  currency: text("currency").notNull().default("RUB"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const adminActions = pgTable("admin_actions", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  performedBy: text("performed_by"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const botActivity = pgTable("bot_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type ScheduleSlot = typeof scheduleSlots.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type AdminAction = typeof adminActions.$inferSelect;
export type BotActivity = typeof botActivity.$inferSelect;
