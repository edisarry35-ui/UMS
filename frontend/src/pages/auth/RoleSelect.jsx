import React from "react";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

export default function RoleSelect() {
  const navigate = useNavigate();
  const { theme } = useContext(AuthContext);

  const roles = [
    {
      id: "student",
      icon: "👨‍🎓",
      title: "Student",
      desc: "View your programs, records, and payment details.",
      label: "Student Access",
    },
    {
      id: "staff",
      icon: "👨‍🏫",
      title: "Staff",
      desc: "Manage students, sections, and academic information.",
      label: "Staff Access",
    },
    {
      id: "admin",
      icon: "👨‍💼",
      title: "Admin",
      desc: "Access users, reports, approvals, and system settings.",
      label: "Admin Access",
    },
  ];

  const handleRole = (role) => {
    if (role === "student") navigate("/login/student");
    else navigate("/login/staff-admin");
  };

  return (
    <div className="min-h-screen text-slate-900 dark:text-white overflow-hidden relative flex items-center justify-center p-4 sm:p-6" style={{ backgroundImage: theme === 'dark' ? 'linear-gradient(135deg, #0b1b33 0%, #101f43 50%, #1a2a4a 100%)' : 'linear-gradient(135deg, #d9eafc 0%, #b6d9f9 50%, #3E8EDE 100%)' }}>
      <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-primary-200/20 dark:bg-primary-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[360px] h-[360px] bg-accent-500/5 dark:bg-accent-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl animate-slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/95 dark:bg-slate-950/85 rounded-[28px] text-2xl mb-4 border border-slate-200/70 dark:border-white/15 shadow-2xl text-slate-950 dark:text-white">🎓</div>
          <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400 mb-3">Welcome back</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Choose your role</h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm mt-3 max-w-xl mx-auto">Pick the correct access path to continue to your UAQTEA dashboard.</p>
        </div>

        <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800 rounded-[2rem] p-4 shadow-2xl shadow-slate-400/10 dark:shadow-black/40">
          <div className="space-y-3">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRole(role.id)}
                className="group w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_90px_-50px_rgba(59,130,246,0.6)] dark:hover:shadow-[0_24px_90px_-50px_rgba(59,130,246,0.4)]"
              >
                <div className={`w-14 h-14 rounded-3xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm ${role.id === 'student' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200' : role.id === 'staff' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'}`}>
                  {role.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-display text-lg font-semibold text-slate-950 dark:text-white">{role.title}</span>
                </div>
                <span className="text-slate-400 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white transition-colors text-2xl">→</span>
              </button>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10 text-center">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-slate-700 hover:text-slate-950 dark:text-primary-200 dark:hover:text-white transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

