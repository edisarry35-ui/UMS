import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import axios, { API_BASE_URL } from "../api/axios";
import { SectionHeader, PageLoader, Alert } from "../components/ui";

export default function TransactionPage({ embedded = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isEmbed = embedded || searchParams.get("embed") === "1" || searchParams.get("embed") === "true";
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", number: "", qrImage: null, active: false });
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [qrImageToShow, setQrImageToShow] = useState(null);
  const [pendingActiveChange, setPendingActiveChange] = useState(null);
  const [currentAccount, setCurrentAccount] = useState(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("/gcash-accounts");
      setAccounts(response.data || []);
    } catch (err) {
      console.error("Failed to load GCash accounts", err);
      setError("Failed to load accounts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account) => {
    setEditingId(account._id);
    setCurrentAccount(account);
    setFormData({ 
      name: account.name, 
      number: account.number, 
      qrImage: null, 
      active: account.active || false 
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.number.trim()) {
      alert("Name and number are required.");
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("number", formData.number);
      data.append("active", formData.active.toString());
      if (formData.qrImage) {
        data.append("qrImage", formData.qrImage);
      }

      if (editingId && editingId !== "new") {
        await axios.put(`/gcash-accounts/${editingId}`, data, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        await axios.post("/gcash-accounts", data, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      setEditingId(null);
      setCurrentAccount(null);
      setFormData({ name: "", number: "", qrImage: null, active: false });
      loadAccounts();
      setShowModal(false);
    } catch (err) {
      console.error("Failed to save account", err);
      alert("Failed to save account. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this account?")) return;

    try {
      await axios.delete(`/gcash-accounts/${id}`);
      loadAccounts();
    } catch (err) {
      console.error("Failed to delete account", err);
      alert("Failed to delete account. Please try again.");
    }
  };

  const handleActiveToggle = () => {
    const newActiveStatus = !formData.active;
    setPendingActiveChange(newActiveStatus);
    setShowConfirmModal(true);
  };

  const handleConfirmToggle = () => {
    if (pendingActiveChange !== null) {
      setFormData({ ...formData, active: pendingActiveChange });
    }
    setPendingActiveChange(null);
    setShowConfirmModal(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setCurrentAccount(null);
    setFormData({ name: "", number: "", qrImage: null, active: false });
    setShowModal(false);
  };

  const pageContent = (
      <div className="page-content">
        <div className="mb-6">
          {!isEmbed && (
            <button
              onClick={() => navigate("/admin/payments")}
              aria-label="Back"
              className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
        <div className="card mb-6">
          <SectionHeader title="GCash Transaction Management" subtitle="Manage GCash accounts for receiving student payments." />
          <div className="flex flex-wrap gap-3 mb-4">
            <button className="btn-primary" onClick={() => {
              setEditingId("new");
              setCurrentAccount(null);
              setFormData({ name: "", number: "", qrImage: null, active: false });
              setShowModal(true);
            }}>Add New Account</button>
            <button className="btn-secondary" onClick={loadAccounts}>Refresh</button>
          </div>
          {loading ? (
            <PageLoader text="Loading accounts..." />
          ) : error ? (
            <Alert type="error">{error}</Alert>
          ) : (
            <div className="table-wrapper overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Number</th>
                    <th>QR Code</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-slate-400">No GCash accounts found.</td>
                    </tr>
                  ) : (
                    accounts.map((account) => (
                      <tr key={account._id}>
                        <td className="font-medium">{account.name}</td>
                        <td>{account.number}</td>
                        <td>
                          {account.qrImage ? (
                            <img 
                              src={`${API_BASE_URL}/uploads/${account.qrImage}`} 
                              alt="QR Code" 
                              className="w-16 h-16 object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                              onClick={() => {
                                setQrImageToShow(`${API_BASE_URL}/uploads/${account.qrImage}`);
                                setShowQrModal(true);
                              }}
                            />
                          ) : (
                            "No QR"
                          )}
                        </td>
                        <td>
                          <span 
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              account.active 
                                ? "bg-emerald-100 text-emerald-700" 
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {account.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <button className="btn-secondary text-xs mr-2" onClick={() => handleEdit(account)}>Edit</button>
                          <button className="btn-danger text-xs" onClick={() => handleDelete(account._id)}>Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* GCash Account Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-box max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="text-lg font-display font-semibold text-slate-900">
                  {editingId === "new" ? "Add New GCash Account" : "Edit GCash Account"}
                </h3>
                <button
                  className="text-slate-400 hover:text-slate-600 p-1"
                  onClick={() => setShowModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Account holder name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GCash Number</label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="input"
                    placeholder="09xxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">QR Code Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, qrImage: e.target.files[0] })}
                    className="input"
                  />
                  <p className="text-xs text-slate-500 mt-1">Upload a photo of the QR code for this account.</p>
                  
                  {currentAccount && currentAccount.qrImage && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-slate-700 mb-2">Current QR Code:</p>
                      <img 
                        src={`${API_BASE_URL}/uploads/${currentAccount.qrImage}`} 
                        alt="Current QR Code" 
                        className="w-32 h-32 object-cover border border-slate-300 rounded-lg" 
                      />
                    </div>
                  )}
                </div>
                {editingId !== "new" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Account Status</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleActiveToggle}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          formData.active 
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-300" 
                            : "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}
                      >
                        {formData.active ? "Active" : "Inactive"}
                      </button>
                      <span className="text-sm text-slate-500">
                        {formData.active ? "Account is active and can receive payments" : "Account is inactive and cannot receive payments"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={handleCancel}>Cancel</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* QR Code Modal */}
        {showQrModal && qrImageToShow && (
          <div className="modal-overlay">
            <div className="modal-box">
              <div className="modal-header">
                <h3>QR Code</h3>
                <button className="modal-close" onClick={() => setShowQrModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <img src={qrImageToShow} alt="QR Code" style={{ maxWidth: '100%', height: 'auto' }} />
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && pendingActiveChange !== null && (
          <div className="modal-overlay">
            <div className="modal-box">
              <div className="modal-header">
                <h3>Confirm Status Change</h3>
                <button className="modal-close" onClick={() => setShowConfirmModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to {pendingActiveChange ? 'activate' : 'deactivate'} this GCash account?</p>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowConfirmModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleConfirmToggle}>Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );

  if (isEmbed) return pageContent;

  return (
    <MainLayout user={{ name: "Transaction" }} onMenuItemClick={null}>
      {pageContent}
    </MainLayout>
  );
}
