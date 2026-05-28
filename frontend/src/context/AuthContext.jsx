import React, { createContext, useEffect, useState } from "react";

const normalizeRole = (role) => {
  if (!role) return null;
  const normalized = String(role).trim().toLowerCase();
  if (["assessment coordinator", "assessment-coordinator", "aa"].includes(normalized)) return "assessment-coordinator";
  if (normalized === "admin") return "admin";
  if (normalized === "staff") return "staff";
  if (normalized === "student") return "student";
  return normalized;
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    token: localStorage.getItem("token") || null,
    role: normalizeRole(localStorage.getItem("role") || null),
  });
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  const [schoolYear, setSchoolYear] = useState(
    localStorage.getItem("schoolYear") || "SY 2025-2026"
  );

  const [semester, setSemester] = useState(
    localStorage.getItem("semester") || null
  );

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const formatSchoolYear = (value) => {
    const text = String(value || "").trim();
    const match = text.match(/(\d{4}-\d{4})/);
    return match ? `SY ${match[1]}` : text;
  };

  const login = (token, role, context = {}) => {
    const normalizedRole = normalizeRole(role);
    localStorage.setItem("token", token);
    localStorage.setItem("role", normalizedRole);
    setAuth({ token, role: normalizedRole });

    if (context.schoolYear) {
      const formattedYear = formatSchoolYear(context.schoolYear);
      localStorage.setItem("schoolYear", formattedYear);
      setSchoolYear(formattedYear);
    }

    if (context.semester) {
      localStorage.setItem("semester", context.semester);
      setSemester(context.semester);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setAuth({ token: null, role: null });
  };

  const updateSchoolYear = (year) => {
    localStorage.setItem("schoolYear", year);
    setSchoolYear(year);
  };

  const updateSemester = (sem) => {
    localStorage.setItem("semester", sem);
    setSemester(sem);
  };

  return (
    <AuthContext.Provider
      value={{
        auth,
        login,
        logout,
        schoolYear,
        semester,
        updateSchoolYear,
        updateSemester,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
