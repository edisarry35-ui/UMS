import React, { useState, useEffect } from "react";
import axios from "../../api/axios";
import { useNotification } from "../../context/NotificationContext";

export default function EditProgramModal({ isOpen, onClose, program, onProgramUpdated }) {
  const [programName, setProgramName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (program) {
      setProgramName(program.name || "");
      setDescription(program.description || "");
    }
  }, [program]);

  const { notify } = useNotification();

  const handleEditProgram = async (e) => {
    e.preventDefault();
    if (!programName.trim()) return;

    setLoading(true);
    setError("");
    try {
      const response = await axios.put(`/programs/${program._id}`, {
        name: programName,
        description
      });
      onProgramUpdated(response.data);
      notify("success", "Program updated successfully.");
      onClose();
    } catch (err) {
      const message = err.response?.data?.message || "Failed to update program";
      setError(message);
      notify("error", message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !program) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Edit Program</h2>

        <form onSubmit={handleEditProgram} className="space-y-4">
          <div>
            <label className="input-label">Program Name</label>
            <input
              type="text"
              className="input"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="e.g., Bachelor of Science in IT"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="input-label">Description (Optional)</label>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the program"
              rows="3"
              disabled={loading}
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
              {loading ? "Updating..." : "Update Program"}
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