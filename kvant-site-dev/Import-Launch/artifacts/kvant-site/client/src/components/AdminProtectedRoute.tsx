import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { getMe } from "@/lib/auth";

interface Props {
  children: ReactNode;
}

export default function AdminProtectedRoute({ children }: Props) {
  const [status, setStatus] = useState<"loading" | "authed" | "unauthed" | "forbidden">("loading");
  const [, navigate] = useLocation();

  useEffect(() => {
    getMe()
      .then((data) => {
        const role = data?.account?.role;
        if (role === "admin") {
          setStatus("authed");
        } else {
          setStatus("forbidden");
        }
      })
      .catch(() => {
        setStatus("unauthed");
        navigate("/login");
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthed") return null;

  if (status === "forbidden") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Нет доступа</h1>
          <p className="text-muted-foreground text-sm mb-4">Эта страница доступна только администраторам.</p>
          <a href="/" className="text-primary text-sm font-semibold hover:opacity-80 transition">
            ← Вернуться на главную
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
