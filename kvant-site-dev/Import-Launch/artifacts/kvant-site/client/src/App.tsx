import { Switch, Route } from "wouter";
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
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import AdminApp from "@/pages/admin/AdminApp";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeBlueAccent} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/cabinet">
        {() => (
          <ProtectedRoute>
            <Cabinet />
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
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
