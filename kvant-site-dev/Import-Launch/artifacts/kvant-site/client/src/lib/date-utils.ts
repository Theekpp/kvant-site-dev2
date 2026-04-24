import {
  startOfDay as dfStartOfDay,
  startOfWeek as dfStartOfWeek,
  addDays as dfAddDays,
  format,
  getDay as dfGetDay,
} from "date-fns";

export const DAY_NAMES_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
export const DAY_NAMES_FULL = [
  "Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота",
];
export const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
export const MONTHS_RU_SHORT = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

export function startOfDay(d: Date): Date {
  return dfStartOfDay(d);
}

export function startOfWeekMon(d: Date): Date {
  return dfStartOfWeek(d, { weekStartsOn: 1 });
}

export function addDays(d: Date, n: number): Date {
  return dfAddDays(d, n);
}

export function formatDateDDMMYYYY(d: Date): string {
  return format(d, "dd.MM.yyyy");
}

export function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS_RU[start.getMonth()]} ${start.getFullYear()}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} ${MONTHS_RU_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTHS_RU_SHORT[end.getMonth()]} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTHS_RU_SHORT[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${MONTHS_RU_SHORT[end.getMonth()]} ${end.getFullYear()}`;
}

export function getDayOfWeekMon(date: Date): number {
  const d = dfGetDay(date);
  return d === 0 ? 6 : d - 1;
}

export function parseTimeHHMM(time: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function getBrowserTimezoneLabel(): { offset: string; tz: string } {
  const tzOffsetMin = -new Date().getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? "+" : "−";
  const abs = Math.abs(Math.round(tzOffsetMin / 60));
  const offset = `GMT${sign}${String(abs).padStart(2, "0")}`;
  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    tz = "";
  }
  return { offset, tz };
}
