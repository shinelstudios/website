import React from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Cpu, Terminal, ChevronRight, AlertTriangle } from "lucide-react";
import CpuBackground from "./CpuBackground";

const API_BASE = import.meta.env.VITE_AUTH_BASE?.replace(/\/+$/, "") || "";

// Safe base64url decode + JWT parse
function base64UrlDecode(str) {
  try {
    if (!str) return "";
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
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
  const [remember, setRemember] = React.useState(() => localStorage.getItem("rememberMe") === "1");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    // Artificial delay for "Processing" effect
    await new Promise(r => setTimeout(r, 800));

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.token) {
        setErr("ACCESS DENIED: Invalid credentials.");
        setLoading(false);
        return;
      }

      setSuccess(true); // Trigger success animation

      const payload = parseJwt(data.token) || {};

      try {
        localStorage.setItem("rememberMe", remember ? "1" : "0");
        localStorage.setItem("token", data.token);
        if (data.refresh) localStorage.setItem("refresh", data.refresh);

        const finalEmail = String(data.email || payload.email || email || "").trim();
        const finalRole = String(data.role || payload.role || "").trim();
        const firstName = String(data.firstName || payload.firstName || payload.first_name || "").trim();
        const lastName = String(data.lastName || payload.lastName || payload.last_name || "").trim();

        if (finalEmail) localStorage.setItem("userEmail", finalEmail);
        if (finalRole) localStorage.setItem("role", finalRole);
        if (firstName) localStorage.setItem("firstName", firstName);
        if (lastName) localStorage.setItem("lastName", lastName);

        ["userRole", "userFirst", "userLast", "userFirstName", "userLastName"].forEach((k) =>
          localStorage.removeItem(k)
        );
      } catch { }

      try {
        window.dispatchEvent(new Event("auth:changed"));
      } catch { }

      // Intelligent Redirect
      let targetPath = next;
      if (targetPath === "/" || !targetPath) {
        if (finalRole.includes("admin")) {
          targetPath = "/dashboard";
        } else if (finalRole.includes("client")) {
          targetPath = "/dashboard/overview";
        } else {
          targetPath = "/dashboard";
        }
      }

      setTimeout(() => nav(targetPath, { replace: true }), 1000);
    } catch {
      setErr("SYSTEM ERROR: Connection failed.");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-black overflow-hidden selection:bg-orange-500/30 selection:text-orange-200">
      <CpuBackground />

      {/* Main Terminal Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "backOut" }}
        className="relative z-10 w-full max-w-[420px]"
      >
        {/* Holographic Border Container */}
        <div className="relative rounded-2xl overflow-hidden backdrop-blur-xl bg-black/60 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">

          {/* Top Bar "HUD" */}
          <div className="h-10 bg-white/5 border-b border-white/5 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              </div>
              <div className="h-4 w-[1px] bg-white/10 mx-1" />
              <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase">SECURE_SHELL_V2.0</span>
            </div>
            <Cpu size={14} className="text-white/20 animate-pulse" />
          </div>

          <div className="p-8">
            {/* Header */}
            <div className="mb-8 text-center relative">
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-orange-600/5 border border-orange-500/30 mb-4 relative group"
              >
                <div className="absolute inset-0 bg-orange-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Lock size={32} className="text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
              </motion.div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                SYSTEM <span className="text-orange-500">ACCESS</span>
              </h1>
              <p className="text-xs font-mono text-white/40 mt-2 tracking-widest uppercase">
                Identify authentication required
              </p>
            </div>

            {/* Error Display */}
            <AnimatePresence>
              {err && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-red-200 font-mono">{err}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-1.5 group">
                <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest pl-1 group-focus-within:text-orange-500 transition-colors">
                  usr_identification
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Terminal size={16} className="text-white/30 group-focus-within:text-orange-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-mono text-white placeholder-white/20 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 focus:bg-orange-500/5 transition-all outline-none"
                    placeholder="ENTER_EMAIL_ID"
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest pl-1 group-focus-within:text-orange-500 transition-colors">
                  access_key
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <ShieldCheck size={16} className="text-white/30 group-focus-within:text-orange-500 transition-colors" />
                  </div>
                  <input
                    type={show ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-sm font-mono text-white placeholder-white/20 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 focus:bg-orange-500/5 transition-all outline-none"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/30 hover:text-white transition-colors"
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <label className="flex items-center gap-2 cursor-pointer group/check">
                    <div className={`w-3 h-3 rounded border flex items-center justify-center transition-all ${remember ? 'bg-orange-500 border-orange-500' : 'border-white/20 bg-transparent'}`}>
                      {remember && <div className="w-1.5 h-1.5 bg-black rounded-[1px]" />}
                    </div>
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="hidden" />
                    <span className="text-[10px] font-mono text-white/40 group-hover/check:text-white/60 transition-colors uppercase">Stay_Connected</span>
                  </label>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading || success}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full relative overflow-hidden h-12 rounded-xl font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-wait mt-4"
                style={{
                  background: success ? "#22c55e" : "linear-gradient(135deg, #f97316, #ea580c)",
                  color: "white",
                  boxShadow: success ? "0 0 20px rgba(34,197,94,0.4)" : "0 0 20px rgba(234,88,12,0.3)"
                }}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="font-mono">INITIALIZING...</span>
                  </div>
                ) : success ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <ShieldCheck size={18} />
                    <span className="font-mono">ACCESS_GRANTED</span>
                  </motion.div>
                ) : (
                  <>
                    <span>Initiate Session</span>
                    <ChevronRight size={16} className="bg-white/20 rounded-full p-0.5" />
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-8 flex items-center justify-between text-[10px] font-mono text-white/30 border-t border-white/5 pt-4">
              <div className="flex gap-4">
                <Link to="/privacy" className="hover:text-orange-500 transition-colors">PRIVACY_PROTOCOL</Link>
                <Link to="/terms" className="hover:text-orange-500 transition-colors">T&C_V1.0</Link>
              </div>
              <a href="mailto:access@shinelstudios.com" className="hover:text-white transition-colors">NEED_ASSISTANCE?</a>
            </div>
          </div>

          {/* Scanline Effect Overlay for Card */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-20"
            style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 3px)" }}
          />
        </div>

        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500/30 -translate-x-2 -translate-y-2 rounded-tl-lg pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-500/30 translate-x-2 translate-y-2 rounded-br-lg pointer-events-none" />
      </motion.div>
    </div>
  );
}

