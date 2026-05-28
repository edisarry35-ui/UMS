import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { Alert, Spinner } from "../ui";
import { useNotification } from "../../context/NotificationContext";
import { GraduationCap, Briefcase, ShieldCheck, UploadCloud, UserPlus } from "lucide-react";

export default function AddUserModal({ onClose, onSuccess, onBulkImport }) {
  const { notify } = useNotification();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [formData, setFormData] = useState({ name: "", usn: "", program: "", section: "", schoolYear: "", semester: "1st", username: "", password: "" });
  const [sections, setSections] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizeSchoolYearValue = (year) => {
    const value = String(year || "").trim();
    const match = value.match(/(\d{4}-\d{4})/);
    return match ? match[1] : value.replace(/^SY\s*/i, "");
  };

  const formatSchoolYearLabel = (year) => {
    const normalized = normalizeSchoolYearValue(year);
    return normalized ? `SY ${normalized}` : year;
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep(role === "student" ? 3 : 2);
    setError("");
  };

  useEffect(() => {
    const loadSchoolYears = async () => {
      try {
        const response = await api.get("/school-years");
        if (Array.isArray(response.data) && response.data.length > 0) {
          const normalizedYears = [...new Set(response.data.map(normalizeSchoolYearValue).filter(Boolean))].sort();
          setSchoolYears(normalizedYears);
        } else {
          setSchoolYears([]);
        }
      } catch (err) {
        console.error("Failed to fetch school years", err);
      }
    };
    loadSchoolYears();
  }, []);

  useEffect(() => {
    const loadPrograms = async () => {
      if (!formData.schoolYear || !formData.semester) {
        setPrograms([]);
        return;
      }
      try {
        const response = await api.get("/programs", {
          params: { schoolYear: formData.schoolYear, semester: formData.semester }
        });
        if (Array.isArray(response.data)) {
          setPrograms(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch programs", err);
        setPrograms([]);
      }
    };
    loadPrograms();
  }, [formData.schoolYear, formData.semester]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // If program changes, reset section and fetch new sections
    if (name === "program") {
      setFormData(prev => ({ ...prev, section: "" }));
      if (value) {
        fetchSections(value);
      } else {
        setSections([]);
      }
    }

    // If schoolYear or semester changes, reset program and section
    if (name === "schoolYear" || name === "semester") {
      setFormData(prev => ({ ...prev, program: "", section: "" }));
      setSections([]);
    }
  };

  const fetchSections = async (program) => {
    try {
      const response = await api.get(`/program/${program}/sections`, {
        params: {
          schoolYear: formData.schoolYear,
          semester: formData.semester
        }
      });
      setSections(response.data);
    } catch (err) {
      console.error("Failed to fetch sections:", err);
      setSections([]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let payload = { role: selectedRole };
      if (selectedRole === "student") {
        if (!formData.name.trim() || !formData.usn.trim() || !formData.program.trim() || !formData.section.trim() || !formData.schoolYear.trim() || !formData.semester.trim()) {
          setError("Please fill in all fields");
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          name: formData.name,
          usn: formData.usn,
          program: formData.program,
          section: formData.section,
          schoolYear: formData.schoolYear,
          semester: formData.semester
        };
      } else {
        if (!formData.username.trim() || !formData.password.trim()) {
          setError("Please fill in all fields");
          setLoading(false);
          return;
        }
        payload = { ...payload, username: formData.username, password: formData.password };
      }
      const endpoint = selectedRole === "student" ? "/students" : "/register";
      const response = await api.post(endpoint, payload);
      const userName = response.data?.name || response.data?.username || formData.name || formData.username || selectedRole;
      const message = `${selectedRole === 'student' ? 'Student' : 'User'} "${userName}" has been added successfully!`;
      notify("success", message);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add user");
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setSelectedRole("");
    setFormData({ name: "", usn: "", program: "", section: "", username: "", password: "" });
    setSections([]);
    setError("");
  };

  const roleCards = [
    { id: "student", icon: GraduationCap, title: "Student", color: "hover:border-emerald-300 hover:bg-emerald-50" },
    { id: "staff", icon: Briefcase, title: "Staff", color: "hover:border-blue-300 hover:bg-blue-50" },
    { id: "admin", icon: ShieldCheck, title: "Admin", color: "hover:border-red-300 hover:bg-red-50" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="text-base font-display font-semibold">Add New User</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === 1 ? "Step 1: Select role" : step === 3 ? "Step 2: Import method" : "Step 2: Enter details"}
            </p>
          </div>
          <button className="text-slate-400 hover:text-slate-600 p-1" onClick={onClose}>✕</button>
        </div>

        {/* Step 1: Role */}
        {step === 1 && (
          <div className="modal-body space-y-3">
            {roleCards.map((r) => (
              <button
                key={r.id}
                onClick={() => handleRoleSelect(r.id)}
                className={`w-full flex items-center gap-4 p-4 bg-white border-2 border-slate-100 rounded-xl transition-all duration-200 hover:shadow-sm text-left ${r.color}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
                  <r.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{r.title}</p>
                  <p className="text-xs text-slate-400">Add a {r.title.toLowerCase()} account</p>
                </div>
                <span className="ml-auto text-slate-300">→</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Bulk or Single */}
        {step === 3 && (
          <div className="modal-body">
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-4 p-4 bg-white border-2 border-slate-100 hover:border-primary-300 hover:bg-primary-50 rounded-xl transition-all text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Single Student</p>
                  <p className="text-xs text-slate-400">Add one student manually</p>
                </div>
              </button>
              <button
                onClick={() => { if (onBulkImport) onBulkImport(); }}
                className="flex items-center gap-4 p-4 bg-white border-2 border-slate-100 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl transition-all text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Bulk Import</p>
                  <p className="text-xs text-slate-400">Upload CSV with multiple students</p>
                </div>
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button className="btn-secondary btn-sm" onClick={handleBack}>← Back</button>
            </div>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 2 && (
          <form onSubmit={handleSave} className="flex flex-col">
            <div className="modal-body space-y-3 overflow-y-auto max-h-[75vh] sm:max-h-[80vh] md:max-h-[calc(85vh-200px)]">
              {error && <Alert type="error">{error}</Alert>}
              {selectedRole === "student" ? (
                <>
                  <div className="input-group">
                    <label className="input-label">Full Name</label>
                    <input className="input" type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter full name" required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">USN (University Seat Number)</label>
                    <input className="input" type="text" name="usn" value={formData.usn} onChange={handleInputChange} placeholder="Enter USN" required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">School Year</label>
                    <select className="input" name="schoolYear" value={formData.schoolYear} onChange={handleInputChange} required>
                      <option value="">— Select School Year —</option>
                      {schoolYears.map((year) => (
                        <option key={year} value={year}>{formatSchoolYearLabel(year)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Semester</label>
                    <select className="input" name="semester" value={formData.semester} onChange={handleInputChange} required>
                      <option value="1st">1st</option>
                      <option value="2nd">2nd</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Program</label>
                    <select className="input" name="program" value={formData.program} onChange={handleInputChange} required disabled={!formData.schoolYear || !formData.semester}>
                      <option value="">— Select Program —</option>
                      {programs.map((program) => (
                        <option key={program._id} value={program.name}>{program.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Section</label>
                    <select className="input" name="section" value={formData.section} onChange={handleInputChange} required disabled={!formData.program}>
                      <option value="">— Select Section —</option>
                      {sections.map((section) => (
                        <option key={section._id} value={section.name}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.program && formData.section && (
                    <div className="p-4 bg-gradient-to-r border-2 border-blue-200 rounded-xl" style={{ backgroundImage: 'linear-gradient(90deg, #d9eafc 0%, #b6d9f9 100%)' }}>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">📍 Student Assignment</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 border border-primary-100">
                          <p className="text-xs text-slate-500 mb-1">Program</p>
                          <p className="font-semibold text-slate-800 text-sm">{formData.program}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-emerald-100">
                          <p className="text-xs text-slate-500 mb-1">Section</p>
                          <p className="font-semibold text-slate-800 text-sm">{formData.section}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="input-group">
                    <label className="input-label">Username</label>
                    <input className="input" type="text" name="username" value={formData.username} onChange={handleInputChange} placeholder="Enter username" required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Password</label>
                    <input className="input" type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Enter password" required />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={handleBack} disabled={loading}>← Back</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : "Save User"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

