import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";
import { Alert, Spinner } from "../../components/ui";
import { Eye } from "lucide-react";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, theme } = useContext(AuthContext);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchSettings = async () => {
      try {
        const res = await api.get("/api/settings");
        if (mounted) {
          const bg = res.data?.backgroundImage || res.data?.backgroundImageBase64;
          if (bg) setBackgroundImage(bg);
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        if (mounted) setSettingsLoading(false);
      }
    };
    fetchSettings();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const trimmedIdentifier = String(identifier || "").trim();
      const trimmedSecret = String(secret || "").trim();

      const res = await api.post("/login", {
        identifier: trimmedIdentifier,
        secret: trimmedSecret,
      });

      const role = res.data.role || "staff";
      login(res.data.token, role);

      if (role === "student") {
        if (res.data.name) {
          localStorage.setItem("studentName", res.data.name);
          localStorage.setItem("name", res.data.name);
        } else {
          localStorage.setItem("studentName", trimmedSecret);
          localStorage.setItem("name", trimmedSecret);
        }
      } else {
        if (res.data.name) {
          localStorage.setItem("username", res.data.name);
          localStorage.setItem("name", res.data.name);
        } else {
          localStorage.setItem("username", trimmedIdentifier);
          localStorage.setItem("name", trimmedIdentifier);
        }
      }

      if (role === "admin") navigate("/admin");
      else if (role === "staff") navigate("/staff");
      else if (role === "student") navigate("/student");
      else navigate("/home");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: backgroundImage
          ? (backgroundImage.startsWith('data:') ? `url('${backgroundImage}')` : `url('${encodeURI(backgroundImage)}')`)
          : (theme === "dark"
            ? "linear-gradient(135deg, #0b1b33 0%, #101f43 50%, #1a2a4a 100%)"
            : "linear-gradient(135deg, #d9eafc 0%, #b6d9f9 50%, #3E8EDE 100%)"),
        backgroundSize: backgroundImage ? 'cover' : undefined,
        backgroundPosition: backgroundImage ? 'center' : undefined,
        backgroundAttachment: backgroundImage ? 'fixed' : undefined,
      }}
    >
      <div className="w-full max-w-sm animate-slide-up">
        <div className="bg-white/95 dark:bg-slate-950/95 border border-slate-200/70 dark:border-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/15 rounded-xl text-2xl mb-3 shadow-md">🔐</div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Log In</h2>
          </div>

          {error && (
            <Alert type="error" className="mb-5" onClose={() => setError("")}>{error}</Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="input-group">
              <label className="input-label text-slate-900">Name or Username</label>
              <input
                className="input !bg-white/95 !border-slate-300 !text-slate-900 !placeholder:text-slate-500 shadow-sm"
                type="text"
                placeholder="Enter student name or staff/admin username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="input-group">
              <label className="input-label text-slate-900">USN or Password</label>
              <div className="relative">
                <input
                  className="input pr-10 !bg-white/95 !border-slate-300 !text-slate-900 !placeholder:text-slate-500 shadow-sm"
                  type={showSecret ? "text" : "password"}
                  placeholder="Enter student USN or staff/admin password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label={showSecret ? "Hide password" : "Show password"}
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-white/80 text-slate-900 hover:bg-white shadow-lg transition-all duration-200 rounded-xl"
            >
              {loading ? (
                <>
                  <Spinner size="sm" /> Logging in...
                </>
              ) : (
                "Log In"
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-5">
          <button
            onClick={() => navigate("/landing")}
            className="text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
