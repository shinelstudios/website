// src/components/RegisterPage.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaGoogle } from "react-icons/fa";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import logoLight from "../assets/logo_light.png";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

const RegisterPage = () => {
  const navigate = useNavigate();

  // form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);

  // UI state
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const validate = () => {
    const next = {};
    if (!name.trim() || name.trim().length < 2) next.name = "Please enter your full name.";
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    if (confirm !== password) next.confirm = "Passwords do not match.";
    if (!agree) next.agree = "You must agree to the Terms.";
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // Simulate API call — replace with your real API integration
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setDone(true);
      // go to login after a short delay
      setTimeout(() => navigate("/login"), 900);
    }, 900);
  };

  return (
    <>
      <SiteHeader />

      <main
        className="min-h-screen flex items-center justify-center px-4 pt-24 pb-14"
        style={{
          background:
            "radial-gradient(800px 400px at 15% -10%, rgba(232,80,2,.16), transparent 55%), radial-gradient(900px 450px at 95% -8%, rgba(232,80,2,.10), transparent 60%), linear-gradient(180deg,#0B0B0B,#121212 40%, #0F0F0F)",
          color: "var(--text, #fff)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md p-8 rounded-2xl shadow-xl border"
          style={{
            background: "var(--surface, #0F0F0F)",
            borderColor: "var(--orange, #E85002)",
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <img
              src={logoLight}
              alt="Shinel Studios"
              className="w-32 h-32 md:w-36 md:h-36 object-contain"
              style={{ filter: "drop-shadow(0 10px 28px rgba(232,80,2,0.35))" }}
            />
          </div>

          <h1
            className="text-center text-2xl font-semibold mb-6"
            style={{ color: "var(--text, #fff)" }}
          >
            Create Account
          </h1>

          {/* Success notice */}
          {done && (
            <div
              className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: "rgba(46,204,113,.15)", border: "1px solid rgba(46,204,113,.35)" }}
            >
              <CheckCircle2 size={18} />
              <p className="text-sm">Account created! Redirecting to login…</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <label className="sr-only" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              name="name"
              autoComplete="name"
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mb-2 px-4 py-3 rounded-lg outline-none"
              style={{
                background: "#EAF1FF",
                color: "#0D0D0D",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
            {errors.name && (
              <p className="mb-3 text-sm flex items-center gap-1" style={{ color: "#ff7777" }}>
                <AlertCircle size={14} /> {errors.name}
              </p>
            )}

            {/* Email */}
            <label className="sr-only" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              autoComplete="email"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-2 px-4 py-3 rounded-lg outline-none"
              style={{
                background: "#EAF1FF",
                color: "#0D0D0D",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
            {errors.email && (
              <p className="mb-3 text-sm flex items-center gap-1" style={{ color: "#ff7777" }}>
                <AlertCircle size={14} /> {errors.email}
              </p>
            )}

            {/* Password */}
            <div className="relative mb-2">
              <label className="sr-only" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="new-password"
                autoComplete="new-password"
                type={showPwd ? "text" : "password"}
                placeholder="Password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg outline-none pr-12"
                style={{
                  background: "#EAF1FF",
                  color: "#0D0D0D",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                aria-label={showPwd ? "Hide password" : "Show password"}
                style={{ color: "#555" }}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="mb-3 text-sm flex items-center gap-1" style={{ color: "#ff7777" }}>
                <AlertCircle size={14} /> {errors.password}
              </p>
            )}

            {/* Confirm Password */}
            <div className="relative mb-2">
              <label className="sr-only" htmlFor="confirm">
                Confirm password
              </label>
              <input
                id="confirm"
                name="confirm"
                autoComplete="new-password"
                type={showConfirmPwd ? "text" : "password"}
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg outline-none pr-12"
                style={{
                  background: "#EAF1FF",
                  color: "#0D0D0D",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                aria-label={showConfirmPwd ? "Hide confirm password" : "Show confirm password"}
                style={{ color: "#555" }}
              >
                {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirm && (
              <p className="mb-3 text-sm flex items-center gap-1" style={{ color: "#ff7777" }}>
                <AlertCircle size={14} /> {errors.confirm}
              </p>
            )}

            {/* Terms */}
            <label className="flex items-center gap-2 mb-4 text-sm select-none" style={{ color: "var(--text, #fff)" }}>
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              I agree to the{" "}
              <a
                href="/terms"
                className="underline"
                style={{ color: "var(--orange, #E85002)" }}
              >
                Terms & Privacy
              </a>
            </label>
            {errors.agree && (
              <p className="mb-3 -mt-2 text-sm flex items-center gap-1" style={{ color: "#ff7777" }}>
                <AlertCircle size={14} /> {errors.agree}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg font-medium transition-transform flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ background: "var(--orange, #E85002)", color: "#fff" }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              {submitting ? "Creating..." : "Register"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center justify-center">
            <span className="text-gray-400 text-sm">OR</span>
          </div>

          {/* Google */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg transition-colors"
            style={{ background: "#fff", color: "#1f2937" }}
            onClick={() => alert("Connect Google OAuth here")}
          >
            <FaGoogle /> Sign up with Google
          </button>

          {/* Login link */}
          <p className="mt-6 text-center text-sm" style={{ color: "#a3a3a3" }}>
            Already have an account?{" "}
            <Link to="/login" className="hover:underline" style={{ color: "var(--orange, #E85002)" }}>
              Login
            </Link>
          </p>
        </motion.div>
      </main>

      <SiteFooter />
    </>
  );
};

export default RegisterPage;
