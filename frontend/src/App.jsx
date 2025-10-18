// src/App.jsx
import React from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import SiteHeader from "./components/SiteHeader.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import AutoSRTTool from "./components/tools/AutoSRTTool.jsx";

/* ▶️ Hash-action router (generic handlers for ALL #/... links) */
import { startHashActionRouter, registerHashAction, routeHash } from "./lib/hashActions";

/* Pages (lazy) */
const ShinelStudiosHomepage = React.lazy(() => import("./components/ShinelStudiosHomepage.jsx"));
const VideoEditing = React.lazy(() => import("./components/VideoEditing.jsx"));
const Branding = React.lazy(() => import("./components/Branding.jsx")); // ✅ replaced GFX
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
    let cancelled = false;

    const routeToId = () => {
      const p = pathname.replace(/\/+$/, "");
      switch (p) {
        case "/":
          return (hash && hash.replace("#", "")) || "home";
        case "/branding":
        case "/gfx/branding":
          return "branding";
        case "/gfx/thumbnails":
        case "/thumbnails":
          return "thumbnails";
        case "/videos/shorts":
        case "/shorts":
          return "top";
        case "/videos/long":
        case "/video-editing":
          return "top";
        default:
          if (hash) return hash.replace("#", "");
          return null;
      }
    };

    const getHeaderH = () => {
      const css = getComputedStyle(document.documentElement).getPropertyValue("--header-h");
      const parsed = parseInt(css);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 76;
    };

    const doScroll = () => {
      if (cancelled) return true;
      const id = routeToId();
      if (id) {
        const el = document.getElementById(id);
        if (!el) return false;
        const offset = el.getBoundingClientRect().top + window.scrollY - getHeaderH() - 8;
        window.scrollTo({ top: offset, behavior: "instant" in window ? "instant" : "auto" });
        requestAnimationFrame(() => {
          if (!cancelled) window.scrollTo({ top: offset, behavior: "smooth" });
        });
        return true;
      } else {
        window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
        requestAnimationFrame(() => {
          if (!cancelled) window.scrollTo({ top: 0, behavior: "smooth" });
        });
        return true;
      }
    };

    let tries = 0;
    const maxTries = 40;
    const t = setInterval(() => {
      const done = doScroll();
      if (done || ++tries >= maxTries) clearInterval(t);
    }, 60);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
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

  const location = useLocation();
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
    const ro = "ResizeObserver" in window ? new ResizeObserver(setHeaderVar) : null;
    if (ro && headerEl()) ro.observe(headerEl());
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(setHeaderVar)).catch(() => {});
    }
    return () => {
      window.removeEventListener("resize", setHeaderVar);
      if (ro && headerEl()) ro.unobserve(headerEl());
    };
  }, [location.pathname]);

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
          <Route index element={<ShinelStudiosHomepage />} />
          <Route path="/video-editing" element={<VideoEditing />} />
          <Route path="/branding" element={<Branding />} />
          <Route path="/thumbnails" element={<Thumbnails />} />
          <Route path="/shorts" element={<Shorts />} />
          <Route path="/videos/long" element={<VideoEditing />} />
          <Route path="/videos/shorts" element={<Shorts />} />
          <Route path="/gfx/branding" element={<Branding />} />
          <Route path="/gfx/thumbnails" element={<Thumbnails />} />
          <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/studio" element={<ProtectedRoute><AIStudioPage /></ProtectedRoute>} />
          <Route path="/tools" element={<ProtectedRoute><ToolsIndex /></ProtectedRoute>} />
          <Route path="/tools/srt" element={<ProtectedRoute><AutoSRTTool /></ProtectedRoute>} />
          <Route path="/tools/seo" element={<ProtectedRoute><SeoTool /></ProtectedRoute>} />
          <Route path="/tools/thumbnail-ideation" element={<ProtectedRoute><ThumbnailIdeation /></ProtectedRoute>} />
          <Route path="/tools/custom-ais" element={<ProtectedRoute><CustomAIs /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </React.Suspense>
  );
}
