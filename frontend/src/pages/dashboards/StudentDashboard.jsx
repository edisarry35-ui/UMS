import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import StudentPayments from "../../components/StudentPayments";
import GCashPaymentModal from "../../components/modals/GCashPaymentModal";
import axios from "../../api/axios";
import { StatCard, Alert, SectionHeader, Badge } from "../../components/ui";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [studentStatus, setStudentStatus] = useState("pending");
  const [showGCashModal, setShowGCashModal] = useState(false);
  const studentName = studentData?.name || localStorage.getItem("studentName") || "Student";

  const getCompetencyLabel = (competency) => {
    if (competency === "competent") return "Competent";
    if (competency === "incompetent") return "Incompetent";
    return "Pending";
  };

  const getCompetencyBadgeVariant = (competency) => {
    if (competency === "competent") return "green";
    if (competency === "incompetent") return "red";
    return "gray";
  };

  useEffect(() => {
    const loadStudent = async () => {
      const studentId = localStorage.getItem("studentId");
      if (!studentId) return;

      try {
        const res = await axios.get(`/user/${studentId}`);
        const student = res.data;
        setStudentData(student);
        setStudentStatus(student.competency || "pending");
      } catch (err) {
        console.error("Failed to load student data", err);
      }
    };

    loadStudent();
  }, []);

  const handleMenuItemClick = (item) => {
    if (item === "home") navigate("/home");
  };

  const Programs = [
    { name: "Introduction to Programming", grade: "A (92%)", status: "green" },
    { name: "Data Structures", grade: "A– (89%)", status: "green" },
    { name: "Web Development", grade: "B+ (85%)", status: "blue" },
    { name: "Database Management", grade: "A (91%)", status: "green" },
    { name: "Software Engineering", grade: "A– (88%)", status: "green" },
    { name: "Mobile App Development", grade: "B+ (86%)", status: "blue" },
  ];

  return (
    <MainLayout user={{ name: "Student" }} onMenuItemClick={handleMenuItemClick}>
      <div className="page-content">
        <div className="mb-8 rounded-3xl border border-white/15 bg-white/10 p-6 shadow-card backdrop-blur-xl md:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[14px] font-semibold uppercase tracking-[0.2em] text-slate-900">
                Student Dashboard
              </h1>
            </div>
            <div className="sm:min-w-[240px]">
              <div className="rounded-2xl border border-white/10 bg-primary-950/30 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-primary-200">Competency</p>
                <p className="mt-1 text-sm font-semibold text-white">{getCompetencyLabel(studentStatus)}</p>
              </div>
            </div>
          </div>
        </div>

        <Alert type="info" className="mb-6">
          Payment for tuition is due by the end of this month. Visit <strong>My Payments</strong> to complete your payment.
        </Alert>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon="PP" label="Pending Payments" value="₱5,500" color="amber" trend="Due this month" />
        </div>

        {/* Academic Info */}
        <div className="card mb-6">
          <SectionHeader title="Academic Information" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Student ID", value: studentData?.usn || "USN001" },
              { label: "Academic Year", value: "2025–2026" },
              { label: "Semester", value: "2nd Semester" },
              { label: "Status", value: "Active" },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card mb-6">
          <SectionHeader title="Payment & Transactions" subtitle="Review payment status and available payment actions." />
          <div className="flex flex-wrap gap-3">
            <button className="btn-success" onClick={() => navigate("/student/payments")}>View My Payments</button>
            <button className="btn-secondary" onClick={() => setShowGCashModal(true)}>Pay via GCash</button>
            <button className="btn-secondary">View Receipt</button>
            <button className="btn-secondary" onClick={() => navigate("/activity-log")}>View Activity Logs</button>
          </div>
        </div>

        {studentData && <StudentPayments studentId={studentData._id} />}

        <GCashPaymentModal
          open={showGCashModal}
          onClose={() => setShowGCashModal(false)}
          amount={null}
          studentId={studentData?._id}
          paymentType={null}
          schoolYear={studentData?.schoolYear}
          semester={studentData?.semester}
          onPaid={async () => {
            // Refresh student data after successful payment upload
            try {
              const studentId = studentData?._id || localStorage.getItem("studentId");
              if (!studentId) return;
              const res = await axios.get(`/user/${studentId}`);
              setStudentData(res.data);
              setShowGCashModal(false);
            } catch (err) {
              console.error("Failed to refresh student data", err);
            }
          }}
        />
      </div>
    </MainLayout>
  );
}

