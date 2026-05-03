import { useState } from "react";
import {
  useGetUsers, useCreateUser, useGetUserDetails, useGetStudentProfile, useUpdateStudentProfile,
  useGetStudentHomework, useCreateHomework, useUpdateHomework, useDeleteHomework,
  useGetStudentJournal, useCreateJournalEntry, useDeleteJournalEntry,
  useGetStudentMaterials, useCreateMaterial, useDeleteMaterial,
  useGetStudentRoadmap, useCreateRoadmapTopic, useUpdateRoadmapTopic, useDeleteRoadmapTopic,
} from "@/lib/admin-api";
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
import { UserCircle2, UserPlus, Phone, ExternalLink, CalendarCheck, CreditCard, Banknote, Clock, Monitor, Plus, Trash2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
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
        {user.boardRoomId && (
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <a
              href={`/board/${user.boardRoomId}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Открыть доску ученика
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
          <TabsTrigger value="file" className="flex-1 gap-1.5">
            📚 Личное дело
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

        <TabsContent value="file" className="mt-3">
          <StudentFileTab userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StudentFileTab({ userId }: { userId: number }) {
  const { data: profile, isLoading: profileLoading } = useGetStudentProfile(userId);
  const updateProfile = useUpdateStudentProfile(userId);
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ roadmap: "", tutorNotes: "", homework: "", materials: "", lessonNotes: "" });

  // ── Homework state ─────────────────────────────────────────────────────────
  const { data: hwList = [], isLoading: hwLoading } = useGetStudentHomework(userId);
  const createHw = useCreateHomework(userId);
  const updateHw = useUpdateHomework(userId);
  const deleteHw = useDeleteHomework(userId);
  const [hwForm, setHwForm] = useState({ title: "", description: "", dueDate: "" });
  const [hwOpen, setHwOpen] = useState(false);
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("accepted");

  // ── Journal state ──────────────────────────────────────────────────────────
  const { data: journalList = [], isLoading: journalLoading } = useGetStudentJournal(userId);
  const createJournal = useCreateJournalEntry(userId);
  const deleteJournal = useDeleteJournalEntry(userId);
  const [journalForm, setJournalForm] = useState({ date: "", topic: "", coveredSummary: "", nextSteps: "", parentNote: "" });
  const [journalOpen, setJournalOpen] = useState(false);

  // ── Materials state ────────────────────────────────────────────────────────
  const { data: matList = [], isLoading: matLoading } = useGetStudentMaterials(userId);
  const createMat = useCreateMaterial(userId);
  const deleteMat = useDeleteMaterial(userId);
  const [matForm, setMatForm] = useState({ title: "", url: "", type: "theory", topicTag: "" });
  const [matOpen, setMatOpen] = useState(false);

  // ── Roadmap state ──────────────────────────────────────────────────────────
  const { data: roadmapList = [], isLoading: roadmapLoading } = useGetStudentRoadmap(userId);
  const createRoadmap = useCreateRoadmapTopic(userId);
  const updateRoadmap = useUpdateRoadmapTopic(userId);
  const deleteRoadmap = useDeleteRoadmapTopic(userId);
  const [roadmapForm, setRoadmapForm] = useState({ section: "Общее", title: "", status: "planned" });
  const [roadmapOpen, setRoadmapOpen] = useState(false);

  const handleEditNotes = () => {
    setForm({
      roadmap: profile?.roadmap || "", tutorNotes: profile?.tutorNotes || "",
      homework: profile?.homework || "", materials: profile?.materials || "", lessonNotes: profile?.lessonNotes || "",
    });
    setEditing(true);
  };

  const handleSaveNotes = async () => {
    try {
      await updateProfile.mutateAsync(form);
      setEditing(false);
      toast({ title: "Заметки сохранены" });
    } catch {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    }
  };

  const hwStatusColor: Record<string, string> = {
    assigned: "bg-amber-50 text-amber-700", submitted: "bg-blue-50 text-blue-700",
    accepted: "bg-emerald-50 text-emerald-700", returned: "bg-red-50 text-red-700",
  };
  const hwStatusLabel: Record<string, string> = { assigned: "Задано", submitted: "Сдано", accepted: "Зачтено", returned: "На доработку" };
  const matTypeLabel: Record<string, string> = { theory: "Теория", practice: "Практика", cheatsheet: "Шпаргалка", reference: "Справочник", video: "Видео" };
  const roadStatusLabel: Record<string, string> = { planned: "Запл.", covered: "Пройдено", mastered: "Освоено" };
  const roadStatusColor: Record<string, string> = {
    planned: "bg-slate-100 text-slate-500", covered: "bg-blue-100 text-blue-700", mastered: "bg-emerald-100 text-emerald-700",
  };

  if (profileLoading) return <div className="py-6 text-center text-sm text-muted-foreground">Загрузка...</div>;

  return (
    <Tabs defaultValue="notes" className="w-full">
      <TabsList className="w-full grid grid-cols-5 h-auto">
        <TabsTrigger value="notes" className="text-xs px-1 py-1.5">Заметки</TabsTrigger>
        <TabsTrigger value="hw" className="text-xs px-1 py-1.5 relative">
          ДЗ
          {(hwList as any[]).filter((h: any) => h.status === "submitted").length > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
              {(hwList as any[]).filter((h: any) => h.status === "submitted").length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="journal" className="text-xs px-1 py-1.5">Журнал</TabsTrigger>
        <TabsTrigger value="mats" className="text-xs px-1 py-1.5">Матер.</TabsTrigger>
        <TabsTrigger value="roadmap" className="text-xs px-1 py-1.5">План</TabsTrigger>
      </TabsList>

      {/* ── Заметки Tab ── */}
      <TabsContent value="notes" className="mt-3">
        {editing ? (
          <div className="space-y-3">
            {[
              { key: "roadmap", label: "🗺️ Учебный план" },
              { key: "tutorNotes", label: "🔒 Заметки (не видны ученику)" },
              { key: "homework", label: "📝 ДЗ (текст)" },
              { key: "materials", label: "📖 Материалы (текст)" },
              { key: "lessonNotes", label: "🗒️ Заметки по занятиям" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
                <textarea rows={2} className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                  value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveNotes} disabled={updateProfile.isPending}>{updateProfile.isPending ? "Сохр..." : "Сохранить"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Отмена</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { label: "🗺️ Учебный план", value: profile?.roadmap },
              { label: "🔒 Заметки (преп.)", value: profile?.tutorNotes },
              { label: "📝 ДЗ", value: profile?.homework },
              { label: "📖 Материалы", value: profile?.materials },
              { label: "🗒️ Занятия", value: profile?.lessonNotes },
            ].filter(f => f.value).map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-muted/30 px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
                <p className="text-sm whitespace-pre-wrap">{value}</p>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={handleEditNotes} className="w-full">
              {!(profile?.roadmap || profile?.tutorNotes || profile?.homework || profile?.materials || profile?.lessonNotes) ? "Заполнить" : "Редактировать"}
            </Button>
          </div>
        )}
      </TabsContent>

      {/* ── ДЗ Tab ── */}
      <TabsContent value="hw" className="mt-3 space-y-3">
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setHwOpen(!hwOpen)}>
          {hwOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {hwOpen ? "Скрыть форму" : "Новое задание"}
        </Button>
        {hwOpen && (
          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
            <Input placeholder="Название задания *" value={hwForm.title} onChange={e => setHwForm(f => ({ ...f, title: e.target.value }))} className="text-sm" />
            <textarea rows={2} placeholder="Описание, что нужно сделать..." value={hwForm.description}
              onChange={e => setHwForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background" />
            <Input placeholder="Срок сдачи (ДД.ММ.ГГГГ)" value={hwForm.dueDate} onChange={e => setHwForm(f => ({ ...f, dueDate: e.target.value }))} className="text-sm" />
            <Button size="sm" className="w-full" disabled={createHw.isPending} onClick={async () => {
              if (!hwForm.title.trim()) { toast({ title: "Введите название", variant: "destructive" }); return; }
              try {
                await createHw.mutateAsync({ title: hwForm.title, description: hwForm.description || null, dueDate: hwForm.dueDate || null });
                setHwForm({ title: "", description: "", dueDate: "" });
                setHwOpen(false);
                toast({ title: "Задание создано" });
              } catch { toast({ title: "Ошибка", variant: "destructive" }); }
            }}>
              {createHw.isPending ? "Создание..." : "Создать"}
            </Button>
          </div>
        )}
        {hwLoading ? <div className="text-center text-sm text-muted-foreground py-4">Загрузка...</div> : (hwList as any[]).length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">Заданий нет</div>
        ) : (hwList as any[]).map((hw: any) => (
          <div key={hw.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{hw.title}</p>
                {hw.dueDate && <p className="text-xs text-muted-foreground">До: {hw.dueDate}</p>}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hwStatusColor[hw.status] || "bg-muted text-muted-foreground"}`}>
                  {hwStatusLabel[hw.status] || hw.status}
                </span>
                <button onClick={() => deleteHw.mutate({ id: hw.id })} className="text-muted-foreground hover:text-red-500 transition" title="Удалить">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {hw.description && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{hw.description}</p>}
            {hw.submission && (
              <div className="bg-blue-50 rounded-md px-2.5 py-2">
                <p className="text-xs font-semibold text-blue-700 mb-1">Ответ ученика</p>
                {hw.submission.text && <p className="text-xs text-blue-800 whitespace-pre-wrap">{hw.submission.text}</p>}
                {hw.submission.linkUrl && (
                  <a href={hw.submission.linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all">
                    🔗 {hw.submission.linkUrl}
                  </a>
                )}
              </div>
            )}
            {hw.adminFeedback && (
              <div className="bg-muted/40 rounded-md px-2.5 py-2">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{hw.adminFeedback}</p>
              </div>
            )}
            {hw.status === "submitted" && (
              gradingId === hw.id ? (
                <div className="space-y-2">
                  <Select value={feedbackStatus} onValueChange={setFeedbackStatus}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accepted">Зачесть</SelectItem>
                      <SelectItem value="returned">Вернуть на доработку</SelectItem>
                    </SelectContent>
                  </Select>
                  <textarea rows={2} placeholder="Комментарий (необязательно)" value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    className="w-full rounded-md border border-border px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 bg-background" />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-7 text-xs" disabled={updateHw.isPending} onClick={async () => {
                      try {
                        await updateHw.mutateAsync({ id: hw.id, data: { status: feedbackStatus, adminFeedback: feedbackText || null } });
                        setGradingId(null); setFeedbackText("");
                        toast({ title: feedbackStatus === "accepted" ? "Задание зачтено" : "Возвращено на доработку" });
                      } catch { toast({ title: "Ошибка", variant: "destructive" }); }
                    }}>{updateHw.isPending ? "..." : "Сохранить оценку"}</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setGradingId(null)}>Отмена</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => { setGradingId(hw.id); setFeedbackText(hw.adminFeedback || ""); setFeedbackStatus("accepted"); }}>
                  <Check className="h-3 w-3 mr-1" /> Оценить работу
                </Button>
              )
            )}
            {hw.status !== "submitted" && hw.status !== "accepted" && hw.status !== "returned" && (
              <Button size="sm" variant="ghost" className="w-full h-7 text-xs text-muted-foreground" onClick={() => updateHw.mutate({ id: hw.id, data: { status: "returned", adminFeedback: null } })}>
                Изменить статус
              </Button>
            )}
          </div>
        ))}
      </TabsContent>

      {/* ── Журнал Tab ── */}
      <TabsContent value="journal" className="mt-3 space-y-3">
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setJournalOpen(!journalOpen)}>
          {journalOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {journalOpen ? "Скрыть форму" : "Добавить занятие"}
        </Button>
        {journalOpen && (
          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
            <Input placeholder="Дата (ДД.ММ.ГГГГ) *" value={journalForm.date} onChange={e => setJournalForm(f => ({ ...f, date: e.target.value }))} className="text-sm" />
            <Input placeholder="Тема занятия *" value={journalForm.topic} onChange={e => setJournalForm(f => ({ ...f, topic: e.target.value }))} className="text-sm" />
            <textarea rows={2} placeholder="Что разобрали..." value={journalForm.coveredSummary}
              onChange={e => setJournalForm(f => ({ ...f, coveredSummary: e.target.value }))}
              className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background" />
            <textarea rows={2} placeholder="Следующие шаги..." value={journalForm.nextSteps}
              onChange={e => setJournalForm(f => ({ ...f, nextSteps: e.target.value }))}
              className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background" />
            <textarea rows={2} placeholder="Заметка для родителей (не видна ученику)..." value={journalForm.parentNote}
              onChange={e => setJournalForm(f => ({ ...f, parentNote: e.target.value }))}
              className="w-full rounded-md border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background" />
            <Button size="sm" className="w-full" disabled={createJournal.isPending} onClick={async () => {
              if (!journalForm.date.trim() || !journalForm.topic.trim()) { toast({ title: "Дата и тема обязательны", variant: "destructive" }); return; }
              try {
                await createJournal.mutateAsync({ date: journalForm.date, topic: journalForm.topic, coveredSummary: journalForm.coveredSummary || null, nextSteps: journalForm.nextSteps || null, parentNote: journalForm.parentNote || null });
                setJournalForm({ date: "", topic: "", coveredSummary: "", nextSteps: "", parentNote: "" });
                setJournalOpen(false);
                toast({ title: "Запись добавлена" });
              } catch { toast({ title: "Ошибка", variant: "destructive" }); }
            }}>
              {createJournal.isPending ? "Добавление..." : "Добавить"}
            </Button>
          </div>
        )}
        {journalLoading ? <div className="text-center text-sm text-muted-foreground py-4">Загрузка...</div> : (journalList as any[]).length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">Записей нет</div>
        ) : (journalList as any[]).map((entry: any) => (
          <div key={entry.id} className="rounded-lg border border-border p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{entry.topic}</p>
                <p className="text-xs text-muted-foreground">{entry.date}</p>
              </div>
              <button onClick={() => deleteJournal.mutate({ id: entry.id })} className="text-muted-foreground hover:text-red-500 transition flex-shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {entry.coveredSummary && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{entry.coveredSummary}</p>}
            {entry.nextSteps && (
              <div className="bg-primary/5 rounded px-2 py-1">
                <p className="text-xs font-medium text-primary">→ {entry.nextSteps}</p>
              </div>
            )}
            {entry.parentNote && (
              <div className="bg-amber-50 rounded px-2 py-1">
                <p className="text-xs text-amber-700">👨‍👩‍👦 {entry.parentNote}</p>
              </div>
            )}
          </div>
        ))}
      </TabsContent>

      {/* ── Материалы Tab ── */}
      <TabsContent value="mats" className="mt-3 space-y-3">
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setMatOpen(!matOpen)}>
          {matOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {matOpen ? "Скрыть форму" : "Добавить материал"}
        </Button>
        {matOpen && (
          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
            <Input placeholder="Название *" value={matForm.title} onChange={e => setMatForm(f => ({ ...f, title: e.target.value }))} className="text-sm" />
            <Input placeholder="Ссылка (https://...) *" value={matForm.url} onChange={e => setMatForm(f => ({ ...f, url: e.target.value }))} className="text-sm" />
            <Select value={matForm.type} onValueChange={v => setMatForm(f => ({ ...f, type: v }))}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(matTypeLabel).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Тег темы (необязательно)" value={matForm.topicTag} onChange={e => setMatForm(f => ({ ...f, topicTag: e.target.value }))} className="text-sm" />
            <Button size="sm" className="w-full" disabled={createMat.isPending} onClick={async () => {
              if (!matForm.title.trim() || !matForm.url.trim()) { toast({ title: "Название и ссылка обязательны", variant: "destructive" }); return; }
              try {
                await createMat.mutateAsync({ title: matForm.title, url: matForm.url, type: matForm.type, topicTag: matForm.topicTag || null });
                setMatForm({ title: "", url: "", type: "theory", topicTag: "" });
                setMatOpen(false);
                toast({ title: "Материал добавлен" });
              } catch { toast({ title: "Ошибка", variant: "destructive" }); }
            }}>
              {createMat.isPending ? "Добавление..." : "Добавить"}
            </Button>
          </div>
        )}
        {matLoading ? <div className="text-center text-sm text-muted-foreground py-4">Загрузка...</div> : (matList as any[]).length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">Материалов нет</div>
        ) : (matList as any[]).map((mat: any) => (
          <div key={mat.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium truncate">{mat.title}</span>
                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{matTypeLabel[mat.type] || mat.type}</span>
              </div>
              {mat.topicTag && <span className="text-xs text-muted-foreground"># {mat.topicTag}</span>}
              <a href={mat.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">{mat.url}</a>
            </div>
            <button onClick={() => deleteMat.mutate({ id: mat.id })} className="text-muted-foreground hover:text-red-500 transition flex-shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </TabsContent>

      {/* ── Учебный план Tab ── */}
      <TabsContent value="roadmap" className="mt-3 space-y-3">
        <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setRoadmapOpen(!roadmapOpen)}>
          {roadmapOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {roadmapOpen ? "Скрыть форму" : "Добавить тему"}
        </Button>
        {roadmapOpen && (
          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
            <Input placeholder="Раздел (напр. Механика)" value={roadmapForm.section} onChange={e => setRoadmapForm(f => ({ ...f, section: e.target.value }))} className="text-sm" />
            <Input placeholder="Тема *" value={roadmapForm.title} onChange={e => setRoadmapForm(f => ({ ...f, title: e.target.value }))} className="text-sm" />
            <Select value={roadmapForm.status} onValueChange={v => setRoadmapForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Запланировано</SelectItem>
                <SelectItem value="covered">Пройдено</SelectItem>
                <SelectItem value="mastered">Освоено</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="w-full" disabled={createRoadmap.isPending} onClick={async () => {
              if (!roadmapForm.title.trim()) { toast({ title: "Введите тему", variant: "destructive" }); return; }
              try {
                await createRoadmap.mutateAsync({ section: roadmapForm.section || "Общее", title: roadmapForm.title, status: roadmapForm.status });
                setRoadmapForm({ section: "Общее", title: "", status: "planned" });
                setRoadmapOpen(false);
                toast({ title: "Тема добавлена" });
              } catch { toast({ title: "Ошибка", variant: "destructive" }); }
            }}>
              {createRoadmap.isPending ? "Добавление..." : "Добавить"}
            </Button>
          </div>
        )}
        {roadmapLoading ? <div className="text-center text-sm text-muted-foreground py-4">Загрузка...</div> : (roadmapList as any[]).length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">Тем нет</div>
        ) : (roadmapList as any[]).map((topic: any) => (
          <div key={topic.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <Select value={topic.status} onValueChange={v => updateRoadmap.mutate({ id: topic.id, data: { status: v } })}>
              <SelectTrigger className="h-6 w-24 text-xs border-0 bg-transparent p-0 focus:ring-0">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roadStatusColor[topic.status] || "bg-muted"}`}>
                  {roadStatusLabel[topic.status] || topic.status}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Запланировано</SelectItem>
                <SelectItem value="covered">Пройдено</SelectItem>
                <SelectItem value="mastered">Освоено</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{topic.title}</p>
              {topic.section !== "Общее" && <p className="text-xs text-muted-foreground">{topic.section}</p>}
            </div>
            <button onClick={() => deleteRoadmap.mutate({ id: topic.id })} className="text-muted-foreground hover:text-red-500 transition flex-shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </TabsContent>
    </Tabs>
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-muted-foreground">{format(parseISO(user.createdAt), 'dd MMM yyyy', { locale: ru })}</span>
                        {user.boardRoomId && (
                          <a
                            href={`/board/${user.boardRoomId}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors whitespace-nowrap no-default-active-elevate"
                            title="Открыть доску ученика"
                          >
                            <Monitor className="h-3 w-3" />
                            Доска
                          </a>
                        )}
                      </div>
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
