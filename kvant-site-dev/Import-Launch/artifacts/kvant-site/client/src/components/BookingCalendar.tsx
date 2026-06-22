import { useEffect, useMemo, useState } from "react";
import {
  DAY_NAMES_SHORT,
  DAY_NAMES_FULL,
  MONTHS_RU,
  addDays,
  formatDateDDMMYYYY,
  formatWeekRange,
  parseTimeHHMM,
  getBrowserTimezoneLabel,
  getDayOfWeekMon,
} from "@/lib/date-utils";

export interface BookingScheduleSlot {
  id: number;
  dayOfWeek: number | null;
  time: string;
  title: string | null;
  maxStudents: number;
  isActive: boolean;
  slotType: string;
  specificDate: string | null;
}

export interface BookingItem {
  type: string;
  date: string;
  time: string;
  status: string;
}

interface BookingCalendarProps {
  slots: BookingScheduleSlot[];
  bookings: BookingItem[];
  bookingType: "individual" | "group";
  hasActiveSub: boolean;
  weekStart: Date;
  today: Date;
  currentWeekStart: Date;
  accent?: "indigo" | "violet";
  onWeekChange: (newStart: Date) => void;
  onSelectSlot: (slot: BookingScheduleSlot, dateStr: string) => void;
}

const HOUR_HEIGHT = 56;
const MIN_HOUR_DEFAULT = 9;
const MAX_HOUR_DEFAULT = 22;

type ViewMode = 1 | 3 | 7;

function getInitialViewMode(): ViewMode {
  if (typeof window === "undefined") return 7;
  if (window.matchMedia("(min-width: 768px)").matches) return 7;
  if (window.matchMedia("(min-width: 480px)").matches) return 3;
  return 1;
}

export function BookingCalendar({
  slots,
  bookings,
  bookingType,
  hasActiveSub,
  weekStart,
  today,
  currentWeekStart,
  accent = "indigo",
  onWeekChange,
  onSelectSlot,
}: BookingCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [viewOffset, setViewOffset] = useState(() => {
    const mode = getInitialViewMode();
    if (mode >= 7) return 0;
    const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const todayIdx = jsDay === 0 ? 6 : jsDay - 1; // Mon-based 0..6
    return Math.max(0, Math.min(todayIdx - Math.floor(mode / 2), 7 - mode));
  });

  // Auto-adapt view mode to viewport changes
  useEffect(() => {
    const mqDesktop = window.matchMedia("(min-width: 768px)");
    const mqTablet = window.matchMedia("(min-width: 480px)");
    const update = () => {
      if (mqDesktop.matches) setViewMode(7);
      else if (mqTablet.matches) setViewMode(3);
      else setViewMode(1);
    };
    mqDesktop.addEventListener("change", update);
    mqTablet.addEventListener("change", update);
    return () => {
      mqDesktop.removeEventListener("change", update);
      mqTablet.removeEventListener("change", update);
    };
  }, []);

  const weekDays = useMemo<Date[]>(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // When week or view mode changes, set offset so today is visible (if in this week)
  useEffect(() => {
    const todayIdx = weekDays.findIndex(
      (d) =>
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate(),
    );
    if (todayIdx >= 0 && viewMode < 7) {
      const offset = Math.max(0, Math.min(todayIdx - Math.floor(viewMode / 2), 7 - viewMode));
      setViewOffset(offset);
    } else {
      setViewOffset(0);
    }
  }, [weekStart, viewMode, weekDays, today]);

  const userBookingsKey = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach((b) => {
      if (b.status === "confirmed") {
        set.add(`${b.type}|${b.date}|${b.time}`);
      }
    });
    return set;
  }, [bookings]);

  const slotsForDate = useMemo(() => {
    return (date: Date): BookingScheduleSlot[] => {
      const dateStr = formatDateDDMMYYYY(date);
      const dow = date.getDay();
      const specificForDay = slots.filter(
        (s) => s.slotType === bookingType && s.specificDate === dateStr,
      );
      const specificTimes = new Set(specificForDay.map((s) => s.time));
      const result: BookingScheduleSlot[] = [...specificForDay];
      slots.forEach((s) => {
        if (s.slotType !== bookingType) return;
        if (s.specificDate) return;
        if (s.dayOfWeek !== dow) return;
        if (specificTimes.has(s.time)) return;
        result.push(s);
      });
      return result.sort((a, b) => a.time.localeCompare(b.time));
    };
  }, [slots, bookingType]);

  const { slotsByDay, hourRange, totalSlotsThisWeek } = useMemo(() => {
    const byDay: Record<number, Array<{ slot: BookingScheduleSlot; hour: number; minute: number }>> = {};
    let minHour = MIN_HOUR_DEFAULT;
    let maxHour = MAX_HOUR_DEFAULT;
    let total = 0;
    let touched = false;

    weekDays.forEach((date, dayIdx) => {
      byDay[dayIdx] = [];
      slotsForDate(date).forEach((slot) => {
        const parsed = parseTimeHHMM(slot.time);
        if (!parsed) return;
        byDay[dayIdx].push({ slot, hour: parsed.hour, minute: parsed.minute });
        total += 1;
        if (!touched) {
          minHour = parsed.hour;
          maxHour = parsed.hour + 1;
          touched = true;
        } else {
          if (parsed.hour < minHour) minHour = parsed.hour;
          if (parsed.hour + 1 > maxHour) maxHour = parsed.hour + 1;
        }
      });
    });

    if (touched) {
      minHour = Math.min(minHour, MIN_HOUR_DEFAULT);
      maxHour = Math.max(maxHour, MAX_HOUR_DEFAULT);
    }
    minHour = Math.max(0, minHour);
    maxHour = Math.min(24, maxHour);
    if (maxHour <= minHour) maxHour = minHour + 1;

    const hours: number[] = [];
    for (let h = minHour; h < maxHour; h++) hours.push(h);
    return {
      slotsByDay: byDay,
      hourRange: { hours, minHour, maxHour },
      totalSlotsThisWeek: total,
    };
  }, [weekDays, slotsForDate]);

  const tzInfo = useMemo(() => getBrowserTimezoneLabel(), []);

  // Visible day window depending on view mode
  const maxOffset = Math.max(0, 7 - viewMode);
  const safeOffset = Math.min(viewOffset, maxOffset);
  const visibleDays = useMemo(
    () => weekDays.slice(safeOffset, safeOffset + viewMode),
    [weekDays, safeOffset, viewMode],
  );
  const visibleDayIndices = useMemo(
    () => Array.from({ length: viewMode }, (_, i) => safeOffset + i),
    [safeOffset, viewMode],
  );

  const totalGridHeight = hourRange.hours.length * HOUR_HEIGHT;
  const accentBtnSelected = accent === "violet"
    ? "bg-violet-100 border-violet-200 text-violet-800 hover:bg-violet-600 hover:border-violet-600 hover:text-white hover:shadow-sm focus-visible:ring-violet-500"
    : "bg-indigo-100 border-indigo-200 text-indigo-800 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white hover:shadow-sm focus-visible:ring-indigo-500";
  const accentToday = accent === "violet" ? "bg-violet-600" : "bg-indigo-600";
  const accentTodayText = accent === "violet" ? "text-violet-600" : "text-indigo-600";

  const canPrevDays = safeOffset > 0;
  const canNextDays = safeOffset < maxOffset;

  return (
    <div className="space-y-3">
      {/* Week navigator */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-2 shadow-sm">
        <button
          onClick={() => onWeekChange(addDays(weekStart, -7))}
          disabled={weekStart.getTime() <= currentWeekStart.getTime()}
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          aria-label="Предыдущая неделя"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 text-center">
          <p className="font-semibold text-slate-800 text-sm sm:text-base">{formatWeekRange(weekStart)}</p>
          {weekStart.getTime() !== currentWeekStart.getTime() && (
            <button
              onClick={() => onWeekChange(currentWeekStart)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-0.5"
            >
              К текущей неделе
            </button>
          )}
        </div>
        <button
          onClick={() => onWeekChange(addDays(weekStart, 7))}
          className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition flex-shrink-0"
          aria-label="Следующая неделя"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* View mode switcher (1 / 3 / 7 days) — useful on mobile and tablet */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 shadow-sm" role="group" aria-label="Режим отображения календаря">
          {([1, 3, 7] as ViewMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setViewMode(m)}
              aria-pressed={viewMode === m}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                viewMode === m
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {m === 1 ? "День" : m === 3 ? "3 дня" : "Неделя"}
            </button>
          ))}
        </div>

        {viewMode < 7 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewOffset((o) => Math.max(0, o - 1))}
              disabled={!canPrevDays}
              aria-label="Сдвинуть на день назад"
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewOffset((o) => Math.min(maxOffset, o + 1))}
              disabled={!canNextDays}
              aria-label="Сдвинуть на день вперёд"
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Calendar grid */}
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        role="grid"
        aria-label={`Расписание занятий, ${formatWeekRange(weekStart)}`}
      >
        {/* Header row */}
        <div
          className="grid border-b border-slate-200 bg-slate-50/60"
          style={{ gridTemplateColumns: `56px repeat(${viewMode}, minmax(0, 1fr))` }}
          role="row"
        >
          <div
            className="py-3 px-1 text-[10px] text-slate-400 font-medium flex items-end justify-end pr-2"
            title={tzInfo.tz ? `Часовой пояс устройства: ${tzInfo.tz}` : "Часовой пояс устройства"}
            aria-label={tzInfo.tz ? `Часовой пояс ${tzInfo.tz}, ${tzInfo.offset}` : tzInfo.offset}
          >
            {tzInfo.offset}
          </div>
          {visibleDays.map((date, idx) => {
            const isToday = date.getTime() === today.getTime();
            const isPast = date.getTime() < today.getTime();
            const dow = getDayOfWeekMon(date);
            const fullLabel = `${DAY_NAMES_FULL[dow]}, ${date.getDate()} ${MONTHS_RU[date.getMonth()]}`;
            return (
              <div
                key={idx}
                role="columnheader"
                aria-label={fullLabel}
                className={`py-2 text-center border-l border-slate-100 ${isPast ? "bg-slate-50/40" : ""}`}
              >
                <div
                  className={`text-[10px] uppercase tracking-wider font-semibold ${
                    isPast ? "text-slate-300" : isToday ? accentTodayText : "text-slate-400"
                  }`}
                >
                  {DAY_NAMES_SHORT[dow]}
                </div>
                <div className="mt-1 h-8 flex items-center justify-center">
                  {isToday ? (
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-base font-semibold ${accentToday}`}>
                      {date.getDate()}
                    </div>
                  ) : (
                    <span className={`text-xl font-light ${isPast ? "text-slate-300" : "text-slate-700"}`}>
                      {date.getDate()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid body */}
        <div className="overflow-x-auto">
          <div
            className="relative"
            style={{
              display: "grid",
              gridTemplateColumns: `56px repeat(${viewMode}, minmax(${viewMode === 1 ? "0" : "80px"}, 1fr))`,
              height: `${totalGridHeight}px`,
            }}
          >
            {/* Time labels column (one cell stretched, with absolute markers) */}
            <div className="relative border-r border-slate-100" style={{ gridColumn: 1, gridRow: "1 / -1" }}>
              {hourRange.hours.map((h, i) => (
                <div
                  key={`time-${h}`}
                  className="absolute right-2 text-[10px] text-slate-400 -translate-y-1/2"
                  style={{ top: `${i * HOUR_HEIGHT}px` }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {visibleDays.map((date, visibleIdx) => {
              const realDayIdx = visibleDayIndices[visibleIdx];
              const isPast = date.getTime() < today.getTime();
              const isToday = date.getTime() === today.getTime();
              const now = new Date();
              const dateStr = formatDateDDMMYYYY(date);
              const daySlots = slotsByDay[realDayIdx] || [];
              const dow = date.getDay();
              const dayLabel = `${DAY_NAMES_FULL[dow]}, ${date.getDate()} ${MONTHS_RU[date.getMonth()]}`;
              return (
                <div
                  key={realDayIdx}
                  role="row"
                  aria-label={dayLabel}
                  className={`relative border-l border-slate-100 ${
                    isPast ? "bg-slate-50/40" : isToday ? "bg-indigo-50/20" : ""
                  }`}
                  style={{ gridColumn: visibleIdx + 2, gridRow: "1 / -1" }}
                >
                  {/* Hour separator lines */}
                  {hourRange.hours.map((h, i) => (
                    <div
                      key={`line-${h}`}
                      className="absolute left-0 right-0 border-t border-slate-100"
                      style={{ top: `${i * HOUR_HEIGHT}px`, height: 0 }}
                      aria-hidden="true"
                    />
                  ))}
                  {/* Bottom border */}
                  <div
                    className="absolute left-0 right-0 border-t border-slate-100"
                    style={{ top: `${hourRange.hours.length * HOUR_HEIGHT}px`, height: 0 }}
                    aria-hidden="true"
                  />

                  {/* Slot blocks positioned by minutes */}
                  {daySlots.map(({ slot, hour, minute }) => {
                    const minutesFromTop = (hour - hourRange.minHour) * 60 + minute;
                    const top = (minutesFromTop * HOUR_HEIGHT) / 60;
                    const heightPx = HOUR_HEIGHT - 4;
                    const alreadyBooked = userBookingsKey.has(`${slot.slotType}|${dateStr}|${slot.time}`);
                    const isSlotPast = isToday && (hour < now.getHours() || (hour === now.getHours() && minute <= now.getMinutes()));
                    const blocked = isPast || isSlotPast || !hasActiveSub || alreadyBooked;
                    const blockedReason = isPast || isSlotPast
                      ? "Время уже прошло"
                      : alreadyBooked
                        ? "Вы уже записаны"
                        : !hasActiveSub
                          ? `Нужен абонемент на ${bookingType === "group" ? "групповые" : "индивидуальные"} занятия`
                          : "";
                    const ariaLabel = `${slot.time}, ${dayLabel}${blockedReason ? `. ${blockedReason}` : ". Записаться"}`;
                    return (
                      <button
                        key={slot.id}
                        role="gridcell"
                        aria-label={ariaLabel}
                        onClick={() => {
                          if (blocked) return;
                          onSelectSlot(slot, dateStr);
                        }}
                        disabled={blocked}
                        title={blockedReason || `Записаться на ${slot.time}`}
                        className={`absolute left-1 right-1 rounded-md px-1.5 py-1 text-[11px] font-semibold leading-tight text-left border transition-all overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                          blocked
                            ? alreadyBooked
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default"
                              : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                            : accentBtnSelected
                        }`}
                        style={{ top: `${top + 2}px`, height: `${heightPx}px` }}
                      >
                        <span className="block truncate">{slot.time}</span>
                        {alreadyBooked && (
                          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {totalSlotsThisWeek === 0 && (
          <div className="border-t border-slate-100 px-6 py-8 text-center">
            <p className="text-sm text-slate-500 font-medium">
              На этой неделе нет свободных {bookingType === "group" ? "групповых" : "индивидуальных"} занятий
            </p>
            <p className="text-xs text-slate-400 mt-1">Попробуйте переключиться на другую неделю или другой тип занятий</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingCalendar;
