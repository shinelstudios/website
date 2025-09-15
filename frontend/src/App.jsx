// src/App.jsx
import React from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import SiteHeader from "./components/SiteHeader.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx"; // 🔄 branded splash while lazy chunks load

// Lazy-load heavier pages for better initial performance
const ShinelStudiosHomepage = React.lazy(() => import("./components/ShinelStudiosHomepage.jsx"));
const VideoEditing = React.lazy(() => import("./components/VideoEditing.jsx"));
const GFX = React.lazy(() => import("./components/GFX.jsx"));
const Thumbnails = React.lazy(() => import("./components/Thumbnails.jsx"));
const Shorts = React.lazy(() => import("./components/Shorts.jsx"));
const LoginPage = React.lazy(() => import("./components/LoginPage.jsx"));
const ProtectedRoute = React.lazy(() => import("./components/ProtectedRoute.jsx"));
const AIStudioPage = React.lazy(() => import("./components/AIStudioPage.jsx"));
const AdminUsersPage = React.lazy(() => import("./components/AdminUsersPage.jsx")); // NEW

/* ---------- Helpers ---------- */
function parseJwt(token) {
  try {
    const [, payload] = String(token).split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

/* Scroll to hash targets (e.g., /#services) with header offset */
function ScrollToHash() {
  const location = useLocation();

  React.useEffect(() => {
    const MAX_TRIES = 10;
    const INTERVAL = 50;
    let tries = 0;

    const timer = setInterval(() => {
      const hash = (location.hash || "").replace("#", "");
      const el = hash ? document.getElementById(hash) : null;
      const headerH =
        parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 76;

      if (el) {
        const top = window.scrollY + el.getBoundingClientRect().top - (headerH + 8);
        window.scrollTo({ top, behavior: "smooth" });
        clearInterval(timer);
      } else if (++tries >= MAX_TRIES) {
        if (location.pathname === "/" && !hash) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        clearInterval(timer);
      }
    }, INTERVAL);

    return () => clearInterval(timer);
  }, [location.pathname, location.hash]);

  return null;
}

/* Simple legal page (Privacy/Terms). Replace with your own page later if you like. */
function LegalPage({ kind = "privacy" }) {
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const isPrivacy = kind === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms of Service";
  const updated = "Last updated: Sep 2025";

  const text = {
    privacy: [
      "We only collect information you provide (like your name, email, and links you share).",
      "We use this data to reply, provide quotes, and improve our services. No spam.",
      "You can request deletion or export of your data at any time by emailing hello@shinelstudiosofficial.com.",
      "We use basic analytics and advertising pixels to understand traffic and measure results.",
    ],
    terms: [
      "By using our website and services, you agree to these terms.",
      "All content and deliverables are provided under the agreed scope; revisions are outlined per package.",
      "You retain rights to your original assets; we retain rights to our templates and internal tools.",
      "Payments, refunds, and timelines follow the package notes and written agreements.",
    ],
  };

  return (
    <section style={{ background: "var(--surface)" }}>
      <div className="container mx-auto px-4 py-14 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold font-['Poppins']" style={{ color: "var(--text)" }}>
          {title}
        </h1>
        <div className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          {updated}
        </div>

        <div className="mt-6 space-y-4" style={{ color: "var(--text)" }}>
          {(isPrivacy ? text.privacy : text.terms).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-8 rounded-xl p-4" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Questions? Email{" "}
            <a href="mailto:hello@shinelstudiosofficial.com" style={{ color: "var(--orange)" }}>
              hello@shinelstudiosofficial.com
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

/* Layout with global header/footer and site-wide theme toggle */
function Layout() {
  const [isDark, setIsDark] = React.useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
    } catch {}
    if (document.documentElement.classList.contains("dark")) return true;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });

  React.useEffect(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.toggle("dark", isDark);
      try {
        localStorage.setItem("theme", isDark ? "dark" : "light");
      } catch {}

      // Update plain theme-color (mobile address bar)
      let metaTheme = document.querySelector('meta[name="theme-color"]:not([media])');
      if (!metaTheme) {
        metaTheme = document.createElement("meta");
        metaTheme.setAttribute("name", "theme-color");
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute("content", isDark ? "#0F0F0F" : "#ffffff");

      // Swap favicons if present
      const lightIcon = document.querySelector('link[rel="icon"][data-theme="light"]');
      const darkIcon = document.querySelector('link[rel="icon"][data-theme="dark"]');
      if (lightIcon && darkIcon) {
        lightIcon.disabled = !!isDark;
        darkIcon.disabled = !isDark;
      }
      const fallback = document.getElementById("favicon");
      if (fallback)
        fallback.href = isDark ? "/favicon-dark-32x32.png" : "/favicon-light-32x32.png";
    });
  }, [isDark]);

  return (
    <>
      <SiteHeader isDark={isDark} setIsDark={setIsDark} />
      <ScrollToHash />
      <main
        style={{
          paddingTop: "var(--header-h, 76px)",
          transition: "padding-top .2s ease",
        }}
      >
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}

/* If already logged in, skip /login and go to Home */
function RedirectIfAuthed({ children }) {
  const isAuthed = React.useMemo(() => {
    try {
      return Boolean(localStorage.getItem("token"));
    } catch {
      return false;
    }
  }, []);
  return isAuthed ? <Navigate to="/" replace /> : children;
}

/* Admin-only wrapper (role-gated route) */
function AdminRoute({ children }) {
  const token = React.useMemo(() => {
    try {
      return localStorage.getItem("token") || "";
    } catch {
      return "";
    }
  }, []);
  const payload = React.useMemo(() => parseJwt(token), [token]);
  const role = (payload?.role || "").toLowerCase();

  // Not logged in → send to login and bounce back here
  if (!token) {
    return <Navigate to={`/login?next=${encodeURIComponent("/admin/users")}`} replace />;
  }
  // Logged in but not admin → home
  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
}

/* Simple /logout route: clears token and bounces home */
function Logout() {
  React.useEffect(() => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userFirstName");
      localStorage.removeItem("userLastName");
      localStorage.removeItem("userRole");
      localStorage.removeItem("rememberMe");
    } catch {}
    // notify header
    window.dispatchEvent(new Event("auth:changed"));
  }, []);
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    // 🔥 Use branded loader while lazy chunks are fetched & rendered
    <React.Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ShinelStudiosHomepage />} />
          <Route path="/video-editing" element={<VideoEditing />} />
          <Route path="/gfx" element={<GFX />} />
          <Route path="/thumbnails" element={<Thumbnails />} />
          <Route path="/shorts" element={<Shorts />} />

          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <LoginPage />
              </RedirectIfAuthed>
            }
          />

          {/* 🔒 Protected AI Studio */}
          <Route
            path="/studio"
            element={
              <ProtectedRoute>
                <AIStudioPage />
              </ProtectedRoute>
            }
          />

          {/* 🔒 Admin → Add User (role-gated) */}
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            }
          />

          {/* Convenience logout route */}
          <Route path="/logout" element={<Logout />} />

          {/* NEW: legal pages used by footer links */}
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </React.Suspense>
  );
}
