import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { logout } from "@/lib/auth";
import api from "@/lib/api";
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

type Tab = "overview" | "subscriptions" | "book" | "history" | "profile";

const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const DAY_NAMES_FULL = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

const TYPE_LABELS: Record<string, string> = {
  individual: "Индивидуальное",
  group: "Групповое",
};
const STATUS_LABELS: Record<string, string> = {
  confirmed: "Подтверждено",
  completed: "Завершено",
  cancelled: "Отменено",
};

function isUpcoming(b: Booking) { return b.status === "confirmed"; }

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
      {upcoming && onCancel ? (
        <button
          onClick={() => onCancel(booking.id)}
          className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition flex-shrink-0"
        >
          Отменить
        </button>
      ) : (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
          booking.status === "completed" ? "bg-green-100 text-green-700"
          : booking.status === "cancelled" ? "bg-slate-100 text-slate-500"
          : "bg-indigo-100 text-indigo-700"
        }`}>
          {STATUS_LABELS[booking.status] || booking.status}
        </span>
      )}
    </div>
  );
}

export default function Cabinet() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [account, setAccount] = useState<Account | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ firstName: "", phone: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [bookingSlot, setBookingSlot] = useState<ScheduleSlot | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState<number | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [checkStatusLoading, setCheckStatusLoading] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentParam = params.get("payment");
    const subIdParam = params.get("sub");

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
    ]).then(([me, bk, sub, sc]) => {
      setAccount(me.data);
      setEditData({ firstName: me.data.firstName || "", phone: me.data.phone || "" });
      setBookings(bk.data);
      setSubscriptions(sub.data);
      setSlots(Array.isArray(sc.data) ? sc.data : []);
      checkUnpaidSubscriptions(sub.data);
    });

    if (paymentParam === "success" && subIdParam) {
      setActiveTab("subscriptions");
      window.history.replaceState({}, "", "/cabinet");
      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 6000);
    }

    loadData().catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handlePaySubscription = async (subId: number) => {
    setPaymentLoading(subId);
    try {
      const r = await api.post(`/api/cabinet/pay/${subId}`, {});
      if (r.data.confirmationUrl) {
        window.location.href = r.data.confirmationUrl;
      } else {
        alert("Не удалось получить ссылку для оплаты. Попробуйте позже.");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Ошибка при создании платежа");
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
        alert("Платёж ещё не подтверждён. Попробуйте через несколько секунд.");
      }
    } catch {
      alert("Не удалось проверить статус платежа. Попробуйте позже.");
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

  const handleCancelBooking = async (id: number) => {
    try {
      await api.delete(`/api/cabinet/bookings/${id}`);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
    } catch (err: any) {
      alert(err.response?.data?.message || "Ошибка отмены");
    }
  };

  const handleBookSlot = async () => {
    if (!bookingSlot) return;
    setBookingLoading(true);
    try {
      const date = bookingSlot.specificDate || bookingDate;
      if (!date) { alert("Укажите дату"); setBookingLoading(false); return; }
      const newBooking = await api.post("/api/cabinet/bookings", {
        type: bookingSlot.slotType,
        date,
        time: bookingSlot.time,
        groupScheduleId: bookingSlot.slotType === "group" ? bookingSlot.id : undefined,
      });
      setBookings(prev => [newBooking.data, ...prev]);
      setBookingSuccess(true);
      setBookingSlot(null);
      setBookingDate("");
      setTimeout(() => setBookingSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || "Не удалось записаться");
    } finally {
      setBookingLoading(false);
    }
  };

  const upcomingBookings = bookings.filter(isUpcoming);
  const pastBookings = bookings.filter(b => !isUpcoming(b));
  const activeSubs = subscriptions.filter(s => s.remainingLessons > 0);
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

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "Обзор", icon: "⊡" },
    { id: "subscriptions", label: "Абонементы", icon: "◈" },
    { id: "book", label: "Записаться", icon: "+" },
    { id: "history", label: "История", icon: "◷" },
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
          <a href="/" className="flex items-center gap-1.5 group">
            <img src={kvantLogo} alt="K" className="w-9 h-9 object-contain" />
            <span className="font-bold text-xl text-slate-800 -ml-0.5 group-hover:text-indigo-600 transition-colors">vant</span>
          </a>
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
            <p className="text-green-800 text-sm font-medium">Занятие успешно забронировано!</p>
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
            </div>

            {/* Recent bookings */}
            {upcomingBookings.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-slate-800 mb-3">Предстоящие занятия</h2>
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
              <a href="/#services" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1">
                + Добавить
              </a>
            </div>

            {subscriptions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-10 text-center">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm font-medium">Абонементов пока нет</p>
                <a href="/#services" className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition">
                  Выбрать тариф →
                </a>
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
                            disabled={paymentLoading === sub.id || checkStatusLoading === sub.id}
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

            {subscriptions.length > 0 && (
              <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-indigo-700">
                  Для оплаты абонемента свяжитесь с преподавателем через{" "}
                  <a href="https://t.me/physictutor_bot" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-indigo-900">Telegram-бот</a>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── BOOK A LESSON ── */}
        {activeTab === "book" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Записаться на занятие</h2>

            {bookingSlot && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={() => setBookingSlot(null)}>
                <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full mb-4 sm:mb-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setBookingSlot(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </button>
                  <h3 className="font-bold text-slate-900 text-lg mb-1">Подтверждение записи</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {bookingSlot.title || TYPE_LABELS[bookingSlot.slotType]}{" · "}{bookingSlot.time}
                    {bookingSlot.dayOfWeek !== null && ` · каждый ${DAY_NAMES_FULL[bookingSlot.dayOfWeek!]}`}
                  </p>
                  {!bookingSlot.specificDate && (
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Дата занятия</label>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={e => setBookingDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
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

            {slots.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-10 text-center">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm font-medium">Свободных слотов пока нет</p>
                <p className="text-slate-400 text-xs mt-1">Расписание скоро появится — следите за обновлениями</p>
                <a href="https://t.me/physictutor_bot" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition">
                  Написать в Telegram →
                </a>
              </div>
            ) : (
              <div className="space-y-6">
                {specificSlots.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Конкретные даты</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {specificSlots.map(slot => (
                        <button
                          key={slot.id}
                          onClick={() => setBookingSlot(slot)}
                          className="bg-white rounded-2xl border border-slate-200 p-4 text-left hover:border-indigo-400 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${slot.slotType === "group" ? "bg-violet-100 group-hover:bg-violet-600" : "bg-indigo-100 group-hover:bg-indigo-600"} transition-colors`}>
                              <svg className={`w-4 h-4 ${slot.slotType === "group" ? "text-violet-600" : "text-indigo-600"} group-hover:text-white transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{slot.title || TYPE_LABELS[slot.slotType]}</p>
                              <p className="text-xs text-slate-400">{slot.specificDate} · {slot.time}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${slot.slotType === "group" ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"}`}>
                              {TYPE_LABELS[slot.slotType]}
                            </span>
                            <span className="text-xs text-slate-400">до {slot.maxStudents} уч.</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(groupedSlots).length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Еженедельное расписание</h3>
                    <div className="space-y-3">
                      {[1,2,3,4,5,6,0].filter(d => groupedSlots[d]).map(day => (
                        <div key={day}>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{DAY_NAMES_FULL[day]}</p>
                          <div className="grid sm:grid-cols-2 gap-3">
                            {groupedSlots[day].map(slot => (
                              <button
                                key={slot.id}
                                onClick={() => { setBookingSlot(slot); setBookingDate(""); }}
                                className="bg-white rounded-2xl border border-slate-200 p-4 text-left hover:border-indigo-400 hover:shadow-md transition-all group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${slot.slotType === "group" ? "bg-violet-100 group-hover:bg-violet-600" : "bg-indigo-100 group-hover:bg-indigo-600"} transition-colors`}>
                                    <span className={`text-sm font-bold ${slot.slotType === "group" ? "text-violet-600" : "text-indigo-600"} group-hover:text-white transition-colors`}>{slot.time}</span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-semibold text-slate-800 text-sm">{slot.title || TYPE_LABELS[slot.slotType]}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${slot.slotType === "group" ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"}`}>
                                        {TYPE_LABELS[slot.slotType]}
                                      </span>
                                      <span className="text-xs text-slate-400">до {slot.maxStudents} уч.</span>
                                    </div>
                                  </div>
                                  <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
