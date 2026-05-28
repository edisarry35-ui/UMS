import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api, { API_BASE_URL } from "../../api/axios";
import { Users, CreditCard, Megaphone, BookOpen, ArrowRight, Sparkles, ShieldCheck, BarChart3 } from "lucide-react";

export default function LandingPage() {
  const nav = useNavigate();
  const { theme } = useContext(AuthContext);
  const [hasAdmin, setHasAdmin] = useState(true);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Fetch settings including background image
  useEffect(() => {
    let mounted = true;
    const fetchSettings = async () => {
      try {
        const res = await api.get("/api/settings");
        if (mounted) {
          const bg = res.data?.backgroundImage || res.data?.backgroundImageBase64;
          if (bg) setBackgroundImage(bg);
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        if (mounted) setSettingsLoading(false);
      }
    };
    fetchSettings();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkAdmins = async () => {
      try {
        const res = await api.get("/users?role=admin");
        if (!mounted) return;
        setHasAdmin(Array.isArray(res.data) && res.data.length > 0);
      } catch (err) {
        console.error("Failed to check admin accounts", err);
      } finally {
        if (mounted) setAdminCheckComplete(true);
      }
    };
    checkAdmins();
    return () => { mounted = false; };
  }, []);

  const features = [
    { icon: Users, title: "User Management", desc: "Manage students, staff, and admins seamlessly.", color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800/40" },
    { icon: CreditCard, title: "Payment Tracking", desc: "Monitor tuition, module fees, and payment status.", color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/40" },
    { icon: Megaphone, title: "Announcements", desc: "Post and manage school-wide announcements.", color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/40" },
    { icon: BookOpen, title: "Program Management", desc: "Organize programs, sections, and academic data.", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40" },
  ];

  const isDark = theme === "dark";
  const defaultBackground = `${API_BASE_URL}/uploads/ACLC%20ASSET%20LIGHT%20MODE.png`;
  const resolvedBackground = backgroundImage || defaultBackground;
  const safeBackground = resolvedBackground?.startsWith('data:') ? resolvedBackground : encodeURI(resolvedBackground);

  return (
    <div
      className="min-h-screen text-slate-900 dark:text-white relative overflow-x-hidden"
      style={{
        backgroundImage: safeBackground ? `url('${safeBackground}')` : undefined,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundColor: 'transparent',
      }}
    >
      {/* Gradient overlay removed — background image will show directly */}

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-80px] right-[-80px] w-[520px] h-[520px] rounded-full bg-sky-400/10 dark:bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[380px] h-[380px] rounded-full bg-blue-400/10 dark:bg-blue-500/08 blur-3xl" />
      </div>

      <header className="relative z-10 w-full px-5 sm:px-8 lg:px-12 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <img src="/tesda-logo.png" alt="TESDA logo" className="h-9 sm:h-11 object-contain drop-shadow-sm" />
          <div className="w-px h-8 bg-sky-300/40 dark:bg-sky-500/20" />
          <img src="/ACLC-logo.png" alt="ACLC logo" className="h-9 sm:h-11 object-contain drop-shadow-sm" />
        </div>
        <button
          onClick={() => nav("/login")}
          className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-semibold text-sky-700 dark:text-sky-300 bg-white/80 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700/40 rounded-full hover:bg-white dark:hover:bg-sky-900/50 transition-all shadow-sm"
        >
          Sign In <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      <main className="relative z-10 w-full px-5 sm:px-8 lg:px-12 pt-8 sm:pt-14 pb-10">
        <div className="max-w-3xl animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-100/80 dark:bg-sky-500/15 border border-sky-300/60 dark:border-sky-500/30 rounded-full text-sky-700 dark:text-sky-300 text-[11px] font-bold mb-6 tracking-wide">
            <Sparkles className="w-3 h-3" />
            UAQTEA Management Platform
          </div>

          <h1
            className="font-bold leading-tight tracking-tight mb-5 animate-slide-up text-2xl sm:text-3xl md:text-4xl"
            style={{ fontFamily: "'Goudy Stout', serif" }}
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-sky-800 via-sky-700 to-blue-800 dark:from-sky-300 dark:via-sky-200 dark:to-blue-300">
              UAQTEA MANAGEMENT SYSTEM
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-sky-200/80 leading-relaxed max-w-xl mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            A centralized platform to manage students, staff, payments, and announcements — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <button
              onClick={() => nav("/login")}
              className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            {!hasAdmin && adminCheckComplete && (
              <button
                onClick={() => nav("/signup/admin")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/90 dark:bg-sky-900/30 text-sky-700 dark:text-sky-200 font-bold text-sm rounded-2xl border border-sky-200 dark:border-sky-700/50 hover:bg-white dark:hover:bg-sky-900/50 transition-all duration-200 hover:scale-[1.02] shadow-sm"
              >
                Sign Up as Admin
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {!hasAdmin && adminCheckComplete && (
            <div className="mt-5 text-sm text-slate-700 dark:text-sky-200 max-w-lg leading-relaxed bg-sky-50/90 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700/40 rounded-2xl p-4 shadow-sm animate-fade-in flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
              <span>No administrator account was found. Create the first admin account to begin using the system.</span>
            </div>
          )}
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className={`group bg-white/85 dark:bg-slate-900/70 backdrop-blur-sm border rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-200/40 dark:hover:shadow-sky-900/30 transition-all duration-200 ${f.bg}`}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${f.bg} border`}>
                  <Icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-display font-semibold text-slate-800 dark:text-white mb-1.5 text-sm">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="relative z-10 border-t border-sky-200/50 dark:border-sky-800/30 py-5 text-center text-slate-400 dark:text-sky-600/70 text-xs">
        © {new Date().getFullYear()} UAQTEA Management System. All rights reserved.
      </footer>
    </div>
  );
}
