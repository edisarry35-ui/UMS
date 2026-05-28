import React from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { StatCard, SectionHeader } from "../../components/ui";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Staff";

  const handleMenuItemClick = (item) => {
    if (item === "home") navigate("/home");
  };

  return (
    <MainLayout user={{ name: "Staff" }} onMenuItemClick={handleMenuItemClick}>
      <div className="page-content">
        <div className="mb-8 rounded-3xl border border-white/15 bg-white/10 p-6 shadow-card backdrop-blur-xl md:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-100">
                Faculty Workspace
              </span>
              <h1 className="mt-3 text-2xl font-display font-bold tracking-tight text-white">Staff Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-primary-100">
                Welcome back, {username}. Review schedules, student activity, and daily teaching tasks in one place.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-primary-950/30 px-4 py-3 sm:min-w-[240px]">
              <p className="text-[11px] uppercase tracking-wide text-primary-200">Today’s Focus</p>
              <p className="mt-1 text-sm font-semibold text-white">Payments, announcements, and class follow-ups</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon="MC" label="My Classes" value="6" color="blue" trend="Scheduled this week" />
          <StatCard icon="TS" label="Total Students" value="142" color="green" trend="Across assigned sections" />
          <StatCard icon="AS" label="Assignments" value="8" color="amber" trend="Needs review" />
          <StatCard icon="PG" label="Pending Grades" value="23" color="red" trend="Awaiting submission" />
        </div>

        <div className="card mb-6">
          <SectionHeader title="Quick Actions" subtitle="Frequently used staff tools for the day." />
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => navigate("/school-year")}>Payment Management</button>
            <button className="btn-secondary" onClick={() => navigate("/notifications")}>Announcements</button>
              <button className="btn-secondary">View Schedule</button>
          </div>
        </div>

        <div className="card">
          <SectionHeader title="Class Schedule" subtitle="Today’s teaching blocks and assigned rooms." />
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Class</th><th>Time</th><th>Room</th><th>Students</th></tr></thead>
              <tbody>
                {[
                  ["Introduction to Programming", "9:00 AM – 11:00 AM", "Room 101", "35"],
                  ["Data Structures", "1:00 PM – 3:00 PM", "Room 205", "28"],
                  ["Web Development", "3:30 PM – 5:30 PM", "Lab 1", "22"],
                ].map(([cls, time, room, count], i) => (
                  <tr key={i}>
                    <td className="font-medium">{cls}</td>
                    <td className="text-slate-500">{time}</td>
                    <td><span className="badge badge-blue">{room}</span></td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
