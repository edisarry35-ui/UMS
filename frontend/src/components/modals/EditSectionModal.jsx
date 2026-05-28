import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import { useNotification } from "../../context/NotificationContext";

export default function EditSectionModal({ isOpen, onClose, programId, sectionName, onSectionUpdated }) {
  const [newSectionName, setNewSectionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sectionName) {
      setNewSectionName(sectionName);
    }
  }, [sectionName]);

  const { notify } = useNotification();

  const handleEditSection = async (e) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;

    setLoading(true);
    setError("");
    try {
      const response = await axios.put(`/programs/${programId}/sections/${encodeURIComponent(sectionName)}`, {
        newSectionName: newSectionName.trim()
      });
      onSectionUpdated(response.data, newSectionName.trim());
      notify("success", "Section updated successfully.");
      onClose();
    } catch (err) {
      const message = err.response?.data?.message || "Failed to update section";
      setError(message);
      notify("error", message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !sectionName) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Edit Section</h2>

        <form onSubmit={handleEditSection} className="space-y-4">
          <div>
            <label className="input-label">Section Name</label>
            <input
              type="text"
              className="input"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g., 3A, 2B, etc."
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Section"}
            </button>
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}