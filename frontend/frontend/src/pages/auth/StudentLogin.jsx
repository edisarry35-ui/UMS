import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";
import { Alert, Spinner } from "../../components/ui";

export default function StudentLogin() {
  const [usn, setUsn] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, theme } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/login", { role: "student", usn, name });
      login(res.data.token, res.data.role, {
        schoolYear: res.data.schoolYear,
        semester: res.data.semester,
      });
      if (name) {
        localStorage.setItem("studentName", name);
        localStorage.setItem("name", name);
      }
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundImage: theme === "dark" ? "linear-gradient(135deg, #0b1b33 0%, #101f43 50%, #1a2a4a 100%)" : "linear-gradient(135deg, #d9eafc 0%, #b6d9f9 50%, #3E8EDE 100%)" }}>
      <div className="w-full max-w-sm animate-slide-up">
        <div className="bg-white/95 dark:bg-slate-950/95 border border-slate-200/70 dark:border-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/15 rounded-xl text-2xl mb-3 shadow-md">👨‍🎓</div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Student Login</h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">Enter your details to access your account</p>
          </div>

          {error && <Alert type="error" className="mb-5" onClose={() => setError("")}>{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="input-group">
              <label className="input-label text-slate-900">University Seat Number (USN)</label>
              <input
                className="input !bg-white/95 !border-slate-300 !text-slate-900 !placeholder:text-slate-500 shadow-sm"
                type="text"
                placeholder="e.g. USN001"
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="input-group">
              <label className="input-label text-slate-900">Full Name</label>
              <input
                className="input !bg-white/95 !border-slate-300 !text-slate-900 !placeholder:text-slate-500 shadow-sm"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-white/80 text-slate-900 hover:bg-white shadow-lg transition-all duration-200 rounded-xl"
            >
              {loading ? <><Spinner size="sm" /> Signing in...</> : "Sign In"}
            </button>
          </form>
        </div>

        <div className="text-center mt-5">
          <button onClick={() => navigate("/login")} className="text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors">
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
