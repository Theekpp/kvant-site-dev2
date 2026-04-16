import cron from "node-cron";
import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";

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

        try {
          await bot.sendMessage(user.telegramId,
            `\u{23F0} Напоминание о занятии!\n\n` +
            `Привет, ${user.firstName || "друг"}! Завтра у тебя ${booking.type === "individual" ? "индивидуальное" : "групповое"} занятие по физике.\n\n` +
            `\u{1F4C5} Дата: ${booking.date}\n` +
            `\u{23F0} Время: ${booking.time}\n` +
            `\u{1F4DA} Длительность: 60 минут\n\n` +
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

  console.log("Reminder scheduler started (daily at 10:00)");
}
