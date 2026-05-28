import React, { useState, useEffect, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import axios from "../api/axios";
import { PageLoader, EmptyState } from "../components/ui";

export default function Assessment() {
  const { schoolYear, semester, updateSemester } = useContext(AuthContext);
  const navigate = useNavigate();
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(schoolYear || "");
  const [selectedSemester, setSelectedSemester] = useState(semester || "1ST SEM");
  const [selectedNC, setSelectedNC] = useState("");
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const semesters = ["1ST SEM", "2ND SEM"];
  const ncOptions = ["CSS", "Bookkeeping", "FBS", "Tourism", "Housekeeping"];
  const addBtnRef = useRef(null);
  const [addMenuPos, setAddMenuPos] = useState(null);
  const addMenuRef = useRef(null);

  const toggleAddMenu = () => {
    if (addMenuPos) return setAddMenuPos(null);
    const rect = addBtnRef.current?.getBoundingClientRect();
    if (!rect) return setAddMenuPos(null);
    setAddMenuPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
  };

  useEffect(() => {
    if (!addMenuPos) return;
    const updatePos = () => {
      const rect = addBtnRef.current?.getBoundingClientRect();
      if (!rect) { setAddMenuPos(null); return; }
      setAddMenuPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
    };
    const onScrollResize = () => updatePos();
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    const onDocClick = (e) => {
      if (!addBtnRef.current?.contains(e.target) && !addMenuRef.current?.contains(e.target)) {
        setAddMenuPos(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => {
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [addMenuPos]);

  const programIcons = { HRT: "HR", HT: "HT", OAT: "OA", OMT: "OM", MGT: "MG", WADT: "WA" };

  const normalizeSchoolYearLabel = (value) => {
    const match = String(value || "").match(/(\d{4}-\d{4})/);
    return match ? match[1] : value;
  };

  useEffect(() => {
    const fetchSchoolYears = async () => {
      try {
        const res = await axios.get("/school-years");
        setSchoolYears(res.data || []);
      } catch (err) {
        console.error("Failed to fetch school years", err);
      }
    };
    fetchSchoolYears();
  }, []);

  useEffect(() => {
    // If NC is selected, do not fetch or display programs/students yet
    if (selectedNC) {
      setPrograms([]);
      setStudents([]);
      setLoadingPrograms(false);
      setLoadingStudents(false);
      return;
    }

    if (!selectedSchoolYear || !selectedSemester) {
      setPrograms([]);
      setStudents([]);
      return;
    }

    const fetchPrograms = async () => {
      setLoadingPrograms(true);
      try {
        const semesterKey = selectedSemester === "1ST SEM" ? "1st" : "2nd";
        const yearKey = normalizeSchoolYearLabel(selectedSchoolYear);
        const res = await axios.get("/programs", {
          params: { schoolYear: yearKey, semester: semesterKey }
        });
        setPrograms(res.data || []);
      } catch (err) {
        console.error("Failed to fetch programs", err);
        setPrograms([]);
      } finally {
        setLoadingPrograms(false);
      }
    };

    const fetchStudents = async () => {
      setLoadingStudents(true);
      setStudentsError(null);
      try {
        const semesterKey = selectedSemester === "1ST SEM" ? "1st" : "2nd";
        const yearKey = normalizeSchoolYearLabel(selectedSchoolYear);
        const res = await axios.get("/students", {
          params: { schoolYear: yearKey, semester: semesterKey }
        });
        const studentData = Array.isArray(res.data) ? res.data : [];
        setStudents(studentData.filter((student) => student.role === "student"));
      } catch (err) {
        console.error("Failed to fetch students", err);
        setStudents([]);
        setStudentsError("Failed to load students.");
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchPrograms();
    fetchStudents();
  }, [selectedSchoolYear, selectedSemester, selectedNC]);

  const handleSemesterChange = (sem) => {
    setSelectedSemester(sem);
    updateSemester(sem);
  };

  const handleProgramClick = (program) => {
    navigate(`/assessment/${program.name}`, {
      state: {
        program: program.name,
        programId: program._id,
        schoolYear: normalizeSchoolYearLabel(selectedSchoolYear),
        semester: selectedSemester
      }
    });
  };

  const filteredStudents = students.filter((student) => {
    if (!searchQuery) return true;
    const query = searchQuery.trim().toLowerCase();
    return [student.name, student.usn, student.section]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [selectedCsvName, setSelectedCsvName] = useState("");
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvError, setCsvError] = useState(null);
  const [showCsvMenu, setShowCsvMenu] = useState(false);

  const csvInputRef = useRef(null);

  const handleCsvFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedCsvName(file.name);
    setCsvError(null);
  };

  const downloadTemplate = () => {
    const template = [
      ["name", "section", "program", "date", "competency"],
      ["John Doe", "A1", "HRT", "2026-05-17", "competent"]
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "assessment_competency_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const uploadCsv = async () => {
    try {
      const fileEl = csvInputRef.current;
      const file = fileEl?.files?.[0];
      if (!file) {
        setCsvError("Please choose a CSV file first.");
        return;
      }
      setCsvUploading(true);
      const form = new FormData();
      form.append("file", file);
      // include context if available
      if (selectedSchoolYear) form.append("schoolYear", normalizeSchoolYearLabel(selectedSchoolYear));
      if (selectedSemester) form.append("semester", selectedSemester);
      try {
        await axios.post("/assessments/upload-csv", form, { headers: { "Content-Type": "multipart/form-data" } });
        setShowCsvModal(false);
        setSelectedCsvName("");
      } catch (err) {
        console.warn("CSV upload failed", err);
        setCsvError(err.response?.data?.message || "Failed to upload CSV (no server route). File selected locally.");
      }
    } finally {
      setCsvUploading(false);
    }
  };

  return (
    <MainLayout>
      <div className="aurora-container">
        <div className="mb-8 rounded-3xl border border-white/15 bg-white/10 py-4 px-6 shadow-card backdrop-blur-xl md:py-5 md:px-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/20 px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-sm shadow-slate-900/10">
                Assessment
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCsvMenu((s) => !s)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="More actions"
                >
                  <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>

                {showCsvMenu && (
                  <>
                    <div className="fixed inset-0 z-70" onClick={() => setShowCsvMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-modal border border-slate-100 dark:border-slate-800 z-80 py-1">
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                        onClick={() => { setShowCsvMenu(false); setShowCsvModal(true); }}
                      >
                        Add CSV file
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {showCsvModal && createPortal(
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99990, background: 'rgba(0,0,0,0.25)' }} onClick={() => { setShowCsvModal(false); setSelectedCsvName(""); setCsvError(null); }} />
              <div style={{ position: 'fixed', left: 0, right: 0, top: '8rem', display: 'flex', justifyContent: 'center', padding: '1rem', zIndex: 99991 }}>
                <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add CSV file</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Upload a CSV file for updating multiple assessment competency.</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Required columns: <code className="rounded bg-slate-100 px-1 py-0.5">name</code>, <code className="rounded bg-slate-100 px-1 py-0.5">section</code>, <code className="rounded bg-slate-100 px-1 py-0.5">program</code>, <code className="rounded bg-slate-100 px-1 py-0.5">date</code>, <code className="rounded bg-slate-100 px-1 py-0.5">competency</code>.
                      Use <strong>competent</strong> or <strong>incompetent</strong>, and a valid date format like <code className="rounded bg-slate-100 px-1 py-0.5">2026-05-17</code>.
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} className="hidden" />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => csvInputRef.current?.click()} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors">Choose file</button>
                        <div className="text-sm text-slate-600 dark:text-slate-400 truncate">{selectedCsvName || "No file chosen"}</div>
                      </div>
                      <button type="button" onClick={downloadTemplate} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors">Download template</button>
                    </div>
                    {csvError && <p className="text-sm text-red-600 dark:text-red-400">{csvError}</p>}
                  </div>
                  <div className="flex flex-col gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 sm:flex-row sm:justify-end sm:items-center">
                    <button type="button" onClick={() => { setShowCsvModal(false); setSelectedCsvName(""); setCsvError(null); }} className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors">Cancel</button>
                    <button type="button" onClick={uploadCsv} disabled={csvUploading} className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60">{csvUploading ? "Uploading..." : "Upload CSV"}</button>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )}
        </div>

        <div className="aurora-card mb-6">
          <div className="aurora-card-content space-y-6">
            {schoolYears.length > 0 ? (
              <div className="flex items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                  <label className="input-label text-sm text-slate-700 dark:text-slate-300 mr-2 mb-0">NC Assessment</label>
                  <select
                    value={selectedNC}
                    onChange={(e) => setSelectedNC(e.target.value)}
                    className="input w-40"
                  >
                    <option value="" disabled hidden>Select NC</option>
                    {ncOptions.map((nc) => (
                      <option key={nc} value={nc}>{nc}</option>
                    ))}
                  </select>
                </div>
                  <div className="flex items-center gap-3">
                    <label className="input-label text-sm text-slate-700 dark:text-slate-300 mr-2 mb-0">School Year</label>
                    <select
                      value={selectedSchoolYear}
                      onChange={(e) => setSelectedSchoolYear(e.target.value)}
                      className="input w-48"
                    >
                    <option value="" disabled hidden>
                      Choose a school year
                    </option>
                    {schoolYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      ref={addBtnRef}
                      type="button"
                      onClick={toggleAddMenu}
                      aria-expanded={Boolean(addMenuPos)}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-lg"
                      title="Add"
                    >
                      +
                    </button>

                    {addMenuPos && createPortal(
                      <div
                        ref={addMenuRef}
                        style={{
                          position: 'absolute',
                          top: addMenuPos.top + 'px',
                          left: (addMenuPos.left + addMenuPos.width - 176) + 'px',
                          width: 176,
                          zIndex: 99999
                        }}
                        className="bg-white rounded-md border border-slate-200 shadow-lg"
                      >
                        <button type="button" className="w-full text-left px-4 py-2 hover:bg-slate-100" onClick={() => { console.log('Single student'); setAddMenuPos(null); }}>Single student</button>
                        <button type="button" className="w-full text-left px-4 py-2 hover:bg-slate-100" onClick={() => { console.log('Bulk'); setAddMenuPos(null); }}>Bulk</button>
                        <button type="button" className="w-full text-left px-4 py-2 hover:bg-slate-100" onClick={() => { console.log('Section'); setAddMenuPos(null); }}>Section</button>
                        <button type="button" className="w-full text-left px-4 py-2 hover:bg-slate-100" onClick={() => { console.log('Program'); setAddMenuPos(null); }}>Program</button>
                      </div>,
                      document.body
                    )}
                  </div>
                </div>

                {/* Semester control removed — using selectedSemester from context/default */}
              </div>
            ) : (
              <EmptyState
                icon="📚"
                title="No School Years"
                description="No school years have been created yet."
              />
            )}
          </div>
        </div>

        {selectedSchoolYear && selectedSemester && !selectedNC && (
          <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
            <div className="card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900">Students</h2>
                </div>
                <span className="badge badge-blue">{filteredStudents.length} total</span>
              </div>

              <div className="space-y-4">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students by name, USN, or section"
                  className="input w-full"
                />

                {loadingStudents ? (
                  <PageLoader text="Loading students..." />
                ) : studentsError ? (
                  <EmptyState icon="⚠️" title="Unable to load students" description={studentsError} />
                ) : filteredStudents.length === 0 ? (
                  <EmptyState
                    icon="👥"
                    title={students.length === 0 ? "No Students" : "No matching students"}
                    description={students.length === 0 ? "No student records found for this semester." : "Try another search term."}
                  />
                ) : (
                  <div className="max-h-[18rem] overflow-y-auto space-y-2 scrollbar-hide">
                    {filteredStudents.map((student) => (
                      <button
                        key={student._id || student.usn}
                        type="button"
                        className="w-full flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-2 text-left transition-colors hover:bg-slate-50"
                        onClick={() => handleProgramClick({ name: student.program || "", _id: null })}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-slate-900">{student.name || "Unnamed Student"}</p>
                          </div>
                        </div>
                        <span className="badge badge-blue uppercase text-[10px]">{student.section || "No section"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="mb-4">
                <h2 className="font-display text-lg font-semibold text-slate-900">Browse by Program</h2>
              </div>

              {loadingPrograms ? (
                <div className="py-12">
                  <PageLoader text="Loading programs..." />
                </div>
              ) : programs.length === 0 ? (
                <EmptyState icon="🏷" title="No Programs" description="No programs found for this semester." />
              ) : (
                <div className="grid grid-cols-2 gap-3 auto-rows-fr">
                  {programs.map((program) => (
                    <button
                      key={program._id}
                      type="button"
                      onClick={() => handleProgramClick(program)}
                      className="group flex h-full flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-primary-300 hover:bg-primary-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                          {programIcons[program.name] || program.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-900">{program.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}