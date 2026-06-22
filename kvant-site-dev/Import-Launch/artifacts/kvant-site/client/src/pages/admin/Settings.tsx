import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Video, ExternalLink, Trash2, Save } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [conferenceUrl, setConferenceUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/api/admin/settings").then(r => {
      const url = r.data?.conference_override_url ?? null;
      setSavedUrl(url);
      setConferenceUrl(url ?? "");
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.put("/api/admin/settings", {
        key: "conference_override_url",
        value: conferenceUrl.trim() || null,
      });
      const newVal = conferenceUrl.trim() || null;
      setSavedUrl(newVal);
      toast({ title: newVal ? "Ссылка сохранена" : "Ссылка очищена" });
    } catch {
      toast({ title: "Ошибка сохранения", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setConferenceUrl("");
    setSaving(true);
    try {
      await api.put("/api/admin/settings", {
        key: "conference_override_url",
        value: null,
      });
      setSavedUrl(null);
      toast({ title: "Ссылка очищена — используется встроенная конференция" });
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Загрузка...</div>
  );

  const isActive = !!savedUrl;

  return (
    <div className="max-w-2xl space-y-8">

      {/* Conference override */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Video className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-base">Резервная конференция</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Если встроенная конференция недоступна — укажите внешнюю ссылку (Zoom, Google Meet и т.д.).
              Бот будет присылать её вместо внутренней ссылки.
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg w-fit ${
          isActive
            ? "bg-amber-50 text-amber-700 border border-amber-200"
            : "bg-green-50 text-green-700 border border-green-200"
        }`}>
          <span className={`w-2 h-2 rounded-full ${isActive ? "bg-amber-500" : "bg-green-500"}`} />
          {isActive ? "Активна внешняя ссылка — встроенная конференция отключена" : "Активна встроенная конференция"}
        </div>

        {isActive && savedUrl && (
          <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <ExternalLink className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <a
              href={savedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 hover:underline truncate"
            >
              {savedUrl}
            </a>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Ссылка на внешнюю конференцию
          </label>
          <input
            type="url"
            value={conferenceUrl}
            onChange={e => setConferenceUrl(e.target.value)}
            placeholder="https://zoom.us/j/... или https://meet.google.com/..."
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground transition"
          />
          <p className="text-xs text-muted-foreground">
            Оставьте поле пустым и нажмите «Сохранить», чтобы вернуться к встроенной конференции.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-60 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          {isActive && (
            <button
              onClick={clear}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 disabled:opacity-60 transition"
            >
              <Trash2 className="w-4 h-4" />
              Очистить
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
