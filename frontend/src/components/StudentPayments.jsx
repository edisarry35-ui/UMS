import React, { useState, useEffect, useContext } from "react";
import axios from "../api/axios";
import { PageLoader, Alert, SectionHeader, Badge } from "./ui";
import { formatDate } from "../utils/helpers";
import ConfirmationModal from "./modals/ConfirmationModal";
import { AuthContext } from "../context/AuthContext";


export default function StudentPayments({ studentId, initialData, schoolYear, semester }) {
  const { auth } = useContext(AuthContext);
  const canModifyRelease = auth?.role !== "student";
  const [student, setStudent] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });

  // Helper to show confirmation modal
  const showConfirmation = (title, message, onConfirm) => {
    setConfirmationModal({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  // Helper to close confirmation modal
  const closeConfirmation = () => {
    setConfirmationModal({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: null
    });
  };

  useEffect(() => {
    let mounted = true;
    const ensureStudent = async () => {
      if (initialData) {
        if (mounted) { setStudent(initialData); setLoading(false); setError(null); }
      } else if (studentId) {
        await fetchStudentData();
      } else {
        if (mounted) { setStudent(null); setLoading(false); }
      }
    };
    ensureStudent();
    return () => { mounted = false; };
  }, [studentId, initialData]);

  const fetchStudentData = async () => {
    try {
      const response = await axios.get(`/student/${studentId}`);
      setStudent(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load student data");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentStatusChange = async (paymentType, newStatus) => {
    try {
      const updateSchoolYear = schoolYear || student.schoolYear || student.schoolYears?.[0]?.schoolYear || "2025-2026";
      const updateSemester = semester || student.semester || student.schoolYears?.[0]?.semesters?.[0]?.semester || "1st";

      console.log("Updating payment:", { studentId, paymentType, status: newStatus, schoolYear: updateSchoolYear, semester: updateSemester });
      const response = await axios.put(`/student/${studentId}/payment`, {
        paymentType,
        status: newStatus,
        datePaid: new Date().toISOString(),
        schoolYear: updateSchoolYear,
        semester: updateSemester
      });
      console.log("Payment updated successfully:", response.data);
      setStudent(response.data.student);
      setError(null);
    } catch (err) {
      console.error("Payment update failed:", err.response?.data || err.message);
      setError(`Failed to update ${paymentType} status: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleReleaseToggle = async (paymentType, releasedValue) => {
    try {
      const updateSchoolYear = schoolYear || student.schoolYear || student.schoolYears?.[0]?.schoolYear || "2025-2026";
      const updateSemester = semester || student.semester || student.schoolYears?.[0]?.semesters?.[0]?.semester || "1st";

      const response = await axios.put(`/student/${studentId}/payment`, {
        paymentType,
        status: student?.schoolYears?.find(sy => sy.schoolYear === updateSchoolYear)?.semesters?.find(s => s.semester === updateSemester)?.payments?.[paymentType]?.status || "unpaid",
        released: releasedValue,
        datePaid: student?.schoolYears?.find(sy => sy.schoolYear === updateSchoolYear)?.semesters?.find(s => s.semester === updateSemester)?.payments?.[paymentType]?.datePaid || null,
        schoolYear: updateSchoolYear,
        semester: updateSemester
      });
      setStudent(response.data.student);
      setError(null);
    } catch (err) {
      console.error("Release update failed:", err.response?.data || err.message);
      setError(`Failed to update ${paymentType} release status: ${err.response?.data?.message || err.message}`);
    }
  };

  if (loading) return <PageLoader text="Loading payment data..." />;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!student) return <p className="text-sm text-slate-400">No student data found.</p>;

  // Get payments from the new schoolYears structure
  const getSemesterPayments = () => {
    if (!student.schoolYears || !Array.isArray(student.schoolYears)) {
      return {};
    }

    // Use the schoolYear/semester passed from parent (admin's selection)
    // Fall back to first available if not provided
    const currentSchoolYear = schoolYear || student.schoolYear || student.schoolYears[0]?.schoolYear || "2025-2026";
    const currentSemester = semester || student.semester || student.schoolYears[0]?.semesters?.[0]?.semester || "1st";

    const schoolYearEntry = student.schoolYears.find(sy => sy.schoolYear === currentSchoolYear);

    if (!schoolYearEntry) {
      return {};
    }

    const semesterEntry = schoolYearEntry.semesters.find(s => s.semester === currentSemester);

    return semesterEntry?.payments || {};
  };

  const rawSemesterPayments = getSemesterPayments();
  const paymentKeys = Object.keys(rawSemesterPayments || {});
  const payments = paymentKeys.map((type) => ({
    name: String(type).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    type,
    data: rawSemesterPayments[type]
  }));

  const parseAmount = (value, fallback = 0) => {
    const digits = String(value ?? "").replace(/[^\d.]/g, "");
    return digits ? Number(digits) : fallback;
  };

  const formatCurrency = (value, fallback = 0) => `₱${parseAmount(value, fallback).toLocaleString()}`;

  return (
    <div className="card p-3">
      <div className="flex flex-wrap gap-3 pb-3 mb-3 border-b border-slate-100">
        <div><p className="text-[10px] text-slate-500">USN</p><p className="font-mono text-xs font-semibold">{student.usn}</p></div>
        <div><p className="text-[10px] text-slate-500">Name</p><p className="text-xs font-semibold">{student.name}</p></div>
        <div><p className="text-[10px] text-slate-500">Program</p><p className="text-xs font-semibold">{student.program || "N/A"}</p></div>
        <div><p className="text-[10px] text-slate-500">Section</p><p className="text-xs font-semibold">{student.section || "N/A"}</p></div>
      </div>
      <SectionHeader title="Payment Records" />
      {payments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No payment items have been assigned for this school year and semester.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {payments.map((payment) => {
            const isPaid = payment.data?.status === "paid";
            return (
              <div key={payment.type} className={`p-4 rounded-xl border-2 transition-all ${isPaid ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-800">{payment.name}</span>
                  <Badge variant={isPaid ? "green" : "red"}>{isPaid ? "PAID" : "UNPAID"}</Badge>
                </div>
                <p className="text-sm text-slate-500 mb-1">Amount: <span className="font-semibold text-slate-700">{formatCurrency(payment.data?.amount, 0)}</span></p>
                {payment.data?.releaseEnabled && (
                  <p className="text-xs text-slate-500 mb-2">
                    Release status: <span className={payment.data?.released ? "text-emerald-600" : "text-slate-500"}>{payment.data?.released ? "Released" : "Not yet released"}</span>
                  </p>
                )}
                {isPaid && payment.data?.datePaid && <p className="text-xs text-emerald-600 mb-2">Paid on {formatDate(payment.data.datePaid)}</p>}
                <button
                  className={`w-full mt-2 btn-sm ${isPaid ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800 font-semibold tracking-wide" : "btn-success"}`}
                  onClick={() => {
                    const newStatus = isPaid ? "unpaid" : "paid";
                    showConfirmation(
                      "Confirm Payment Status Update",
                      `Are you sure you want to mark ${payment.name} as ${newStatus.toUpperCase()}?`,
                      () => {
                        handlePaymentStatusChange(payment.type, newStatus);
                        closeConfirmation();
                      }
                    );
                  }}
                >
                  {isPaid ? "Paid" : "Unpaid"}
                </button>
                {canModifyRelease && payment.data?.releaseEnabled && (
                  <button
                    className={`w-full mt-2 btn-sm ${payment.data?.released ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800 font-semibold tracking-wide" : "bg-blue-500 text-white hover:bg-blue-600"}`}
                    onClick={() => {
                      const nextReleased = !payment.data?.released;
                      showConfirmation(
                        "Confirm Release Status Update",
                        `Are you sure you want to mark ${payment.name} as ${nextReleased ? "Released" : "Not yet released"}?`,
                        () => {
                          handleReleaseToggle(payment.type, nextReleased);
                          closeConfirmation();
                        }
                      );
                    }}
                  >
                    {payment.data?.released ? "Mark Not Released" : "Mark Released"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
      />
    </div>
  );
}

