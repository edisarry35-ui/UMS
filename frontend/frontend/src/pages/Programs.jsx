import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import axios from "../api/axios";
import AddProgramModal from "../components/AddProgramModal";
import AddProgramSectionModal from "../components/AddProgramSectionModal";

export default function Programs() {
  const { schoolYear, semester, updateSemester } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedSemester, setSelectedSemester] = useState(semester || "");
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [expandedProgramId, setExpandedProgramId] = useState(null);

  const semesters = ["1ST SEM", "2ND SEM"];
  const programIcons = { HRT: "HR", HT: "HT", OAT: "OA", OMT: "OM", MGT: "MG", WADT: "WA" };
  const programDesc = {
    HRT: "Hotel & Restaurant Technology",
    HT: "Hospitality Technology",
    OAT: "Office Administration Technology",
    OMT: "Operations Management Technology",
    MGT: "Management",
    WADT: "Web and Application Development Technology"
  };
  const featuredPrograms = programs.length > 0 ? [...new Set(programs.map((item) => item.name).filter(Boolean))] : [];

  const extractYearFromSchoolYear = (sy) => {
    if (!sy) return "";
    const match = sy.match(/(\d{4}-\d{4})/);
    return match ? match[1] : sy;
  };

  const normalizeSemester = (sem) => {
    if (!sem) return "";
    if (sem === "1ST SEM" || sem === "1ST" || sem === "1st") return "1st";
    if (sem === "2ND SEM" || sem === "2ND" || sem === "2nd") return "2nd";
    return "";
  };

  const handleSemesterChange = (e) => {
    setSelectedSemester(e.target.value);
    updateSemester(e.target.value);
  };

  useEffect(() => {
    if (selectedSemester) {
      fetchPrograms();
    }
  }, [selectedSemester, schoolYear]);

  const fetchPrograms = async () => {
    try {
      setLoadingPrograms(true);
      const year = extractYearFromSchoolYear(schoolYear);
      const sem = normalizeSemester(selectedSemester);
      
      if (!year || !sem) {
        setPrograms([]);
        return;
      }

      const response = await axios.get("/programs", {
        params: {
          schoolYear: year,
          semester: sem
        }
      });
      setPrograms(response.data || []);
    } catch (err) {
      console.error("Failed to fetch programs", err);
      setPrograms([]);
    } finally {
      setLoadingPrograms(false);
    }
  };

  const handleProgramClick = (programEntry) => {
    const programName = typeof programEntry === "string" ? programEntry : programEntry?.name;
    if (!programName) return;

    navigate(`/program/${programName}`, {
      state: {
        program: programName,
        programId: typeof programEntry === "object" ? programEntry?._id : undefined,
        schoolYear: extractYearFromSchoolYear(schoolYear),
        semester: selectedSemester
      }
    });
  };

  const handleAddSectionClick = (e, programId) => {
    e.stopPropagation();
    setSelectedProgramId(programId);
    setShowAddSectionModal(true);
  };

  const handleProgramAdded = (newProgram) => {
    setPrograms([...programs, newProgram]);
  };

  const handleSectionAdded = (updatedProgram) => {
    setPrograms(programs.map(p => p._id === updatedProgram._id ? updatedProgram : p));
  };

  const handleDeleteSection = async (e, programId, sectionName) => {
    e.stopPropagation();
    if (!window.confirm(`Delete section "${sectionName}"?`)) return;

    try {
      const response = await axios.delete(`/programs/${programId}/sections/${encodeURIComponent(sectionName)}`);
      setPrograms(programs.map(p => p._id === programId ? response.data : p));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete section");
    }
  };

  const handleDeleteProgram = async (e, programId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this program?")) return;

    try {
      await axios.delete(`/programs/${programId}`);
      setPrograms(programs.filter(p => p._id !== programId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete program");
    }
  };

  return (
    <MainLayout user={{ name: "User" }} onMenuItemClick={(item) => { if (item === "home") navigate("/home"); }}>
      <div className="page-content">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/school-year")} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors text-sm">←</button>
          <div>
            <h1 className="page-title mb-0">{schoolYear}</h1>
            <p className="page-subtitle">Select Program to view students and payments</p>
          </div>
        </div>

        <div className="card mb-6 max-w-full sm:max-w-md">
          <label className="input-label">Semester</label>
          <select className="input" value={selectedSemester} onChange={handleSemesterChange}>
            <option value="">— Select Semester —</option>
            {semesters.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {selectedSemester && (
          <>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold">Browse by Program</h2>
              </div>
              <button
                onClick={() => setShowAddProgramModal(true)}
                className="btn-primary text-sm whitespace-nowrap"
              >
                + Add Program
              </button>
            </div>

            <div className="mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setShowAddProgramModal(true)}
                  className="card-hover flex items-center justify-center text-center p-5 group hover:border-primary-200 border-2 border-slate-100 bg-white"
                >
                  <span className="text-primary-700 font-semibold">+ Add Program</span>
                </button>
                {featuredPrograms.map((programName) => {
                  const matchedProgram = programs.find((item) => item.name === programName);

                  return (
                    <button
                      key={programName}
                      onClick={() => handleProgramClick(matchedProgram || programName)}
                      className="card-hover flex items-center gap-4 text-left p-5 group hover:border-primary-200 border-2 border-slate-100"
                    >
                      <span className="icon-theme icon-theme-lg">
                        {programIcons[programName] || programName.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-display font-bold text-slate-900 mb-1">{programName}</h3>
                        <p className="text-xs text-slate-500">{programDesc[programName] || "Program overview and sections"}</p>
                      </div>
                      <span className="text-slate-300 group-hover:text-primary-400 transition-colors text-lg">→</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Programs</h2>

              {loadingPrograms ? (
                <div className="text-center py-8 text-slate-500">Loading programs...</div>
              ) : programs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No programs yet. Create one to get started.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {programs.map(program => (
                    <div
                      key={program._id}
                      className="border-2 border-slate-100 rounded-xl overflow-hidden hover:border-primary-200 transition-colors"
                    >
                      <div
                        className="p-5 cursor-pointer hover:bg-slate-50"
                        onClick={() => setExpandedProgramId(expandedProgramId === program._id ? null : program._id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">{program.name}</h3>
                            {program.description && (
                              <p className="text-xs text-slate-500 mt-1">{program.description}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-2">
                              {program.sections?.length || 0} section(s)
                            </p>
                          </div>
                          <span className="text-2xl">{expandedProgramId === program._id ? "▼" : "▶"}</span>
                        </div>
                      </div>

                      {expandedProgramId === program._id && (
                        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-2">
                          {program.sections && program.sections.length > 0 ? (
                            program.sections.map(section => (
                              <div key={section} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100">
                                <span className="text-sm text-slate-700">{section}</span>
                                <button
                                  onClick={(e) => handleDeleteSection(e, program._id, section)}
                                  className="text-red-600 hover:text-red-800 text-xs px-2 py-1 hover:bg-red-50 rounded"
                                >
                                  Remove
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-400">No sections yet</p>
                          )}

                          <button
                            onClick={(e) => handleAddSectionClick(e, program._id)}
                            className="w-full mt-3 py-2 px-3 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            + Add Section
                          </button>

                          <button
                            onClick={(e) => handleDeleteProgram(e, program._id)}
                            className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            Delete Program
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <AddProgramModal
          isOpen={showAddProgramModal}
          onClose={() => setShowAddProgramModal(false)}
          schoolYear={extractYearFromSchoolYear(schoolYear)}
          semester={normalizeSemester(selectedSemester)}
          onProgramAdded={handleProgramAdded}
        />

        <AddProgramSectionModal
          isOpen={showAddSectionModal}
          onClose={() => setShowAddSectionModal(false)}
          programId={selectedProgramId}
          onSectionAdded={handleSectionAdded}
        />
      </div>
    </MainLayout>
  );
}

