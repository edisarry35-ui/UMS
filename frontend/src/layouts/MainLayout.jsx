import React, { useEffect, useState } from "react";
import Navbar from "../components/navbar/Navbar";

export default function MainLayout({ children, user, onMenuItemClick }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("sidebarOpen");
    return stored === "true";
  });

  useEffect(() => {
    window.localStorage.setItem("sidebarOpen", sidebarOpen ? "true" : "false");
  }, [sidebarOpen]);

  return (
    <div className="page-wrapper relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-primary-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/3 translate-y-1/3 rounded-full bg-accent-500/10 blur-3xl" />
      </div>
      <div className={`page-content transition-all duration-300 ${sidebarOpen ? "sidebar-open" : ""}`}>
        <Navbar
          user={user}
          onMenuItemClick={onMenuItemClick}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
