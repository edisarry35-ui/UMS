import React, { useState, useEffect, useContext } from "react";
import MainLayout from "../layouts/MainLayout";
import { AuthContext } from "../context/AuthContext";
import axios from "../api/axios";
import { PageLoader, Alert } from "../components/ui";

const extractUserIdFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id;
  } catch {
    return null;
  }
};

export default function ActivityLogPage() {
  const { auth } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [filterMode, setFilterMode] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const canSeeAll = auth?.role === "admin";
  const isAdmin = auth?.role === "admin";

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      const currentUserId = extractUserIdFromToken();

      if (!canSeeAll) {
        params.userId = currentUserId;
      } else if (filterMode === "mine") {
        params.userId = currentUserId;
      } else if (filterMode === "user" && selectedUserId) {
        params.userId = selectedUserId;
      }

      const response = await axios.get("/activity-log", { params });
      setLogs(response.data || []);
    } catch (err) {
      console.error("Failed to fetch activity logs", err);
      setError("Failed to load activity logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedUserId, filterMode, auth?.role]);

  const filtered = logs.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (item.username || "").toLowerCase().includes(q) ||
      (item.role || "").toLowerCase().includes(q) ||
      (item.action || "").toLowerCase().includes(q) ||
      (item.details || "").toLowerCase().includes(q)
    );
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageLogs = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(1);
    }
  }, [currentPage, pageCount]);

  const handleClear = () => {
    setSelectedUserId(null);
    setFilterMode("all");
    setSearch("");
    setCurrentPage(1);
  };

  return (
    <MainLayout user={{ name: "Activity Log" }} onMenuItemClick={null}>
      <div className="page-content">
        <div className="mb-8 rounded-3xl border border-white/15 bg-white/10 py-4 px-6 shadow-card backdrop-blur-xl md:py-5 md:px-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/20 px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-sm shadow-slate-900/10">
                Activity Logs
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-white/15 bg-white/10 py-4 px-6 shadow-card backdrop-blur-xl md:py-5 md:px-7">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by user, action, or details..."
                className="input w-full pr-10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="button"
              className="btn-secondary p-2"
              onClick={loadLogs}
              aria-label="Refresh logs"
              title="Refresh"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.93 4.93a10 10 0 0 1 14.14 0l1.72-1.72" />
                <path d="M20 11a8 8 0 1 1-1.8-5.3" />
                <path d="M20 4v4h-4" />
              </svg>
            </button>
            <button
              type="button"
              className="btn-secondary p-2"
              onClick={handleClear}
              aria-label="Reset filters"
              title="Reset filters"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 7v6h-6" />
                <path d="M5 17v-6h6" />
                <path d="M9 7l5 5" />
                <path d="M14 12l-5 5" />
              </svg>
            </button>
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`${filterMode === "all" ? "btn-primary" : "btn-secondary"} p-2`}
                  onClick={() => { setFilterMode("all"); setSelectedUserId(null); setCurrentPage(1); }}
                  aria-label="Show all users"
                  title="All users"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`${filterMode === "mine" ? "btn-primary" : "btn-secondary"} p-2`}
                  onClick={() => { setFilterMode("mine"); setSelectedUserId(null); setCurrentPage(1); }}
                  aria-label="Show my actions"
                  title="My actions"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
                    <path d="M6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
                  </svg>
                </button>
              </div>
            )}
            {(filterMode === "user" && selectedUserId) && (
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Showing actions for user {selectedUserId}
              </span>
            )}
          </div>
          {loading ? (
            <PageLoader text="Loading activity logs..." />
          ) : error ? (
            <Alert type="error">{error}</Alert>
          ) : (
            <>
              <div className="table-wrapper overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>Date/Time</th>
                      {isAdmin && <th>User</th>}
                      {isAdmin && <th>Role</th>}
                      <th>Action</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 3} className="text-center py-4 text-slate-400">No activity logs found.</td>
                      </tr>
                    ) : (
                      pageLogs.map((log) => (
                        <tr key={log._id}>
                          <td className="text-sm text-slate-600 dark:text-slate-300">{new Date(log.timestamp).toLocaleString()}</td>
                          {isAdmin && (
                            <td
                              className={"text-sm text-primary-600 dark:text-primary-300 cursor-pointer"}
                              onClick={() => {
                                if (!isAdmin || !log.userId) return;
                                setSelectedUserId(log.userId);
                                setFilterMode("user");
                                setCurrentPage(1);
                              }}
                            >
                              {log.username || "System"}
                            </td>
                          )}
                          {isAdmin && <td className="text-sm">{log.role || "system"}</td>}
                          <td className="text-sm">{log.action}</td>
                          <td className="text-sm break-all">{log.details || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filtered.length > PAGE_SIZE && (
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 mt-4 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600 dark:text-slate-300">Page {currentPage} of {pageCount}</span>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={currentPage === pageCount}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pageCount))}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
