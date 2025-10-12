import React from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import SiteHeader from "./components/SiteHeader.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import AutoSRTTool from "./components/tools/AutoSRTTool.jsx";

/* Pages (lazy) */
const ShinelStudiosHomepage = React.lazy(() => import("./components/ShinelStudiosHomepage.jsx"));
const VideoEditing = React.lazy(() => import("./components/VideoEditing.jsx"));
const GFX = React.lazy(() => import("./components/GFX.jsx"));
const Thumbnails = React.lazy(() => import("./components/Thumbnails.jsx"));
const Shorts = React.lazy(() => import("./components/Shorts.jsx"));
const LoginPage = React.lazy(() => import("./components/LoginPage.jsx"));
const ProtectedRoute = React.lazy(() => import("./components/ProtectedRoute.jsx"));
const AIStudioPage = React.lazy(() => import("./components/AIStudioPage.jsx"));
const AdminUsersPage = React.lazy(() => import("./components/AdminUsersPage.jsx"));
const LiveTemplates = React.lazy(() => import("./components/LiveTemplates.jsx"));

/* Tools (lazy) */
const ToolsIndex = React.lazy(() => import("./components/tools/ToolsIndex.jsx"));
const SrtTool = React.lazy(() => import("./components/tools/SrtTool.jsx"));
const SeoTool = React.lazy(() => import("./components/tools/SeoTool.jsx"));
const ThumbnailIdeation = React.lazy(() => import("./components/tools/ThumbnailIdeation.jsx"));
const CustomAIs = React.lazy(() => import("./components/tools/CustomAIs.jsx"));

/* Smooth hash scrolling with header offset */
function ScrollToHash() {
  const location = useLocation();
  React.useEffect(() => {
    const MAX_TRIES = 10, INTERVAL = 50;
    let tries = 0;
    const timer = setInterval(() => {
      const hash = (location.hash || "").replace("#", "");
      const el = hash ? document.getElementById(hash) : null;
      const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 76;
      if (el) {
        const top = window.scrollY + el.getBoundingClientRect().top - (headerH + 8);
        window.scrollTo({ top, behavior: "smooth" });
        clearInterval(timer);
      } else if (++tries >= MAX_TRIES) {
        if (location.pathname === "/" && !hash) window.scrollTo({ top: 0, behavior: "smooth" });
        clearInterval(timer);
      }
    }, INTERVAL);
    return () => clearInterval(timer);
  }, [location.pathname, location.hash]);
  return null;
}

/* Simple legal pages */
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

/* Global layout */
function Layout() {
  const [isDark, setIsDark] = React.useState(() => {
    try { const saved = localStorage.getItem("theme"); if (saved) return saved === "dark"; } catch {}
    if (document.documentElement.classList.contains("dark")) return true;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });

  React.useEffect(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.toggle("dark", isDark);
      try { localStorage.setItem("theme", isDark ? "dark" : "light"); } catch {}
      let metaTheme = document.querySelector('meta[name="theme-color"]:not([media])');
      if (!metaTheme) { metaTheme = document.createElement("meta"); metaTheme.setAttribute("name", "theme-color"); document.head.appendChild(metaTheme); }
      metaTheme.setAttribute("content", isDark ? "#0F0F0F" : "#ffffff");
      const lightIcon = document.querySelector('link[rel="icon"][data-theme="light"]');
      const darkIcon  = document.querySelector('link[rel="icon"][data-theme="dark"]');
      if (lightIcon && darkIcon) { lightIcon.disabled = !!isDark; darkIcon.disabled = !isDark; }
      const fallback = document.getElementById("favicon");
      if (fallback) fallback.href = isDark ? "/favicon-dark-32x32.png" : "/favicon-light-32x32.png";
    });
  }, [isDark]);

  return (
    <>
      <SiteHeader isDark={isDark} setIsDark={setIsDark} />
      <ScrollToHash />
      <main style={{ paddingTop: "var(--header-h, 76px)", transition: "padding-top .2s ease" }}>
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}

/* Redirect /login if already authed */
function RedirectIfAuthed({ children }) {
  const isAuthed = React.useMemo(() => {
    try { return Boolean(localStorage.getItem("token")); } catch { return false; }
  }, []);
  return isAuthed ? <Navigate to="/studio" replace /> : children;
}

/* /logout clears storage */
function Logout() {
  React.useEffect(() => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userFirst");
      localStorage.removeItem("userLast");
      localStorage.removeItem("rememberMe");
    } catch {}
    window.dispatchEvent(new Event("auth:changed"));
  }, []);
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <React.Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ShinelStudiosHomepage />} />
          <Route path="/video-editing" element={<VideoEditing />} />
          <Route path="/gfx" element={<GFX />} />
          <Route path="/thumbnails" element={<Thumbnails />} />
          <Route path="/shorts" element={<Shorts />} />
          
          {/* SEO-friendly route for gaming thumbnail templates */}
          <Route path="/gaming-thumbnail-templates" element={<LiveTemplates />} />
          
          {/* Redirect old route to new SEO-friendly route */}
          <Route path="/live-templates" element={<Navigate to="/gaming-thumbnail-templates" replace />} />

          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <LoginPage />
              </RedirectIfAuthed>
            }
          />

          {/* Studio hub */}
          <Route
            path="/studio"
            element={
              <ProtectedRoute>
                <AIStudioPage />
              </ProtectedRoute>
            }
          />

          {/* Tools (role-gated) */}
          <Route
            path="/tools"
            element={
              <ProtectedRoute requireRole={["admin","editor","client"]}>
                <ToolsIndex />
              </ProtectedRoute>
            }
          />
          
          {/* AutoSRT Tool - All authenticated users */}
          <Route
            path="/tools/srt"
            element={
              <ProtectedRoute requireRole={["admin","editor","client"]}>
                <AutoSRTTool />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/tools/seo"
            element={
              <ProtectedRoute requireRole={["admin","editor","client"]}>
                <SeoTool />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/thumbnail-ideation"
            element={
              <ProtectedRoute requireRole={["admin","editor","client"]}>
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

          {/* Admin users */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireRole="admin">
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />

          <Route path="/logout" element={<Logout />} />
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </React.Suspense>
  );
}