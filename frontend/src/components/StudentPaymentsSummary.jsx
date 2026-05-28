import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import GCashPaymentModal from "./modals/GCashPaymentModal";
import { PageLoader, Alert, SectionHeader, Badge } from "./ui";
import { formatDate } from "../utils/helpers";

const paymentDefaults = {
  module: { amount: "₱1500", status: "unpaid", datePaid: null },
  tshirt: { amount: "₱350", status: "unpaid", datePaid: null },
  tenk: { amount: "₱10000", status: "unpaid", datePaid: null },
  fortyFiveHundred: { amount: "₱4500", status: "unpaid", datePaid: null }
};

const mergePaymentData = (defaultData, actualData) => ({
  amount: actualData?.amount ?? defaultData?.amount ?? "₱0",
  status: actualData?.status ?? defaultData?.status ?? "unpaid",
  datePaid: actualData?.datePaid ?? defaultData?.datePaid ?? null,
  released: actualData?.released ?? defaultData?.released ?? false
});

const paymentNames = {
  module: "Module",
  tshirt: "T-Shirt",
  tenk: "10k",
  fortyFiveHundred: "4,500"
};

const getItemDisplayName = (type) => paymentNames[type] || String(type).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const defaultPaymentData = {
  module: { amount: "₱1500", status: "unpaid", datePaid: null, released: false },
  tshirt: { amount: "₱350", status: "unpaid", datePaid: null, released: false },
  tenk: { amount: "₱10000", status: "unpaid", datePaid: null, released: false },
  fortyFiveHundred: { amount: "₱4500", status: "unpaid", datePaid: null, released: false }
};

export default function StudentPaymentsSummary({ studentId, schoolYear, selectedSemester = "1st" }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGCashModal, setShowGCashModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState(null);
  const [deadlineInfo, setDeadlineInfo] = useState(null);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [hasActiveAccounts, setHasActiveAccounts] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    fetchStudentData();
    fetchPendingTransactions();
    checkActiveAccounts();
  }, [studentId, schoolYear, selectedSemester]);

  // Auto-refresh every 10 seconds to detect when admin confirms payments
  useEffect(() => {
    if (!studentId) return;
    
    const interval = setInterval(() => {
      fetchStudentData();
      fetchPendingTransactions();
      checkActiveAccounts();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [studentId, schoolYear, selectedSemester]);

  const checkActiveAccounts = async () => {
    try {
      const response = await axios.get("/gcash-accounts");
      const accounts = response.data || [];
      const activeAccounts = accounts.filter(acc => acc.active === true);
      setHasActiveAccounts(activeAccounts.length > 0);
    } catch (err) {
      console.error("Failed to check active accounts:", err);
      setHasActiveAccounts(true); // Assume there are accounts if check fails
    }
  };

  const fetchPendingTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (studentId) params.append("studentId", studentId);
      if (schoolYear) params.append("schoolYear", schoolYear);
      if (selectedSemester) params.append("semester", selectedSemester);
      params.append("status", "pending");

      const response = await axios.get(`/transactions?${params.toString()}`);
      setPendingTransactions(response.data || []);
    } catch (err) {
      console.error("Failed to fetch pending transactions:", err);
      setPendingTransactions([]);
    }
  };

  const fetchStudentData = async () => {
    try {
      // If schoolYear is provided, fetch from specific collection with semester
      let response;
      if (schoolYear) {
        response = await axios.get(`/student/${studentId}`, {
          params: { 
            schoolYear,
            semester: selectedSemester
          }
        });
      } else {
        response = await axios.get(`/student/${studentId}`);
      }
      
      console.log("Frontend: Fetched student data:", {
        id: response.data._id,
        name: response.data.name,
        usn: response.data.usn,
        schoolYear: response.data.schoolYear,
        semester: response.data.semester,
        paymentsPerSemester: response.data.paymentsPerSemester
      });
      
      setStudent(response.data);
      setError(null);

      // Fetch deadline information
      try {
        const deadlineResponse = await axios.get(`/api/deadlines/${schoolYear}/${selectedSemester}`);
        setDeadlineInfo(deadlineResponse.data);
      } catch (deadlineError) {
        // Deadline not set or error fetching - this is okay
        setDeadlineInfo(null);
      }
    } catch (err) {
      console.error("Payment data fetch failed:", err);
      setError("Failed to load student data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader text="Loading payment info..." />;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!student) return <p className="text-sm text-slate-400">No student data found.</p>;

  // Get payments from the new schoolYears structure
  const getSemesterPayments = () => {
    if (!student.schoolYears || !Array.isArray(student.schoolYears)) {
      return {};
    }

    // Find the selected school year entry
    const schoolYearEntry = student.schoolYears.find(sy => sy.schoolYear === schoolYear);

    if (!schoolYearEntry) {
      return {};
    }

    // Find the selected semester entry
    const semesterEntry = schoolYearEntry.semesters.find(s => s.semester === selectedSemester);

    return semesterEntry?.payments || {};
  };

  const rawSemesterPayments = getSemesterPayments();
  
  // Only show payment items that are actually present in the student's payments for this semester
  // Don't merge with defaults - only use what's in the database
  const paymentKeys = Object.keys(rawSemesterPayments || {}).filter((key) => {
    const data = rawSemesterPayments[key];
    return data && typeof data === "object" && Object.keys(data).length > 0;
  });

  const semesterPayments = paymentKeys.reduce((acc, key) => {
    acc[key] = rawSemesterPayments[key] || { amount: "₱0", status: "unpaid", datePaid: null, released: false };
    return acc;
  }, {});

  const pendingByType = pendingTransactions.reduce((acc, tx) => {
    if (!tx.paymentType) return acc;
    acc[tx.paymentType] = tx;
    return acc;
  }, {});

  const getMergedPayment = (type, data) => {
    const pendingTx = pendingByType[type];
    if (pendingTx && data?.status !== "paid") {
      return {
        ...data,
        status: "pending",
        receiptImage: pendingTx.receiptImage,
        transactionId: pendingTx._id,
        pendingSince: pendingTx.createdAt
      };
    }
    return data;
  };

  const parseAmount = (value, fallback = 0) => {
    const digits = String(value ?? "").replace(/[^\d.]/g, "");
    return digits ? Number(digits) : fallback;
  };

  const formatCurrency = (value, fallback = 0) => `₱${parseAmount(value, fallback).toLocaleString()}`;

  const payments = paymentKeys.map((type) => ({
    name: getItemDisplayName(type),
    type,
    data: getMergedPayment(type, semesterPayments[type])
  }));

  const totalAmount = payments.reduce((sum, p) => {
    const defaultAmount = parseAmount(defaultPaymentData[p.type]?.amount, 0);
    return sum + parseAmount(p.data?.amount, defaultAmount);
  }, 0);
  const paidCount = payments.filter(p => p.data?.status === "paid").length;

  return (
    <div className="flex h-auto flex-col gap-2 sm:gap-3 overflow-y-auto">
      <div className="grid grid-cols-1 gap-2 sm:gap-3 xl:grid-cols-[1.2fr_2fr] flex-shrink-0">
        {/* Student info */}
        <div className="card px-2 sm:px-3 py-2 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
              {student.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 truncate text-xs sm:text-sm">{student.name}</h3>
              <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-300"><span className="font-mono text-[9px] sm:text-xs">{student.usn}</span> • {student.program || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-lg sm:rounded-xl border border-primary-100 bg-white/90 px-2 sm:px-3 py-2 sm:py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
            <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Due</p>
            <p className="mt-1 text-base sm:text-lg font-display font-bold text-primary-700 dark:text-primary-300">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="rounded-lg sm:rounded-xl border border-emerald-100 bg-white/90 px-2 sm:px-3 py-2 sm:py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
            <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Paid</p>
            <p className="mt-1 text-base sm:text-lg font-display font-bold text-emerald-600 dark:text-emerald-300">{paidCount} / {payments.length}</p>
          </div>
          <div className="rounded-lg sm:rounded-xl border border-amber-100 bg-white/90 px-2 sm:px-3 py-2 sm:py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
            <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Remaining</p>
            <p className="mt-1 text-base sm:text-lg font-display font-bold text-amber-600 dark:text-amber-300">{payments.length - paidCount} / {payments.length}</p>
          </div>
        </div>
      </div>

      {/* Deadline information */}
      {deadlineInfo && (
        <div className="card px-2 sm:px-3 py-2 sm:py-3 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-amber-600 dark:text-amber-400 text-sm">⏰</span>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">Payment Deadline</h4>
              <p className="text-[9px] sm:text-xs text-slate-600 dark:text-slate-300">
                Due by {new Date(deadlineInfo.deadlineDate).toLocaleDateString()}
                {deadlineInfo.daysRemaining !== undefined && (
                  <span className={`ml-1 sm:ml-2 font-medium text-[9px] sm:text-xs ${deadlineInfo.daysRemaining < 0 ? 'text-red-600' : deadlineInfo.daysRemaining <= 3 ? 'text-amber-600' : 'text-slate-600'}`}>
                    ({deadlineInfo.daysRemaining < 0 ? `${Math.abs(deadlineInfo.daysRemaining)} days overdue` : `${deadlineInfo.daysRemaining} days remaining`})
                  </span>
                )}
              </p>
              {deadlineInfo.description && (
                <p className="text-[8px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">{deadlineInfo.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment cards */}
      <div className="card flex flex-1 flex-col overflow-y-auto px-2 sm:px-3 py-2 sm:py-3">
        <div className="mb-2 flex-shrink-0">
          <h3 className="text-sm sm:text-base font-display font-semibold text-slate-900 dark:text-slate-100">Payment Details</h3>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {payments.map((p) => {
            const isPaid = p.data?.status === "paid";
            const defaultAmount = parseAmount(paymentDefaults[p.type]?.amount, 0);
            const amountNum = parseAmount(p.data?.amount, defaultAmount);
            return (
              <div
                key={p.name}
                className={`flex min-h-[7rem] sm:min-h-[8rem] flex-col justify-between rounded-lg border p-2 sm:p-3 transition-all text-sm ${isPaid ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/70"}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 sm:gap-2 mb-1">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">{p.name}</p>
                      <p className="text-[8px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(p.data?.amount, defaultAmount)}</p>
                    </div>
                    <Badge variant={isPaid ? "green" : p.data?.status === "pending" ? "yellow" : "red"}>
                      {isPaid ? "PAID" : p.data?.status === "pending" ? "PENDING" : "UNPAID"}
                    </Badge>
                  </div>

                  <p className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 mb-2">
                    {p.data?.status === "pending"
                      ? `Pending admin confirmation${p.data?.pendingSince ? ` since ${formatDate(p.data.pendingSince)}` : ""}`
                      : p.data?.datePaid ? `Paid ${formatDate(p.data.datePaid)}` : "Not yet paid"}
                  </p>
                </div>

                {!isPaid ? (
                  <button
                    className={`btn-primary btn-sm w-full text-[9px] sm:text-[10px] py-1 ${!hasActiveAccounts ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => { setSelectedAmount(String(amountNum)); setSelectedPaymentType(p.type); setShowGCashModal(true); }}
                    disabled={!hasActiveAccounts}
                  >
                    {!hasActiveAccounts ? "No Payment Accounts" : p.data?.status === "pending" ? "Upload New Receipt" : "Pay Online"}
                  </button>
                ) : (
                  <div className="text-center text-[8px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-300 py-2">
                    Payment settled
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <GCashPaymentModal
        open={showGCashModal}
        onClose={() => setShowGCashModal(false)}
        amount={selectedAmount}
        studentId={studentId}
        paymentType={selectedPaymentType}
        schoolYear={schoolYear}
        semester={selectedSemester}
        onPaid={async () => {
          setShowGCashModal(false);
          await fetchStudentData();
        }}
      />
    </div>
  );
}

