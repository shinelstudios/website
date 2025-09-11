// src/components/LoginPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu, X, ChevronDown, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft,
} from "lucide-react";

import logoLight from "../assets/logo_light.png";

/* ───────────────────────────── Header (minimal, no login button) ───────────────────────────── */
const Header = () => {
  const [workOpen, setWorkOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const workRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (workOpen && workRef.current && !workRef.current.contains(e.target)) {
        setWorkOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setWorkOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [workOpen]);

  return (
    <header
      className="fixed top-0 inset-x-0 z-40 backdrop-blur-lg"
      style={{ background: "rgba(0,0,0,.85)", borderBottom: "1px solid rgba(255,255,255,.12)" }}
    >
      <div
        aria-hidden
        className="absolute left-0 top-0 h-[1px] w-full"
        style={{ background: "linear-gradient(90deg,#E85002,#ff9357)" }}
      />
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-12 flex items-center overflow-visible">
            <img
              src={logoLight}
              alt="Shinel Studios"
              className="h-full w-auto object-contain select-none"
              style={{
                transform: "scale(2.2)",
                transformOrigin: "left center",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,.35))",
              }}
              decoding="async"
            />
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          <a href="/#home" className="nav-link">Home</a>
          <a href="/#services" className="nav-link">Services</a>
          <a href="/#testimonials" className="nav-link">Testimonials</a>
          <a href="/#contact" className="nav-link">Contact</a>

          <div className="relative" ref={workRef}>
            <button
              onClick={() => setWorkOpen((v) => !v)}
              className="inline-flex items-center gap-1 nav-link"
              aria-expanded={workOpen}
              aria-controls="work-menu"
              type="button"
            >
              Our Work
              <ChevronDown size={16} className={`transition-transform ${workOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {workOpen && (
                <motion.div
                  id="work-menu"
                  initial={{ opacity: 0, scale: 0.98, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.18 } }}
                  exit={{ opacity: 0, scale: 0.98, y: 6, transition: { duration: 0.15 } }}
                  className="absolute left-0 mt-3 w-64 rounded-xl shadow-xl overflow-hidden"
                  style={{ background: "#0F0F0F", border: "1px solid rgba(255,255,255,.12)" }}
                >
                  {[
                    { name: "Video Editing", href: "/video-editing" },
                    { name: "GFX", href: "/gfx" },
                    { name: "Thumbnails", href: "/thumbnails" },
                    { name: "Shorts", href: "/shorts" },
                  ].map((it) => (
                    <Link
                      key={it.name}
                      to={it.href}
                      className="block w-full px-4 py-3 text-left work-item"
                      onClick={() => setWorkOpen(false)}
                    >
                      {it.name}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 text-white"
            aria-label="Menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>
    </header>
  );
};

/* ───────────────────────────── Motion Variants (CPU-friendly) ───────────────────────────── */
const overlayFade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
const cardPop = {
  hidden: { opacity: 0, y: 16, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: "easeOut" } },
  exit: { opacity: 0, y: 12, scale: 0.985, transition: { duration: 0.18, ease: "easeIn" } },
};

/* ───────────────────────────── Login Page ───────────────────────────── */
const LoginPage = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const firstFieldRef = useRef(null);
  const pwdRef = useRef(null);
  const cardRef = useRef(null);
  const peekTimer = useRef(null);

  useEffect(() => { firstFieldRef.current?.focus(); }, []);

  // Close on ESC
  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, []);

  // CapsLock indicator
  useEffect(() => {
    const onKey = (e) => {
      if (e.getModifierState && e.getModifierState("CapsLock")) setCapsOn(true);
      else setCapsOn(false);
    };
    const el = pwdRef.current;
    el?.addEventListener("keyup", onKey);
    el?.addEventListener("keydown", onKey);
    return () => {
      el?.removeEventListener("keyup", onKey);
      el?.removeEventListener("keydown", onKey);
    };
  }, []);

  // Close helper (back or X or overlay click)
  const closeModal = () => {
    setOpen(false);
    setTimeout(() => {
      if (window.history?.state && window.history.state.idx > 0) navigate(-1);
      else navigate("/");
    }, 180);
  };

  const validate = () => {
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email.";
    if (!password || password.length < 8) next.password = "Password must be at least 8 characters.";
    return next;
  };

  // Simple network timeout wrapper
  const fetchWithTimeout = (url, opts, ms = 12000) =>
    new Promise((resolve, reject) => {
      const id = setTimeout(() => reject(new Error("Network timeout")), ms);
      fetch(url, opts).then(
        (res) => { clearTimeout(id); resolve(res); },
        (err) => { clearTimeout(id); reject(err); }
      );
    });

  // ✅ Backend login
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const res = await fetchWithTimeout(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Login failed");

      // Save auth info
      localStorage.setItem("token", data.token);
      localStorage.setItem("userEmail", email);
      if (remember) localStorage.setItem("rememberMe", "1");
      else localStorage.removeItem("rememberMe");

      // Notify header and others
      window.dispatchEvent(new Event("auth:changed"));

      // Redirect
      navigate("/studio");
    } catch (err) {
      const msg = (err?.message || "").toLowerCase().includes("timeout")
        ? "Request timed out. Please check your connection and try again."
        : (err?.message || "Login failed");
      setErrors({ general: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // Press-and-hold password peek
  const startPeek = () => {
    setShowPwd(true);
    clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setShowPwd(false), 1500);
  };
  const stopPeek = () => {
    clearTimeout(peekTimer.current);
    setShowPwd(false);
  };

  return (
    <>
      <Header />

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            variants={overlayFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0.60), rgba(0,0,0,0.60))",
              backdropFilter: "blur(3px)",
            }}
            onMouseDown={(e) => {
              // click outside to close
              if (cardRef.current && !cardRef.current.contains(e.target)) closeModal();
            }}
          >
            <motion.div
              key="modal"
              id="login-card"
              ref={cardRef}
              className="relative w-full max-w-md p-6 sm:p-7 rounded-2xl"
              variants={cardPop}
              initial="hidden"
              animate="visible"
              exit="exit"
              aria-modal="true"
              role="dialog"
              aria-labelledby="login-title"
              aria-describedby="login-desc"
              style={{
                background: "linear-gradient(180deg, #101010 0%, #0F0F0F 100%)",
                border: "1.5px solid rgba(232,80,2,0.8)",
                boxShadow: "0 10px 28px rgba(0,0,0,.45)",
                color: "#fff",
              }}
            >
              {/* Top row: back + close */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85002]"
                  aria-label="Go back"
                  title="Go back"
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85002]"
                  aria-label="Close login"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Title & disclaimer */}
              <h1 id="login-title" className="text-[22px] sm:text-[26px] font-semibold">
                Welcome Back
              </h1>
              <p id="login-desc" className="mt-1 mb-5 text-white/70 text-xs sm:text-sm leading-relaxed">
                Sign in with your invite email. <strong>Access is restricted</strong> — for{" "}
                <strong>SHINEL STUDIOS clients</strong> or <strong>team members</strong> only.
              </p>

              <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
                {/* Email */}
                <div className="mb-2">
                  <input
                    ref={firstFieldRef}
                    id="email"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    autoComplete="username"
                    className="w-full px-4 py-3 rounded-lg outline-none"
                    style={{
                      background: "#243041",
                      color: "#EAF1FF",
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,.12)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.boxShadow = "inset 0 0 0 2px #E85002")}
                    onBlur={(e) => (e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,.12)")}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle size={14} /> {errors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="relative mb-2">
                  <input
                    ref={pwdRef}
                    id="password"
                    type={showPwd ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    autoComplete="current-password"
                    className="w-full px-4 py-3 rounded-lg outline-none pr-12"
                    style={{
                      background: "#243041",
                      color: "#EAF1FF",
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,.12)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.boxShadow = "inset 0 0 0 2px #E85002")}
                    onBlur={(e) => (e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,.12)")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    onMouseDown={startPeek}
                    onMouseUp={stopPeek}
                    onMouseLeave={stopPeek}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    title={showPwd ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {capsOn && (
                  <p className="mt-1 text-xs text-yellow-300">
                    Caps Lock is on.
                  </p>
                )}

                {errors.password && (
                  <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle size={14} /> {errors.password}
                  </p>
                )}

                {/* General error */}
                {errors.general && (
                  <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle size={14} /> {errors.general}
                  </p>
                )}

                {/* Stay signed in (kept functional) */}
                <label className="mt-3 mb-4 flex items-center gap-2 select-none text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    disabled={submitting}
                  />
                  Keep me signed in
                </label>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85002]"
                  style={{ background: "#E85002", color: "#fff" }}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {submitting && <Loader2 size={18} className="animate-spin" />}
                  {submitting ? "Signing in..." : "Login"}
                </motion.button>
              </form>

              {/* Tiny footer row */}
              <div className="mt-4 flex items-center justify-between text-[12px] text-white/60">
                <span>
                  Need access?{" "}
                  <a href="/#contact" className="underline text-white/80">
                    Contact us
                  </a>
                </span>
                <div className="flex items-center gap-3">
                  <Link to="/privacy" className="hover:text-white/90">Privacy</Link>
                  <span aria-hidden>•</span>
                  <Link to="/terms" className="hover:text-white/90">Terms</Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LoginPage;
