import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import type { User, ScheduleSlot, Booking } from "@shared/schema";

const DAYS_RU = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
const DAYS_SHORT_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "📝 Записаться на занятие" }, { text: "💰 Услуги и оплата" }],
    [{ text: "📋 Мои записи" }],
    [{ text: "ℹ️ О менторе" }, { text: "📞 Контакты" }],
    [{ text: "❓ Задать вопрос" }, { text: "📖 Формат занятий" }],
  ],
  resize_keyboard: true,
};

interface UserState {
  step: string;
  data: Record<string, any>;
}

const userStates = new Map<number, UserState>();

function getState(chatId: number): UserState | undefined {
  return userStates.get(chatId);
}

function setState(chatId: number, step: string, data: Record<string, any> = {}) {
  userStates.set(chatId, { step, data });
}

function clearState(chatId: number) {
  userStates.delete(chatId);
}

function getNextDateForDay(dayOfWeek: number): string {
  const today = new Date();
  const todayDow = today.getDay();
  let daysUntil = dayOfWeek - todayDow;
  if (daysUntil <= 0) daysUntil += 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntil);
  return `${String(next.getDate()).padStart(2, "0")}.${String(next.getMonth() + 1).padStart(2, "0")}.${next.getFullYear()}`;
}

// Returns the actual booking date: uses specificDate if set, otherwise next occurrence of dayOfWeek
function getSlotBookingDate(slot: { dayOfWeek: number; specificDate?: string | null }): string {
  if (slot.specificDate) return slot.specificDate;
  return getNextDateForDay(slot.dayOfWeek);
}

// Human-readable label for a slot in Telegram
function formatSlotLabel(slot: { dayOfWeek: number; time: string; title?: string | null; specificDate?: string | null }): string {
  const dateStr = getSlotBookingDate(slot);
  if (slot.specificDate) {
    const dayShort = DAYS_SHORT_RU[slot.dayOfWeek] || '';
    return `📅 ${dateStr} (${dayShort}) • ${slot.time}${slot.title ? ` • ${slot.title}` : ''}`;
  }
  return `🔁 ${DAYS_RU[slot.dayOfWeek]} • ${slot.time}${slot.title ? ` • ${slot.title}` : ''}`;
}

const MONTHS_RU_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MONTHS_RU = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

function parseDateStr(dateStr: string): Date {
  const [d, m, y] = dateStr.split(".").map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

const MAX_MONTHS_AHEAD = 3;

// Build a month-based calendar with prev/next navigation
// year/month: the month to display (month is 0-based JS month)
// availableDays: set of dayOfWeek (0=Sun..6=Sat) for recurring slots
// specificDates: set of "DD.MM.YYYY" for one-off slots
// callbackPrefix: "cal_ind" or "cal_grp"
function buildCalendarKeyboard(
  availableDays: Set<number>,
  specificDates: Set<string>,
  callbackPrefix: string,
  year?: number,
  month?: number,
  fullyBookedDates?: Set<string>
): { inline_keyboard: TelegramBot.InlineKeyboardButton[][] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const displayYear = year ?? today.getFullYear();
  const displayMonth = month ?? today.getMonth();

  const firstDay = new Date(displayYear, displayMonth, 1);
  const lastDay = new Date(displayYear, displayMonth + 1, 0);

  const minDate = new Date(today);
  minDate.setDate(today.getDate() + 1); // from tomorrow

  const maxDate = new Date(today.getFullYear(), today.getMonth() + MAX_MONTHS_AHEAD + 1, 0);

  // Navigation: prev/next month
  const prevMonth = new Date(displayYear, displayMonth - 1, 1);
  const nextMonth = new Date(displayYear, displayMonth + 1, 1);
  const canGoPrev = prevMonth >= new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoNext = nextMonth <= new Date(today.getFullYear(), today.getMonth() + MAX_MONTHS_AHEAD, 1);

  const navPrefix = callbackPrefix + "_nav";

  const navRow: TelegramBot.InlineKeyboardButton[] = [
    canGoPrev
      ? { text: "◀️", callback_data: `${navPrefix}_${prevMonth.getFullYear()}_${prevMonth.getMonth()}` }
      : { text: " ", callback_data: "noop" },
    { text: `${MONTHS_RU[displayMonth]} ${displayYear}`, callback_data: "noop" },
    canGoNext
      ? { text: "▶️", callback_data: `${navPrefix}_${nextMonth.getFullYear()}_${nextMonth.getMonth()}` }
      : { text: " ", callback_data: "noop" },
  ];

  const dayHeaderRow = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => ({
    text: d,
    callback_data: "noop",
  }));

  const rows: TelegramBot.InlineKeyboardButton[][] = [navRow, dayHeaderRow];

  // Find the Monday on or before the 1st of the month
  const firstDow = firstDay.getDay(); // 0=Sun
  const offsetToMonday = firstDow === 0 ? -6 : 1 - firstDow;

  let cursor = new Date(firstDay);
  cursor.setDate(firstDay.getDate() + offsetToMonday);

  while (cursor <= lastDay || cursor.getDay() !== 1) {
    const week: TelegramBot.InlineKeyboardButton[] = [];
    for (let i = 0; i < 7; i++) {
      const inCurrentMonth = cursor.getMonth() === displayMonth && cursor.getFullYear() === displayYear;
      const dateStr = toDateStr(cursor);
      const dow = cursor.getDay();
      const isPast = cursor < minDate;
      const isBeyondMax = cursor > maxDate;

      let btn: TelegramBot.InlineKeyboardButton;
      if (!inCurrentMonth || isPast || isBeyondMax) {
        btn = { text: " ", callback_data: "noop" };
      } else {
        const hasSlot = (availableDays.has(dow) || specificDates.has(dateStr)) && !fullyBookedDates?.has(dateStr);
        if (hasSlot) {
          btn = { text: `${cursor.getDate()}`, callback_data: `${callbackPrefix}_${dateStr}` };
        } else {
          btn = { text: "·", callback_data: "noop" };
        }
      }
      week.push(btn);
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 1);
    }
    rows.push(week);
    if (cursor > lastDay) break;
  }

  return { inline_keyboard: rows };
}

function getCalendarHeaderText(): string {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth() + MAX_MONTHS_AHEAD + 1, 0);
  const startMonth = MONTHS_RU[today.getMonth()];
  const endMonth = MONTHS_RU[end.getMonth()];
  if (today.getMonth() === end.getMonth()) {
    return `${startMonth} ${today.getFullYear()}`;
  }
  return `${startMonth} — ${endMonth} ${end.getFullYear()}`;
}

// Returns dates (DD.MM.YYYY) where ALL individual slots for that date are already booked (1 booking each)
// When both a specific-date slot AND a recurring slot exist for the same time on a given day,
// the specific-date slot takes priority. This prevents duplicates in the bot UI and capacity checks.
function deduplicateSlotsByTime(slotsForDay: ScheduleSlot[], dateStr: string): ScheduleSlot[] {
  const specificTimes = new Set(
    slotsForDay.filter(s => s.specificDate === dateStr).map(s => s.time)
  );
  return slotsForDay
    .filter(s => s.specificDate === dateStr || !specificTimes.has(s.time))
    .sort((a, b) => a.time.localeCompare(b.time));
}

function computeIndividualFullyBookedDates(
  schedule: ScheduleSlot[],
  allBookings: Booking[]
): Set<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today.getFullYear(), today.getMonth() + MAX_MONTHS_AHEAD + 1, 0);
  const confirmed = allBookings.filter(b => b.type === "individual" && b.status === "confirmed");

  const fullyBooked = new Set<string>();
  const cursor = new Date(today);
  cursor.setDate(today.getDate() + 1);

  while (cursor <= maxDate) {
    const dateStr = toDateStr(cursor);
    const dow = cursor.getDay();
    const rawSlots = schedule.filter(s =>
      (!s.specificDate && s.dayOfWeek === dow) || s.specificDate === dateStr
    );
    const slotsForDay = deduplicateSlotsByTime(rawSlots, dateStr);
    if (slotsForDay.length > 0) {
      const allTaken = slotsForDay.every(slot =>
        confirmed.some(b => b.groupScheduleId === slot.id && b.date === dateStr)
      );
      if (allTaken) fullyBooked.add(dateStr);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return fullyBooked;
}

// Returns dates (DD.MM.YYYY) where ALL group slots for that date are at max capacity
function computeGroupFullyBookedDates(
  schedule: ScheduleSlot[],
  allBookings: Booking[]
): Set<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today.getFullYear(), today.getMonth() + MAX_MONTHS_AHEAD + 1, 0);
  const confirmed = allBookings.filter(b => b.status === "confirmed");

  const fullyBooked = new Set<string>();
  const cursor = new Date(today);
  cursor.setDate(today.getDate() + 1);

  while (cursor <= maxDate) {
    const dateStr = toDateStr(cursor);
    const dow = cursor.getDay();
    const rawSlots = schedule.filter(s =>
      (!s.specificDate && s.dayOfWeek === dow) || s.specificDate === dateStr
    );
    const slotsForDay = deduplicateSlotsByTime(rawSlots, dateStr);
    if (slotsForDay.length > 0) {
      const allFull = slotsForDay.every(slot => {
        const taken = confirmed.filter(
          b => b.groupScheduleId === slot.id && b.date === dateStr
        ).length;
        return taken >= slot.maxStudents;
      });
      if (allFull) fullyBooked.add(dateStr);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return fullyBooked;
}

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.ADMIN_CHAT_ID;

  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is not set");
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });

  bot.on("polling_error", (error) => {
    console.error("Telegram polling error:", error.message);
  });

  bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const param = match?.[1]?.trim();
    clearState(chatId);

    let user = await storage.getUserByTelegramId(chatId);
    if (!user) {
      user = await storage.createUser({
        telegramId: chatId,
        telegramUsername: msg.from?.username || null,
        firstName: msg.from?.first_name || null,
        lastName: null,
        age: null,
        grade: null,
        goal: null,
        phone: null,
      });
    }

    if (param === "about") {
      await sendAboutMentor(bot, chatId);
      return;
    }
    if (param === "individual") {
      await sendServiceInfo(bot, chatId, "individual");
      return;
    }
    if (param === "group") {
      await sendServiceInfo(bot, chatId, "group");
      return;
    }
    if (param === "sub4") {
      await sendServiceInfo(bot, chatId, "sub4");
      return;
    }
    if (param === "sub8") {
      await sendServiceInfo(bot, chatId, "sub8");
      return;
    }

    const name = msg.from?.first_name || "друг";
    await bot.sendMessage(chatId,
      `Привет, ${name}! 👋\n\n` +
      `Я — бот-помощник ментора по физике Кирилла Анисимова.\n\n` +
      `📚 Чем могу помочь:\n` +
      `• Запись на индивидуальные и групповые занятия\n` +
      `• Выбор удобного времени и дня\n` +
      `• Напоминания о занятиях\n` +
      `• Информация о методике обучения\n\n` +
      `🎯 Специализация ментора:\n` +
      `• Подготовка к ЕГЭ и ОГЭ по физике\n` +
      `• Олимпиадная физика\n` +
      `• Устранение пробелов в знаниях\n` +
      `• Развитие физического мышления\n\n` +
      `📅 Для записи на занятие нажми кнопку ниже!`,
      { reply_markup: MAIN_KEYBOARD }
    );
  });

  const MAIN_MENU_COMMANDS = new Set([
    "📝 Записаться на занятие",
    "📋 Мои записи",
    "ℹ️ О менторе",
    "📞 Контакты",
    "❓ Задать вопрос",
    "📖 Формат занятий",
    "💰 Услуги и оплата",
  ]);

  bot.on("message", async (msg) => {
    try {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();
    if (!text) return;
    if (text.startsWith("/start")) return;

    const state = getState(chatId);

    // Main menu commands always reset state and take priority
    const isCancelCommand = text === "⬅️ Назад" || text === "❌ Отмена";
    const isMainMenuCommand = MAIN_MENU_COMMANDS.has(text);

    if ((isCancelCommand || isMainMenuCommand) && state) {
      clearState(chatId);
    }

    if (isCancelCommand) {
      await bot.sendMessage(chatId, "Хорошо! Выбери, что тебя интересует:", {
        reply_markup: MAIN_KEYBOARD,
      });
      return;
    }

    if (text === "📝 Записаться на занятие") {
      await sendBookingTypeChoice(bot, chatId);
      return;
    }
    if (text === "📋 Мои записи") {
      await sendMyBookings(bot, chatId);
      return;
    }
    if (text === "ℹ️ О менторе") {
      await sendAboutMentor(bot, chatId);
      return;
    }
    if (text === "📞 Контакты") {
      await sendContacts(bot, chatId);
      return;
    }
    if (text === "❓ Задать вопрос") {
      await sendAskQuestion(bot, chatId);
      return;
    }
    if (text === "📖 Формат занятий") {
      await sendFormatInfo(bot, chatId);
      return;
    }
    if (text === "💰 Услуги и оплата") {
      await sendServicesMenu(bot, chatId);
      return;
    }

    if (state) {
      await handleStateInput(bot, chatId, text, msg, state);
      return;
    }
    } catch (err) {
      console.error("Error in message handler:", err);
    }
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    if (!chatId) return;
    const data = query.data;
    if (!data) return;

    await bot.answerCallbackQuery(query.id);

    if (data === "noop") {
      return;
    }

    if (data === "book_lesson") {
      await sendBookingTypeChoice(bot, chatId);
      return;
    }

    if (data === "book_individual") {
      setState(chatId, "individual_calendar", { type: "individual" });
      await sendIndividualScheduleSelection(bot, chatId);
      return;
    }

    if (data === "book_group") {
      await sendScheduleSlotSelection(bot, chatId);
      return;
    }

    if (data.startsWith("cal_ind_nav_")) {
      const parts = data.replace("cal_ind_nav_", "").split("_");
      const navYear = parseInt(parts[0]);
      const navMonth = parseInt(parts[1]);
      const schedule = await storage.getScheduleByType("individual");
      const availableDays = new Set(schedule.filter(s => !s.specificDate).map(s => s.dayOfWeek));
      const specificDates = new Set(schedule.filter(s => !!s.specificDate).map(s => s.specificDate as string));
      const bk = await storage.getAllBookings();
      const fullyBookedDates = computeIndividualFullyBookedDates(schedule, bk as unknown as Booking[]);
      const msgId = query.message?.message_id;
      if (msgId) {
        await bot.editMessageText(`📅 Выбери дату занятия:`, {
          chat_id: chatId,
          message_id: msgId,
          reply_markup: buildCalendarKeyboard(availableDays, specificDates, "cal_ind", navYear, navMonth, fullyBookedDates),
        });
      }
      return;
    }

    if (data.startsWith("cal_grp_nav_")) {
      const parts = data.replace("cal_grp_nav_", "").split("_");
      const navYear = parseInt(parts[0]);
      const navMonth = parseInt(parts[1]);
      const schedule = await storage.getScheduleByType("group");
      const availableDays = new Set(schedule.filter(s => !s.specificDate).map(s => s.dayOfWeek));
      const specificDates = new Set(schedule.filter(s => !!s.specificDate).map(s => s.specificDate as string));
      const bk = await storage.getAllBookings();
      const fullyBookedDates = computeGroupFullyBookedDates(schedule, bk as unknown as Booking[]);
      const msgId = query.message?.message_id;
      if (msgId) {
        await bot.editMessageText(`👥 Выбери дату группового занятия:`, {
          chat_id: chatId,
          message_id: msgId,
          reply_markup: buildCalendarKeyboard(availableDays, specificDates, "cal_grp", navYear, navMonth, fullyBookedDates),
        });
      }
      return;
    }

    if (data.startsWith("cal_ind_")) {
      const dateStr = data.replace("cal_ind_", "");
      const date = parseDateStr(dateStr);
      setState(chatId, "individual_slots", { type: "individual", dayOfWeek: date.getDay(), specificDate: dateStr });
      await sendIndividualSlotsForDate(bot, chatId, dateStr);
      return;
    }

    if (data.startsWith("cal_grp_")) {
      const dateStr = data.replace("cal_grp_", "");
      const date = parseDateStr(dateStr);
      setState(chatId, "group_slots", { type: "group", dayOfWeek: date.getDay(), specificDate: dateStr });
      await sendGroupSlotsForDate(bot, chatId, dateStr);
      return;
    }

    if (data.startsWith("ind_slot_")) {
      const slotId = parseInt(data.replace("ind_slot_", ""));
      const slot = await storage.getScheduleSlotById(slotId);
      if (!slot) {
        await bot.sendMessage(chatId, "К сожалению, этот слот больше не доступен.");
        return;
      }

      // Use the date picked in the calendar (stored in state), or fall back to slot's default
      const prevState = getState(chatId);
      const pickedDate = prevState?.data?.specificDate || slot.specificDate || null;

      if (pickedDate) {
        const existingBookings = (await storage.getAllBookings()).filter(
          b => b.groupScheduleId === slotId && b.date === pickedDate && b.status === "confirmed"
        );
        if (existingBookings.length > 0) {
          await bot.sendMessage(chatId,
            "😔 Это время уже занято. Выбери другой слот:",
            { reply_markup: { inline_keyboard: [[{ text: "📅 Выбрать другую дату", callback_data: "book_individual" }]] } }
          );
          return;
        }
      }

      setState(chatId, "collect_name", {
        type: "individual",
        dayOfWeek: slot.dayOfWeek,
        time: slot.time,
        groupScheduleId: slotId,
        specificDate: pickedDate,
      });

      const user = await storage.getUserByTelegramId(chatId);
      if (user && user.firstName && user.lastName && user.phone) {
        const state = getState(chatId)!;
        state.data.userId = user.id;
        state.step = "confirm_booking";
        await sendBookingConfirmation(bot, chatId, state.data, user);
      } else {
        await bot.sendMessage(chatId,
          "Отлично! Теперь мне нужно немного информации о тебе.\n\nВведи свое имя:",
          { reply_markup: { keyboard: [[{ text: "❌ Отмена" }]], resize_keyboard: true } }
        );
      }
      return;
    }

    if (data.startsWith("group_slot_")) {
      const slotId = parseInt(data.replace("group_slot_", ""));
      const slot = await storage.getScheduleSlotById(slotId);
      if (!slot) {
        await bot.sendMessage(chatId, "К сожалению, этот слот больше не доступен.");
        return;
      }

      // Use the date picked in the calendar (stored in state), or fall back to slot's default
      const prevState = getState(chatId);
      const pickedDate = prevState?.data?.specificDate || slot.specificDate || getSlotBookingDate(slot);

      const existingBookings = (await storage.getAllBookings()).filter(
        b => b.groupScheduleId === slotId && b.date === pickedDate && b.status === "confirmed"
      );
      if (existingBookings.length >= slot.maxStudents) {
        await bot.sendMessage(chatId,
          "К сожалению, на этот слот уже нет свободных мест. Попробуй другое время!",
          { reply_markup: { inline_keyboard: [[{ text: "🔄 Выбрать другой слот", callback_data: "book_group" }]] } }
        );
        return;
      }

      setState(chatId, "collect_name", {
        type: "group",
        groupScheduleId: slotId,
        dayOfWeek: slot.dayOfWeek,
        time: slot.time,
        specificDate: pickedDate,
      });

      const user = await storage.getUserByTelegramId(chatId);
      if (user && user.firstName && user.lastName && user.phone) {
        const state = getState(chatId)!;
        state.data.userId = user.id;
        state.step = "confirm_booking";
        await sendBookingConfirmation(bot, chatId, state.data, user);
      } else {
        await bot.sendMessage(chatId,
          "Отлично! Теперь мне нужно немного информации о тебе.\n\nВведи свое имя:",
          { reply_markup: { keyboard: [[{ text: "❌ Отмена" }]], resize_keyboard: true } }
        );
      }
      return;
    }

    if (data === "confirm_yes") {
      const state = getState(chatId);
      if (!state) return;
      await finalizeBooking(bot, chatId, state.data, adminChatId || null);
      clearState(chatId);
      return;
    }

    if (data === "confirm_no") {
      clearState(chatId);
      await bot.sendMessage(chatId, "Запись отменена. Если передумаешь — я всегда на связи!", {
        reply_markup: MAIN_KEYBOARD,
      });
      return;
    }

    if (data.startsWith("service_")) {
      const service = data.replace("service_", "");
      await sendServiceInfo(bot, chatId, service);
      return;
    }

    if (data === "buy_sub4" || data === "buy_sub8") {
      const count = data === "buy_sub4" ? 4 : 8;
      let user = await storage.getUserByTelegramId(chatId);
      if (!user) {
        user = await storage.createUser({
          telegramId: chatId,
          telegramUsername: query.from?.username || null,
          firstName: query.from?.first_name || null,
          lastName: null, age: null, grade: null, goal: null, phone: null,
        });
      }

      const sub = await storage.createSubscription({
        userId: user.id,
        type: "individual",
        totalLessons: count,
        remainingLessons: count,
        isPaid: false,
      });

      await bot.sendMessage(chatId,
        `💳 Абонемент на ${count} занятий оформлен!\n\n` +
        `Для оплаты свяжитесь с Кириллом:\n` +
        `💬 Telegram: @anisimovvd\n` +
        `📱 Телефон: +7 (964) 882-36-78\n\n` +
        `После подтверждения оплаты абонемент будет активирован.\n\n` +
        `ℹ️ Номер абонемента: #${sub.id}`,
        { reply_markup: MAIN_KEYBOARD }
      );

      if (adminChatId) {
        const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Без имени";
        await bot.sendMessage(parseInt(adminChatId),
          `💳 Новый абонемент!\n\n` +
          `👤 ${name} (@${user.telegramUsername || "нет username"})\n` +
          `📚 Абонемент на ${count} занятий\n` +
          `ℹ️ ID: #${sub.id}\n\n` +
          `Ожидает оплаты. Подтвердите в панели управления.`
        );
      }
      return;
    }

    if (data.startsWith("goal_")) {
      const state = getState(chatId);
      if (!state || state.step !== "collect_goal") return;

      const goalMap: Record<string, string> = {
        goal_ege: "Подготовка к ЕГЭ",
        goal_oge: "Подготовка к ОГЭ",
        goal_olympiad: "Олимпиады",
        goal_understand: "Понимание предмета",
        goal_gaps: "Устранение пробелов",
      };

      state.data.goal = goalMap[data] || data;

      const user = await storage.getUserByTelegramId(chatId);
      if (user) {
        await storage.updateUser(user.id, { goal: state.data.goal });
      }

      state.step = "collect_phone";
      await bot.sendMessage(chatId,
        "📱 Для завершения записи нам нужен твой номер телефона.\n\nНажми кнопку ниже, чтобы поделиться контактом, или отправь номер в формате +7XXXXXXXXXX:",
        {
          reply_markup: {
            keyboard: [
              [{ text: "📱 Поделиться контактом", request_contact: true }],
              [{ text: "❌ Отмена" }],
            ],
            resize_keyboard: true,
          },
        }
      );
    }

    if (data.startsWith("grade_")) {
      const state = getState(chatId);
      if (!state || state.step !== "collect_grade") return;

      const gradeMap: Record<string, string> = {
        grade_7: "7 класс",
        grade_8: "8 класс",
        grade_9: "9 класс",
        grade_10: "10 класс",
        grade_11: "11 класс",
        grade_student: "Студент",
        grade_adult: "Взрослый",
      };

      state.data.grade = gradeMap[data] || data;

      const user = await storage.getUserByTelegramId(chatId);
      if (user) {
        await storage.updateUser(user.id, { grade: state.data.grade });
      }

      state.step = "collect_goal";
      await bot.sendMessage(chatId,
        "Что является твоей главной целью?",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Подготовка к ЕГЭ", callback_data: "goal_ege" }],
              [{ text: "Подготовка к ОГЭ", callback_data: "goal_oge" }],
              [{ text: "Олимпиады", callback_data: "goal_olympiad" }],
              [{ text: "Понимание предмета", callback_data: "goal_understand" }],
              [{ text: "Устранение пробелов", callback_data: "goal_gaps" }],
            ],
          },
        }
      );
    }
  });

  bot.on("contact", async (msg) => {
    const chatId = msg.chat.id;
    const state = getState(chatId);
    if (state && state.step === "collect_phone" && msg.contact) {
      state.data.phone = msg.contact.phone_number;
      const user = await storage.getUserByTelegramId(chatId);
      if (user) {
        await storage.updateUser(user.id, { phone: state.data.phone });
      }
      state.step = "collect_comments";
      await bot.sendMessage(chatId,
        "Если у тебя есть дополнительные пожелания или комментарии, напиши их сейчас.\n\nИли нажми кнопку ниже, чтобы пропустить:",
        { reply_markup: { keyboard: [[{ text: "Пропустить →" }], [{ text: "❌ Отмена" }]], resize_keyboard: true } }
      );
    }
  });

  console.log("Telegram bot started successfully");
  return bot;
}

export function setupGradeCallbacks(_bot: TelegramBot) {
}

async function handleStateInput(bot: TelegramBot, chatId: number, text: string, msg: TelegramBot.Message, state: UserState) {
  if (text === "❌ Отмена" || text === "⬅️ Назад") {
    clearState(chatId);
    await bot.sendMessage(chatId, "Хорошо! Выбери, что тебя интересует:", {
      reply_markup: MAIN_KEYBOARD,
    });
    return;
  }

  switch (state.step) {
    case "collect_name": {
      state.data.firstName = text;
      state.step = "collect_lastname";
      await bot.sendMessage(chatId, `Приятно познакомиться, ${text}!\nТеперь введи свою фамилию:`);
      break;
    }
    case "collect_lastname": {
      state.data.lastName = text;
      const user = await storage.getUserByTelegramId(chatId);
      if (user) {
        await storage.updateUser(user.id, { firstName: state.data.firstName, lastName: text });
      }
      state.step = "collect_age";
      await bot.sendMessage(chatId, "Введи свой возраст:");
      break;
    }
    case "collect_age": {
      const age = parseInt(text);
      if (isNaN(age) || age < 5 || age > 100) {
        await bot.sendMessage(chatId, "Пожалуйста, введи корректный возраст (число от 5 до 100):");
        return;
      }
      state.data.age = age;
      const user = await storage.getUserByTelegramId(chatId);
      if (user) {
        await storage.updateUser(user.id, { age });
      }
      state.step = "collect_grade";
      await bot.sendMessage(chatId, "Выбери свой класс или статус:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "7 класс", callback_data: "grade_7" }, { text: "8 класс", callback_data: "grade_8" }],
            [{ text: "9 класс", callback_data: "grade_9" }, { text: "10 класс", callback_data: "grade_10" }],
            [{ text: "11 класс", callback_data: "grade_11" }, { text: "Студент", callback_data: "grade_student" }],
            [{ text: "Взрослый", callback_data: "grade_adult" }],
          ],
        },
      });
      break;
    }
    case "collect_phone": {
      if (text.match(/^\+?[0-9\s\-\(\)]{10,15}$/)) {
        state.data.phone = text;
        const user = await storage.getUserByTelegramId(chatId);
        if (user) {
          await storage.updateUser(user.id, { phone: text });
        }
        state.step = "collect_comments";
        await bot.sendMessage(chatId,
          "Если у тебя есть дополнительные пожелания или комментарии, напиши их сейчас.\n\nИли нажми кнопку ниже, чтобы пропустить:",
          { reply_markup: { keyboard: [[{ text: "Пропустить →" }], [{ text: "❌ Отмена" }]], resize_keyboard: true } }
        );
      } else {
        await bot.sendMessage(chatId, "Пожалуйста, отправь номер в формате +7XXXXXXXXXX или нажми кнопку ниже:", {
          reply_markup: {
            keyboard: [
              [{ text: "📱 Поделиться контактом", request_contact: true }],
              [{ text: "❌ Отмена" }],
            ],
            resize_keyboard: true,
          },
        });
      }
      break;
    }
    case "collect_comments": {
      const isSkip = text === "/skip" || text === "Пропустить →";
      state.data.comments = isSkip ? null : text;

      let user = await storage.getUserByTelegramId(chatId);
      // Fallback: if already have userId in state, use it
      if (!user && state.data.userId) {
        user = await storage.getUser(state.data.userId);
      }
      if (user) {
        state.data.userId = user.id;
        state.step = "confirm_booking";
        await sendBookingConfirmation(bot, chatId, state.data, user);
      } else {
        await bot.sendMessage(chatId, "Не удалось найти данные профиля. Попробуй начать запись заново.", {
          reply_markup: MAIN_KEYBOARD,
        });
        clearState(chatId);
      }
      break;
    }
    case "ask_question": {
      clearState(chatId);
      const adminId = process.env.ADMIN_CHAT_ID;
      if (adminId) {
        const user = await storage.getUserByTelegramId(chatId);
        const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : msg.from?.first_name || "Пользователь";
        await bot.sendMessage(parseInt(adminId),
          `❓ Новый вопрос от ${userName} (@${msg.from?.username || "нет username"}):\n\n${text}`
        );
      }
      await bot.sendMessage(chatId,
        "Спасибо за вопрос! Кирилл ответит тебе в ближайшее время. 🙏",
        { reply_markup: MAIN_KEYBOARD }
      );
      break;
    }
    default:
      break;
  }
}

async function sendBookingTypeChoice(bot: TelegramBot, chatId: number) {
  await bot.sendMessage(chatId,
    "📚 Какой тип занятия тебя интересует?",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "👤 Индивидуальное занятие", callback_data: "book_individual" }],
          [{ text: "👥 Групповое занятие", callback_data: "book_group" }],
        ],
      },
    }
  );
}

async function sendIndividualScheduleSelection(bot: TelegramBot, chatId: number) {
  const schedule = await storage.getScheduleByType("individual");

  if (schedule.length === 0) {
    await bot.sendMessage(chatId,
      "😔 К сожалению, сейчас нет свободных слотов для индивидуальных занятий.\n\n" +
      "Свяжись с Кириллом напрямую, чтобы договориться об удобном времени:\n" +
      "💬 @anisimovvd\n" +
      "📱 +7 (964) 882-36-78",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "👥 Записаться на групповое занятие", callback_data: "book_group" }],
          ],
        },
      }
    );
    return;
  }

  const availableDays = new Set(schedule.filter(s => !s.specificDate).map(s => s.dayOfWeek));
  const specificDates = new Set(schedule.filter(s => !!s.specificDate).map(s => s.specificDate as string));
  const allBookings = await storage.getAllBookings();
  const fullyBookedDates = computeIndividualFullyBookedDates(schedule, allBookings as unknown as Booking[]);

  const calKeyboard = buildCalendarKeyboard(availableDays, specificDates, "cal_ind", undefined, undefined, fullyBookedDates);

  await bot.sendMessage(chatId,
    `📅 Выбери дату занятия:`,
    { reply_markup: calKeyboard }
  );
}

async function sendIndividualSlotsForDate(bot: TelegramBot, chatId: number, dateStr: string) {
  const date = parseDateStr(dateStr);
  const dow = date.getDay();
  const dayName = DAYS_RU[dow];
  const [d, m, y] = dateStr.split(".");
  const humanDate = `${parseInt(d)} ${MONTHS_RU_SHORT[parseInt(m) - 1]} ${y}`;

  const schedule = await storage.getScheduleByType("individual");
  const allBookings = await storage.getAllBookings();
  const confirmedForDate = allBookings.filter(
    b => b.type === "individual" && b.status === "confirmed" && b.date === dateStr
  );

  const rawSlots = schedule.filter(s =>
    (s.specificDate === dateStr) || (!s.specificDate && s.dayOfWeek === dow)
  );
  const slots = deduplicateSlotsByTime(rawSlots, dateStr).filter(
    s => !confirmedForDate.some(b => b.groupScheduleId === s.id)
  );

  const fullyBookedDates = computeIndividualFullyBookedDates(schedule, allBookings as unknown as Booking[]);
  const availableDays = new Set(schedule.filter(s => !s.specificDate).map(s => s.dayOfWeek));
  const specificDates = new Set(schedule.filter(s => !!s.specificDate).map(s => s.specificDate as string));

  if (slots.length === 0) {
    await bot.sendMessage(chatId,
      `😔 На ${humanDate} (${dayName}) все слоты уже заняты.\n\nВыбери другую дату:`,
      { reply_markup: buildCalendarKeyboard(availableDays, specificDates, "cal_ind", undefined, undefined, fullyBookedDates) }
    );
    return;
  }

  const buttons = slots.map(slot => ([{
    text: `⏰ ${slot.time}${slot.title ? ` — ${slot.title}` : ""}`,
    callback_data: `ind_slot_${slot.id}`,
  }]));
  buttons.push([{ text: "◀️ Назад к календарю", callback_data: "book_individual" }]);

  await bot.sendMessage(chatId,
    `📅 ${humanDate}, ${dayName}\n\nВыбери удобное время:`,
    { reply_markup: { inline_keyboard: buttons } }
  );
}

async function sendServicesMenu(bot: TelegramBot, chatId: number) {
  await bot.sendMessage(chatId,
    "💰 Услуги и оплата\n\nВыбери интересующую услугу:",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "👤 Индивидуальное занятие", callback_data: "service_individual" }],
          [{ text: "👥 Групповое занятие", callback_data: "service_group" }],
          [{ text: "💳 Абонемент на 4 занятия", callback_data: "service_sub4" }],
          [{ text: "💳 Абонемент на 8 занятий", callback_data: "service_sub8" }],
        ],
      },
    }
  );
}

async function sendScheduleSlotSelection(bot: TelegramBot, chatId: number) {
  const schedule = await storage.getScheduleByType("group");

  if (schedule.length === 0) {
    await bot.sendMessage(chatId,
      "К сожалению, сейчас нет доступных слотов для групповых занятий. Попробуй позже или запишись на индивидуальное занятие!",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "👤 Записаться на индивидуальное", callback_data: "book_individual" }],
          ],
        },
      }
    );
    return;
  }

  const availableDays = new Set(schedule.filter(s => !s.specificDate).map(s => s.dayOfWeek));
  const specificDates = new Set(schedule.filter(s => !!s.specificDate).map(s => s.specificDate as string));
  const allBookings = await storage.getAllBookings();
  const fullyBookedDates = computeGroupFullyBookedDates(schedule, allBookings as unknown as Booking[]);

  const calKeyboard = buildCalendarKeyboard(availableDays, specificDates, "cal_grp", undefined, undefined, fullyBookedDates);

  await bot.sendMessage(chatId,
    `👥 Выбери дату группового занятия:`,
    { reply_markup: calKeyboard }
  );
}

async function sendGroupSlotsForDate(bot: TelegramBot, chatId: number, dateStr: string) {
  const date = parseDateStr(dateStr);
  const dow = date.getDay();
  const dayName = DAYS_RU[dow];
  const [d, m, y] = dateStr.split(".");
  const humanDate = `${parseInt(d)} ${MONTHS_RU_SHORT[parseInt(m) - 1]} ${y}`;

  const schedule = await storage.getScheduleByType("group");
  const allBookings = await storage.getAllBookings();
  const fullyBookedDates = computeGroupFullyBookedDates(schedule, allBookings as unknown as Booking[]);
  const availableDays = new Set(schedule.filter(s => !s.specificDate).map(s => s.dayOfWeek));
  const specificDates = new Set(schedule.filter(s => !!s.specificDate).map(s => s.specificDate as string));

  const rawGroupSlots = schedule.filter(s =>
    (s.specificDate === dateStr) || (!s.specificDate && s.dayOfWeek === dow)
  );
  const slots = deduplicateSlotsByTime(rawGroupSlots, dateStr);

  if (slots.length === 0) {
    await bot.sendMessage(chatId,
      `😔 На ${humanDate} (${dayName}) нет групповых занятий.\n\nВыбери другую дату:`,
      { reply_markup: buildCalendarKeyboard(availableDays, specificDates, "cal_grp", undefined, undefined, fullyBookedDates) }
    );
    return;
  }

  const buttons: TelegramBot.InlineKeyboardButton[][] = [];
  for (const slot of slots) {
    const slotDate = slot.specificDate || dateStr;
    const taken = allBookings.filter(
      b => b.groupScheduleId === slot.id && b.date === slotDate && b.status === "confirmed"
    ).length;
    const free = slot.maxStudents - taken;
    const freeLabel = free > 0 ? `✅ ${free} мест` : "❌ Мест нет";
    const label = `⏰ ${slot.time}${slot.title ? ` — ${slot.title}` : ""} · ${freeLabel}`;
    buttons.push([{ text: label, callback_data: free > 0 ? `group_slot_${slot.id}` : "noop" }]);
  }
  buttons.push([{ text: "◀️ Назад к календарю", callback_data: "book_group" }]);

  await bot.sendMessage(chatId,
    `📅 ${humanDate}, ${dayName}\n\nДоступные групповые занятия:`,
    { reply_markup: { inline_keyboard: buttons } }
  );
}

async function sendBookingConfirmation(bot: TelegramBot, chatId: number, data: Record<string, any>, user: User) {
  const typeText = data.type === "individual" ? "Индивидуальное" : "Групповое";
  const bookingDate = data.specificDate || getNextDateForDay(data.dayOfWeek);
  const dayText = DAYS_RU[data.dayOfWeek];

  await bot.sendMessage(chatId,
    `📋 Проверь данные записи:\n\n` +
    `📚 Тип занятия: ${typeText}\n` +
    `📅 Дата: ${bookingDate} (${dayText})\n` +
    `⏰ Время: ${data.time}\n\n` +
    `👤 ${user.firstName || ""} ${user.lastName || ""}\n` +
    (user.phone ? `📱 ${user.phone}\n` : "") +
    `\nВсе верно?`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Да, записаться!", callback_data: "confirm_yes" },
            { text: "❌ Отмена", callback_data: "confirm_no" },
          ],
        ],
      },
    }
  );
}

async function finalizeBooking(bot: TelegramBot, chatId: number, data: Record<string, any>, adminChatId: string | null) {
  const bookingDate = data.specificDate || getNextDateForDay(data.dayOfWeek);
  const user = await storage.getUserByTelegramId(chatId);
  if (!user) return;

  const allBookings = await storage.getAllBookings();

  // Guard: prevent the user from booking the same slot+date twice
  if (data.groupScheduleId) {
    const userAlreadyBooked = allBookings.some(
      b => b.userId === user.id &&
           b.groupScheduleId === data.groupScheduleId &&
           b.date === bookingDate &&
           (b.status === "confirmed" || b.status === "pending")
    );
    if (userAlreadyBooked) {
      await bot.sendMessage(chatId,
        "⚠️ Ты уже записан на это занятие! Если нужно изменить запись — свяжись с Кириллом: @anisimovvd",
        { reply_markup: MAIN_KEYBOARD }
      );
      return;
    }
  }

  // Guard: re-check individual slot availability (race condition protection)
  if (data.type === "individual" && data.groupScheduleId) {
    const taken = allBookings.filter(
      b => b.groupScheduleId === data.groupScheduleId &&
           b.date === bookingDate &&
           b.status === "confirmed"
    ).length;
    if (taken > 0) {
      await bot.sendMessage(chatId,
        "😔 К сожалению, это время уже успели занять. Выбери другой слот:",
        { reply_markup: { inline_keyboard: [[{ text: "📅 Выбрать время", callback_data: "book_individual" }]] } }
      );
      return;
    }
  }

  // Guard: re-check group slot capacity (race condition protection)
  if (data.type === "group" && data.groupScheduleId) {
    const slot = await storage.getScheduleSlotById(data.groupScheduleId);
    if (slot) {
      const taken = allBookings.filter(
        b => b.groupScheduleId === data.groupScheduleId &&
             b.date === bookingDate &&
             b.status === "confirmed"
      ).length;
      if (taken >= slot.maxStudents) {
        await bot.sendMessage(chatId,
          "😔 К сожалению, на этот слот уже нет свободных мест. Выбери другое время:",
          { reply_markup: { inline_keyboard: [[{ text: "📅 Другой слот", callback_data: "book_group" }]] } }
        );
        return;
      }
    }
  }

  const booking = await storage.createBooking({
    userId: user.id,
    type: data.type,
    date: bookingDate,
    time: data.time,
    status: "pending",
    isPaid: false,
    groupScheduleId: data.groupScheduleId || null,
  });

  const typeText = data.type === "individual" ? "Индивидуальное" : "Групповое";
  const dayText = DAYS_RU[data.dayOfWeek] || '';

  await bot.sendMessage(chatId,
    `📬 Заявка принята!\n\n` +
    `📚 ${typeText} занятие\n` +
    `📅 ${dayText}, ${bookingDate}\n` +
    `⏰ ${data.time}\n\n` +
    `Кирилл скоро подтвердит запись и пришлёт уведомление. Если нужно изменить запись, свяжись напрямую: @anisimovvd`,
    { reply_markup: MAIN_KEYBOARD }
  );

  if (adminChatId) {
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Без имени";
    await bot.sendMessage(parseInt(adminChatId),
      `📝 Новая запись!\n\n` +
      `👤 ${name} (@${user.telegramUsername || "нет username"})\n` +
      `📱 ${user.phone || "телефон не указан"}\n` +
      `📚 ${typeText} занятие\n` +
      `📅 ${bookingDate} в ${data.time}\n` +
      `🆔 Запись #${booking.id}`
    );
  }
}

async function sendMyBookings(bot: TelegramBot, chatId: number) {
  const user = await storage.getUserByTelegramId(chatId);
  if (!user) {
    await bot.sendMessage(chatId, "У тебя пока нет записей.", { reply_markup: MAIN_KEYBOARD });
    return;
  }

  const [bookings, subs] = await Promise.all([
    storage.getBookingsByUserId(user.id),
    storage.getSubscriptionsByUserId(user.id),
  ]);

  const activeBookings = bookings.filter(b => b.status === "confirmed" || b.status === "pending");
  const activeSubs = subs.filter(s => s.isPaid && s.remainingLessons > 0);

  let msg = "📋 Твои данные:\n\n";

  if (activeBookings.length === 0) {
    msg += "📅 Записей нет. Нажми «📝 Записаться на занятие», чтобы выбрать время.\n\n";
  } else {
    msg += "📅 Ближайшие занятия:\n";
    for (const b of activeBookings) {
      const typeText = b.type === "individual" ? "Инд." : "Груп.";
      const statusText = b.status === "pending" ? " ⏳" : " ✅";
      msg += `• ${b.date} в ${b.time} — ${typeText}${statusText}\n`;
    }
    msg += "\n";
  }

  if (activeSubs.length > 0) {
    msg += "💳 Активные абонементы:\n";
    for (const s of activeSubs) {
      const typeText = s.type === "individual" ? "Индивидуальный" : "Групповой";
      msg += `• ${typeText}: осталось ${s.remainingLessons} из ${s.totalLessons} занятий\n`;
    }
    const pendingSubs = subs.filter(s => !s.isPaid);
    if (pendingSubs.length > 0) {
      msg += `\n⏳ Абонементов ожидает оплаты: ${pendingSubs.length}. Свяжись с @anisimovvd`;
    }
  }

  await bot.sendMessage(chatId, msg, { reply_markup: MAIN_KEYBOARD });
}

async function sendAboutMentor(bot: TelegramBot, chatId: number) {
  await bot.sendMessage(chatId,
    `ℹ️ О преподавателе\n\n` +
    `👨‍🏫 Кирилл — репетитор по физике с опытом более 2 лет\n\n` +
    `🎓 Образование:\n` +
    `РГУ нефти и газа имени Губкина\n` +
    `Факультет инженерной механики\n\n` +
    `📊 Опыт и результаты:\n` +
    `• более 200 учеников прошли через занятия\n` +
    `• подготовка к ОГЭ по физике\n` +
    `• повышение успеваемости (7–11 класс)\n` +
    `• помощь в разборе сложных задач и тем\n\n` +
    `💡 Подход к обучению:\n` +
    `• объясняю до полного понимания, а не «по шаблону»\n` +
    `• делаю упор на логику и мышление\n` +
    `• подстраиваюсь под уровень каждого ученика\n\n` +
    `⚡️ Немного обо мне:\n` +
    `Активно занимаюсь спортом, 7 лет играл в футбол на профессиональном уровне. Считаю, что дисциплина и системность напрямую влияют на результат — и в учебе тоже`,
    { reply_markup: MAIN_KEYBOARD }
  );
}

async function sendContacts(bot: TelegramBot, chatId: number) {
  await bot.sendMessage(chatId,
    `📞 Контакты\n\n` +
    `💬 Telegram: @anisimovvd\n` +
    `📱 Телефон: +7 (964) 882-36-78\n\n` +
    `Кирилл на связи с 9:00 до 21:00`,
    { reply_markup: MAIN_KEYBOARD }
  );
}

async function sendAskQuestion(bot: TelegramBot, chatId: number) {
  setState(chatId, "ask_question", {});
  await bot.sendMessage(chatId,
    "❓ Напиши свой вопрос, и Кирилл ответит тебе в ближайшее время:",
    { reply_markup: { keyboard: [[{ text: "❌ Отмена" }]], resize_keyboard: true } }
  );
}

async function sendFormatInfo(bot: TelegramBot, chatId: number) {
  await bot.sendMessage(chatId,
    `🎯 Как проходят наши занятия?\n\n` +
    `Я сделал обучение максимально комфортным и эффективным, чтобы ты видел прогресс уже после первой недели:\n\n` +
    `💻 Где занимаемся?\n` +
    `Уроки проходят в формате Live-стримов (Teams / Яндекс Телемост). Это полноценная замена оффлайну: мы используем интерактивную доску, я вижу, как ты решаешь задачу, а ты — все мои записи в реальном времени.\n\n` +
    `📊 Как это работает?\n\n` +
    `Индивидуальный трек: Никаких общих программ. Я адаптирую план под твои цели — будь то подготовка к экзамену или закрытие пробелов в школьной программе.\n\n` +
    `Материалы всегда под рукой: После каждого занятия ты получаешь конспект, записи урока и домашнее задание в удобном формате, и даже можешь зайти глянуть все наши записи на нашу с тобой доску.\n\n` +
    `Связь 24/7: Возник вопрос по задаче, пока делаешь домашку? Пиши мне в личку — разберём и закроем вопрос до следующего урока.\n\n` +
    `🚀 Результат — это главное\n` +
    `Мы не просто «зубрим» теорию. Мы учимся применять её на практике, чтобы ты чувствовал себя уверенно и на контрольной, и на реальном экзамене.\n\n` +
    `Готов начать? 👇 Жми кнопку ниже, чтобы записаться и обсудить твою цель!`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📝 Записаться на занятие", callback_data: "book_lesson" }],
        ],
      },
    }
  );
}

async function sendServiceInfo(bot: TelegramBot, chatId: number, service: string) {
  const messages: Record<string, string> = {
    individual: `👤 Разовое занятие\n\nПерсональное занятие один на один с ментором.\n\n⏱ Длительность: 60 минут\n📍 Формат: онлайн\n💰 Стоимость: 1500 ₽ / 60 мин\n\nДля записи нажми кнопку "📝 Записаться на занятие"`,
    group: `👥 Групповое занятие\n\nЗанятия в малой группе до 4 учеников.\n\n⏱ Длительность: 90 минут\n📍 Формат: онлайн\n💰 Стоимость: 1000 ₽ / 90 мин\n\nДля записи нажми кнопку "📝 Записаться на занятие"`,
    sub4: `💳 Пакет «Прогресс» — 4 занятия\n\nЭкономный вариант с небольшой скидкой.\n\n📊 4 индивидуальных занятия\n💰 Стоимость: 5700 ₽ (вместо 6000 ₽)\n💡 Экономия: 300 ₽ (5%)\n✅ Действует 2 месяца\n\nДля оформления свяжитесь с Кириллом: @anisimovvd`,
    sub8: `💳 Пакет «Максимальный результат» — 8 занятий\n\nМаксимальная экономия для регулярных занятий.\n\n📊 8 индивидуальных занятий\n💰 Стоимость: 10 800 ₽ (вместо 12 000 ₽)\n💡 Экономия: 1200 ₽ (10%)\n✅ Действует 4 месяца\n\nДля оформления свяжитесь с Кириллом: @anisimovvd`,
  };

  const text = messages[service] || "Информация недоступна.";
  const keyboard = service === "sub4" || service === "sub8" ? {
    inline_keyboard: [
      [{ text: `💳 Оформить абонемент на ${service === "sub4" ? "4" : "8"} занятий`, callback_data: `buy_${service}` }],
    ],
  } : undefined;

  await bot.sendMessage(chatId, text, {
    reply_markup: keyboard || MAIN_KEYBOARD,
  });
}
