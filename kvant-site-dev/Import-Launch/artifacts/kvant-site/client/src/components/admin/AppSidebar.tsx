import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Calendar,
  Users,
  ListCheck,
  CreditCard,
  GraduationCap,
  Banknote,
  Star,
  History
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Дашборд",     url: "/admin",               icon: LayoutDashboard },
  { title: "Записи",      url: "/admin/bookings",      icon: ListCheck },
  { title: "Расписание",  url: "/admin/schedule",      icon: Calendar },
  { title: "Ученики",     url: "/admin/students",      icon: Users },
  { title: "Абонементы",  url: "/admin/subscriptions", icon: CreditCard },
  { title: "Оплаты",      url: "/admin/payments",      icon: Banknote },
  { title: "Отзывы",      url: "/admin/reviews",       icon: Star },
  { title: "История",     url: "/admin/history",       icon: History },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-foreground">
              Физика с Кириллом
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              Панель управления
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold tracking-wider uppercase text-muted-foreground px-4 mb-2">
            Меню
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/admin" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`transition-all duration-200 ${isActive ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full py-2.5">
                        <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
