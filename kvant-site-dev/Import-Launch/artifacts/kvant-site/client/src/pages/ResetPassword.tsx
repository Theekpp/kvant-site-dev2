import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const schema = z.object({
  newPassword: z.string().min(8, "Минимум 8 символов"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      setServerError("Токен не найден");
      return;
    }
    setServerError("");
    setIsLoading(true);
    try {
      await api.post("/api/auth/reset-password", {
        token,
        newPassword: data.newPassword,
      });
      navigate("/login");
    } catch (err: any) {
      setServerError(err.response?.data?.message || "Ошибка. Попробуйте запросить новую ссылку.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-sm w-full">
          <p className="text-red-500 font-medium">Недействительная ссылка</p>
          <a href="/forgot-password" className="mt-4 inline-block text-indigo-600 hover:underline text-sm">
            Запросить новую ссылку
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Новый пароль</h1>
          <p className="text-slate-500 mt-2">Введите новый пароль для вашего аккаунта</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Новый пароль</label>
              <input
                {...register("newPassword")}
                type="password"
                placeholder="Минимум 8 символов"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Подтверждение пароля</label>
              <input
                {...register("confirmPassword")}
                type="password"
                placeholder="Повторите пароль"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            {serverError && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#4F46E5] to-blue-600 text-white rounded-xl h-11 font-semibold hover:opacity-95 transition"
            >
              {isLoading ? "Сохраняем..." : "Сохранить пароль"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
