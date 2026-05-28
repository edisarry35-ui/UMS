import React, { useContext, useEffect, useState, useRef } from "react";
import MainLayout from "../layouts/MainLayout";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { EmptyState, PageLoader } from "../components/ui";
import { decodeToken, formatDate } from "../utils/helpers";
import { createPortal } from "react-dom";

export default function ArchivePage() {
  const { auth } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const menuButtonRef = useRef(null);
  const [menuCoords, setMenuCoords] = useState(null);
  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) setSelectedIds([]);
    else setSelectedIds(items.map((i) => i._id));
  };
  const [deleting, setDeleting] = useState(false);
  const [emptyingArchive, setEmptyingArchive] = useState(false);

  useEffect(() => {
    fetchArchive();
  }, []);

  const fetchArchive = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const decoded = decodeToken(token);
      const userId = decoded?.id;
      const params = userId ? { userId } : {};
      const res = await axios.get("/archive", { params });
      setItems(res.data?.items || []);
    } catch (err) {
      console.error("Failed to load archive:", err);
      setError("Unable to load archived items. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length || !window.confirm(`Delete ${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"} permanently? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const deleteRequests = selectedIds.map((id) => {
        const item = items.find((i) => i._id === id);
        if (!item) return Promise.resolve();
        const endpoint = item.type === "announcement" ? `/announcements/${id}` : item.type === "notification" ? `/notifications/${id}` : `/${item.type}/${id}`;
        return axios.delete(endpoint);
      });
      await Promise.all(deleteRequests);
      setError(null);
      setSelectionMode(false);
      setSelectedIds([]);
      setShowMenu(false);
      await fetchArchive();
    } catch (err) {
      console.error("Failed to delete selected items:", err);
      setError("Failed to delete selected items. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleEmptyArchive = async () => {
    if (!window.confirm("Empty entire archive? All items will be permanently deleted. This cannot be undone.")) {
      return;
    }

    setEmptyingArchive(true);
    try {
      const deleteRequests = items.map((item) => {
        const endpoint = item.type === "announcement" ? `/announcements/${item._id}` : item.type === "notification" ? `/notifications/${item._id}` : `/${item.type}/${item._id}`;
        return axios.delete(endpoint);
      });
      await Promise.all(deleteRequests);
      setError(null);
      setSelectionMode(false);
      setSelectedIds([]);
      setShowMenu(false);
      await fetchArchive();
    } catch (err) {
      console.error("Failed to empty archive:", err);
      setError("Failed to empty archive. Please try again.");
    } finally {
      setEmptyingArchive(false);
    }
  };

  const handleRestoreSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Restore ${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"}?`)) return;
    try {
      const restoreRequests = selectedIds.map((id) => {
        const item = items.find((i) => i._id === id);
        if (!item) return Promise.resolve();
        const endpoint = item.type === "announcement" ? `/archive/announcements/${id}/restore` : item.type === "notification" ? `/archive/notifications/${id}/restore` : `/archive/${item.type}/${id}/restore`;
        return axios.post(endpoint).catch(() => Promise.resolve());
      });
      await Promise.all(restoreRequests);
      setSelectionMode(false);
      setSelectedIds([]);
      setShowMenu(false);
      await fetchArchive();
    } catch (err) {
      console.error("Failed to restore selected items:", err);
      setError("Failed to restore selected items. Please try again.");
    }
  };

  return (
    <MainLayout user={{ name: auth?.role }}>
      <div className="page-content mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl border border-white/15 bg-white/10 py-4 px-6 shadow-card backdrop-blur-xl md:py-5 md:px-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/20 px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-sm shadow-slate-900/10">
                Archive
              </span>
            </div>
              <div className="relative overflow-visible flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRestoreSelected}
                  disabled={selectedIds.length === 0}
                  title={selectedIds.length ? "Restore selected" : "Restore (select items)"}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm hover:bg-slate-50 ${selectedIds.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10v6a2 2 0 0 1-2 2H7"/><polyline points="17 4 7 14 3 10"/></svg>
                </button>
                
                {selectedIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={deleting || selectedIds.length === 0}
                    title="Delete selected"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEmptyArchive}
                    disabled={emptyingArchive || items.length === 0}
                    title="Empty archive"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                )}
                <button
                  ref={menuButtonRef}
                  type="button"
                  onClick={() => {
                    if (!showMenu && menuButtonRef.current) {
                      const rect = menuButtonRef.current.getBoundingClientRect();
                      setMenuCoords({ top: rect.bottom + window.scrollY, left: rect.right + window.scrollX - 208 });
                    }
                    setShowMenu((prev) => !prev);
                  }}
                  aria-label="More options"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  ⋯
                </button>
                {showMenu && menuCoords && typeof document !== "undefined" ? createPortal(
                  <div style={{ position: "absolute", top: menuCoords.top, left: menuCoords.left }} className="z-50 w-52 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectionMode(true);
                        setShowMenu(false);
                      }}
                      disabled={items.length === 0}
                      className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Select items
                    </button>
                  </div>,
                  document.body
                ) : null}
              </div>
          </div>
        </div>

        

        {loading ? (
          <PageLoader text="Loading archive..." />
        ) : error ? (
          <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
        ) : (
          <section className="card p-6">
            <div className="flex items-center justify-between mb-3">
              {selectionMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedIds([]);
                  }}
                  title="Cancel selection"
                  className="inline-flex items-center justify-center rounded-full bg-white/0 px-3 py-1 text-xl font-semibold text-slate-900 hover:text-slate-700"
                >
                  ✕
                </button>
              ) : (
                <h2 className="text-xl font-semibold text-slate-900">Archived items</h2>
              )}
              {selectionMode && items.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <span>Select all</span>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === items.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
              )}
            </div>
            {items.length === 0 ? (
              <EmptyState
                icon="🗄️"
                title="No archived items"
                subtitle="Archived items will appear here once they are archived."
              />
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item._id} className="relative rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    {selectionMode && (
                      <div className="absolute right-4 top-4">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item._id)}
                            onChange={() => {
                              setSelectedIds((prev) =>
                                prev.includes(item._id)
                                  ? prev.filter((id) => id !== item._id)
                                  : [...prev, item._id]
                              );
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                        </label>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{item.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{item.subtitle}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{item.label}</span>
                    </div>
                    {item.description && (
                      <p className="mt-3 text-sm leading-relaxed text-slate-700">{item.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      {item.updatedAt && <span>{formatDate(item.updatedAt)}</span>}
                      {item.deletedAt && <span>Deleted {formatDate(item.deletedAt)}</span>}
                      {item.archived && <span>Archived</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </MainLayout>
  );
}
