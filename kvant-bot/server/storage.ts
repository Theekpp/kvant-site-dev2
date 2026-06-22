import {
  users, bookings, scheduleSlots, subscriptions, studentProfiles, siteSettings,
  type User, type InsertUser,
  type Booking, type InsertBooking,
  type ScheduleSlot, type InsertScheduleSlot,
  type Subscription, type InsertSubscription,
  type StudentProfile,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByTelegramId(telegramId: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;
  getAllUsers(): Promise<User[]>;

  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByUserId(userId: number): Promise<Booking[]>;
  getAllBookings(): Promise<(Booking & { user: User | null })[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: string): Promise<Booking>;
  updateBookingPaid(id: number, isPaid: boolean): Promise<Booking>;
  markTwoHourReminded(id: number): Promise<void>;
  markTenMinReminded(id: number): Promise<void>;

  getScheduleSlots(): Promise<ScheduleSlot[]>;
  getScheduleByType(slotType: string): Promise<ScheduleSlot[]>;
  getScheduleSlotById(id: number): Promise<ScheduleSlot | undefined>;
  createScheduleSlot(schedule: InsertScheduleSlot): Promise<ScheduleSlot>;
  updateScheduleSlot(id: number, data: Partial<InsertScheduleSlot>): Promise<ScheduleSlot>;
  deleteScheduleSlot(id: number): Promise<void>;

  getSubscription(id: number): Promise<Subscription | undefined>;
  getSubscriptionsByUserId(userId: number): Promise<Subscription[]>;
  getActiveSubscription(userId: number, type: string): Promise<Subscription | undefined>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, data: Partial<InsertSubscription>): Promise<Subscription>;
  getAllSubscriptions(): Promise<Subscription[]>;

  getStudentProfile(userId: number): Promise<StudentProfile | undefined>;
  getSetting(key: string): Promise<string | null>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByTelegramId(telegramId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingsByUserId(userId: number): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.createdAt));
  }

  async getAllBookings(): Promise<(Booking & { user: User | null })[]> {
    const rows = await db
      .select({ booking: bookings, user: users })
      .from(bookings)
      .leftJoin(users, eq(bookings.userId, users.id))
      .orderBy(desc(bookings.createdAt));
    return rows.map(r => ({ ...r.booking, user: r.user || null }));
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [b] = await db.insert(bookings).values(booking).returning();
    return b;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking> {
    const [b] = await db.update(bookings).set({ status }).where(eq(bookings.id, id)).returning();
    return b;
  }

  async updateBookingPaid(id: number, isPaid: boolean): Promise<Booking> {
    const [b] = await db.update(bookings).set({ isPaid }).where(eq(bookings.id, id)).returning();
    return b;
  }

  async markTwoHourReminded(id: number): Promise<void> {
    await db.update(bookings).set({ twoHourReminded: true }).where(eq(bookings.id, id));
  }

  async markTenMinReminded(id: number): Promise<void> {
    await db.update(bookings).set({ tenMinReminded: true }).where(eq(bookings.id, id));
  }

  async getScheduleSlots(): Promise<ScheduleSlot[]> {
    return db.select().from(scheduleSlots).where(eq(scheduleSlots.isActive, true)).orderBy(scheduleSlots.dayOfWeek);
  }

  async getScheduleByType(slotType: string): Promise<ScheduleSlot[]> {
    const slots = await db.select().from(scheduleSlots)
      .where(and(eq(scheduleSlots.isActive, true), eq(scheduleSlots.slotType, slotType)))
      .orderBy(scheduleSlots.dayOfWeek);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return slots.filter(slot => {
      if (!slot.specificDate) return true;
      const [d, m, y] = slot.specificDate.split('.');
      if (!d || !m || !y) return true;
      const slotDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return slotDate >= today;
    });
  }

  async getScheduleSlotById(id: number): Promise<ScheduleSlot | undefined> {
    const [s] = await db.select().from(scheduleSlots).where(eq(scheduleSlots.id, id));
    return s || undefined;
  }

  async createScheduleSlot(schedule: InsertScheduleSlot): Promise<ScheduleSlot> {
    const [s] = await db.insert(scheduleSlots).values(schedule).returning();
    return s;
  }

  async updateScheduleSlot(id: number, data: Partial<InsertScheduleSlot>): Promise<ScheduleSlot> {
    const [s] = await db.update(scheduleSlots).set(data).where(eq(scheduleSlots.id, id)).returning();
    return s;
  }

  async deleteScheduleSlot(id: number): Promise<void> {
    await db.update(bookings).set({ groupScheduleId: null }).where(eq(bookings.groupScheduleId, id));
    await db.delete(scheduleSlots).where(eq(scheduleSlots.id, id));
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return sub || undefined;
  }

  async getSubscriptionsByUserId(userId: number): Promise<Subscription[]> {
    return db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt));
  }

  async getActiveSubscription(userId: number, type: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.type, type),
        eq(subscriptions.isPaid, true),
      ));
    return sub || undefined;
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const [s] = await db.insert(subscriptions).values(sub).returning();
    return s;
  }

  async updateSubscription(id: number, data: Partial<InsertSubscription>): Promise<Subscription> {
    const [s] = await db.update(subscriptions).set(data).where(eq(subscriptions.id, id)).returning();
    return s;
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  }

  async getStudentProfile(userId: number): Promise<StudentProfile | undefined> {
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId));
    return profile || undefined;
  }

  async getSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return row?.value ?? null;
  }
}

export const storage = new DatabaseStorage();
