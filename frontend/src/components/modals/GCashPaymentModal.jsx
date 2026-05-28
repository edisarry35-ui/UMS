import React, { useState, useEffect } from "react";
import axios, { API_BASE_URL } from "../../api/axios";
import { useNotification } from "../../context/NotificationContext";

export default function GCashPaymentModal({ open, onClose, amount, studentId, paymentType, schoolYear, semester, onPaid }) {
  const { notify } = useNotification();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [noActiveAccounts, setNoActiveAccounts] = useState(false);

  useEffect(() => {
    if (open) {
      fetchActiveAccount();
      setReceiptFile(null);
      setUploadError("");
    }
  }, [open]);

  const fetchActiveAccount = async () => {
    setLoading(true);
    setNoActiveAccounts(false);
    try {
      // Fetch all accounts and filter for active ones
      const response = await axios.get("/gcash-accounts");
      const accounts = response.data || [];
      const activeAccounts = accounts.filter(acc => acc.active === true);
      
      if (activeAccounts.length === 0) {
        setNoActiveAccounts(true);
        setAccount(null);
      } else {
        // Use the first active account
        setAccount(activeAccounts[0]);
      }
    } catch (err) {
      console.error("Failed to fetch GCash accounts", err);
      setNoActiveAccounts(true);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="text-base font-display font-semibold">Pay via GCash</h3>
            <button className="text-slate-400 hover:text-slate-600 p-1" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body text-center">
            <p className="text-sm text-slate-500">Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (noActiveAccounts || !account) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="text-base font-display font-semibold">Pay via GCash</h3>
            <button className="text-slate-400 hover:text-slate-600 p-1" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body text-center">
            <div className="bg-slate-100 rounded-xl p-6 space-y-3">
              <div className="text-4xl">⚠️</div>
              <h4 className="text-base font-semibold text-slate-900">No Payment Accounts Available</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                There are currently no available GCash accounts for payments. Please contact your administrator for assistance.
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary flex-1" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }
  const gcashName = account.name;
  const gcashNumber = account.number || account.phone || account.gcashNumber || "";
  const formattedAmount = amount ? Number(amount).toFixed(2) : "0.00";

  const uploadReceipt = async () => {
    if (!receiptFile) {
      setUploadError("Please upload a receipt image before saving.");
      return;
    }

    setSubmitting(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("receipt", receiptFile);
      formData.append("paymentType", paymentType);
      formData.append("schoolYear", schoolYear);
      formData.append("semester", semester);

      await axios.post(`/student/${studentId}/payment-receipt`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      notify("info", "Your payment has been uploaded and is pending admin approval. You will be notified when it is approved or rejected.");
      if (onPaid) await onPaid();
      onClose();
    } catch (err) {
      console.error("Failed to upload receipt:", err);
      setUploadError(err.response?.data?.message || "Failed to upload receipt. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiptChange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setReceiptFile(null);
      return;
    }
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Only JPG, PNG, or WEBP image files are allowed.");
      setReceiptFile(null);
      return;
    }
    setReceiptFile(file);
    setUploadError("");
  };

  if (!open) return null;

  // Show loading state
  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="text-base font-display font-semibold">Pay via GCash</h3>
            <button className="text-slate-400 hover:text-slate-600 p-1" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body text-center">
            <p className="text-sm text-slate-500">Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show no accounts available message
  if (noActiveAccounts || !account) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="text-base font-display font-semibold">Pay via GCash</h3>
            <button className="text-slate-400 hover:text-slate-600 p-1" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body text-center">
            <div className="bg-slate-100 rounded-xl p-6 space-y-3">
              <div className="text-4xl">⚠️</div>
              <h4 className="text-base font-semibold text-slate-900">No Payment Accounts Available</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                There are currently no available GCash accounts for payments. Please contact your administrator for assistance.
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary flex-1" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-base">💙</div>
            <h3 className="text-base font-display font-semibold">Pay via GCash</h3>
          </div>
          <button className="text-slate-400 hover:text-slate-600 p-1" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body text-center">
          <>
            <p className="text-sm text-slate-500 mb-5">
              Please upload your payment receipt. Your payment will be reviewed and confirmed by an admin.
            </p>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-left mb-5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">GCash Number</span>
                <span className="text-sm font-semibold text-slate-800 font-mono">{gcashNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Account Name</span>
                <span className="text-sm font-semibold text-slate-800">{gcashName}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                <span className="text-xs text-slate-500 font-medium">Amount Due</span>
                <span className="text-base font-bold text-primary-700">₱{formattedAmount}</span>
              </div>
            </div>

            {account.qrImage && (
              <div className="mb-5 p-3 bg-white rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 font-medium mb-2 text-center">Scan QR Code</p>
                <img 
                  src={`${API_BASE_URL}/uploads/${account.qrImage}`} 
                  alt="GCash QR Code" 
                  className="w-full max-w-[200px] mx-auto rounded-lg border border-slate-200"
                />
              </div>
            )}

            <div className="mb-4 w-full">
              <label className="block text-sm font-medium text-slate-200 mb-1">Upload Receipt Image</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                onChange={handleReceiptChange}
                className="w-full text-sm text-slate-800 rounded-lg border border-slate-300 p-2 bg-white"
              />
              <p className="text-xs text-slate-400 mt-2">
                Upload proof of payment (JPG/PNG/WEBP). Receipt will be reviewed by admin.
              </p>
              {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
            </div>

            {receiptFile && (
              <div className="text-left p-3 border border-slate-700 rounded-lg bg-slate-900/40">
                <p className="text-xs text-slate-300">Selected:</p>
                <p className="text-sm text-white font-semibold">{receiptFile.name}</p>
              </div>
            )}
          </>
        </div>
        <div className="modal-footer flex gap-2">
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>Close</button>
          <button
            className="btn-success flex-1"
            onClick={uploadReceipt}
            disabled={!receiptFile || submitting}
          >
            {submitting ? "Submitting..." : "Submit for Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
