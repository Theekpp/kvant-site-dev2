import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: data.email });
    } finally {
      setSent(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Восстановление пароля</h1>
          <p className="text-slate-500 mt-2">Введите email и мы отправим инструкции</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {sent ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-700 font-medium">Письмо отправлено</p>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Если email зарегистрирован, вы получите письмо со ссылкой для сброса пароля.
              </p>
              <a href="/login" className="mt-5 inline-block text-indigo-600 hover:underline text-sm font-medium">
                Вернуться ко входу
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#4F46E5] to-blue-600 text-white rounded-xl h-11 font-semibold hover:opacity-95 transition"
              >
                {isLoading ? "Отправляем..." : "Восстановить пароль"}
              </Button>

              <p className="text-center text-sm text-slate-400">
                <a href="/login" className="text-indigo-600 hover:underline">Вернуться ко входу</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
