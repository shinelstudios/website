// src/App.jsx
import React from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import SiteHeader from "./components/SiteHeader.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import AutoSRTTool from "./components/tools/AutoSRTTool.jsx";

/* Pages (lazy) */
const ShinelStudiosHomepage = React.lazy(() => import("./components/ShinelStudiosHomepage.jsx"));
const VideoEditing       = React.lazy(() => import("./components/VideoEditing.jsx"));
const GFX                = React.lazy(() => import("./components/GFX.jsx"));
const Thumbnails         = React.lazy(() => import("./components/Thumbnails.jsx"));
const Shorts             = React.lazy(() => import("./components/Shorts.jsx"));
const LoginPage          = React.lazy(() => import("./components/LoginPage.jsx"));
const ProtectedRoute     = React.lazy(() => import("./components/ProtectedRoute.jsx"));
const AIStudioPage       = React.lazy(() => import("./components/AIStudioPage.jsx"));
const AdminUsersPage     = React.lazy(() => import("./components/AdminUsersPage.jsx"));
const LiveTemplates      = React.lazy(() => import("./components/LiveTemplates.jsx"));

/* Tools (lazy) */
const ToolsIndex         = React.lazy(() => import("./components/tools/ToolsIndex.jsx"));
const SrtTool            = React.lazy(() => import("./components/tools/SrtTool.jsx"));
const SeoTool            = React.lazy(() => import("./components/tools/SeoTool.jsx"));
const ThumbnailIdeation  = React.lazy(() => import("./components/tools/ThumbnailIdeation.jsx"));
const CustomAIs          = React.lazy(() => import("./components/tools/CustomAIs.jsx"));

/* ---------------------- Smooth Hash Scroll (robust) ---------------------- */
function ScrollToHash() {
  const { pathname, hash } = useLocation();

  React.useEffect(() => {
    const scrollOnce = () => {
      if (hash) {
        const id = hash.replace("#", "");
        const el = document.getElementById(id);
        if (el) {
          const headerH =
            parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 76;
          const top = window.scrollY + el.getBoundingClientRect().top - (headerH + 8);
          window.scrollTo({ top, behavior: "smooth" });
          return true;
        }
        return false;
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return true;
      }
    };

    // Retry a few times to handle async/lazy content
    let tries = 0;
    const MAX_TRIES = 20;
    const timer = setInterval(() => {
      const done = scrollOnce();
      if (done || ++tries >= MAX_TRIES) clearInterval(timer);
    }, 80);

    return () => clearInterval(timer);
  }, [pathname, hash]);

  return null;
}

/* ---------------------- Legal Pages ---------------------- */
function LegalPage({ kind = "privacy" }) {
  React.useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, []);
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
        <div className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>{updated}</div>
        <div className="mt-6 space-y-4" style={{ color: "var(--text)" }}>
          {(isPrivacy ? text.privacy : text.terms).map((p, i) => (<p key={i}>{p}</p>))}
        </div>
        <div className="mt-8 rounded-xl p-4" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Questions? Email{" "}
            <a href="mailto:hello@shinelstudiosofficial.com" style={{ color: "var(--orange)" }}>
              hello@shinelstudiosofficial.com
            </a>.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------------- Layout with Dynamic Header ---------------------- */
function Layout() {
  const [isDark, setIsDark] = React.useState(() => {
    try { const saved = localStorage.getItem("theme"); if (saved) return saved === "dark"; } catch {}
    if (document.documentElement.classList.contains("dark")) return true;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });

  // Measure header height for proper offset on all pages (incl. mobile)
  React.useEffect(() => {
    const header = document.querySelector("header");
    const updateHeaderHeight = () => {
      if (header) {
        const h = Math.round(header.getBoundingClientRect().height) || 76;
        document.documentElement.style.setProperty("--header-h", `${h}px`);
      }
    };
    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);
    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, []);

  React.useEffect(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.toggle("dark", isDark);
      try { localStorage.setItem("theme", isDark ? "dark" : "light"); } catch {}
      let metaTheme = document.querySelector('meta[name="theme-color"]:not([media])');
      if (!metaTheme) {
        metaTheme = document.createElement("meta");
        metaTheme.setAttribute("name", "theme-color");
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute("content", isDark ? "#0F0F0F" : "#FFFFFF");

      const lightIcon = document.querySelector('link[rel="icon"][data-theme="light"]');
      const darkIcon  = document.querySelector('link[rel="icon"][data-theme="dark"]');
      if (lightIcon && darkIcon) {
        lightIcon.disabled = !!isDark;
        darkIcon.disabled = !isDark;
      }
      const fallback = document.getElementById("favicon");
      if (fallback) fallback.href = isDark ? "/favicon-dark-32x32.png" : "/favicon-light-32x32.png";
    });
  }, [isDark]);

  return (
    <>
      <SiteHeader isDark={isDark} setIsDark={setIsDark} />
      <ScrollToHash />
      <main
        style={{
          paddingTop: "var(--header-h, 76px)",
          transition: "padding-top .25s ease",
        }}
      >
        <Outlet />
      </main>
      <SiteFooter isDark={isDark} />
    </>
  );
}

/* ---------------------- Redirect if already logged in ---------------------- */
function RedirectIfAuthed({ children }) {
  const isAuthed = React.useMemo(() => {
    try { return Boolean(localStorage.getItem("token")); } catch { return false; }
  }, []);
  return isAuthed ? <Navigate to="/studio" replace /> : children;
}

/* ---------------------- Logout ---------------------- */
function Logout() {
  React.useEffect(() => {
    try {
      ["token", "refresh", "userEmail", "userRole", "userFirst", "userLast", "rememberMe"]
        .forEach((key) => localStorage.removeItem(key));
    } catch {}
    window.dispatchEvent(new Event("auth:changed"));
  }, []);
  return <Navigate to="/" replace />;
}

/* ---------------------- App Root ---------------------- */
export default function App() {
  const location = useLocation();

  return (
    <React.Suspense fallback={<LoadingScreen />}>
      {/* Key the Routes by pathname so lazy elements remount cleanly on navigation */}
      <Routes key={location.pathname}>
        <Route element={<Layout />}>

          {/* Public routes */}
          <Route index element={<ShinelStudiosHomepage key="home" />} />
          <Route path="/video-editing" element={<VideoEditing key="video-editing" />} />
          <Route path="/gfx" element={<GFX key="gfx" />} />
          <Route path="/thumbnails" element={<Thumbnails key="thumbnails" />} />
          <Route path="/shorts" element={<Shorts key="shorts" />} />

          {/* SEO-friendly aliases */}
          <Route path="/live-templates" element={<Navigate to="/gaming-thumbnail-templates" replace />} />
          <Route path="/gaming-thumbnail-templates" element={<LiveTemplates key="gaming-templates" />} />

          {/* Submenu routes */}
          <Route path="/gfx/thumbnails" element={<Thumbnails key="gfx-thumbnails" />} />
          <Route path="/gfx/branding" element={<GFX key="gfx-branding" />} />
          <Route path="/videos/shorts" element={<Shorts key="videos-shorts" />} />
          <Route path="/videos/long" element={<VideoEditing key="videos-long" />} />

          {/* Auth */}
          <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
          <Route path="/logout" element={<Logout />} />

          {/* Protected studio */}
          <Route path="/studio" element={<ProtectedRoute><AIStudioPage /></ProtectedRoute>} />

          {/* Tools */}
          <Route
            path="/tools"
            element={
              <ProtectedRoute requireRole={["admin", "editor", "client"]}>
                <ToolsIndex />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/srt"
            element={
              <ProtectedRoute requireRole={["admin", "editor", "client"]}>
                <AutoSRTTool />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/seo"
            element={
              <ProtectedRoute requireRole={["admin", "editor", "client"]}>
                <SeoTool />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/thumbnail-ideation"
            element={
              <ProtectedRoute requireRole={["admin", "editor", "client"]}>
                <ThumbnailIdeation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/custom-ais"
            element={
              <ProtectedRoute requireRole={["admin"]}>
                <CustomAIs />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireRole="admin">
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />

          {/* Legal + fallback */}
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </React.Suspense>
  );
}
