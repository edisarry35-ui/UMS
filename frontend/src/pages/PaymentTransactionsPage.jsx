import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import axios, { API_BASE_URL } from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { SectionHeader, PageLoader, Alert, Badge } from "../components/ui";
import { formatDate } from "../utils/helpers";
import { exportElementAsPdf } from "../utils/pdfExport";

export default function PaymentTransactionsPage({ embedded = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isEmbed = embedded || searchParams.get("embed") === "1" || searchParams.get("embed") === "true";
  const { auth } = useContext(AuthContext);
  const username = localStorage.getItem("username") || (auth?.role === "staff" ? "Staff" : "Admin");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportName, setExportName] = useState("");
  const [exportPassword, setExportPassword] = useState("");
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");
  const [exportError, setExportError] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptModalImage, setReceiptModalImage] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    paymentType: "",
    schoolYear: "",
    semester: ""
  });
  const [schoolYears, setSchoolYears] = useState([]);
  const [loadingSchoolYears, setLoadingSchoolYears] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  useEffect(() => {
    const loadSchoolYears = async () => {
      setLoadingSchoolYears(true);
      try {
        const res = await axios.get("/school-years");
        setSchoolYears(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load school years", err);
        setSchoolYears([]);
      } finally {
        setLoadingSchoolYears(false);
      }
    };
    loadSchoolYears();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await axios.get(`/transactions?${queryParams.toString()}`);
      setTransactions(response.data || []);
    } catch (err) {
      console.error("Failed to load transactions", err);
      setError("Failed to load transactions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (transactionId) => {
    if (!confirm("Are you sure you want to confirm this payment?")) return;

    try {
      await axios.put(`/transactions/${transactionId}/confirm`, {
        confirmedBy: username
      });
      loadTransactions();
    } catch (err) {
      console.error("Failed to confirm transaction", err);
      alert("Failed to confirm transaction. Please try again.");
    }
  };

  const handleReject = async (transactionId) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;

    try {
      await axios.put(`/transactions/${transactionId}/reject`, {
        confirmedBy: username,
        rejectionReason: reason
      });
      loadTransactions();
    } catch (err) {
      console.error("Failed to reject transaction", err);
      alert("Failed to reject transaction. Please try again.");
    }
  };

  const openReceiptModal = (receiptImage) => {
    setReceiptModalImage(`${API_BASE_URL}/uploads/${receiptImage}`);
    setReceiptModalOpen(true);
  };

  const closeReceiptModal = () => {
    setReceiptModalOpen(false);
    setReceiptModalImage("");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="green">Confirmed</Badge>;
      case "rejected":
        return <Badge variant="red">Rejected</Badge>;
      default:
        return <Badge variant="yellow">Pending</Badge>;
    }
  };

  const getPaymentTypeLabel = (type) => {
    const labels = {
      module: "Module",
      tshirt: "T-Shirt",
      tenk: "10k",
      fortyFiveHundred: "4,500"
    };
    return labels[type] || type;
  };

  const getExportTransactions = () => {
    if (!exportDateFrom || !exportDateTo) return transactions;
    const fromDate = new Date(exportDateFrom);
    const toDate = new Date(exportDateTo);
    toDate.setHours(23, 59, 59, 999);

    return transactions.filter((transaction) => {
      const createdAt = new Date(transaction.createdAt);
      return createdAt >= fromDate && createdAt <= toDate;
    });
  };

  const verifyCredentials = async () => {
    try {
      await axios.post("/login", {
        role: auth?.role,
        username: exportName,
        password: exportPassword
      });
      return true;
    } catch (err) {
      return false;
    }
  };

  const handleExport = async () => {
    if (!exportName || !exportPassword) {
      setExportError("Please enter name and password to export.");
      return;
    }

    if (auth?.role === "admin") {
      if ((exportDateFrom && !exportDateTo) || (!exportDateFrom && exportDateTo)) {
        setExportError("Please select both start and end dates for export.");
        return;
      }
      if (exportDateFrom && exportDateTo) {
        const fromDate = new Date(exportDateFrom);
        const toDate = new Date(exportDateTo);
        if (fromDate > toDate) {
          setExportError("Start date cannot be after end date.");
          return;
        }
      }
    }

    setExportLoading(true);
    setExportError("");

    try {
      const valid = await verifyCredentials();
      if (!valid) {
        setExportError("Invalid name or password. Export blocked.");
        return;
      }

      if (!exportRef.current) {
        setExportError("Export area not found.");
        return;
      }

      await exportElementAsPdf(exportRef.current, `transactions-${Date.now()}.pdf`);
      setExportModalOpen(false);
      setExportName("");
      setExportPassword("");
      setExportDateFrom("");
      setExportDateTo("");
    } catch (err) {
      console.error("Export failed:", err);
      setExportError("Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) return isEmbed ? <PageLoader text="Loading transactions..." /> : <MainLayout><PageLoader text="Loading transactions..." /></MainLayout>;
  if (error) return isEmbed ? <Alert type="error">{error}</Alert> : <MainLayout><Alert type="error">{error}</Alert></MainLayout>;

  const pageBody = (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <SectionHeader title="Payment Transactions" />
          {(auth?.role === "admin" || auth?.role === "staff") && (
            <button
              onClick={() => setExportModalOpen(true)}
              className="btn-primary h-10"
            >
              Export Transactions PDF
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="space-y-6">
          <div className="card p-4 mb-6">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="form-select"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={filters.paymentType}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentType: e.target.value }))}
              className="form-select"
            >
              <option value="">All Types</option>
              <option value="module">Module</option>
              <option value="tshirt">T-Shirt</option>
              <option value="tenk">10k</option>
              <option value="fortyFiveHundred">4,500</option>
            </select>

            <select
              value={filters.schoolYear}
              onChange={(e) => setFilters(prev => ({ ...prev, schoolYear: e.target.value }))}
              className="form-select"
            >
              <option value="">All School Years</option>
              {schoolYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <select
              value={filters.semester}
              onChange={(e) => setFilters(prev => ({ ...prev, semester: e.target.value }))}
              className="form-select"
            >
              <option value="">All Semesters</option>
              <option value="1st">1st Semester</option>
              <option value="2nd">2nd Semester</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">School Year</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Semester</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Receipt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {transaction.studentName}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {transaction.studentUsn}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {getPaymentTypeLabel(transaction.paymentType)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {transaction.amount}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {transaction.schoolYear}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                        {transaction.semester}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(transaction.status)}
                        {transaction.status === "rejected" && transaction.rejectionReason && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {transaction.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {transaction.receiptImage && (
                          <button
                            type="button"
                            onClick={() => openReceiptModal(transaction.receiptImage)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                          >
                            View Receipt
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        {transaction.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirm(transaction._id)}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleReject(transaction._id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {transaction.status === "confirmed" && (
                          <span className="text-green-600 dark:text-green-400">
                            Confirmed by {transaction.confirmedBy}
                          </span>
                        )}
                        {transaction.status === "rejected" && (
                          <span className="text-red-600 dark:text-red-400">
                            Rejected by {transaction.confirmedBy}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </div>
        </div>

        {receiptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={closeReceiptModal}>
            <div className="relative max-h-full w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={closeReceiptModal}
                className="absolute right-4 top-4 z-10 rounded-full bg-slate-100 p-2 text-slate-800 hover:bg-slate-200"
                aria-label="Close receipt preview"
              >
                ✕
              </button>
              <div className="flex items-center justify-center p-6">
                <img
                  src={receiptModalImage}
                  alt="Receipt preview"
                  className="max-h-[80vh] max-w-full rounded-2xl object-contain"
                />
              </div>
            </div>
          </div>
        )}

        <div
          ref={exportRef}
          style={{ position: "absolute", left: "-9999px", top: 0, width: "1200px" }}
        >
          <div className="p-6 bg-white text-slate-900">
            <h2 className="text-xl font-semibold mb-3">Transaction Export</h2>
            {auth?.role === "admin" && exportDateFrom && exportDateTo && (
              <p className="text-sm text-slate-600 mb-4">
                Export date range: {exportDateFrom} to {exportDateTo}
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="border px-3 py-2">Student</th>
                    <th className="border px-3 py-2">Payment Type</th>
                    <th className="border px-3 py-2">Amount</th>
                    <th className="border px-3 py-2">School Year</th>
                    <th className="border px-3 py-2">Semester</th>
                    <th className="border px-3 py-2">Status</th>
                    <th className="border px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {getExportTransactions().map((transaction) => (
                    <tr key={transaction._id}>
                      <td className="border px-3 py-2">{transaction.studentName} ({transaction.studentUsn})</td>
                      <td className="border px-3 py-2">{getPaymentTypeLabel(transaction.paymentType)}</td>
                      <td className="border px-3 py-2">{transaction.amount}</td>
                      <td className="border px-3 py-2">{transaction.schoolYear}</td>
                      <td className="border px-3 py-2">{transaction.semester}</td>
                      <td className="border px-3 py-2">{transaction.status}</td>
                      <td className="border px-3 py-2">{formatDate(transaction.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {exportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Confirm Export Credentials</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Enter your name and password before downloading the report.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    className="form-input w-full"
                    placeholder="Admin or staff name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password</label>
                  <input
                    type="password"
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    className="form-input w-full"
                    placeholder="Enter password"
                  />
                </div>
                {auth?.role === "admin" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={exportDateFrom}
                        onChange={(e) => setExportDateFrom(e.target.value)}
                        className="form-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">End Date</label>
                      <input
                        type="date"
                        value={exportDateTo}
                        onChange={(e) => setExportDateTo(e.target.value)}
                        className="form-input w-full"
                      />
                    </div>
                  </div>
                )}
                {exportError && <p className="text-sm text-red-600">{exportError}</p>}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setExportModalOpen(false);
                    setExportError("");
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  className="btn-primary"
                  disabled={exportLoading}
                >
                  {exportLoading ? "Exporting..." : "Export PDF"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );

  return isEmbed ? pageBody : <MainLayout>{pageBody}</MainLayout>;
}