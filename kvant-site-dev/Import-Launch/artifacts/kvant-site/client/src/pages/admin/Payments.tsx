import { useState } from "react";
import { useGetBookings, useGetSubscriptions, useMarkBookingPaid, useMarkSubscriptionPaid, useRefundSubscription } from "@/lib/admin-api";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Banknote, CreditCard, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

const TYPE_MAP: Record<string, string> = {
  individual: "Индивидуальное",
  group: "Групповое"
};

export default function Payments() {
  const { data: bookings, isLoading: bookingsLoading } = useGetBookings();
  const { data: subscriptions, isLoading: subsLoading } = useGetSubscriptions();
  const markBookingPaid = useMarkBookingPaid();
  const markSubPaid = useMarkSubscriptionPaid();
  const refundSub = useRefundSubscription();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [refundDialogSubId, setRefundDialogSubId] = useState<number | null>(null);

  const isLoading = bookingsLoading || subsLoading;

  const handleToggleBookingPaid = (id: number, isPaid: boolean) => {
    markBookingPaid.mutate({ id, data: { isPaid: !isPaid } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        toast({ title: !isPaid ? "Оплата записи отмечена" : "Оплата записи снята" });
      },
      onError: () => toast({ title: "Ошибка", variant: "destructive" })
    });
  };

  const handleMarkSubPaid = (id: number) => {
    markSubPaid.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
        toast({ title: "Абонемент активирован" });
      },
      onError: () => toast({ title: "Ошибка", variant: "destructive" })
    });
  };

  const handleRefund = () => {
    if (refundDialogSubId === null) return;
    refundSub.mutate({ id: refundDialogSubId }, {
      onSuccess: (data: any) => {
        setRefundDialogSubId(null);
        if (data?.status === "succeeded") {
          toast({ title: "Возврат выполнен", description: `Средства (${data.amount} ₽) возвращены покупателю` });
        } else {
          toast({ title: "Возврат инициирован", description: `Статус: ${data?.status || "pending"}. ЮКасса обработает возврат в ближайшее время.` });
        }
      },
      onError: (err: any) => {
        setRefundDialogSubId(null);
        const msg = err?.response?.data?.message || "Ошибка при создании возврата";
        toast({ title: "Ошибка возврата", description: msg, variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-sm p-8 flex justify-center items-center h-[500px]">
        <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p>Загрузка данных...</p>
        </div>
      </Card>
    );
  }

  const paidBookings = (bookings || []).filter(b => b.isPaid).length;
  const unpaidBookings = (bookings || []).filter(b => !b.isPaid && b.status !== 'cancelled').length;
  const paidSubs = (subscriptions || []).filter(s => s.isPaid).length;
  const unpaidSubs = (subscriptions || []).filter(s => !s.isPaid).length;

  const sortedBookings = [...(bookings || [])].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const sortedSubs = [...(subscriptions || [])].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const refundTargetSub = refundDialogSubId !== null
    ? sortedSubs.find(s => s.id === refundDialogSubId)
    : null;

  return (
    <div className="space-y-6">
      <AlertDialog open={refundDialogSubId !== null} onOpenChange={open => { if (!open) setRefundDialogSubId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердить возврат средств</AlertDialogTitle>
            <AlertDialogDescription>
              {refundTargetSub && (
                <>
                  Вы собираетесь вернуть деньги за абонемент{" "}
                  <strong>
                    {refundTargetSub.user
                      ? `${refundTargetSub.user.firstName || ""} ${refundTargetSub.user.lastName || ""}`.trim() || "ученика"
                      : "ученика"}
                  </strong>{" "}
                  ({TYPE_MAP[refundTargetSub.type] || refundTargetSub.type}, {refundTargetSub.totalLessons} занятий).
                  <br /><br />
                  После возврата абонемент будет деактивирован. Это действие нельзя отменить.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refundSub.isPending}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefund}
              disabled={refundSub.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {refundSub.isPending ? "Обработка..." : "Вернуть средства"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Записей оплачено</CardTitle>
            <div className="h-10 w-10 bg-green-500/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{paidBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">Из {(bookings || []).length} всего</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Записей не оплачено</CardTitle>
            <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <XCircle className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unpaidBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">Ожидают оплаты</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Абонементов активных</CardTitle>
            <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{paidSubs}</div>
            <p className="text-xs text-muted-foreground mt-1">Из {(subscriptions || []).length} всего</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Абонементов не оплачено</CardTitle>
            <div className="h-10 w-10 bg-red-500/10 rounded-xl flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unpaidSubs}</div>
            <p className="text-xs text-muted-foreground mt-1">Ожидают активации</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bookings">
        <TabsList className="mb-4">
          <TabsTrigger value="bookings" className="gap-2">
            <Banknote className="h-4 w-4" />
            Записи ({(bookings || []).length})
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Абонементы ({(subscriptions || []).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <Card className="border-border/50 shadow-sm">
            <div>
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[35%]">Ученик</TableHead>
                    <TableHead className="w-[15%]">Дата</TableHead>
                    <TableHead className="w-[15%] hidden sm:table-cell">Тип</TableHead>
                    <TableHead className="w-[15%]">Статус</TableHead>
                    <TableHead className="w-[10%]">Оплата</TableHead>
                    <TableHead className="w-[10%] text-right">Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Нет записей</TableCell>
                    </TableRow>
                  ) : sortedBookings.map(b => (
                    <TableRow key={b.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="max-w-0">
                        {b.user ? (
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-sm truncate">{b.user.firstName} {b.user.lastName || ''}</span>
                            {b.user.telegramUsername && (
                              <span className="text-xs text-muted-foreground truncate">@{b.user.telegramUsername}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">Неизвестный</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        <div className="font-medium">{b.date}</div>
                        <div className="text-muted-foreground text-xs">{b.time}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="font-normal text-xs no-default-active-elevate whitespace-nowrap">
                          {b.type === 'individual' ? 'Инд.' : 'Груп.'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs no-default-active-elevate whitespace-nowrap ${
                          b.status === 'confirmed' ? 'text-blue-700 border-blue-200' :
                          b.status === 'completed' ? 'text-green-700 border-green-200' :
                          b.status === 'cancelled' ? 'text-red-500 border-red-200' : 'text-amber-600 border-amber-200'
                        }`}>
                          {b.status === 'pending' ? 'Ожидает' :
                           b.status === 'confirmed' ? 'Подтв.' :
                           b.status === 'completed' ? 'Завершено' : 'Отменено'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs no-default-active-elevate whitespace-nowrap ${
                            b.isPaid
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}
                        >
                          {b.isPaid ? '✓ Опл.' : '✗ Неопл.'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={b.isPaid ? "outline" : "default"}
                          className="h-7 text-xs whitespace-nowrap"
                          onClick={() => handleToggleBookingPaid(b.id, b.isPaid)}
                          disabled={markBookingPaid.isPending}
                        >
                          {b.isPaid ? 'Снять' : 'Отметить'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card className="border-border/50 shadow-sm">
            <div>
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[30%]">Ученик</TableHead>
                    <TableHead className="w-[15%] hidden sm:table-cell">Тип</TableHead>
                    <TableHead className="w-[12%]">Занятия</TableHead>
                    <TableHead className="w-[13%] hidden sm:table-cell">Оформлен</TableHead>
                    <TableHead className="w-[10%]">Статус</TableHead>
                    <TableHead className="w-[20%] text-right">Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSubs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Нет абонементов</TableCell>
                    </TableRow>
                  ) : sortedSubs.map(s => (
                    <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="max-w-0">
                        {s.user ? (
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-sm truncate">{s.user.firstName} {s.user.lastName || ''}</span>
                            {s.user.telegramUsername && (
                              <span className="text-xs text-muted-foreground truncate">@{s.user.telegramUsername}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">Неизвестный</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs no-default-active-elevate whitespace-nowrap">
                          {TYPE_MAP[s.type] || s.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={`font-semibold ${s.remainingLessons === 0 ? 'text-red-500' : 'text-primary'}`}>
                          {s.remainingLessons}
                        </span>
                        <span className="text-muted-foreground">/{s.totalLessons}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                        {format(parseISO(s.createdAt), 'd MMM yy', { locale: ru })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs no-default-active-elevate whitespace-nowrap ${
                            s.isPaid
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {s.isPaid ? '✓ Актив.' : '⏳ Ожид.'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!s.isPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleMarkSubPaid(s.id)}
                              disabled={markSubPaid.isPending}
                            >
                              Активировать
                            </Button>
                          )}
                          {s.isPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 gap-1"
                              onClick={() => setRefundDialogSubId(s.id)}
                              disabled={refundSub.isPending}
                            >
                              <RotateCcw className="h-3 w-3" />
                              Возврат
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
