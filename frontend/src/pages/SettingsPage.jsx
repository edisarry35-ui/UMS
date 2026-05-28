import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import api from "../api/axios";
import { Upload, X, Check, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const { user } = useContext(AuthContext);
  const [settings, setSettings] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [siteName, setSiteName] = useState("");
  const [siteDescription, setSiteDescription] = useState("");

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/api/settings");
        setSettings(res.data);
        setSiteName(res.data.siteName || "");
        setSiteDescription(res.data.siteDescription || "");
        if (res.data.backgroundImage || res.data.backgroundImageBase64) {
          setPreviewImage(res.data.backgroundImage || res.data.backgroundImageBase64);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        setMessage({ type: "error", text: "Failed to load settings" });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: "Image must be less than 5MB" });
        return;
      }
      setBackgroundImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadBackground = async () => {
    if (!backgroundImage) {
      setMessage({ type: "error", text: "Please select an image" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", backgroundImage);

      const res = await api.post("/api/settings/upload/background", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setSettings(res.data);
      setBackgroundImage(null);
      setMessage({ type: "success", text: "Background image uploaded successfully!" });
      
      // Refresh settings
      const refreshRes = await api.get("/api/settings");
      setSettings(refreshRes.data);
      if (refreshRes.data.backgroundImage || refreshRes.data.backgroundImageBase64) {
        setPreviewImage(refreshRes.data.backgroundImage || refreshRes.data.backgroundImageBase64);
      }
    } catch (error) {
      console.error("Error uploading background:", error);
      setMessage({ type: "error", text: "Failed to upload background image" });
    } finally {
      setUploading(false);
    }
  };

  const getRelativePathFromUrl = (url) => {
    try {
      const u = new URL(url);
      return u.pathname + (u.search || "");
    } catch (err) {
      return url;
    }
  };

  const handleApplyPreviewAsBackground = async () => {
    if (!previewImage) {
      setMessage({ type: "error", text: "No preview available to apply" });
      return;
    }

    // If preview is a data URL, upload it first
    if (previewImage.startsWith("data:")) {
      // Convert data URL to a Blob and upload using existing flow
      // Create a temporary file-like Blob and append to FormData
      try {
        // Create a blob from base64
        const res = await fetch(previewImage);
        const blob = await res.blob();
        const file = new File([blob], settings?.backgroundImageFileName || "background.png", { type: blob.type });
        setBackgroundImage(file);
        await handleUploadBackground();
        setMessage({ type: "success", text: "Background uploaded and applied." });
        return;
      } catch (err) {
        console.error("Failed to upload preview data URL:", err);
        setMessage({ type: "error", text: "Failed to upload preview image." });
        return;
      }
    }

    // If preview is a server URL, send its relative path to the settings API
    setUploading(true);
    try {
      const relative = getRelativePathFromUrl(previewImage);
      const res = await api.put("/api/settings", { backgroundImage: relative });
      const newSettings = res.data.settings || res.data;
      setSettings(newSettings);
      setPreviewImage(newSettings.backgroundImage || newSettings.backgroundImageBase64 || previewImage);
      setMessage({ type: "success", text: "Background applied from server image." });
    } catch (error) {
      console.error("Error applying preview as background:", error);
      setMessage({ type: "error", text: "Failed to apply preview as background." });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBackground = async () => {
    try {
      await api.delete("/api/settings/background");
      setPreviewImage(null);
      setSettings(prev => ({
        ...prev,
        backgroundImage: null
      }));
      setMessage({ type: "success", text: "Background image removed" });
    } catch (error) {
      console.error("Error deleting background:", error);
      setMessage({ type: "error", text: "Failed to delete background" });
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const res = await api.put("/api/settings", {
        siteName,
        siteDescription
      });
      setSettings(res.data.settings);
      setMessage({ type: "success", text: "Settings updated successfully!" });
    } catch (error) {
      console.error("Error updating settings:", error);
      setMessage({ type: "error", text: "Failed to update settings" });
    }
  };

  const handleApplyDefaultBackground = async () => {
    setUploading(true);
    try {
      const relative = '/uploads/ACLC ASSET LIGHT MODE.png';
      const res = await api.put('/api/settings', { backgroundImage: relative });
      const newSettings = res.data.settings || res.data;
      setSettings(newSettings);
      setPreviewImage(newSettings.backgroundImage || newSettings.backgroundImageBase64 || relative);
      setMessage({ type: 'success', text: 'Default background applied.' });
    } catch (err) {
      console.error('Failed to apply default background:', err);
      setMessage({ type: 'error', text: 'Failed to apply default background.' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
            <p className="mt-4 text-gray-600">Loading settings...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-700">Access Denied</p>
            <p className="text-gray-500 mt-2">Only admins can access settings</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Site Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your landing page background and site information</p>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === "success" 
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" 
              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
          }`}>
            {message.type === "success" ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Background Image Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Landing Page Background</h2>
            
            {previewImage && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Background:</p>
                <img 
                  src={previewImage} 
                  alt="Current background" 
                  className="w-full h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload New Background
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-600 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-sky-50 dark:file:bg-sky-900/30
                  file:text-sky-700 dark:file:text-sky-300
                  hover:file:bg-sky-100 dark:hover:file:bg-sky-900/50"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max size: 5MB. Supported: JPG, PNG, GIF, WebP</p>
            </div>

            {backgroundImage && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  File selected: {backgroundImage.name}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleUploadBackground}
                disabled={!backgroundImage || uploading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : "Upload Background"}
              </button>
              {previewImage && (
                <button
                  onClick={handleDeleteBackground}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Site Information Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Site Information</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Site Name
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Site Description
              </label>
              <textarea
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            <button
              onClick={handleUpdateSettings}
              className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Background Preview Info */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">About the Background</h3>
          <p className="text-blue-800 dark:text-blue-300 text-sm">
            The background image you upload will appear behind the blue gradient on the landing page. The gradient overlay will remain on top to maintain the blue color scheme. Your changes will be automatically applied to the landing page once saved.
          </p>
          {/* No action buttons here — landing page uses the uploaded image directly */}
        </div>
      </div>
    </MainLayout>
  );
}
