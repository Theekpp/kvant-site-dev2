import { useState } from "react";
import { useGetSchedule, useCreateScheduleSlot, useDeleteScheduleSlot } from "@/lib/admin-api";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, ChevronLeft, ChevronRight, Check, RepeatIcon, CalendarDays, Calendar, CheckSquare, Square
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, addWeeks, subWeeks, startOfWeek, endOfWeek, isSameDay, eachDayOfInterval as eachDay, parseISO, isWithinInterval } from "date-fns";
import { ru } from "date-fns/locale";
import { DAY_NAMES_SHORT as DAYS_SHORT, DAY_NAMES_FULL as DAYS_FULL, getDayOfWeekMon, formatDateDDMMYYYY as dateToString } from "@/lib/date-utils";

const TIME_PRESETS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

type SlotMode = "specific" | "recurring" | "period";

interface SlotDraft {
  date: Date | null;
  dayOfWeek: number;
  times: string[];
  slotType: "individual" | "group";
  title: string;
  maxStudents: number;
  isActive: boolean;
  customTime: string;
  mode: SlotMode;
  periodStart: string;
  periodEnd: string;
  existingSlots: Array<{ id: number; time: string }>;
  conflictSlots: Array<{ time: string; slotType: string }>;
}

export default function Schedule() {
  const { data: schedule, isLoading } = useGetSchedule();
  const createSlot = useCreateScheduleSlot();
  const deleteSlot = useDeleteScheduleSlot();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [draft, setDraft] = useState<SlotDraft>({
    date: null,
    dayOfWeek: 1,
    times: [],
    slotType: "individual",
    title: "",
    maxStudents: 5,
    isActive: true,
    customTime: "",
    mode: "specific",
    periodStart: format(new Date(), 'yyyy-MM-dd'),
    periodEnd: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    existingSlots: [],
    conflictSlots: [],
  });

  const computeSlotsForDate = (date: Date, currentSlotType: "individual" | "group") => {
    const dateStr = dateToString(date);
    const jsDay = getDay(date);
    const allForDay = (schedule || []).filter(s =>
      s.specificDate === dateStr || (!s.specificDate && s.dayOfWeek === jsDay)
    );

    // Deduplicate: specific-date slots take priority over recurring ones for the same time
    const specificTimes = new Set(allForDay.filter(s => s.specificDate === dateStr).map(s => s.time));
    const deduped = allForDay.filter(s => s.specificDate === dateStr || !specificTimes.has(s.time));

    const firstExisting = deduped[0];
    const primaryType: "individual" | "group" = firstExisting
      ? (firstExisting.slotType as "individual" | "group")
      : currentSlotType;

    return {
      primaryType,
      existingSlots: deduped.map(s => ({ id: s.id, time: s.time })),
      conflictSlots: [] as Array<{ time: string; slotType: string }>,
      firstExisting,
    };
  };

  const handleDayClick = (date: Date) => {
    const dow = getDayOfWeekMon(date);
    const { primaryType, existingSlots, conflictSlots, firstExisting } =
      computeSlotsForDate(date, draft.slotType);

    setDraft(d => ({
      ...d,
      date,
      dayOfWeek: dow,
      times: existingSlots.map(s => s.time),
      mode: "specific",
      existingSlots,
      conflictSlots,
      slotType: primaryType,
      maxStudents: firstExisting ? firstExisting.maxStudents : d.maxStudents,
      title: firstExisting?.title || d.title,
    }));
    setIsDialogOpen(true);
  };

  const toggleTime = (t: string) => {
    setDraft(d => ({
      ...d,
      times: d.times.includes(t) ? d.times.filter(x => x !== t) : [...d.times, t]
    }));
  };

  const addCustomTime = () => {
    const t = draft.customTime.trim();
    if (!t.match(/^\d{2}:\d{2}$/)) {
      toast({ title: "Формат времени: ЧЧ:ММ", variant: "destructive" });
      return;
    }
    if (!draft.times.includes(t)) {
      setDraft(d => ({ ...d, times: [...d.times, t], customTime: "" }));
    }
  };

  const handleSubmit = async () => {
    setIsCreating(true);

    // For specific mode: compute diff against existing slots
    const existingTimes = draft.existingSlots.map(s => s.time);
    const slotsToDelete = draft.mode === "specific"
      ? draft.existingSlots.filter(s => !draft.times.includes(s.time))
      : [];
    const newTimes = draft.mode === "specific"
      ? draft.times.filter(t => !existingTimes.includes(t))
      : draft.times;

    let slotsToCreate: Array<{ dayOfWeek: number; time: string; specificDate?: string }> = [];

    if (draft.mode === "specific" && draft.date) {
      const jsDay = getDay(draft.date);
      for (const time of newTimes) {
        slotsToCreate.push({ dayOfWeek: jsDay, time, specificDate: dateToString(draft.date) });
      }
    } else if (draft.mode === "recurring") {
      if (draft.times.length === 0) {
        toast({ title: "Выберите хотя бы одно время", variant: "destructive" });
        setIsCreating(false);
        return;
      }
      const jsDay = draft.dayOfWeek === 6 ? 0 : draft.dayOfWeek + 1;
      for (const time of draft.times) {
        // Skip if any slot (regardless of type) already exists for this day+time (recurring)
        const alreadyExists = (schedule || []).some(s =>
          s.time === time &&
          s.dayOfWeek === jsDay &&
          !s.specificDate
        );
        if (!alreadyExists) {
          slotsToCreate.push({ dayOfWeek: jsDay, time });
        }
      }
    } else if (draft.mode === "period") {
      if (draft.times.length === 0) {
        toast({ title: "Выберите хотя бы одно время", variant: "destructive" });
        setIsCreating(false);
        return;
      }
      try {
        const start = new Date(draft.periodStart);
        const end = new Date(draft.periodEnd);
        if (start > end) {
          toast({ title: "Дата начала должна быть раньше конца", variant: "destructive" });
          setIsCreating(false);
          return;
        }
        const days = eachDayOfInterval({ start, end });
        const targetDow = draft.dayOfWeek;
        const matchingDays = days.filter(d => getDayOfWeekMon(d) === targetDow);
        for (const day of matchingDays) {
          const jsDay = getDay(day);
          const specificDate = dateToString(day);
          for (const time of draft.times) {
            // Skip if any slot (regardless of type) already exists for this day+time+date
            const alreadyExists = (schedule || []).some(s =>
              s.time === time &&
              s.dayOfWeek === jsDay &&
              s.specificDate === specificDate
            );
            if (!alreadyExists) {
              slotsToCreate.push({ dayOfWeek: jsDay, time, specificDate });
            }
          }
        }
        if (slotsToCreate.length === 0) {
          toast({ title: "Все выбранные слоты уже существуют в расписании" });
          setIsCreating(false);
          return;
        }
      } catch {
        toast({ title: "Неверный формат дат", variant: "destructive" });
        setIsCreating(false);
        return;
      }
    }

    if (slotsToCreate.length === 0 && slotsToDelete.length === 0) {
      toast({ title: "Нет изменений" });
      setIsDialogOpen(false);
      setIsCreating(false);
      return;
    }

    let failed = 0;

    // Delete removed slots
    for (const slot of slotsToDelete) {
      await new Promise<void>((resolve) => {
        deleteSlot.mutate({ id: slot.id }, { onSuccess: () => resolve(), onError: () => { failed++; resolve(); } });
      });
    }

    const conflictMessages: string[] = [];

    // Create new slots
    for (const slot of slotsToCreate) {
      await new Promise<void>((resolve) => {
        createSlot.mutate({
          data: {
            dayOfWeek: slot.dayOfWeek,
            time: slot.time,
            title: draft.title || undefined,
            maxStudents: draft.slotType === "group" ? draft.maxStudents : 1,
            isActive: draft.isActive,
            slotType: draft.slotType,
            specificDate: slot.specificDate || null,
          }
        }, {
          onSuccess: () => resolve(),
          onError: (err: any) => {
            const msg = err?.data?.message || err?.message || "Ошибка";
            if (err?.status === 409) {
              conflictMessages.push(`${slot.time}: ${msg}`);
            } else {
              failed++;
            }
            resolve();
          }
        });
      });
    }

    queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
    setIsDialogOpen(false);
    setIsCreating(false);
    setDraft(d => ({ ...d, times: [], customTime: "", existingSlots: [] }));

    const total = slotsToCreate.length + slotsToDelete.length;
    const succeeded = slotsToCreate.length - failed - conflictMessages.length;
    if (failed === 0 && conflictMessages.length === 0) {
      const parts = [];
      if (slotsToCreate.length > 0) parts.push(`добавлено ${slotsToCreate.length}`);
      if (slotsToDelete.length > 0) parts.push(`удалено ${slotsToDelete.length}`);
      toast({ title: `Сохранено: ${parts.join(", ")} слот(ов)` });
    } else if (failed > 0) {
      toast({ title: `Выполнено с ошибками (${failed} из ${total})`, variant: "destructive" });
    } else if (conflictMessages.length > 0) {
      const savedPart = succeeded > 0 ? `Добавлено ${succeeded}. ` : "";
      toast({
        title: `${savedPart}Пропущено ${conflictMessages.length} конфликтующих слотов`,
        description: conflictMessages[0],
        variant: "destructive",
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Удалить этот слот?")) return;
    deleteSlot.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
        toast({ title: "Слот удалён" });
      }
    });
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Удалить ${count} слот${count === 1 ? '' : count < 5 ? 'а' : 'ов'}?`)) return;
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    setIsSelectMode(false);
    await Promise.all(ids.map(id => deleteSlot.mutateAsync({ id }).catch(() => {})));
    await queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
    toast({ title: `Удалено слотов: ${count}` });
  };

  const toggleSelectId = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return <div className="text-center p-12 text-muted-foreground animate-pulse">Загрузка расписания...</div>;
  }

  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = getDayOfWeekMon(monthStart);
  const monthLabel = format(calendarMonth, "LLLL yyyy", { locale: ru });

  const getSlotForDate = (date: Date) => {
    const dateStr = dateToString(date);
    const jsDay = getDay(date);
    return (schedule || []).filter(s =>
      (s.specificDate === dateStr) ||
      (!s.specificDate && s.dayOfWeek === jsDay)
    );
  };

  const allRecurring = (schedule || []).filter(s => !s.specificDate);
  const recurringByDay: Record<number, typeof allRecurring> = {};
  for (const s of allRecurring) {
    if (!recurringByDay[s.dayOfWeek]) recurringByDay[s.dayOfWeek] = [];
    recurringByDay[s.dayOfWeek].push(s);
  }

  const dayNames: Record<number, string> = { 0: "Вс", 1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб" };

  const modeLabel: Record<SlotMode, string> = {
    specific: "Конкретная дата",
    recurring: "Каждую неделю",
    period: "Период дат"
  };

  const totalSlots = (schedule || []).length;
  const recurringCount = allRecurring.length;
  const specificCount = totalSlots - recurringCount;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{totalSlots}</div>
            <div className="text-xs text-muted-foreground">Всего слотов</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{recurringCount}</div>
            <div className="text-xs text-muted-foreground">Еженедельных</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-purple-600">{specificCount}</div>
            <div className="text-xs text-muted-foreground">Конкретных дат</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Календарь</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(m => subMonths(m, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium capitalize min-w-[130px] text-center">{monthLabel}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(m => addMonths(m, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_SHORT.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`blank-${i}`} />)}
              {days.map(day => {
                const daySlots = getSlotForDate(day);
                const hasSlots = daySlots.length > 0;
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={`
                      relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all
                      border hover:border-primary/50 hover:bg-primary/5 border-border/40
                    `}
                  >
                    <span className="font-medium text-xs">{format(day, 'd')}</span>
                    {hasSlots && (
                      <div className="flex gap-0.5 mt-0.5">
                        {daySlots.slice(0, 3).map((_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-primary" />
                        ))}
                        {daySlots.length > 3 && <div className="w-1 h-1 rounded-full bg-muted-foreground" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground justify-center">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Есть слоты</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Нажмите на дату, чтобы добавить слот
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base shrink-0">Все слоты расписания</CardTitle>
              <div className="flex items-center gap-1.5">
                {isSelectMode ? (
                  <>
                    <Button size="sm" variant="destructive" disabled={selectedIds.size === 0} onClick={handleBulkDelete}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {selectedIds.size > 0 ? `Удалить (${selectedIds.size})` : 'Удалить'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={exitSelectMode}>Отмена</Button>
                  </>
                ) : (
                  <>
                    {(schedule || []).length > 0 && (
                      <Button size="sm" variant="outline" onClick={() => setIsSelectMode(true)}>
                        <CheckSquare className="h-3.5 w-3.5 mr-1" /> Выбрать
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => {
                      setDraft(d => ({ ...d, date: null, mode: "recurring", times: [] }));
                      setIsDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-1" /> Добавить
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-y-auto pr-1 space-y-4">
            {(schedule || []).length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                Расписание пусто. Нажмите на день в календаре или кнопку "Добавить".
              </div>
            ) : (
              <>
                {Object.keys(recurringByDay).length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      <RepeatIcon className="h-3 w-3" /> Еженедельно
                    </div>
                    <div className="space-y-1.5">
                      {Object.entries(recurringByDay).sort(([a], [b]) => Number(a) - Number(b)).flatMap(([dow, slots]) =>
                        slots.sort((a, b) => a.time.localeCompare(b.time)).map(slot => (
                          <SlotRow key={slot.id} slot={slot} label={dayNames[Number(dow)] || ''} onDelete={handleDelete}
                            isSelectMode={isSelectMode} isSelected={selectedIds.has(slot.id)} onToggleSelect={toggleSelectId} />
                        ))
                      )}
                    </div>
                  </div>
                )}
                {specificCount > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      <Calendar className="h-3 w-3" /> Конкретные даты
                    </div>
                    <div className="space-y-1.5">
                      {(schedule || []).filter(s => s.specificDate)
                        .sort((a, b) => (a.specificDate || '').localeCompare(b.specificDate || '') || a.time.localeCompare(b.time))
                        .map(slot => (
                          <SlotRow key={slot.id} slot={slot} label={slot.specificDate || ''} onDelete={handleDelete}
                            isSelectMode={isSelectMode} isSelected={selectedIds.has(slot.id)} onToggleSelect={toggleSelectId} />
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {draft.date
                ? draft.existingSlots.length > 0
                  ? `Слоты на ${format(draft.date, 'd MMMM', { locale: ru })}`
                  : `Добавить слоты — ${format(draft.date, 'd MMMM', { locale: ru })}`
                : 'Добавить слоты'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div>
              <Label className="text-sm font-medium mb-2 block">Режим добавления</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["specific", "recurring", "period"] as SlotMode[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDraft(d => ({ ...d, mode: m }))}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all text-center ${draft.mode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}`}
                  >
                    {m === "specific" && <><CalendarDays className="h-3.5 w-3.5 mx-auto mb-1" />Дата</>}
                    {m === "recurring" && <><RepeatIcon className="h-3.5 w-3.5 mx-auto mb-1" />Каждую нед.</>}
                    {m === "period" && <><Calendar className="h-3.5 w-3.5 mx-auto mb-1" />Период</>}
                  </button>
                ))}
              </div>
            </div>

            {draft.mode === "specific" && (
              <div>
                <Label className="text-sm mb-1.5 block">Конкретная дата</Label>
                <Input
                  type="date"
                  value={draft.date ? format(draft.date, 'yyyy-MM-dd') : ''}
                  onChange={e => {
                    if (e.target.value) {
                      const d = new Date(e.target.value + 'T12:00:00');
                      const dow = getDayOfWeekMon(d);
                      const { primaryType, existingSlots, conflictSlots, firstExisting } =
                        computeSlotsForDate(d, draft.slotType);
                      setDraft(prev => ({
                        ...prev,
                        date: d,
                        dayOfWeek: dow,
                        existingSlots,
                        conflictSlots,
                        slotType: primaryType,
                        times: existingSlots.map(s => s.time),
                        maxStudents: firstExisting ? firstExisting.maxStudents : prev.maxStudents,
                        title: firstExisting?.title || '',
                      }));
                    }
                  }}
                />
                {draft.date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(draft.date, 'EEEE, d MMMM yyyy', { locale: ru })}
                  </p>
                )}
              </div>
            )}

            {draft.mode === "recurring" && (
              <div>
                <Label className="text-sm mb-1.5 block">День недели</Label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS_SHORT.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, dayOfWeek: i }))}
                      className={`py-2 rounded-lg text-xs font-medium border transition-all ${draft.dayOfWeek === i ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{DAYS_FULL[draft.dayOfWeek]} — еженедельно</p>
              </div>
            )}

            {draft.mode === "period" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm mb-1.5 block">День недели</Label>
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS_SHORT.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setDraft(prev => ({ ...prev, dayOfWeek: i }))}
                        className={`py-2 rounded-lg text-xs font-medium border transition-all ${draft.dayOfWeek === i ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm mb-1.5 block">С даты</Label>
                    <Input type="date" value={draft.periodStart} onChange={e => setDraft(d => ({ ...d, periodStart: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">По дату</Label>
                    <Input type="date" value={draft.periodEnd} onChange={e => setDraft(d => ({ ...d, periodEnd: e.target.value }))} />
                  </div>
                </div>
                {draft.periodStart && draft.periodEnd && draft.periodStart <= draft.periodEnd && (
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      try {
                        const start = new Date(draft.periodStart);
                        const end = new Date(draft.periodEnd);
                        const days = eachDayOfInterval({ start, end });
                        const count = days.filter(d => getDayOfWeekMon(d) === draft.dayOfWeek).length;
                        return `${count} ${DAYS_FULL[draft.dayOfWeek].toLowerCase()} будет в периоде`;
                      } catch { return ''; }
                    })()}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label className="text-sm font-medium mb-2 block">Время (можно выбрать несколько)</Label>
              {draft.existingSlots.length > 0 && draft.mode === "specific" && (
                <p className="text-xs text-muted-foreground mb-2">
                  Зелёным — уже добавленные. Нажмите, чтобы снять и удалить при сохранении.
                </p>
              )}
              <div className="grid grid-cols-4 gap-2">
                {TIME_PRESETS.map(t => {
                  const isExisting = draft.existingSlots.some(s => s.time === t);
                  const isSelected = draft.times.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTime(t)}
                      className={`relative py-2 rounded-lg text-sm font-medium border transition-all ${
                        isSelected && isExisting
                          ? 'bg-green-600 text-white border-green-600'
                          : isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      {t}
                      {isSelected && <Check className="absolute top-0.5 right-0.5 h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-sm mb-1.5 block">Своё время (ЧЧ:ММ)</Label>
                <Input placeholder="07:30" value={draft.customTime} onChange={e => setDraft(d => ({ ...d, customTime: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addCustomTime()} />
              </div>
              <Button type="button" variant="outline" onClick={addCustomTime}><Plus className="h-4 w-4" /></Button>
            </div>

            {draft.times.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {draft.times.sort().map(t => (
                  <Badge key={t} variant="secondary" className="cursor-pointer no-default-active-elevate" onClick={() => toggleTime(t)}>
                    {t} ✕
                  </Badge>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm mb-1.5 block">Тип занятия</Label>
                <Select value={draft.slotType} onValueChange={v => setDraft(d => ({ ...d, slotType: v as "individual" | "group", title: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Индивидуальное</SelectItem>
                    <SelectItem value="group">Групповое</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {draft.slotType === "group" && (
                <div>
                  <Label className="text-sm mb-1.5 block">Макс. учеников</Label>
                  <Input type="number" min={1} value={draft.maxStudents} onChange={e => setDraft(d => ({ ...d, maxStudents: parseInt(e.target.value) || 1 }))} />
                </div>
              )}
            </div>

            {draft.slotType === "group" && (
              <div>
                <Label className="text-sm mb-1.5 block">Название группы (необяз.)</Label>
                <Input placeholder="Подготовка к ЕГЭ" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Слот активен</Label>
                <p className="text-xs text-muted-foreground">Доступен для записи в боте</p>
              </div>
              <Switch checked={draft.isActive} onCheckedChange={v => setDraft(d => ({ ...d, isActive: v }))} />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSubmit} disabled={isCreating}>
              {isCreating
                ? "Сохранение..."
                : draft.existingSlots.length > 0 && draft.mode === "specific"
                  ? "Сохранить изменения"
                  : draft.times.length > 0
                    ? `Добавить${draft.times.length > 1 ? ` (${draft.times.length})` : ''}`
                    : "Выберите время"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SlotRow({
  slot, label, onDelete, isSelectMode, isSelected, onToggleSelect
}: {
  slot: any;
  label: string;
  onDelete: (id: number) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
}) {
  const isDate = /\d{2}\.\d{2}\.\d{4}/.test(label);
  return (
    <div
      onClick={isSelectMode ? () => onToggleSelect?.(slot.id) : undefined}
      className={`group flex items-center justify-between p-2.5 rounded-lg border text-sm transition-all ${
        !slot.isActive ? 'opacity-50' : ''
      } ${isSelectMode ? 'cursor-pointer' : ''} ${
        isSelected
          ? 'ring-2 ring-primary border-primary bg-primary/5'
          : slot.slotType === 'individual'
          ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800/30'
          : 'bg-purple-50/50 border-purple-100 dark:bg-purple-900/10 dark:border-purple-800/30'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isSelectMode && (
          <span className="shrink-0 text-primary">
            {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 text-muted-foreground" />}
          </span>
        )}
        {isDate ? (
          <div className="flex flex-col shrink-0 leading-tight min-w-0">
            <span className="text-[10px] text-muted-foreground">{label}</span>
            <span className="font-semibold font-display">{slot.time}</span>
          </div>
        ) : (
          <>
            <span className="text-xs text-muted-foreground shrink-0 w-6">{label}</span>
            <span className="font-semibold font-display">{slot.time}</span>
          </>
        )}
        <Badge variant="outline" className={`text-[10px] px-1.5 no-default-active-elevate shrink-0 ${slot.slotType === 'individual' ? 'text-blue-700 border-blue-200' : 'text-purple-700 border-purple-200'}`}>
          {slot.slotType === 'individual' ? 'Индив.' : 'Группа'}
        </Badge>
        {slot.title && <span className="text-muted-foreground truncate text-xs">{slot.title}</span>}
      </div>
      {!isSelectMode && (
        <Button variant="ghost" size="icon" onClick={() => onDelete(slot.id)} className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
