import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Rocket, Atom, Award, Telescope, ArrowRight, CheckCircle, Menu, X, Star, LogIn, Zap } from "lucide-react";
import PricingCards from "@/components/PricingCards";
import { BOT_URL } from "@/lib/bot";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { tryRefreshToken, getAccessToken, getMe } from "@/lib/auth";

// Asset imports
import heroImage from "@assets/image_1771362600078.png";
import aboutImage from "@assets/image_1771364502291.png";
import kvantLogo from "@assets/image_1775753659602.png";

export default function HomeBlueAccent() {
  const [activeTab, setActiveTab] = useState("newton");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async (loggedIn: boolean) => {
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        try {
          const me = await getMe();
          setIsAdmin(me?.account?.role === "admin");
        } catch {
          setIsAdmin(false);
        }
      }
      setAuthChecked(true);
    };

    if (getAccessToken()) {
      checkAuth(true);
    } else {
      tryRefreshToken().then((ok) => checkAuth(ok));
    }
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* Formulas Background Effect - Academic/Educational */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Physics Formulas Floating */}
        {[
          "E = mc²", "F = m · a", "v = λ · f", "W = F · d", 
          "p = m · v", "Q = m · c · ΔT", "I = V / R", "U = m · g · h",
          "F_g = G(m₁m₂)/r²", "T = 2π√(L/g)", "E_k = ½mv²", "PV = nRT"
        ].map((formula, i) => (
          <div 
            key={`formula-${i}`}
            className="absolute text-slate-300/40 font-display font-medium whitespace-nowrap animate-float-slow"
            style={{
              fontSize: `${Math.random() * 1.5 + 1}rem`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 15}s`,
              transform: `rotate(${Math.random() * 40 - 20}deg)`
            }}
          >
            {formula}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div
          className="container mx-auto px-4 flex items-center justify-between max-w-7xl"
          style={{ height: 'clamp(80px, calc(2.9vw + 57px), 112px)' }}
        >
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <img
              src={kvantLogo}
              alt="K"
              className="object-contain"
              style={{ width: 'clamp(40px, calc(1.5vw + 28px), 56px)', height: 'clamp(40px, calc(1.5vw + 28px), 56px)' }}
            />
            <span
              className="font-display font-bold text-slate-800 -ml-0.5"
              style={{ fontSize: 'clamp(1.5rem, calc(1vw + 1rem), 2.25rem)' }}
            >vant</span>
          </div>

          {/* Desktop Nav */}
          <div
            className="hidden md:flex items-center mr-4 text-slate-600"
            style={{ gap: 'clamp(24px, calc(2.1vw + 7px), 48px)', fontSize: 'clamp(0.875rem, calc(0.5vw + 0.625rem), 1.25rem)' }}
          >
            <button onClick={() => window.scrollTo(0, 0)} className="font-medium hover:text-[#4F46E5] transition-colors">Главная</button>
            <button onClick={() => scrollToSection('about')} className="font-medium hover:text-[#4F46E5] transition-colors">О репетиторе</button>
            <button onClick={() => scrollToSection('reviews')} className="font-medium hover:text-[#4F46E5] transition-colors">Отзывы</button>
            <button onClick={() => scrollToSection('services')} className="font-medium hover:text-[#4F46E5] transition-colors">Услуги</button>
            <button onClick={() => scrollToSection('contact')} className="font-medium hover:text-[#4F46E5] transition-colors">Контакты</button>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {authChecked && (
              isLoggedIn ? (
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <a href="/admin">
                      <Button variant="outline" className="rounded-[20px] px-4 lg:px-5 text-sm font-semibold border-[#4F46E5] text-[#4F46E5] hover:bg-indigo-50 transition-all whitespace-nowrap">
                        Админ панель
                      </Button>
                    </a>
                  )}
                  <a href="/cabinet">
                    <Button className="bg-gradient-to-r from-[#4F46E5] to-[#2563EB] hover:opacity-95 transition-all active:scale-95 rounded-[20px] px-4 lg:px-6 text-sm lg:text-base whitespace-nowrap text-white border-0 shadow-sm font-semibold">
                      Личный кабинет
                    </Button>
                  </a>
                </div>
              ) : (
                <a href="/login">
                  <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group select-none">
                    <LogIn className="w-5 h-5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                    <span className="text-[9px] font-bold tracking-widest text-slate-400 group-hover:text-indigo-600 uppercase transition-colors leading-none">Войти</span>
                  </div>
                </a>
              )
            )}
          </div>

          {/* Mobile Nav */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-800">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-white border-l border-slate-200">
                <div className="flex flex-col gap-6 mt-10 text-slate-800">
                  <button onClick={() => window.scrollTo(0, 0)} className="text-lg font-medium text-left hover:text-[#4F46E5]">Главная</button>
                  <button onClick={() => scrollToSection('about')} className="text-lg font-medium text-left hover:text-[#4F46E5]">О репетиторе</button>
                  <button onClick={() => scrollToSection('reviews')} className="text-lg font-medium text-left hover:text-[#4F46E5]">Отзывы</button>
                  <button onClick={() => scrollToSection('services')} className="text-lg font-medium text-left hover:text-[#4F46E5]">Услуги</button>
                  <button onClick={() => scrollToSection('contact')} className="text-lg font-medium text-left hover:text-[#4F46E5]">Контакты</button>
                  {authChecked && (
                    isLoggedIn ? (
                      <div className="flex flex-col gap-3">
                        {isAdmin && (
                          <a href="/admin">
                            <Button variant="outline" className="w-full rounded-2xl border-[#4F46E5] text-[#4F46E5] font-semibold">
                              Админ панель
                            </Button>
                          </a>
                        )}
                        <a href="/cabinet">
                          <Button className="bg-gradient-to-r from-[#4F46E5] to-[#2563EB] w-full rounded-2xl text-white font-semibold">
                            Личный кабинет
                          </Button>
                        </a>
                      </div>
                    ) : (
                      <a href="/login">
                        <Button variant="outline" className="w-full rounded-2xl border-[#4F46E5] text-[#4F46E5] font-semibold gap-2">
                          <LogIn className="w-4 h-4" />
                          Войти
                        </Button>
                      </a>
                    )
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 container mx-auto px-4 max-w-7xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-6 text-slate-900">
              Ментор по <span className="text-[#4F46E5]">физике</span>
            </h1>
            <p className="text-slate-600 text-lg md:text-xl mb-8 max-w-lg leading-loose">
              Индивидуальный подход к каждому ученику, современные методики обучения и гарантированный результат.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white rounded-[20px] px-8 h-12 text-base shadow-md hover:shadow-lg hover:opacity-95 transition-all active:scale-95 border-0 font-semibold">
                  Записаться на занятие
                </Button>
              </a>
              <Button variant="outline" size="lg" className="rounded-[20px] px-8 h-12 text-base border-2 border-[#4F46E5] text-[#4F46E5] hover:bg-blue-50 bg-transparent transition-colors font-medium" onClick={() => scrollToSection('demo')}>
                Увидеть физику в действии
              </Button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative flex justify-center"
          >
            {/* Atom Animation (Light Theme) */}
            <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center [perspective:1000px]">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-indigo-100 blur-[80px] rounded-full"></div>
              
              {/* Atom Container */}
              <div className="relative w-full h-full flex items-center justify-center [transform-style:preserve-3d] animate-float">
                {/* Nucleus */}
                <div className="relative w-20 h-20 bg-[#facc15] border-[4px] border-black rounded-full shadow-[6px_6px_0px_rgba(0,0,0,1)] z-20"></div>

                {/* Orbit 1 Container */}
                <div className="absolute inset-0 flex items-center justify-center [transform:rotateZ(60deg)_rotateX(65deg)] [transform-style:preserve-3d]">
                  <div className="absolute w-64 h-64 border-[4px] border-black rounded-full"></div>
                  <div className="absolute w-full h-full animate-spin-slow-1 [transform-style:preserve-3d]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#e60000] border-[3px] border-black rounded-full [transform:rotateX(-90deg)]"></div>
                  </div>
                </div>

                {/* Orbit 2 Container */}
                <div className="absolute inset-0 flex items-center justify-center [transform:rotateZ(-60deg)_rotateX(65deg)] [transform-style:preserve-3d]">
                  <div className="absolute w-64 h-64 border-[4px] border-black rounded-full"></div>
                  <div className="absolute w-full h-full animate-spin-slow-2 [transform-style:preserve-3d]">
                     <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#0044cc] border-[3px] border-black rounded-full [transform:rotateX(-90deg)]"></div>
                  </div>
                </div>

                {/* Orbit 3 Container */}
                <div className="absolute inset-0 flex items-center justify-center [transform:rotateX(75deg)] [transform-style:preserve-3d]">
                  <div className="absolute w-64 h-64 border-[4px] border-black rounded-full"></div>
                  <div className="absolute w-full h-full animate-spin-slow-3 [transform-style:preserve-3d]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#facc15] border-[3px] border-black rounded-full [transform:rotateX(-90deg)]"></div>
                  </div>
                </div>
              </div>

              <style>{`
                .animate-spin-slow-1 { animation: spin 3s linear infinite; }
                .animate-spin-slow-2 { animation: spin 4s linear infinite; }
                .animate-spin-slow-3 { animation: spin 5s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-pulse-slow { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
              `}</style>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Physics in Action Section */}
      <section id="demo" className="py-20 relative overflow-hidden bg-slate-50/50">
        <div className="container mx-auto px-4 relative z-10 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-slate-900">Физика в действии</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-indigo-600 to-purple-600 mx-auto rounded-full"></div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-slate-800">Интерактивные демонстрации</h3>
              <p className="text-slate-600 mb-8 text-lg">
                Изучайте физические явления в интерактивном режиме. Выберите демонстрацию и наблюдайте за законами физики в действии.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                {["newton", "planets", "waves", "particles"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      activeTab === tab 
                        ? "bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm" 
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {tab === "newton" && "Маятник Ньютона"}
                    {tab === "planets" && "Движение планет"}
                    {tab === "waves" && "Волновая теория"}
                    {tab === "particles" && "Частицы"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
                >
                  <p className="text-sm leading-relaxed text-slate-700">
                    {activeTab === "newton" && "Маятник Ньютона демонстрирует законы сохранения энергии и импульса. При столкновении шаров энергия передается от одного к другому через ряд соударений."}
                    {activeTab === "planets" && "Гравитационное взаимодействие небесных тел объясняет движение планет вокруг звезд. Законы Кеплера в действии."}
                    {activeTab === "waves" && "Интерференция и дифракция волн. Наглядная демонстрация того, как волны накладываются друг на друга."}
                    {activeTab === "particles" && "Броуновское движение частиц в жидкости или газе. Хаотичное движение, вызванное тепловым воздействием."}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl aspect-video relative overflow-hidden flex items-center justify-center shadow-2xl">
              <div className="absolute top-4 w-full text-center text-sm font-medium text-white/70 z-20">
                {activeTab === "newton" && "Маятник Ньютона"}
                {activeTab === "planets" && "Симуляция орбит"}
                {activeTab === "waves" && "Волновая теория"}
                {activeTab === "particles" && "Броуновское движение частиц"}
              </div>
              
              {/* Newton's Cradle Visual */}
              {activeTab === "newton" && (
                <div className="relative flex items-start gap-1 h-40 mt-10">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex flex-col items-center h-full w-12 origin-top animate-swing" style={{ 
                      animationName: i === 0 ? 'swingLeft' : i === 4 ? 'swingRight' : 'none',
                      animationDuration: '1.2s',
                      animationIterationCount: 'infinite',
                      animationTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                    }}>
                      <div className="w-0.5 h-24 bg-white/20"></div>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-300 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
                    </div>
                  ))}
                  <style>{`
                    @keyframes swingLeft {
                      0%, 100% { transform: rotate(0deg); }
                      25% { transform: rotate(25deg); }
                      50% { transform: rotate(0deg); }
                    }
                    @keyframes swingRight {
                      0%, 100% { transform: rotate(0deg); }
                      50% { transform: rotate(0deg); }
                      75% { transform: rotate(-25deg); }
                    }
                  `}</style>
                </div>
              )}

              {/* Solar System Visual */}
              {activeTab === "planets" && (
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="absolute w-16 h-16 bg-yellow-400 rounded-full shadow-[0_0_50px_rgba(250,204,21,0.5)]"></div>
                  
                  {/* Orbit 1 */}
                  <div className="absolute w-32 h-32 border border-white/10 rounded-full animate-spin" style={{ animationDuration: '8s' }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]"></div>
                  </div>

                  {/* Orbit 2 */}
                  <div className="absolute w-56 h-56 border border-white/10 rounded-full animate-spin" style={{ animationDuration: '12s' }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-red-400 rounded-full shadow-[0_0_10px_rgba(248,113,113,0.8)]"></div>
                  </div>

                  {/* Orbit 3 */}
                  <div className="absolute w-80 h-80 border border-white/10 rounded-full animate-spin" style={{ animationDuration: '20s' }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-purple-400 rounded-full shadow-[0_0_10px_rgba(192,132,252,0.8)]"></div>
                  </div>
                </div>
              )}

              {/* Waves Visual - Updated to match screenshot (grid + waves) */}
              {activeTab === "waves" && (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#1e1b4b]">
                  {/* Grid Background */}
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                  }}></div>
                  
                  {/* Animated Sine Waves */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
                      <path d="M0 25 Q 12.5 15, 25 25 T 50 25 T 75 25 T 100 25" fill="none" stroke="rgba(255, 0, 0, 0.6)" strokeWidth="0.5" className="animate-wave-1">
                        <animate attributeName="d" 
                          values="M0 25 Q 12.5 10, 25 25 T 50 25 T 75 25 T 100 25;
                                  M0 25 Q 12.5 40, 25 25 T 50 25 T 75 25 T 100 25;
                                  M0 25 Q 12.5 10, 25 25 T 50 25 T 75 25 T 100 25" 
                          dur="3s" repeatCount="indefinite" />
                      </path>
                      <path d="M0 25 Q 12.5 35, 25 25 T 50 25 T 75 25 T 100 25" fill="none" stroke="rgba(0, 255, 0, 0.6)" strokeWidth="0.5" className="animate-wave-2">
                         <animate attributeName="d" 
                          values="M0 25 Q 12.5 40, 25 25 T 50 25 T 75 25 T 100 25;
                                  M0 25 Q 12.5 10, 25 25 T 50 25 T 75 25 T 100 25;
                                  M0 25 Q 12.5 40, 25 25 T 50 25 T 75 25 T 100 25" 
                          dur="4s" repeatCount="indefinite" />
                      </path>
                      <path d="M0 25 Q 12.5 25, 25 25 T 50 25 T 75 25 T 100 25" fill="none" stroke="rgba(0, 0, 255, 0.6)" strokeWidth="0.5" className="animate-wave-3">
                         <animate attributeName="d" 
                          values="M0 25 Q 12.5 20, 25 25 T 50 25 T 75 25 T 100 25;
                                  M0 25 Q 12.5 30, 25 25 T 50 25 T 75 25 T 100 25;
                                  M0 25 Q 12.5 20, 25 25 T 50 25 T 75 25 T 100 25" 
                          dur="2.5s" repeatCount="indefinite" />
                      </path>
                    </svg>
                  </div>
                </div>
              )}

              {/* Particles Visual - Chaotic Brownian Motion */}
              {activeTab === "particles" && (
                <div className="relative w-full h-full p-4 bg-[#0a0a16] overflow-hidden">
                  {[...Array(25)].map((_, i) => (
                    <div 
                      key={i}
                      className="absolute w-12 h-1.5 rounded-full shadow-[0_0_8px_currentColor] mix-blend-screen"
                      style={{
                        backgroundColor: ['#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00'][i % 5],
                        color: ['#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00'][i % 5],
                        // Random starting positions covering the whole area
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        // Faster animation (3s to 8s)
                        animation: `chaotic-move-${i % 5} ${3 + Math.random() * 5}s infinite linear`,
                        opacity: 0.9
                      }}
                    ></div>
                  ))}
                  <style>{`
                    /* Increased movement range to cover full container */
                    @keyframes chaotic-move-0 {
                      0% { transform: translate(0, 0) rotate(0deg); }
                      20% { transform: translate(200px, -150px) rotate(90deg); }
                      40% { transform: translate(-180px, 120px) rotate(180deg); }
                      60% { transform: translate(150px, 200px) rotate(270deg); }
                      80% { transform: translate(-120px, -200px) rotate(360deg); }
                      100% { transform: translate(0, 0) rotate(0deg); }
                    }
                    @keyframes chaotic-move-1 {
                      0% { transform: translate(0, 0) rotate(45deg); }
                      25% { transform: translate(-250px, -100px) rotate(135deg); }
                      50% { transform: translate(180px, 220px) rotate(225deg); }
                      75% { transform: translate(-150px, 150px) rotate(315deg); }
                      100% { transform: translate(0, 0) rotate(45deg); }
                    }
                    @keyframes chaotic-move-2 {
                      0% { transform: translate(0, 0) rotate(90deg); }
                      20% { transform: translate(120px, 240px) rotate(180deg); }
                      40% { transform: translate(-220px, -180px) rotate(270deg); }
                      60% { transform: translate(240px, -80px) rotate(0deg); }
                      80% { transform: translate(-100px, 180px) rotate(90deg); }
                      100% { transform: translate(0, 0) rotate(90deg); }
                    }
                    @keyframes chaotic-move-3 {
                      0% { transform: translate(0, 0) rotate(135deg); }
                      30% { transform: translate(-180px, 180px) rotate(45deg); }
                      60% { transform: translate(180px, -180px) rotate(-45deg); }
                      100% { transform: translate(0, 0) rotate(135deg); }
                    }
                    @keyframes chaotic-move-4 {
                      0% { transform: translate(0, 0) rotate(0deg); }
                      25% { transform: translate(180px, 80px) rotate(120deg); }
                      50% { transform: translate(-80px, -180px) rotate(240deg); }
                      75% { transform: translate(80px, 180px) rotate(360deg); }
                      100% { transform: translate(0, 0) rotate(0deg); }
                    }
                  `}</style>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      
      {/* About Section */}
      <section id="about" className="py-24 bg-white relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50 rounded-2xl blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-50 rounded-2xl blur-[80px] translate-y-1/3 -translate-x-1/3"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-slate-900">Обо мне</h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto rounded-2xl"></div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-16 items-start max-w-7xl mx-auto w-full">
            {/* Left Column: Photo & Stats */}
            <div className="lg:col-span-5 flex flex-col gap-8">
              <div className="relative group mx-auto lg:mx-0 w-full max-w-md">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-all duration-500"></div>
                <div className="relative rounded-3xl overflow-hidden aspect-auto max-h-[80vh] shadow-xl ring-1 ring-slate-200 bg-white">
                  <img 
                    src={aboutImage} 
                    alt="Кирилл Анисимов" 
                    className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 w-full p-4 sm:p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <h3 className="text-lg sm:text-2xl font-bold text-white mb-1">Кирилл Анисимов</h3>
                    <p className="text-indigo-200 font-medium text-sm sm:text-base">Ментор по физике</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm">
                  <div className="text-3xl font-bold text-[#4F46E5] mb-1">200+</div>
                  <div className="text-sm text-slate-600">Учеников</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center hover:bg-purple-50 hover:border-purple-200 transition-colors shadow-sm">
                  <div className="text-2xl font-bold text-[#4F46E5] mb-1">7–11</div>
                  <div className="text-sm text-slate-600">Классы</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center hover:bg-cyan-50 hover:border-cyan-200 transition-colors shadow-sm">
                  <div className="text-xl font-bold text-[#4F46E5] mb-1 leading-tight">ОГЭ / Олимпиады</div>
                  <div className="text-sm text-slate-600">Подготовка</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center hover:bg-emerald-50 hover:border-emerald-200 transition-colors shadow-sm">
                  <div className="font-bold text-[#4F46E5] mb-1 text-[20px]">Индивидуальный подход</div>
                  <div className="text-sm text-slate-600">К каждому</div>
                </div>
              </div>
            </div>
            
            {/* Right Column: Detailed Info */}
            <div className="lg:col-span-7 flex flex-col gap-8 lg:gap-12 min-w-0">
              {/* Intro Text */}
              <div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-6 leading-tight text-slate-900">
                  Помогаю <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4F46E5] to-[#06B6D4]">понять суть явлений</span>, а не просто заучить формулы.
                </h3>
                <p className="text-lg text-slate-600 leading-loose">
                  Меня зовут Кирилл, я студент и преподаватель физики. Учусь в техническом направлении и параллельно уже несколько лет помогаю школьникам разобраться в предмете.
                </p>
                <p className="text-lg text-slate-600 leading-loose mt-4">
                  Через меня прошло 200+ учеников, и я точно знаю, с какими трудностями они сталкиваются — от полного непонимания тем до страха перед экзаменами.
                </p>
                <p className="text-lg text-slate-600 leading-loose mt-4">
                  Физика для меня — это не просто предмет, а способ мышления. И именно этому я стараюсь учить своих учеников: не заучивать, а понимать.
                </p>
              </div>

              {/* Approach Section */}
              <div className="space-y-8">
                <div className="flex gap-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#4F46E5]/20 flex items-center justify-center text-indigo-400">
                    <Atom className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xl font-bold mb-3">Мой подход</h4>
                    <p className="text-slate-500 leading-loose mb-3">На занятиях ученик:</p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-3 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0"></span>
                        начинает понимать темы, которые раньше казались сложными
                      </li>
                      <li className="flex items-start gap-3 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0"></span>
                        учится логически мыслить, а не заучивать формулы
                      </li>
                      <li className="flex items-start gap-3 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0"></span>
                        разбирает задачи до полного понимания, а не «по образцу»
                      </li>
                    </ul>
                    <p className="text-slate-400 leading-loose mt-3">
                      Каждое занятие — это индивидуальный подход, даже в группах. Я подстраиваюсь под уровень ученика и веду его до результата.
                    </p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xl font-bold mb-3">Мой опыт</h4>
                    <p className="text-slate-400 leading-loose">
                      Физика для меня — это не просто школьный предмет. Я сам проходил путь от непонимания сложных тем до глубокого погружения: участвовал в олимпиадах, разбирал задачи, которые сначала казались невозможными, и со временем начал видеть в физике логику и систему.
                    </p>
                    <p className="text-slate-500 leading-loose mt-3 font-medium">За время преподавания:</p>
                    <ul className="space-y-2 mt-2">
                      <li className="flex items-start gap-3 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></span>
                        ученики поднимаются с 2–3 до 4–5
                      </li>
                      <li className="flex items-start gap-3 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></span>
                        уверенно сдают ОГЭ по физике
                      </li>
                      <li className="flex items-start gap-3 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></span>
                        начинают сами решать задачи, а не списывать
                      </li>
                      <li className="flex items-start gap-3 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0"></span>
                        появляется интерес к предмету и уверенность в себе
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800/20 flex items-center justify-center text-purple-400">
                    <Telescope className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xl font-bold mb-3">Для кого мои занятия</h4>
                    <ul className="space-y-3 mt-2">
                      <li className="flex items-start gap-3 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></span>
                        Ученики 7–11 классов, которые хотят поднять оценки
                      </li>
                      <li className="flex items-start gap-3 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></span>
                        Те, кто готовится к ОГЭ по физике
                      </li>
                      <li className="flex items-start gap-3 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></span>
                        Ученики, которым нужна помощь с пониманием тем
                      </li>
                      <li className="flex items-start gap-3 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></span>
                        Те, кто хочет идти дальше школы (олимпиады, углубление)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* CTA Button in About Section */}
              <div className="pt-4">
                <Button className="bg-slate-100 hover:bg-indigo-50 text-[#4F46E5] border border-indigo-200 px-8 py-6 h-auto text-lg rounded-xl transition-all hover:scale-[1.02] shadow-sm">
                  Узнать подробнее о методике <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 relative bg-slate-50 border-y border-slate-200">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-slate-900">Услуги и цены</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto rounded-2xl"></div>
          </div>

          <PricingCards isLoggedIn={isLoggedIn} />
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-24 bg-slate-50/50 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 text-slate-900">Отзывы учеников</h2>
            <div className="w-20 h-1 bg-[#4F46E5] mx-auto rounded-full"></div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Анна С.",
                grade: "11 класс",
                text: "Благодаря занятиям с Кириллом, физика стала моим любимым предметом. Сдала ЕГЭ на 89 баллов, хотя в начале года писала пробники на 45. Очень понятное объяснение сложных тем!",
                rating: 5
              },
              {
                name: "Михаил В.",
                grade: "10 класс",
                text: "Отличный преподаватель! Умеет заинтересовать предметом. Формулы больше не кажутся набором букв, теперь я понимаю откуда они берутся и как работают в реальной жизни.",
                rating: 5
              },
              {
                name: "Елена (мама Игоря)",
                grade: "9 класс",
                text: "Сын начал заниматься за полгода до ОГЭ. Результат - твердая пятерка. Кирилл всегда на связи, дает подробную обратную связь по домашним заданиям. Рекомендую!",
                rating: 5
              }
            ].map((review, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#F5F7FF] rounded-[24px] p-8 border border-slate-100 shadow-sm"
              >
                <div className="flex gap-1 mb-4 text-yellow-400">
                  {[...Array(review.rating)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 leading-loose mb-6 italic">«{review.text}»</p>
                <div>
                  <div className="font-bold text-slate-900">{review.name}</div>
                  <div className="text-sm text-slate-500">{review.grade}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section / Footer */}
      <section id="contact" className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-4 text-center max-w-7xl">
          <h2 className="text-3xl font-bold mb-8">Связаться со мной</h2>
          <p className="text-slate-300 max-w-xl mx-auto mb-10">
            Готовы начать погружение в мир физики? Оставьте заявку или напишите мне в мессенджеры.
          </p>
          <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="bg-gradient-to-r from-[#3B82F6] to-[#4F46E5] hover:opacity-90 rounded-2xl px-10 h-14 text-lg text-white border-none">
              Написать в Telegram
            </Button>
          </a>
          
          <div className="mt-20 pt-10 border-t border-slate-800 text-sm text-slate-400 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <img src={kvantLogo} alt="K" className="w-6 h-6 object-contain opacity-80" />
              <span className="font-display font-bold text-slate-200">vant</span>
            </div>
            <div>© {new Date().getFullYear()} Kvant. Все права защищены.</div>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Telegram</a>
              <a href="#" className="hover:text-white transition-colors">WhatsApp</a>
              <a href="#" className="hover:text-white transition-colors">ВКонтакте</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
