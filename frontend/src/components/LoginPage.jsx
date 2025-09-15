// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      // Hit your Worker (env var or same origin proxy)
      const res = await fetch("/auth/login", {
        method: "POST",
        credentials: "include", // sets refresh cookie
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token) {
        setErr(data?.error || "Login failed. Please check your details.");
        setLoading(false);
        return;
      }

      // Save token + lightweight profile for quick UI
      localStorage.setItem("token", data.token);

      // Decode the token (just payload)
      try {
        const payload = JSON.parse(
          decodeURIComponent(
            escape(atob(data.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
          )
        );
        if (payload?.email)  localStorage.setItem("userEmail", payload.email);
        if (payload?.role)   localStorage.setItem("userRole", payload.role);
        if (payload?.firstName) localStorage.setItem("userFirstName", payload.firstName);
        if (payload?.lastName)  localStorage.setItem("userLastName", payload.lastName);
      } catch {}

      // announce to the app and go Home
      window.dispatchEvent(new Event("auth:changed"));
      const next = new URLSearchParams(location.search).get("next") || "/";
      location.replace(next); // → Home (or next)
    } catch (e) {
      setErr("Network error. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4" style={{ background: "var(--surface)" }}>
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl p-6 md:p-7"
        style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
      >
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1" style={{ color: "var(--text)" }}>
          Welcome back
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Sign in to access your role-specific AI tools.
        </p>

        {err && (
          <div className="mb-4 text-sm rounded-lg px-3 py-2" style={{ background: "rgba(232,80,2,.10)", color: "var(--orange)", border: "1px solid var(--border)" }}>
            {err}
          </div>
        )}

        <label className="block text-sm mb-1" style={{ color: "var(--text)" }}>
          Email
        </label>
        <div className="relative mb-4">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full h-11 rounded-lg pl-9 pr-3 outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>

        <label className="block text-sm mb-1" style={{ color: "var(--text)" }}>
          Password
        </label>
        <div className="relative mb-2">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70" />
          <input
            type={showPwd ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full h-11 rounded-lg pl-9 pr-10 outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
            aria-label={showPwd ? "Hide password" : "Show password"}
            style={{ color: "var(--text-muted)" }}
          >
            {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="flex items-center justify-between text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" onChange={(e) => localStorage.setItem("rememberMe", e.target.checked ? "1" : "0")} />
            Remember me
          </label>
          <span className="opacity-70">Forgot password?</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl h-11 font-semibold text-white"
          style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        {/* No register link (admins create users) */}
        <div className="mt-6 text-xs text-center" style={{ color: "var(--text-muted)" }}>
          Need an account? Contact your Shinel Studios admin.
        </div>
      </motion.form>
    </div>
  );
}
