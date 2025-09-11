// src/components/LoginPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu, X, ChevronDown, Eye, EyeOff, Loader2, AlertCircle,
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
                transform: "scale(2.8)",
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
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
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

/* ───────────────────────────── Login Page ───────────────────────────── */
const LoginPage = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const firstFieldRef = useRef(null);
  useEffect(() => { firstFieldRef.current?.focus(); }, []);

  const closeModal = () => {
    setOpen(false);
    setTimeout(() => {
      if (window.history?.state && window.history.state.idx > 0) navigate(-1);
      else navigate("/");
    }, 220);
  };

  const validate = () => {
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email.";
    if (!password || password.length < 8) next.password = "Password must be at least 8 characters.";
    return next;
  };

  // ✅ Backend login
  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
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
      setErrors({ general: err.message || "Login failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              key="modal"
              id="login-card"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-lg p-7 sm:p-8 rounded-2xl shadow-2xl"
              style={{ background: "#0F0F0F", border: "2.5px solid #E85002", color: "#fff" }}
            >
              <h1 className="text-[22px] sm:text-[26px] font-semibold mb-4">Welcome Back</h1>

              <form onSubmit={handleSubmit} noValidate>
                <input
                  ref={firstFieldRef}
                  id="email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mb-2 px-4 py-3 rounded-lg outline-none"
                  style={{ background: "#243041", color: "#EAF1FF" }}
                />
                {errors.email && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle size={14} /> {errors.email}
                  </p>
                )}

                <div className="relative mb-2">
                  <input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg outline-none pr-12"
                    style={{ background: "#243041", color: "#EAF1FF" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle size={14} /> {errors.password}
                  </p>
                )}

                {errors.general && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle size={14} /> {errors.general}
                  </p>
                )}

                <motion.button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                  style={{ background: "#E85002", color: "#fff" }}
                >
                  {submitting && <Loader2 size={18} className="animate-spin" />}
                  {submitting ? "Signing in..." : "Login"}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LoginPage;
