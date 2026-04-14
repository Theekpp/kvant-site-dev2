import { useState } from "react";
import { useGetSubscriptions, useMarkSubscriptionPaid, useGetUsers, useCreateSubscription } from "@/lib/admin-api";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, CircleDashed, CreditCard, Plus } from "lucide-react";
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

export default function Subscriptions() {
  const { data: subscriptions, isLoading } = useGetSubscriptions();
  const { data: users } = useGetUsers();
  const markPaid = useMarkSubscriptionPaid();
  const createSub = useCreateSubscription();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<SubForm>(DEFAULT_FORM);

  const handleMarkPaid = (id: number) => {
    markPaid.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
        toast({ title: "Абонемент отмечен как оплаченный" });
      },
      onError: () => toast({ title: "Ошибка обновления", variant: "destructive" })
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
        queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
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

  const sortedSubs = [...(subscriptions || [])].sort((a, b) =>
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
                <TableHead>Статус оплаты</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSubs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Нет проданных абонементов
                  </TableCell>
                </TableRow>
              ) : (
                sortedSubs.map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-muted/30 transition-colors">
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
                      {sub.isPaid ? (
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                          <CheckCircle2 className="w-4 h-4" /> Оплачен
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
                      {!sub.isPaid && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkPaid(sub.id)}
                          disabled={markPaid.isPending}
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 bg-emerald-50/50"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Отметить оплату
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

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
                  {(users || []).map(u => (
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
