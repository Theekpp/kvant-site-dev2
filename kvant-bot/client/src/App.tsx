import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { queryClient, setAdminToken, clearAdminToken } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, type ReactNode } from "react";

import AdminLogin from "@/pages/AdminLogin";
import Dashboard from "@/pages/Dashboard";
import Bookings from "@/pages/Bookings";
import Schedule from "@/pages/Schedule";
import Students from "@/pages/Students";
import Subscriptions from "@/pages/Subscriptions";
import Payments from "@/pages/Payments";
import NotFound from "@/pages/not-found";

function AuthCheck({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authed" | "unauthed">("loading");
  const [, navigate] = useLocation();

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_access_token");
    if (stored) {
      setAdminToken(stored);
      setStatus("authed");
      return;
    }
    fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ accessToken }: { accessToken: string }) => {
        setAdminToken(accessToken);
        setStatus("authed");
      })
      .catch(() => {
        clearAdminToken();
        setStatus("unauthed");
      });
  }, []);

  useEffect(() => {
    if (status === "unauthed") navigate("/login");
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthed") return null;
  return <>{children}</>;
}

function AdminRouter() {
  return (
    <Switch>
      <Route path="/login" component={AdminLogin} />
      <Route>
        <AuthCheck>
          <AppLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/bookings" component={Bookings} />
              <Route path="/schedule" component={Schedule} />
              <Route path="/students" component={Students} />
              <Route path="/subscriptions" component={Subscriptions} />
              <Route path="/payments" component={Payments} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </AuthCheck>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base="/admin">
          <AdminRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
