import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import api from "@/lib/api";

interface Account {
  id: number;
  email: string;
  firstName: string | null;
}

export default function Board() {
  const [, params] = useRoute<{ roomId: string }>("/board/:roomId");
  const roomId = params?.roomId || "";
  const [account, setAccount] = useState<Account | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/cabinet/me")
      .then((r) => {
        if (!cancelled) setAccount(r.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingAccount(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Идентификатор доски не указан.
      </div>
    );
  }

  const displayName = encodeURIComponent(
    account?.firstName || account?.email?.split("@")[0] || "Гость",
  );
  const iframeSrc = `/board-app/index.html?room=${encodeURIComponent(roomId)}&name=${displayName}`;

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <Link href="/cabinet">
            <a className="text-sm text-indigo-600 hover:underline">
              ← В личный кабинет
            </a>
          </Link>
          <span className="text-sm text-gray-500">Доска занятия</span>
          <code className="text-xs bg-gray-200 rounded px-1.5 py-0.5 text-gray-700">
            {roomId.slice(0, 8)}…
          </code>
        </div>
        <button
          type="button"
          onClick={() => {
            const url = `${window.location.origin}/board/${roomId}`;
            navigator.clipboard?.writeText(url).catch(() => {});
          }}
          className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Скопировать ссылку
        </button>
      </div>
      <iframe
        title="Доска"
        src={iframeSrc}
        className="flex-1 w-full border-0"
        allow="clipboard-read; clipboard-write"
      />
      {loadingAccount ? null : null}
    </div>
  );
}
