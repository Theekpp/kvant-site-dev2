import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useLocation } from "wouter";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const getPageTitle = () => {
    switch (location) {
      case "/": return "Дашборд";
      case "/bookings": return "Все записи";
      case "/schedule": return "Расписание занятий";
      case "/students": return "База учеников";
      case "/subscriptions": return "Абонементы";
      case "/payments": return "Оплаты";
      default: return "Управление";
    }
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full bg-background/50">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-16 items-center justify-between px-6 border-b bg-card/50 backdrop-blur-sm z-10 sticky top-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="text-muted-foreground hover:text-foreground" />
              <h1 className="text-xl font-display tracking-tight">{getPageTitle()}</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold shadow-sm ring-2 ring-background">
                А
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
