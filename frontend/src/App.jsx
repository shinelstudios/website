// src/App.jsx
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

/* Tools */
const ToolsIndex = React.lazy(() => import("./components/tools/ToolsIndex.jsx"));
const SrtTool = React.lazy(() => import("./components/tools/SrtTool.jsx"));
const SeoTool = React.lazy(() => import("./components/tools/SeoTool.jsx"));
const ThumbnailIdeation = React.lazy(() => import("./components/tools/ThumbnailIdeation.jsx"));
const CustomAIs = React.lazy(() => import("./components/tools/CustomAIs.jsx"));

/* ---------------------- Smooth Scroll (hash + route aware) ---------------------- */
function ScrollToHash() {
  const { pathname, hash } = useLocation();

  React.useEffect(() => {
    const tryScroll = () => {
      if (hash) {
        const el = document.getElementById(hash.replace("#", ""));
        if (el) {
          const headerH =
            parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 76;
          const offset = el.getBoundingClientRect().top + window.scrollY - headerH - 8;
          window.scrollTo({ top: offset, behavior: "smooth" });
          return true;
        }
        return false;
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return true;
      }
    };

    let tries = 0;
    const maxTries = 20;
    const interval = setInterval(() => {
      const done = tryScroll();
      if (done || ++tries >= maxTries) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, [pathname, hash]);

  return null;
}

/* ---------------------- Layout ---------------------- */
function Layout() {
  const [isDark, setIsDark] = React.useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
    } catch {}
    if (document.documentElement.classList.contains("dark")) return true;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });

  // ✅ Recalculate header height on resize and route changes (fix mobile padding)
  const location = useLocation();
  React.useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector("header");
      if (header) {
        const h = Math.round(header.getBoundingClientRect().height) || 76;
        document.documentElement.style.setProperty("--header-h", `${h}px`);
      }
    };
    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);
    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, [location.pathname]);

  // ✅ Sync theme icons and meta
  React.useEffect(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.toggle("dark", isDark);
      try {
        localStorage.setItem("theme", isDark ? "dark" : "light");
      } catch {}
      let metaTheme = document.querySelector('meta[name="theme-color"]:not([media])');
      if (!metaTheme) {
        metaTheme = document.createElement("meta");
        metaTheme.setAttribute("name", "theme-color");
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute("content", isDark ? "#0F0F0F" : "#FFFFFF");

      const lightIcon = document.querySelector('link[rel="icon"][data-theme="light"]');
      const darkIcon = document.querySelector('link[rel="icon"][data-theme="dark"]');
      if (lightIcon && darkIcon) {
        lightIcon.disabled = !!isDark;
        darkIcon.disabled = !isDark;
      }
    });
  }, [isDark]);

  return (
    <>
      <SiteHeader isDark={isDark} setIsDark={setIsDark} />
      <ScrollToHash />
      <main
        style={{
          paddingTop: "var(--header-h, 76px)",
          transition: "padding-top 0.25s ease",
        }}
      >
        <Outlet />
      </main>
      <SiteFooter isDark={isDark} />
    </>
  );
}

/* ---------------------- Redirect Helpers ---------------------- */
function RedirectIfAuthed({ children }) {
  const isAuthed = React.useMemo(() => {
    try {
      return Boolean(localStorage.getItem("token"));
    } catch {
      return false;
    }
  }, []);
  return isAuthed ? <Navigate to="/studio" replace /> : children;
}

function Logout() {
  React.useEffect(() => {
    try {
      ["token", "refresh", "userEmail", "userRole", "userFirst", "userLast", "rememberMe"].forEach(
        (k) => localStorage.removeItem(k)
      );
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
      <Routes key={location.pathname}>
        <Route element={<Layout />}>
          {/* Public */}
          <Route index element={<ShinelStudiosHomepage />} />
          <Route path="/video-editing" element={<VideoEditing />} />
          <Route path="/gfx" element={<GFX />} />
          <Route path="/thumbnails" element={<Thumbnails />} />
          <Route path="/shorts" element={<Shorts />} />

          {/* Aliases */}
          <Route path="/live-templates" element={<Navigate to="/gaming-thumbnail-templates" replace />} />
          <Route path="/gaming-thumbnail-templates" element={<LiveTemplates />} />

          {/* Nested Submenus */}
          <Route path="/gfx/thumbnails" element={<Thumbnails />} />
          <Route path="/gfx/branding" element={<GFX />} />
          <Route path="/videos/shorts" element={<Shorts />} />
          <Route path="/videos/long" element={<VideoEditing />} />

          {/* Auth */}
          <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
          <Route path="/logout" element={<Logout />} />

          {/* Studio + Tools */}
          <Route path="/studio" element={<ProtectedRoute><AIStudioPage /></ProtectedRoute>} />
          <Route path="/tools" element={<ProtectedRoute requireRole={["admin", "editor", "client"]}><ToolsIndex /></ProtectedRoute>} />
          <Route path="/tools/srt" element={<ProtectedRoute requireRole={["admin", "editor", "client"]}><AutoSRTTool /></ProtectedRoute>} />
          <Route path="/tools/seo" element={<ProtectedRoute requireRole={["admin", "editor", "client"]}><SeoTool /></ProtectedRoute>} />
          <Route path="/tools/thumbnail-ideation" element={<ProtectedRoute requireRole={["admin", "editor", "client"]}><ThumbnailIdeation /></ProtectedRoute>} />
          <Route path="/tools/custom-ais" element={<ProtectedRoute requireRole="admin"><CustomAIs /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin/users" element={<ProtectedRoute requireRole="admin"><AdminUsersPage /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </React.Suspense>
  );
}
