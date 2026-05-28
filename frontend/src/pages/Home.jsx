import React, { useState, useEffect, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import AddUserModal from "../components/modals/AddUserModal";
import BulkImportModal from "../components/modals/BulkImportModal";
import AddAnnouncementModal from "../components/modals/AddAnnouncementModal";
import DraftsModal from "../components/modals/DraftsModal";
import { Alert, EmptyState, PageLoader } from "../components/ui";
import AnnouncementCard from "../components/AnnouncementCard";
import axios from "../api/axios";
import { decodeToken } from "../utils/helpers";

export default function Home() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [announcements, setAnnouncements] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showAddAnnouncementModal, setShowAddAnnouncementModal] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const menuBtnRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const tokenPayload = decodeToken(localStorage.getItem("token"));
  const currentUserId = tokenPayload?.id;
  const currentUsername = localStorage.getItem("username");

  const handleMenuItemClick = (item) => {
    if (item === "home") navigate("/home");
    else if (item === "addUser") setShowAddUserModal(true);
  };

  useEffect(() => {
    if (location.pathname === "/home" && auth?.role) {
      const params = new URLSearchParams(location.search);
      if (params.get("addUser")) return;
      if (auth.role === "admin") navigate("/admin");
      else if (auth.role === "staff") navigate("/staff");
      else if (auth.role === "student") navigate("/student");
    }
  }, [auth?.role, location.pathname, location.search, navigate]);

  useEffect(() => { fetchAnnouncements(); }, []);

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
      }
    }
  }, [announcements]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get("addUser")) setShowAddUserModal(true);
    } catch {}
  }, [location.search]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/announcements");
      const announcementData = res.data || [];
      setAnnouncements(announcementData);
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async (announcementId) => {
    try {
      const res = await axios.put(`/announcements/${announcementId}/react`);
      setAnnouncements((prev) =>
        prev.map((ann) =>
          String(ann._id) === String(announcementId)
            ? { ...ann, likes: res.data.likes, comments: res.data.comments }
            : ann
        )
      );
    } catch (err) {
      console.error("Failed to toggle announcement like:", err);
    }
  };

  const handleAddComment = async (announcementId, text) => {
    try {
      const res = await axios.post(`/announcements/${announcementId}/comments`, { text });
      setAnnouncements((prev) =>
        prev.map((ann) =>
          String(ann._id) === String(announcementId)
            ? { ...ann, likes: res.data.likes, comments: res.data.comments }
            : ann
        )
      );
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to post comment";
      console.error("Failed to post announcement comment:", message);
      throw new Error(message);
    }
  };

  const handleAddReply = async (announcementId, commentId, text) => {
    try {
      const res = await axios.post(`/announcements/${announcementId}/comments/${commentId}/replies`, { text });
      setAnnouncements((prev) =>
        prev.map((ann) =>
          String(ann._id) === String(announcementId)
            ? { ...ann, likes: res.data.likes, comments: res.data.comments }
            : ann
        )
      );
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to post reply";
      console.error("Failed to post announcement reply:", message);
      throw new Error(message);
    }
  };

  const handleEditComment = async (announcementId, commentId, text) => {
    try {
      const res = await axios.put(`/announcements/${announcementId}/comments/${commentId}`, { text });
      setAnnouncements((prev) =>
        prev.map((ann) =>
          String(ann._id) === String(announcementId)
            ? { ...ann, likes: res.data.likes, comments: res.data.comments }
            : ann
        )
      );
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to edit comment";
      console.error("Failed to edit announcement comment:", message);
      throw new Error(message);
    }
  };

  const handleDeleteComment = async (announcementId, commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      const res = await axios.delete(`/announcements/${announcementId}/comments/${commentId}`);
      setAnnouncements((prev) =>
        prev.map((ann) =>
          String(ann._id) === String(announcementId)
            ? { ...ann, likes: res.data.likes, comments: res.data.comments }
            : ann
        )
      );
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to delete comment";
      console.error("Failed to delete announcement comment:", message);
      throw new Error(message);
    }
  };

  const handleEditReply = async (announcementId, commentId, replyId, text) => {
    try {
      const res = await axios.put(`/announcements/${announcementId}/comments/${commentId}/replies/${replyId}`, { text });
      setAnnouncements((prev) =>
        prev.map((ann) =>
          String(ann._id) === String(announcementId)
            ? { ...ann, likes: res.data.likes, comments: res.data.comments }
            : ann
        )
      );
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to edit reply";
      console.error("Failed to edit announcement reply:", message);
      throw new Error(message);
    }
  };

  const handleDeleteReply = async (announcementId, commentId, replyId) => {
    if (!window.confirm("Are you sure you want to delete this reply?")) return;
    try {
      const res = await axios.delete(`/announcements/${announcementId}/comments/${commentId}/replies/${replyId}`);
      setAnnouncements((prev) =>
        prev.map((ann) =>
          String(ann._id) === String(announcementId)
            ? { ...ann, likes: res.data.likes, comments: res.data.comments }
            : ann
        )
      );
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to delete reply";
      console.error("Failed to delete announcement reply:", message);
      throw new Error(message);
    }
  };

  const handleEditAnnouncement = async (announcementId, title, content) => {
    try {
      const res = await axios.put(`/announcements/${announcementId}`, { title, content });
      setAnnouncements(prev => prev.map(ann => ann._id === announcementId ? res.data : ann));
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to edit announcement";
      console.error("Failed to edit announcement:", message);
      throw new Error(message);
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await axios.delete(`/announcements/${announcementId}`);
      setAnnouncements(prev => prev.filter(ann => ann._id !== announcementId));
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to delete announcement";
      console.error("Failed to delete announcement:", message);
      throw new Error(message);
    }
  };

  const handlePublishAnnouncement = async (announcementId) => {
    try {
      const res = await axios.put(`/announcements/${announcementId}/publish`);
      setAnnouncements(prev => prev.map(ann => ann._id === announcementId ? res.data : ann));
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to publish announcement";
      console.error("Failed to publish announcement:", message);
      throw new Error(message);
    }
  };

  const approvedAnnouncements = announcements.filter(ann => ann.status === "approved");

  return (
    <MainLayout user={{ name: auth?.role }} onMenuItemClick={handleMenuItemClick}>
      {showAddUserModal && (
        <AddUserModal onClose={() => setShowAddUserModal(false)} onSuccess={() => { setShowAddUserModal(false); fetchAnnouncements(); }} onBulkImport={() => { setShowAddUserModal(false); setShowBulkImportModal(true); }} />
      )}
      {showBulkImportModal && (
        <BulkImportModal onClose={() => setShowBulkImportModal(false)} onSuccess={() => { setShowBulkImportModal(false); fetchAnnouncements(); }} />
      )}
      {showAddAnnouncementModal && (
        <AddAnnouncementModal onClose={() => setShowAddAnnouncementModal(false)} onSuccess={() => { setShowAddAnnouncementModal(false); fetchAnnouncements(); }} />
      )}
      {showDraftsModal && (
        <DraftsModal
          announcements={announcements}
          currentUserId={currentUserId}
          currentUserRole={auth.role}
          currentUsername={currentUsername}
          onClose={() => setShowDraftsModal(false)}
          onToggleLike={handleToggleLike}
          onAddComment={handleAddComment}
          onAddReply={handleAddReply}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onEditReply={handleEditReply}
          onDeleteReply={handleDeleteReply}
          onEditAnnouncement={handleEditAnnouncement}
          onDeleteAnnouncement={handleDeleteAnnouncement}
          onPublishAnnouncement={handlePublishAnnouncement}
        />
      )}

      <div className="page-content">
        <div className="mb-8 rounded-3xl border border-white/15 bg-white/10 py-4 px-6 shadow-card backdrop-blur-xl md:py-5 md:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <div className="inline-flex items-center rounded-full border border-white/20 bg-white/20 px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-sm shadow-slate-900/10">
                  Announcements
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 overflow-visible">
              {(auth?.role === "admin" || auth?.role === "staff") && (
                <div className="relative z-0">
                  <button
                    type="button"
                    ref={menuBtnRef}
                    className="inline-flex items-center justify-center p-2 rounded-full bg-transparent border border-transparent text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/25"
                    onClick={() => {
                      if (!showMenuDropdown) {
                        const r = menuBtnRef.current?.getBoundingClientRect();
                        setMenuPos(r);
                      }
                      setShowMenuDropdown(!showMenuDropdown);
                    }}
                    aria-label="More options"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </button>

                  {showMenuDropdown && menuPos && createPortal(
                    <>
                      <div className="fixed inset-0" onClick={() => setShowMenuDropdown(false)} />
                      <div
                        className="bg-white dark:bg-slate-900 rounded-xl shadow-modal border border-slate-100 dark:border-slate-800"
                        style={{
                          position: 'fixed',
                          left: Math.min(Math.max(menuPos.left + menuPos.width - 200, 8), window.innerWidth - 208) + 'px',
                          top: (menuPos.bottom + 8) + 'px',
                          zIndex: 9999,
                          minWidth: 160
                        }}
                      >
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                          onClick={() => { setShowMenuDropdown(false); setShowDraftsModal(true); }}
                        >
                          Drafts
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                          onClick={() => { setShowMenuDropdown(false); setShowAddAnnouncementModal(true); }}
                        >
                          New Announcement
                        </button>
                      </div>
                    </>,
                    document.body
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <Alert type="error" onClose={() => setError(null)} className="mb-4">{error}</Alert>}
        {success && <Alert type="success" onClose={() => setSuccess(null)} className="mb-4">{success}</Alert>}

        {loading ? (
          <PageLoader text="Loading announcements..." />
        ) : announcements.filter(ann => ann.status === "approved").length === 0 ? (
          <EmptyState icon="📭" title="No announcements yet" subtitle="Check back later for updates from your school." />
        ) : (
          <>
            <div className="space-y-4 animate-fade-in">
              {approvedAnnouncements
                .slice(0, showAllAnnouncements ? approvedAnnouncements.length : 5)
                .map((ann) => {
                  const annKey = String(ann._id);
                  return (
                    <AnnouncementCard
                      key={annKey}
                      announcement={ann}
                      reaction={ann}
                      currentUserId={currentUserId}
                      currentUserRole={auth.role}
                      currentUsername={currentUsername}
                      onToggleLike={handleToggleLike}
                      onAddComment={handleAddComment}
                      onAddReply={handleAddReply}
                      onEditComment={handleEditComment}
                      onDeleteComment={handleDeleteComment}
                      onEditReply={handleEditReply}
                      onDeleteReply={handleDeleteReply}
                      onEditAnnouncement={handleEditAnnouncement}
                      onDeleteAnnouncement={handleDeleteAnnouncement}
                      onPublishAnnouncement={handlePublishAnnouncement}
                    />
                  );
                })}
            </div>
            {announcements.filter(ann => ann.status === "approved").length > 5 && (
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAllAnnouncements(!showAllAnnouncements)}
                >
                  {showAllAnnouncements ? "Show less" : "See more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
