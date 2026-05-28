import React, { useEffect, useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { PageLoader, Alert, SectionHeader } from "../components/ui";
import MainLayout from "../layouts/MainLayout";
import { AuthContext } from "../context/AuthContext";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { fetchAnalytics } from "../store/analyticsSlice";

const CHART_OPTIONS = [
  { key: "schoolYear", label: "School Year Trends" },
  { key: "semester", label: "Semester Trends" },
  { key: "program", label: "Program Insights" }
];

const COLORS = ["#38bdf8", "#a855f7", "#22c55e", "#f59e0b", "#f97316"];

export default function AnalyticsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [selectedChart, setSelectedChart] = useState("schoolYear");
  const [selectedCategory, setSelectedCategory] = useState("program");
  const [exportSelection, setExportSelection] = useState({
    summary: true,
    dashboardPulse: false,
    revenueBreakdown: false,
    liveChart: false,
    topPrograms: false,
    revenueShare: false,
    exportAll: false
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const revenueBreakdownRef = useRef(null);
  const liveChartRef = useRef(null);
  const revenueShareRef = useRef(null);

  const exportOptionLabels = {
    summary: "Summary",
    dashboardPulse: "Dashboard Pulse",
    revenueBreakdown: "Revenue Breakdown",
    liveChart: "Live Chart",
    topPrograms: "Top Programs",
    revenueShare: "Revenue Share"
  };

  const selectedExportKeys = exportSelection.exportAll
    ? Object.keys(exportOptionLabels)
    : Object.keys(exportSelection).filter((key) => key !== "exportAll" && exportSelection[key]);

  const formatCurrencyPdf = (value) => `PHP ${Number(value || 0).toLocaleString("en-US")}`;
  const formatPercentagePdf = (value) => `${Number(value || 0).toFixed(1)}%`;

  const toggleExportSelection = (key) => {
    if (key === "exportAll") {
      const allSelected = !exportSelection.exportAll;
      setExportSelection({
        summary: allSelected,
        dashboardPulse: allSelected,
        revenueBreakdown: allSelected,
        liveChart: allSelected,
        topPrograms: allSelected,
        revenueShare: allSelected,
        exportAll: allSelected
      });
      return;
    }

    setExportSelection((prev) => ({
      ...prev,
      [key]: !prev[key],
      exportAll: false
    }));
  };

  const createPdfContent = () => {
    const lines = [];
    lines.push("ANALYTICS FOR UAQTEA OFFICE");
    lines.push("");
    lines.push(`Selected sections: ${selectedExportKeys.map((key) => exportOptionLabels[key]).join(", ") || "None"}`);
    lines.push("");

    if (selectedExportKeys.includes("summary")) {
      lines.push("Summary Metrics:");
      lines.push(`- Total Revenue: ${formatCurrencyPdf(summary.totalAmount)}`);
      lines.push(`- Collection Rate: ${formatPercentagePdf(summary.totalAmount ? (summary.paidAmount / summary.totalAmount) * 100 : 0)}`);
      lines.push(`- Programs: ${summary.programCount}`);
      lines.push(`- Students: ${summary.studentCount}`);
      lines.push("");
    }

    if (selectedExportKeys.includes("dashboardPulse")) {
      lines.push("Dashboard Pulse:");
      lines.push(`- Paid: ${formatCurrencyPdf(summary.paidAmount)}`);
      lines.push(`- Pending: ${formatCurrencyPdf(summary.pendingAmount)}`);
      lines.push("");
    }

    if (selectedExportKeys.includes("revenueBreakdown")) {
      lines.push("Revenue Breakdown (top programs):");
      programBreakdownData.slice(0, 8).forEach((item) => {
        lines.push(`- ${item.name}: Paid ${formatCurrencyPdf(item.paid)}, Pending ${formatCurrencyPdf(item.pending)}`);
      });
      lines.push("");
    }

    if (selectedExportKeys.includes("liveChart")) {
      lines.push("Live Chart Data:");
      lines.push(`- Focused Chart: ${CHART_OPTIONS.find((o) => o.key === selectedChart)?.label || selectedChart}`);
      activeChartData.forEach((item) => {
        lines.push(`- ${item.name}: Total ${formatCurrencyPdf(item.totalAmount)}, Paid ${formatCurrencyPdf(item.paidAmount)}, Pending ${formatCurrencyPdf(item.pendingAmount)}`);
      });
      lines.push("");
    }

    if (selectedExportKeys.includes("topPrograms")) {
      lines.push("Top Programs:");
      (chartData?.programChart || []).slice(0, 5).forEach((program) => {
        lines.push(`- ${program.fullName}: ${formatCurrencyPdf(program.totalAmount)} (${program.totalAmount ? formatPercentagePdf((program.paidAmount / program.totalAmount) * 100) : "0.0%"} collected)`);
      });
      lines.push("");
    }

    if (selectedExportKeys.includes("revenueShare")) {
      lines.push("Revenue Share:");
      programPieData.forEach((entry) => {
        lines.push(`- ${entry.name}: ${formatCurrencyPdf(entry.totalAmount)}`);
      });
      lines.push("");
    }

    if (selectedExportKeys.length === 0) {
      lines.push("No sections selected for export. Please choose one or more options before exporting.");
      lines.push("");
    }

    return lines;
  };

  const handleExportPdf = async () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const content = createPdfContent();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 40;
    let y = 50;

    const addImageFromRef = async (ref, title) => {
      if (!ref?.current) return;
      const canvas = await html2canvas(ref.current, { backgroundColor: '#0f172a', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - marginLeft * 2;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;

      if (y + 32 + imgHeight > pageHeight - 40) {
        doc.addPage();
        y = 50;
      }

      doc.setFontSize(12);
      doc.text(title, marginLeft, y);
      y += 20;
      doc.addImage(imgData, 'PNG', marginLeft, y, imgWidth, imgHeight);
      y += imgHeight + 20;
    };

    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.text("ANALYTICS FOR UAQTEA OFFICE", marginLeft, y);
    y += 26;
    doc.setFontSize(10);
    doc.setLineHeightFactor(1.3);

    for (const line of content.slice(1)) {
      const split = doc.splitTextToSize(line, pageWidth - marginLeft * 2);
      doc.text(split, marginLeft, y);
      y += split.length * 14;
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 50;
      }
    }

    if (selectedExportKeys.includes("revenueBreakdown")) {
      await addImageFromRef(revenueBreakdownRef, "Revenue Breakdown Chart");
    }

    if (selectedExportKeys.includes("liveChart")) {
      await addImageFromRef(liveChartRef, "Live Chart");
    }

    if (selectedExportKeys.includes("revenueShare")) {
      await addImageFromRef(revenueShareRef, "Revenue Share Chart");
    }

    doc.save("analytics-report.pdf");
  };
  const { status, error, chartData, summary } = useSelector((state) => state.analytics || {
    status: "idle",
    error: null,
    chartData: {},
    summary: {}
  });

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchAnalytics());
    }
  }, [dispatch, status]);

  const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString()}`;
  const formatPercentage = (value) => `${Number(value || 0).toFixed(1)}%`;
  const chartKey = `${selectedChart}Chart`;
  const activeChartData = chartData?.[chartKey] || [];
  const programPieData = (chartData?.programChart || []).slice(0, 5);
  const programBreakdownData = (chartData?.programChart || []).slice(0, 8).map((item) => ({
    name: item.name,
    paid: item.paidAmount,
    pending: item.pendingAmount
  }));

  const sectionDataMap = {
    schoolYear: chartData?.schoolYearChart || [],
    semester: chartData?.semesterChart || [],
    program: chartData?.programChart || [],
    section: chartData?.sectionChart || []
  };

  if (status === "loading") return <PageLoader text="Loading analytics data..." />;
  if (status === "failed") return <Alert type="error">{error || "Unable to load analytics."}</Alert>;

  return (
    <MainLayout user={{ name: auth?.name || "Admin" }}>
      <div className="page-content space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            title="Analytics Dashboard"
            subtitle="Modern payment reporting with Redux and Recharts"
            icon="📊"
          />
          <div className="flex flex-col gap-3 items-end">
            <div className="flex items-center gap-2">
              <button
                onClick={() => dispatch(fetchAnalytics())}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-slate-200 transition hover:bg-slate-800"
                aria-label="Refresh analytics data"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.93 4.93a10 10 0 1 1-1.41 1.41" />
                  <polyline points="4.93 10.07 4.93 4.93 10.07 4.93" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="btn-secondary h-10 px-4"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-[1.25rem] bg-white border border-slate-200 p-3 shadow-sm dark:bg-slate-950/95 dark:border-white/10 dark:shadow-xl dark:shadow-slate-950/30">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Total Revenue</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(summary.totalAmount)}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Expected payment total from all active cycles.</p>
            </div>
            <div className="rounded-[1.25rem] bg-white border border-slate-200 p-3 shadow-sm dark:bg-slate-950/95 dark:border-white/10 dark:shadow-xl dark:shadow-slate-950/30">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Collection Rate</p>
              <p className="mt-2 text-lg font-semibold text-cyan-600 dark:text-cyan-400">{formatPercentage(summary.totalAmount ? (summary.paidAmount / summary.totalAmount) * 100 : 0)}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Percentage of expected payments successfully collected.</p>
            </div>
            <div className="rounded-[1.25rem] bg-white border border-slate-200 p-3 shadow-sm dark:bg-slate-950/95 dark:border-white/10 dark:shadow-xl dark:shadow-slate-950/30">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Programs</p>
              <p className="mt-2 text-lg font-semibold text-violet-600 dark:text-violet-400">{summary.programCount}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Programs currently tracked in analytics.</p>
            </div>
            <div className="rounded-[1.25rem] bg-white border border-slate-200 p-3 shadow-sm dark:bg-slate-950/95 dark:border-white/10 dark:shadow-xl dark:shadow-slate-950/30">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Students</p>
              <p className="mt-2 text-lg font-semibold text-emerald-600 dark:text-emerald-400">{summary.studentCount}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Students included from current records.</p>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[1.25rem] bg-white border border-slate-200 p-3 shadow-sm dark:bg-slate-950/95 dark:border-white/10 dark:shadow-xl dark:shadow-slate-950/30">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Dashboard Pulse</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">On track</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700 dark:bg-slate-900/80 dark:text-slate-300">Live</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-2 dark:bg-slate-900/80">
                  <p className="text-slate-600 text-xs dark:text-slate-400">Paid</p>
                  <p className="mt-1 text-base font-semibold text-slate-900 dark:text-cyan-300">{formatCurrency(summary.paidAmount)}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-2 dark:bg-slate-900/80">
                  <p className="text-slate-600 text-xs dark:text-slate-400">Pending</p>
                  <p className="mt-1 text-base font-semibold text-slate-900 dark:text-amber-300">{formatCurrency(summary.pendingAmount)}</p>
                </div>
              </div>
            </div>
            <div ref={revenueBreakdownRef} className="rounded-[1.25rem] bg-white border border-slate-200 p-3 shadow-sm dark:bg-slate-950/95 dark:border-white/10 dark:shadow-xl dark:shadow-slate-950/30">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Revenue Breakdown</p>
              <div className="mt-3 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={programBreakdownData} margin={{ top: 8, right: 0, left: -12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#64748b" strokeOpacity={0.24} className="dark:stroke-slate-600" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} className="dark:fill-slate-400" />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} className="dark:fill-slate-400" tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }} className="dark:contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.18)', color: '#f8fafc' }}" formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="pending" stackId="a" fill="#8b5cf6" radius={[10, 10, 0, 0]} />
                    <Bar dataKey="paid" stackId="a" fill="#38bdf8" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
          <div ref={liveChartRef} className="rounded-[1.25rem] bg-white border border-slate-200 p-3 shadow-sm dark:bg-slate-950/95 dark:border-white/10 dark:shadow-xl dark:shadow-slate-950/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Live Chart</p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Dynamic payment performance</h2>
              </div>
              <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                {CHART_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedChart(option.key)}
                    className={`rounded-full px-3 py-1.5 transition ${selectedChart === option.key ? 'bg-slate-600 text-white dark:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-950/60 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 h-[270px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeChartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
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
                  <CartesianGrid vertical={false} stroke="#64748b" strokeOpacity={0.24} className="dark:stroke-slate-600" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} className="dark:fill-slate-400" />
                  <YAxis domain={[0, 'auto']} padding={{ top: 0, bottom: 0 }} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} className="dark:fill-slate-400" tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }} className="dark:contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.18)', color: '#f8fafc' }}" formatter={(value) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="totalAmount" stroke="none" fill="url(#lineA)" fillOpacity={0.24} />
                  <Line type="monotone" dataKey="paidAmount" stroke="#38bdf8" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="pendingAmount" stroke="#a855f7" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#a855f7', stroke: '#ffffff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[1.25rem] bg-white border border-slate-200 p-3 shadow-sm dark:bg-slate-950/95 dark:border-white/10 dark:shadow-xl dark:shadow-slate-950/30">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Top Programs</p>
              <div className="mt-3 space-y-2">
                {(chartData?.programChart || []).slice(0, 5).map((program) => (
                  <div key={program.name} className="rounded-3xl bg-slate-50 p-3 dark:bg-slate-900/80">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">{program.fullName}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(program.totalAmount)}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{program.totalAmount ? formatPercentage((program.paidAmount / program.totalAmount) * 100) : '0.0%'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div ref={revenueShareRef} className="rounded-[1.25rem] bg-white border border-slate-200 p-3 shadow-sm dark:bg-slate-950/95 dark:border-white/10 dark:shadow-xl dark:shadow-slate-950/30">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Revenue Share</p>
              <div className="mt-3 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={programPieData} dataKey="totalAmount" nameKey="name" innerRadius={52} outerRadius={92} paddingAngle={4} stroke="none">
                      {programPieData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }} className="dark:contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.18)', color: '#f8fafc' }}" formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.25rem] bg-white border border-slate-200 p-3 shadow-sm dark:bg-slate-950/95 dark:border-white/10 dark:shadow-xl dark:shadow-slate-950/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Breakdowns</p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Category insights</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(sectionDataMap).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedCategory(key)}
                  className={`rounded-full px-3 py-1.5 text-[11px] transition ${selectedCategory === key ? 'bg-slate-600 text-white dark:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-950/70 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                >
                  {key === 'schoolYear' ? 'School Year' : key === 'semester' ? 'Semester' : key === 'program' ? 'Program' : 'Section'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[1.5rem] bg-slate-50 p-4 dark:bg-slate-900/80">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">
                Top {selectedCategory === 'schoolYear' ? 'school years' : selectedCategory === 'semester' ? 'semesters' : selectedCategory === 'program' ? 'programs' : 'sections'}
              </p>
              <div className="mt-4 space-y-3">
                {sectionDataMap[selectedCategory].slice(0, 4).map((item) => {
                  const percent = item.totalAmount ? (item.paidAmount / item.totalAmount) * 100 : 0;
                  return (
                    <div key={item.name} className="rounded-3xl border border-slate-200 bg-white p-3 transition hover:border-cyan-400/30 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/80 dark:hover:border-cyan-400/30 dark:hover:bg-slate-900/95">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{item.name}</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(item.totalAmount)}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:bg-slate-800 dark:text-cyan-300">
                          {formatPercentage(percent)}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs text-slate-500 dark:text-slate-400">
                        <div className="rounded-2xl bg-slate-100 p-2 dark:bg-slate-900/90">
                          <p>Paid</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(item.paidAmount)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-100 p-2 dark:bg-slate-900/90">
                          <p>Pending</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(item.totalAmount - item.paidAmount)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-100 p-2 dark:bg-slate-900/90">
                          <p>Students</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{item.students ?? '-'}</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 transition-all" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-slate-50 p-4 dark:bg-slate-900/80">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-600 dark:text-slate-400">Performance snapshot</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                    {selectedCategory === 'schoolYear'
                      ? 'School year health'
                      : selectedCategory === 'semester'
                      ? 'Semester health'
                      : selectedCategory === 'program'
                      ? 'Program health'
                      : 'Section health'}
                  </p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700 dark:bg-slate-950/80 dark:text-slate-300">
                  Top 4
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-950/80">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total value</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{formatCurrency(sectionDataMap[selectedCategory].slice(0, 4).reduce((sum, item) => sum + (item.totalAmount || 0), 0))}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-950/80">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Collected</p>
                  <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(sectionDataMap[selectedCategory].slice(0, 4).reduce((sum, item) => sum + (item.paidAmount || 0), 0))}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-950/80">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Average collection</p>
                  <p className="mt-1 text-xl font-semibold text-cyan-600 dark:text-cyan-300">
                    {formatPercentage(
                      sectionDataMap[selectedCategory].slice(0, 4).reduce((sum, item) => sum + (item.totalAmount ? (item.paidAmount / item.totalAmount) : 0), 0) /
                        Math.max(sectionDataMap[selectedCategory].slice(0, 4).length, 1) *
                        100
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-950 p-6 shadow-xl border border-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Export Analytics PDF</h2>
                <p className="mt-2 text-sm text-slate-400">Select the sections you want included in the PDF, or choose Export All.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white"
                aria-label="Close export options"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.keys(exportOptionLabels).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleExportSelection(key)}
                  className={`rounded-full border px-4 py-3 text-left text-sm transition ${exportSelection[key] ? 'border-cyan-400 bg-slate-900/80 text-white' : 'border-slate-700 bg-slate-950/70 text-slate-400 hover:bg-slate-900'}`}
                >
                  {exportOptionLabels[key]}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => toggleExportSelection("exportAll")}
                className={`rounded-full border px-4 py-3 text-sm transition ${exportSelection.exportAll ? 'border-emerald-400 bg-slate-900/80 text-white' : 'border-slate-700 bg-slate-950/70 text-slate-400 hover:bg-slate-900'}`}
              >
                Export All
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="btn-secondary w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExportPdf();
                  setShowExportModal(false);
                }}
                className="btn-primary w-full sm:w-auto"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
