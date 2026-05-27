import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import HomeBlueAccent from "@/pages/HomeBlueAccent";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyEmail from "@/pages/VerifyEmail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Cabinet from "@/pages/Cabinet";
import Board from "@/pages/Board";
import VideoRoom from "@/pages/VideoRoom";
import Offer from "@/pages/legal/Offer";
import Metodika from "@/pages/Metodika";
import Privacy from "@/pages/legal/Privacy";
import Terms from "@/pages/legal/Terms";
import Refund from "@/pages/legal/Refund";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import AdminApp from "@/pages/admin/AdminApp";
import CookieBanner from "@/components/CookieBanner";

const PAGE_TITLES: Record<string, string> = {
  "/": "Физика с Кириллом — репетитор по физике онлайн",
  "/login": "Вход — Физика с Кириллом",
  "/register": "Регистрация — Физика с Кириллом",
  "/verify-email": "Подтверждение email — Физика с Кириллом",
  "/forgot-password": "Восстановление пароля — Физика с Кириллом",
  "/reset-password": "Новый пароль — Физика с Кириллом",
  "/cabinet": "Личный кабинет — Физика с Кириллом",
  "/offer": "Договор оферты — Физика с Кириллом",
  "/privacy": "Политика конфиденциальности — Физика с Кириллом",
  "/terms": "Условия использования — Физика с Кириллом",
  "/refund": "Политика возврата — Физика с Кириллом",
  "/metodika": "Как устроены занятия и почему это работает — Физика с Кириллом",
};

function TitleManager() {
  const [location] = useLocation();

  useEffect(() => {
    const title = PAGE_TITLES[location] ?? "Физика с Кириллом — репетитор по физике онлайн";
    document.title = title;

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute("content", title);
  }, [location]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeBlueAccent} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/metodika" component={Metodika} />
      <Route path="/offer" component={Offer} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/refund" component={Refund} />
      <Route path="/cabinet">
        {() => (
          <ProtectedRoute>
            <Cabinet />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/board/:roomId">
        {() => (
          <ProtectedRoute>
            <Board />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/video/:roomName">
        {() => (
          <ProtectedRoute>
            <VideoRoom />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin">
        {() => (
          <AdminProtectedRoute>
            <AdminApp />
          </AdminProtectedRoute>
        )}
      </Route>
      <Route path="/admin/:rest*">
        {() => (
          <AdminProtectedRoute>
            <AdminApp />
          </AdminProtectedRoute>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TitleManager />
      <Toaster />
      <Router />
      <CookieBanner />
    </QueryClientProvider>
  );
}

export default App;
