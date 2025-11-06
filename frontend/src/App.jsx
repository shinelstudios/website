// src/App.jsx
import React from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import SiteHeader from "./components/SiteHeader.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import AutoSRTTool from "./components/tools/AutoSRTTool.jsx";
import AdminThumbnailsPage from "./components/AdminThumbnailsPage";

import {
  startHashActionRouter,
  registerHashAction,
  routeHash,
} from "./lib/hashActions";

/* -------------------------------------------------------------------------- */
/*                              Lazy Component Imports                        */
/* -------------------------------------------------------------------------- */

const ShinelStudiosHomepage = React.lazy(() =>
  import("./components/ShinelStudiosHomepage.jsx")
);
const VideoEditing = React.lazy(() => import("./components/VideoEditing.jsx"));
const Branding = React.lazy(() => import("./components/Branding.jsx"));
const Thumbnails = React.lazy(() => import("./components/Thumbnails.jsx"));
const Shorts = React.lazy(() => import("./components/Shorts.jsx"));
const LoginPage = React.lazy(() => import("./components/LoginPage.jsx"));
const ProtectedRoute = React.lazy(() =>
  import("./components/ProtectedRoute.jsx")
);
const AIStudioPage = React.lazy(() => import("./components/AIStudioPage.jsx"));
const AdminUsersPage = React.lazy(() =>
  import("./components/AdminUsersPage.jsx")
);
const LiveTemplates = React.lazy(() =>
  import("./components/LiveTemplates.jsx")
);
const ToolsIndex = React.lazy(() =>
  import("./components/tools/ToolsIndex.jsx")
);
const SrtTool = React.lazy(() => import("./components/tools/SrtTool.jsx"));
const SeoTool = React.lazy(() => import("./components/tools/SeoTool.jsx"));
const ThumbnailIdeation = React.lazy(() =>
  import("./components/tools/ThumbnailIdeation.jsx")
);
const CustomAIs = React.lazy(() => import("./components/tools/CustomAIs.jsx"));
const WorkPage = React.lazy(() => import("./components/WorkPage.jsx"));
const Pricing = React.lazy(() => import("./components/Pricing.jsx")); // ✅ New Pricing page route

// NEW
const AdminVideosPage = React.lazy(() =>
  import("./components/AdminVideosPage.jsx")
);

/* -------------------------------------------------------------------------- */
/*                             Utility Components                             */
/* -------------------------------------------------------------------------- */

function ScrollToHash() {
  const { pathname, hash } = useLocation();

  React.useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    const el = document.getElementById(id);
    if (!el) return;

    const headerOffset = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--header-h") ||
        76,
      10
    );
    const offset =
      el.getBoundingClientRect().top + window.scrollY - headerOffset - 8;

    requestAnimationFrame(() => {
      window.scrollTo({ top: offset, behavior: "smooth" });
    });
  }, [pathname, hash]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*                                   Layout                                   */
/* -------------------------------------------------------------------------- */

function Layout() {
  const [isDark, setIsDark] = React.useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
    } catch {}
    if (document.documentElement.classList.contains("dark")) return true;
    return (
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false
    );
  });

  const location = useLocation();

  // Handle dynamic header height CSS variable
  React.useEffect(() => {
    const headerEl = () => document.querySelector("header");
    const setHeaderVar = () => {
      const hEl = headerEl();
      if (hEl) {
        const h = Math.round(hEl.getBoundingClientRect().height) || 76;
        document.documentElement.style.setProperty("--header-h", `${h}px`);
      }
    };
    requestAnimationFrame(setHeaderVar);
    window.addEventListener("resize", setHeaderVar);

    const ro =
      "ResizeObserver" in window ? new ResizeObserver(setHeaderVar) : null;
    if (ro && headerEl()) ro.observe(headerEl());
    if (document.fonts?.ready) {
      document.fonts.ready
        .then(() => requestAnimationFrame(setHeaderVar))
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("resize", setHeaderVar);
      if (ro && headerEl()) ro.unobserve(headerEl());
    };
  }, [location.pathname]);

  // Handle dark/light theme state
  React.useEffect(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.toggle("dark", isDark);
      try {
        localStorage.setItem("theme", isDark ? "dark" : "light");
      } catch {}
      let metaTheme = document.querySelector(
        'meta[name="theme-color"]:not([media])'
      );
      if (!metaTheme) {
        metaTheme = document.createElement("meta");
        metaTheme.setAttribute("name", "theme-color");
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute("content", isDark ? "#0F0F0F" : "#FFFFFF");
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

/* -------------------------------------------------------------------------- */
/*                            Auth Redirect Helpers                            */
/* -------------------------------------------------------------------------- */

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
      [
        "token",
        "refresh",
        "userEmail",
        "userRole",
        "userFirst",
        "userLast",
        "rememberMe",
      ].forEach((k) => localStorage.removeItem(k));
    } catch {}
    window.dispatchEvent(new Event("auth:changed"));
  }, []);
  return <Navigate to="/" replace />;
}

/* -------------------------------------------------------------------------- */
/*                                   App Root                                 */
/* -------------------------------------------------------------------------- */

export default function App() {
  const location = useLocation();

  React.useEffect(() => {
    startHashActionRouter();
    registerHashAction(/^#\/shorts\/(\w+)$/, ([, id]) => {
      window.dispatchEvent(new CustomEvent("open:short", { detail: { id } }));
    });
    registerHashAction(/^#\/videos\/(\w+)$/, ([, id]) => {
      window.dispatchEvent(new CustomEvent("open:video", { detail: { id } }));
    });
    registerHashAction(/^#\/contact$/, () => {
      window.dispatchEvent(new Event("open:contact"));
    });
    registerHashAction(/^#\/tools$/, () => {
      window.dispatchEvent(new Event("open:tools"));
    });
    routeHash();
  }, []);

  return (
    <React.Suspense fallback={<LoadingScreen />}>
      <Routes key={location.pathname}>
        <Route element={<Layout />}>
          {/* ---------------------------- Public Pages ---------------------------- */}
          <Route index element={<ShinelStudiosHomepage />} />
          <Route path="/work" element={<WorkPage />} />
          <Route path="/pricing" element={<Pricing />} /> {/* ✅ Standalone Pricing page */}

          {/* ---------------------------- Service Pages --------------------------- */}
          <Route path="/video-editing" element={<VideoEditing />} />
          <Route path="/branding" element={<Branding />} />
          <Route path="/thumbnails" element={<Thumbnails />} />
          <Route path="/shorts" element={<Shorts />} />
          <Route path="/videos/long" element={<VideoEditing />} />
          <Route path="/videos/shorts" element={<Shorts />} />
          <Route path="/gfx/branding" element={<Branding />} />
          <Route path="/gfx/thumbnails" element={<Thumbnails />} />

          {/* ---------------------------- Auth & Studio --------------------------- */}
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <LoginPage />
              </RedirectIfAuthed>
            }
          />
          <Route path="/logout" element={<Logout />} />
          <Route
            path="/studio"
            element={
              <ProtectedRoute>
                <AIStudioPage />
              </ProtectedRoute>
            }
          />

          {/* ------------------------------- Tools -------------------------------- */}
          <Route
            path="/tools"
            element={
              <ProtectedRoute>
                <ToolsIndex />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/srt"
            element={
              <ProtectedRoute>
                <AutoSRTTool />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/seo"
            element={
              <ProtectedRoute>
                <SeoTool />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/thumbnail-ideation"
            element={
              <ProtectedRoute>
                <ThumbnailIdeation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/custom-ais"
            element={
              <ProtectedRoute>
                <CustomAIs />
              </ProtectedRoute>
            }
          />

          {/* ------------------------------- Admin -------------------------------- */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/thumbnails" element={<AdminThumbnailsPage />} />
          {/* NEW */}
          <Route
            path="/admin/videos"
            element={
              <ProtectedRoute>
                <AdminVideosPage />
              </ProtectedRoute>
            }
          />

          {/* ----------------------------- Fallback ------------------------------- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </React.Suspense>
  );
}
