import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import axios from "../api/axios";
import { PageLoader, EmptyState } from "../components/ui";
import AddProgramModal from "../components/AddProgramModal";
import AddProgramSectionModal from "../components/AddProgramSectionModal";
import EditProgramModal from "../components/modals/EditProgramModal";
import ProgramDetail from "./ProgramDetail";

export default function Semester({ embedded = false, onBack }) {
  const { schoolYear, semester, updateSemester } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedSemester, setSelectedSemester] = useState(semester || "");
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showEditProgramModal, setShowEditProgramModal] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [openMenuProgramId, setOpenMenuProgramId] = useState(null);
  const [activeProgramName, setActiveProgramName] = useState(null);
  const [activeProgramId, setActiveProgramId] = useState(null);
  const [showProgramDetail, setShowProgramDetail] = useState(false);

  const semesters = ["1ST SEM", "2ND SEM"];

  const normalizeSchoolYearLabel = (value) => {
    const match = String(value || "").match(/(\d{4}-\d{4})/);
    return match ? match[1] : value;
  };

  const handleProgramClick = (programEntry) => {
    const programName = typeof programEntry === "string" ? programEntry : programEntry?.name;
    if (!programName) return;

    if (embedded) {
      setActiveProgramName(programName);
      setActiveProgramId(typeof programEntry === "object" ? programEntry?._id : undefined);
      setShowProgramDetail(true);
      return;
    }

    navigate(`/program/${programName}`, {
      state: {
        program: programName,
        programId: typeof programEntry === "object" ? programEntry?._id : undefined,
        schoolYear: normalizeSchoolYearLabel(schoolYear),
        semester: selectedSemester
      }
    });
  };
  const handleSemesterChange = (sem) => { setSelectedSemester(sem); updateSemester(sem); };

  useEffect(() => {
    if (!selectedSemester) { setStudents([]); return; }
    setLoadingStudents(true);
    const semesterKey = selectedSemester === "1ST SEM" ? "1st" : "2nd";
    const yearKey = schoolYear.match(/(\d{4}-\d{4})/) ? schoolYear.match(/(\d{4}-\d{4})/)[1] : schoolYear;

    axios.get("/students", {
      params: {
        schoolYear: yearKey,
        semester: semesterKey
      }
    })
      .then(res => {
        const all = (res.data || []).filter(
          s => s.role === "student"
        );
        all.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(all);
      })
      .catch(err => console.error("Failed to fetch students", err))
      .finally(() => setLoadingStudents(false));
  }, [selectedSemester, schoolYear]);

  useEffect(() => {
    const fetchPrograms = async () => {
      if (!selectedSemester || !schoolYear) {
        setPrograms([]);
        return;
      }
      setLoadingPrograms(true);
      const semesterKey = selectedSemester === "1ST SEM" ? "1st" : "2nd";
      const yearKey = schoolYear.match(/(\d{4}-\d{4})/) ? schoolYear.match(/(\d{4}-\d{4})/)[1] : schoolYear;
      try {
        const res = await axios.get("/programs", { params: { schoolYear: yearKey, semester: semesterKey } });
        setPrograms(res.data || []);
      } catch (err) {
        console.error("Failed to fetch programs", err);
        setPrograms([]);
      } finally {
        setLoadingPrograms(false);
      }
    };
    fetchPrograms();
  }, [selectedSemester, schoolYear]);

  const filteredStudents = students.filter(s => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const studentProgram = s.program || s.Program || "";
    return (s.name || "").toLowerCase().includes(q) || studentProgram.toLowerCase().includes(q);
  });

  const programIcons = { HRT: "HR", HT: "HT", OAT: "OA", OMT: "OM", MGT: "MG", WADT: "WA" };

  const handleProgramAdded = (newProgram) => {
    setPrograms((prev) => [...prev, newProgram]);
  };

  const handleProgramUpdated = (updatedProgram) => {
    setPrograms((prev) => prev.map((p) => (p._id === updatedProgram._id ? updatedProgram : p)));
    setOpenMenuProgramId(null);
  };

  const handleProgramSectionAdded = (updatedProgram) => {
    setPrograms((prev) => prev.map((p) => (p._id === updatedProgram._id ? updatedProgram : p)));
  };

  const openAddSection = (programId) => {
    setSelectedProgramId(programId);
    setShowAddSectionModal(true);
  };

  const handleEditProgramClick = (program) => {
    setSelectedProgram(program);
    setShowEditProgramModal(true);
  };

  const handleDeleteProgram = async (progId) => {
    const program = programs.find((p) => p._id === progId);
    const programName = program?.name || "this program";
    const confirmed = window.confirm(
      `Are you sure you want to delete the program "${programName}"?\n\nThis will also delete all sections associated with this program and cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await axios.delete(`/programs/${progId}`);
      setPrograms((prev) => prev.filter((p) => p._id !== progId));
      setOpenMenuProgramId(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete program");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      if (!target.closest('.program-card-menu') && !target.closest('.program-card-menu-button')) {
        setOpenMenuProgramId(null);
      }
    };

    if (openMenuProgramId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuProgramId]);

  const pageContent = (
    <div className="page-content">
      <div className="flex items-center gap-3 mb-6">
        {embedded ? (
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors text-sm">←</button>
        ) : (
          <button onClick={() => navigate("/school-year")} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors text-sm">←</button>
        )}
        <div>
          <h1 className="page-title mb-0">Select Semester</h1>
          <p className="page-subtitle">{schoolYear}</p>
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Semester & Students */}
          <div className="space-y-5">
            {/* Semester selector */}
            <div className="card">
              <h3 className="font-display font-semibold text-slate-800 mb-3">Semester</h3>
              <div className="flex gap-3">
                {semesters.map((sem) => (
                  <button
                    key={sem}
                    onClick={() => handleSemesterChange(sem)}
                    className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                      selectedSemester === sem
                        ? "border-primary-400 bg-primary-50 text-primary-800"
                        : "border-slate-100 bg-white text-slate-600 hover:border-primary-200"
                    }`}
                  >
                    {sem}
                  </button>
                ))}
              </div>
            </div>

            {/* Students list */}
            {selectedSemester && (
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold text-slate-800">Students</h3>
                  <span className="badge badge-blue">{filteredStudents.length} total</span>
                </div>
                <input
                  className="input mb-3"
                  type="text"
                  placeholder="Search students or programs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {loadingStudents ? (
                  <PageLoader text="Loading students..." />
                ) : filteredStudents.length === 0 ? (
                  <EmptyState icon="👥" title="No students found" subtitle="No students are registered for this semester." />
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1.5 scrollbar-hide">
                    {filteredStudents.map((s) => {
                      const studentProgram = s.program || s.Program;
                      const matchedProgram = programs.find((programItem) => programItem.name === studentProgram);

                      return (
                        <button
                          key={s._id || s.usn}
                          onClick={() => handleProgramClick({ name: studentProgram, _id: matchedProgram?._id })}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                              {s.name?.[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-slate-700">{s.name}</span>
                          </div>
                          <span className="badge badge-blue text-[10px]">{studentProgram}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Programs */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-slate-800">Browse by Program</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowAddProgramModal(true)}
                className="flex flex-col items-center justify-center gap-2 p-5 bg-white border-2 border-dashed border-primary-300 rounded-xl hover:bg-primary-50 transition-all text-center"
              >
                <span className="text-primary-700 text-2xl">+</span>
                <span className="text-sm font-medium text-primary-700">Add Program</span>
              </button>

              {loadingPrograms ? (
                <div className="col-span-2 flex justify-center py-8">
                  <PageLoader text="Loading programs..." />
                </div>
              ) : (
                programs.map((program) => (
                  <button
                    key={program._id}
                    type="button"
                    onClick={() => handleProgramClick(program)}
                    className="relative flex flex-col items-center gap-2 p-5 rounded-xl bg-slate-50 border-2 border-slate-100 hover:border-primary-300 hover:bg-primary-50 transition-colors text-center"
                  >
                    <div className="w-full flex items-start justify-between gap-3">
                      <span className="icon-theme icon-theme-md">
                        {programIcons[program.name] || program.name.slice(0, 2).toUpperCase()}
                      </span>
                      <button
                        type="button"
                        className="program-card-menu-button inline-flex h-9 w-9 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuProgramId((prev) => (prev === program._id ? null : program._id));
                        }}
                        aria-label={`Open actions for ${program.name}`}
                      >
                        ⋮
                      </button>
                    </div>

                    <span className="font-display font-bold text-slate-800">{program.name}</span>

                    {openMenuProgramId === program._id && (
                      <div className="program-card-menu absolute right-3 top-12 z-20 w-36 rounded-xl border border-slate-200 bg-white shadow-lg dark:bg-slate-900 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuProgramId(null);
                            handleEditProgramClick(program);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuProgramId(null);
                            handleDeleteProgram(program._id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <AddProgramModal
          isOpen={showAddProgramModal}
          onClose={() => setShowAddProgramModal(false)}
          schoolYear={schoolYear.match(/(\d{4}-\d{4})/)?.[1] || schoolYear}
          semester={selectedSemester === "1ST SEM" ? "1st" : selectedSemester === "2ND SEM" ? "2nd" : ""}
          onProgramAdded={handleProgramAdded}
        />

        <EditProgramModal
          isOpen={showEditProgramModal}
          onClose={() => setShowEditProgramModal(false)}
          program={selectedProgram}
          onProgramUpdated={handleProgramUpdated}
        />

        <AddProgramSectionModal
          isOpen={showAddSectionModal}
          onClose={() => setShowAddSectionModal(false)}
          programId={selectedProgramId}
          onSectionAdded={handleProgramSectionAdded}
        />
      </div>
    );

  if (showProgramDetail) {
    return (
      <ProgramDetail
        embedded={embedded}
        onBack={() => setShowProgramDetail(false)}
        programName={activeProgramName}
        programId={activeProgramId}
      />
    );
  }

  if (embedded) return pageContent;

  return (
    <MainLayout user={{ name: "User" }} onMenuItemClick={(item) => { if (item === "home") navigate("/home"); }}>
      {pageContent}
    </MainLayout>
  );
}

