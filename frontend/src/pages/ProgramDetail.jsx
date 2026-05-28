import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "../api/axios";
import MainLayout from "../layouts/MainLayout";
import StudentPayments from "../components/StudentPayments";
import EditSectionModal from "../components/modals/EditSectionModal";
import { PageLoader, Alert, EmptyState, ConfirmModal } from "../components/ui";
import { getInitials } from "../utils/helpers";
import { AuthContext } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
export default function ProgramDetail({ embedded = false, onBack, programName: propProgramName, programId: propProgramId }) {
  const { program: routeProgram } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, schoolYear, semester } = useContext(AuthContext);
  const { notify } = useNotification();
  const program = propProgramName || routeProgram;
  const [selectedProgramId, setSelectedProgramId] = useState(propProgramId || location.state?.programId || null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSectionName, setSelectedSectionName] = useState("");
  const [showEditSectionModal, setShowEditSectionModal] = useState(false);
  const [showSectionSelectModal, setShowSectionSelectModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          console.warn("Unable to resolve program ID for edit actions", err);
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
      const routeStudentId = location.state?.studentId;
      if (routeStudentId) {
        const routeStudent = programStudents.find((s) => s._id === routeStudentId);
        setSelectedStudent(routeStudent || (programStudents.length > 0 ? programStudents[0] : null));
        setShowPaymentModal(true);
      } else {
        setSelectedStudent(programStudents.length > 0 ? programStudents[0] : null);
      }
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

  const handleSectionChange = async (val) => {
    if (val === "__ADD_SECTION__") {
      const name = window.prompt("Enter new section name (e.g. WADT 3D):");
      if (!name) return;
      try {
        if (selectedProgramId) {
          await axios.post(`/programs/${selectedProgramId}/sections`, { sectionName: name.trim() });
        } else {
          await axios.post(`/program/${program}/sections`, {
            name: name.trim(),
            schoolYear: normalizedSchoolYear,
            semester: normalizedSemester
          });
        }
        await fetchSections();
        setSelectedSection(name.trim());
        notify("success", "Section added successfully.");
      } catch (err) {
        const message = err.response?.data?.message || "Failed to add section";
        notify("error", message);
      }
    } else {
      setSelectedSection(val);
    }
  };

  const handleEditSectionRequest = () => {
    if (!selectedProgramId) {
      setShowSectionSelectModal(true);
      return;
    }
    if (!selectedSection || selectedSection === "ALL") {
      setShowSectionSelectModal(true);
      return;
    }
    setSelectedSectionName(selectedSection);
    setShowEditSectionModal(true);
  };

  const handleSectionUpdated = (updatedProgram, newSectionName) => {
    const updatedSections = (updatedProgram.sections || []).map((section) => ({ _id: section, name: section }));
    setSections(updatedSections);
    if (selectedSection === selectedSectionName && newSectionName) {
      setSelectedSection(newSectionName);
      setSelectedSectionName(newSectionName);
    }
  };

  const pageBody = (
    <div className="page-content">
      <div className="flex items-center gap-3 mb-6">
        {embedded ? (
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors text-sm">←</button>
        ) : (
          <button onClick={() => navigate("/semester")} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors text-sm">←</button>
        )}
        <div className="flex-1 flex items-center gap-4">
          <div>
            <h1 className="page-title mb-0">📖 {program || "Program"} Program</h1>
            <p className="page-subtitle">Student payment management</p>
          </div>
          <div className="flex items-center gap-2 ml-auto max-w-xs w-full">
            {auth?.role === "admin" && (
              <button
                type="button"
                onClick={handleEditSectionRequest}
                title={!selectedSection || selectedSection === "ALL" ? "Select a section to edit" : "Edit section"}
                className="inline-flex items-center justify-center h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ✏️
              </button>
            )}
            <select
              className="input flex-1"
              value={selectedSection}
              onChange={(e) => handleSectionChange(e.target.value)}
            >
              <option value="">Select Section</option>
              <option value="ALL">All Sections</option>
              {sections.map((s) => (
                <option key={s._id || s.name} value={s.name}>{s.name}</option>
              ))}
              <option value="__ADD_SECTION__">+ Add Section...</option>
            </select>
          </div>
        </div>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <EditSectionModal
        isOpen={showEditSectionModal}
        onClose={() => setShowEditSectionModal(false)}
        programId={selectedProgramId}
        sectionName={selectedSectionName}
        onSectionUpdated={handleSectionUpdated}
      />

      <ConfirmModal
        open={showSectionSelectModal}
        title="Select a section first"
        message="Please choose a specific section from the dropdown before editing."
        onClose={() => setShowSectionSelectModal(false)}
        onConfirm={() => setShowSectionSelectModal(false)}
        confirmLabel="OK"
      />

      {loading ? (
        <PageLoader text="Loading students..." />
      ) : (
        <div className="flex flex-col gap-6 w-full overflow-x-hidden">
            {/* Students list */}
            <div className="card p-0 w-full max-w-full">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold text-slate-700 text-sm">Students ({filteredStudents.length})</h3>
                  <p className="text-xs text-slate-500">Section: {selectedSection || "All"}</p>
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
                  <EmptyState icon="🔍" title="No students found" subtitle="Try a different search term or section." />
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[18rem] scrollbar-hide">
                  {filteredStudents.map((student) => (
                    <button
                      key={student._id}
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowPaymentModal(true);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-100 last:border-0 transition-colors ${
                        selectedStudent?._id === student._id
                          ? "bg-primary-50 border-l-2 border-l-primary-500"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selectedStudent?._id === student._id ? "bg-primary-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                        {getInitials(student.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{student.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{student.usn}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      {showPaymentModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-box max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-semibold">Student Payment Details</h2>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="btn-ghost btn-sm text-slate-500 hover:text-slate-900"
              >
                ×
              </button>
            </div>
            <div className="py-2">
              <StudentPayments
                studentId={selectedStudent._id}
                initialData={selectedStudent}
                schoolYear={normalizedSchoolYear}
                semester={normalizedSemester}
              />
            </div>
          </div>
        </div>
      )}
      </div>
    );

  return embedded ? pageBody : <MainLayout user={{ name: "User" }} onMenuItemClick={(item) => { if (item === "home") navigate("/home"); }}>{pageBody}</MainLayout>;
}

