import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import axios from "../api/axios";
import { Alert, PageLoader } from "../components/ui";

export default function DeadlinePage() {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const isAdmin = auth?.role === "admin";
  const isStaff = auth?.role === "staff";

  const [deadline, setDeadline] = useState(null);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("2025-2026");
  const [selectedSemester, setSelectedSemester] = useState("1st");
  const [formData, setFormData] = useState({
    deadlineDate: "",
    notificationDays: 7,
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isAdmin && !isStaff) {
      navigate("/home");
    }
  }, [isAdmin, isStaff, navigate]);

  useEffect(() => {
    if (!selectedSchoolYear || !selectedSemester) return;
    fetchDeadline();
  }, [selectedSchoolYear, selectedSemester]);

  const fetchDeadline = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`/api/deadlines/${selectedSchoolYear}/${selectedSemester}`);
      setDeadline(response.data);
      setFormData({
        deadlineDate: response.data.deadlineDate?.split("T")[0] || "",
        notificationDays: response.data.notificationDays || 7,
        description: response.data.description || "",
      });
    } catch (fetchError) {
      setDeadline(null);
      setFormData((prev) => ({
        ...prev,
        deadlineDate: "",
        notificationDays: 7,
        description: "",
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "notificationDays" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      schoolYear: selectedSchoolYear,
      semester: selectedSemester,
      deadlineDate: formData.deadlineDate,
      notificationDays: formData.notificationDays,
      description: formData.description,
    };

    try {
      if (deadline && deadline._id) {
        const response = await axios.put(`/api/deadlines/${deadline._id}`, payload);
        setDeadline(response.data.deadline);
        setSuccess("Payment deadline updated successfully.");
      } else {
        const response = await axios.post("/api/deadlines", payload);
        setDeadline(response.data.deadline);
        setSuccess("Payment deadline created successfully.");
      }
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Failed to save payment deadline.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin && !isStaff) {
    return null;
  }

  return (
    <MainLayout
      user={{ name: isStaff ? "Staff" : "Admin" }}
      onMenuItemClick={(item) => {
        if (item === "home") navigate("/home");
      }}
    >
      <div className="page-content">
        <div className="mb-8 rounded-3xl border border-white/20 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 p-2 shadow-2xl backdrop-blur-xl md:p-3 text-white" style={{ backgroundImage: 'linear-gradient(90deg, #3E8EDE 0%, #1f9ecf 50%, #12ABFF 100%)' }}>
          <div>
            <button
              type="button"
              onClick={() => navigate("/admin/payments")}
              aria-label="Back"
              className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-white/20 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20 mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/15 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-white/90">
              Deadline Management
            </span>
            <h1 className="mt-3 text-2xl font-display font-bold tracking-tight text-white">Payment Deadline Settings</h1>
            <p className="mt-2 max-w-2xl text-sm text-primary-100">
              Configure the payment deadline for a school year and semester, and send reminders to students ahead of time.
            </p>
          </div>
        </div>

        {error && <Alert type="error" className="mb-6">{error}</Alert>}
        {success && <Alert type="success" className="mb-6">{success}</Alert>}

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-100 mb-2">School Year</label>
                <select
                  value={selectedSchoolYear}
                  onChange={(e) => setSelectedSchoolYear(e.target.value)}
                  className="input w-full"
                >
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-100 mb-2">Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="input w-full"
                >
                  <option value="1st">1st Semester</option>
                  <option value="2nd">2nd Semester</option>
                </select>
              </div>

            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-display font-semibold text-white">Deadline configuration</h2>
                  <p className="text-sm text-slate-100">Update the deadline and notification window for the selected period.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100">
                  Reminder notifications will be delivered to students {formData.notificationDays} days before the deadline.
                </div>
              </div>

              {loading ? (
                <PageLoader text="Loading deadline details..." />
              ) : (
                <div className="grid gap-6">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Current deadline</p>
                        <p className="text-lg font-semibold text-white">
                          {deadline ? new Date(deadline.deadlineDate).toLocaleDateString() : "No deadline set"}
                        </p>
                      </div>
                      {deadline && (
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                          Active
                        </span>
                      )}
                    </div>

                    {deadline ? (
                      <div className="space-y-3 text-slate-200">
                        <p>
                          Notification window: <span className="font-semibold text-white">{deadline.notificationDays} days</span>
                        </p>
                        {deadline.description && (
                          <p className="text-sm text-slate-100">{deadline.description}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-100">Set a deadline to enable student reminders.</p>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-100 mb-2">Deadline date</label>
                        <input
                          type="date"
                          name="deadlineDate"
                          value={formData.deadlineDate}
                          onChange={handleInputChange}
                          className="input w-full"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-100 mb-2">Notification days</label>
                        <input
                          type="number"
                          min="1"
                          name="notificationDays"
                          value={formData.notificationDays}
                          onChange={handleInputChange}
                          className="input w-full"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-100 mb-2">Description (optional)</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows="4"
                        className="input w-full min-h-[110px] resize-none"
                        placeholder="Add a short note for students"
                      />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                      <button
                        type="submit"
                        className="btn-primary w-full sm:w-auto"
                        disabled={saving}
                      >
                        {saving ? "Saving..." : deadline ? "Update Deadline" : "Set Deadline"}
                      </button>
                      <p className="text-sm text-slate-100">
                        Students will receive a deadline reminder once the notification window opens.
                      </p>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
