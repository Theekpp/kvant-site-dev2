import { useEffect, useState } from "react";
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

export default function VideoRoom() {
  const [, params] = useRoute<{ roomName: string }>("/video/:roomName");
  const roomName = params?.roomName || "";

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [token, setToken] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

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
        const isAdmin = me.account?.role === "admin";

        const bookingIdMatch = roomName.match(/^booking-(\d+)$/);

        let tokenData: { token: string };
        if (isAdmin) {
          const r = await api.post("/api/admin/video-token", { roomName });
          tokenData = r.data;
        } else {
          if (!bookingIdMatch) {
            setErrorMsg("Неверная ссылка на конференцию");
            setPhase("error");
            return;
          }
          const r = await api.post("/api/cabinet/video-token", {
            bookingId: Number(bookingIdMatch[1]),
          });
          tokenData = r.data;
        }

        if (cancelled) return;
        setToken(tokenData.token);
        setPhase("ready");
      } catch (e: any) {
        if (cancelled) return;
        setErrorMsg(e?.response?.data?.message || "Не удалось получить доступ к конференции");
        setPhase("error");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [roomName]);

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
        <span className="text-xs text-slate-400">{displayName}</span>
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
