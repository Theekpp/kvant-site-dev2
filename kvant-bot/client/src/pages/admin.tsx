import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Users, CalendarDays, BookOpen, CreditCard, Plus, Trash2, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import type { User, Booking, GroupSchedule, Subscription } from "@shared/schema";

const DAYS_RU = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

function StatsCards() {
  const { data: stats } = useQuery<{
    totalUsers: number;
    activeBookings: number;
    totalBookings: number;
    activeSubs: number;
    totalSubs: number;
  }>({ queryKey: ["/api/stats"] });

  const items = [
    { title: "Учеников", value: stats?.totalUsers || 0, icon: Users, color: "text-blue-600 dark:text-blue-400" },
    { title: "Активных записей", value: stats?.activeBookings || 0, icon: CalendarDays, color: "text-green-600 dark:text-green-400" },
    { title: "Всего записей", value: stats?.totalBookings || 0, icon: BookOpen, color: "text-purple-600 dark:text-purple-400" },
    { title: "Активных абонементов", value: stats?.activeSubs || 0, icon: CreditCard, color: "text-orange-600 dark:text-orange-400" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.title}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{item.title}</p>
                <p className="text-3xl font-bold mt-1" data-testid={`stat-${item.title}`}>{item.value}</p>
              </div>
              <item.icon className={`w-8 h-8 ${item.color} opacity-80`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UsersTab() {
  const { data: users = [], isLoading } = useQuery<User[]>({ queryKey: ["/api/users"] });

  if (isLoading) return <div className="flex items-center justify-center p-8 text-muted-foreground">Загрузка...</div>;

  return (
    <div className="space-y-3">
      {users.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Пока нет зарегистрированных пользователей
          </CardContent>
        </Card>
      ) : (
        users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <p className="font-medium" data-testid={`text-user-name-${user.id}`}>
                    {user.firstName || ""} {user.lastName || ""}
                    {user.telegramUsername && (
                      <span className="text-muted-foreground ml-2">@{user.telegramUsername}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {user.age && <Badge variant="secondary">{user.age} лет</Badge>}
                    {user.grade && <Badge variant="secondary">{user.grade}</Badge>}
                    {user.goal && <Badge variant="outline">{user.goal}</Badge>}
                  </div>
                  {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
                </div>
                <p className="text-xs text-muted-foreground">
                  ID: {user.telegramId}
                </p>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function BookingsTab() {
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({ queryKey: ["/api/bookings"] });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { toast } = useToast();

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/bookings/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: "Статус обновлен" });
    },
  });

  const getUserName = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Без имени" : `ID: ${userId}`;
  };

  if (isLoading) return <div className="flex items-center justify-center p-8 text-muted-foreground">Загрузка...</div>;

  return (
    <div className="space-y-3">
      {bookings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Пока нет записей
          </CardContent>
        </Card>
      ) : (
        bookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium" data-testid={`text-booking-user-${booking.id}`}>
                      {getUserName(booking.userId)}
                    </p>
                    <Badge variant={booking.type === "individual" ? "default" : "secondary"}>
                      {booking.type === "individual" ? "Индивидуальное" : "Групповое"}
                    </Badge>
                    <Badge variant={
                      booking.status === "confirmed" ? "default" :
                      booking.status === "completed" ? "secondary" : "destructive"
                    }>
                      {booking.status === "confirmed" ? "Активно" :
                       booking.status === "completed" ? "Завершено" : "Отменено"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {booking.date} в {booking.time}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {booking.status === "confirmed" && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateStatus.mutate({ id: booking.id, status: "completed" })}
                        disabled={updateStatus.isPending}
                        data-testid={`button-complete-${booking.id}`}
                      >
                        Завершить
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStatus.mutate({ id: booking.id, status: "cancelled" })}
                        disabled={updateStatus.isPending}
                        data-testid={`button-cancel-${booking.id}`}
                      >
                        Отменить
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];
const DAYS_SHORT_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function ScheduleTab() {
  const { data: schedule = [], isLoading } = useQuery<GroupSchedule[]>({ queryKey: ["/api/schedule"] });
  const { toast } = useToast();

  const TIME_SLOTS = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
    "20:00", "21:00", "22:00",
  ];

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [addingType, setAddingType] = useState<"individual" | "group">("individual");
  const [customTime, setCustomTime] = useState("");

  const monthDays = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const slotsByDow = useMemo(() => {
    const map: Record<number, GroupSchedule[]> = {};
    for (const s of schedule) {
      if (!map[s.dayOfWeek]) map[s.dayOfWeek] = [];
      map[s.dayOfWeek].push(s);
    }
    return map;
  }, [schedule]);

  const getSlotsForDate = (date: Date) => {
    return slotsByDow[date.getDay()] || [];
  };

  const createSlot = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/schedule", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      toast({ title: "Слот добавлен" });
    },
  });

  const deleteSlot = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/schedule/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      toast({ title: "Слот удален" });
    },
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  if (isLoading) return <div className="flex items-center justify-center p-8 text-muted-foreground">Загрузка...</div>;

  const selectedSlots = selectedDate ? getSlotsForDate(selectedDate) : [];
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={prevMonth} data-testid="button-prev-month">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h3 className="text-lg font-semibold" data-testid="text-calendar-month">
                {MONTHS_RU[viewMonth]} {viewYear}
              </h3>
              <Button variant="ghost" size="icon" onClick={nextMonth} data-testid="button-next-month">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {DAYS_SHORT_RU.map(d => (
                <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
              {monthDays.map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} className="bg-card p-1 min-h-[60px] sm:min-h-[80px]" />;
                }
                const dayStr = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                const isToday = dayStr === todayStr;
                const isSelected = selectedDate && dayStr === `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
                const daySlots = getSlotsForDate(day);
                const hasIndividual = daySlots.some(s => s.slotType === "individual");
                const hasGroup = daySlots.some(s => s.slotType === "group");

                return (
                  <button
                    key={dayStr}
                    className={`bg-card p-1 min-h-[60px] sm:min-h-[80px] text-left transition-colors hover:bg-accent/50 cursor-pointer border-0 ${
                      isSelected ? "ring-2 ring-primary ring-inset bg-accent/30" : ""
                    }`}
                    onClick={() => setSelectedDate(day)}
                    data-testid={`calendar-day-${day.getDate()}`}
                  >
                    <span className={`text-xs sm:text-sm inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      isToday ? "bg-primary text-primary-foreground font-bold" : ""
                    }`}>
                      {day.getDate()}
                    </span>
                    {daySlots.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {hasIndividual && (
                          <div className="h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" title="Индивидуальные" />
                        )}
                        {hasGroup && (
                          <div className="h-1.5 rounded-full bg-green-500 dark:bg-green-400" title="Групповые" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-full bg-blue-500" />
                <span>Индивидуальные</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-full bg-green-500" />
                <span>Групповые</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {selectedDate ? (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  {selectedDate.getDate()} {MONTHS_RU[selectedDate.getMonth()].toLowerCase()}, {DAYS_RU[selectedDate.getDay()]}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="flex gap-1" data-testid="slot-type-toggle">
                  <Button
                    size="sm"
                    variant={addingType === "individual" ? "default" : "outline"}
                    className={`flex-1 text-xs ${addingType === "individual" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                    onClick={() => setAddingType("individual")}
                    data-testid="toggle-individual"
                  >
                    Инд. 1ч
                  </Button>
                  <Button
                    size="sm"
                    variant={addingType === "group" ? "default" : "outline"}
                    className={`flex-1 text-xs ${addingType === "group" ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                    onClick={() => setAddingType("group")}
                    data-testid="toggle-group"
                  >
                    Груп. 1.5ч
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Нажмите на время или введите своё
                </p>

                <div className="grid grid-cols-3 gap-1.5" data-testid="time-slots-grid">
                  {TIME_SLOTS.map(time => {
                    const existingSlot = selectedSlots.find(
                      s => s.time === time && s.slotType === addingType
                    );
                    const otherTypeSlot = selectedSlots.find(
                      s => s.time === time && s.slotType !== addingType
                    );
                    const isActive = !!existingSlot;

                    return (
                      <button
                        key={time}
                        className={`
                          relative py-2 px-1 rounded-md text-sm font-medium transition-all border
                          ${isActive && addingType === "individual"
                            ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700 shadow-sm"
                            : isActive && addingType === "group"
                            ? "bg-green-600 text-white border-green-700 hover:bg-green-700 shadow-sm"
                            : "bg-card border-border hover:bg-accent/60 text-foreground"
                          }
                          ${(createSlot.isPending || deleteSlot.isPending) ? "opacity-60 pointer-events-none" : "cursor-pointer"}
                        `}
                        onClick={() => {
                          if (existingSlot) {
                            deleteSlot.mutate(existingSlot.id);
                          } else {
                            createSlot.mutate({
                              dayOfWeek: selectedDate.getDay(),
                              time,
                              title: null,
                              maxStudents: addingType === "group" ? 10 : 1,
                              isActive: true,
                              slotType: addingType,
                            });
                          }
                        }}
                        data-testid={`time-slot-${time}`}
                      >
                        {time}
                        {otherTypeSlot && (
                          <span className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full ${
                            otherTypeSlot.slotType === "individual" ? "bg-blue-500" : "bg-green-500"
                          }`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-1.5" data-testid="custom-time-row">
                  <Input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="flex-1 h-8 text-sm"
                    data-testid="input-custom-time"
                  />
                  <Button
                    size="sm"
                    className="h-8 px-3"
                    disabled={!customTime || createSlot.isPending}
                    onClick={() => {
                      const alreadyExists = selectedSlots.find(
                        s => s.time === customTime && s.slotType === addingType
                      );
                      if (alreadyExists) {
                        toast({ title: "Такой слот уже есть", variant: "destructive" });
                        return;
                      }
                      createSlot.mutate({
                        dayOfWeek: selectedDate.getDay(),
                        time: customTime,
                        title: null,
                        maxStudents: addingType === "group" ? 10 : 1,
                        isActive: true,
                        slotType: addingType,
                      });
                      setCustomTime("");
                    }}
                    data-testid="button-add-custom-time"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {selectedSlots.length > 0 && (
                  <div className="pt-1 border-t space-y-1">
                    <p className="text-[11px] text-muted-foreground font-medium">Активные слоты:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedSlots
                        .sort((a, b) => a.time.localeCompare(b.time))
                        .map(slot => (
                          <Badge
                            key={slot.id}
                            variant="outline"
                            className={`text-[11px] cursor-pointer hover:opacity-70 ${
                              slot.slotType === "individual"
                                ? "border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950"
                                : "border-green-400 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950"
                            }`}
                            onClick={() => deleteSlot.mutate(slot.id)}
                            data-testid={`badge-slot-${slot.id}`}
                          >
                            {slot.time} {slot.slotType === "individual" ? "инд" : "груп"} ✕
                          </Badge>
                        ))
                      }
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Выберите день в календаре для просмотра и добавления слотов</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm text-muted-foreground">Все слоты по дням</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {schedule.length === 0 ? (
                <p className="text-sm text-muted-foreground">Расписание пусто</p>
              ) : (
                <div className="space-y-1.5">
                  {[1, 2, 3, 4, 5, 6, 0].map(dow => {
                    const daySlots = slotsByDow[dow];
                    if (!daySlots || daySlots.length === 0) return null;
                    return (
                      <div key={dow} className="text-sm">
                        <span className="font-medium">{DAYS_RU[dow]}:</span>{" "}
                        {daySlots.map((s, i) => (
                          <span key={s.id}>
                            {i > 0 && ", "}
                            <span className={s.slotType === "individual" ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"}>
                              {s.time}
                            </span>
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SubscriptionsTab() {
  const { data: subs = [], isLoading } = useQuery<Subscription[]>({ queryKey: ["/api/subscriptions"] });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { toast } = useToast();

  const updateSub = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/subscriptions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: "Абонемент обновлен" });
    },
  });

  const getUserName = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Без имени" : `ID: ${userId}`;
  };

  if (isLoading) return <div className="flex items-center justify-center p-8 text-muted-foreground">Загрузка...</div>;

  return (
    <div className="space-y-3">
      {subs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Пока нет абонементов
          </CardContent>
        </Card>
      ) : (
        subs.map((sub) => (
          <Card key={sub.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1.5">
                  <p className="font-medium" data-testid={`text-sub-user-${sub.id}`}>
                    {getUserName(sub.userId)}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {sub.type === "individual" ? "Индивидуальный" : "Групповой"}
                    </Badge>
                    <Badge variant={sub.isPaid ? "default" : "destructive"}>
                      {sub.isPaid ? "Оплачен" : "Не оплачен"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Занятий: {sub.remainingLessons} из {sub.totalLessons} осталось
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {!sub.isPaid && (
                    <Button
                      size="sm"
                      onClick={() => updateSub.mutate({ id: sub.id, data: { isPaid: true } })}
                      disabled={updateSub.isPending}
                      data-testid={`button-mark-paid-${sub.id}`}
                    >
                      Подтвердить оплату
                    </Button>
                  )}
                  {sub.isPaid && sub.remainingLessons > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateSub.mutate({
                        id: sub.id,
                        data: { remainingLessons: sub.remainingLessons - 1 }
                      })}
                      disabled={updateSub.isPending}
                      data-testid={`button-use-lesson-${sub.id}`}
                    >
                      -1 занятие
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">
                Панель управления
              </h1>
              <p className="text-sm text-muted-foreground">Физика с Кириллом</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <StatsCards />

        <Tabs defaultValue="bookings">
          <TabsList className="w-full grid grid-cols-4" data-testid="tabs-navigation">
            <TabsTrigger value="bookings" data-testid="tab-bookings">Записи</TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">Расписание</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Ученики</TabsTrigger>
            <TabsTrigger value="subs" data-testid="tab-subs">Абонементы</TabsTrigger>
          </TabsList>
          <TabsContent value="bookings" className="mt-4">
            <BookingsTab />
          </TabsContent>
          <TabsContent value="schedule" className="mt-4">
            <ScheduleTab />
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <UsersTab />
          </TabsContent>
          <TabsContent value="subs" className="mt-4">
            <SubscriptionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
