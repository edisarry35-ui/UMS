import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import axios from "../api/axios";
import { Alert, EmptyState, PageLoader, SectionHeader, Badge, ConfirmModal } from "../components/ui";
import { formatDate, decodeToken } from "../utils/helpers";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const isAdminOrStaff = auth?.role === "admin" || auth?.role === "staff";
  const [announcements, setAnnouncements] = useState([]);
  const [pendingAnnouncements, setPendingAnnouncements] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [confirmTrashOpen, setConfirmTrashOpen] = useState(false);
  const [selectedNotificationToTrash, setSelectedNotificationToTrash] = useState(null);
  const [undoNotification, setUndoNotification] = useState(null);
  const [undoTimerId, setUndoTimerId] = useState(null);
  const [dismissedApprovalIds, setDismissedApprovalIds] = useState([]);
  const [trashedApprovalNotifications, setTrashedApprovalNotifications] = useState([]);
  const [notificationPage, setNotificationPage] = useState(1);
  const NOTIFICATIONS_PER_PAGE = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const LOCAL_TRASH_STORAGE_KEY = "trashedApprovalNotifications";

  const loadLocalTrashedApprovalNotifications = () => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_TRASH_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const saveLocalTrashedApprovalNotifications = (items) => {
    localStorage.setItem(LOCAL_TRASH_STORAGE_KEY, JSON.stringify(items));
    setTrashedApprovalNotifications(items);
  };

  const getCurrentUserId = () => {
    const token = auth?.token || localStorage.getItem("token");
    const decoded = decodeToken(token);
    return decoded?.id;
  };

  useEffect(() => {
    const localTrash = loadLocalTrashedApprovalNotifications();
    setTrashedApprovalNotifications(localTrash);

    const refreshNotifications = async () => {
      await fetchAnnouncements();
      if (auth?.role === "admin" || auth?.role === "staff") {
        await Promise.all([fetchPendingAnnouncements(), fetchPendingTransactions()]);
      }
      await fetchUserNotifications();
    };

    refreshNotifications();
    const interval = setInterval(refreshNotifications, 20000);
    window.addEventListener("refreshNotifications", refreshNotifications);
    window.addEventListener("refreshCounts", refreshNotifications);

    return () => {
      clearInterval(interval);
      window.removeEventListener("refreshNotifications", refreshNotifications);
      window.removeEventListener("refreshCounts", refreshNotifications);
    };
  }, [auth?.role]);

  useEffect(() => {
    const seen = JSON.parse(localStorage.getItem("seenAnnouncements") || "[]");
    const unreadAnnouncements = (announcements || []).filter(a => !seen.includes(a._id)).length;
    const unreadNotifications = (notifications || []).filter(n => n.status !== "read").length;
    setUnreadCount(unreadAnnouncements + unreadNotifications);
  }, [announcements, notifications]);

  useEffect(() => {
    if (!announcements.length) return;
    const params = new URLSearchParams(window.location.search || "");
    const focusId = params.get("focus");
    if (focusId) {
      const el = document.getElementById(`ann-${focusId}`);
      if (el) {
        setTimeout(() => {
          try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
          el.classList.add("ring-2", "ring-primary-400", "ring-offset-2");
          setTimeout(() => el.classList.remove("ring-2", "ring-primary-400", "ring-offset-2"), 2500);
        }, 120);
        handleMarkRead(focusId);
      }
    }
  }, [announcements]);

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get("/announcements");
      setAnnouncements(res.data);
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingAnnouncements = async () => {
    try {
      const res = await axios.get("/announcements/pending");
      setPendingAnnouncements(res.data);
    } catch (err) {
      console.error("Failed to fetch pending:", err);
    }
  };

  const fetchPendingTransactions = async () => {
    try {
      const res = await axios.get("/transactions?status=pending");
      setPendingTransactions(res.data);
    } catch (err) {
      console.error("Failed to fetch pending transactions:", err);
    }
  };


  const fetchUserNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const userId = getCurrentUserId();
      if (!userId) {
        setNotifications([]);
        return;
      }
      const res = await axios.get(`/notifications?userId=${userId}&archived=false&deleted=false`);
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await axios.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((notification) => notification._id === id ? { ...notification, status: "read" } : notification));
      try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleTrashNotification = async () => {
    if (!selectedNotificationToTrash) return;
    const trashedNotification = selectedNotificationToTrash;

    try {
      // If this is a synthetic approval notification (client-only), dismiss locally
      if (String(trashedNotification._id).startsWith("__")) {
        const localTrashItem = {
          ...trashedNotification,
          type: "notification",
          label: "Notification",
          subtitle: trashedNotification.notificationType === "announcement-approval" ? "Announcement approval" : "Payment approval",
          description: trashedNotification.message,
          deletedAt: new Date().toISOString(),
          isLocalTrash: true,
        };
        const updatedLocalTrash = [...trashedApprovalNotifications, localTrashItem];
        saveLocalTrashedApprovalNotifications(updatedLocalTrash);
        setDismissedApprovalIds((prev) => [...prev, trashedNotification._id]);
        setConfirmTrashOpen(false);
        setActiveMenuId(null);
        setSelectedNotificationToTrash(null);
        setUndoNotification(trashedNotification);
        if (undoTimerId) clearTimeout(undoTimerId);
        const timerId = setTimeout(() => {
          setUndoNotification(null);
          setUndoTimerId(null);
        }, 5000);
        setUndoTimerId(timerId);
        setError(null);
        setSuccess("Notification moved to trash.");
        setTimeout(() => setSuccess(null), 3000);
        try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
        try { window.dispatchEvent(new Event("refreshNotifications")); } catch {}
        return;
      }

      // Otherwise perform backend soft-delete
      await axios.delete(`/notifications/${trashedNotification._id}`);
      await fetchUserNotifications();
      setConfirmTrashOpen(false);
      setActiveMenuId(null);
      setSelectedNotificationToTrash(null);
      setUndoNotification(trashedNotification);
      if (undoTimerId) {
        clearTimeout(undoTimerId);
      }
      const timerId = setTimeout(() => {
        setUndoNotification(null);
        setUndoTimerId(null);
      }, 5000);
      setUndoTimerId(timerId);
      setError(null);
      setSuccess("Notification moved to trash.");
      setTimeout(() => setSuccess(null), 3000);
      try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
      try { window.dispatchEvent(new Event("refreshNotifications")); } catch {}
    } catch (err) {
      console.error("Failed to move notification to trash:", err);
      setError("Unable to move notification to trash. Please try again.");
    }
  };

  const handleUndoTrash = async () => {
    if (!undoNotification) return;
    try {
      const id = String(undoNotification._id || "");
      // If synthetic approval notification, restore locally
      if (id.startsWith("__")) {
        setDismissedApprovalIds((prev) => prev.filter((x) => x !== id));
        const updatedLocalTrash = trashedApprovalNotifications.filter((item) => item._id !== id);
        saveLocalTrashedApprovalNotifications(updatedLocalTrash);
        setUndoNotification(null);
        if (undoTimerId) {
          clearTimeout(undoTimerId);
          setUndoTimerId(null);
        }
        setSuccess("Notification restored.");
        setTimeout(() => setSuccess(null), 3000);
        try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
        try { window.dispatchEvent(new Event("refreshNotifications")); } catch {}
        return;
      }

      const res = await axios.put(`/notifications/${undoNotification._id}/restore`);
      await fetchUserNotifications();
      setUndoNotification(null);
      if (undoTimerId) {
        clearTimeout(undoTimerId);
        setUndoTimerId(null);
      }
      setSuccess("Notification restored.");
      setTimeout(() => setSuccess(null), 3000);
      try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
      try { window.dispatchEvent(new Event("refreshNotifications")); } catch {}
    } catch (err) {
      console.error("Failed to restore notification:", err);
      setError("Unable to undo notification trash. Please try again.");
    }
  };

  const handleClearUndo = () => {
    if (undoTimerId) {
      clearTimeout(undoTimerId);
      setUndoTimerId(null);
    }
    setUndoNotification(null);
  };

  const handleOpenTrashConfirmation = (notification) => {
    setSelectedNotificationToTrash(notification);
    setConfirmTrashOpen(true);
    setActiveMenuId(null);
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (notification.status !== "read") {
        await handleMarkNotificationRead(notification._id);
      }
    } catch (err) {
      console.warn("Unable to mark notification as read before redirect:", err);
    }

    const announcementId = notification?.metadata?.announcementId;
    if (announcementId) {
      navigate(`/announcements?focus=${announcementId}`);
      return;
    }

    if (notification.type === "announcement") {
      navigate("/announcements");
      return;
    }
  };
 

  const handleRejectTransaction = async (id) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;

    try {
      const username = localStorage.getItem("username") || "Admin";
      await axios.put(`/transactions/${id}/reject`, { confirmedBy: username, rejectionReason: reason });
      setSuccess("Payment rejected!");
      setTimeout(() => setSuccess(null), 3000);
      fetchPendingTransactions();
      try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
      try { window.dispatchEvent(new Event("refreshNotifications")); } catch {}
    } catch (err) {
      setError("Failed to reject payment transaction");
    }
  };

  const handleMarkRead = (id) => {
    try {
      const seen = JSON.parse(localStorage.getItem("seenAnnouncements") || "[]");
      if (!seen.includes(id)) {
        seen.push(id);
        localStorage.setItem("seenAnnouncements", JSON.stringify(seen));
      }
      try { window.dispatchEvent(new Event("seenAnnouncementsChanged")); } catch {}
      setUnreadCount(u => Math.max(0, u - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      if (auth?.role === "student") {
        const unreadIds = (notifications || []).filter((notification) => notification.status !== "read").map((notification) => notification._id);
        await Promise.all(unreadIds.map((id) => axios.put(`/notifications/${id}/read`)));
        setNotifications((prev) => prev.map((notification) => ({ ...notification, status: "read" })));
        setUnreadCount(0);
        try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
        try { window.dispatchEvent(new Event("refreshNotifications")); } catch {}
        return;
      }

      // For admin/staff: mark all notifications as read
      const unreadNotificationIds = (notifications || []).filter((notification) => notification.status !== "read").map((notification) => notification._id);
      if (unreadNotificationIds.length > 0) {
        await Promise.all(unreadNotificationIds.map((id) => axios.put(`/notifications/${id}/read`)));
        setNotifications((prev) => prev.map((notification) => ({ ...notification, status: "read" })));
      }

      // Mark announcements and transactions as seen
      const seen = JSON.parse(localStorage.getItem("seenAnnouncements") || "[]");
      const allAnnounceIds = [...announcements.map(ann => ann._id), ...pendingAnnouncements.map(ann => ann._id)];
      const newSeen = [...new Set([...seen, ...allAnnounceIds])];
      localStorage.setItem("seenAnnouncements", JSON.stringify(newSeen));
      
      setUnreadCount(0);
      try { window.dispatchEvent(new Event("seenAnnouncementsChanged")); } catch {}
      try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
      try { window.dispatchEvent(new Event("refreshNotifications")); } catch {}
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleMenuItemClick = (item) => {
    if (item === "home") navigate("/home");
  };

  const pendingAnnouncementNotifications = isAdminOrStaff && pendingAnnouncements.length > 0
    ? pendingAnnouncements.map((ann) => ({
        _id: `__pending-announcement-${ann._id}`,
        announcementId: ann._id,
        isApprovalNotification: true,
        notificationType: "announcement-approval",
        title: `Announcement pending approval: ${ann.title}`,
        message: ann.content ? ann.content.substring(0, 100) + (ann.content.length > 100 ? "..." : "") : "No content",
        createdAt: new Date().toISOString(),
      }))
    : [];

  const pendingPaymentNotification = isAdminOrStaff && pendingTransactions.length > 0
    ? {
        _id: "__pending-payments",
        isApprovalNotification: true,
        title: `${pendingTransactions.length} payment approval${pendingTransactions.length === 1 ? "" : "s"} pending`,
        message: `${pendingTransactions.length} payment${pendingTransactions.length === 1 ? " is" : "s are"} waiting for confirmation.`,
        createdAt: new Date().toISOString(),
      }
    : null;

  const approvalNotifications = [...pendingAnnouncementNotifications, pendingPaymentNotification].filter(Boolean);
  const trashedApprovalIds = trashedApprovalNotifications.map((item) => item._id);
  const displayedApprovalNotifications = approvalNotifications.filter((n) => !dismissedApprovalIds.includes(n._id) && !trashedApprovalIds.includes(n._id));
  
  // Merge all notifications and sort by date (newest first)
  // Prioritize recent approval/rejection actions at the top
  const allNotifications = [...displayedApprovalNotifications, ...notifications];
  const displayedNotifications = allNotifications.sort((a, b) => {
    // Sort by creation date (newest first)
    const aDate = new Date(a.createdAt || 0).getTime();
    const bDate = new Date(b.createdAt || 0).getTime();
    return bDate - aDate;
  });
  const totalPages = Math.max(1, Math.ceil(displayedNotifications.length / NOTIFICATIONS_PER_PAGE));
  const displayedPageNotifications = displayedNotifications.slice((notificationPage - 1) * NOTIFICATIONS_PER_PAGE, notificationPage * NOTIFICATIONS_PER_PAGE);

  useEffect(() => {
    if (notificationPage > totalPages) {
      setNotificationPage(totalPages);
    }
  }, [notificationPage, totalPages]);

  return (
    <MainLayout user={{ name: auth?.role }} onMenuItemClick={handleMenuItemClick}>
      <div className="page-content">
        <div className="mb-8 rounded-3xl border border-white/15 bg-white/10 py-4 px-6 shadow-card backdrop-blur-xl md:py-5 md:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/20 px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-sm shadow-slate-900/10">
              Notifications
            </span>
            {/* unread count badge removed per design request */}
          </div>
        </div>

        {error && <Alert type="error" onClose={() => setError(null)} className="mb-4">{error}</Alert>}
        {success && <Alert type="success" onClose={() => setSuccess(null)} className="mb-4">{success}</Alert>}
        {undoNotification && (
          <Alert type="success" onClose={handleClearUndo} className="mb-4 flex items-center justify-between gap-2">
            <span>Notification moved to trash.</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndoTrash}
                className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
              >
                Undo
              </button>
            </div>
          </Alert>
        )}

        <div className="card mb-6">
          {loadingNotifications ? (
            <PageLoader text="Loading notifications..." />
          ) : (
            <div className="space-y-2">
              <div className="flex justify-end px-3 pt-3 pb-2">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="rounded-full bg-slate-100 text-slate-900 px-3 py-1.5 text-sm font-semibold hover:bg-slate-200 transition"
                >
                  Mark all read
                </button>
              </div>

              {displayedNotifications.length === 0 ? (
                <EmptyState icon="📭" title="No notifications yet" subtitle="You will see updates here." />
              ) : (
                displayedPageNotifications.map((notification) => {
                  if (notification.isApprovalNotification) {
                    const borderClass = notification.notificationType === "announcement-approval"
                      ? "border-blue-200 dark:border-blue-700"
                      : "border-amber-200 dark:border-amber-700";
                    
                    const bgClass = notification.notificationType === "announcement-approval"
                      ? "bg-blue-50/60 dark:bg-blue-900/30"
                      : "bg-amber-50/60 dark:bg-amber-900/30";
                    
                    const buttonBgClass = notification.notificationType === "announcement-approval"
                      ? "bg-blue-200 text-blue-900 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-300 dark:hover:bg-blue-900/70"
                      : "bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300 hover:bg-amber-300 dark:hover:bg-amber-900/70";
                    
                    return (
                      <div
                        key={notification._id}
                        onClick={() => {
                          if (notification.notificationType === "announcement-approval") {
                            // route to Permissions page focused on the specific announcement
                            navigate(`/permissions?focus=ann-${notification.announcementId}`);
                          } else {
                            // route to Permissions page for payments
                            navigate(`/permissions?focus=payments`);
                          }
                        }}
                        className={`relative overflow-visible p-4 rounded-xl border ${borderClass} ${bgClass} cursor-pointer`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 dark:text-white">{notification.title}</h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{notification.message}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === notification._id ? null : notification._id);
                              }}
                              aria-label="Notification options"
                            >
                              ⋯
                            </button>
                          </div>
                        </div>
                        {activeMenuId === notification._id && (
                          <div className="absolute right-4 top-full z-50 mt-2 w-40 rounded-2xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            <button
                              type="button"
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTrashConfirmation(notification);
                              }}
                            >
                              Move to trash
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={notification._id} 
                      onClick={() => handleNotificationClick(notification)}
                      className="relative overflow-visible p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{notification.message}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatDate(notification.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === notification._id ? null : notification._id);
                            }}
                            aria-label="Notification options"
                          >
                            ⋯
                          </button>
                        </div>
                        {activeMenuId === notification._id && (
                          <div className="absolute right-4 top-full z-50 mt-2 w-40 rounded-2xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            <button
                              type="button"
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTrashConfirmation(notification);
                              }}
                            >
                              Move to trash
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {displayedNotifications.length > NOTIFICATIONS_PER_PAGE && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Showing {(notificationPage - 1) * NOTIFICATIONS_PER_PAGE + 1} - {Math.min(notificationPage * NOTIFICATIONS_PER_PAGE, displayedNotifications.length)} of {displayedNotifications.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNotificationPage((prev) => Math.max(1, prev - 1))}
                  disabled={notificationPage === 1}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-700 dark:text-slate-300">Page {notificationPage} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setNotificationPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={notificationPage === totalPages}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <ConfirmModal
          open={confirmTrashOpen}
          title="Move notification to trash"
          message="This notification will be moved to trash and removed from your notification list. Do you want to continue?"
          confirmLabel="Move to trash"
          danger={true}
          onClose={() => setConfirmTrashOpen(false)}
          onConfirm={handleTrashNotification}
        />
      </div>
    </MainLayout>
  );
}
