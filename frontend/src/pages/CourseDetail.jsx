import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "../api/axios";
import MainLayout from "../layouts/MainLayout";
import StudentPayments from "../components/StudentPayments";
import EditSectionModal from "../components/modals/EditSectionModal";
import { PageLoader, Alert, EmptyState } from "../components/ui";
import { getInitials } from "../utils/helpers";
import { AuthContext } from "../context/AuthContext";

export default function ProgramDetail() {
  const { program } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, schoolYear, semester } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState(location.state?.programId || null);
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSectionName, setSelectedSectionName] = useState("");
  const [showEditSectionModal, setShowEditSectionModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalizedSemester = semester === "1ST SEM" ? "1st" : semester === "2ND SEM" ? "2nd" : semester;

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [student.name, student.usn, student.section]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  useEffect(() => { fetchSections(); }, [program]);

  useEffect(() => {
    if (!selectedProgramId && schoolYear && semester) {
      const fetchProgramId = async () => {
        try {
          const yearKey = schoolYear.match(/(\d{4}-\d{4})/)? schoolYear.match(/(\d{4}-\d{4})/)[1] : schoolYear;
          const semesterKey = semester === "1ST SEM" ? "1st" : semester === "2ND SEM" ? "2nd" : semester;
          const response = await axios.get("/programs", {
            params: { schoolYear: yearKey, semester: semesterKey }
          });
          const found = (response.data || []).find((item) => item.name === program);
          if (found) setSelectedProgramId(found._id);
        } catch (err) {
          // ignore program id resolution failure for now
        }
      };
      fetchProgramId();
    }
  }, [selectedProgramId, program, schoolYear, semester]);

  useEffect(() => { fetchProgramStudents(); }, [program, selectedSection, schoolYear, semester]);

  const fetchProgramStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const semesterKey = normalizedSemester || (semester === "1ST SEM" ? "1st" : semester === "2ND SEM" ? "2nd" : semester);
      const yearKey = schoolYear.match(/(\d{4}-\d{4})/) ? schoolYear.match(/(\d{4}-\d{4})/)[1] : schoolYear;
      const response = await axios.get("/students", {
        params: {
          schoolYear: yearKey,
          semester: semesterKey
        }
      });
      let programStudents = response.data.filter(
        (s) =>
          s.program === program &&
          s.role === "student"
      );
      if (selectedSection && selectedSection !== "ALL") {
        programStudents = programStudents.filter((s) => s.section === selectedSection);
      }
      setStudents(programStudents);
      const routeStudentId = location.state?.studentId;
      if (routeStudentId) {
        const routeStudent = programStudents.find((s) => s._id === routeStudentId);
        setSelectedStudent(routeStudent || (programStudents.length > 0 ? programStudents[0] : null));
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
      const res = await axios.get(`/program/${program}/sections`);
      setSections(res.data || []);
      setSelectedSection(res.data?.length > 0 ? "ALL" : "");
    } catch {}
  };

  const handleSectionChange = async (val) => {
    if (val === "__ADD_SECTION__") {
      const name = window.prompt("Enter new section name (e.g. WADT 3D):");
      if (!name) return;
      try {
        await axios.post(`/program/${program}/sections`, { name });
        await fetchSections();
        setSelectedSection(name);
      } catch (err) {
        alert(err.response?.data?.message || "Failed to add section");
      }
    } else {
      setSelectedSection(val);
    }
  };

  const handleEditSectionRequest = () => {
    if (!selectedProgramId || !selectedSection || selectedSection === "ALL") return;
    setSelectedSectionName(selectedSection);
    setShowEditSectionModal(true);
  };

  const handleSectionUpdated = (updatedProgram, newSectionName) => {
    const updatedSections = (updatedProgram.sections || []).map((section) => ({ _id: section, name: section }));
    setSections(updatedSections);
    if (selectedSection === selectedSectionName && newSectionName) {
      setSelectedSection(newSectionName);
    }
  };

  return (
    <MainLayout user={{ name: "User" }} onMenuItemClick={(item) => { if (item === "home") navigate("/home"); }}>
      <div className="page-content">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/semester")} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors text-sm">←</button>
            <div>
              <h1 className="page-title mb-0">📖 {program} Program</h1>
              <p className="page-subtitle">Student payment management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full max-w-xs">
            {auth?.role === "admin" && (
              <button
                type="button"
                onClick={handleEditSectionRequest}
                disabled={!selectedProgramId || !selectedSection || selectedSection === "ALL"}
                title={!selectedSection || selectedSection === "ALL" ? "Select a section to edit" : "Edit section"}
                className="inline-flex items-center justify-center h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <option key={s._id} value={s.name}>{s.name}</option>
              ))}
              <option value="__ADD_SECTION__">+ Add Section...</option>
            </select>
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

        {loading ? (
          <PageLoader text="Loading students..." />
        ) : (
          <div className="flex flex-col gap-2 md:gap-6 md:flex-row w-full overflow-x-hidden">
            {/* Students list */}
            <div className="w-full md:w-48 max-w-full flex-shrink-0">
              <div className="card p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-semibold text-slate-700 text-sm">Students ({filteredStudents.length})</h3>
                    <p className="text-xs text-slate-500">Section: {selectedSection || "All"}</p>
                  </div>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search students by name, USN, or section"
                    className="input w-full border-slate-200 bg-white text-sm"
                  />
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="p-6">
                    <EmptyState icon="🔍" title="No students found" subtitle="Try another search term or section." />
                  </div>
                ) : (
                  <div className="overflow-y-auto max-h-[18rem] lg:max-h-[calc(100vh-220px)] scrollbar-hide">
                    {filteredStudents.map((student) => (
                      <button
                        key={student._id}
                        onClick={() => setSelectedStudent(student)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-100 last:border-0 transition-colors ${
                          selectedStudent?._id === student._id
                            ? "bg-primary-50 border-l-2 border-l-primary-500"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selectedStudent?._id === student._id ? "bg-primary-600 text-white" : "bg-slate-200 text-slate-600"}`}>
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

            {/* Payment details */}
            <div className="w-full md:flex-1 max-w-full">
              {selectedStudent ? (
                <StudentPayments studentId={selectedStudent._id} initialData={selectedStudent} />
              ) : (
                <EmptyState icon="👈" title="Select a student" subtitle="Click on a student from the list to view their payment details." />
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

