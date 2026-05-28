import React, { useState, useRef } from "react";
import axios from "../../api/axios";
import { Alert } from "../ui";
import { useNotification } from "../../context/NotificationContext";

export default function AddAnnouncementModal({ onClose, onSuccess }) {
  const { notify } = useNotification();
  const [formData, setFormData] = useState({ title: "", content: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleSubmit = async (status = "pending") => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError("Title and content are required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const author = localStorage.getItem("username") || "Unknown";
      const role = localStorage.getItem("role") || "staff";

      // Use FormData to support optional image upload
      const payload = new FormData();
      payload.append("title", formData.title);
      payload.append("content", formData.content);
      payload.append("status", status);
      payload.append("author", author);
      payload.append("role", role);
      if (imageFile) payload.append("image", imageFile);

      // Let the browser set the Content-Type (including the boundary) for FormData
      await axios.post("/announcements", payload);
      notify("success", "Announcement submitted and pending admin approval.");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setImageFile(null);
      setPreviewUrl(null);
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(f.type)) {
      setError("Only JPG, PNG or WEBP images are allowed");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="text-base font-display font-semibold">New Announcement</h3>
          </div>
          <button className="text-slate-400 hover:text-slate-600 p-1" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {error && <Alert type="error" onClose={() => setError(null)} className="mb-4">{error}</Alert>}

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="input-group">
              <label className="input-label">Title</label>
              <input
                className="input"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title"
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Content</label>
              <textarea
                className="input resize-none"
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write the announcement content..."
                required
              />
            </div>
            <div className="input-group">
              <div className="flex items-center gap-3">
                <input type="file" id="announcement-image" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                <button
                  type="button"
                  aria-label="Add photo"
                  onClick={() => {
                    const input = document.getElementById("announcement-image");
                    if (input) input.click();
                  }}
                  className="inline-flex items-center justify-center rounded-full border p-2 bg-white hover:bg-slate-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-slate-700">
                    <path d="M21 5h-3.586l-1.707-1.707A.996.996 0 0 0 15.586 3H8.414a.996.996 0 0 0-.707.293L6 5H3c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h18c1.103 0 2-.897 2-2V7c0-1.103-.897-2-2-2zM12 17c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                </button>

                {imageFile && (
                  <button type="button" className="text-sm text-red-600" onClick={() => { setImageFile(null); setPreviewUrl(null); }}>
                    Remove
                  </button>
                )}
              </div>

              {previewUrl && (
                <img src={previewUrl} alt="preview" className="mt-2 max-h-48 w-full object-cover rounded" />
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="button" onClick={() => handleSubmit("draft")} className="btn-secondary" disabled={submitting}>
                {submitting ? "Saving..." : "Save Draft"}
              </button>
              <button type="button" onClick={() => handleSubmit("pending")} className="btn-primary" disabled={submitting}>
                {submitting ? "Posting..." : "Post Announcement"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}