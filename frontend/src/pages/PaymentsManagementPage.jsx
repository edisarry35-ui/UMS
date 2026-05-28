import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MainLayout from "../layouts/MainLayout";
import axios from "../api/axios";
import { Alert } from "../components/ui";
import EditPaymentItemModal from "../components/modals/EditPaymentItemModal";
import AddPaymentItemModal from "../components/modals/AddPaymentItemModal";
import SchoolYear from "./SchoolYear";
import TransactionPage from "./TransactionPage";
import PaymentTransactionsPage from "./PaymentTransactionsPage";

export default function PaymentsManagementPage() {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const isAdmin = auth?.role === "admin";
  const isStaff = auth?.role === "staff";
  const canViewItems = isAdmin || isStaff;
  const [paymentItems, setPaymentItems] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [itemsLoading, setItemsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeSection, setActiveSection] = useState("payments"); // Show the payments school year view by default


  useEffect(() => {
    if (!isAdmin && !isStaff) {
      navigate("/home");
    }
  }, [isAdmin, isStaff, navigate]);

  useEffect(() => {
    const fetchPaymentItems = async () => {
      try {
        const response = await axios.get("/payment-items");
        setPaymentItems(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Failed to load payment items:", err);
        setError("Unable to load payment items from the database");
      } finally {
        setItemsLoading(false);
      }
    };

    fetchPaymentItems();
  }, []);

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDeleteItem = async (itemType) => {
    if (window.confirm(`Are you sure you want to delete the ${paymentItems.find(i => i.type === itemType)?.name} item?`)) {
      try {
        setError("");
        setPaymentItems(paymentItems.filter(item => item.type !== itemType));
        setSuccessMessage("Payment item deleted successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        setError("Failed to delete payment item");
      }
    }
  };

  const handleSaveItem = (updatedItem) => {
    setPaymentItems(paymentItems.map(item => 
      item.type === updatedItem.type ? updatedItem : item
    ));
    setShowEditModal(false);
    setSelectedItem(null);
    setSuccessMessage("Payment item updated successfully!");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleAddItem = async (newItem) => {
    try {
      setError("");
      const response = await axios.post("/payment-items", newItem);
      const savedItem = response.data.item || newItem;

      setPaymentItems((prevItems) => [...prevItems, savedItem]);
      setShowAddModal(false);
      setSuccessMessage("Payment item added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Failed to add payment item:", err);
      setError(err?.response?.data?.message || "Failed to add payment item");
    }
  };

  return (
    <MainLayout user={{ name: isStaff ? "Staff" : "Admin" }} onMenuItemClick={(item) => {
      if (item === "home") navigate("/home");
    }}>
      <div className="page-content">
        {error && <Alert type="error" className="mb-6">{error}</Alert>}
        {successMessage && <Alert type="success" className="mb-6">{successMessage}</Alert>}

        <div className="mb-8 rounded-3xl border border-white/15 bg-white/10 py-4 px-6 shadow-card backdrop-blur-xl md:py-5 md:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/20 px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-sm shadow-slate-900/10">
              Payment Management
            </span>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveSection("payments")}
                className="rounded-3xl border border-slate-200 bg-white/90 px-3 py-2 text-slate-900 transition-all hover:bg-slate-100 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-2xl bg-white/15 flex items-center justify-center text-lg">📅</div>
                  <span className="text-sm font-semibold">Payments</span>
                </div>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveSection(activeSection === "accounts" ? null : "accounts")}
                  className="rounded-3xl border border-slate-200 bg-white/90 px-3 py-2 text-slate-900 transition-all hover:bg-slate-100 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-2xl bg-white/15 flex items-center justify-center text-lg">🏦</div>
                    <span className="text-sm font-semibold">Accounts</span>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveSection("transactions")}
                className="rounded-3xl border border-slate-200 bg-white/90 px-3 py-2 text-slate-900 transition-all hover:bg-slate-100 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-2xl bg-white/15 flex items-center justify-center text-lg">🧾</div>
                  <span className="text-sm font-semibold">Transactions</span>
                </div>
              </button>

              {canViewItems && (
                <button
                  type="button"
                  onClick={() => setActiveSection("items")}
                  className="rounded-3xl border border-slate-200 bg-white/90 px-3 py-2 text-slate-900 transition-all hover:bg-slate-100 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-2xl bg-white/15 flex items-center justify-center text-lg">💳</div>
                    <span className="text-sm font-semibold">Items</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {activeSection && (
          <div className="mb-8 rounded-3xl border border-white/20 bg-white/95 p-0 shadow-2xl overflow-hidden">
            {activeSection === "payments" && <SchoolYear embedded={true} />}
            {activeSection === "accounts" && <TransactionPage embedded={true} />}
            {activeSection === "transactions" && <PaymentTransactionsPage embedded={true} />}
            {activeSection === "items" && (
              <div className="p-6 bg-white text-slate-900">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Payment Items Management</h3>
                    <p className="text-sm text-slate-500 mt-1">Create, edit, or delete payment requirements</p>
                    {!isAdmin && (
                      <p className="text-xs text-slate-400 mt-2">
                        Only administrators can modify payment items. Staff can view the current item list.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => isAdmin && setShowAddModal(true)}
                    disabled={!isAdmin}
                    className={`btn-primary btn-sm ${!isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    Add Item
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {paymentItems.map((item) => (
                    <div key={item.type} className="bg-slate-50 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{item.name}</h4>
                          {item.schoolYear && item.semester && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {item.schoolYear} • {item.semester}
                            </p>
                          )}
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">{item.amount}</p>
                          {item.released && (
                            <p className="text-xs text-slate-500 dark:text-slate-300 mt-2">
                              Release status: <span className="text-emerald-600 dark:text-emerald-300">Released</span>
                            </p>
                          )}
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          item.status === "active" 
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                            : "bg-slate-300 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
                        }`}>
                          {item.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-slate-700">
                        <button
                          onClick={() => isAdmin && handleEditItem(item)}
                          disabled={!isAdmin}
                          className={`flex-1 btn-secondary btn-sm text-xs ${!isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => isAdmin && handleDeleteItem(item.type)}
                          disabled={!isAdmin}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isAdmin ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-slate-700/30 text-slate-400 cursor-not-allowed"}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedItem && (
        <EditPaymentItemModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          onSave={handleSaveItem}
        />
      )}

      <AddPaymentItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddItem}
        existingItems={paymentItems}
      />
    </MainLayout>
  );
}
