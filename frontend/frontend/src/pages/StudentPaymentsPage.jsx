import React, { useContext, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import StudentPaymentsSummary from "../components/StudentPaymentsSummary";
import { PageLoader } from "../components/ui";
import { decodeToken } from "../utils/helpers";

export default function StudentPaymentsPage() {
  const navigate = useNavigate();
  const { schoolYear } = useParams();
  const { auth } = useContext(AuthContext);
  const [studentId, setStudentId] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState("1st");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth?.role !== "student") { navigate("/home"); return; }
    const token = localStorage.getItem("token");
    const payload = decodeToken(token);
    if (payload?.id) setStudentId(payload.id);
    setLoading(false);
  }, [auth, navigate]);

  const handleBackClick = () => {
    navigate("/student/payments");
  };

  return (
    <MainLayout user={{ name: "Student" }} onMenuItemClick={(item) => { if (item === "home") navigate("/home"); }}>
      <div className="page-content mx-auto w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 flex min-h-[calc(100vh-5.2rem)] flex-col overflow-y-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={handleBackClick} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors text-xs">←</button>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight mb-0 text-white">{schoolYear} Payments</h1>
              <p className="text-xs text-slate-300 mt-1">Select a semester to view your payments</p>
            </div>
          </div>
          
          {/* Semester filter buttons */}
          <div className="flex flex-wrap gap-2 justify-end flex-shrink-0">
            <button
              onClick={() => setSelectedSemester("1st")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedSemester === "1st"
                  ? "bg-primary-600 text-white shadow-lg"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
              }`}
            >
              1st Sem
            </button>
            <button
              onClick={() => setSelectedSemester("2nd")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedSemester === "2nd"
                  ? "bg-primary-600 text-white shadow-lg"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
              }`}
            >
              2nd Sem
            </button>
          </div>
        </div>

        <div className="min-h-auto flex-1 overflow-y-auto">
          {loading ? (
            <PageLoader text="Loading payment info..." />
          ) : studentId ? (
            <StudentPaymentsSummary studentId={studentId} schoolYear={schoolYear} selectedSemester={selectedSemester} />
          ) : (
            <div className="card h-full text-center py-12">
              <p className="text-slate-500">Unable to load payment information. Please log in again.</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
