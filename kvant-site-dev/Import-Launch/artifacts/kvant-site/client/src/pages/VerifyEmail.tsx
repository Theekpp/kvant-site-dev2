import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function VerifyEmail() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Токен не найден в ссылке");
      return;
    }

    api.get(`/api/auth/verify-email?token=${token}`)
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message || "Email успешно подтверждён");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.message || "Ссылка недействительна или истекла");
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10">
          {status === "loading" && (
            <>
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Подтверждаем email...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Email подтверждён!</h2>
              <p className="text-slate-500 text-sm mb-6">{message}</p>
              <a
                href="/login"
                className="inline-block bg-gradient-to-r from-[#4F46E5] to-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-95 transition"
              >
                Войти в кабинет
              </a>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Ошибка подтверждения</h2>
              <p className="text-slate-500 text-sm mb-6">{message}</p>
              <a href="/register" className="text-indigo-600 hover:underline text-sm font-medium">
                Зарегистрироваться заново
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
