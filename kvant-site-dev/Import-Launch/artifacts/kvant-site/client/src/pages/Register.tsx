import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const schema = z.object({
  firstName: z.string().min(1, "Введите имя"),
  email: z.string().email("Введите корректный email"),
  phone: z.string().min(1, "Введите номер телефона"),
  password: z.string().min(8, "Минимум 8 символов"),
  confirmPassword: z.string(),
  consent: z.boolean().refine(v => v === true, "Необходимо дать согласие"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

export default function Register() {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { consent: false },
  });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    setIsLoading(true);
    try {
      await api.post("/api/auth/register", {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        phone: data.phone,
      });
      setSuccess(true);
    } catch (err: any) {
      setServerError(err.response?.data?.message || "Ошибка регистрации");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-card rounded-2xl shadow-sm border border-border p-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Проверьте почту</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Мы отправили письмо с подтверждением. Перейдите по ссылке в письме, чтобы активировать аккаунт.
            </p>
            <a href="/login" className="mt-6 inline-block text-primary hover:underline text-sm font-medium">
              Вернуться ко входу
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Создать аккаунт</h1>
          <p className="text-muted-foreground mt-2">Зарегистрируйтесь, чтобы управлять занятиями</p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Имя</label>
              <input
                {...register("firstName")}
                type="text"
                placeholder="Иван"
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
              />
              {errors.firstName && <p className="text-destructive text-xs mt-1">{errors.firstName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
              />
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Телефон</label>
              <input
                {...register("phone")}
                type="tel"
                placeholder="+7 999 000-00-00"
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
              />
              {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Пароль</label>
              <input
                {...register("password")}
                type="password"
                placeholder="Минимум 8 символов"
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
              />
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Подтверждение пароля</label>
              <input
                {...register("confirmPassword")}
                type="password"
                placeholder="Повторите пароль"
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
              />
              {errors.confirmPassword && <p className="text-destructive text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <div className="pt-1">
              <label className={`flex items-start gap-3 cursor-pointer group ${errors.consent ? "text-destructive" : ""}`}>
                <input
                  {...register("consent")}
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer flex-shrink-0"
                />
                <span className="text-sm text-muted-foreground leading-snug group-hover:text-foreground transition-colors">
                  Я согласен с обработкой персональных данных в соответствии с{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                    onClick={e => e.stopPropagation()}
                  >
                    Политикой конфиденциальности
                  </a>
                </span>
              </label>
              {errors.consent && <p className="text-destructive text-xs mt-1 ml-7">{errors.consent.message}</p>}
            </div>

            {serverError && (
              <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-xl border border-destructive/20">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl h-11 font-semibold mt-2"
            >
              {isLoading ? "Регистрируем..." : "Зарегистрироваться"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <a href="/login" className="text-primary hover:underline font-medium">Войти</a>
          </p>
        </div>
      </div>
    </div>
  );
}
