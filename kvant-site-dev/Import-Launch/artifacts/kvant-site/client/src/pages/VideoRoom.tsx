import { useEffect, useRef, useState } from "react";
import { useRoute, Link } from "wouter";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import api from "@/lib/api";

interface AccountInfo {
  id: number;
  role: string;
  firstName: string | null;
}

type Phase = "loading" | "ready" | "connected" | "error";
type RecState = "idle" | "starting" | "recording" | "stopping";

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function VideoRoom() {
  const [, params] = useRoute<{ roomName: string }>("/video/:roomName");
  const roomName = params?.roomName || "";

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [token, setToken] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [recState, setRecState] = useState<RecState>("idle");
  const [egressId, setEgressId] = useState<string>("");
  const [recSeconds, setRecSeconds] = useState(0);
  const [recError, setRecError] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = account?.role === "admin";

  const serverUrl = (() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/lk-ws`;
  })();

  useEffect(() => {
    if (!roomName) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { data: me } = await api.get("/api/auth/me");
        if (cancelled) return;
        setAccount(me.account);
        const admin = me.account?.role === "admin";
        const bookingIdMatch = roomName.match(/^booking-(\d+)$/);
        let tokenData: { token: string };
        if (admin) {
          const r = await api.post("/api/admin/video-token", { roomName });
          tokenData = r.data;
        } else {
          if (!bookingIdMatch) {
            setErrorMsg("Неверная ссылка на конференцию");
            setPhase("error");
            return;
          }
          const r = await api.post("/api/cabinet/video-token", { bookingId: Number(bookingIdMatch[1]) });
          tokenData = r.data;
        }
        if (cancelled) return;
        setToken(tokenData.token);
        setPhase("ready");

        if (admin) {
          try {
            const { data } = await api.get(`/api/admin/recording/active/${roomName}`);
            if (data?.active) {
              setEgressId(data.active.egressId);
              setRecState("recording");
            }
          } catch {}
        }
      } catch (e: any) {
        if (cancelled) return;
        setErrorMsg(e?.response?.data?.message || "Не удалось получить доступ к конференции");
        setPhase("error");
      }
    };
    load();
    return () => { cancelled = true; };
  }, [roomName]);

  useEffect(() => {
    if (recState === "recording") {
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recState === "idle") setRecSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recState]);

  const startRecording = async () => {
    setRecState("starting");
    setRecError("");
    try {
      const bookingIdMatch = roomName.match(/^booking-(\d+)$/);
      const { data } = await api.post("/api/admin/recording/start", {
        roomName,
        bookingId: bookingIdMatch ? Number(bookingIdMatch[1]) : undefined,
      });
      setEgressId(data.egressId);
      setRecState("recording");
    } catch (e: any) {
      setRecError(e?.response?.data?.message || "Не удалось запустить запись");
      setRecState("idle");
    }
  };

  const stopRecording = async () => {
    if (!egressId) return;
    setRecState("stopping");
    setRecError("");
    try {
      await api.post("/api/admin/recording/stop", { egressId });
      setRecState("idle");
      setEgressId("");
    } catch (e: any) {
      setRecError(e?.response?.data?.message || "Ошибка при остановке записи");
      setRecState("recording");
    }
  };

  if (!roomName) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Идентификатор конференции не указан.
      </div>
    );
  }

  const displayName = account?.firstName || "Участник";
  const shortRoom = roomName.length > 16 ? roomName.slice(0, 16) + "…" : roomName;

  if (phase === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-semibold text-slate-800">{errorMsg}</h1>
        <p className="text-sm text-slate-500">
          Убедитесь, что вы вошли в аккаунт и у вас есть запись на это занятие.
        </p>
        <Link href="/cabinet">
          <a className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
            В личный кабинет
          </a>
        </Link>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/cabinet">
            <a className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              ← В кабинет
            </a>
          </Link>
          <span className="text-sm text-slate-300">Видеоконференция</span>
          <code className="text-xs bg-slate-700 rounded px-1.5 py-0.5 text-slate-400">
            {shortRoom}
          </code>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex items-center gap-2">
              {recError && (
                <span className="text-xs text-red-400 max-w-[200px] truncate">{recError}</span>
              )}
              {recState === "recording" && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-mono text-red-400">{formatDuration(recSeconds)}</span>
                </div>
              )}
              {recState === "idle" && (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-white" />
                  Запись
                </button>
              )}
              {recState === "starting" && (
                <button disabled className="flex items-center gap-1.5 px-3 py-1.5 bg-red-800 text-red-300 text-xs font-semibold rounded-lg opacity-70">
                  <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                  Запуск...
                </button>
              )}
              {recState === "recording" && (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <span className="w-2 h-2 rounded bg-white" />
                  Стоп
                </button>
              )}
              {recState === "stopping" && (
                <button disabled className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-400 text-xs font-semibold rounded-lg opacity-70">
                  <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Остановка...
                </button>
              )}
            </div>
          )}
          <span className="text-xs text-slate-400">{displayName}</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          video={true}
          audio={true}
          data-lk-theme="default"
          style={{ height: "100%" }}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}
