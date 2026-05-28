import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import axios from "../api/axios";
import { Alert, EmptyState, PageLoader, SectionHeader, Badge } from "../components/ui";

export default function AdminApprovalsPage() {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [pendingAnnouncements, setPendingAnnouncements] = useState([]);
  const [approvedAnnouncements, setApprovedAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (auth?.role && auth.role !== "admin") { navigate("/home"); return; }
    fetchPendingAnnouncements();
  }, [auth, navigate]);

  useEffect(() => {
    if (!pendingAnnouncements.length) return;
    const params = new URLSearchParams(window.location.search || "");
    const focusId = params.get("focus");
    if (focusId) {
      const el = document.getElementById(`pending-ann-${focusId}`);
      if (el) {
        setTimeout(() => {
          try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
          el.classList.add("ring-2", "ring-primary-400", "ring-offset-2");
          setTimeout(() => el.classList.remove("ring-2", "ring-primary-400", "ring-offset-2"), 2500);
        }, 120);
      }
    }
  }, [pendingAnnouncements]);

  const fetchPendingAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/announcements/pending");
      setPendingAnnouncements(res.data || []);
    } catch (err) {
      setError("Failed to load pending announcements");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const username = localStorage.getItem("username") || "Admin";
      const res = await axios.put(`/announcements/${id}/approve`, { approvedBy: username });
      setSuccess("Announcement approved and published!");
      setApprovedAnnouncements((prev) => [res.data, ...prev]);
      setTimeout(() => setSuccess(null), 3000);
      fetchPendingAnnouncements();
    } catch (err) {
      setError("Failed to approve announcement");
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.put(`/announcements/${id}/reject`);
      setSuccess("Announcement rejected.");
      setTimeout(() => setSuccess(null), 3000);
      fetchPendingAnnouncements();
    } catch (err) {
      setError("Failed to reject announcement");
    }
  };

  return (
    <MainLayout user={{ name: "Admin" }} onMenuItemClick={(item) => { if (item === "home") navigate("/home"); }}>
      <div className="page-content">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/home")} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors text-sm">←</button>
          <div>
            <h1 className="page-title mb-0">Pending Approvals</h1>
            <p className="page-subtitle">Review and approve staff announcements</p>
          </div>
        </div>

        {error && <Alert type="error" onClose={() => setError(null)} className="mb-4">{error}</Alert>}
        {success && <Alert type="success" onClose={() => setSuccess(null)} className="mb-4">{success}</Alert>}

        <div className="card">
          <SectionHeader title={`Pending Announcements (${pendingAnnouncements.length})`} />
          {loading ? (
            <PageLoader text="Loading pending announcements..." />
          ) : pendingAnnouncements.length === 0 ? (
            <EmptyState icon="✅" title="All caught up!" subtitle="There are no pending announcements to review." />
          ) : (
            <div className="space-y-4">
              {pendingAnnouncements.map((ann) => (
                <div key={ann._id} id={`pending-ann-${ann._id}`} className="p-5 bg-blue-50 border border-blue-200 rounded-xl animate-fade-in transition-all">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-display font-semibold text-slate-900">{ann.title}</h4>
                    <Badge variant="blue">Pending</Badge>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">{ann.content}</p>
                  <p className="text-xs text-slate-400 mb-4">Submitted by <span className="font-medium">{ann.author}</span></p>
                  <div className="flex items-center gap-2">
                    <button className="btn-success" onClick={() => handleApprove(ann._id)}>Approve & Publish</button>
                    <button className="btn-danger" onClick={() => handleReject(ann._id)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {approvedAnnouncements.length > 0 && (
            <div className="mt-6">
              <SectionHeader title={`Recently Approved (${approvedAnnouncements.length})`} />
              <div className="space-y-4">
                {approvedAnnouncements.map((ann) => (
                  <div key={ann._id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-950 dark:border-slate-700">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="font-display font-semibold text-slate-900 dark:text-slate-100">{ann.title}</h4>
                      <Badge variant="green">Approved</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{ann.content}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Approved by <span className="font-medium">{ann.approvedBy || "Admin"}</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
