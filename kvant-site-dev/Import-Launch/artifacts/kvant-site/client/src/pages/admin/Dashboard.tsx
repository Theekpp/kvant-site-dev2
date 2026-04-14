import { useState } from "react";
import { useGetUsers, useGetBookings, useGetSubscriptions } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CalendarCheck, Activity, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  isThisWeek, parseISO, format, startOfMonth, endOfMonth, getWeek, getMonth, getYear,
  subMonths, addMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, getDay
} from "date-fns";
import { ru } from "date-fns/locale";

const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function getDayOfWeekMon(date: Date): number {
  const d = getDay(date);
  return d === 0 ? 6 : d - 1;
}

function parseBookingDate(dateStr: string): Date | null {
  try {
    if (dateStr.includes('.')) {
      const [d, m, y] = dateStr.split('.');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    return new Date(dateStr);
  } catch { return null; }
}

export default function Dashboard() {
  const { data: users, isLoading: usersLoading } = useGetUsers();
  const { data: bookings, isLoading: bookingsLoading } = useGetBookings();
  const { data: subscriptions, isLoading: subsLoading } = useGetSubscriptions();

  const [viewMode, setViewMode] = useState<"month" | "week">("month");
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
  const bookingsThisWeek = bookings?.filter(b => isThisWeek(parseISO(b.createdAt))).length || 0;
  const activeSubscriptions = subscriptions?.filter(s => s.remainingLessons > 0 && s.isPaid).length || 0;
  const totalBookings = bookings?.length || 0;

  let chartData: { name: string; count: number }[] = [];
  let periodLabel = "";

  if (viewMode === "month") {
    const year = getYear(chartMonth);
    const month = getMonth(chartMonth);
    const monthStart = startOfMonth(chartMonth);
    const monthEnd = endOfMonth(chartMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Group days into ISO weeks
    const weekGroups: Record<number, Date[]> = {};
    for (const day of days) {
      const wk = getWeek(day, { weekStartsOn: 1 });
      if (!weekGroups[wk]) weekGroups[wk] = [];
      weekGroups[wk].push(day);
    }

    chartData = Object.values(weekGroups).map(weekDays => {
      const weekBookings = (bookings || []).filter(b => {
        const d = parseBookingDate(b.date);
        if (!d) return false;
        return weekDays.some(wd =>
          wd.getDate() === d.getDate() &&
          wd.getMonth() === d.getMonth() &&
          wd.getFullYear() === d.getFullYear()
        );
      });

      const first = weekDays[0];
      const last = weekDays[weekDays.length - 1];
      return {
        name: `${format(first, 'd')}-${format(last, 'd')}`,
        count: weekBookings.length
      };
    });

    periodLabel = format(chartMonth, "LLLL yyyy", { locale: ru });
  } else {
    const wkStart = startOfWeek(chartWeek, { weekStartsOn: 1 });
    const wkEnd = endOfWeek(chartWeek, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: wkStart, end: wkEnd });

    chartData = weekDays.map(day => {
      const dayBookings = (bookings || []).filter(b => {
        const d = parseBookingDate(b.date);
        if (!d) return false;
        return d.getDate() === day.getDate() &&
          d.getMonth() === day.getMonth() &&
          d.getFullYear() === day.getFullYear();
      });
      return {
        name: format(day, 'EEE d', { locale: ru }),
        count: dayBookings.length
      };
    });

    periodLabel = `${format(wkStart, 'd MMM', { locale: ru })} – ${format(wkEnd, 'd MMM yyyy', { locale: ru })}`;
  }

  const maxCount = Math.max(...chartData.map(d => d.count), 1);
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

  return (
    <div className="space-y-8">
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

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <CardTitle>Активность</CardTitle>
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
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium capitalize min-w-[180px] text-center">
                {periodLabel}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNext} disabled={isAtFuture}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  allowDecimals={false}
                  domain={[0, yMax]}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid hsl(var(--border))',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: any) => [value, 'Записей']}
                  labelFormatter={(label) => viewMode === "month" ? `Дни ${label}` : label}
                />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 0, 0]}
                  barSize={viewMode === "week" ? 36 : 40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
