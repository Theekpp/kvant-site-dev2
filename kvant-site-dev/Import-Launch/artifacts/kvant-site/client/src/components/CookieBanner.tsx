import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookies_accepted");
    if (!accepted) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookies_accepted", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-4 pointer-events-none">
      <div
        className="pointer-events-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700 max-w-2xl w-full animate-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-start gap-3 flex-1">
          <span className="text-lg flex-shrink-0 mt-0.5">🍪</span>
          <p className="text-sm text-slate-300 leading-relaxed">
            Мы используем cookies. Продолжая использовать сайт, вы соглашаетесь с{" "}
            <a href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors">
              политикой конфиденциальности
            </a>.
          </p>
        </div>
        <button
          onClick={accept}
          className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all hover:shadow-lg whitespace-nowrap"
        >
          Принять
        </button>
      </div>
    </div>
  );
}
