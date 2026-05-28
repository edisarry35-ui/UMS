import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import axios from "../api/axios";
import Semester from "./Semester";

export default function SchoolYear({ embedded = false }) {
  const { schoolYear, updateSchoolYear } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isEmbed = embedded || searchParams.get("embed") === "1" || searchParams.get("embed") === "true";
  const [schoolYears, setSchoolYears] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newYear, setNewYear] = useState("");

  const [activeMenuYear, setActiveMenuYear] = useState(null);
  const [editingYear, setEditingYear] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [confirmDeleteYear, setConfirmDeleteYear] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [showSemester, setShowSemester] = useState(false);

  useEffect(() => {
    const fetchSchoolYears = async () => {
      try {
        const res = await axios.get("/school-years");
        if (res.status !== 200) {
          throw new Error(`School years API status ${res.status}`);
        }
        if (Array.isArray(res.data) && res.data.length > 0) {
          setSchoolYears(res.data);
        } else {
          setSchoolYears([]);
        }
        setLoadError(null);
      } catch (err) {
        console.error("Failed to load school years", err);
        setLoadError(err.message || "Unknown server error");
        setSchoolYears([]);
      }
    };
    fetchSchoolYears();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      if (activeMenuYear !== null) {
        setActiveMenuYear(null);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [activeMenuYear]);

  const formatSchoolYearLabel = (year) => {
    const value = String(year || "").trim();
    return /^SY\s/i.test(value) ? value : `SY ${value}`;
  };

  const handleSchoolYearSelect = (year) => {
    updateSchoolYear(year);
    if (isEmbed) {
      setShowSemester(true);
    } else {
      navigate("/semester");
    }
  };

  const handleAddSchoolYear = async (e) => {
    e.preventDefault();
    if (newYear.trim() && !schoolYears.includes(newYear)) {
      try {
        await axios.post("/school-years", { year: newYear });
        setSchoolYears([...schoolYears, newYear].sort());
        setNewYear("");
        setShowAddForm(false);
      } catch (err) {
        alert(err.response?.data?.message || "Failed to add school year");
      }
    }
  };

  const handleActionMenu = (e, year) => {
    e.stopPropagation();
    setActiveMenuYear((prev) => (prev === year ? null : year));
  };

  const handleBeginEdit = (year) => {
    setEditingYear(year);
    setEditingValue(year);
    setActiveMenuYear(null);
    setActionError(null);
  };

  const handleBeginDelete = (year) => {
    setConfirmDeleteYear(year);
    setActiveMenuYear(null);
    setActionError(null);
  };

  const handleCancelEdit = () => {
    setEditingYear(null);
    setEditingValue("");
    setActionError(null);
  };

  const doEditSchoolYear = async () => {
    if (!editingValue.trim()) return;
    if (editingValue.trim() === editingYear) {
      setEditingYear(null);
      setEditingValue("");
      return;
    }

    setSaving(true);
    try {
      await axios.put(`/school-years/${encodeURIComponent(editingYear)}`, { year: editingValue.trim() });
      setSchoolYears((prev) => prev.map((y) => (y === editingYear ? editingValue.trim() : y)).sort());
      if (schoolYear === editingYear) {
        updateSchoolYear(editingValue.trim());
      }
      setEditingYear(null);
      setEditingValue("");
      setActionError(null);
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to update school year");
    } finally {
      setSaving(false);
    }
  };

  const doDeleteSchoolYear = async () => {
    if (!confirmDeleteYear) return;
    setSaving(true);
    try {
      await axios.delete(`/school-years/${encodeURIComponent(confirmDeleteYear)}`);
      setSchoolYears((prev) => prev.filter((y) => y !== confirmDeleteYear));
      if (schoolYear === confirmDeleteYear) {
        updateSchoolYear("");
      }
      setConfirmDeleteYear(null);
      setActionError(null);
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to delete school year");
    } finally {
      setSaving(false);
    }
  };

  const pageContent = showSemester ? (
    <Semester embedded={true} onBack={() => setShowSemester(false)} />
  ) : (
    <div className="page-content">
      <div className="flex items-center gap-3 mb-6">
        {!isEmbed && (
          <button onClick={() => navigate("/admin/payments")} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors text-sm">←</button>
        )}
        <div>
          <h1 className="page-title mb-0">Select School Year</h1>
          <p className="page-subtitle">Choose a school year to manage payment records</p>
        </div>
      </div>

        <div className="card mb-4">
          <label className="input-label text-base mb-3 block">School Year</label>
          <div className="space-y-2 mb-4">
            {schoolYears.map((year) => (
              <div key={year} className="relative">
                <div
                  onClick={() => handleSchoolYearSelect(year)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                    schoolYear === year
                      ? "border-primary-400 bg-primary-50 text-primary-800"
                      : "border-slate-100 bg-white hover:border-primary-200 hover:bg-primary-50/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatSchoolYearLabel(year)}</span>
                    {schoolYear === year && <span className="badge badge-blue">Selected</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">→</span>
                    <button
                      type="button"
                      onClick={(e) => handleActionMenu(e, year)}
                      className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-slate-100"
                    >
                      ⋮
                    </button>
                  </div>
                </div>

                {activeMenuYear === year && (
                  <div className="absolute right-0 top-11 z-10 w-32 sm:w-36 rounded-lg border border-slate-200 bg-white shadow-md">
                    <button
                      type="button"
                      onClick={() => handleBeginEdit(year)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBeginDelete(year)}
                      className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-100"
                    >
                      Delete
                    </button>
                  </div>
                )}

                {editingYear === year && (
                  <div className="mt-2 flex gap-2">
                    <input
                      className="input flex-1"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={doEditSchoolYear}
                      disabled={saving}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!showAddForm ? (
            <button className="btn-secondary w-full" onClick={() => setShowAddForm(true)}>
              + Add School Year
            </button>
          ) : (
            <form onSubmit={handleAddSchoolYear} className="flex gap-2">
              <input
                className="input flex-1"
                type="text"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                placeholder="e.g., SY 2026-2027"
                required
                autoFocus
              />
              <button type="submit" className="btn-primary flex-shrink-0">Add</button>
              <button type="button" className="btn-secondary flex-shrink-0" onClick={() => { setShowAddForm(false); setNewYear(""); }}>Cancel</button>
            </form>
          )}

          {confirmDeleteYear && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-xl mb-4">
              <p className="text-sm text-red-700">Confirm deletion for <strong>{confirmDeleteYear}</strong>?</p>
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn-danger" onClick={doDeleteSchoolYear} disabled={saving}>Delete</button>
                <button type="button" className="btn-secondary" onClick={() => setConfirmDeleteYear(null)} disabled={saving}>Cancel</button>
              </div>
            </div>
          )}

          {actionError && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 mb-4">
              {actionError}
            </div>
          )}
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4">
            Error loading school years: {loadError}
          </div>
        )}

        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-sm text-primary-700">
          <p>Current selection: <strong>{schoolYear}</strong></p>
          <p className="mt-1 text-primary-500">Select a school year to proceed to semester and Program management.</p>
        </div>
      </div>
    );

  if (isEmbed) return pageContent;

  return (
    <MainLayout user={{ name: "User" }} onMenuItemClick={(item) => { if (item === "home") navigate("/home"); }}>
      {pageContent}
    </MainLayout>
  );
}

