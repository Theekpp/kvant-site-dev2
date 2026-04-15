import { useState } from "react";
import {
  useGetBookings, useUpdateBookingStatus, useNotifyUser, useMarkBookingPaid,
  useGetUsers, useCreateBooking, useGetSubscriptions
} from "@/lib/admin-api";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, Bell, CheckCircle, XCircle, Clock, AlertCircle, Banknote, BanknoteIcon, Plus, CreditCard, Gift } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string, color: string, icon: any }> = {
  pending:   { label: "Ожидает",      color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",     icon: AlertCircle },
  confirmed: { label: "Подтверждено", color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",           icon: Clock },
  completed: { label: "Завершено",    color: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle },
  cancelled: { label: "Отменено",     color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",                 icon: XCircle },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  subscription: "Абонемент",
  external: "Внешняя оплата",
  gift: "Подарок",
};

interface BookingForm {
  userId: string;
  type: string;
  date: string;
  time: string;
  status: string;
  isPaid: boolean;
}

const DEFAULT_FORM: BookingForm = {
  userId: "", type: "individual", date: "", time: "10:00", status: "confirmed", isPaid: false
};

const TIME_PRESETS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];

interface PaymentMethodState {
  open: boolean;
  bookingId: number | null;
  userId: number | null;
  currentIsPaid: boolean;
}

export default function Bookings() {
  const { data: bookings, isLoading } = useGetBookings();
  const { data: users } = useGetUsers();
  const { data: subscriptions } = useGetSubscriptions();
  const updateStatus = useUpdateBookingStatus();
  const markPaid = useMarkBookingPaid();
  const notifyUser = useNotifyUser();
  const createBooking = useCreateBooking();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [notifyUserId, setNotifyUserId] = useState<number | null>(null);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [form, setForm] = useState<BookingForm>(DEFAULT_FORM);

  const [paymentState, setPaymentState] = useState<PaymentMethodState>({
    open: false, bookingId: null, userId: null, currentIsPaid: false
  });
  const [paymentMethod, setPaymentMethod] = useState<string>("external");
  const [selectedSubId, setSelectedSubId] = useState<string>("");

  const handleStatusChange = (id: number, status: string) => {
    updateStatus.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
        toast({ title: "Статус обновлён" });
      },
      onError: () => toast({ title: "Ошибка обновления статуса", variant: "destructive" })
    });
  };

  const openPaymentDialog = (bookingId: number, userId: number, currentIsPaid: boolean) => {
    if (currentIsPaid) {
      markPaid.mutate({ id: bookingId, data: { isPaid: false, paymentMethod: null } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
          toast({ title: "Оплата снята" });
        },
        onError: () => toast({ title: "Ошибка", variant: "destructive" })
      });
      return;
    }
    setPaymentState({ open: true, bookingId, userId, currentIsPaid });
    setPaymentMethod("external");
    setSelectedSubId("");
  };

  const handleConfirmPayment = () => {
    if (!paymentState.bookingId) return;
    if (paymentMethod === "subscription" && !selectedSubId) {
      toast({ title: "Выберите абонемент", variant: "destructive" });
      return;
    }
    markPaid.mutate({
      id: paymentState.bookingId,
      data: {
        isPaid: true,
        paymentMethod,
        subscriptionId: paymentMethod === "subscription" ? parseInt(selectedSubId) : undefined,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
        toast({ title: "Оплата отмечена" });
        setPaymentState({ open: false, bookingId: null, userId: null, currentIsPaid: false });
      },
      onError: () => toast({ title: "Ошибка", variant: "destructive" })
    });
  };

  const handleSendNotification = () => {
    if (!notifyUserId || !notifyMessage.trim()) return;
    notifyUser.mutate({ userId: notifyUserId, data: { message: notifyMessage } }, {
      onSuccess: () => {
        setIsNotifyOpen(false);
        setNotifyMessage("");
        toast({ title: "Уведомление отправлено" });
      },
      onError: () => toast({ title: "Ошибка отправки", variant: "destructive" })
    });
  };

  const handleCreateBooking = () => {
    if (!form.userId) { toast({ title: "Выберите ученика", variant: "destructive" }); return; }
    if (!form.date) { toast({ title: "Укажите дату", variant: "destructive" }); return; }
    if (!form.time) { toast({ title: "Укажите время", variant: "destructive" }); return; }

    const dateObj = new Date(form.date + 'T12:00:00');
    const dateStr = format(dateObj, 'dd.MM.yyyy');

    createBooking.mutate({
      data: {
        userId: parseInt(form.userId),
        type: form.type,
        date: dateStr,
        time: form.time,
        status: form.status,
        isPaid: form.isPaid,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
        toast({ title: "Запись создана" });
        setIsBookingOpen(false);
        setForm(DEFAULT_FORM);
      },
      onError: () => toast({ title: "Ошибка создания записи", variant: "destructive" })
    });
  };

  const userActiveSubs = paymentState.userId
    ? (subscriptions || []).filter((s: any) =>
        s.userId === paymentState.userId && s.isPaid && s.remainingLessons > 0 && s.status !== 'cancelled'
      )
    : [];

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-sm p-8 flex justify-center items-center h-[500px]">
        <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p>Загрузка записей...</p>
        </div>
      </Card>
    );
  }

  const sortedBookings = [...(bookings || [])].sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsBookingOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Добавить запись
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[33%]">Ученик</TableHead>
              <TableHead className="w-[15%]">Дата</TableHead>
              <TableHead className="w-[12%] hidden sm:table-cell">Тип</TableHead>
              <TableHead className="w-[22%]">Статус / Оплата</TableHead>
              <TableHead className="w-[18%] text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Нет записей</TableCell>
              </TableRow>
            ) : (
              sortedBookings.map((booking: any) => {
                const StatusIcon = STATUS_MAP[booking.status]?.icon || Clock;
                return (
                  <TableRow key={booking.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium max-w-0">
                      {booking.user ? (
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-semibold text-sm">{booking.user.firstName} {booking.user.lastName || ''}</span>
                          {booking.user.telegramUsername && (
                            <span className="text-xs text-muted-foreground truncate">@{booking.user.telegramUsername}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-sm">Неизвестный</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <div className="font-medium">{booking.date}</div>
                      <div className="text-muted-foreground text-xs">{booking.time}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="font-normal no-default-active-elevate text-xs whitespace-nowrap">
                        {booking.type === 'individual' ? 'Инд.' : 'Груп.'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant="outline"
                          className={`gap-1 text-xs py-0.5 px-1.5 font-medium border no-default-active-elevate w-fit ${STATUS_MAP[booking.status]?.color || ''}`}
                        >
                          <StatusIcon className="w-3 h-3 shrink-0" />
                          {STATUS_MAP[booking.status]?.label || booking.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          onClick={() => openPaymentDialog(booking.id, booking.userId, booking.isPaid)}
                          className={`gap-1 text-xs py-0.5 px-1.5 cursor-pointer no-default-active-elevate w-fit ${booking.isPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                        >
                          <Banknote className="w-3 h-3 shrink-0" />
                          {booking.isPaid
                            ? `Опл. · ${PAYMENT_METHOD_LABELS[booking.paymentMethod] || ''}`
                            : 'Не опл.'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52" sideOffset={4}>
                          <DropdownMenuLabel>Изменить статус</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'pending')} disabled={booking.status === 'pending'}>
                            <AlertCircle className="mr-2 h-4 w-4 text-amber-500" /> Ожидает
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'confirmed')} disabled={booking.status === 'confirmed'}>
                            <Clock className="mr-2 h-4 w-4 text-blue-500" /> Подтвердить
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'completed')} disabled={booking.status === 'completed'}>
                            <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" /> Завершить
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(booking.id, 'cancelled')} disabled={booking.status === 'cancelled'}>
                            <XCircle className="mr-2 h-4 w-4 text-red-500" /> Отменить
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openPaymentDialog(booking.id, booking.userId, booking.isPaid)}>
                            <BanknoteIcon className="mr-2 h-4 w-4 text-green-500" />
                            {booking.isPaid ? 'Снять оплату' : 'Отметить оплату'}
                          </DropdownMenuItem>
                          {booking.userId && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setNotifyUserId(booking.userId); setIsNotifyOpen(true); }}>
                                <Bell className="mr-2 h-4 w-4 text-primary" /> Отправить сообщение
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Payment method dialog */}
      <Dialog open={paymentState.open} onOpenChange={open => { if (!open) setPaymentState(s => ({ ...s, open: false })); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Способ оплаты</DialogTitle>
            <DialogDescription>Выберите, как была произведена оплата за это занятие.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
              <div className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${paymentMethod === 'subscription' ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setPaymentMethod('subscription')}>
                <RadioGroupItem value="subscription" id="pm-sub" className="mt-0.5" />
                <Label htmlFor="pm-sub" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    Списание с абонемента
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Вычесть занятие из активного абонемента ученика</p>
                </Label>
              </div>
              <div className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${paymentMethod === 'external' ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setPaymentMethod('external')}>
                <RadioGroupItem value="external" id="pm-ext" className="mt-0.5" />
                <Label htmlFor="pm-ext" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <BanknoteIcon className="h-4 w-4 text-green-600" />
                    Оплата вне сайта
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Наличные, перевод или другой способ оплаты</p>
                </Label>
              </div>
              <div className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${paymentMethod === 'gift' ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setPaymentMethod('gift')}>
                <RadioGroupItem value="gift" id="pm-gift" className="mt-0.5" />
                <Label htmlFor="pm-gift" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Gift className="h-4 w-4 text-purple-600" />
                    Подарок / бесплатно
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Занятие предоставляется бесплатно</p>
                </Label>
              </div>
            </RadioGroup>

            {paymentMethod === "subscription" && (
              <div>
                <Label className="text-sm mb-1.5 block">Выберите абонемент *</Label>
                {userActiveSubs.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
                    У этого ученика нет активных абонементов с остатком занятий.
                  </p>
                ) : (
                  <Select value={selectedSubId} onValueChange={setSelectedSubId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите абонемент" />
                    </SelectTrigger>
                    <SelectContent>
                      {userActiveSubs.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.type === 'individual' ? 'Инд.' : 'Груп.'} · {s.remainingLessons}/{s.totalLessons} занятий
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentState(s => ({ ...s, open: false }))}>Отмена</Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={markPaid.isPending || (paymentMethod === "subscription" && !selectedSubId)}
            >
              {markPaid.isPending ? "Сохранение..." : "Отметить оплаченным"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Booking Dialog */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Добавить запись вручную</DialogTitle>
            <DialogDescription>Создайте занятие для ученика напрямую.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm mb-1.5 block">Ученик *</Label>
              <Select value={form.userId} onValueChange={v => setForm(f => ({ ...f, userId: v }))}>
                <SelectTrigger><SelectValue placeholder="Выберите ученика" /></SelectTrigger>
                <SelectContent>
                  {(users || []).map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.firstName} {u.lastName || ''} {u.telegramUsername ? `(@${u.telegramUsername})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Тип занятия</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Индивидуальное</SelectItem>
                  <SelectItem value="group">Групповое</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">Дата *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Время *</Label>
                <Select value={form.time} onValueChange={v => setForm(f => ({ ...f, time: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_PRESETS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Статус</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Ожидает</SelectItem>
                  <SelectItem value="confirmed">Подтверждено</SelectItem>
                  <SelectItem value="completed">Завершено</SelectItem>
                  <SelectItem value="cancelled">Отменено</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Уже оплачено</Label>
                <p className="text-xs text-muted-foreground">Отметить запись как оплаченную</p>
              </div>
              <Switch checked={form.isPaid} onCheckedChange={v => setForm(f => ({ ...f, isPaid: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBookingOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateBooking} disabled={createBooking.isPending}>
              {createBooking.isPending ? "Создание..." : "Создать запись"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify Dialog */}
      <Dialog open={isNotifyOpen} onOpenChange={setIsNotifyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Отправить уведомление в Telegram</DialogTitle>
            <DialogDescription>Сообщение будет отправлено напрямую ученику от имени бота.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Введите текст сообщения..."
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
              className="min-h-[120px] resize-none focus-visible:ring-primary/20"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNotifyOpen(false)}>Отмена</Button>
            <Button onClick={handleSendNotification} disabled={!notifyMessage.trim() || notifyUser.isPending}>
              {notifyUser.isPending ? "Отправка..." : "Отправить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
