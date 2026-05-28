import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import axios, { API_BASE_URL } from "../../api/axios";
import { useNotification } from "../../context/NotificationContext";
import { decodeToken } from "../../utils/helpers";
import UserModals from "../modals/UserModals";
import {
  Menu, X, Bell, ChevronDown, Home, Megaphone, BellRing, Moon, Sun,
  ShieldCheck, CreditCard, BarChart3, ClipboardCheck, UserPlus, Users,
  History, Archive, Trash2, LogOut, Eye, Camera, Clock
} from "lucide-react";

export default function Navbar({ user, onMenuItemClick, sidebarOpen, setSidebarOpen }) {
  const { logout, auth, theme, toggleTheme } = useContext(AuthContext);
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [unreadCount, setUnreadCount] = useState(0);
  const [announcementUnreadCount, setAnnouncementUnreadCount] = useState(0);
  const [showChangeCred, setShowChangeCred] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileUploadError, setProfileUploadError] = useState("");
  const [profileUploadSuccess, setProfileUploadSuccess] = useState("");
  const [profileCropModalOpen, setProfileCropModalOpen] = useState(false);
  const [selectedProfileFile, setSelectedProfileFile] = useState(null);
  const [selectedProfileFileUrl, setSelectedProfileFileUrl] = useState(null);
  const [cropScale, setCropScale] = useState(1.1);
  const [now, setNow] = useState(new Date());
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef(null);

  const getUserRole = () => {
    if (auth?.role) return auth.role;
    const name = String(user?.name || "").trim().toLowerCase();
    if (name === "student") return "student";
    if (name === "staff") return "staff";
    if (name === "admin") return "admin";
    if (["assessment coordinator", "assessment-coordinator", "aa"].includes(name)) return "assessment-coordinator";
    return null;
  };
  const userRole = getUserRole();
  const isAssessmentCoordinator = userRole === "assessment-coordinator";
  const isDarkMode = theme === "dark";

  const getAcronym = (name = "") => {
    return String(name)
      .split(" ")
      .map((part) => part.trim().charAt(0))
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 3);
  };

  const displayAcronym = getAcronym(displayName || "User");

  const effectiveUser = currentUser || user;
  const profileImage = effectiveUser?.profile ? `${API_BASE_URL || ""}/uploads/${effectiveUser.profile}` : null;

  const triggerProfileUpload = () => {
    fileInputRef.current?.click();
  };

  const openProfileCropModal = (file = null, url = null) => {
    setSelectedProfileFile(file);
    setSelectedProfileFileUrl(url);
    setProfileCropModalOpen(true);
    setCropScale(1.1);
    setCropX(0);
    setCropY(0);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setDragStart({ x: 0, y: 0 });
    setProfileUploadError("");
    setProfileUploadSuccess("");
  };

  const handleEditProfilePhoto = () => {
    if (profileImage) {
      openProfileCropModal(null, profileImage);
    } else {
      triggerProfileUpload();
    }
  };

  const resetProfileCrop = () => {
    setSelectedProfileFile(null);
    setSelectedProfileFileUrl(null);
    setCropScale(1.1);
    setCropX(0);
    setCropY(0);
    setIsDragging(false);
    setDragStart({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
    setProfileUploadError("");
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleProfileFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setProfileUploadError("Only JPG, PNG, or WEBP images are allowed.");
      event.target.value = null;
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileUploadError("Profile photo must be 5MB or smaller.");
      event.target.value = null;
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    openProfileCropModal(file, previewUrl);
    event.target.value = null;
  };

  const handleDragStart = (event) => {
    event.preventDefault();
    const clientX = event.clientX || event.touches?.[0]?.clientX;
    const clientY = event.clientY || event.touches?.[0]?.clientY;
    if (typeof clientX !== "number" || typeof clientY !== "number") return;
    if (event.pointerId && event.target?.setPointerCapture) {
      event.target.setPointerCapture(event.pointerId);
    }
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
    setDragOffset({ x: cropX, y: cropY });
  };

  const handleDragMove = (event) => {
    if (!isDragging) return;
    const clientX = event.clientX || event.touches?.[0]?.clientX;
    const clientY = event.clientY || event.touches?.[0]?.clientY;
    if (typeof clientX !== "number" || typeof clientY !== "number") return;
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    setCropX(dragOffset.x + deltaX);
    setCropY(dragOffset.y + deltaY);
  };

  const handleDragEnd = (event) => {
    if (event?.pointerId && event.target?.releasePointerCapture) {
      event.target.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  useEffect(() => {
    return () => {
      if (selectedProfileFileUrl) {
        URL.revokeObjectURL(selectedProfileFileUrl);
      }
    };
  }, [selectedProfileFileUrl]);

  const getCroppedProfileBlob = async () => {
    if (!selectedProfileFileUrl) return null;
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = selectedProfileFileUrl;
      image.onload = () => {
        const canvasSize = 300;
        const canvas = document.createElement("canvas");
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        const naturalWidth = image.naturalWidth;
        const naturalHeight = image.naturalHeight;
        const scaledWidth = naturalWidth * cropScale;
        const scaledHeight = naturalHeight * cropScale;
        const imageLeft = canvasSize / 2 + cropX - scaledWidth / 2;
        const imageTop = canvasSize / 2 + cropY - scaledHeight / 2;

        const sx = Math.max(0, -imageLeft / cropScale);
        const sy = Math.max(0, -imageTop / cropScale);
        const sWidth = Math.min(naturalWidth - sx, canvasSize / cropScale);
        const sHeight = Math.min(naturalHeight - sy, canvasSize / cropScale);

        ctx.drawImage(
          image,
          sx,
          sy,
          sWidth,
          sHeight,
          imageLeft,
          imageTop,
          sWidth * cropScale,
          sHeight * cropScale
        );

        canvas.toBlob((blob) => {
          if (!blob) reject(new Error("Could not create cropped image."));
          else resolve(blob);
        }, selectedProfileFile.type || "image/png");
      };
      image.onerror = () => reject(new Error("Unable to load selected image."));
    });
  };

  const uploadCroppedProfileImage = async () => {
    if (!selectedProfileFileUrl) return;
    setProfileUploadError("");
    setProfileUploadSuccess("");
    setProfileUploading(true);

    try {
      const croppedBlob = await getCroppedProfileBlob();
      if (!croppedBlob) {
        setProfileUploadError("Unable to prepare the cropped photo.");
        return;
      }

      const token = localStorage.getItem("token");
      const decoded = decodeToken(token);
      const userId = decoded?.id;
      if (!userId) {
        setProfileUploadError("Unable to determine current user.");
        return;
      }

      const extension = selectedProfileFile?.name?.split(".").pop()?.split("?")[0] || selectedProfileFileUrl?.split(".").pop()?.split("?")[0] || "png";
      const mimeType = selectedProfileFile?.type || (extension === "webp" ? "image/webp" : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "image/png");
      const fileName = `profile_crop.${extension}`;
      const formData = new FormData();
      formData.append("profile", new File([croppedBlob], fileName, { type: mimeType }));

      const res = await axios.post(`/user/${userId}/profile`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCurrentUser((prev) => ({ ...(prev || {}), profile: res.data.profile }));
      setProfileUploadSuccess("Profile photo uploaded successfully.");
      setProfileCropModalOpen(false);
      resetProfileCrop();
    } catch (err) {
      console.error("Profile upload failed", err);
      setProfileUploadError(err.response?.data?.message || "Unable to upload profile image.");
    } finally {
      setProfileUploading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadCurrentUser = async () => {
      try {
        const token = auth?.token || localStorage.getItem("token");
        if (!token || token === "undefined" || token === "null") return;

        const decoded = decodeToken(token);
        const userId = decoded?.id;
        if (!userId) return;

        const res = await axios.get(`/user/${userId}`);
        if (!mounted) return;
        setCurrentUser(res.data);
        if (res.data?.name) setDisplayName(res.data.name);
      } catch (err) {
        console.warn("Unable to load current user details", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          logout();
        }
      }
    };
    loadCurrentUser();
    return () => { mounted = false; };
  }, [auth?.token, user, logout]);

  useEffect(() => {
    let mounted = true;
    const resolveName = async () => {
      try {
        if (auth?.role === "student") {
          const stored = localStorage.getItem("studentName");
          if (stored && mounted) { setDisplayName(stored); return; }
          const token = localStorage.getItem("token");
          const decoded = decodeToken(token);
          const studentId = localStorage.getItem("studentId") || decoded?.id;
          if (studentId) {
            const res = await axios.get(`/student/${studentId}`);
            if (mounted) setDisplayName(res.data?.name || "Student");
            return;
          }
        }
        const storedName = localStorage.getItem("username") || localStorage.getItem("name");
        if (storedName && mounted) { setDisplayName(storedName); return; }
        if (user?.name && mounted) { setDisplayName(user.name); return; }
        if (auth?.role && mounted) setDisplayName(auth.role.charAt(0).toUpperCase() + auth.role.slice(1));
      } catch {
        if (mounted) setDisplayName(user?.name || "User");
      }
    };
    resolveName();
    return () => { mounted = false; };
  }, [auth, user]);

  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem("token");
        const decoded = decodeToken(token);
        const userId = decoded?.id;
        let unread = 0;
        let announcementCount = 0;

        const seen = JSON.parse(localStorage.getItem("seenAnnouncements") || "[]");

        try {
          const annRes = await axios.get("/announcements");
          const announcements = annRes.data || [];
          announcementCount = announcements.filter((a) => !seen.includes(a._id)).length;
          unread += announcementCount;
        } catch (err) {
          console.warn("Failed to fetch announcements:", err);
        }

        if (userId) {
          try {
            const notifRes = await axios.get(`/notifications?userId=${userId}&archived=false&deleted=false`);
            const notifications = notifRes.data || [];
            unread += notifications.filter((n) => n.status !== "read").length;
          } catch (err) {
            console.warn("Failed to fetch notifications:", err);
          }
        }

        if (mounted) {
          setAnnouncementUnreadCount(announcementCount);
          setUnreadCount(unread);
        }
      } catch (err) {
        if (mounted) setUnreadCount(0);
      }
    };

    // Fetch immediately on mount
    fetchUnread();

    // Set up faster polling interval (every 15 seconds)
    const pollInterval = setInterval(fetchUnread, 15000);

    // Fetch when page/tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUnread();
      }
    };

    // Fetch when window regains focus
    const handleWindowFocus = () => {
      fetchUnread();
    };

    // Event listeners for manual updates
    const handleRefresh = () => fetchUnread();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("seenAnnouncementsChanged", handleRefresh);
    window.addEventListener("refreshCounts", handleRefresh);
    window.addEventListener("refreshNotifications", handleRefresh);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("seenAnnouncementsChanged", handleRefresh);
      window.removeEventListener("refreshCounts", handleRefresh);
      window.removeEventListener("refreshNotifications", handleRefresh);
    };
  }, [auth?.role]);

  const handleMenuItemClick = (item) => {
    if (item === "home") navigate("/home");
    if (item === "announcements") {
      // Mark all announcements as seen
      try {
        axios.get("/announcements").then((res) => {
          const announcements = res.data || [];
          const seen = JSON.parse(localStorage.getItem("seenAnnouncements") || "[]");
          const allIds = announcements.map(ann => ann._id);
          const newSeen = [...new Set([...seen, ...allIds])];
          localStorage.setItem("seenAnnouncements", JSON.stringify(newSeen));
          setAnnouncementUnreadCount(0);
          try { window.dispatchEvent(new Event("seenAnnouncementsChanged")); } catch {}
        });
      } catch (err) {
        console.warn("Failed to fetch announcements for marking as seen:", err);
      }
      navigate("/announcements");
    }
    if (item === "addUser") navigate("/home?addUser=1");
    if (item === "manageUsers") navigate("/admin/manage-users");
    if (item === "viewNewUsers") navigate("/admin/manage-users");
    if (item === "payments") navigate("/student/payments");
    if (item === "paymentsManagement") navigate("/admin/payments");
    if (item === "history") navigate("/activity-log");
    if (item === "transaction") navigate("/admin/transactions");
    if (item === "analytics") navigate("/analytics");
    if (item === "archive") navigate("/archive");
    if (item === "trash") navigate("/trash");
    if (item === "notifications") {
      const focusId = localStorage.getItem("notificationToOpen");
      if (focusId) { localStorage.removeItem("notificationToOpen"); navigate(`/notifications?focus=${focusId}`); }
      else navigate("/notifications");
    }
    if (item === "permissions") navigate("/admin/permissions");
    if (onMenuItemClick) onMenuItemClick(item);
  };

  const confirmLogout = () => { logout(); navigate("/login"); setShowLogout(false); };

  const roleColors = {
    admin: "bg-red-100 text-red-700",
    staff: "bg-blue-100 text-blue-700",
    student: "bg-emerald-100 text-emerald-700",
    "assessment-coordinator": "bg-violet-100 text-violet-700"
  };
  const roleLabel = {
    admin: "Admin",
    staff: "Staff",
    student: "Student",
    "assessment-coordinator": "Assessment Coordinator"
  };

  return (
    <>
      {/* Navbar */}
      <nav className="aurora-navbar">
        <div className="w-full h-12 flex items-center justify-between gap-4 px-8">
          {/* Left */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-8 h-8 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open menu"
            >
              <span className="w-4 h-0.5 bg-slate-600 dark:bg-slate-300 rounded-full" />
              <span className="w-4 h-0.5 bg-slate-600 dark:bg-slate-300 rounded-full" />
              <span className="w-3 h-0.5 bg-slate-600 dark:bg-slate-300 rounded-full" />
            </button>
            <button onClick={() => navigate("/home")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="navbar-title font-black text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight leading-none hidden sm:block">UAQTEA MANAGEMENT SYSTEM</span>
              <span className="navbar-title font-bold text-slate-900 dark:text-white text-[10px] sm:hidden">UAQTEA MANAGEMENT SYSTEM</span>
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Current time and date */}
            <div className="hidden md:flex flex-col items-end text-slate-700 dark:text-slate-200 leading-tight">
              <span className="text-xs font-semibold">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Notifications bell */}
            <button
              onClick={() => handleMenuItemClick("notifications")}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.25L2.25 14.5A1.5 1.5 0 003.5 17h13a1.5 1.5 0 001.25-2.5L16 11.25V8a6 6 0 00-6-6zM9 16a1 1 0 102 0H9z" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* User dropdown */}
            <div className="relative">
              <div
                onClick={() => setDropdownOpen(!dropdownOpen)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDropdownOpen(!dropdownOpen); } }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  {profileImage ? (
                    <img
                      src={`${profileImage}?t=${Date.now()}`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{displayAcronym || "USR"}</span>
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); handleEditProfilePhoto(); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); handleEditProfilePhoto(); } }}
                    className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/90 text-blue-600 shadow-sm hover:bg-white transition-colors cursor-pointer"
                    aria-label="Edit profile photo"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19V5a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2Z" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      <path d="M8 3.13a4 4 0 0 0 0 7.75" />
                      <path d="M3 21v-8l4 4 3-3 4 4 5-5 4 4v4H3Z" />
                    </svg>
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-200">▾</span>
              </div>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-modal border border-slate-100 dark:border-slate-800 z-20 animate-slide-up py-1">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center">
                          {profileImage ? (
                            <img
                              src={`${profileImage}?t=${Date.now()}`}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-bold text-slate-700 dark:text-slate-100">{displayAcronym}</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleEditProfilePhoto(); }}
                            className="absolute bottom-1 right-1 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/90 text-blue-600 shadow-sm hover:bg-white transition-colors"
                            aria-label="Edit profile photo"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M23 19V5a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2Z" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              <path d="M8 3.13a4 4 0 0 0 0 7.75" />
                              <path d="M3 21v-8l4 4 3-3 4 4 5-5 4 4v4H3Z" />
                            </svg>
                          </button>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleProfileFileChange}
                          className="hidden"
                        />
                        {profileUploadError && <p className="text-[11px] text-red-600 dark:text-red-400">{profileUploadError}</p>}
                        {profileUploadSuccess && <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{profileUploadSuccess}</p>}
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 truncate" style={{ fontFamily: 'Georgia, serif' }}>{displayName}</p>
                      </div>
                    </div>
                    <div className="py-1">
                      <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium" onClick={() => { setDropdownOpen(false); setShowEditProfile(true); }}>
                        Edit
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium" onClick={() => { setDropdownOpen(false); setShowLogout(true); }}>
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}

              {profileCropModalOpen && (
                <>
                  <div className="fixed inset-0 z-30 bg-black/40" onClick={() => { setProfileCropModalOpen(false); resetProfileCrop(); }} />
                  <div className="fixed left-0 right-0 z-40 flex items-start justify-center p-4 pt-0" style={{ top: "5.5rem" }}>
                    <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Adjust profile photo</h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Drag the sliders to crop and zoom before saving.</p>
                      </div>
                      <div className="p-4 space-y-3">
                        <div
                          className="mx-auto w-48 h-48 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative touch-none"
                          onPointerDown={handleDragStart}
                          onPointerMove={handleDragMove}
                          onPointerUp={handleDragEnd}
                          onPointerLeave={handleDragEnd}
                          onTouchMove={handleDragMove}
                          onTouchEnd={handleDragEnd}
                          style={{ touchAction: "none" }}
                        >
                          {selectedProfileFileUrl && (
                            <img
                              src={selectedProfileFileUrl}
                              alt="Profile preview"
                              className="absolute inset-0 w-full h-full object-cover"
                              style={{
                                transform: `translate(${cropX}px, ${cropY}px) scale(${cropScale})`,
                                transition: isDragging ? "none" : "transform 0.15s ease-out"
                              }}
                            />
                          )}
                          <div className="absolute inset-0 rounded-full ring-2 ring-slate-300/90 dark:ring-slate-600/90 pointer-events-none" />
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Zoom</label>
                            <input
                              type="range"
                              min="1"
                              max="3"
                              step="0.05"
                              value={cropScale}
                              onChange={(event) => setCropScale(Number(event.target.value))}
                              className="mt-2 w-full"
                            />
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Drag the image inside the frame to reposition it. Use the zoom slider to scale the photo.
                          </p>
                        </div>
                        {profileUploadError && <p className="text-sm text-red-600 dark:text-red-400">{profileUploadError}</p>}
                      </div>
                      <div className="flex flex-col gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 sm:flex-row sm:justify-end sm:items-center">
                        <button
                          type="button"
                          className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          onClick={() => { setProfileCropModalOpen(false); resetProfileCrop(); }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
                          onClick={uploadCroppedProfileImage}
                          disabled={profileUploading}
                        >
                          {profileUploading ? "Saving..." : "Save photo"}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {sidebarOpen && <div className="sidebar-overlay md:hidden" />}
      <div className={`aurora-sidebar flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-5 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-xl p-2 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
              <NavItem icon={Home} label="Home" onClick={() => handleMenuItemClick("home")} />
              {!isAssessmentCoordinator && (
                <>
                  <NavItem icon={Megaphone} label="Announcements" badge={announcementUnreadCount} onClick={() => handleMenuItemClick("announcements")} />
                  <NavItem icon={Bell} label="Notifications" badge={unreadCount} onClick={() => handleMenuItemClick("notifications")} />
                  <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />

                  {/* Admin menu */}
                  {userRole === "admin" && (
                <>
                  <NavGroup label="Permissions" />
                  <NavItem icon={ShieldCheck} label="Permissions" onClick={() => handleMenuItemClick("permissions")} />
                  <NavGroup label="Payment Management" />
                  <NavItem icon={CreditCard} label="Payments" onClick={() => handleMenuItemClick("paymentsManagement")} />
                  <NavItem icon={BarChart3} label="Analytics" onClick={() => handleMenuItemClick("analytics")} />
                  <NavGroup label="User Management" />
                  <NavItem icon={UserPlus} label="Add New User" onClick={() => handleMenuItemClick("addUser")} />
                  <NavItem icon={Users} label="Manage Users" onClick={() => handleMenuItemClick("manageUsers")} />
                  <NavGroup label="Activity" />
                  <NavItem icon={History} label="Activity Logs" onClick={() => handleMenuItemClick("history")} />
                </>
              )}

              {/* Staff menu */}
              {userRole === "staff" && (
                <>
                  <NavGroup label="Users" />
                  <NavItem icon={Eye} label="View Users" onClick={() => handleMenuItemClick("viewNewUsers")} />
                  <NavGroup label="Payment Management" />
                  <NavItem icon={CreditCard} label="Payments" onClick={() => handleMenuItemClick("paymentsManagement")} />
                  <NavGroup label="Activity" />
                  <NavItem icon={History} label="Activity Logs" onClick={() => handleMenuItemClick("history")} />
                </>
              )}

              {/* Student menu */}
              {userRole === "student" && (
                <>
                  <NavGroup label="Payments" />
                  <NavItem icon={CreditCard} label="My Payments" onClick={() => handleMenuItemClick("payments")} />
                  <NavGroup label="Activity" />
                  <NavItem icon={History} label="Activity Logs" onClick={() => handleMenuItemClick("history")} />
                </>
              )}
                </>
              )}

              {/* Assessment Coordinator menu */}
              {isAssessmentCoordinator && (
                <>
                  <NavItem icon={Bell} label="Notifications" badge={unreadCount} onClick={() => handleMenuItemClick("notifications")} />
                  <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
                </>
              )}

              <NavGroup label="Archive" />
              <NavItem icon={Archive} label="Archive" onClick={() => handleMenuItemClick("archive")} />
              <NavItem icon={Trash2} label="Trash" onClick={() => handleMenuItemClick("trash")} />
            </div>
          </div>

      {/* Modals */}
      <UserModals
        showEditProfile={showEditProfile}
        showChangeCred={showChangeCred}
        showLogout={showLogout}
        displayName={displayName}
        userRole={userRole}
        profileImage={profileImage}
        onCloseEditProfile={() => setShowEditProfile(false)}
        onCloseChangeCred={() => setShowChangeCred(false)}
        onCloseLogout={() => setShowLogout(false)}
        onOpenChangePassword={() => setShowChangeCred(true)}
        onSaveProfile={async (payload) => {
          const token = localStorage.getItem("token");
          let id = null;
          try { if (token) id = JSON.parse(atob(token.split(".")[1])).id; } catch {}
          if (!id) {
            notify("error", "Unable to determine user id.");
            return;
          }
          try {
            if (payload.name) {
              if (auth?.role === "student") localStorage.setItem("studentName", payload.name);
              else localStorage.setItem("username", payload.name);
              setDisplayName(payload.name);
            }
            await axios.put(`/user/${id}`, payload);
            setShowEditProfile(false);
            notify("success", "Profile updated successfully.");
          } catch (err) {
            notify("error", err.response?.data?.message || "Failed to update profile");
          }
        }}
        onChangeProfilePhoto={() => {
          setShowEditProfile(true);
          triggerProfileUpload();
        }}
        onConfirmLogout={confirmLogout}
      />
    </>
  );
}

function ThemeToggle({ isDarkMode, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={isDarkMode}
      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors"
    >
      <span className="flex items-center gap-3">
        <span className="icon-theme icon-theme-sm">DM</span>
        <span>Dark mode</span>
      </span>
      <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDarkMode ? "bg-primary-600" : "bg-slate-300 dark:bg-slate-700"}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? "translate-x-6" : "translate-x-1"}`} />
      </span>
    </button>
  );
}

function NavItem({ icon, label, onClick, badge }) {
  const displayIcon = typeof icon === "string"
    ? (label?.charAt(0)?.toUpperCase() || "•")
    : React.createElement(icon, { className: "w-4 h-4" });

  return (
    <button
      onClick={onClick}
      className="aurora-sidebar-item"
    >
      <span className="flex items-center gap-3">
        <span className="icon-theme icon-theme-sm">{displayIcon}</span>
        {label}
      </span>
      {badge > 0 && (
        <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

function NavGroup({ label }) {
  return (
    <p className="aurora-sidebar-title">{label}</p>
  );
}
