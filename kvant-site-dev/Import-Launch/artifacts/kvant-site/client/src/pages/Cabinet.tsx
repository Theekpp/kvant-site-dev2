import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { logout } from "@/lib/auth";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { BookingCalendar } from "@/components/BookingCalendar";
import { startOfDay, startOfWeekMon } from "@/lib/date-utils";
import kvantLogo from "@assets/image_1775753659602.png";

interface Account {
  id: number;
  email: string;
  firstName: string | null;
  phone: string | null;
  userId: number | null;
  createdAt: string;
}

interface Booking {
  id: number;
  type: string;
  date: string;
  time: string;
  status: string;
  roomId: string | null;
  createdAt: string;
}

interface Subscription {
  id: number;
  type: string;
  totalLessons: number;
  remainingLessons: number;
  isPaid: boolean;
  createdAt: string;
}

interface ScheduleSlot {
  id: number;
  dayOfWeek: number | null;
  time: string;
  title: string | null;
  maxStudents: number;
  isActive: boolean;
  slotType: string;
  specificDate: string | null;
}

type Tab = "overview" | "subscriptions" | "order" | "book" | "history" | "file" | "profile";

const CABINET_PLANS = [
  { id: "single", title: "Разовое занятие", subtitle: "1 занятие", price: "1 500 ₽", subType: "individual", lessons: 1, badgeCls: "bg-indigo-100 text-indigo-700", priceCls: "text-indigo-600", borderCls: "border-indigo-100", bgCls: "bg-indigo-50" },
  { id: "progress", title: "Пакет «Прогресс»", subtitle: "4 занятия", price: "5 700 ₽", priceOld: "6 000 ₽", subType: "individual", lessons: 4, badgeCls: "bg-emerald-100 text-emerald-700", priceCls: "text-emerald-600", borderCls: "border-emerald-100", bgCls: "bg-emerald-50" },
  { id: "max", title: "Пакет «Максимальный результат»", subtitle: "8 занятий", price: "10 800 ₽", priceOld: "12 000 ₽", subType: "individual", lessons: 8, featured: true, badgeCls: "bg-orange-100 text-orange-700", priceCls: "text-orange-600", borderCls: "border-orange-200", bgCls: "bg-orange-50" },
  { id: "group", title: "Групповое занятие", subtitle: "до 4 учеников", price: "1 000 ₽", subType: "group", lessons: 1, badgeCls: "bg-violet-100 text-violet-700", priceCls: "text-violet-600", borderCls: "border-violet-100", bgCls: "bg-violet-50" },
];

const TYPE_LABELS: Record<string, string> = {
  individual: "Индивидуальное",
  group: "Групповое",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает подтверждения",
  confirmed: "Подтверждено",
  completed: "Завершено",
  cancelled: "Отменено",
};

function isUpcoming(b: Booking) { return b.status === "confirmed" || b.status === "pending"; }

const CANCELLATION_DEADLINE_HOURS = 24;

function bookingDateTime(b: Booking): Date | null {
  const dm = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(b.date);
  const tm = /^(\d{1,2}):(\d{2})$/.exec(b.time);
  if (!dm || !tm) return null;
  return new Date(
    parseInt(dm[3]), parseInt(dm[2]) - 1, parseInt(dm[1]),
    parseInt(tm[1]), parseInt(tm[2]), 0, 0
  );
}

function hoursUntilBooking(b: Booking, now: Date = new Date()): number | null {
  const dt = bookingDateTime(b);
  if (!dt) return null;
  return (dt.getTime() - now.getTime()) / (1000 * 60 * 60);
}

function canCancelBooking(b: Booking, now: Date = new Date()): boolean {
  if (b.status === "pending") return true;
  const h = hoursUntilBooking(b, now);
  return h !== null && h >= CANCELLATION_DEADLINE_HOURS;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl p-5 ${color} flex flex-col gap-1`}>
      <span className="text-xs font-semibold opacity-70 uppercase tracking-wide">{label}</span>
      <span className="text-3xl font-black">{value}</span>
      {sub && <span className="text-xs opacity-60">{sub}</span>}
    </div>
  );
}

function BookingRow({ booking, onCancel }: { booking: Booking; onCancel?: (id: number) => void }) {
  const upcoming = isUpcoming(booking);
  const cancellable = canCancelBooking(booking);
  const hoursLeft = hoursUntilBooking(booking);
  const tooLateTitle = hoursLeft !== null && hoursLeft >= 0
    ? `Отмена недоступна — до занятия осталось менее ${CANCELLATION_DEADLINE_HOURS} ч`
    : "Отмена недоступна";
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        booking.type === "group" ? "bg-violet-100" : "bg-indigo-100"
      }`}>
        <svg className={`w-5 h-5 ${booking.type === "group" ? "text-violet-600" : "text-indigo-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {booking.type === "group"
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          }
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm">{TYPE_LABELS[booking.type] || booking.type}</p>
        <p className="text-xs text-slate-400 mt-0.5">{booking.date} · {booking.time}</p>
      </div>
      {booking.status === "pending" && (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 bg-amber-100 text-amber-700 whitespace-nowrap">
          Ожидает
        </span>
      )}
      {booking.status === "confirmed" && (
        <a
          href={`/video/booking-${booking.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg transition flex-shrink-0 border border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-400 whitespace-nowrap"
          title="Войти в видеоконференцию"
        >
          📹 Конференция
        </a>
      )}
      {upcoming && onCancel ? (
        <button
          onClick={() => cancellable && onCancel(booking.id)}
          disabled={!cancellable}
          title={cancellable ? "Отменить запись" : tooLateTitle}
          className={`text-xs px-3 py-1.5 rounded-lg transition flex-shrink-0 border ${
            cancellable
              ? "text-red-500 hover:text-red-700 border-red-200 hover:border-red-400"
              : "text-slate-300 border-slate-100 cursor-not-allowed"
          }`}
        >
          Отменить
        </button>
      ) : !upcoming ? (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
          booking.status === "completed" ? "bg-green-100 text-green-700"
          : booking.status === "cancelled" ? "bg-slate-100 text-slate-500"
          : "bg-indigo-100 text-indigo-700"
        }`}>
          {STATUS_LABELS[booking.status] || booking.status}
        </span>
      ) : null}
    </div>
  );
}

export default function Cabinet() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [account, setAccount] = useState<Account | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardRoomId, setBoardRoomId] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ firstName: "", phone: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [bookingSlot, setBookingSlot] = useState<ScheduleSlot | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingType, setBookingType] = useState<"individual" | "group">("individual");
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekMon(new Date()));
  const [paymentLoading, setPaymentLoading] = useState<number | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [checkStatusLoading, setCheckStatusLoading] = useState<number | null>(null);

  const [orderCart, setOrderCart] = useState<Record<string, number>>({});
  const [orderLoading, setOrderLoading] = useState(false);
  const [payAllLoading, setPayAllLoading] = useState(false);
  const [payConsentChecked, setPayConsentChecked] = useState(false);

  const [studentProfile, setStudentProfile] = useState<{
    roadmap?: string | null;
    tutorNotes?: string | null;
    homework?: string | null;
    materials?: string | null;
    lessonNotes?: string | null;
  } | null>(null);
  const [telegramLinked, setTelegramLinked] = useState<{ linked: boolean; telegramUsername?: string | null } | null>(null);
  const [telegramLinkToken, setTelegramLinkToken] = useState<{ token: string; expiresAt: string } | null>(null);
  const [telegramLinkLoading, setTelegramLinkLoading] = useState(false);

  const totalOrderItems = Object.values(orderCart).reduce((a, b) => a + b, 0);

  const totalOrderPrice = Object.entries(orderCart).reduce((sum, [planId, qty]) => {
    const plan = CABINET_PLANS.find(p => p.id === planId);
    if (!plan) return sum;
    const raw = plan.price.replace(/\s/g, "").replace("₽", "");
    return sum + (parseInt(raw) || 0) * qty;
  }, 0);

  const addPlan = (id: string) => setOrderCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const removePlan = (id: string) => setOrderCart(c => {
    const n = (c[id] || 0) - 1;
    if (n <= 0) { const { [id]: _, ...rest } = c; return rest; }
    return { ...c, [id]: n };
  });

  const handleOrderCheckout = async () => {
    setOrderLoading(true);
    try {
      const newSubIds: number[] = [];
      for (const [planId, qty] of Object.entries(orderCart)) {
        const plan = CABINET_PLANS.find(p => p.id === planId);
        if (!plan) continue;
        for (let i = 0; i < qty; i++) {
          const r = await api.post("/api/cabinet/subscriptions", { type: plan.subType, totalLessons: plan.lessons });
          newSubIds.push(r.data.id);
        }
      }

      try {
        const payRes = await api.post("/api/cabinet/pay-cart", { subscriptionIds: newSubIds });
        if (payRes.data.confirmationUrl) {
          window.location.href = payRes.data.confirmationUrl;
          return;
        }
      } catch (payErr: any) {
        if (payErr.response?.status !== 503) {
          throw payErr;
        }
      }

      const sub = await api.get("/api/cabinet/subscriptions");
      setSubscriptions(sub.data);
      setOrderCart({});
      setActiveTab("subscriptions");
    } catch {
      toast({ title: "Ошибка при оформлении", description: "Попробуйте ещё раз.", variant: "destructive" });
    } finally {
      setOrderLoading(false);
    }
  };

  const handlePayAll = async (unpaidSubs: Subscription[]) => {
    setPayAllLoading(true);
    try {
      const r = await api.post("/api/cabinet/pay-cart", { subscriptionIds: unpaidSubs.map(s => s.id) });
      if (r.data.confirmationUrl) {
        window.location.href = r.data.confirmationUrl;
      } else {
        toast({ title: "Не удалось получить ссылку для оплаты", description: "Попробуйте позже.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: err.response?.data?.message || "Ошибка при создании платежа", variant: "destructive" });
    } finally {
      setPayAllLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentParam = params.get("payment");

    const checkUnpaidSubscriptions = (subs: Subscription[]) => {
      const unpaid = subs.filter(s => !s.isPaid);
      if (unpaid.length === 0) return;
      unpaid.forEach(sub => {
        api.post(`/api/cabinet/check-payment/${sub.id}`, {})
          .then((r) => {
            if (r.data.isPaid) {
              setSubscriptions(prev =>
                prev.map(s => s.id === sub.id ? { ...s, isPaid: true } : s)
              );
            }
          })
          .catch(() => {});
      });
    };

    const loadData = () => Promise.all([
      api.get("/api/cabinet/me"),
      api.get("/api/cabinet/bookings"),
      api.get("/api/cabinet/subscriptions"),
      api.get("/api/schedule"),
      api.get("/api/cabinet/board-room").catch(() => null),
    ]).then(([me, bk, sub, sc, br]) => {
      setAccount(me.data);
      setEditData({ firstName: me.data.firstName || "", phone: me.data.phone || "" });
      setBookings(bk.data);
      setSubscriptions(sub.data);
      setSlots(Array.isArray(sc.data) ? sc.data : []);
      checkUnpaidSubscriptions(sub.data);
      if (br?.data?.boardRoomId) setBoardRoomId(br.data.boardRoomId);
    });

    if (paymentParam === "success") {
      setActiveTab("subscriptions");
      window.history.replaceState({}, "", "/cabinet");
      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 6000);
    }

    const savedCart = localStorage.getItem("pricing_cart");
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setOrderCart(parsed);
        setActiveTab("order");
        localStorage.removeItem("pricing_cart");
      } catch {}
    }

    Promise.all([
      loadData(),
      api.get("/api/cabinet/student-profile").then(r => setStudentProfile(r.data)).catch(() => {}),
      api.get("/api/cabinet/telegram-status").then(r => setTelegramLinked(r.data)).catch(() => {}),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handlePaySubscription = async (subId: number) => {
    setPaymentLoading(subId);
    try {
      const r = await api.post(`/api/cabinet/pay/${subId}`, {});
      if (r.data.confirmationUrl) {
        window.location.href = r.data.confirmationUrl;
      } else {
        toast({ title: "Не удалось получить ссылку для оплаты", description: "Попробуйте позже.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: err.response?.data?.message || "Ошибка при создании платежа", variant: "destructive" });
      setPaymentLoading(null);
    }
  };

  const handleCheckPaymentStatus = async (subId: number) => {
    setCheckStatusLoading(subId);
    try {
      const r = await api.post(`/api/cabinet/check-payment/${subId}`, {});
      if (r.data.isPaid) {
        setSubscriptions(prev =>
          prev.map(s => s.id === subId ? { ...s, isPaid: true } : s)
        );
        setPaymentSuccess(true);
        setTimeout(() => setPaymentSuccess(false), 5000);
      } else {
        toast({ title: "Платёж ещё не подтверждён", description: "Попробуйте через несколько секунд." });
      }
    } catch {
      toast({ title: "Не удалось проверить статус платежа", description: "Попробуйте позже.", variant: "destructive" });
    } finally {
      setCheckStatusLoading(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleSaveProfile = async () => {
    setEditError("");
    setEditLoading(true);
    try {
      const r = await api.patch("/api/cabinet/me", editData);
      setAccount(r.data);
      setEditMode(false);
    } catch (err: any) {
      setEditError(err.response?.data?.message || "Ошибка сохранения");
    } finally {
      setEditLoading(false);
    }
  };

  const refreshCabinet = async () => {
    try {
      const [bk, sub] = await Promise.all([
        api.get("/api/cabinet/bookings"),
        api.get("/api/cabinet/subscriptions"),
      ]);
      setBookings(bk.data);
      setSubscriptions(sub.data);
    } catch {
      // silent — UI keeps last known state
    }
  };

  const handleCancelBooking = async (id: number) => {
    try {
      await api.delete(`/api/cabinet/bookings/${id}`);
      // Optimistic update for instant feedback
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
      // Re-sync with server (subscription remainingLessons may have been refunded)
      await refreshCabinet();
    } catch (err: any) {
      toast({ title: err.response?.data?.message || "Ошибка отмены", variant: "destructive" });
    }
  };

  const handleBookSlot = async () => {
    if (!bookingSlot) return;
    setBookingLoading(true);
    try {
      const date = bookingDate || bookingSlot.specificDate;
      if (!date) {
        toast({ title: "Укажите дату", variant: "destructive" });
        setBookingLoading(false);
        return;
      }
      const newBooking = await api.post("/api/cabinet/bookings", {
        type: bookingSlot.slotType,
        date,
        time: bookingSlot.time,
        groupScheduleId: bookingSlot.slotType === "group" ? bookingSlot.id : undefined,
      });
      // Optimistic insert for instant feedback
      setBookings(prev => [newBooking.data, ...prev]);
      setBookingSuccess(true);
      setBookingSlot(null);
      setBookingDate("");
      setTimeout(() => setBookingSuccess(false), 3000);
      // Re-sync with server (subscription remainingLessons has been deducted)
      await refreshCabinet();
    } catch (err: any) {
      toast({ title: err.response?.data?.message || "Не удалось записаться", variant: "destructive" });
    } finally {
      setBookingLoading(false);
    }
  };

  const upcomingBookings = bookings.filter(isUpcoming);
  const pastBookings = bookings.filter(b => !isUpcoming(b));
  const activeSubs = subscriptions.filter(s => s.isPaid && s.remainingLessons > 0);
  const totalRemaining = activeSubs.reduce((a, s) => a + s.remainingLessons, 0);
  const nextLesson = upcomingBookings[0];

  const groupedSlots: Record<number, ScheduleSlot[]> = {};
  const specificSlots: ScheduleSlot[] = [];
  slots.forEach(s => {
    if (s.specificDate) { specificSlots.push(s); return; }
    if (s.dayOfWeek !== null && s.dayOfWeek !== undefined) {
      if (!groupedSlots[s.dayOfWeek]) groupedSlots[s.dayOfWeek] = [];
      groupedSlots[s.dayOfWeek].push(s);
    }
  });

  // Subscription totals by type (active + paid + remaining lessons > 0)
  const remainingByType: Record<"individual" | "group", number> = { individual: 0, group: 0 };
  subscriptions.forEach(s => {
    if (s.isPaid && s.remainingLessons > 0 && (s.type === "individual" || s.type === "group")) {
      remainingByType[s.type] += s.remainingLessons;
    }
  });

  // Weekly calendar derived data (memoized)
  const today = useMemo(() => startOfDay(new Date()), []);
  const currentWeekStart = useMemo(() => startOfWeekMon(today), [today]);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "Обзор", icon: "⊡" },
    { id: "subscriptions", label: "Абонементы", icon: "◈" },
    { id: "order", label: "Выбрать тариф", icon: "⊕" },
    { id: "book", label: "Записаться", icon: "+" },
    { id: "history", label: "История", icon: "◷" },
    { id: "file", label: "Личное дело", icon: "📚" },
    { id: "profile", label: "Профиль", icon: "◉" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Загружаем кабинет...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-1.5 group">
              <img src={kvantLogo} alt="K" className="w-9 h-9 object-contain" />
              <span className="font-bold text-xl text-slate-800 -ml-0.5 group-hover:text-indigo-600 transition-colors">vant</span>
            </a>
            <a href="/" className="hidden md:flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition border border-slate-200 hover:border-indigo-300 rounded-lg px-2.5 py-1">
              ← На сайт
            </a>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                {account?.firstName?.[0]?.toUpperCase() || account?.email?.[0]?.toUpperCase() || "?"}
              </div>
              <span className="text-sm font-medium text-slate-700">{account?.firstName || account?.email?.split("@")[0] || "Ученик"}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-slate-700 transition flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex gap-1 bg-white rounded-2xl border border-slate-200 p-1.5 mb-6 overflow-x-auto shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <span className={`text-base leading-none ${activeTab === tab.id ? "" : "opacity-60"}`}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Success Banners */}
        {bookingSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-2xl px-5 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-green-800 text-sm font-semibold">Заявка принята!</p>
              <p className="text-green-700 text-xs mt-0.5">Ожидайте подтверждения от Кирилла — придёт уведомление в Telegram или по email.</p>
            </div>
          </div>
        )}
        {paymentSuccess && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-emerald-800 text-sm font-semibold">Платёж успешно проведён!</p>
              <p className="text-emerald-700 text-xs mt-0.5">Абонемент активирован. Статус обновится в течение нескольких минут.</p>
            </div>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                Привет, {account?.firstName || "Ученик"} 👋
              </h1>
              <p className="text-slate-400 text-sm mt-1">Ваш личный кабинет Kvant</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Занятий осталось" value={totalRemaining} sub="по абонементам" color="bg-gradient-to-br from-indigo-500 to-violet-600 text-white" />
              <StatCard label="Предстоит" value={upcomingBookings.length} sub="в расписании" color="bg-gradient-to-br from-emerald-400 to-teal-500 text-white" />
              <StatCard label="Завершено" value={pastBookings.filter(b => b.status === "completed").length} sub="всего занятий" color="bg-white text-slate-800 border border-slate-200 shadow-sm" />
              <StatCard label="Абонементов" value={activeSubs.length} sub="активных" color="bg-white text-slate-800 border border-slate-200 shadow-sm" />
            </div>

            {/* Next lesson */}
            {nextLesson ? (
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
                <p className="text-xs font-semibold opacity-70 uppercase tracking-wide mb-2">Ближайшее занятие</p>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-lg">{TYPE_LABELS[nextLesson.type] || nextLesson.type}</p>
                    <p className="opacity-80 text-sm mt-1">{nextLesson.date} · {nextLesson.time}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-6 text-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm font-medium">Предстоящих занятий нет</p>
                <button
                  onClick={() => setActiveTab("book")}
                  className="mt-3 text-indigo-600 text-sm font-semibold hover:text-indigo-800 transition"
                >
                  Записаться на занятие →
                </button>
              </div>
            )}

            {/* Quick actions */}
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab("book")}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 text-left hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                  <svg className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Записаться на занятие</p>
                  <p className="text-xs text-slate-400 mt-0.5">Выбрать удобное время из расписания</p>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("subscriptions")}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 text-left hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center group-hover:bg-violet-600 transition-colors">
                  <svg className="w-5 h-5 text-violet-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Мои абонементы</p>
                  <p className="text-xs text-slate-400 mt-0.5">{activeSubs.length} активных · {totalRemaining} занятий</p>
                </div>
              </button>
              {boardRoomId && (
                <a
                  href={`/board/${boardRoomId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 text-left hover:border-teal-300 hover:shadow-md transition-all group col-span-full sm:col-span-2"
                >
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center group-hover:bg-teal-600 transition-colors flex-shrink-0">
                    <svg className="w-5 h-5 text-teal-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">Моя онлайн-доска</p>
                    <p className="text-xs text-slate-400 mt-0.5">Совместная доска с преподавателем — доступна всегда</p>
                  </div>
                </a>
              )}
            </div>

            {/* Recent bookings */}
            {upcomingBookings.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-base font-bold text-slate-800">Предстоящие занятия</h2>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <p className="text-xs text-amber-800 leading-snug">
                    Отмена и перенос занятия доступны не позднее чем за {CANCELLATION_DEADLINE_HOURS} часа до его начала. При своевременной отмене занятие возвращается в абонемент.
                  </p>
                </div>
                <div className="space-y-2">
                  {upcomingBookings.slice(0, 3).map(b => (
                    <BookingRow key={b.id} booking={b} onCancel={handleCancelBooking} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SUBSCRIPTIONS ── */}
        {activeTab === "subscriptions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Абонементы</h2>
              <button onClick={() => setActiveTab("order")} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1">
                + Добавить
              </button>
            </div>

            {subscriptions.some(s => !s.isPaid) && (
              <label className="flex items-start gap-2.5 cursor-pointer group bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                <input
                  type="checkbox"
                  checked={payConsentChecked}
                  onChange={e => setPayConsentChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 flex-shrink-0 rounded accent-indigo-600 cursor-pointer"
                />
                <span className="text-xs text-slate-500 leading-snug group-hover:text-slate-700 transition-colors">
                  Я согласен с обработкой персональных данных в соответствии с{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-800" onClick={e => e.stopPropagation()}>
                    Политикой конфиденциальности
                  </a>
                </span>
              </label>
            )}

            {subscriptions.filter(s => !s.isPaid).length > 1 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">
                      {subscriptions.filter(s => !s.isPaid).length} абонемента ожидают оплаты
                    </p>
                    <p className="text-xs text-amber-700">Оплатите все сразу одним платежом</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePayAll(subscriptions.filter(s => !s.isPaid))}
                  disabled={payAllLoading || !payConsentChecked}
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {payAllLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Переход...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Оплатить все сразу
                    </>
                  )}
                </button>
              </div>
            )}

            {subscriptions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-10 text-center">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm font-medium">Абонементов пока нет</p>
                <button onClick={() => setActiveTab("order")} className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition">
                  Выбрать тариф →
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {subscriptions.map((sub) => {
                  const pct = sub.totalLessons > 0 ? (sub.remainingLessons / sub.totalLessons) * 100 : 0;
                  const isActive = sub.remainingLessons > 0;
                  return (
                    <div key={sub.id} className={`bg-white rounded-2xl border p-5 shadow-sm ${isActive ? "border-indigo-100" : "border-slate-100 opacity-70"}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${sub.type === "group" ? "bg-violet-100" : "bg-indigo-100"}`}>
                              <svg className={`w-4 h-4 ${sub.type === "group" ? "text-violet-600" : "text-indigo-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {sub.type === "group"
                                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                }
                              </svg>
                            </div>
                            <p className="font-bold text-slate-900">{TYPE_LABELS[sub.type] || sub.type}</p>
                          </div>
                          <p className="text-xs text-slate-400">{new Date(sub.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            sub.isPaid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {sub.isPaid ? "Оплачен" : "Ожидает оплаты"}
                          </span>
                          {!isActive && (
                            <span className="text-xs text-slate-400">Исчерпан</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-slate-500">Осталось занятий</span>
                          <span className="font-bold text-slate-800">{sub.remainingLessons} / {sub.totalLessons}</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct > 50 ? "bg-gradient-to-r from-indigo-500 to-violet-500"
                              : pct > 20 ? "bg-gradient-to-r from-amber-400 to-orange-500"
                              : "bg-gradient-to-r from-red-400 to-red-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      {!sub.isPaid && (
                        <div className="mt-4 flex flex-col gap-2">
                          <button
                            onClick={() => handlePaySubscription(sub.id)}
                            disabled={paymentLoading === sub.id || checkStatusLoading === sub.id || !payConsentChecked}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {paymentLoading === sub.id ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Переход к оплате...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Оплатить через ЮКассу
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleCheckPaymentStatus(sub.id)}
                            disabled={checkStatusLoading === sub.id || paymentLoading === sub.id}
                            className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 text-xs font-medium py-2 px-4 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {checkStatusLoading === sub.id ? (
                              <>
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Проверяем...
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Уже оплатил — обновить статус
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ── ORDER / SELECT PLAN ── */}
        {activeTab === "order" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Выбрать тариф</h2>
              {totalOrderItems > 0 && (
                <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  В корзине: {totalOrderItems}
                </span>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {CABINET_PLANS.map(plan => (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col gap-4 transition-shadow hover:shadow-md ${
                    orderCart[plan.id] ? `border-indigo-300 ring-2 ring-indigo-100` : `${plan.borderCls}`
                  }${"featured" in plan && plan.featured ? " relative" : ""}`}
                >
                  {"featured" in plan && plan.featured && (
                    <div className="absolute -top-2.5 left-4 bg-orange-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">ХИТ 🔥</div>
                  )}
                  <div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${plan.badgeCls}`}>{plan.subtitle}</span>
                    <h3 className="font-bold text-slate-900 mt-2 mb-1">{plan.title}</h3>
                    <div className="flex items-baseline gap-1.5">
                      {"priceOld" in plan && plan.priceOld && (
                        <span className="text-xs line-through text-red-400">{plan.priceOld}</span>
                      )}
                      <span className={`text-xl font-black ${plan.priceCls}`}>{plan.price}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => removePlan(plan.id)}
                      disabled={!orderCart[plan.id]}
                      className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 text-xl font-bold hover:bg-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                    >−</button>
                    <span className="text-lg font-bold text-slate-800 w-8 text-center">{orderCart[plan.id] || 0}</span>
                    <button
                      onClick={() => addPlan(plan.id)}
                      className={`w-10 h-10 rounded-xl text-xl font-bold transition flex items-center justify-center ${plan.bgCls} ${plan.priceCls} hover:opacity-80`}
                    >+</button>
                  </div>
                </div>
              ))}
            </div>

            {totalOrderItems > 0 && (
              <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900">Ваш заказ</h3>
                <div className="space-y-2">
                  {CABINET_PLANS.filter(p => orderCart[p.id]).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{p.title}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">× {orderCart[p.id]}</span>
                        <span className="font-semibold text-slate-800">{p.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Итого:</span>
                  <span className="text-xl font-black text-indigo-700">
                    {totalOrderPrice.toLocaleString("ru-RU")} ₽
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={payConsentChecked}
                      onChange={e => setPayConsentChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 flex-shrink-0 rounded accent-indigo-600 cursor-pointer"
                    />
                    <span className="text-xs text-slate-500 leading-snug group-hover:text-slate-700 transition-colors">
                      Я согласен с обработкой персональных данных в соответствии с{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-800">
                        Политикой конфиденциальности
                      </a>
                    </span>
                  </label>
                  <button
                    onClick={handleOrderCheckout}
                    disabled={orderLoading || !payConsentChecked}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {orderLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Переходим к оплате...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Оплатить {totalOrderItems === 1 ? "абонемент" : `${totalOrderItems} ${totalOrderItems < 5 ? "абонемента" : "абонементов"}`} — {totalOrderPrice.toLocaleString("ru-RU")} ₽
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BOOK A LESSON ── */}
        {activeTab === "book" && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-slate-900">Записаться на занятие</h2>

            {bookingSlot && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={() => setBookingSlot(null)}>
                <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full mb-4 sm:mb-0 relative" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setBookingSlot(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </button>
                  <h3 className="font-bold text-slate-900 text-lg mb-1">Подтверждение записи</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {bookingSlot.title || TYPE_LABELS[bookingSlot.slotType]}
                  </p>
                  <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Тип</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bookingSlot.slotType === "group" ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"}`}>
                        {TYPE_LABELS[bookingSlot.slotType]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Дата</span>
                      <span className="font-semibold text-slate-800">
                        {bookingDate || bookingSlot.specificDate || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Время</span>
                      <span className="font-semibold text-slate-800">{bookingSlot.time}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">Остаток после записи</span>
                      <span className="font-semibold text-slate-800">
                        {Math.max(0, remainingByType[bookingSlot.slotType as "individual" | "group"] - 1)} зан.
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBookSlot}
                      disabled={bookingLoading}
                      className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-60"
                    >
                      {bookingLoading ? "Записываемся..." : "Записаться"}
                    </button>
                    <button onClick={() => setBookingSlot(null)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition">
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription status banner */}
            <div className={`rounded-2xl p-4 border ${
              remainingByType.individual === 0 && remainingByType.group === 0
                ? "bg-amber-50 border-amber-200"
                : "bg-white border-slate-200"
            }`}>
              {remainingByType.individual === 0 && remainingByType.group === 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-amber-900 text-sm">Нет оплаченных занятий</p>
                      <p className="text-amber-800 text-xs mt-0.5">Оформите тариф, чтобы записаться на занятие</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("order")}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition flex-shrink-0"
                  >
                    Выбрать тариф
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className={`flex-1 rounded-xl p-3 flex items-center gap-3 ${
                    remainingByType.individual > 0 ? "bg-indigo-50" : "bg-slate-50"
                  }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      remainingByType.individual > 0 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                    }`}>
                      <span className="text-sm font-bold">{remainingByType.individual}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Индивидуальные</p>
                      <p className="text-sm text-slate-800 font-medium">
                        {remainingByType.individual > 0 ? `${remainingByType.individual} занятий` : "Не оплачено"}
                      </p>
                    </div>
                  </div>
                  <div className={`flex-1 rounded-xl p-3 flex items-center gap-3 ${
                    remainingByType.group > 0 ? "bg-violet-50" : "bg-slate-50"
                  }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      remainingByType.group > 0 ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-500"
                    }`}>
                      <span className="text-sm font-bold">{remainingByType.group}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Групповые</p>
                      <p className="text-sm text-slate-800 font-medium">
                        {remainingByType.group > 0 ? `${remainingByType.group} занятий` : "Не оплачено"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Type filter */}
            <div className="flex gap-1 bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm">
              {(["individual", "group"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setBookingType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    bookingType === t
                      ? t === "group"
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md"
                        : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            <BookingCalendar
              slots={slots}
              bookings={bookings}
              bookingType={bookingType}
              hasActiveSub={remainingByType[bookingType] > 0}
              weekStart={weekStart}
              today={today}
              currentWeekStart={currentWeekStart}
              accent={bookingType === "group" ? "violet" : "indigo"}
              onWeekChange={setWeekStart}
              onSelectSlot={(slot, dateStr) => {
                setBookingSlot(slot);
                setBookingDate(dateStr);
              }}
            />

            {slots.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-8 text-center">
                <p className="text-slate-500 text-sm font-medium">Расписание пока не опубликовано</p>
                <p className="text-slate-400 text-xs mt-1">Скоро здесь появятся свободные слоты</p>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY ── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">История занятий</h2>

            {upcomingBookings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Предстоящие</p>
                <div className="space-y-2">
                  {upcomingBookings.map(b => (
                    <BookingRow key={b.id} booking={b} onCancel={handleCancelBooking} />
                  ))}
                </div>
              </div>
            )}

            {pastBookings.length > 0 ? (
              <div>
                {upcomingBookings.length > 0 && (
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Прошедшие</p>
                )}
                <div className="space-y-2">
                  {pastBookings.map(b => (
                    <BookingRow key={b.id} booking={b} />
                  ))}
                </div>
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <p className="text-slate-400 text-sm">История занятий пуста</p>
                <button onClick={() => setActiveTab("book")} className="mt-3 text-indigo-600 text-sm font-semibold hover:text-indigo-800 transition">
                  Записаться на первое занятие →
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* ── FILE (Личное дело) ── */}
        {activeTab === "file" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Личное дело</h2>
              <p className="text-slate-400 text-sm mt-1">Ваш учебный план и материалы от преподавателя</p>
            </div>

            {!studentProfile ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <p className="text-4xl mb-3">📚</p>
                <p className="text-slate-500 font-semibold">Личное дело ещё не заполнено</p>
                <p className="text-slate-400 text-sm mt-1">Преподаватель добавит учебный план и материалы после первого занятия</p>
              </div>
            ) : (
              <div className="space-y-4">
                {studentProfile.roadmap && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="text-lg">🗺️</span> Учебный план
                    </h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{studentProfile.roadmap}</p>
                  </div>
                )}
                {studentProfile.homework && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="text-lg">📝</span> Домашнее задание
                    </h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{studentProfile.homework}</p>
                  </div>
                )}
                {studentProfile.materials && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="text-lg">📖</span> Материалы
                    </h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{studentProfile.materials}</p>
                  </div>
                )}
                {studentProfile.lessonNotes && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="text-lg">🗒️</span> Заметки по занятиям
                    </h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{studentProfile.lessonNotes}</p>
                  </div>
                )}
                {!studentProfile.roadmap && !studentProfile.homework && !studentProfile.materials && !studentProfile.lessonNotes && (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                    <p className="text-4xl mb-3">📚</p>
                    <p className="text-slate-500 font-semibold">Личное дело создано, но пока пусто</p>
                    <p className="text-slate-400 text-sm mt-1">Преподаватель скоро добавит материалы</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE ── */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Профиль</h2>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-black text-white">
                  {account?.firstName?.[0]?.toUpperCase() || account?.email?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-bold text-white text-lg">{account?.firstName || "—"}</p>
                  <p className="text-white/70 text-sm">{account?.email}</p>
                </div>
              </div>

              <div className="p-6">
                {editMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Имя</label>
                      <input
                        value={editData.firstName}
                        onChange={e => setEditData(d => ({ ...d, firstName: e.target.value }))}
                        placeholder="Ваше имя"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Телефон</label>
                      <input
                        value={editData.phone}
                        onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))}
                        placeholder="+7 (900) 000-00-00"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      />
                    </div>
                    {editError && <p className="text-red-500 text-sm">{editError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSaveProfile}
                        disabled={editLoading}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-60"
                      >
                        {editLoading ? "Сохранение..." : "Сохранить"}
                      </button>
                      <button
                        onClick={() => { setEditMode(false); setEditError(""); }}
                        className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <dl className="space-y-3 mb-5">
                      {[
                        { label: "Имя", value: account?.firstName || "—" },
                        { label: "Email", value: account?.email || "—" },
                        { label: "Телефон", value: account?.phone || "—" },
                        { label: "Дата регистрации", value: account?.createdAt ? new Date(account.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "—" },
                      ].map(item => (
                        <div key={item.label} className="flex gap-4 py-2.5 border-b border-slate-50 last:border-0">
                          <dt className="w-32 text-xs font-semibold text-slate-400 uppercase tracking-wide flex-shrink-0 pt-0.5">{item.label}</dt>
                          <dd className="text-sm text-slate-900 font-medium">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <button
                      onClick={() => setEditMode(true)}
                      className="w-full py-2.5 border border-indigo-200 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition"
                    >
                      Редактировать профиль
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Telegram Link Section */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <span className="text-lg">✈️</span> Telegram
              </h3>
              <p className="text-xs text-slate-400 mb-4">Привяжите Telegram для получения уведомлений о занятиях</p>
              {telegramLinked?.linked ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-green-50 rounded-xl px-4 py-3">
                    <span className="text-green-600 text-lg">✅</span>
                    <div>
                      <p className="text-sm font-semibold text-green-800">Telegram привязан</p>
                      {telegramLinked.telegramUsername && (
                        <p className="text-xs text-green-600">@{telegramLinked.telegramUsername}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await api.post("/api/cabinet/unlink-telegram", {});
                        setTelegramLinked({ linked: false });
                        setTelegramLinkToken(null);
                      } catch {}
                    }}
                    className="w-full py-2 border border-slate-200 text-slate-500 text-xs rounded-xl hover:bg-slate-50 transition"
                  >
                    Отвязать Telegram
                  </button>
                </div>
              ) : telegramLinkToken ? (
                <div className="space-y-3">
                  <div className="bg-indigo-50 rounded-xl px-4 py-4 text-center">
                    <p className="text-xs text-slate-500 mb-2">Отправьте боту команду:</p>
                    <p className="font-mono text-lg font-bold text-indigo-700 tracking-widest">/start link_{telegramLinkToken.token}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      Действует до {new Date(telegramLinkToken.expiresAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <a
                    href={`https://t.me/kvantphys_bot?start=link_${telegramLinkToken.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition"
                  >
                    ✈️ Открыть бота
                  </a>
                  <button
                    onClick={() => setTelegramLinkToken(null)}
                    className="w-full py-2 border border-slate-200 text-slate-500 text-xs rounded-xl hover:bg-slate-50 transition"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    setTelegramLinkLoading(true);
                    try {
                      const r = await api.post("/api/cabinet/generate-telegram-link", {});
                      setTelegramLinkToken(r.data);
                    } catch {
                      toast({ title: "Ошибка генерации токена", variant: "destructive" });
                    } finally {
                      setTelegramLinkLoading(false);
                    }
                  }}
                  disabled={telegramLinkLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
                >
                  {telegramLinkLoading ? "Генерация..." : "✈️ Привязать Telegram"}
                </button>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3 bg-white rounded-2xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 hover:border-red-300 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Выйти из аккаунта
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
