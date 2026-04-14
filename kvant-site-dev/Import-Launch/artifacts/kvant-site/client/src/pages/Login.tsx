import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { login } from "@/lib/auth";
import { Eye, EyeOff } from "lucide-react";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const [, navigate] = useLocation();
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      navigate("/cabinet");
    } catch (err: any) {
      setServerError(err.response?.data?.message || "Ошибка входа");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Личный кабинет</h1>
          <p className="text-muted-foreground mt-2">Войдите в свой аккаунт</p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
              />
              {errors.email && (
                <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-xl border border-destructive/20">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl h-11 font-semibold"
            >
              {isLoading ? "Входим..." : "Войти"}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-center text-sm">
            <a href="/forgot-password" className="text-primary hover:underline">
              Забыли пароль?
            </a>
            <span className="text-muted-foreground">
              Нет аккаунта?{" "}
              <a href="/register" className="text-primary hover:underline font-medium">
                Зарегистрируйтесь
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
