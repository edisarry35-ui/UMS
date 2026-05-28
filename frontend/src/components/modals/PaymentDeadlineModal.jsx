import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import { Alert } from "../../components/ui";

const PaymentDeadlineModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    schoolYear: "",
    semester: "",
    deadlineDate: "",
    notificationDays: 7,
    description: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [existingDeadlines, setExistingDeadlines] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchExistingDeadlines();
    }
  }, [isOpen]);

  const fetchExistingDeadlines = async () => {
    try {
      const response = await axios.get("/api/deadlines");
      setExistingDeadlines(response.data);
    } catch (error) {
      console.error("Error fetching deadlines:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post("/api/deadlines", formData);
      setSuccess("Payment deadline set successfully!");
      setFormData({
        schoolYear: "",
        semester: "",
        deadlineDate: "",
        notificationDays: 7,
        description: ""
      });
      fetchExistingDeadlines();
      onSuccess && onSuccess();

      // Auto-close after success
      setTimeout(() => {
        onClose();
        setSuccess("");
      }, 2000);
    } catch (error) {
      console.error("Error setting deadline:", error);
      setError(error.response?.data?.message || "Failed to set payment deadline");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getExistingDeadline = (schoolYear, semester) => {
    return existingDeadlines.find(d => d.schoolYear === schoolYear && d.semester === semester);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-display font-semibold text-white">Set Payment Deadline</h3>
          <button
            className="text-slate-400 hover:text-slate-600 p-1"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body space-y-4">
          {error && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              School Year
            </label>
            <select
              name="schoolYear"
              value={formData.schoolYear}
              onChange={handleInputChange}
              className="input w-full"
              required
            >
              <option value="">Select School Year</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Semester
            </label>
            <select
              name="semester"
              value={formData.semester}
              onChange={handleInputChange}
              className="input w-full"
              required
            >
              <option value="">Select Semester</option>
              <option value="1st">1st Semester</option>
              <option value="2nd">2nd Semester</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Deadline Date
            </label>
            <input
              type="date"
              name="deadlineDate"
              value={formData.deadlineDate}
              onChange={handleInputChange}
              className="input w-full"
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Notification Days Before Deadline
            </label>
            <input
              type="number"
              name="notificationDays"
              value={formData.notificationDays}
              onChange={handleInputChange}
              className="input w-full"
              min="1"
              max="30"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Students will be notified this many days before the deadline
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="input w-full"
              rows="3"
              placeholder="Additional notes about this deadline..."
            />
          </div>

          {formData.schoolYear && formData.semester && (
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-300">
                {getExistingDeadline(formData.schoolYear, formData.semester) ? (
                  <span className="text-amber-400">
                    ⚠️ Existing deadline will be replaced
                  </span>
                ) : (
                  <span className="text-green-400">
                    ✓ New deadline will be created
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? "Setting..." : "Set Deadline"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentDeadlineModal;