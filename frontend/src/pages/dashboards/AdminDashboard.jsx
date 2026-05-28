import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import MainLayout from "../../layouts/MainLayout";
import { AuthContext } from "../../context/AuthContext";
import axios from "../../api/axios";
import { StatCard, PageLoader, SectionHeader, Alert } from "../../components/ui";
import PaymentDeadlineModal from "../../components/modals/PaymentDeadlineModal";
import { fetchAnalytics } from "../../store/analyticsSlice";
import { Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { auth, schoolYear, semester } = useContext(AuthContext);
  const [showManageUsers, setShowManageUsers] = useState(false);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [stats, setStats] = useState({ students: 0, pending: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeActionMenu, setActiveActionMenu] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState(null);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState(null);
  const [selectedChart, setSelectedChart] = useState("schoolYear");
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("All School Years");
  const [selectedSemester, setSelectedSemester] = useState("All Semesters");
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const [semesterMenuOpen, setSemesterMenuOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const chartOptions = [
    { key: "schoolYear", label: "School Year Trends" },
    { key: "semester", label: "Semester Trends" },
    { key: "program", label: "Program Insights" }
  ];

  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsDarkTheme(document.documentElement.classList.contains("dark"));
    }
  }, []);

  const analyticsState = useSelector((state) => state.analytics || {});
  const chartGridStroke = isDarkTheme ? "#334155" : "#e2e8f0";
  const chartTickColor = isDarkTheme ? "#94a3b8" : "#64748b";
  const tooltipContentStyle = isDarkTheme
    ? { backgroundColor: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.18)", color: "#f8fafc" }
    : { backgroundColor: "#ffffff", border: "1px solid rgba(148, 163, 184, 0.4)", color: "#0f172a" };
  const { status: analyticsStatus = "idle", chartData = {}, summary = {} } = analyticsState;
  const activeChartData = chartData?.[`${selectedChart}Chart`] || [];

  // Helper to extract year from "SY 2025-2026" format
  const extractYearFromSchoolYear = (sy) => {
    if (!sy) return "2025-2026";
    const match = sy.match(/(\d{4}-\d{4})/);
    return match ? match[1] : "2025-2026";
  };

  // Helper to normalize semester from "1ST SEM" to "1st" format
  const normalizeSemester = (sem) => {
    if (!sem) return "1st";
    const match = sem.match(/(\d)(?:nd|st|rd|th)?/i);
    if (!match) return "1st";
    return match[1] === "2" ? "2nd" : "1st";
  };

  const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString()}`;

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchFilterOptions(); }, []);
  useEffect(() => { if (showManageUsers) fetchStudents(); }, [showManageUsers, selectedSchoolYear, selectedSemester]);
  useEffect(() => {
    const params = {};
    if (selectedSchoolYear && selectedSchoolYear !== "All School Years") {
      params.schoolYear = selectedSchoolYear;
    }
    if (selectedSemester && selectedSemester !== "All Semesters") {
      params.semester = normalizeSemester(selectedSemester);
    }
    dispatch(fetchAnalytics(params));
  }, [selectedSchoolYear, selectedSemester, dispatch]);

  const fetchFilterOptions = async () => {
    try {
      const response = await axios.get("/school-years");
      const allYears = Array.isArray(response.data) ? response.data : [];
      setSchoolYears(allYears);
      if (allYears.length > 0 && selectedSchoolYear === "All School Years") {
        setSelectedSchoolYear(extractYearFromSchoolYear(schoolYear));
      }
    } catch (err) {
      console.error("Failed to load school years", err);
    }
  };

  const fetchStats = async () => {
    try {
      const [studRes, pendRes, announcementsRes, allAnnouncementsRes] = await Promise.allSettled([
        axios.get("/students"),
        axios.get("/announcements/pending"),
        axios.get("/announcements?status=pending"),
        axios.get("/announcements")
      ]);
      
      setStats({
        students: studRes.status === "fulfilled" ? studRes.value.data?.length || 0 : 0,
        pending: pendRes.status === "fulfilled" ? pendRes.value.data?.length || 0 : 0,
      });

      // Load pending announcements
      if (announcementsRes.status === "fulfilled") {
        setPendingItems((announcementsRes.value.data || []).slice(0, 5));
      }

      // Load latest announcement
      if (allAnnouncementsRes.status === "fulfilled") {
        const announcements = allAnnouncementsRes.value.data || [];
        if (announcements.length > 0) {
          setLatestAnnouncement(announcements[0]);
        }
      }
    } catch {} finally { setStatsLoading(false); }
  };

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      setStudentsError(null);
      const params = {};
      if (selectedSchoolYear && selectedSchoolYear !== "All School Years") {
        params.schoolYear = selectedSchoolYear;
      }
      if (selectedSemester && selectedSemester !== "All Semesters") {
        params.semester = normalizeSemester(selectedSemester);
      }
      const res = await axios.get("/students", { params });
      setStudents(res.data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Failed to fetch students", err);
      setStudentsError("Failed to load students. Please try again.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.usn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.program || s.Program || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.section || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedStudents = filteredStudents.reduce((acc, s) => {
    const programKey = s.program || s.Program || "Unknown Program";
    const sectionKey = s.section || "No Section";
    if (!acc[programKey]) acc[programKey] = {};
    if (!acc[programKey][sectionKey]) acc[programKey][sectionKey] = [];
    acc[programKey][sectionKey].push(s);
    return acc;
  }, {});

  const handleEdit = (s) => { setEditingId(s._id); setEditData({ ...s }); setActiveActionMenu(null); };
  const handleSave = () => { setPendingSave({ id: editingId, data: editData }); setShowPasswordModal(true); setPwError(""); setActiveActionMenu(null); };
  const handleDelete = (id) => { setPendingSave({ id, action: "delete" }); setShowPasswordModal(true); setPwError(""); setActiveActionMenu(null); };

  const confirmAction = async () => {
    if (adminPassword !== "admin123") { setPwError("Incorrect password"); return; }
    try {
      if (pendingSave?.action === "delete") {
        await axios.delete(`/user/${pendingSave.id}`);
      } else {
        await axios.put(`/user/${pendingSave.id}`, pendingSave.data);
        setEditingId(null); setEditData({});
      }
      fetchStudents();
    } catch (err) { console.error("Action failed", err); }
    setShowPasswordModal(false); setPendingSave(null); setAdminPassword(""); setPwError("");
  };

  const handleMenuItemClick = (item) => {
    if (item === "home") navigate("/home");
    else if (item === "manageUsers") navigate("/admin/manage-users");
  };

  const username = localStorage.getItem("username") || "Admin";
  const currentYear = extractYearFromSchoolYear(schoolYear);
  const currentSemester = semester || "1ST SEM";

  return (
    <MainLayout user={{ name: "Admin" }} onMenuItemClick={handleMenuItemClick}>
      <div className="page-content">
        <div className="mb-8 rounded-3xl border border-white/15 bg-white/10 py-3 px-4 shadow-card backdrop-blur-xl md:py-4 md:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/20 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-900 shadow-sm shadow-slate-900/10">
                Admin Dashboard
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 justify-end overflow-visible">
              <div className="relative w-full max-w-[150px] overflow-visible">
                <button
                  type="button"
                  onClick={() => {
                    setYearMenuOpen((prev) => !prev);
                    setSemesterMenuOpen(false);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-primary-950/30 px-3 py-2 text-left"
                >
                  <p className="text-[10px] uppercase tracking-wide text-primary-200">School Year</p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedSchoolYear}</p>
                </button>
                {yearMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => { setSelectedSchoolYear("All School Years"); setYearMenuOpen(false); }}
                      className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >All School Years</button>
                    {schoolYears.map((yearOption) => (
                      <button
                        key={yearOption}
                        type="button"
                        onClick={() => { setSelectedSchoolYear(yearOption); setYearMenuOpen(false); }}
                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >{yearOption}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative w-full max-w-[150px] overflow-visible">
                <button
                  type="button"
                  onClick={() => {
                    setSemesterMenuOpen((prev) => !prev);
                    setYearMenuOpen(false);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-primary-950/30 px-3 py-2 text-left"
                >
                  <p className="text-[10px] uppercase tracking-wide text-primary-200">Semester</p>
                  <p className="mt-1 text-sm font-semibold text-white">{selectedSemester}</p>
                </button>
                {semesterMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {["All Semesters", "1ST SEM", "2ND SEM"].map((semesterOption) => (
                      <button
                        key={semesterOption}
                        type="button"
                        onClick={() => { setSelectedSemester(semesterOption); setSemesterMenuOpen(false); }}
                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >{semesterOption}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => navigate("/admin/manage-users")}
            className="w-full text-left"
          >
            <StatCard icon="TS" label="Total Students" value={statsLoading ? "—" : stats.students} color="blue" />
          </button>
          <button
            type="button"
            className="w-full text-left"
          >
            <StatCard icon="AP" label="Active Programs" value="4" color="green" />
          </button>
          <button
            type="button"
            className="w-full text-left"
          >
            <StatCard icon="PA" label="Pending Approvals" value={statsLoading ? "—" : stats.pending} color="amber" />
          </button>
          <button
            type="button"
            className="w-full text-left"
          >
            <StatCard icon="SY" label="School Year" value={currentYear} color="purple" />
          </button>
        </div>


        <div className="grid grid-cols-1 gap-6 mb-6 xl:grid-cols-3">
          {/* Live Analytics Section */}
          <div className="xl:col-span-2 rounded-[1.25rem] bg-white/95 border border-slate-200/70 p-3 shadow-sm shadow-slate-300/10 dark:bg-slate-950/95 dark:border-white/10 dark:shadow-xl dark:shadow-slate-950/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Live Chart</p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Dynamic payment performance</h2>
              </div>
              <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                {chartOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedChart(option.key)}
                    className={`rounded-full px-3 py-1.5 transition ${selectedChart === option.key ? 'bg-slate-900 text-white dark:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-950/60 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 h-[270px]">
              {analyticsStatus === "loading" ? (
                <PageLoader text="Loading live analytics..." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activeChartData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="lineA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="lineB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.88} />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={chartGridStroke} strokeOpacity={0.24} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: chartTickColor, fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: chartTickColor, fontSize: 12 }} tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => formatCurrency(value)} />
                    <Area type="monotone" dataKey="totalAmount" stroke="none" fill="url(#lineA)" fillOpacity={0.24} />
                    <Line type="monotone" dataKey="paidAmount" stroke="#38bdf8" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="pendingAmount" stroke="#a855f7" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#a855f7', stroke: '#ffffff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Right Column - Approvals and Latest Announcement */}
          <div className="grid grid-cols-1 gap-6">
            {/* Pending Approvals Section */}
            <div className="card h-[250px] flex flex-col">
              <SectionHeader title="Pending Approvals" subtitle="Recent announcements awaiting review." />
              <div className="table-wrapper flex-1 overflow-hidden">
                {pendingItems.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">No pending approvals</div>
                ) : (
                  <table className="data-table text-xs">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Created By</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingItems.slice(0, 3).map((item) => (
                        <tr key={item._id}>
                          <td className="font-medium max-w-xs truncate">{item.title || "Untitled"}</td>
                          <td className="text-slate-400">{item.type || "announcement"}</td>
                          <td className="text-slate-400">{item.createdBy || "System"}</td>
                          <td className="text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Latest Announcement Section */}
            <div className="card h-[250px] flex flex-col">
              <SectionHeader title="Latest Announcement" subtitle="Most recent announcement posted." />
              <div className="flex-1 overflow-hidden flex flex-col">
                {latestAnnouncement ? (
                  <div className="p-4 flex flex-col gap-3 h-full">
                    <h3 className="font-semibold text-slate-100 line-clamp-2">{latestAnnouncement.title || "Untitled"}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3 flex-1">{latestAnnouncement.content || latestAnnouncement.description || "No description available"}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-700">
                      <span>{latestAnnouncement.author || latestAnnouncement.createdBy || "System"}</span>
                      <span>{new Date(latestAnnouncement.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-sm">No announcements available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showManageUsers && (
        <div className="modal-overlay" onClick={() => setShowManageUsers(false)}>
          <div className="modal-box max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>\n
            <div className="modal-header">
              <h3 className="text-base font-display font-semibold">Manage Students</h3>
              <button className="text-slate-400 hover:text-slate-600 p-1" onClick={() => setShowManageUsers(false)}>✕</button>
            </div>
            <div className="modal-body">
              <input className="input mb-4" type="text" placeholder="🔍 Search by name, USN, Program, or section..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {studentsError && <Alert type="error" className="mb-4">{studentsError}</Alert>}
              {loadingStudents ? (
                <PageLoader text="Loading students..." />
              ) : (
                <div className="table-wrapper space-y-4">
                  {Object.entries(groupedStudents).length === 0 ? (
                    <div className="p-6 text-center text-slate-400">No students found</div>
                  ) : (
                    Object.entries(groupedStudents).map(([programKey, sections]) => (
                      <div key={programKey} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-2 bg-slate-100">
                          <h4 className="font-semibold">{programKey} ({Object.values(sections).flat().length})</h4>
                        </div>
                        {Object.entries(sections).map(([sectionKey, studentsInSection]) => (
                          <div key={sectionKey} className="p-3 border-t border-slate-200 last:border-b-0">
                            <div className="mb-2 text-sm text-slate-700 font-medium">Section: {sectionKey} ({studentsInSection.length})</div>
                            <table className="data-table">
                              <thead><tr><th>Name</th><th>USN</th><th>Section</th><th className="text-right">⋯</th></tr></thead>
                              <tbody>
                                <tr>
                                  <td>Test</td>
                                  <td>Test</td>
                                  <td>Test</td>
                                  <td>Test</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <PaymentDeadlineModal
        isOpen={showDeadlineModal}
        onClose={() => setShowDeadlineModal(false)}
        onSuccess={() => {
          // Refresh stats or show success message
          fetchStats();
        }}
      />
    </MainLayout>
  );
}

