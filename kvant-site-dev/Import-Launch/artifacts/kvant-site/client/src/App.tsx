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
import Board from "@/pages/Board";
import Offer from "@/pages/legal/Offer";
import Privacy from "@/pages/legal/Privacy";
import Terms from "@/pages/legal/Terms";
import Refund from "@/pages/legal/Refund";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import AdminApp from "@/pages/admin/AdminApp";
import CookieBanner from "@/components/CookieBanner";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeBlueAccent} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
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
      <CookieBanner />
    </QueryClientProvider>
  );
}

export default App;
