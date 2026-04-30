import cron from "node-cron";
import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";

const SITE_URL = process.env.SITE_URL || process.env.FRONTEND_URL || "https://kvant-academy.ru";

function boardLinkFor(roomId: string | null | undefined): string {
  if (!roomId) return "";
  return `${SITE_URL.replace(/\/$/, "")}/board/${roomId}`;
}

// Tracks bookings for which we've already sent the 30-min "soon" reminder, to avoid duplicates.
const soonRemindedIds = new Set<number>();

function parseBookingDateTime(date: string, time: string): Date | null {
  // date is "DD.MM.YYYY", time is "HH:MM"
  const [d, m, y] = date.split(".").map(n => parseInt(n, 10));
  const [hh, mm] = time.split(":").map(n => parseInt(n, 10));
  if ([d, m, y, hh, mm].some(v => isNaN(v))) return null;
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function setupReminders(bot: TelegramBot) {
  cron.schedule("0 10 * * *", async () => {
    try {
      const bookings = await storage.getAllBookings();
      const users = await storage.getAllUsers();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${String(tomorrow.getDate()).padStart(2, "0")}.${String(tomorrow.getMonth() + 1).padStart(2, "0")}.${tomorrow.getFullYear()}`;

      const tomorrowBookings = bookings.filter(
        b => b.status === "confirmed" && b.date === tomorrowStr
      );

      for (const booking of tomorrowBookings) {
        const user = users.find(u => u.id === booking.userId);
        if (!user || !user.telegramId) continue;

        const boardLine = user.boardRoomId
          ? `\n\u{1F5BC} Онлайн-доска: ${boardLinkFor(user.boardRoomId)}\n`
          : "";

        try {
          await bot.sendMessage(user.telegramId,
            `\u{23F0} Напоминание о занятии!\n\n` +
            `Привет, ${user.firstName || "друг"}! Завтра у тебя ${booking.type === "individual" ? "индивидуальное" : "групповое"} занятие по физике.\n\n` +
            `\u{1F4C5} Дата: ${booking.date}\n` +
            `\u{23F0} Время: ${booking.time}\n` +
            `\u{1F4DA} Длительность: 60 минут\n` +
            boardLine + "\n" +
            `Не забудь подготовиться! Если нужно перенести \u{2014} напиши Кириллу: @anisimovvd`
          );
        } catch (err) {
          console.error(`Failed to send reminder to user ${user.telegramId}:`, err);
        }
      }

      if (tomorrowBookings.length > 0) {
        const adminChatId = process.env.ADMIN_CHAT_ID;
        if (adminChatId) {
          let adminMsg = `\u{1F4CB} Занятия на завтра (${tomorrowStr}):\n\n`;
          for (const booking of tomorrowBookings) {
            const user = users.find(u => u.id === booking.userId);
            const name = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Без имени";
            const typeText = booking.type === "individual" ? "Инд." : "Груп.";
            adminMsg += `\u{2022} ${booking.time} \u{2014} ${name} (${typeText})\n`;
          }
          try {
            await bot.sendMessage(parseInt(adminChatId), adminMsg);
          } catch (err) {
            console.error("Failed to send admin reminder:", err);
          }
        }
      }
    } catch (err) {
      console.error("Reminder cron error:", err);
    }
  });

  // Every 5 minutes: check for confirmed bookings starting in ~30 minutes
  // and send the user a board link reminder once.
  cron.schedule("*/5 * * * *", async () => {
    try {
      const bookings = await storage.getAllBookings();
      const users = await storage.getAllUsers();
      const now = new Date();
      const windowStart = new Date(now.getTime() + 25 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);

      for (const booking of bookings) {
        if (booking.status !== "confirmed") continue;
        if (soonRemindedIds.has(booking.id)) continue;
        const dt = parseBookingDateTime(booking.date, booking.time);
        if (!dt) continue;
        if (dt < windowStart || dt > windowEnd) continue;

        const user = users.find(u => u.id === booking.userId);
        if (!user || !user.telegramId) continue;

        const link = boardLinkFor(user.boardRoomId);
        try {
          await bot.sendMessage(
            user.telegramId,
            `\u{23F0} Занятие через 30 минут!\n\n` +
              `Привет, ${user.firstName || "друг"}! ${booking.type === "individual" ? "Индивидуальное" : "Групповое"} занятие по физике начнётся скоро.\n\n` +
              `\u{23F0} Время: ${booking.time}\n` +
              (link ? `\u{1F5BC} Онлайн-доска: ${link}\n\n` : "\n") +
              `Заходи на доску заранее, чтобы всё успеть подготовить.`,
          );
          soonRemindedIds.add(booking.id);
        } catch (err) {
          console.error(
            `Failed to send 30-min reminder to user ${user.telegramId}:`,
            err,
          );
        }
      }
    } catch (err) {
      console.error("30-min reminder cron error:", err);
    }
  });

  console.log("Reminder scheduler started (daily at 10:00 + every 5 min for 30-min board link)");
}
