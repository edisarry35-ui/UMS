import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "../api/axios";
import MainLayout from "../layouts/MainLayout";
import { PageLoader, Alert, EmptyState } from "../components/ui";
import { AuthContext } from "../context/AuthContext";

export default function AssessmentProgramDetail() {
  const { program: routeProgram } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, schoolYear, semester } = useContext(AuthContext);
  const program = routeProgram;
  const [selectedProgramId, setSelectedProgramId] = useState(location.state?.programId || null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showCompetencyModal, setShowCompetencyModal] = useState(false);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [updating, setUpdating] = useState(false);

  const selectedSchoolYear = location.state?.schoolYear || schoolYear;
  const selectedSemester = location.state?.semester || semester;

  const normalizeSchoolYearValue = (value) => {
    const text = String(value || "").trim();
    const match = text.match(/(\d{4}-\d{4})/);
    return match ? match[1] : text.replace(/^SY\s*/i, "");
  };

  const normalizeSemesterValue = (value) => {
    const text = String(value || "").trim().toLowerCase();
    if (text.startsWith("2")) return "2nd";
    if (text.startsWith("1")) return "1st";
    return "";
  };

  const normalizedSchoolYear = normalizeSchoolYearValue(selectedSchoolYear);
  const normalizedSemester = normalizeSemesterValue(selectedSemester);

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [student.name, student.usn, student.section]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  useEffect(() => { fetchSections(); }, [program, selectedProgramId, normalizedSchoolYear, normalizedSemester]);

  useEffect(() => {
    if (!selectedProgramId && normalizedSchoolYear && normalizedSemester) {
      const resolveProgramId = async () => {
        try {
          const response = await axios.get("/programs", {
            params: { schoolYear: normalizedSchoolYear, semester: normalizedSemester }
          });
          const found = (response.data || []).find((item) => item.name === program);
          if (found) setSelectedProgramId(found._id);
        } catch (err) {
          console.warn("Unable to resolve program ID", err);
        }
      };
      resolveProgramId();
    }
  }, [selectedProgramId, program, normalizedSchoolYear, normalizedSemester]);

  useEffect(() => { fetchProgramStudents(); }, [program, selectedSection, normalizedSchoolYear, normalizedSemester]);

  const fetchProgramStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/students", {
        params: {
          schoolYear: normalizedSchoolYear,
          semester: normalizedSemester
        }
      });
      let programStudents = response.data.filter((s) => {
        const studentProgram = s.program || s.Program;
        return studentProgram === program && s.role === "student";
      });
      if (selectedSection && selectedSection !== "ALL") {
        programStudents = programStudents.filter((s) => s.section === selectedSection);
      }
      setStudents(programStudents);
    } catch (err) {
      setError("Failed to load program students");
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const res = selectedProgramId
        ? await axios.get(`/programs/${selectedProgramId}/sections`)
        : await axios.get(`/program/${program}/sections`, {
            params: {
              schoolYear: normalizedSchoolYear,
              semester: normalizedSemester
            }
          });

      const normalizedSections = (res.data || [])
        .map((section) => {
          if (typeof section === "string") {
            return { _id: section, name: section };
          }
          return section;
        })
        .filter((section) => section?.name);

      setSections(normalizedSections);
      setSelectedSection(normalizedSections.length > 0 ? "ALL" : "");
    } catch (err) {
      console.error("Failed to load sections", err);
      setSections([]);
      setSelectedSection("");
    }
  };

  const handleSectionChange = (val) => {
    setSelectedSection(val);
  };

  const handleCompetencyChange = async (studentId, competency) => {
    const confirmation = window.confirm(
      `Are you sure you want to mark this student as ${
        competency === "competent" ? "Competent" : "Incompetent"
      }?`
    );
    if (!confirmation) return;

    setUpdating(true);
    try {
      const response = await axios.put(`/students/${studentId}`, { competency });
      const updatedStudent = response.data?.student;
      setStudents((prev) =>
        prev.map((student) =>
          student._id === studentId
            ? { ...student, competency: updatedStudent?.competency || competency }
            : student
        )
      );
      setSelectedStudent((prev) =>
        prev && prev._id === studentId
          ? { ...prev, competency: updatedStudent?.competency || competency }
          : prev
      );
      setSuccessMessage(`Student competency set to ${competency === "competent" ? "Competent" : "Incompetent"}.`);
      setShowCompetencyModal(false);
      window.setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error("Failed to update competency", err);
      alert(err.response?.data?.message || "Failed to update competency status");
    } finally {
      setUpdating(false);
    }
  };

  const getCompetencyColor = (competency) => {
    switch (competency) {
      case "competent":
        return "bg-green-100 text-green-800";
      case "incompetent":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const pageBody = (
    <div className="page-content">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/assessment")}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors text-sm"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="page-title mb-0">{program || "Program"} Program</h1>
        </div>
        <div className="flex items-center gap-2 ml-auto max-w-xs w-full">
          <select
            className="input flex-1"
            value={selectedSection}
            onChange={(e) => handleSectionChange(e.target.value)}
          >
            <option value="">Select Section</option>
            <option value="ALL">All Sections</option>
            {sections.map((s) => (
              <option key={s._id || s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}
      {successMessage && <Alert type="success" className="mb-4">{successMessage}</Alert>}

      {loading ? (
        <PageLoader text="Loading students..." />
      ) : (
        <div className="flex flex-col gap-6 w-full overflow-x-hidden">
          {/* Students list */}
          <div className="card p-0 w-full max-w-full">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-semibold text-slate-700 text-sm">
                  Students ({filteredStudents.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Section: {selectedSection || "All"}
                </p>
              </div>
              <div>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students by name, USN, or section"
                  className="input w-full border-slate-200 bg-white text-sm"
                />
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon="🔍"
                  title="No students found"
                  subtitle="Try a different search term or section."
                />
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[30rem] scrollbar-hide">
                {filteredStudents.map((student) => (
                  <button
                    key={student._id}
                    onClick={() => {
                      setSelectedStudent(student);
                      setShowCompetencyModal(true);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left border-b border-slate-100 last:border-0 transition-colors ${
                      selectedStudent?._id === student._id
                        ? "bg-primary-50 border-l-2 border-l-primary-500"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          selectedStudent?._id === student._id
                            ? "bg-primary-600 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {student.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">{student.usn}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {student.competency && (
                        <span
                          className={`badge text-xs font-medium ${getCompetencyColor(
                            student.competency
                          )}`}
                        >
                          {student.competency === "competent" ? "✓ Competent" : "✗ Incompetent"}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showCompetencyModal && selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onClick={() => setShowCompetencyModal(false)}
        >
          <div
            className="modal-box max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="text-lg font-semibold">{selectedStudent.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  USN: {selectedStudent.usn}
                </p>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                onClick={() => setShowCompetencyModal(false)}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="modal-body space-y-4">
              {selectedStudent.competency && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  Current status:{" "}
                  <strong>
                    {selectedStudent.competency === "competent"
                      ? "Competent"
                      : "Incompetent"}
                  </strong>
                </div>
              )}
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Choose the competency status for this student.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCompetencyChange(selectedStudent._id, "competent")
                  }
                  disabled={updating}
                  className={`px-4 py-3 rounded-lg text-xs font-medium transition-colors ${
                    selectedStudent.competency === "competent"
                      ? "bg-green-600 text-white"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  Competent
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCompetencyChange(selectedStudent._id, "incompetent")
                  }
                  disabled={updating}
                  className={`px-4 py-3 rounded-lg text-xs font-medium transition-colors ${
                    selectedStudent.competency === "incompetent"
                      ? "bg-red-600 text-white"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}
                >
                  Incompetent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <MainLayout user={{ name: "User" }} onMenuItemClick={(item) => { if (item === "home") navigate("/home"); }}>
      {pageBody}
    </MainLayout>
  );
}
