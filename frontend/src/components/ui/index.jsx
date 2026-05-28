import React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X, Loader2 } from "lucide-react";

export function Spinner({ size = "md", className = "" }) {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" };
  return <Loader2 className={`${sizes[size]} animate-spin text-sky-500 ${className}`} />;
}

export function PageLoader({ text = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-sky-100 dark:border-sky-900/40" />
        <Loader2 className="absolute inset-0 w-12 h-12 animate-spin text-sky-500" />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{text}</p>
    </div>
  );
}

export function Badge({ variant = "gray", children, className = "" }) {
  const variants = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    blue: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    gray: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function Alert({ type = "info", children, onClose, className = "" }) {
  const styles = {
    error: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/15 dark:border-red-800/50 dark:text-red-300",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/15 dark:border-emerald-800/50 dark:text-emerald-300",
    info: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/15 dark:border-sky-800/50 dark:text-sky-300",
    warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/15 dark:border-amber-800/50 dark:text-amber-300",
  };
  const icons = {
    error: AlertCircle,
    success: CheckCircle2,
    info: Info,
    warning: AlertTriangle,
  };
  const Icon = icons[type];
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl text-sm font-medium border animate-fade-in ${styles[type]} ${className}`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span className="flex-1">{children}</span>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "", title = "No data found", subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center animate-fade-in rounded-2xl border border-sky-100 dark:border-sky-800/30 bg-white/70 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/40 flex items-center justify-center text-2xl mb-4">
        {icon || "📦"}
      </div>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">{subtitle}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, color = "blue", trend }) {
  const colors = {
    blue: "from-sky-500 to-blue-600",
    green: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-500",
    red: "from-red-500 to-rose-600",
    purple: "from-violet-500 to-purple-600",
  };
  
  let displayIcon = icon;
  if (typeof icon === "string") {
    displayIcon = icon.charAt(0)?.toUpperCase() || "•";
  }
  
  return (
    <div className="card flex items-start gap-4 border border-sky-100/60 dark:border-sky-800/30 bg-white/90 dark:bg-slate-900/80 backdrop-blur animate-fade-in">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${colors[color]} shadow-md flex-shrink-0`}>
        {displayIcon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-2xl font-display font-bold text-slate-900 dark:text-white mt-0.5">{value}</p>
        {trend && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{trend}</p>}
      </div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function ConfirmModal({ open, title, message, onConfirm, onClose, confirmLabel = "Confirm", danger = false }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-sky-50 dark:hover:bg-sky-900/30 text-slate-400" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="modal-body">
          <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export { default as LiveAnalytics } from "./LiveAnalytics";
