import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { AuthContext } from "../context/AuthContext";
import axios from "../api/axios";
import { Alert, EmptyState, PageLoader } from "../components/ui";
import { useNotification } from "../context/NotificationContext";

const roleCards = [
  {
    key: "student",
    title: "Students"
  },
  {
    key: "staff",
    title: "Staff"
  },
  {
    key: "admin",
    title: "Admin"
  }
];

const extractYearFromSchoolYear = (value) => {
  if (!value) return "";
  const match = String(value).match(/(\d{4}-\d{4})/);
  return match ? match[1] : value;
};

const normalizeSemester = (value) => {
  if (!value) return "";
  return String(value).toLowerCase().startsWith("2") ? "2nd" : "1st";
};

export default function ManageUsersPage() {
  const navigate = useNavigate();
  const { auth, schoolYear, semester } = useContext(AuthContext);
  const { notify } = useNotification();
  const [activeRole, setActiveRole] = useState("student");
  const isAdmin = auth?.role === "admin";
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeActionId, setActiveActionId] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", username: "", usn: "", section: "", program: "" });

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const [studentResult, staffResult, adminResult] = await Promise.allSettled([
        axios.get("/students"),
        axios.get("/users", { params: { role: "staff" } }),
        axios.get("/users", { params: { role: "admin" } })
      ]);

      setStudents(
        studentResult.status === "fulfilled"
          ? [...(studentResult.value.data || [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          : []
      );
      setStaffUsers(
        staffResult.status === "fulfilled"
          ? [...(staffResult.value.data || [])].sort((a, b) => (a.username || a.name || "").localeCompare(b.username || b.name || ""))
          : []
      );
      // assessment coordinators removed from UI
      setAdminUsers(
        adminResult.status === "fulfilled"
          ? [...(adminResult.value.data || [])].sort((a, b) => (a.username || a.name || "").localeCompare(b.username || b.name || ""))
          : []
      );

      if (studentResult.status !== "fulfilled" && staffResult.status !== "fulfilled" && assessmentCoordinatorResult.status !== "fulfilled" && adminResult.status !== "fulfilled") {
        setError("Failed to load user data. Please try again.");
      }
    } catch (err) {
      console.error("Failed to load manage users data", err);
      setError("Failed to load user data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleActionMenu = (id) => {
    setActiveActionId((currentId) => (currentId === id ? null : id));
  };

  const openEditDialog = (account) => {
    if (!isAdmin) return;

    setEditingAccount(account);
    setEditForm({
      name: account.name || "",
      username: account.username || "",
      usn: account.usn || "",
      section: account.section || "",
      program: account.program || ""
    });
    setIsModalOpen(true);
    setActiveActionId(null);
  };

  const closeEditDialog = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    setEditForm({ name: "", username: "", usn: "", section: "", program: "" });
  };

  const handleSave = async () => {
    if (!editingAccount) return;

    try {
      setLoading(true);
      const payload = {
        name: editForm.name,
        username: editForm.username,
        usn: editForm.usn,
        section: editForm.section,
        program: editForm.program
      };

      if (activeRole === "student") {
        await axios.put(`/students/${editingAccount._id}`, payload);
      } else {
        await axios.put(`/user/${editingAccount._id}`, payload);
      }

      await loadUsers();
      closeEditDialog();
      notify("success", "User changes saved successfully.");
    } catch (err) {
      console.error("Failed to update user:", err);
      const message = "Unable to save changes, please try again.";
      setError(message);
      notify("error", message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (account) => {
    if (!isAdmin) return;
    if (!window.confirm(`Delete ${account.name || account.username}? This cannot be undone.`)) return;

    try {
      setLoading(true);
      if (activeRole === "student") {
        await axios.delete(`/students/${account._1d}`);
      } else {
        await axios.delete(`/user/${account._id}`);
      }

      await loadUsers();
      setActiveActionId(null);
      notify("success", "User deleted successfully.");
    } catch (err) {
      console.error("Failed to delete user:", err);
      const message = "Unable to delete user, please try again.";
      setError(message);
      notify("error", message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [schoolYear, semester]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeRole, searchTerm]);

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      [student.name, student.usn, student.section, student.program, student.Program]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [students, searchTerm]);

  const groupedStudents = useMemo(() => {
    return filteredStudents.reduce((groups, student) => {
      const programKey = student.program || student.Program || "Unassigned Program";
      if (!groups[programKey]) groups[programKey] = [];
      groups[programKey].push(student);
      return groups;
    }, {});
  }, [filteredStudents]);

  const filteredStaff = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return staffUsers;
    return staffUsers.filter((user) =>
      [user.name, user.username]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [staffUsers, searchTerm]);

  const filteredAdmins = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return adminUsers;
    return adminUsers.filter((user) =>
      [user.name, user.username]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [adminUsers, searchTerm]);

  

  const paginatedStudents = useMemo(
    () => filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredStudents, currentPage]
  );

  const paginatedStaff = useMemo(
    () => filteredStaff.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredStaff, currentPage]
  );

  const paginatedAdmins = useMemo(
    () => filteredAdmins.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredAdmins, currentPage]
  );


  const totalItems =
    activeRole === "student"
      ? filteredStudents.length
      : activeRole === "staff"
      ? filteredStaff.length
      : filteredAdmins.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const handleMenuItemClick = (item) => {
    if (item === "home") navigate("/home");
    if (item === "schoolYear") navigate("/school-year");
    if (item === "manageUsers") navigate("/admin/manage-users");
  };

  const renderAccountTable = (accounts, emptyTitle) => {
    if (accounts.length === 0) {
      return <EmptyState title={emptyTitle} subtitle="No accounts found for this role yet." />;
    }

    return (
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account._id}>
                <td className="font-medium">{account.name || "—"}</td>
                <td>{account.username || "—"}</td>
                <td className="capitalize">{account.role || "—"}</td>
                <td className="text-right">
                  <div className="relative inline-flex">
                    <button
                      className="px-2 py-1 text-sm rounded-full hover:bg-slate-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActionMenu(account._id);
                      }}
                    >
                      ⋮
                    </button>
                    {activeActionId === account._id && (
                      <div className="absolute right-0 top-full mt-1 w-32 sm:w-36 rounded-lg border border-slate-200 bg-white shadow-lg z-20">
                        <button
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                          onClick={() => openEditDialog(account)}
                        >
                          Edit
                        </button>
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-slate-100"
                          onClick={() => handleDelete(account)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <MainLayout user={{ name: "Admin" }} onMenuItemClick={handleMenuItemClick}>
      <div className="page-content text-sm pt-0">
        <div className="mb-4 rounded-3xl border border-white/15 bg-white/10 py-3 px-4 shadow-card backdrop-blur-xl">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-900 dark:text-white">
                MANAGE USERS
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-primary-950/30 px-4 py-2">
              <p className="text-[10px] uppercase tracking-wide text-primary-200">Scope</p>
              <p className="mt-1 text-xs font-semibold text-white">All school years • All semesters</p>
            </div>
          </div>
        </div>

        {error && <Alert type="error" className="mb-6">{error}</Alert>}

        <div className="grid grid-cols-1 gap-4 mb-5 md:grid-cols-3">
          {roleCards.map((role) => {
            const count = role.key === "student" ? students.length : role.key === "staff" ? staffUsers.length : adminUsers.length;
            const isActive = activeRole === role.key;
            return (
              <button
                key={role.key}
                onClick={() => setActiveRole(role.key)}
                className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                  isActive
                    ? "border-primary-400 bg-primary-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50"
                }`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-600">{role.title}</span>
                <span className="text-lg font-display font-bold text-slate-900">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="card text-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
              {activeRole === "student" ? "Students by Program" : activeRole === "staff" ? "Staff Accounts" : "Admin Accounts"}
            </h2>
            <button
              type="button"
              className="btn-secondary h-9 w-9 p-0 flex items-center justify-center"
              onClick={loadUsers}
              aria-label="Refresh users"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4">
                <path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6a6 6 0 0 1-6 6 6 6 0 0 1-5.65-4H5.08a8 8 0 0 0 14.14-4 8 8 0 0 0-8-8z" />
              </svg>
            </button>
          </div>

          <div className="relative mb-4 max-w-md">
            <input
              className="input w-full pr-10 text-sm"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeRole === "student"
                  ? "Search by student name, USN, program, or section..."
                  : "Search by name or username..."
              }
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {loading ? (
            <PageLoader text="Loading users..." />
          ) : activeRole === "student" ? (
            paginatedStudents.length === 0 ? (
              <EmptyState title="No students found" subtitle="Try a different search or add students to the database first." />
            ) : (
              <div className="space-y-4">
                {Object.entries(
                  paginatedStudents.reduce((groups, student) => {
                    const programKey = student.program || student.Program || "Unassigned Program";
                    if (!groups[programKey]) groups[programKey] = [];
                    groups[programKey].push(student);
                    return groups;
                  }, {})
                )
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([programKey, members]) => (
                    <div key={programKey} className="overflow-visible rounded-2xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-900">{programKey}</h3>
                        <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                          {members.length} student{members.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {members.map((student) => (
                          <div key={student._id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium text-slate-900">{student.name || "Unnamed Student"}</p>
                              <p className="text-xs text-slate-500">{student.usn || "No USN"}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-sm font-medium text-slate-600">Section: {student.section || "No Section"}</span>
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                student.competency === "competent"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : student.competency === "incompetent"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}>{student.competency === "competent" ? "Competent" : student.competency === "incompetent" ? "Incompetent" : "Pending"}</span>
                              <div className="relative inline-flex">
                                <button
                                  className="px-2 py-1 text-sm rounded-full hover:bg-slate-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleActionMenu(student._id);
                                  }}
                                >
                                  ⋮
                                </button>
                                {activeActionId === student._id && (
                                  <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-slate-200 bg-white shadow-lg z-20">
                                    <button
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                                      onClick={() => openEditDialog(student)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-slate-100"
                                      onClick={() => handleDelete(student)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )
          ) : activeRole === "staff" ? (
            renderAccountTable(paginatedStaff, "No staff accounts found")
          ) : (
            renderAccountTable(paginatedAdmins, "No admin accounts found")
          )}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentPage(index + 1)}
                    className={`rounded-full px-3 py-2 text-sm transition ${currentPage === index + 1 ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
          <div className="rounded-2xl bg-white p-6 shadow-xl max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Edit {activeRole === "student" ? "Student" : "User"}</h2>
            <div className="space-y-3">
              <label className="block text-sm font-medium">Name</label>
              <input
                className="input w-full"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />

              {(activeRole === "staff" || activeRole === "admin" || activeRole === "student") && (
                <>
                  <label className="block text-sm font-medium">Username / USN (if applicable)</label>
                  <input
                    className="input w-full"
                    value={activeRole === "student" ? editForm.usn : editForm.username}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        activeRole === "student"
                          ? { ...prev, usn: e.target.value }
                          : { ...prev, username: e.target.value }
                      )
                    }
                  />
                </>
              )}

              {activeRole === "student" && (
                <>
                  <label className="block text-sm font-medium">Program</label>
                  <input
                    className="input w-full"
                    value={editForm.program}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, program: e.target.value }))}
                  />
                  <label className="block text-sm font-medium">Section</label>
                  <input
                    className="input w-full"
                    value={editForm.section}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, section: e.target.value }))}
                  />
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary" onClick={closeEditDialog}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

    </MainLayout>
  );
}
