import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Lock, 
    Mail, 
    Eye, 
    EyeOff, 
    ShieldCheck, 
    Cpu, 
    Terminal, 
    ChevronRight, 
    AlertTriangle,
    Fingerprint,
    Zap,
    Activity
} from "lucide-react";
import CpuBackground from "./CpuBackground";
import { SpotlightSweep } from "../design";

import { AUTH_BASE } from "../config/constants";
import { setAccessToken } from "../utils/tokenStore";

const API_BASE = AUTH_BASE.replace(/\/+$/, "");

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(() => localStorage.getItem("rememberMe") === "1");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  // Shake animation for errors
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include", // CRITICAL: Allows browser to store the refresh cookie
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.token) {
        setErr(data.error || "ACCESS DENIED: Authentication failed.");
        triggerShake();
        setLoading(false);
        return;
      }

      setSuccess(true);
      const payload = parseJwt(data.token) || {};

      try {
        localStorage.setItem("rememberMe", remember ? "1" : "0");
        // Access token is kept in memory (tokenStore), NOT localStorage — prevents
        // XSS exfiltration. Profile fields below are safe to persist.
        setAccessToken(data.token);

        const finalEmail = String(data.email || payload.email || email || "").trim();
        const finalRole = String(data.role || payload.role || "").trim();
        const firstName = String(data.firstName || payload.firstName || "").trim();
        const lastName = String(data.lastName || payload.lastName || "").trim();

        if (finalEmail) localStorage.setItem("userEmail", finalEmail);
        if (finalRole) localStorage.setItem("role", finalRole);
        if (firstName) localStorage.setItem("firstName", firstName);
        if (lastName) localStorage.setItem("lastName", lastName);

        window.dispatchEvent(new Event("auth:changed"));
      } catch (e) { console.error("Persistence Error:", e); }

      // Intelligent Redirect
      let targetPath = next;
      if (targetPath === "/" || !targetPath) {
        const roleLower = (data.role || payload.role || "").toLowerCase();
        targetPath = roleLower.includes("admin") || roleLower.includes("team") ? "/dashboard" : "/dashboard/overview";
      }

      setTimeout(() => nav(targetPath, { replace: true }), 1200);
    } catch (e) {
      setErr("SYSTEM ERROR: Failed to communicate with auth server.");
      triggerShake();
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-svh flex items-center justify-center p-6 bg-[#030303] overflow-hidden selection:bg-orange-500/30 selection:text-orange-200 font-inter">
      {/* Signature ambient: cursor-following spotlight (desktop only; disabled on touch / reduced-motion / low-power) */}
      <SpotlightSweep color="rgba(232, 80, 2, 0.18)" />

      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
          <CpuBackground />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
            key="login-card"
            initial={{ y: 20, opacity: 0 }}
            animate={{ 
                y: 0, 
                opacity: 1,
                x: shake ? [-5, 5, -5, 5, 0] : 0
            }}
            transition={{ 
                y: { duration: 0.6, ease: [0.23, 1, 0.32, 1] },
                opacity: { duration: 0.4 },
                x: { duration: 0.4 }
            }}
            className="relative z-10 w-full max-w-[440px]"
        >
            {/* Glassmorphic Container */}
            <div className="relative rounded-[32px] overflow-hidden backdrop-blur-[32px] bg-white/[0.03] border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
                
                {/* Header Section */}
                <div className="p-10 pb-6 text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="inline-flex relative mb-8"
                    >
                        <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
                        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-[0_0_30px_rgba(234,88,12,0.4)]">
                            <Lock size={36} className="text-white fill-white/10" />
                        </div>
                    </motion.div>
                    
                    <h1 className="text-4xl font-[900] text-white tracking-tight mb-2 uppercase italic leading-none">
                        SHINEL <span className="text-orange-500">Log In.</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                        Sign in to your workspace
                    </p>
                </div>

                <div className="px-10 pb-10 space-y-6">
                    {/* Error Feedback */}
                    <AnimatePresence>
                        {err && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-4"
                            >
                                <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                                    <AlertTriangle size={16} className="text-red-500" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-wider text-red-200">{err}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={onSubmit} className="space-y-5">
                        {/* ID Input */}
                        <div className="space-y-2 group">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/20 pl-1 group-focus-within:text-orange-500 transition-colors">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail size={18} className="text-white/20 group-focus-within:text-orange-500 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    autoFocus
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/[0.05] rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white placeholder-white/10 focus:border-orange-500/50 focus:bg-orange-500/5 transition-all outline-none"
                                    placeholder="Enter your email"
                                />
                            </div>
                        </div>

                        {/* Pass Input */}
                        <div className="space-y-2 group">
                            <div className="flex justify-between items-center pl-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/20 group-focus-within:text-orange-500 transition-colors">
                                    Password
                                </label>
                                <Link to="#" className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-orange-500 transition-colors">Forgot password?</Link>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <ShieldCheck size={18} className="text-white/20 group-focus-within:text-orange-500 transition-colors" />
                                </div>
                                <input
                                    type={show ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/[0.05] rounded-2xl py-4 pl-12 pr-12 text-sm font-bold text-white placeholder-white/10 focus:border-orange-500/50 focus:bg-orange-500/5 transition-all outline-none"
                                    placeholder="••••••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShow(!show)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/20 hover:text-white transition-colors"
                                >
                                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember & Meta */}
                        <div className="flex items-center justify-between px-1">
                            <label className="flex items-center gap-3 cursor-pointer group/check">
                                <div className={`relative w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${remember ? 'bg-orange-500 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'border-white/10 bg-white/5'}`}>
                                    {remember && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2.5 h-2.5 bg-black rounded-[2px]" />}
                                </div>
                                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="hidden" />
                                <span className="text-[10px] font-black text-white/30 group-hover/check:text-white/60 transition-colors uppercase tracking-widest">Keep me signed in</span>
                            </label>
                            
                            <div className="flex items-center gap-2 text-[10px] font-black text-white/10 italic">
                                <span>SECURE</span>
                                <div className="w-1 h-1 bg-white/10 rounded-full" />
                                <span>ENCRYPTED</span>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            type="submit"
                            disabled={loading || success}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full relative h-[60px] rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-wait overflow-hidden group/btn"
                        >
                            <div className={`absolute inset-0 transition-opacity duration-500 ${success ? 'bg-green-500' : 'bg-gradient-to-r from-orange-500 to-orange-600'}`} />
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                            
                            <div className="relative z-10 flex items-center gap-3">
                                {loading ? (
                                    <>
                                        <RefreshCircle />
                                        <span>Sign In...</span>
                                    </>
                                ) : success ? (
                                    <>
                                        <Fingerprint size={20} className="animate-pulse" />
                                        <span>Welcome back</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ChevronRight size={18} />
                                    </>
                                )}
                            </div>
                        </motion.button>
                    </form>

                    {/* Footer Connections */}
                    <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                            <div className="flex gap-4">
                                <Link to="/privacy" className="text-white/20 hover:text-orange-500 transition-colors">Privacy Policy</Link>
                                <Link to="/terms" className="text-white/20 hover:text-orange-500 transition-colors">Terms of Service</Link>
                            </div>
                            <span className="text-white/10">v.4.0.2</span>
                        </div>
                        <p className="text-[8px] font-bold text-center text-white/10 uppercase tracking-[0.3em]">
                            Global security infrastructure by Shinel Studios
                        </p>
                    </div>
                </div>

                {/* Cyberpunk Scanline */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-20"
                    style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 1px, #fff 2px)" }}
                />
            </div>
            
            {/* Ambient HUD elements fixed to card corners */}
            <div className="absolute -top-10 -right-10 w-24 h-24 border border-white/5 rounded-full flex items-center justify-center rotate-45 pointer-events-none">
                <div className="w-12 h-[1px] bg-white/10" />
            </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function RefreshCircle() {
    return (
        <div className="relative w-5 h-5">
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-full h-full border-2 border-white/20 border-t-white rounded-full"
            />
        </div>
    );
}

