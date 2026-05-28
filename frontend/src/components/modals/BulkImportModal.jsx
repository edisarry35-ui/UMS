import React, { useState, useRef, useEffect } from "react";
import axios from "../../api/axios";
import { Alert } from "../ui";

export default function BulkImportModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [schoolYear, setSchoolYear] = useState("");
  const [schoolYears, setSchoolYears] = useState([]);
  const [semester, setSemester] = useState("1st");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSchoolYears();
  }, []);

  const fetchSchoolYears = async () => {
    try {
      const response = await axios.get("/school-years");
      setSchoolYears(response.data || []);
    } catch (err) {
      console.error("Failed to fetch school years:", err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith(".csv")) {
        setError("Please select a CSV or Excel file (.csv, .xlsx, .xls)");
        setFile(null);
        return;
      }
      setError("");
      setFile(selectedFile);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "name,usn,section,program\nJohn Doe,USN123,WADT 3A,WADT\nJane Smith,USN124,HRT 3A,HRT";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_import_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const fileToUpload = e?.currentFile || file;
    if (!fileToUpload) { setError("Please select a file"); return; }
    if (!schoolYear) { setError("Please select a school year"); return; }
    if (!semester) { setError("Please select a semester"); return; }
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("schoolYear", schoolYear);
    formData.append("semester", semester);
    try {
      const response = await axios.post("/bulk-import-students", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to import students");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-base font-display font-semibold">📊 Bulk Import Students</h3>
          <button className="text-slate-400 hover:text-slate-600 p-1" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {!results ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="input-group">
                  <label className="input-label">School Year</label>
                  <select 
                    className="input" 
                    value={schoolYear} 
                    onChange={(e) => setSchoolYear(e.target.value)} 
                    required
                  >
                    <option value="">— Select School Year —</option>
                    {schoolYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Semester</label>
                  <select className="input" value={semester} onChange={(e) => setSemester(e.target.value)} required>
                    <option value="1st">1st</option>
                    <option value="2nd">2nd</option>
                  </select>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
                <h4 className="font-semibold text-slate-700 mb-2 text-sm">📋 Instructions</h4>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                  <li>Create a CSV file with columns: <code className="bg-slate-200 px-1 rounded text-xs">name, usn, section, program</code></li>
                  <li>Each row represents one student</li>
                  <li>USN must be unique for each student</li>
                  <li>The selected bin and semester will apply to all imported students</li>
                </ul>
                <button onClick={downloadTemplate} className="btn-secondary btn-sm mt-3">⬇️ Download Template</button>
              </div>

              {error && <Alert type="error" className="mb-4">{error}</Alert>}

              <div
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-4xl mb-3">📂</div>
                <p className="font-medium text-slate-700 mb-1">{file ? file.name : "Click to select file"}</p>
                <p className="text-xs text-slate-400">Supports CSV, XLSX, XLS</p>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
              </div>
            </>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-50 rounded-xl p-6 border-2 border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  {results.success?.length > 0 ? "✅ Import Successful!" : "⚠️ Import Complete"}
                </h4>
                
                {results.success?.length > 0 && (
                  <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-emerald-900 font-medium text-sm">
                      Successfully imported <strong>{results.success.length}</strong> student(s)
                    </p>
                  </div>
                )}

                {results.errors?.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-900 font-medium text-sm mb-3">
                      <strong>{results.errors.length}</strong> record(s) had errors:
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {results.errors.map((err, i) => (
                        <div key={i} className="text-xs text-red-800 bg-white p-2 rounded border border-red-100">
                          <strong>Row {err.row}:</strong> {err.reason || JSON.stringify(err)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!results.success?.length && !results.errors?.length && (
                  <p className="text-sm text-slate-600">No records were processed.</p>
                )}
              </div>
            </div>
          )}
        </div>
        {!results && (
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleImport} disabled={loading || !file}>
              {loading ? "Importing..." : "📥 Import Students"}
            </button>
          </div>
        )}
        {results && (
          <div className="modal-footer">
            <button className="btn-primary" onClick={() => { onSuccess(); onClose(); }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

