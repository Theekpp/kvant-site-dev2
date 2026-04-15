import { useState } from "react";
import { useGetUsers, useGetBookings, useGetSubscriptions, useGetAnalytics } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarCheck, Activity, CreditCard, ChevronLeft, ChevronRight, AlertTriangle, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area
} from "recharts";
import {
  isThisWeek, parseISO, format, startOfMonth, endOfMonth, getWeek, getMonth, getYear,
  subMonths, addMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval
} from "date-fns";
import { ru } from "date-fns/locale";

function parseBookingDate(dateStr: string): Date | null {
  try {
    if (dateStr.includes('.')) {
      const [d, m, y] = dateStr.split('.');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    return new Date(dateStr);
  } catch { return null; }
}

const MONTH_NAMES_RU = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];

export default function Dashboard() {
  const { data: users, isLoading: usersLoading } = useGetUsers();
  const { data: bookings, isLoading: bookingsLoading } = useGetBookings();
  const { data: subscriptions, isLoading: subsLoading } = useGetSubscriptions();
  const { data: analytics, isLoading: analyticsLoading } = useGetAnalytics();

  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [chartMode, setChartMode] = useState<"bookings" | "bot" | "revenue">("bookings");
  const [chartMonth, setChartMonth] = useState(new Date());
  const [chartWeek, setChartWeek] = useState(new Date());

  const isLoading = usersLoading || bookingsLoading || subsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse bg-muted/20 h-32 border-none shadow-none" />
          ))}
        </div>
        <Card className="animate-pulse bg-muted/20 h-[400px] border-none shadow-none" />
      </div>
    );
  }

  const totalUsers = users?.length || 0;
  const bookingsThisWeek = bookings?.filter((b: any) => isThisWeek(parseISO(b.createdAt))).length || 0;
  const activeSubscriptions = subscriptions?.filter((s: any) => s.remainingLessons > 0 && s.isPaid && s.status !== 'cancelled').length || 0;
  const totalBookings = bookings?.length || 0;

  // Bookings chart
  let bookingsChartData: { name: string; count: number }[] = [];
  let periodLabel = "";

  if (viewMode === "month") {
    const monthStart = startOfMonth(chartMonth);
    const monthEnd = endOfMonth(chartMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const weekGroups: Record<number, Date[]> = {};
    for (const day of days) {
      const wk = getWeek(day, { weekStartsOn: 1 });
      if (!weekGroups[wk]) weekGroups[wk] = [];
      weekGroups[wk].push(day);
    }
    bookingsChartData = Object.values(weekGroups).map(weekDays => {
      const cnt = (bookings || []).filter((b: any) => {
        const d = parseBookingDate(b.date);
        if (!d) return false;
        return weekDays.some(wd =>
          wd.getDate() === d.getDate() && wd.getMonth() === d.getMonth() && wd.getFullYear() === d.getFullYear()
        );
      }).length;
      const first = weekDays[0];
      const last = weekDays[weekDays.length - 1];
      return { name: `${format(first, 'd')}-${format(last, 'd')}`, count: cnt };
    });
    periodLabel = format(chartMonth, "LLLL yyyy", { locale: ru });
  } else {
    const wkStart = startOfWeek(chartWeek, { weekStartsOn: 1 });
    const wkEnd = endOfWeek(chartWeek, { weekStartsOn: 1 });
    bookingsChartData = eachDayOfInterval({ start: wkStart, end: wkEnd }).map(day => {
      const cnt = (bookings || []).filter((b: any) => {
        const d = parseBookingDate(b.date);
        if (!d) return false;
        return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getFullYear() === day.getFullYear();
      }).length;
      return { name: format(day, 'EEE d', { locale: ru }), count: cnt };
    });
    periodLabel = `${format(wkStart, 'd MMM', { locale: ru })} – ${format(wkEnd, 'd MMM yyyy', { locale: ru })}`;
  }

  const maxCount = Math.max(...bookingsChartData.map(d => d.count), 1);
  const yMax = Math.ceil(maxCount * 1.2) || 4;

  const handlePrev = () => {
    if (viewMode === "month") setChartMonth(m => subMonths(m, 1));
    else setChartWeek(w => subWeeks(w, 1));
  };
  const handleNext = () => {
    if (viewMode === "month") setChartMonth(m => addMonths(m, 1));
    else setChartWeek(w => addWeeks(w, 1));
  };
  const isAtFuture = viewMode === "month"
    ? getMonth(chartMonth) === getMonth(new Date()) && getYear(chartMonth) === getYear(new Date())
    : startOfWeek(chartWeek, { weekStartsOn: 1 }) >= startOfWeek(new Date(), { weekStartsOn: 1 });

  const funnel = analytics?.funnel;
  const revenueData = (analytics?.revenueByMonth || []).map((r: any) => {
    const [year, month] = r.month.split("-");
    return {
      name: `${MONTH_NAMES_RU[parseInt(month) - 1]} ${year.slice(2)}`,
      amount: Math.round(r.amount),
    };
  });
  const botData = (analytics?.botActivityByDay || []).slice(-30).map((d: any) => ({
    name: d.date,
    count: d.count,
  }));
  const attentionStudents = analytics?.attentionStudents || [];

  const funnelSteps = funnel ? [
    { label: "Зарегистрировались", value: funnel.totalUsers, color: "bg-primary", pct: 100 },
    { label: "Верифицировали email", value: funnel.verifiedEmails, color: "bg-blue-500", pct: funnel.totalUsers ? Math.round((funnel.verifiedEmails / funnel.totalUsers) * 100) : 0 },
    { label: "Записались на занятие", value: funnel.hadBooking, color: "bg-emerald-500", pct: funnel.totalUsers ? Math.round((funnel.hadBooking / funnel.totalUsers) * 100) : 0 },
    { label: "Оплатили", value: funnel.paid, color: "bg-amber-500", pct: funnel.totalUsers ? Math.round((funnel.paid / funnel.totalUsers) * 100) : 0 },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего учеников</CardTitle>
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Зарегистрировано в боте</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Занятий на неделе</CardTitle>
            <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <CalendarCheck className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">{bookingsThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">Создано за последние 7 дней</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Активные абонементы</CardTitle>
            <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">{activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground mt-1">Оплачены, есть остаток</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего записей</CardTitle>
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">За всё время</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel + Attention side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Воронка конверсии
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading || !funnel ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted/40 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {funnelSteps.map((step, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">{step.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{step.value}</span>
                        {i > 0 && (
                          <Badge variant="outline" className="text-xs no-default-active-elevate font-medium">
                            {step.pct}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${step.color}`}
                        style={{ width: `${step.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attention students */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Требуют внимания
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-muted/40 rounded-lg animate-pulse" />)}
              </div>
            ) : attentionStudents.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Все ученики активны в последние 14 дней
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Ученики, у которых последнее занятие было более 14 дней назад:
                </p>
                {attentionStudents.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {s.firstName} {s.lastName || ''}
                      </span>
                      {s.telegramUsername && (
                        <span className="text-xs text-muted-foreground ml-1.5">@{s.telegramUsername}</span>
                      )}
                    </div>
                    {s.lastBookingDate && (
                      <span className="text-xs text-amber-700 whitespace-nowrap">
                        {format(parseISO(s.lastBookingDate), 'd MMM', { locale: ru })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main chart with switcher */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle>Аналитика</CardTitle>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setChartMode("bookings")}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${chartMode === "bookings" ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}
                >
                  Записи
                </button>
                <button
                  onClick={() => setChartMode("bot")}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${chartMode === "bot" ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}
                >
                  Активность бота
                </button>
                <button
                  onClick={() => setChartMode("revenue")}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${chartMode === "revenue" ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}
                >
                  Доход
                </button>
              </div>
            </div>
            {chartMode === "bookings" && (
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setViewMode("week")}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${viewMode === "week" ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}
                  >
                    Неделя
                  </button>
                  <button
                    onClick={() => setViewMode("month")}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${viewMode === "month" ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}
                  >
                    Месяц
                  </button>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium capitalize min-w-[180px] text-center">{periodLabel}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNext} disabled={isAtFuture}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full pt-4">
            {chartMode === "bookings" && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingsChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} allowDecimals={false} domain={[0, yMax]} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-card-foreground)' }}
                    formatter={(value: any) => [value, 'Записей']}
                    labelFormatter={(label) => viewMode === "month" ? `Дни ${label}` : label}
                  />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} barSize={viewMode === "week" ? 36 : 40} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartMode === "bot" && (
              analyticsLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">Загрузка...</div>
              ) : botData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Activity className="h-10 w-10 opacity-30" />
                  <p className="text-sm">Нет данных об активности бота</p>
                  <p className="text-xs">Данные появятся после интеграции с Telegram-ботом</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={botData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="botGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)' }}
                      formatter={(value: any) => [value, 'Уникальных пользователей']}
                    />
                    <Area type="monotone" dataKey="count" stroke="var(--color-primary)" fill="url(#botGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )
            )}

            {chartMode === "revenue" && (
              analyticsLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">Загрузка...</div>
              ) : revenueData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <TrendingUp className="h-10 w-10 opacity-30" />
                  <p className="text-sm">Нет данных о доходах</p>
                  <p className="text-xs">Доходы отображаются из оплат через ЮКассу</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData} margin={{ top: 0, right: 0, left: -5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)' }}
                      formatter={(value: any) => [`${value.toLocaleString()} ₽`, 'Доход']}
                    />
                    <Bar dataKey="amount" fill="var(--color-primary)" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
