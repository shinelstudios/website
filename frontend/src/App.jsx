/**
 * App.jsx
 * 
 * About: Core routing and layout component for the Shinel Studios website.
 * Used in: main.jsx
 * Features: React Router setup, Lazy loading, Dark/Light theme management, Scroll to Hash, Auth state handling.
 */
import React from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import SiteHeader from "./components/SiteHeader.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";

import AutoSRTTool from "./components/tools/AutoSRTTool.jsx";
const AdminThumbnailsPage = React.lazy(() => import("./components/AdminThumbnailsPage.jsx"));
const AdminSettingsPage = React.lazy(() => import("./components/AdminSettingsPage.jsx"));
import Toaster from "./components/ui/Toaster.jsx";
import CookieConsent from "./components/CookieConsent.jsx";
import CommandPalette from "./components/ui/CommandPalette.jsx";

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
const ToolsIndex = React.lazy(() =>
  import("./components/tools/ToolsIndex.jsx")
);
const SrtTool = React.lazy(() => import("./components/tools/SrtTool.jsx"));
const SeoTool = React.lazy(() => import("./components/tools/SeoTool.jsx"));
const ThumbnailIdeation = React.lazy(() =>
  import("./components/tools/ThumbnailIdeation.jsx")
);
const ThumbnailPreviewer = React.lazy(() =>
  import("./components/tools/ThumbnailPreviewer.jsx")
);

const CustomAIs = React.lazy(() => import("./components/tools/CustomAIs.jsx"));

// Public SEO Tool Pages
const RoiCalculatorPage = React.lazy(() => import("./components/pages/RoiCalculatorPage.jsx"));
const ThumbnailPreviewerPage = React.lazy(() => import("./components/pages/ThumbnailPreviewerPage.jsx"));
const SrtToolPage = React.lazy(() => import("./components/pages/SrtToolPage.jsx"));
const ThumbnailTesterPage = React.lazy(() => import("./components/pages/ThumbnailTesterPage.jsx")); // HMR Force
const EditorLeaderboardPage = React.lazy(() => import("./components/pages/EditorLeaderboardPage.jsx"));
const SeoToolPage = React.lazy(() => import("./components/pages/SeoToolPage.jsx"));
const ComparisonToolPage = React.lazy(() => import("./components/pages/ComparisonToolPage.jsx"));

const WorkPage = React.lazy(() => import("./components/WorkPage.jsx"));
const Pricing = React.lazy(() => import("./components/Pricing.jsx"));
const BudgetCalculatorPage = React.lazy(() => import("./components/pages/BudgetCalculatorPage.jsx"));
const BlogIndex = React.lazy(() => import("./components/blog/BlogIndex.jsx"));
const BlogPost = React.lazy(() => import("./components/blog/BlogPost.jsx"));

const AdminVideosPage = React.lazy(() =>
  import("./components/AdminVideosPage.jsx")
);

// ✅ NEW: Services pages
const ServiceCategoryPage = React.lazy(() =>
  import("./components/ServiceCategoryPage.jsx")
);
const ServiceSubcategoryPage = React.lazy(() =>
  import("./components/ServiceSubcategoryPage.jsx")
);
const PrivacyPage = React.lazy(() => import("./components/PrivacyPage.jsx"));
const TermsPage = React.lazy(() => import("./components/TermsPage.jsx"));
const ClientPulsePage = React.lazy(() => import("./components/ClientPulsePage.jsx"));
const AdminClientsPage = React.lazy(() => import("./components/AdminClientsPage.jsx"));
const PortfolioPage = React.lazy(() => import("./components/PortfolioPage.jsx"));
const ManagementHub = React.lazy(() => import("./components/ManagementHub.jsx"));
const AdminStats = React.lazy(() => import("./components/AdminStats.jsx"));
const LiveTemplates = React.lazy(() => import("./components/LiveTemplates.jsx"));
const AdminLeadsPage = React.lazy(() => import("./components/AdminLeadsPage.jsx"));
const WeeklyAuditLog = React.lazy(() => import("./components/WeeklyAuditLog.jsx"));
const AdminBlogPage = React.lazy(() => import("./components/AdminBlogPage.jsx"));
const AdminBlogEditor = React.lazy(() => import("./components/AdminBlogEditor.jsx"));
const NotFound = React.lazy(() => import("./components/NotFound.jsx"));
const ClientDashboard = React.lazy(() => import("./components/hub/ClientDashboard.jsx"));
const ServicePage = React.lazy(() => import("./components/pages/ServicePage.jsx"));


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
    } catch { }
    if (document.documentElement.classList.contains("dark")) return true;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });

  const location = useLocation();

  // Header height CSS variable
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
        .catch(() => { });
    }

    return () => {
      window.removeEventListener("resize", setHeaderVar);
      if (ro && headerEl()) ro.unobserve(headerEl());
    };
  }, [location.pathname]);

  // Dark/light theme
  React.useEffect(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.toggle("dark", isDark);
      try {
        localStorage.setItem("theme", isDark ? "dark" : "light");
      } catch { }

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
      <Toaster />
      <CookieConsent />
      <CommandPalette />
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
      // ✅ Canonical keys
      [
        "token",
        "refresh",
        "userEmail",
        "role",
        "firstName",
        "lastName",
        "rememberMe",
      ].forEach((k) => localStorage.removeItem(k));

      // ✅ Back-compat keys (safe to remove too)
      [
        "userRole",
        "userFirst",
        "userLast",
        "userFirstName",
        "userLastName",
        "userEmailAddress",
      ].forEach((k) => localStorage.removeItem(k));
    } catch { }

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
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/pricing/calculator" element={<BudgetCalculatorPage />} />
          <Route path="/live" element={<ClientPulsePage />} />

          {/* ---------------------- Services + Subcategories ---------------------- */}
          <Route
            path="/services/:categoryKey"
            element={<ServiceCategoryPage />}
          />
          <Route
            path="/services/:categoryKey/:itemKey"
            element={<ServiceCategoryPage />}
          />
          <Route
            path="/services/:categoryKey/:itemKey/:subKey"
            element={<ServiceSubcategoryPage />}
          />

          {/* Programmatic SEO Pages */}
          <Route path="/industries/:niche" element={<ServicePage />} />

          {/* ---------------------------- Service Pages --------------------------- */}
          <Route path="/video-editing" element={<VideoEditing />} />
          <Route path="/branding" element={<Branding />} />
          <Route path="/thumbnails" element={<Thumbnails />} />
          <Route path="/shorts" element={<Shorts />} />

          {/* Blog & Insights */}
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogPost />} />

          {/* Public Tool Landing Pages (SEO) */}
          <Route path="/roi-calculator" element={<RoiCalculatorPage />} />
          <Route path="/tools/thumbnail-previewer" element={<ThumbnailPreviewerPage />} />
          <Route path="/tools/thumbnail-tester" element={<ThumbnailTesterPage />} />
          <Route path="/tools/srt" element={<SrtToolPage />} />
          <Route path="/tools/seo" element={<SeoToolPage />} />
          <Route path="/tools/comparison" element={<ComparisonToolPage />} />

          {/* Redirect aliases to canonical paths */}
          <Route path="/videos/long" element={<Navigate to="/video-editing" replace />} />
          <Route path="/videos/shorts" element={<Navigate to="/shorts" replace />} />
          <Route path="/gfx" element={<Navigate to="/services/gfx" replace />} />
          <Route path="/gfx/branding" element={<Navigate to="/branding" replace />} />
          <Route path="/gfx/thumbnails" element={<Navigate to="/thumbnails" replace />} />

          {/* Deep link redirects for SEO/Consistency */}
          <Route path="/services/gfx/thumbnails" element={<Navigate to="/thumbnails" replace />} />
          <Route path="/services/gfx/branding" element={<Navigate to="/branding" replace />} />
          <Route path="/services/editing/shorts" element={<Navigate to="/shorts" replace />} />
          <Route path="/services/editing/long" element={<Navigate to="/video-editing" replace />} />

          <Route path="/pulse" element={<Navigate to="/live" replace />} />

          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/live-templates" element={<LiveTemplates />} />

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
          <Route path="/portfolio/:slug" element={<PortfolioPage />} />

          <Route
            path="/studio"
            element={
              <ProtectedRoute>
                <AIStudioPage />
              </ProtectedRoute>
            }
          />

          {/* ------------------------------- Tools -------------------------------- */}
          {/* Keep tools index public or protected as you prefer.
              Header already gates tool links via /login?next=. */}
          <Route path="/tools" element={<ToolsIndex />} />



          <Route
            path="/tools/thumbnail-ideation"
            element={
              <ProtectedRoute>
                <ThumbnailIdeation />
              </ProtectedRoute>
            }
          />


          <Route
            path="/tools/youtube-captions"
            element={
              <ProtectedRoute>
                <AutoSRTTool />
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

          <Route path="/leaderboard" element={
            <ProtectedRoute>
              <EditorLeaderboardPage />
            </ProtectedRoute>
          } />

          {/* ----------------------------- Dashboard ------------------------------ */}
          <Route path="/hub" element={
            <ProtectedRoute>
              <ClientDashboard />
            </ProtectedRoute>
          } />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ManagementHub />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminStats />} />
            <Route path="overview" element={<ClientDashboard />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="clients" element={<AdminClientsPage />} />
            <Route path="leads" element={<AdminLeadsPage />} />
            <Route path="videos" element={<AdminVideosPage />} />

            <Route path="thumbnails" element={<AdminThumbnailsPage />} />
            <Route path="blog" element={<AdminBlogPage />} />
            <Route path="blog/:slug" element={<AdminBlogEditor />} />
            <Route path="audits" element={<WeeklyAuditLog />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>

          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin/users" element={<Navigate to="/dashboard/users" replace />} />
          <Route path="/admin/clients" element={<Navigate to="/dashboard/clients" replace />} />
          <Route path="/admin/videos" element={<Navigate to="/dashboard/videos" replace />} />
          <Route path="/admin/thumbnails" element={<Navigate to="/dashboard/thumbnails" replace />} />

          {/* ----------------------------- Fallback ------------------------------- */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </React.Suspense>
  );
}
