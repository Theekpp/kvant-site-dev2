import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { getMe } from "@/lib/auth";

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const [status, setStatus] = useState<"loading" | "authed" | "unauthed">("loading");
  const [, navigate] = useLocation();

  useEffect(() => {
    getMe()
      .then(() => setStatus("authed"))
      .catch(() => {
        setStatus("unauthed");
        navigate("/login");
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthed") return null;

  return <>{children}</>;
}
