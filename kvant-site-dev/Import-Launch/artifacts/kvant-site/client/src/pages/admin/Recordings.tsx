import { useEffect, useState } from "react";
import api from "@/lib/api";

interface RecordingRow {
  id: number;
  egressId: string | null;
  roomName: string;
  bookingId: number | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
  filename: string | null;
  fileUrl: string | null;
  durationSeconds: number | null;
}

function formatDuration(sec: number | null): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}ч ${m}м ${s}с`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  recording: { label: "Идёт запись", cls: "bg-red-100 text-red-700" },
  completed: { label: "Завершена", cls: "bg-green-100 text-green-700" },
  stopping: { label: "Остановка", cls: "bg-yellow-100 text-yellow-700" },
  failed: { label: "Ошибка", cls: "bg-slate-100 text-slate-600" },
};

export default function Recordings() {
  const [list, setList] = useState<RecordingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    try {
      const { data } = await api.get("/api/admin/recordings");
      setList(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить запись из списка? Файл на сервере останется.")) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/recordings/${id}`);
      setList(prev => prev.filter(r => r.id !== id));
    } catch {}
    setDeletingId(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Записи конференций</h1>
          <p className="text-sm text-slate-500 mt-1">Все сохранённые видеозаписи уроков</p>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition"
        >
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <p className="text-slate-400 font-medium">Записей пока нет</p>
          <p className="text-slate-400 text-sm mt-1">
            Кнопка «Запись» появляется в конференции для преподавателя.
            {!import.meta.env.VITE_LIVEKIT_HOST && (
              <span className="block mt-2 text-amber-600 font-medium">
                Для активации записи настройте переменную LIVEKIT_HOST на сервере.
              </span>
            )}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Комната</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Начало</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Длительность</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Статус</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Файл</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map(rec => {
                const st = STATUS_LABELS[rec.status] || { label: rec.status, cls: "bg-slate-100 text-slate-600" };
                return (
                  <tr key={rec.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-xs bg-slate-100 rounded px-1.5 py-0.5 text-slate-700">{rec.roomName}</code>
                      {rec.bookingId && (
                        <span className="ml-2 text-xs text-slate-400">#{rec.bookingId}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(rec.startedAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDuration(rec.durationSeconds)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                        {rec.status === "recording" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        )}
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {rec.fileUrl ? (
                        <a
                          href={rec.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Скачать
                        </a>
                      ) : rec.filename ? (
                        <span className="text-xs text-slate-400" title={rec.filename}>
                          {rec.filename.length > 30 ? rec.filename.slice(0, 27) + "…" : rec.filename}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(rec.id)}
                        disabled={deletingId === rec.id || rec.status === "recording"}
                        className="text-xs text-slate-400 hover:text-red-500 transition disabled:opacity-30"
                        title={rec.status === "recording" ? "Нельзя удалить во время записи" : "Удалить из списка"}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">Как работает запись</p>
        <ul className="space-y-1 text-amber-700 text-xs list-disc list-inside">
          <li>Запись запускается кнопкой «Запись» в конференции — доступна только преподавателю</li>
          <li>Запись продолжается на сервере независимо от того, подключён ли преподаватель</li>
          <li>Файлы сохраняются на VPS в папке <code className="bg-amber-100 px-1 rounded">/recordings</code></li>
          <li>Для скачивания файлов настройте <code className="bg-amber-100 px-1 rounded">RECORDINGS_BASE_URL</code> в переменных окружения</li>
        </ul>
      </div>
    </div>
  );
}
