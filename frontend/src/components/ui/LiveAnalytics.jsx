import React, { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import axios from "../../api/axios";
import { PageLoader } from "./index";

export default function LiveAnalytics() {
  const [transactionData, setTransactionData] = useState([]);
  const [approvalData, setApprovalData] = useState([]);
  const [paymentMetrics, setPaymentMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState("transactions");

  useEffect(() => {
    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const [transRes, annRes] = await Promise.allSettled([
        axios.get("/transactions"),
        axios.get("/announcements")
      ]);

      // Process transaction data
      if (transRes.status === "fulfilled") {
        const transactions = transRes.value.data || [];
        const groupedByStatus = transactions.reduce((acc, trans) => {
          const status = trans.status || "Unknown";
          const existing = acc.find(item => item.name === status);
          if (existing) existing.value += 1;
          else acc.push({ name: status, value: 1 });
          return acc;
        }, []);
        setTransactionData(groupedByStatus);

        // Calculate payment metrics
        const totalTransactions = transactions.length;
        const approvedTransactions = transactions.filter(t => t.status === "approved").length;
        const pendingTransactions = transactions.filter(t => t.status === "pending").length;
        const rejectedTransactions = transactions.filter(t => t.status === "rejected").length;
        
        setPaymentMetrics({
          total: totalTransactions,
          approved: approvedTransactions,
          pending: pendingTransactions,
          rejected: rejectedTransactions,
          approvalRate: totalTransactions > 0 ? ((approvedTransactions / totalTransactions) * 100).toFixed(1) : 0
        });
      }

      // Process announcement/approval data
      if (annRes.status === "fulfilled") {
        const announcements = annRes.value.data || [];
        const groupedByStatus = announcements.reduce((acc, ann) => {
          const status = ann.status || "pending";
          const existing = acc.find(item => item.name === status);
          if (existing) existing.value += 1;
          else acc.push({ name: status, value: 1 });
          return acc;
        }, []);
        setApprovalData(groupedByStatus);
      }
    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

  if (loading) return <PageLoader text="Loading analytics..." />;

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
          <p className="text-[11px] uppercase tracking-wide text-blue-600 font-semibold">Total Transactions</p>
          <p className="mt-2 text-3xl font-bold text-blue-900">{paymentMetrics.total || 0}</p>
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4">
          <p className="text-[11px] uppercase tracking-wide text-green-600 font-semibold">Approved</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{paymentMetrics.approved || 0}</p>
        </div>
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-4">
          <p className="text-[11px] uppercase tracking-wide text-yellow-600 font-semibold">Pending</p>
          <p className="mt-2 text-3xl font-bold text-yellow-600">{paymentMetrics.pending || 0}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
          <p className="text-[11px] uppercase tracking-wide text-red-600 font-semibold">Approval Rate</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{paymentMetrics.approvalRate || 0}%</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveChart("transactions")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeChart === "transactions"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Payment Distribution
          </button>
          <button
            onClick={() => setActiveChart("approvals")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeChart === "approvals"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Approval Distribution
          </button>
          <button
            onClick={fetchAnalyticsData}
            className="ml-auto px-4 py-2 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
          {activeChart === "transactions" && transactionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={transactionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {transactionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} transactions`} />
              </PieChart>
            </ResponsiveContainer>
          ) : activeChart === "approvals" && approvalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={approvalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                  formatter={(value) => [`${value} items`, "Count"]}
                />
                <Bar dataKey="value" fill="#3B82F6" name="Approvals" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">System Status</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Payment Transactions Processed:</span>
            <span className="font-semibold text-slate-900">{paymentMetrics.total || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Successful Approvals:</span>
            <span className="font-semibold text-green-600">{paymentMetrics.approved || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Pending Review:</span>
            <span className="font-semibold text-yellow-600">{paymentMetrics.pending || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Overall Approval Rate:</span>
            <span className="font-semibold text-blue-600">{paymentMetrics.approvalRate || 0}%</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mt-4">Last updated: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
