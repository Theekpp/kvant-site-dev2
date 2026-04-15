import { useState } from "react";
import { useGetAdminReviews, useCreateReview, useUpdateReview, useDeleteReview } from "@/lib/admin-api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, Plus, Trash2, Eye, EyeOff } from "lucide-react";

interface ReviewForm {
  name: string;
  date: string;
  subject: string;
  rating: string;
  text: string;
}

const DEFAULT_FORM: ReviewForm = {
  name: "",
  date: "",
  subject: "Физика",
  rating: "5",
  text: "",
};

export default function Reviews() {
  const { data: reviews = [], isLoading } = useGetAdminReviews();
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<ReviewForm>(DEFAULT_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleSubmit = () => {
    if (!form.name.trim() || !form.text.trim() || !form.date.trim()) {
      toast({ title: "Заполните имя, дату и текст отзыва", variant: "destructive" });
      return;
    }
    createReview.mutate(
      {
        data: {
          name: form.name.trim(),
          date: form.date.trim(),
          subject: form.subject.trim() || "Физика",
          rating: parseInt(form.rating) || 5,
          text: form.text.trim(),
          isVisible: true,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Отзыв добавлен" });
          setIsOpen(false);
          setForm(DEFAULT_FORM);
        },
        onError: () => {
          toast({ title: "Ошибка при добавлении", variant: "destructive" });
        },
      }
    );
  };

  const toggleVisibility = (review: any) => {
    updateReview.mutate(
      { id: review.id, data: { isVisible: !review.isVisible } },
      {
        onSuccess: () => toast({ title: review.isVisible ? "Отзыв скрыт" : "Отзыв показан" }),
      }
    );
  };

  const confirmDelete = (id: number) => setDeleteId(id);

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteReview.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast({ title: "Отзыв удалён" });
          setDeleteId(null);
        },
      }
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Отзывы</h1>
          <p className="text-muted-foreground text-sm mt-1">Управление отзывами на главной странице</p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Добавить отзыв
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Нет отзывов</div>
        ) : (
          <div className="divide-y">
            {reviews.map((review: any) => (
              <div key={review.id} className="flex items-start gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{review.name}</span>
                    <span className="text-xs text-muted-foreground">{review.date}</span>
                    <Badge variant="outline" className="text-xs">{review.subject}</Badge>
                    {!review.isVisible && (
                      <Badge variant="secondary" className="text-xs">Скрыт</Badge>
                    )}
                  </div>
                  <div className="flex gap-0.5 mb-2">
                    {[...Array(review.rating)].map((_: any, i: number) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">{review.text}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleVisibility(review)}
                    title={review.isVisible ? "Скрыть" : "Показать"}
                  >
                    {review.isVisible ? (
                      <Eye className="h-4 w-4 text-slate-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => confirmDelete(review.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить отзыв</DialogTitle>
            <DialogDescription>Новый отзыв появится на главной странице</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Имя</Label>
                <Input
                  placeholder="Например: Наталия"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Дата</Label>
                <Input
                  placeholder="18 января 2026"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Предмет</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Оценка (1–5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={form.rating}
                  onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Текст отзыва</Label>
              <Textarea
                rows={4}
                placeholder="Текст отзыва..."
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Отмена</Button>
            <Button onClick={handleSubmit} disabled={createReview.isPending}>
              {createReview.isPending ? "Сохранение..." : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить отзыв?</DialogTitle>
            <DialogDescription>Это действие нельзя отменить.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteReview.isPending}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
