import { useState } from "react";
import { useGetUsers, useCreateUser } from "@/lib/admin-api";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserCircle2, UserPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
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

export default function Students() {
  const { data: users, isLoading } = useGetUsers();
  const createUser = useCreateUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<StudentForm>(DEFAULT_FORM);

  const handleSubmit = () => {
    if (!form.firstName.trim()) {
      toast({ title: "Введите имя ученика", variant: "destructive" });
      return;
    }

    const telegramId = form.telegramId
      ? parseInt(form.telegramId)
      : -(Date.now());

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
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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

  const sortedUsers = [...(users || [])].sort((a, b) =>
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
                sortedUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
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
                          <a href={`tel:${user.phone}`} className="text-primary hover:underline">{user.phone}</a>
                        ) : (
                          <span className="text-muted-foreground">Нет телефона</span>
                        )}
                        {user.telegramUsername && (
                          <a href={`https://t.me/${user.telegramUsername}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
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
