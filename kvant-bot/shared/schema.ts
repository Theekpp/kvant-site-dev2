import { sql, relations } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, timestamp, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: bigint("telegram_id", { mode: "number" }).unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  age: integer("age"),
  grade: text("grade"),
  goal: text("goal"),
  phone: text("phone"),
  telegramUsername: text("telegram_username"),
  name: text("name"),
  boardRoomId: text("board_room_id").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  subscriptions: many(subscriptions),
}));

export const scheduleSlots = pgTable("schedule_slots", {
  id: serial("id").primaryKey(),
  dayOfWeek: integer("day_of_week"),
  time: text("time").notNull(),
  title: text("title"),
  maxStudents: integer("max_students").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  slotType: text("slot_type").default("individual").notNull(),
  specificDate: text("specific_date"),
});

export const scheduleSlotsRelations = relations(scheduleSlots, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: text("status").default("confirmed").notNull(),
  isPaid: boolean("is_paid").default(false).notNull(),
  paymentMethod: text("payment_method"),
  groupScheduleId: integer("group_schedule_id").references(() => scheduleSlots.id),
  roomId: text("room_id").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  groupSlot: one(scheduleSlots, { fields: [bookings.groupScheduleId], references: [scheduleSlots.id] }),
}));

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  totalLessons: integer("total_lessons").notNull(),
  remainingLessons: integer("remaining_lessons").notNull(),
  isPaid: boolean("is_paid").default(false).notNull(),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

// ── Auth tables (managed by site, referenced here for type safety) ──────────

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  phone: text("phone"),
  userId: integer("user_id").references(() => users.id),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailTokens = pgTable("email_tokens", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  token: text("token").notNull().unique(),
  type: text("type").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertScheduleSlotSchema = createInsertSchema(scheduleSlots).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ScheduleSlot = typeof scheduleSlots.$inferSelect;
export type InsertScheduleSlot = z.infer<typeof insertScheduleSlotSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
