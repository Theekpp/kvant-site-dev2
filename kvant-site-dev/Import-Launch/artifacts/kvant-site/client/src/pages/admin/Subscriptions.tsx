import { useState } from "react";
import {
  useGetSubscriptions, useMarkSubscriptionPaid, useGetUsers, useCreateSubscription,
  useAdjustSubscriptionLessons, useCancelSubscription
} from "@/lib/admin-api";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, CircleDashed, CreditCard, Plus, MoreHorizontal,
  MinusCircle, PlusCircle, XCircle, CheckCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

const SUB_TYPES = [
  { value: "individual", label: "Индивидуальный" },
  { value: "group", label: "Групповой" },
];
const LESSON_COUNTS = [4, 8, 12, 16, 20];

interface SubForm {
  userId: string;
  type: string;
  totalLessons: string;
  remainingLessons: string;
  isPaid: boolean;
}

const DEFAULT_FORM: SubForm = {
  userId: "", type: "individual", totalLessons: "8", remainingLessons: "8", isPaid: false
};

type ActionType = "deduct" | "add" | "cancel" | null;

export default function Subscriptions() {
  const { data: subscriptions, isLoading } = useGetSubscriptions();
  const { data: users } = useGetUsers();
  const markPaid = useMarkSubscriptionPaid();
  const createSub = useCreateSubscription();
  const adjustLessons = useAdjustSubscriptionLessons();
  const cancelSub = useCancelSubscription();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<SubForm>(DEFAULT_FORM);

  const [actionDialog, setActionDialog] = useState<{ type: ActionType; subId: number | null }>({ type: null, subId: null });
  const [adjustCount, setAdjustCount] = useState("1");
  const [actionReason, setActionReason] = useState("");

  const closeActionDialog = () => {
    setActionDialog({ type: null, subId: null });
    setAdjustCount("1");
    setActionReason("");
  };

  const selectedSub = actionDialog.subId !== null
    ? (subscriptions || []).find((s: any) => s.id === actionDialog.subId)
    : null;

  const handleMarkPaid = (id: number) => {
    markPaid.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
        toast({ title: "Абонемент активирован" });
      },
      onError: () => toast({ title: "Ошибка обновления", variant: "destructive" })
    });
  };

  const handleAdjust = () => {
    if (!actionDialog.subId) return;
    const count = parseInt(adjustCount);
    if (!count || count <= 0) {
      toast({ title: "Введите корректное количество", variant: "destructive" });
      return;
    }
    const delta = actionDialog.type === "deduct" ? -count : count;
    adjustLessons.mutate({ id: actionDialog.subId, delta, reason: actionReason }, {
      onSuccess: () => {
        toast({ title: delta > 0 ? `Добавлено ${count} занятий` : `Списано ${count} занятий` });
        closeActionDialog();
      },
      onError: () => toast({ title: "Ошибка операции", variant: "destructive" })
    });
  };

  const handleCancel = () => {
    if (!actionDialog.subId) return;
    cancelSub.mutate({ id: actionDialog.subId, reason: actionReason }, {
      onSuccess: () => {
        toast({ title: "Абонемент отменён" });
        closeActionDialog();
      },
      onError: () => toast({ title: "Ошибка отмены", variant: "destructive" })
    });
  };

  const handleSubmit = () => {
    if (!form.userId) {
      toast({ title: "Выберите ученика", variant: "destructive" });
      return;
    }
    const total = parseInt(form.totalLessons);
    const remaining = parseInt(form.remainingLessons);
    if (!total || total <= 0) {
      toast({ title: "Введите количество занятий", variant: "destructive" });
      return;
    }
    createSub.mutate({
      data: {
        userId: parseInt(form.userId),
        type: form.type,
        totalLessons: total,
        remainingLessons: isNaN(remaining) ? total : remaining,
        isPaid: form.isPaid,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
        toast({ title: "Абонемент создан" });
        setIsOpen(false);
        setForm(DEFAULT_FORM);
      },
      onError: () => toast({ title: "Ошибка создания абонемента", variant: "destructive" })
    });
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-sm p-8 flex justify-center items-center h-[500px]">
        <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p>Загрузка абонементов...</p>
        </div>
      </Card>
    );
  }

  const sortedSubs = [...(subscriptions || [])].sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setIsOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Добавить абонемент
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Ученик</TableHead>
                <TableHead>Тип абонемента</TableHead>
                <TableHead className="text-center">Остаток занятий</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSubs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Нет абонементов
                  </TableCell>
                </TableRow>
              ) : (
                sortedSubs.map((sub: any) => (
                  <TableRow key={sub.id} className={`hover:bg-muted/30 transition-colors ${sub.status === 'cancelled' ? 'opacity-60' : ''}`}>
                    <TableCell className="font-medium">
                      {sub.user ? (
                        <div className="flex flex-col">
                          <span>{sub.user.firstName} {sub.user.lastName || ''}</span>
                          <span className="text-xs text-muted-foreground">@{sub.user.telegramUsername || 'нет_юзернейма'}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Неизвестный</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary/70" />
                        <span className="font-semibold capitalize">{sub.type === 'individual' ? 'Индивидуальный' : sub.type === 'group' ? 'Групповой' : sub.type}</span>
                        <span className="text-xs text-muted-foreground">({sub.totalLessons} зан.)</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={`text-base px-3 py-1 font-display no-default-active-elevate ${sub.remainingLessons === 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-primary/10 text-primary'}`}
                      >
                        {sub.remainingLessons} / {sub.totalLessons}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub.status === 'cancelled' ? (
                        <div className="flex items-center gap-2 text-red-500 font-medium text-sm">
                          <XCircle className="w-4 h-4" /> Отменён
                        </div>
                      ) : sub.isPaid ? (
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                          <CheckCircle2 className="w-4 h-4" /> Активен
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium text-sm">
                          <CircleDashed className="w-4 h-4" /> Ожидает оплаты
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(sub.createdAt), 'dd.MM.yyyy', { locale: ru })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel>Действия с абонементом</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {!sub.isPaid && sub.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => handleMarkPaid(sub.id)} disabled={markPaid.isPending}>
                              <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                              Отметить оплаченным
                            </DropdownMenuItem>
                          )}
                          {sub.status !== 'cancelled' && (
                            <>
                              <DropdownMenuItem onClick={() => setActionDialog({ type: "deduct", subId: sub.id })} disabled={sub.remainingLessons === 0}>
                                <MinusCircle className="mr-2 h-4 w-4 text-orange-500" />
                                Списать занятие
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setActionDialog({ type: "add", subId: sub.id })}>
                                <PlusCircle className="mr-2 h-4 w-4 text-blue-500" />
                                Добавить занятия
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setActionDialog({ type: "cancel", subId: sub.id })}
                                className="text-red-600 focus:text-red-600"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Отменить абонемент
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Adjust lessons dialog (deduct / add) */}
      <Dialog
        open={actionDialog.type === "deduct" || actionDialog.type === "add"}
        onOpenChange={open => { if (!open) closeActionDialog(); }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "deduct" ? "Списать занятия" : "Добавить занятия"}
            </DialogTitle>
            <DialogDescription>
              {selectedSub && (
                <>
                  Абонемент: {selectedSub.user?.firstName} {selectedSub.user?.lastName || ''} —{" "}
                  остаток {selectedSub.remainingLessons}/{selectedSub.totalLessons} занятий
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm mb-1.5 block">
                Количество занятий {actionDialog.type === "deduct" ? "к списанию" : "для добавления"}
              </Label>
              <Input
                type="number"
                min={1}
                max={actionDialog.type === "deduct" ? selectedSub?.remainingLessons : 100}
                value={adjustCount}
                onChange={e => setAdjustCount(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Причина (необязательно)</Label>
              <Textarea
                placeholder="Например: занятие 15.01, пропуск, корректировка..."
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog}>Отмена</Button>
            <Button
              onClick={handleAdjust}
              disabled={adjustLessons.isPending}
              variant={actionDialog.type === "deduct" ? "destructive" : "default"}
            >
              {adjustLessons.isPending ? "Сохранение..." : actionDialog.type === "deduct" ? "Списать" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel subscription dialog */}
      <AlertDialog
        open={actionDialog.type === "cancel"}
        onOpenChange={open => { if (!open) closeActionDialog(); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить абонемент?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSub && (
                <>
                  Вы собираетесь отменить абонемент{" "}
                  <strong>{selectedSub.user?.firstName} {selectedSub.user?.lastName || ''}</strong>{" "}
                  ({selectedSub.totalLessons} занятий, остаток: {selectedSub.remainingLessons}).
                  <br /><br />
                  Абонемент будет отмечен как отменённый. Это действие нельзя отменить через интерфейс.
                </>
              )}
              <div className="mt-3">
                <Label className="text-sm mb-1.5 block">Причина отмены</Label>
                <Textarea
                  placeholder="Укажите причину..."
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  className="min-h-[70px] resize-none"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelSub.isPending}>Назад</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelSub.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelSub.isPending ? "Отмена..." : "Отменить абонемент"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create subscription dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Добавить абонемент</DialogTitle>
            <DialogDescription>Вручную создайте абонемент для ученика.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm mb-1.5 block">Ученик *</Label>
              <Select value={form.userId} onValueChange={v => setForm(f => ({ ...f, userId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите ученика" />
                </SelectTrigger>
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
              <Label className="text-sm mb-1.5 block">Тип абонемента</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUB_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm mb-1.5 block">Всего занятий</Label>
                <Select value={form.totalLessons} onValueChange={v => setForm(f => ({ ...f, totalLessons: v, remainingLessons: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LESSON_COUNTS.map(n => <SelectItem key={n} value={String(n)}>{n} занятий</SelectItem>)}
                    <SelectItem value="custom">Другое</SelectItem>
                  </SelectContent>
                </Select>
                {form.totalLessons === "custom" && (
                  <Input className="mt-2" type="number" min={1} placeholder="Введите число" onChange={e => setForm(f => ({ ...f, totalLessons: e.target.value, remainingLessons: e.target.value }))} />
                )}
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Остаток занятий</Label>
                <Input type="number" min={0} value={form.remainingLessons} onChange={e => setForm(f => ({ ...f, remainingLessons: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Уже оплачен</Label>
                <p className="text-xs text-muted-foreground">Сразу активировать абонемент</p>
              </div>
              <Switch checked={form.isPaid} onCheckedChange={v => setForm(f => ({ ...f, isPaid: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Отмена</Button>
            <Button onClick={handleSubmit} disabled={createSub.isPending}>
              {createSub.isPending ? "Создание..." : "Создать абонемент"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
