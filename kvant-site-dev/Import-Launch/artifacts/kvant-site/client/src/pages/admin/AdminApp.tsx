import { Switch, Route } from "wouter";
import { AppLayout } from "@/components/admin/AppLayout";
import Dashboard from "./Dashboard";
import Bookings from "./Bookings";
import Schedule from "./Schedule";
import Students from "./Students";
import Subscriptions from "./Subscriptions";
import Payments from "./Payments";
import Reviews from "./Reviews";

export default function AdminApp() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/admin" component={Dashboard} />
        <Route path="/admin/bookings" component={Bookings} />
        <Route path="/admin/schedule" component={Schedule} />
        <Route path="/admin/students" component={Students} />
        <Route path="/admin/subscriptions" component={Subscriptions} />
        <Route path="/admin/payments" component={Payments} />
        <Route path="/admin/reviews" component={Reviews} />
      </Switch>
    </AppLayout>
  );
}
