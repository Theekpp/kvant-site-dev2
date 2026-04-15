import { useState } from "react";
import { useGetAdminActions } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, History as HistoryIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

const ACTION_META: Record<string, { label: string; color: string; emoji: string }> = {
  create_booking:           { label: "Создание записи",          color: "bg-blue-100 text-blue-800 border-blue-200",       emoji: "📅" },
  update_booking:           { label: "Изменение записи",          color: "bg-sky-100 text-sky-800 border-sky-200",          emoji: "✏️" },
  create_subscription:      { label: "Создание абонемента",       color: "bg-purple-100 text-purple-800 border-purple-200", emoji: "🎫" },
  mark_subscription_paid:   { label: "Активация абонемента",      color: "bg-emerald-100 text-emerald-800 border-emerald-200", emoji: "✅" },
  deduct_lesson:            { label: "Списание занятия",          color: "bg-orange-100 text-orange-800 border-orange-200", emoji: "➖" },
  deduct_lesson_on_payment: { label: "Списание по оплате",        color: "bg-orange-100 text-orange-800 border-orange-200", emoji: "💳" },
  add_lessons:              { label: "Добавление занятий",        color: "bg-green-100 text-green-800 border-green-200",    emoji: "➕" },
  cancel_subscription:      { label: "Отмена абонемента",         color: "bg-red-100 text-red-800 border-red-200",          emoji: "❌" },
  create_user:              { label: "Добавление ученика",        color: "bg-teal-100 text-teal-800 border-teal-200",       emoji: "👤" },
  notify_user:              { label: "Уведомление ученику",       color: "bg-indigo-100 text-indigo-800 border-indigo-200", emoji: "📨" },
  create_review:            { label: "Добавление отзыва",         color: "bg-yellow-100 text-yellow-800 border-yellow-200", emoji: "⭐" },
  update_review:            { label: "Изменение отзыва",          color: "bg-yellow-100 text-yellow-800 border-yellow-200", emoji: "📝" },
  delete_review:            { label: "Удаление отзыва",           color: "bg-red-100 text-red-800 border-red-200",          emoji: "🗑️" },
  create_schedule_slot:     { label: "Добавление слота",          color: "bg-cyan-100 text-cyan-800 border-cyan-200",       emoji: "🕐" },
  delete_schedule_slot:     { label: "Удаление слота",            color: "bg-red-100 text-red-800 border-red-200",          emoji: "🗑️" },
};

function parseDetails(details: string | null): Record<string, any> | null {
  if (!details) return null;
  try { return JSON.parse(details); } catch { return null; }
}

function formatDetails(action: string, details: Record<string, any> | null): string {
  if (!details) return "";

  if (action === "update_booking") {
    const parts: string[] = [];
    if (details.status) parts.push(`статус: ${details.status}`);
    if (details.isPaid !== undefined) parts.push(details.isPaid ? "оплачено" : "оплата снята");
    if (details.paymentMethod) parts.push(`способ: ${details.paymentMethod}`);
    return parts.join(", ");
  }
  if (action === "deduct_lesson" || action === "add_lessons") {
    const sign = (details.delta || 0) > 0 ? "+" : "";
    return `${sign}${details.delta} зан. (было: ${details.remainingBefore}, стало: ${details.remainingAfter})${details.reason ? ` · ${details.reason}` : ""}`;
  }
  if (action === "deduct_lesson_on_payment") {
    return `запись #${details.bookingId}, было: ${details.remainingBefore} зан.`;
  }
  if (action === "cancel_subscription") {
    return details.reason || "";
  }
  if (action === "create_booking") {
    return `${details.date} ${details.time}${details.userId ? ` · ученик #${details.userId}` : ""}`;
  }
  if (action === "create_subscription") {
    return `${details.totalLessons} занятий, ${details.type}${details.isPaid ? ", оплачен" : ""}`;
  }
  if (action === "create_user") {
    return `${details.firstName || ""} ${details.lastName || ""}`.trim();
  }
  if (action === "notify_user") {
    const msg = details.message || "";
    return msg.length > 60 ? msg.slice(0, 60) + "..." : msg;
  }
  if (action === "create_review") {
    return `${details.name || ""}, оценка ${details.rating || "?"}⭐`;
  }
  if (action === "update_review") {
    return details.isVisible !== undefined ? (details.isVisible ? "показан" : "скрыт") : "";
  }

  const entries = Object.entries(details).filter(([, v]) => v !== null && v !== "" && v !== undefined);
  return entries.map(([k, v]) => `${k}: ${v}`).join(", ").slice(0, 100);
}

const ENTITY_MAP: Record<string, string> = {
  booking: "Запись",
  subscription: "Абонемент",
  user: "Ученик",
  review: "Отзыв",
  schedule: "Расписание",
};

export default function History() {
  const [page, setPage] = useState(1);
  const limit = 50;
  const { data, isLoading } = useGetAdminActions(page, limit);

  const actions = data?.actions || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <HistoryIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">История действий</h2>
          <p className="text-sm text-muted-foreground">Всего записей: {total}</p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center items-center h-[400px]">
            <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p>Загрузка истории...</p>
            </div>
          </div>
        ) : actions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground h-[300px] flex items-center justify-center">
            <div>
              <HistoryIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>История действий пуста</p>
              <p className="text-xs mt-1">Все действия в админке будут записываться здесь</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {actions.map((action: any) => {
              const meta = ACTION_META[action.action] || { label: action.action, color: "bg-gray-100 text-gray-700 border-gray-200", emoji: "🔧" };
              const details = parseDetails(action.details);
              const detailsStr = formatDetails(action.action, details);
              const entityLabel = ENTITY_MAP[action.entity] || action.entity;

              return (
                <div key={action.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="text-xl leading-none">{meta.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-xs font-medium no-default-active-elevate ${meta.color}`}>
                        {meta.label}
                      </Badge>
                      {action.entityId && (
                        <span className="text-xs text-muted-foreground">
                          {entityLabel} #{action.entityId}
                        </span>
                      )}
                    </div>
                    {detailsStr && (
                      <p className="text-sm text-foreground/80 leading-relaxed">{detailsStr}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(action.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                      </span>
                      {action.performedBy && (
                        <span className="text-xs text-muted-foreground">· {action.performedBy}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Страница {page} из {pages}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
