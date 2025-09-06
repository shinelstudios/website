// src/components/LoginPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu, X, ChevronDown, Eye, EyeOff, Loader2, AlertCircle, Mail,
  Instagram, Twitter, Linkedin
} from "lucide-react";

import logoLight from "../assets/logo_light.png";

/* ───────────────────────────────── Header (matches homepage) ───────────────────────────────── */
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
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-lg"
      style={{
        background: "rgba(0,0,0,.85)",
        borderBottom: "1px solid rgba(255,255,255,.12)",
      }}
    >
      {/* thin accent line */}
      <div
        aria-hidden
        className="absolute left-0 top-0 h-[1px] w-full"
        style={{ background: "linear-gradient(90deg,#E85002,#ff9357)" }}
      />

      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3">
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
            />
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          <a href="/#home" className="nav-link">Home</a>
          <a href="/#services" className="nav-link">Services</a>
          <a href="/#testimonials" className="nav-link">Testimonials</a>
          <a href="/#contact" className="nav-link">Contact</a>

          {/* Our Work dropdown */}
          <div className="relative" ref={workRef}>
            <button
              onClick={() => setWorkOpen((v) => !v)}
              className="inline-flex items-center gap-1 nav-link"
              aria-expanded={workOpen}
              aria-controls="work-menu"
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
                    <a
                      key={it.name}
                      href={it.href}
                      className="block w-full px-4 py-3 text-left work-item"
                      onClick={() => setWorkOpen(false)}
                    >
                      {it.name}
                    </a>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <a
            href="/#contact"
            className="hidden md:block text-white px-5 py-2 rounded-lg font-medium"
            style={{ background: "linear-gradient(90deg, #E85002, #ff9357)" }}
          >
            Book Free Audit
          </a>

          <button className="md:hidden p-2 text-white" aria-label="Menu" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,.6)" }}
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="absolute right-0 top-0 h-full w-[80vw] max-w-xs p-4"
              style={{ background: "#0F0F0F" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <img src={logoLight} alt="Shinel Studios" className="h-9 w-auto" />
                <button className="p-2 text-white" onClick={() => setMobileOpen(false)} aria-label="Close">
                  <X size={22} />
                </button>
              </div>

              <nav className="space-y-2 text-white">
                <a href="/#home" className="block px-2 py-2">Home</a>
                <a href="/#services" className="block px-2 py-2">Services</a>
                <a href="/#testimonials" className="block px-2 py-2">Testimonials</a>
                <a href="/#contact" className="block px-2 py-2">Contact</a>
                <a href="/video-editing" className="block px-2 py-2">Our Work</a>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav hover style: text → orange only (no background) */}
      <style>{`
        .nav-link, .work-item {
          color: #fff;
          transition: color .15s ease;
        }
        .nav-link:hover,
        .work-item:hover {
          color: #E85002;
        }
      `}</style>
    </header>
  );
};

/* ───────────────────────────────── Footer (exactly your homepage footer) ───────────────────────────────── */
const animations = {
  staggerParent: { visible: { transition: { staggerChildren: 0.15 } } },
  fadeUp: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } },
};

const Footer = () => (
  <motion.footer
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    variants={animations.staggerParent}
    className="py-16"
    style={{ background: "#000", color: "#fff" }}
  >
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

        {/* Column 1 - Logo + Socials */}
        <motion.div variants={animations.fadeUp}>
          <div className="flex items-center gap-3 mb-4">
            <motion.img
              src={logoLight}
              alt="Shinel Studios"
              className="h-20 w-auto object-contain select-none"
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1.4, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              whileHover={{ scale: 1.5 }}
              style={{
                transformOrigin: "left center",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
              }}
            />
          </div>
          <p className="mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>
            We're a creative media agency dedicated to helping creators and brands shine through unforgettable visuals and strategic content.
          </p>
          <div className="flex gap-4">
            {[
              { icon: <Instagram size={28} />, href: "https://www.instagram.com/shinel.studios/?hl=en", label: "Instagram" },
              { icon: <Twitter size={28} />, href: "https://linktr.ee/ShinelStudios", label: "Linktree" },
              { icon: <Linkedin size={28} />, href: "https://www.linkedin.com/company/shinel-studios/posts/?feedView=all", label: "LinkedIn" },
            ].map((s, i) => (
              <motion.a
                key={i}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                whileHover={{ scale: 1.2, y: -2 }}
                whileTap={{ scale: 0.95 }}
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {s.icon}
              </motion.a>
            ))}
          </div>
        </motion.div>

        {/* Column 2 - Links */}
        <motion.div variants={animations.fadeUp}>
          <h3 className="text-xl font-bold mb-6 font-['Poppins']">Quick Links</h3>
          <ul className="space-y-3">
            {["Home", "Services", "Testimonials", "Contact"].map((t) => (
              <li key={t}>
                <a
                  href={`/#${t.toLowerCase()}`}
                  className="transition-colors hover:text-[var(--orange)]"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {t}
                </a>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Column 3 - Newsletter */}
        <motion.div variants={animations.fadeUp}>
          <h3 className="text-xl font-bold mb-6 font-['Poppins']">Stay Updated</h3>
          <p className="mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
            Subscribe to get the latest tips and updates from our team.
          </p>
          <div className="flex gap-2">
            <motion.input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            />
            <motion.button
              className="px-6 py-3 rounded-lg text-white"
              style={{ background: "var(--orange, #E85002)" }}
              whileHover={{ scale: 1.05, boxShadow: "0px 8px 18px rgba(232,80,2,0.4)" }}
              whileTap={{ scale: 0.95 }}
            >
              <Mail size={20} />
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Footer Bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mt-12 pt-8 text-center"
        style={{ borderTop: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
      >
        <p>© 2025 Shinel Studios™ — Where Ideas Shine. All rights reserved.</p>
      </motion.div>
    </div>
  </motion.footer>
);

/* ───────────────────────────────── Login Page ───────────────────────────────── */
const LoginPage = () => {
  const navigate = useNavigate();

  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  // UI state
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address.";
    if (!password || password.length < 8) next.password = "Password must be at least 8 characters.";
    return next;
    // (Keep logic simple; plug in your real auth later)
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);

    // Fake async auth
    setTimeout(() => {
      setSubmitting(false);
      if (remember) localStorage.setItem("rememberMe", "1");
      navigate("/");
    }, 900);
  };

  return (
    <>
      <Header />

      <main
        className="min-h-screen flex items-center justify-center px-4 pt-24 pb-14"
        style={{
          background:
            "radial-gradient(800px 400px at 15% -10%, rgba(232,80,2,.16), transparent 55%), radial-gradient(900px 450px at 95% -8%, rgba(232,80,2,.10), transparent 60%), linear-gradient(180deg,#0B0B0B,#121212 40%, #0F0F0F)",
          color: "#fff",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-lg p-8 rounded-2xl shadow-xl"
          style={{
            background: "#0F0F0F",
            border: "2.5px solid #E85002",
            boxShadow:
              "0 0 0 3px rgba(232,80,2,.18), 0 14px 48px rgba(232,80,2,.12), 0 22px 70px rgba(0,0,0,.45)",
          }}
        >
          <h1 className="text-center text-2xl md:text-[26px] font-semibold mb-6">
            Welcome Back
          </h1>

          <form onSubmit={handleSubmit} noValidate autoComplete="off">
  {/* Email */}
  <input
    id="email"
    type="email"
    placeholder="Email address"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    autoComplete="off"   // ⬅ stop browser autofill
    className="w-full mb-2 px-4 py-3 rounded-lg outline-none"
    style={{ background: "#243041", color: "#EAF1FF" }}
  />
  {errors.email && (
    <p className="mb-3 text-sm flex items-center gap-1 text-red-400">
      <AlertCircle size={14} /> {errors.email}
    </p>
  )}

  {/* Password */}
  <div className="relative mb-2">
    <input
      id="password"
      type={showPwd ? "text" : "password"}
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      autoComplete="new-password" // ⬅ recommended for password field
      className="w-full px-4 py-3 rounded-lg outline-none pr-12"
      style={{ background: "#243041", color: "#EAF1FF" }}
    />
    <button
      type="button"
      onClick={() => setShowPwd((v) => !v)}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/80"
      aria-label={showPwd ? "Hide password" : "Show password"}
      title={showPwd ? "Hide password" : "Show password"}
    >
      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
  {errors.password && (
    <p className="mb-3 text-sm flex items-center gap-1 text-red-400">
      <AlertCircle size={14} /> {errors.password}
    </p>
  )}

  {/* Row: remember + forgot */}
  <div className="flex items-center justify-between mb-4 text-sm">
    <label className="flex items-center gap-2 select-none">
      <input
        type="checkbox"
        checked={remember}
        onChange={(e) => setRemember(e.target.checked)}
        autoComplete="off" // ⬅ also disable here
      />
      Keep me signed in
    </label>
    <Link to="/forgot-password" className="underline" style={{ color: "#ff9357" }}>
      Forgot password?
    </Link>
  </div>

  {/* Submit */}
  <button
    type="submit"
    disabled={submitting}
    className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-70"
    style={{ background: "#E85002", color: "#fff" }}
  >
    {submitting && <Loader2 size={18} className="animate-spin" />}
    {submitting ? "Signing in..." : "Login"}
  </button>
</form>

        </motion.div>
      </main>

      <Footer />
    </>
  );
};

export default LoginPage;
