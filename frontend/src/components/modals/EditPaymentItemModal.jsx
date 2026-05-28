import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import { Alert } from "../ui";

const EditPaymentItemModal = ({ isOpen, onClose, item, onSave }) => {
  const [formData, setFormData] = useState({
    name: item.name,
    amount: item.amount,
    status: item.status
  });
  const [deadlineSchoolYear, setDeadlineSchoolYear] = useState("");
  const [deadlineSemester, setDeadlineSemester] = useState("1st");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [schoolYears, setSchoolYears] = useState([]);
  const [error, setError] = useState("");
  const [savingDeadline, setSavingDeadline] = useState(false);

  const fetchSchoolYears = async () => {
    try {
      const response = await axios.get("/school-years");
      setSchoolYears(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load school years:", err);
      setSchoolYears([]);
    }
  };

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        amount: item.amount,
        status: item.status
      });
      setDeadlineSchoolYear("");
      setDeadlineSemester("1st");
      setDeadlineDate("");
      setError("");
      fetchSchoolYears();
    }
  }, [item]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setDeadlineSaved("");

    // Validate amount
    if (!formData.amount || !formData.amount.replace(/[^\d.]/g, "")) {
      setError("Please enter a valid amount");
      return;
    }

    const normalizedAmount = formData.amount.replace(/[^\d.]/g, "");
    const formattedAmount = `₱${Number(normalizedAmount).toLocaleString()}`;

    if (deadlineDate) {
      if (!deadlineSchoolYear || !deadlineSemester) {
        setError("Please select school year and semester for the deadline.");
        return;
      }

      setSavingDeadline(true);
      try {
        await axios.post("/api/deadlines", {
          schoolYear: deadlineSchoolYear,
          semester: deadlineSemester,
          deadlineDate,
          notificationDays: 7
        });
        setDeadlineSaved("Deadline saved successfully.");
      } catch (err) {
        console.error("Failed to save deadline:", err);
        setError(err.response?.data?.message || "Failed to save deadline. Please try again.");
        setSavingDeadline(false);
        return;
      } finally {
        setSavingDeadline(false);
      }
    }

    onSave({
      ...item,
      name: formData.name,
      amount: formattedAmount,
      status: formData.status
    });
  };

  if (!isOpen || !item) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-display font-semibold text-white">Edit Payment Item</h3>
          <button
            className="text-slate-400 hover:text-slate-600 p-1"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body space-y-4">
          {error && <Alert type="error">{error}</Alert>}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Item Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="input w-full"
              placeholder="e.g., Module, T-Shirt"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Amount (₱)
            </label>
            <input
              type="text"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              className="input w-full"
              placeholder="e.g., 1500"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Preview: {formData.amount}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="input w-full"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <p className="text-sm font-semibold text-slate-200 mb-3">Set Payment Deadline</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">School Year</label>
                <select
                  value={deadlineSchoolYear}
                  onChange={(e) => setDeadlineSchoolYear(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select school year</option>
                  {schoolYears.length > 0 ? (
                    schoolYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))
                  ) : (
                    <option value="" disabled>No school years available</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Semester</label>
                <select
                  value={deadlineSemester}
                  onChange={(e) => setDeadlineSemester(e.target.value)}
                  className="input w-full"
                >
                  <option value="1st">1st</option>
                  <option value="2nd">2nd</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Deadline Date</label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Enter a deadline date and the corresponding school year / semester to save this payment deadline.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={savingDeadline}
            >
              {savingDeadline ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPaymentItemModal;
