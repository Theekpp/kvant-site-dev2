import cron from "node-cron";
import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";

const SITE_URL = process.env.SITE_URL || process.env.FRONTEND_URL || "https://kvant-academy.ru";

function boardLinkFor(roomId: string | null | undefined): string {
  if (!roomId) return "";
  return `${SITE_URL.replace(/\/$/, "")}/board/${roomId}`;
}

function videoLinkFor(bookingId: number): string {
  return `${SITE_URL.replace(/\/$/, "")}/video/booking-${bookingId}`;
}

function parseBookingDateTime(date: string, time: string): Date | null {
  const [d, m, y] = date.split(".").map(n => parseInt(n, 10));
  const [hh, mm] = time.split(":").map(n => parseInt(n, 10));
  if ([d, m, y, hh, mm].some(v => isNaN(v))) return null;
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function padDate(n: number) { return String(n).padStart(2, "0"); }
function toDateStr(d: Date) { return `${padDate(d.getDate())}.${padDate(d.getMonth() + 1)}.${d.getFullYear()}`; }

const twoHourRemindedIds = new Set<number>();
const tenMinRemindedIds = new Set<number>();

export function setupReminders(bot: TelegramBot) {
  const adminChatId = process.env.ADMIN_CHAT_ID;

  // ─── DAILY AT 10:00: tomorrow's lesson reminder ───────────────────────────
  cron.schedule("0 10 * * *", async () => {
    try {
      const bookings = await storage.getAllBookings();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = toDateStr(tomorrow);

      const tomorrowBookings = bookings.filter(
        b => b.status === "confirmed" && b.date === tomorrowStr
      );

      for (const booking of tomorrowBookings) {
        const user = booking.user;
        if (!user?.telegramId) continue;

        const boardLink = boardLinkFor(user.boardRoomId);
        const videoLink = videoLinkFor(booking.id);
        const typeText = booking.type === "individual" ? "индивидуальное" : "групповое";

        try {
          await bot.sendMessage(
            user.telegramId,
            `⏰ Напоминание о занятии!\n\n` +
            `Привет, ${user.firstName || "друг"}! Завтра у тебя ${typeText} занятие по физике.\n\n` +
            `📅 Дата: ${booking.date}\n` +
            `⏰ Время: ${booking.time}\n` +
            `📚 Длительность: 60 минут\n\n` +
            (videoLink ? `📹 Конференция: ${videoLink}\n` : "") +
            (boardLink ? `🖼 Доска: ${boardLink}\n` : "") +
            `\nНе забудь подготовиться! Если нужно перенести — напиши Кириллу: @anisimovvd`
          );
        } catch (err) {
          console.error(`Failed to send tomorrow reminder to ${user.telegramId}:`, err);
        }
      }

      if (tomorrowBookings.length > 0 && adminChatId) {
        let adminMsg = `📋 Занятия на завтра (${tomorrowStr}):\n\n`;
        for (const booking of tomorrowBookings) {
          const name = booking.user
            ? `${booking.user.firstName || ""} ${booking.user.lastName || ""}`.trim() || "Без имени"
            : "Без имени";
          const typeText = booking.type === "individual" ? "Инд." : "Груп.";
          adminMsg += `• ${booking.time} — ${name} (${typeText})\n`;
        }
        try {
          await bot.sendMessage(parseInt(adminChatId), adminMsg);
        } catch (err) {
          console.error("Failed to send admin tomorrow summary:", err);
        }
      }
    } catch (err) {
      console.error("Daily reminder cron error:", err);
    }
  });

  // ─── EVERY MINUTE: 2-hour and 10-minute reminders ─────────────────────────
  cron.schedule("* * * * *", async () => {
    try {
      const bookings = await storage.getAllBookings();
      const now = new Date();

      for (const booking of bookings) {
        if (booking.status !== "confirmed") continue;
        const dt = parseBookingDateTime(booking.date, booking.time);
        if (!dt) continue;
        const diffMin = (dt.getTime() - now.getTime()) / 60000;

        const user = booking.user;

        // ── 2-hour reminder (window: 115–125 min) ──
        if (diffMin >= 115 && diffMin < 125 && !twoHourRemindedIds.has(booking.id)) {
          twoHourRemindedIds.add(booking.id);
          const typeText = booking.type === "individual" ? "индивидуальное" : "групповое";

          if (user?.telegramId) {
            try {
              await bot.sendMessage(
                user.telegramId,
                `⏰ До занятия 2 часа!\n\n` +
                `${user.firstName || "Привет"}! Напоминаем — через 2 часа ${typeText} занятие по физике.\n\n` +
                `📅 ${booking.date} в ${booking.time}\n\n` +
                `Убедись, что всё готово. До встречи! 🎓`
              );
            } catch (err) {
              console.error(`2h reminder failed for user ${user.telegramId}:`, err);
            }
          }

          if (adminChatId) {
            const name = user
              ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Без имени"
              : "Без имени";
            try {
              await bot.sendMessage(
                parseInt(adminChatId),
                `⏰ Через 2 часа занятие!\n\n` +
                `👤 ${name}\n📅 ${booking.date} в ${booking.time}\n📚 ${booking.type === "individual" ? "Индивидуальное" : "Групповое"}`
              );
            } catch (err) {
              console.error("2h admin reminder failed:", err);
            }
          }
        }

        // ── 10-minute reminder (window: 5–15 min) — with board + conference links ──
        if (diffMin >= 5 && diffMin < 15 && !tenMinRemindedIds.has(booking.id)) {
          tenMinRemindedIds.add(booking.id);
          const boardLink = boardLinkFor(user?.boardRoomId);
          const videoLink = videoLinkFor(booking.id);
          const typeText = booking.type === "individual" ? "индивидуальное" : "групповое";

          if (user?.telegramId) {
            try {
              await bot.sendMessage(
                user.telegramId,
                `🚀 Занятие через 10 минут!\n\n` +
                `${user.firstName || "Привет"}! ${typeText.charAt(0).toUpperCase() + typeText.slice(1)} занятие по физике начнётся совсем скоро.\n\n` +
                `⏰ Время: ${booking.time}\n\n` +
                (videoLink ? `📹 Конференция: ${videoLink}\n` : "") +
                (boardLink ? `🖼 Доска: ${boardLink}\n` : "") +
                `\nЗаходи прямо сейчас, чтобы всё успеть подготовить! 👇`
              );
            } catch (err) {
              console.error(`10min reminder failed for user ${user.telegramId}:`, err);
            }
          }

          if (adminChatId) {
            const name = user
              ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Без имени"
              : "Без имени";
            try {
              await bot.sendMessage(
                parseInt(adminChatId),
                `🚀 Занятие через 10 минут!\n\n` +
                `👤 ${name}\n📅 ${booking.date} в ${booking.time}\n` +
                `📚 ${booking.type === "individual" ? "Индивидуальное" : "Групповое"}\n\n` +
                (videoLink ? `📹 Конференция: ${videoLink}\n` : "") +
                (boardLink ? `🖼 Доска: ${boardLink}` : "")
              );
            } catch (err) {
              console.error("10min admin reminder failed:", err);
            }
          }
        }
      }
    } catch (err) {
      console.error("Minute reminder cron error:", err);
    }
  });

  console.log("Reminder scheduler started (daily 10:00 + every-minute 2h/10min reminders)");
}
