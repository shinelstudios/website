import React from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, ShieldCheck } from "lucide-react";

const API_BASE = import.meta.env.VITE_AUTH_BASE?.replace(/\/+$/, "") || "";

// Safe base64url decode + JWT parse (no crypto)
function base64UrlDecode(str) {
  try {
    if (!str) return "";
    const b64 =
      str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return "";
  }
}

function parseJwt(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const json = base64UrlDecode(parts[1]);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

function safeNextPath(next) {
  // Prevent open-redirects; allow only internal paths
  if (!next) return "/";
  return next.startsWith("/") ? next : "/";
}

export default function LoginPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get("next"));

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [remember, setRemember] = React.useState(
    () => localStorage.getItem("rememberMe") === "1"
  );
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.token) {
        setErr("Invalid email or password");
        return;
      }

      const payload = parseJwt(data.token) || {};

      // Normalize + persist auth keys (single source of truth)
      try {
        localStorage.setItem("rememberMe", remember ? "1" : "0");
        localStorage.setItem("token", data.token);
        if (data.refresh) localStorage.setItem("refresh", data.refresh);

        const finalEmail = String(data.email || payload.email || email || "").trim();
        const finalRole = String(data.role || payload.role || "").trim();
        const firstName = String(data.firstName || payload.firstName || payload.first_name || "").trim();
        const lastName = String(data.lastName || payload.lastName || payload.last_name || "").trim();

        if (finalEmail) localStorage.setItem("userEmail", finalEmail);
        if (finalRole) localStorage.setItem("role", finalRole);        // ✅ normalized
        if (firstName) localStorage.setItem("firstName", firstName);   // ✅ normalized
        if (lastName) localStorage.setItem("lastName", lastName);      // ✅ normalized

        // Optional: clean legacy keys (keeps storage tidy)
        ["userRole", "userFirst", "userLast", "userFirstName", "userLastName"].forEach((k) =>
          localStorage.removeItem(k)
        );
      } catch {}

      // Let header & guards react
      try {
        window.dispatchEvent(new Event("auth:changed"));
      } catch {}

      // Navigate
      setTimeout(() => nav(next, { replace: true }), 80);
    } catch {
      setErr("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className="min-h-[70vh] grid place-items-center"
      style={{ background: "var(--surface)" }}
    >
      <div className="w-full max-w-md mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 md:p-8 border"
          style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="h-9 w-9 rounded-xl grid place-items-center"
              style={{
                background: "rgba(232,80,2,.1)",
                border: "1px solid var(--border)",
              }}
            >
              <Lock size={18} style={{ color: "var(--orange)" }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              Sign in
            </h1>
          </div>

          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Access Shinel Studios tools with your account.
          </p>

          {err && (
            <div
              className="mb-4 rounded-lg px-3 py-2 text-sm"
              style={{
                color: "#b91c1c",
                border: "1px solid #7f1d1d",
                background: "rgba(185,28,28,.08)",
              }}
              role="alert"
            >
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block text-sm" style={{ color: "var(--text)" }}>
              Email
              <div
                className="mt-1 flex items-center gap-2 rounded-xl px-3 h-[46px] border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <Mail size={16} style={{ color: "var(--text-muted)" }} />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent outline-none"
                  placeholder="you@example.com"
                  style={{ color: "var(--text)" }}
                />
              </div>
            </label>

            <label className="block text-sm" style={{ color: "var(--text)" }}>
              Password
              <div
                className="mt-1 flex items-center gap-2 rounded-xl px-3 h-[46px] border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <Lock size={16} style={{ color: "var(--text-muted)" }} />
                <input
                  type={show ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent outline-none"
                  placeholder="••••••••"
                  style={{ color: "var(--text)" }}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="p-1.5 rounded-lg"
                  aria-label={show ? "Hide password" : "Show password"}
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--surface-alt)",
                  }}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between pt-1">
              <label className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                Admins create accounts
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-xl py-3 font-semibold text-white"
              style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </motion.button>
          </form>

          <div className="mt-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Need access?{" "}
            <a href="mailto:hello@shinelstudiosofficial.com" style={{ color: "var(--orange)" }}>
              Contact us
            </a>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <ShieldCheck size={14} /> Passwords are encrypted at rest
          </div>

          <div className="mt-6 text-center text-xs">
            <Link to="/privacy" style={{ color: "var(--text-muted)" }}>
              Privacy
            </Link>
            <span className="mx-2" style={{ color: "var(--text-muted)" }}>
              •
            </span>
            <Link to="/terms" style={{ color: "var(--text-muted)" }}>
              Terms
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
