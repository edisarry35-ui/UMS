import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import axios from "../api/axios";
import { Alert, EmptyState, PageLoader, SectionHeader, Badge } from "../components/ui";
import { formatDate } from "../utils/helpers";

const statusTabs = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" }
];

const announcementStatusMap = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected"
};

const transactionStatusMap = {
  pending: "pending",
  approved: "confirmed",
  rejected: "rejected"
};

export default function PermissionsPage() {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [announcements, setAnnouncements] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [markAllReadLoading, setMarkAllReadLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!auth?.token) {
      setLoading(false);
      return;
    }
    if (auth.role && auth.role !== "admin") {
      navigate("/home");
      return;
    }
    if (auth.role === "admin") {
      loadApprovals(selectedStatus);
      loadStatusCounts();
    }
  }, [auth, navigate, selectedStatus]);

  useEffect(() => {
    if (auth?.role !== "admin") return;
    const refreshApprovals = () => {
      loadApprovals(selectedStatus);
      loadStatusCounts();
    };

    const interval = setInterval(refreshApprovals, 20000);
    window.addEventListener("refreshPermissions", refreshApprovals);
    window.addEventListener("refreshCounts", refreshApprovals);
    window.addEventListener("refreshNotifications", refreshApprovals);

    return () => {
      clearInterval(interval);
      window.removeEventListener("refreshPermissions", refreshApprovals);
      window.removeEventListener("refreshCounts", refreshApprovals);
      window.removeEventListener("refreshNotifications", refreshApprovals);
    };
  }, [auth?.role, selectedStatus]);

  const loadApprovals = async (status) => {
    if (!auth?.token) return;
    setLoading(true);
    setError(null);
    try {
      const [annRes, txRes] = await Promise.all([
        axios.get(`/announcements?status=${announcementStatusMap[status]}`),
        axios.get(`/transactions?status=${transactionStatusMap[status]}`)
      ]);
      setAnnouncements(annRes.data || []);
      setTransactions(txRes.data || []);
    } catch (err) {
      if (err.response?.status !== 403) {
        setError("Failed to load approval requests.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getSeenAnnouncementIds = () => {
    try {
      return JSON.parse(localStorage.getItem("seenAnnouncements") || "[]");
    } catch {
      return [];
    }
  };

  const loadStatusCounts = async () => {
    if (!auth?.token) return;
    try {
      const counts = { pending: 0, approved: 0, rejected: 0 };
      const seenAnnouncements = getSeenAnnouncementIds();

      await Promise.all(statusTabs.map(async (tab) => {
        const [annRes, txRes] = await Promise.all([
          axios.get(`/announcements?status=${announcementStatusMap[tab.value]}`),
          axios.get(`/transactions?status=${transactionStatusMap[tab.value]}`)
        ]);
        const announcementData = annRes.data || [];
        const transactionData = txRes.data || [];

        if (tab.value === "approved" || tab.value === "rejected") {
          counts[tab.value] = announcementData.filter((ann) => !seenAnnouncements.includes(ann._id)).length;
        } else {
          counts[tab.value] = announcementData.length + transactionData.length;
        }
      }));
      setStatusCounts(counts);
    } catch (err) {
      console.warn("Failed to load status counts:", err);
    }
  };

  const markAnnouncementsAsSeen = (announcementIds = []) => {
    try {
      const seen = JSON.parse(localStorage.getItem("seenAnnouncements") || "[]");
      const newSeen = Array.from(new Set([...seen, ...announcementIds]));
      localStorage.setItem("seenAnnouncements", JSON.stringify(newSeen));
      try { window.dispatchEvent(new Event("seenAnnouncementsChanged")); } catch {}
    } catch (err) {
      console.warn("Failed to mark announcements as seen:", err);
    }
  };

  const handleApproveAnnouncement = async (id) => {
    try {
      const username = localStorage.getItem("username") || "Admin";
      await axios.put(`/announcements/${id}/approve`, { approvedBy: username });
      markAnnouncementsAsSeen([id]);
      setSuccess("Announcement approved.");
      setTimeout(() => setSuccess(null), 3000);
      loadApprovals(selectedStatus);
      try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
      try { window.dispatchEvent(new Event("refreshPermissions")); } catch {}
    } catch (err) {
      setError("Failed to approve announcement.");
    }
  };

  const handleRejectAnnouncement = async (id) => {
    try {
      await axios.put(`/announcements/${id}/reject`);
      markAnnouncementsAsSeen([id]);
      setSuccess("Announcement rejected.");
      setTimeout(() => setSuccess(null), 3000);
      loadApprovals(selectedStatus);
      try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
      try { window.dispatchEvent(new Event("refreshPermissions")); } catch {}
    } catch (err) {
      setError("Failed to reject announcement.");
    }
  };

  const handleMarkAllRead = () => {
    try {
      setMarkAllReadLoading(true);
      const seen = JSON.parse(localStorage.getItem("seenAnnouncements") || "[]");
      const allIds = announcements.map((ann) => ann._id);
      const newSeen = [...new Set([...seen, ...allIds])];
      localStorage.setItem("seenAnnouncements", JSON.stringify(newSeen));
      if (selectedStatus === "approved" || selectedStatus === "rejected") {
        setStatusCounts((prev) => ({ ...prev, [selectedStatus]: 0 }));
      }
      try { window.dispatchEvent(new Event("seenAnnouncementsChanged")); } catch {}
      try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
      setSuccess("All announcements marked as read.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Failed to mark all as read.");
    } finally {
      setMarkAllReadLoading(false);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedItems([]);
  };

  const toggleItemSelection = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApproveAll = async () => {
    if (!window.confirm("Are you sure you want to approve all pending items?")) return;
    try {
      setLoading(true);
      const username = localStorage.getItem("username") || "Admin";
      const allIds = [...announcements.map((a) => a._id), ...transactions.map((t) => t._id)];
      await Promise.all([
        ...announcements.map((ann) => axios.put(`/announcements/${ann._id}/approve`, { approvedBy: username })),
        ...transactions.map((tx) => axios.put(`/transactions/${tx._id}/confirm`, { confirmedBy: username }))
      ]);
      markAnnouncementsAsSeen(announcements.map((ann) => ann._id));
      setSuccess("All pending items approved.");
      setTimeout(() => setSuccess(null), 3000);
      loadApprovals(selectedStatus);
      try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
      try { window.dispatchEvent(new Event("refreshPermissions")); } catch {}
    } catch (err) {
      setError("Failed to approve all items.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAll = async () => {
    if (!window.confirm("Are you sure you want to reject all pending items?")) return;
    try {
      setLoading(true);
      const username = localStorage.getItem("username") || "Admin";
      await Promise.all([
        ...announcements.map((ann) => axios.put(`/announcements/${ann._id}/reject`)),
        ...transactions.map((tx) => {
          const reason = prompt("Please provide a reason for rejecting this payment:", "");
          if (!reason) throw new Error("Rejection reason required");
          return axios.put(`/transactions/${tx._id}/reject`, { confirmedBy: username, rejectionReason: reason });
        })
      ]);
      markAnnouncementsAsSeen(announcements.map((ann) => ann._id));
      setSuccess("All pending items rejected.");
      setTimeout(() => setSuccess(null), 3000);
      loadApprovals(selectedStatus);
      try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
      try { window.dispatchEvent(new Event("refreshPermissions")); } catch {}
    } catch (err) {
      setError("Failed to reject all items.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSelected = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Are you sure you want to approve ${selectedItems.length} selected items?`)) return;
    try {
      setLoading(true);
      const username = localStorage.getItem("username") || "Admin";
      const selectedAnnouncements = announcements.filter((ann) => selectedItems.includes(ann._id));
      const selectedTransactions = transactions.filter((tx) => selectedItems.includes(tx._id));
      await Promise.all([
        ...selectedAnnouncements.map((ann) => axios.put(`/announcements/${ann._id}/approve`, { approvedBy: username })),
        ...selectedTransactions.map((tx) => axios.put(`/transactions/${tx._id}/confirm`, { confirmedBy: username }))
      ]);
      markAnnouncementsAsSeen(selectedAnnouncements.map((ann) => ann._id));
      setSuccess(`${selectedItems.length} selected items approved.`);
      setTimeout(() => setSuccess(null), 3000);
      setSelectedItems([]);
      loadApprovals(selectedStatus);
      try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
      try { window.dispatchEvent(new Event("refreshPermissions")); } catch {}
    } catch (err) {
      setError("Failed to approve selected items.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSelected = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Are you sure you want to reject ${selectedItems.length} selected items?`)) return;
    try {
      setLoading(true);
      const username = localStorage.getItem("username") || "Admin";
      const selectedAnnouncements = announcements.filter((ann) => selectedItems.includes(ann._id));
      const selectedTransactions = transactions.filter((tx) => selectedItems.includes(tx._id));
      await Promise.all([
        ...selectedAnnouncements.map((ann) => axios.put(`/announcements/${ann._id}/reject`)),
        ...selectedTransactions.map((tx) => {
          const reason = prompt("Please provide a reason for rejecting this payment:", "");
          if (!reason) throw new Error("Rejection reason required");
          return axios.put(`/transactions/${tx._id}/reject`, { confirmedBy: username, rejectionReason: reason });
        })
      ]);
      markAnnouncementsAsSeen(selectedAnnouncements.map((ann) => ann._id));
      setSuccess(`${selectedItems.length} selected items rejected.`);
      setTimeout(() => setSuccess(null), 3000);
      setSelectedItems([]);
      loadApprovals(selectedStatus);
      try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
      try { window.dispatchEvent(new Event("refreshPermissions")); } catch {}
    } catch (err) {
      setError("Failed to reject selected items.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTransaction = async (id) => {
    try {
      const username = localStorage.getItem("username") || "Admin";
      await axios.put(`/transactions/${id}/confirm`, { confirmedBy: username });
      setSuccess("Payment confirmed.");
      setTimeout(() => setSuccess(null), 3000);
      loadApprovals(selectedStatus);
      try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
      try { window.dispatchEvent(new Event("refreshPermissions")); } catch {}
    } catch (err) {
      setError("Failed to confirm payment.");
    }
  };

  const handleRejectTransaction = async (id) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;
    try {
      const username = localStorage.getItem("username") || "Admin";
      await axios.put(`/transactions/${id}/reject`, { confirmedBy: username, rejectionReason: reason });
      setSuccess("Payment rejected.");
      setTimeout(() => setSuccess(null), 3000);
      loadApprovals(selectedStatus);
      try { window.dispatchEvent(new Event("refreshCounts")); } catch {}
      try { window.dispatchEvent(new Event("refreshPermissions")); } catch {}
    } catch (err) {
      setError("Failed to reject payment.");
    }
  };

  useEffect(() => {
    setActionMenuOpen(false);
    setSelectionMode(false);
    setSelectedItems([]);
    setCurrentPage(1);
  }, [selectedStatus]);

  const approvals = React.useMemo(() => {
    const allApprovals = [
      ...announcements.map((ann) => ({ type: "announcement", ...ann })),
      ...transactions.map((tx) => ({ type: "transaction", ...tx }))
    ];

    return allApprovals.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return dateB - dateA;
    });
  }, [announcements, transactions]);

  const paginatedApprovals = approvals.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.max(1, Math.ceil(approvals.length / pageSize));
  const selectedLabel = selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1);
  const totalCount = announcements.length + transactions.length;

  return (
    <MainLayout user={{ name: "Admin" }} onMenuItemClick={(item) => { if (item === "home") navigate("/home"); }}>
      <div className="page-content pt-0">
        <div className="mb-4 rounded-3xl border border-white/15 bg-white/10 py-4 px-6 shadow-card backdrop-blur-xl md:py-5 md:px-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/20 px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-sm shadow-slate-900/10">
                Permissions
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedStatus(tab.value)}
              className={`relative rounded-3xl border px-4 py-3 text-left transition ${selectedStatus === tab.value ? "bg-white text-slate-900 border-white/25 shadow-lg shadow-slate-900/10" : "bg-slate-900/10 text-white/90 border-white/10 hover:bg-slate-900/15"}`}
            >
              <div className="text-xs uppercase tracking-[0.25em] font-semibold">{tab.label}</div>
              {statusCounts[tab.value] > 0 && (
                <span className="absolute right-3 top-3 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-red-500 px-2 text-[10px] font-semibold text-white">
                  {statusCounts[tab.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && <Alert type="error" onClose={() => setError(null)} className="mb-4">{error}</Alert>}
        {success && <Alert type="success" onClose={() => setSuccess(null)} className="mb-4">{success}</Alert>}

        <div className="grid gap-6">
          <div className="card">
            <SectionHeader
              title={`${selectedLabel} Approvals`}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-slate-200 bg-slate-100/80 text-slate-700 hover:bg-slate-100 transition-colors"
                    type="button"
                    onClick={() => loadApprovals(selectedStatus)}
                    aria-label="Refresh approvals"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4.93 4.93a10 10 0 0 1 14.14 0l1.72-1.72M20 11a8 8 0 1 1-1.8-5.3" />
                      <path d="M20 4v4h-4" />
                    </svg>
                  </button>
                  {selectedStatus === "pending" && (
                    <div className="relative">
                      <button
                        className={`px-2 py-1 text-sm rounded-full transition ${totalCount === 0 ? "cursor-not-allowed text-slate-400" : "hover:bg-slate-100"}`}
                        type="button"
                        disabled={totalCount === 0}
                        onClick={() => {
                          if (totalCount === 0) return;
                          setActionMenuOpen((open) => !open);
                        }}
                      >
                        ⋮
                      </button>
                      {actionMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-slate-200 bg-white shadow-lg z-20">
                          {!selectionMode ? (
                            <>
                              <button
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                                onClick={toggleSelectionMode}
                                disabled={totalCount === 0}
                              >
                                Select items
                              </button>
                              <button
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                                onClick={handleApproveAll}
                                disabled={totalCount === 0}
                              >
                                Approve All
                              </button>
                              <button
                                className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-slate-100"
                                onClick={handleRejectAll}
                                disabled={totalCount === 0}
                              >
                                Reject All
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                                onClick={toggleSelectionMode}
                              >
                                Cancel Selection
                              </button>
                              <button
                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                                onClick={handleApproveSelected}
                                disabled={selectedItems.length === 0}
                              >
                                Approve ({selectedItems.length})
                              </button>
                              <button
                                className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-slate-100"
                                onClick={handleRejectSelected}
                                disabled={selectedItems.length === 0}
                              >
                                Reject ({selectedItems.length})
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {selectedStatus !== "pending" && (
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={markAllReadLoading || announcements.length === 0}
                    >
                      {markAllReadLoading ? "Marking read..." : "Mark all as read"}
                    </button>
                  )}
                </div>
              }
            />
            {loading ? (
              <PageLoader text={`Loading ${selectedLabel.toLowerCase()} approvals...`} />
            ) : totalCount === 0 ? (
              <EmptyState icon="✅" title={`No ${selectedLabel.toLowerCase()} approvals`} subtitle="There are no approvals matching this status." />
            ) : (
              <div className="space-y-6">
                {paginatedApprovals.filter((item) => item.type === "announcement").length > 0 && (
                  <div>
                    <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Announcements</div>
                    <div className="space-y-4">
                      {paginatedApprovals
                        .filter((item) => item.type === "announcement")
                        .map((ann) => (
                          <div key={ann._id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl animate-fade-in">
                          {selectionMode && (
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(ann._id)}
                                onChange={() => toggleItemSelection(ann._id)}
                                className="w-4 h-4"
                              />
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-display text-sm font-semibold text-slate-900">{ann.title}</h4>
                            <Badge variant={selectedStatus === "approved" ? "green" : selectedStatus === "rejected" ? "red" : "yellow"}>
                              {selectedStatus === "approved" ? "Approved" : selectedStatus === "rejected" ? "Rejected" : "Pending"}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600 leading-snug mb-2 line-clamp-2">{ann.content}</p>
                          <p className="text-[11px] text-slate-400">
                            Submitted by <span className="font-medium">{ann.author}</span>
                            {selectedStatus === "approved" && ann.approvedBy ? ` • Approved by ${ann.approvedBy}` : ""}
                          </p>
                          {selectedStatus === "pending" && !selectionMode && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              <button className="btn-success px-3 py-1 text-xs" onClick={() => handleApproveAnnouncement(ann._id)}>Approve</button>
                              <button className="btn-danger px-3 py-1 text-xs" onClick={() => handleRejectAnnouncement(ann._id)}>Reject</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {paginatedApprovals.filter((item) => item.type === "transaction").length > 0 && (
                  <div>
                    <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Payments</div>
                    <div className="space-y-4">
                      {paginatedApprovals
                        .filter((item) => item.type === "transaction")
                        .map((tx) => (
                          <div key={tx._id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl animate-fade-in">
                          {selectionMode && (
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(tx._id)}
                                onChange={() => toggleItemSelection(tx._id)}
                                className="w-4 h-4"
                              />
                            </div>
                          )}
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-2">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900">{tx.studentName} • {tx.studentUsn}</h4>
                              <p className="text-[11px] text-slate-700">{tx.paymentType} for {tx.schoolYear} {tx.semester}</p>
                            </div>
                            <Badge variant={selectedStatus === "approved" ? "green" : selectedStatus === "rejected" ? "red" : "yellow"}>
                              {selectedStatus === "approved" ? "Confirmed" : selectedStatus === "rejected" ? "Rejected" : "Pending"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2 text-[11px] text-slate-700">
                            <div><strong className="text-slate-900">Amount:</strong> {tx.amount}</div>
                            <div><strong className="text-slate-900">Uploaded:</strong> {formatDate(tx.createdAt)}</div>
                            <div className="col-span-2 sm:col-span-1"><strong className="text-slate-900">Receipt:</strong> {tx.receiptImage ? "Uploaded" : "None"}</div>
                          </div>
                          {selectedStatus === "pending" && !selectionMode ? (
                            <div className="flex flex-wrap gap-2 mt-1">
                              <button className="btn-success px-3 py-1 text-xs" onClick={() => handleConfirmTransaction(tx._id)}>Confirm</button>
                              <button className="btn-danger px-3 py-1 text-xs" onClick={() => handleRejectTransaction(tx._id)}>Reject</button>
                            </div>
                          ) : selectedStatus === "rejected" && tx.rejectionReason ? (
                            <p className="text-[11px] text-slate-600">Reason: {tx.rejectionReason}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {totalPages > 1 && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <div>
                      Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, approvals.length)} of {approvals.length}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                        disabled={currentPage === 1}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setCurrentPage(index + 1)}
                          className={`rounded-full px-3 py-1 text-xs transition ${currentPage === index + 1 ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
                        >
                          {index + 1}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
