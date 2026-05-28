import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "./context/NotificationContext";
// Auth pages
import TESDALogoSplash from "./pages/auth/TESDALogoSplash";
import LandingPage from "./pages/auth/LandingPage";
import Login from "./pages/auth/Login";
import StaffAdminLogin from "./pages/auth/StaffAdminLogin";
import StudentLogin from "./pages/auth/StudentLogin";
import AdminSignup from "./pages/auth/AdminSignup";
// Main pages
import Home from "./pages/Home";
import SchoolYear from "./pages/SchoolYear";
import Semester from "./pages/Semester";
import Programs from "./pages/Programs";
import ProgramDetail from "./pages/ProgramDetail";
import StudentPaymentsPage from "./pages/StudentPaymentsPage";
import StudentPaymentSelectPage from "./pages/StudentPaymentSelectPage";
import NotificationsPage from "./pages/NotificationsPage";
import AdminApprovalsPage from "./pages/AdminApprovalsPage";
import ManageUsersPage from "./pages/ManageUsersPage";
import PermissionsPage from "./pages/PermissionsPage";
import SettingsPage from "./pages/SettingsPage";
// Dashboards
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import StaffDashboard from "./pages/dashboards/StaffDashboard";
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import ActivityLogPage from "./pages/ActivityLogPage";
import TransactionPage from "./pages/TransactionPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import PaymentsManagementPage from "./pages/PaymentsManagementPage";
import DeadlinePage from "./pages/DeadlinePage";
import PaymentTransactionsPage from "./pages/PaymentTransactionsPage";
import ArchivePage from "./pages/ArchivePage";
import TrashPage from "./pages/TrashPage";

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <Routes>
        <Route path="/" element={<TESDALogoSplash />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/roles" element={<Login />} />
        <Route path="/login/staff-admin" element={<StaffAdminLogin />} />
        <Route path="/login/student" element={<StudentLogin />} />
        <Route path="/signup/admin" element={<AdminSignup />} />
        <Route path="/home" element={<Home />} />
        <Route path="/announcements" element={<Home />} />
        <Route path="/school-year" element={<SchoolYear />} />
        <Route path="/semester" element={<Semester />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/program/:program" element={<ProgramDetail />} />
        <Route path="/student/payments" element={<StudentPaymentSelectPage />} />
        <Route path="/student/payments/:schoolYear" element={<StudentPaymentsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/admin/permissions" element={<PermissionsPage />} />
        <Route path="/admin/manage-users" element={<ManageUsersPage />} />
        <Route path="/admin/approvals" element={<AdminApprovalsPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/activity-log" element={<ActivityLogPage />} />
        <Route path="/accounts" element={<TransactionPage />} />
        <Route path="/transaction" element={<TransactionPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/admin/payments" element={<PaymentsManagementPage />} />
        <Route path="/admin/deadlines" element={<DeadlinePage />} />
        <Route path="/admin/transactions" element={<PaymentTransactionsPage />} />
      </Routes>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;

