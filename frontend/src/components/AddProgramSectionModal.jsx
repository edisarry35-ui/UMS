import React, { useState } from "react";
import axios from "../api/axios";
import { useNotification } from "../context/NotificationContext";

export default function AddProgramSectionModal({ isOpen, onClose, programId, onSectionAdded }) {
  const [sectionName, setSectionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { notify } = useNotification();

  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!sectionName.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await axios.post(`/programs/${programId}/sections`, {
        sectionName: sectionName.trim()
      });
      onSectionAdded(response.data);
      notify("success", "Section added successfully.");
      setSectionName("");
      onClose();
    } catch (err) {
      const message = err.response?.data?.message || "Failed to add section";
      setError(message);
      notify("error", message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Add Section to Program</h2>

        <form onSubmit={handleAddSection} className="space-y-4">
          <div>
            <label className="input-label">Section Name</label>
            <input
              type="text"
              className="input"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="e.g., IT-A, IT-B"
              disabled={loading}
              required
              autoFocus
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
              {loading ? "Adding..." : "Add Section"}
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

