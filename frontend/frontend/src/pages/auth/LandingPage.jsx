import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/axios";

export default function LandingPage() {
  const nav = useNavigate();
  const { theme } = useContext(AuthContext);
  const [hasAdmin, setHasAdmin] = useState(true);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);

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
    return () => {
      mounted = false;
    };
  }, []);

  const features = [
    { icon: "👥", title: "User Management", desc: "Manage students, staff, and admins with ease." },
    { icon: "💳", title: "Payment Tracking", desc: "Monitor tuition, module fees, and payment status." },
    { icon: "📢", title: "Announcements", desc: "Post and manage school-wide announcements." },
    { icon: "📊", title: "Program Management", desc: "Organize Programs, sections, and academic data." },
  ];

  return (
    <div className="min-h-screen text-slate-900 dark:text-white relative overflow-x-hidden" style={{ backgroundImage: theme === 'dark' ? 'linear-gradient(135deg, #0b1b33 0%, #101f43 50%, #1a2a4a 100%)' : 'linear-gradient(135deg, #d9eafc 0%, #b6d9f9 50%, #3E8EDE 100%)' }}>
      {/* Decorative background blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-200/20 dark:bg-primary-600/20 rounded-full blur-3xl translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-accent-500/5 dark:bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-[200px] h-[200px] bg-primary-600/5 dark:bg-primary-400/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-4">
          <img src="/tesda-logo.png" alt="TESDA logo" className="h-8 sm:h-10 object-contain" />
          <img src="/ACLC-logo.png" alt="ACLC logo" className="h-8 sm:h-10 object-contain" />
        </div>
      </header>

      {/* Hero section */}
      <main className="relative z-10 w-full px-4 sm:px-6 md:px-8 lg:px-12 pt-8 sm:pt-16 pb-6 sm:pb-10">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-accent-500/10 border border-accent-500/20 rounded-full text-accent-600 dark:bg-accent-500/20 dark:border-accent-500/30 dark:text-accent-400 text-[10px] sm:text-xs font-semibold mb-4 sm:mb-6 animate-fade-in">
            <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-accent-400 rounded-full animate-pulse" />
            UAQTEA Management Platform
          </div>

          <h1 className="font-bold leading-tight tracking-tight mb-4 sm:mb-6 animate-slide-up text-2xl sm:text-3xl md:text-4xl lg:text-4xl" style={{ fontFamily: "'Goudy Stout', serif" }}>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-950 via-slate-900 to-slate-900 dark:from-primary-300 dark:to-accent-400">
              UAQTEA MANAGEMENT SYSTEM
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-700 dark:text-primary-200 font-body leading-relaxed max-w-xl mb-6 sm:mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            A centralized platform to manage students, staff, payments, and announcements — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <button
              onClick={() => nav("/login")}
              className="px-5 sm:px-7 py-2.5 sm:py-3.5 bg-primary-900 text-white dark:bg-white dark:text-primary-900 font-display font-bold text-sm sm:text-base rounded-xl hover:bg-primary-800 dark:hover:bg-primary-50 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 min-h-[44px]"
            >
              Get Started
              <span>→</span>
            </button>
            {!hasAdmin && adminCheckComplete && (
              <button
                onClick={() => nav("/signup/admin")}
                className="px-5 sm:px-7 py-2.5 sm:py-3.5 bg-white text-primary-900 dark:bg-slate-900 dark:text-white font-display font-bold text-sm sm:text-base rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 min-h-[44px]"
              >
                Sign Up as Admin
                <span>→</span>
              </button>
            )}
          </div>
          {!hasAdmin && adminCheckComplete && (
            <div className="mt-4 text-sm sm:text-base text-slate-800 dark:text-slate-200 max-w-xl leading-relaxed bg-white/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
              No administrator account was found. Create the first admin account to begin using the system.
            </div>
          )}
        </div>

        {/* Feature cards */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white/90 backdrop-blur border border-slate-200/80 dark:bg-slate-900/90 dark:border-slate-700/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="text-lg sm:text-xl mb-2">{f.icon}</div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white mb-1 text-xs sm:text-sm">{f.title}</h3>
              <p className="text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mt-8 sm:mt-16 flex flex-col sm:flex-row flex-wrap gap-6 sm:gap-8 items-center border-t border-slate-200 dark:border-white/10 pt-6 sm:pt-10">
          {[["🎓", "Students Managed"], ["📚", "Programs Tracked"], ["💳", "Payments Processed"], ["📢", "Announcements"]].map(([icon, label], i) => (
            <div key={i} className="flex items-center gap-2 text-slate-600 dark:text-primary-300">
              <span className="text-lg">{icon}</span>
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-white/10 py-4 text-center text-slate-500 dark:text-primary-400 text-xs">
        © {new Date().getFullYear()} UAQTEA Management System. All rights reserved.
      </footer>
    </div>
  );
}

