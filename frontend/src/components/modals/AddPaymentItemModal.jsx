import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import { Alert } from "../ui";

const AddPaymentItemModal = ({ isOpen, onClose, onAdd, existingItems = [] }) => {
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    status: "active",
    releaseEnabled: false,
    schoolYear: "",
    semester: "1st"
  });
  const [schoolYears, setSchoolYears] = useState([]);
  const [error, setError] = useState("");

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
    if (isOpen) {
      fetchSchoolYears();
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate fields
    if (!formData.name || !formData.amount || !formData.schoolYear || !formData.semester) {
      setError("Item name, amount, school year, and semester are required");
      return;
    }

    const typeKey = formData.name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!typeKey) {
      setError("Please enter a valid item name");
      return;
    }

    // Check for duplicate type or name
    if (existingItems.some(item => item.type === typeKey || item.name.toLowerCase() === formData.name.trim().toLowerCase())) {
      setError("A payment item with this name already exists");
      return;
    }

    // Validate amount
    const amountNum = formData.amount.replace(/[^\d.]/g, "");
    if (!amountNum) {
      setError("Please enter a valid amount");
      return;
    }

    const formattedAmount = `₱${Number(amountNum).toLocaleString()}`;

    const itemToAdd = {
      type: typeKey,
      name: formData.name.trim(),
      amount: formattedAmount,
      status: formData.status,
      schoolYear: formData.schoolYear,
      semester: formData.semester,
      releaseEnabled: formData.releaseEnabled
    };

    if (formData.releaseEnabled) {
      itemToAdd.released = false;
    }

    onAdd(itemToAdd);

    // Reset form
    setFormData({
      name: "",
      amount: "",
      status: "active",
      releaseEnabled: false,
      schoolYear: "",
      semester: "1st"
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-display font-semibold text-white">Add Payment Item</h3>
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
              placeholder="e.g., Books, Uniform, Lab Fee"
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
              placeholder="e.g., 2000"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Preview: {formData.amount ? `₱${Number(formData.amount.replace(/[^\d.]/g, "") || 0).toLocaleString()}` : "₱0"}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                School Year
              </label>
              <select
                name="schoolYear"
                value={formData.schoolYear}
                onChange={handleInputChange}
                className="input w-full"
              >
                <option value="">Select School Year</option>
                {schoolYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
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
              >
                <option value="1st">1st Semester</option>
                <option value="2nd">2nd Semester</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="releaseEnabled"
              type="checkbox"
              name="releaseEnabled"
              checked={formData.releaseEnabled}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="releaseEnabled" className="text-sm text-slate-200">
              Enable release status for this item
            </label>
          </div>
          <p className="text-xs text-slate-400">
            Check this if you want the item to support a Released / Not yet released state in student payment details.
          </p>

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
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPaymentItemModal;
