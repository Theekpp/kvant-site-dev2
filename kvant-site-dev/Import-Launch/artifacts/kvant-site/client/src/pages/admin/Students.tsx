import { useState } from "react";
import { useGetUsers, useCreateUser, useGetUserDetails } from "@/lib/admin-api";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UserCircle2, UserPlus, Phone, ExternalLink, CalendarCheck, CreditCard, Banknote, Clock } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ru } from "date-fns/locale";

const GRADES = ["7", "8", "9", "10", "11", "Студент", "Другое"];
const GOALS = ["ЕГЭ", "ОГЭ", "Олимпиады", "Повышение оценок", "Интерес к физике", "Подготовка в ВУЗ", "Другое"];

interface StudentForm {
  firstName: string;
  lastName: string;
  age: string;
  grade: string;
  goal: string;
  phone: string;
  telegramUsername: string;
  telegramId: string;
}

const DEFAULT_FORM: StudentForm = {
  firstName: "", lastName: "", age: "", grade: "", goal: "",
  phone: "", telegramUsername: "", telegramId: ""
};

function StudentCard({ userId, onClose }: { userId: number; onClose: () => void }) {
  const { data, isLoading } = useGetUserDetails(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { user, bookings, subscriptions, totalPaid, lastBotActivity } = data;
  const sortedBookings = [...(bookings || [])].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const activeSubs = (subscriptions || []).filter((s: any) => s.isPaid && s.status !== 'cancelled');
  const lastBooking = sortedBookings[0];
  const daysSinceLastBooking = lastBooking
    ? differenceInDays(new Date(), parseISO(lastBooking.createdAt))
    : null;

  return (
    <div className="space-y-6 py-2">
      {/* Header info */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center">
          <UserCircle2 className="h-9 w-9 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold">{user.firstName} {user.lastName || ''}</h3>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {user.grade && <Badge variant="secondary" className="text-xs no-default-active-elevate">{user.grade} кл.</Badge>}
            {user.goal && <Badge variant="outline" className="text-xs no-default-active-elevate">{user.goal}</Badge>}
            {user.age && <span className="text-sm text-muted-foreground">{user.age} лет</span>}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-center">
          <div className="text-2xl font-bold text-primary">{bookings?.length || 0}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Занятий</div>
        </div>
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">{activeSubs.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Абонементов</div>
        </div>
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{Math.round(totalPaid || 0).toLocaleString()} ₽</div>
          <div className="text-xs text-muted-foreground mt-0.5">Оплачено</div>
        </div>
      </div>

      {/* Contact + activity */}
      <div className="space-y-2 text-sm">
        {user.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${user.phone}`} className="text-primary hover:underline">{user.phone}</a>
          </div>
        )}
        {user.telegramUsername && (
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <a href={`https://t.me/${user.telegramUsername}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              @{user.telegramUsername}
            </a>
          </div>
        )}
        {lastBotActivity && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Последняя активность в боте: {format(new Date(lastBotActivity), 'd MMM yyyy', { locale: ru })}</span>
          </div>
        )}
        {daysSinceLastBooking !== null && (
          <div className={`flex items-center gap-2 ${daysSinceLastBooking > 14 ? 'text-amber-600' : 'text-muted-foreground'}`}>
            <CalendarCheck className="h-4 w-4" />
            <span>
              Последнее занятие: {lastBooking.date}
              {daysSinceLastBooking > 14 && ` (${daysSinceLastBooking} дней назад)`}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <UserCircle2 className="h-4 w-4" />
          <span>Зарегистрирован {format(parseISO(user.createdAt), 'd MMMM yyyy', { locale: ru })}</span>
        </div>
      </div>

      {/* Tabs with bookings and subscriptions */}
      <Tabs defaultValue="bookings">
        <TabsList className="w-full">
          <TabsTrigger value="bookings" className="flex-1 gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" />
            Занятия ({bookings?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="subs" className="flex-1 gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Абонементы ({subscriptions?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-3">
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {sortedBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Нет занятий</p>
            ) : sortedBookings.slice(0, 20).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{b.date}</span>
                  <span className="text-xs text-muted-foreground ml-2">{b.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={`text-xs no-default-active-elevate ${
                    b.status === 'completed' ? 'text-emerald-700 border-emerald-200' :
                    b.status === 'cancelled' ? 'text-red-500 border-red-200' :
                    b.status === 'confirmed' ? 'text-blue-700 border-blue-200' : 'text-amber-600 border-amber-200'
                  }`}>
                    {b.status === 'pending' ? 'Ожидает' : b.status === 'confirmed' ? 'Подтв.' : b.status === 'completed' ? 'Завершено' : 'Отменено'}
                  </Badge>
                  {b.isPaid && <Banknote className="h-3.5 w-3.5 text-emerald-600" />}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subs" className="mt-3">
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {(subscriptions || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Нет абонементов</p>
            ) : (subscriptions || []).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{s.type === 'individual' ? 'Инд.' : 'Груп.'}</span>
                  <span className="text-xs text-muted-foreground ml-2">{format(parseISO(s.createdAt), 'd MMM yy', { locale: ru })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${s.remainingLessons === 0 ? 'text-red-500' : 'text-primary'}`}>
                    {s.remainingLessons}/{s.totalLessons}
                  </span>
                  <Badge variant="outline" className={`text-xs no-default-active-elevate ${
                    s.status === 'cancelled' ? 'text-red-500 border-red-200' :
                    s.isPaid ? 'text-emerald-700 border-emerald-200' : 'text-amber-700 border-amber-200'
                  }`}>
                    {s.status === 'cancelled' ? 'Отменён' : s.isPaid ? 'Активен' : 'Ожидает'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Students() {
  const { data: users, isLoading } = useGetUsers();
  const createUser = useCreateUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<StudentForm>(DEFAULT_FORM);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const handleSubmit = () => {
    if (!form.firstName.trim()) {
      toast({ title: "Введите имя ученика", variant: "destructive" });
      return;
    }
    const telegramId = form.telegramId ? parseInt(form.telegramId) : -(Date.now());
    createUser.mutate({
      data: {
        telegramId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || null,
        age: form.age ? parseInt(form.age) : null,
        grade: form.grade || null,
        goal: form.goal || null,
        phone: form.phone.trim() || null,
        telegramUsername: form.telegramUsername.replace('@', '').trim() || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
        toast({ title: "Ученик добавлен" });
        setIsOpen(false);
        setForm(DEFAULT_FORM);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || "Ошибка добавления";
        toast({ title: msg, variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-sm p-8 flex justify-center items-center h-[500px]">
        <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p>Загрузка учеников...</p>
        </div>
      </Card>
    );
  }

  const sortedUsers = [...(users || [])].sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Добавить ученика
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Ученик</TableHead>
                <TableHead>Класс</TableHead>
                <TableHead>Цель</TableHead>
                <TableHead>Контакты</TableHead>
                <TableHead className="text-right">Регистрация</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Нет зарегистрированных учеников
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((user: any) => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                          <UserCircle2 className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {user.firstName} {user.lastName || ''}
                          </span>
                          {user.age && <span className="text-xs text-muted-foreground">{user.age} лет</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.grade ? (
                        <Badge variant="secondary" className="font-normal no-default-active-elevate">{user.grade}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.goal ? (
                        <span className="text-sm font-medium">{user.goal}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        {user.phone ? (
                          <a href={`tel:${user.phone}`} className="text-primary hover:underline" onClick={e => e.stopPropagation()}>{user.phone}</a>
                        ) : (
                          <span className="text-muted-foreground">Нет телефона</span>
                        )}
                        {user.telegramUsername && (
                          <a href={`https://t.me/${user.telegramUsername}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" onClick={e => e.stopPropagation()}>
                            @{user.telegramUsername}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(parseISO(user.createdAt), 'dd MMM yyyy', { locale: ru })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Student card sheet */}
      <Sheet open={selectedUserId !== null} onOpenChange={open => { if (!open) setSelectedUserId(null); }}>
        <SheetContent className="sm:max-w-[480px] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Карточка ученика</SheetTitle>
            <SheetDescription>Детальная информация, занятия и абонементы</SheetDescription>
          </SheetHeader>
          {selectedUserId !== null && (
            <StudentCard userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
          )}
        </SheetContent>
      </Sheet>

      {/* Add student dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Добавить ученика вручную</DialogTitle>
            <DialogDescription>
              Если ученик не использует бот, он будет добавлен только в базу данных.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">Имя *</Label>
                <Input placeholder="Иван" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Фамилия</Label>
                <Input placeholder="Петров" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">Возраст</Label>
                <Input type="number" min={5} max={99} placeholder="15" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Класс</Label>
                <Select value={form.grade} onValueChange={v => setForm(f => ({ ...f, grade: v }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Цель обучения</Label>
              <Select value={form.goal} onValueChange={v => setForm(f => ({ ...f, goal: v }))}>
                <SelectTrigger><SelectValue placeholder="Выберите цель" /></SelectTrigger>
                <SelectContent>
                  {GOALS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Телефон</Label>
              <Input placeholder="+7 900 000 00 00" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Telegram username</Label>
              <Input placeholder="@username" value={form.telegramUsername} onChange={e => setForm(f => ({ ...f, telegramUsername: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Telegram ID (если известен)</Label>
              <Input type="number" placeholder="Оставьте пустым если неизвестен" value={form.telegramId} onChange={e => setForm(f => ({ ...f, telegramId: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Если не указан — будет сгенерирован автоматически</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Отмена</Button>
            <Button onClick={handleSubmit} disabled={createUser.isPending}>
              {createUser.isPending ? "Сохранение..." : "Добавить ученика"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
