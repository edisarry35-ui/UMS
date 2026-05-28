import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import axios from "../api/axios";
import { PageLoader, Alert } from "../components/ui";
import { decodeToken } from "../utils/helpers";

export default function StudentPaymentSelectPage() {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [studentId, setStudentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schoolYears, setSchoolYears] = useState([]);

  useEffect(() => {
    if (auth?.role !== "student") {
      navigate("/home");
      return;
    }
    const token = localStorage.getItem("token");
    const payload = decodeToken(token);
    
    if (payload?.id) {
      console.log("Auth check passed. Student ID from token:", payload.id);
      setStudentId(payload.id);
      fetchSchoolYears(payload.id);
    } else {
      console.error("Token decode failed or no ID found");
      setLoading(false);
      setError("Invalid session. Please log in again.");
    }
  }, [auth, navigate]);

  const fetchSchoolYears = async (id) => {
    try {
      console.log("Fetching school years for student ID:", id);
      
      // Get the student record from the User collection
      const studentResponse = await axios.get(`/student/${id}`);
      const studentRecord = studentResponse.data;
      
      if (!studentRecord) {
        setError("Student data not found");
        setLoading(false);
        return;
      }

      console.log("Found student record:", { 
        id: studentRecord._id, 
        name: studentRecord.name, 
        usn: studentRecord.usn,
        schoolYears: studentRecord.schoolYears
      });

      // Extract school years from the schoolYears array
      const yearsSet = new Set();
      if (studentRecord.schoolYears && Array.isArray(studentRecord.schoolYears)) {
        studentRecord.schoolYears.forEach(schoolYearEntry => {
          if (schoolYearEntry.schoolYear) {
            yearsSet.add(schoolYearEntry.schoolYear);
            console.log("Adding school year:", schoolYearEntry.schoolYear);
          }
        });
      }

      const years = Array.from(yearsSet).sort().reverse();
      
      if (years.length === 0) {
        setError("No school years found for your account");
      } else {
        console.log("Final school years:", years);
        setSchoolYears(years);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch school years - Full error:", {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        url: err.config?.url
      });
      setError(`Failed to load school years: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSchoolYear = (schoolYear) => {
    navigate(`/student/payments/${schoolYear}`, {
      state: { studentId }
    });
  };

  if (loading) return <PageLoader text="Loading school years..." />;

  return (
    <MainLayout user={{ name: "Student" }} onMenuItemClick={(item) => { if (item === "home") navigate("/home"); }}>
      <div className="page-content mx-auto w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 flex min-h-[calc(100vh-5.2rem)] flex-col overflow-y-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-6 flex-shrink-0">
          <button onClick={() => navigate("/home")} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors text-xs">←</button>
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight mb-0 text-white">My Payments</h1>
            <p className="text-xs text-slate-300 mt-1">Select a school year to view your payments</p>
          </div>
        </div>

        <div className="min-h-auto flex-1 overflow-y-auto">
          {error && <Alert type="error">{error}</Alert>}
          
          {!error && schoolYears.length === 0 && (
            <div className="card h-full text-center py-12">
              <p className="text-slate-500">No school years found for your account.</p>
            </div>
          )}

          {!error && schoolYears.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schoolYears.map((year) => (
                <button
                  key={year}
                  onClick={() => handleSelectSchoolYear(year)}
                  className="card p-6 text-center hover:shadow-lg transition-all cursor-pointer transform hover:scale-105 border-2 border-transparent hover:border-primary-500"
                >
                  <p className="text-sm text-slate-500 mb-2">School Year</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{year}</h3>
                  <p className="text-xs text-slate-400">Click to view payments</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
