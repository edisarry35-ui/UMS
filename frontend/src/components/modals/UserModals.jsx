import React, { useState, useEffect } from "react";

export default function UserModals({
  showEditProfile, showChangeCred, showLogout,
  displayName, userRole, profileImage,
  onCloseEditProfile, onCloseChangeCred, onCloseLogout,
  onSaveProfile, onChangeProfilePhoto, onConfirmLogout, onOpenChangePassword,
}) {
  return (
    <>
      <EditProfileModal
        open={showEditProfile}
        initialName={displayName}
        role={userRole}
        profileImage={profileImage}
        onClose={onCloseEditProfile}
        onSave={onSaveProfile}
        onChangePhoto={onChangeProfilePhoto}
        onOpenChangePassword={onOpenChangePassword}
      />
      <ChangeCredentialModal open={showChangeCred} role={userRole} onClose={onCloseChangeCred} onSave={onSaveProfile} />
      <LogoutModal open={showLogout} onClose={onCloseLogout} onConfirm={onConfirmLogout} />
    </>
  );
}

export function EditProfileModal({ open, initialName, role, profileImage, onClose, onSave, onChangePhoto, onOpenChangePassword }) {
  const [name, setName] = useState(initialName || "");
  const [usn, setUsn] = useState("");

  useEffect(() => {
    setName(initialName || "");
    setUsn("");
  }, [initialName, open]);

  if (!open) return null;

  const handleSave = () => {
    const payload = {};
    if (name) payload.name = name;

    if (role === "student") {
      if (!usn) return alert("USN cannot be empty");
      payload.usn = usn;
    }

    if (!payload.name && !payload.usn) {
      return alert("Please update your name" + (role === "student" ? " or USN" : "") + " before saving.");
    }

    onSave(payload);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-base font-display font-semibold">Edit Profile</h3>
          <button className="text-slate-400 hover:text-slate-600 text-sm p-1" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-800">
              {profileImage ? (
                <img src={`${profileImage}?t=${Date.now()}`} alt="Profile preview" className="w-full h-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-slate-900 dark:text-slate-100">{(initialName || "?").split(" ").map((p) => p[0]).join("").slice(0, 2)}</span>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChangePhoto(); }}
                className="absolute bottom-1 right-1 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-blue-600 shadow-sm hover:bg-white transition-colors"
                aria-label="Change profile photo"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19V5a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2Z" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  <path d="M8 3.13a4 4 0 0 0 0 7.75" />
                  <path d="M3 21v-8l4 4 3-3 4 4 5-5 4 4v4H3Z" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Click the camera icon to change your profile photo.</p>
          </div>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoFocus />
          </div>
          {role === "student" ? (
            <div className="input-group">
              <label className="input-label">New USN</label>
              <input className="input" value={usn} onChange={(e) => setUsn(e.target.value)} placeholder="New USN" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenChangePassword?.();
              }}
              className="w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
            >
              Change Password
            </button>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

export function ChangeCredentialModal({ open, role, onClose, onSave }) {
  const [usn, setUsn] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  
  useEffect(() => { 
    setUsn(""); 
    setCurrentPassword(""); 
    setPassword(""); 
    setConfirm(""); 
  }, [open]);
  
  if (!open) return null;
  
  const handleSave = () => {
    if (role === "student") {
      if (!usn) return alert("USN cannot be empty");
      onSave({ usn });
    } else {
      if (!currentPassword) return alert("Current password is required");
      if (!password) return alert("New password cannot be empty");
      if (password !== confirm) return alert("Passwords do not match");
      onSave({ currentPassword, password });
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-base font-display font-semibold">{role === "student" ? "Change USN" : "Change Password"}</h3>
          <button className="text-slate-400 hover:text-slate-600 text-sm p-1" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="text-sm text-slate-500 mb-4">{role === "student" ? "Enter your new USN." : "Enter your current password and create a new one for your account."}</p>
          {role === "student" ? (
            <div className="input-group">
              <label className="input-label">New USN</label>
              <input className="input" value={usn} onChange={(e) => setUsn(e.target.value)} placeholder="New USN" />
            </div>
          ) : (
            <>
              <div className="input-group">
                <label className="input-label">Current Password</label>
                <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter your current password" />
              </div>
              <div className="input-group">
                <label className="input-label">New Password</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" />
              </div>
              <div className="input-group">
                <label className="input-label">Confirm Password</label>
                <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" />
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

export function LogoutModal({ open, onClose, onConfirm }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-base font-display font-semibold">Confirm Logout</h3>
          <button className="text-slate-400 hover:text-slate-600 text-sm p-1" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="text-sm text-slate-600">Are you sure you want to log out of UAQTEA Management System?</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Logout</button>
        </div>
      </div>
    </div>
  );
}
