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

// import AutoSRTTool from "./components/tools/AutoSRTTool.jsx";
const AdminThumbnailsPage = React.lazy(() => import("./components/AdminThumbnailsPage.jsx"));
const AdminSettingsPage = React.lazy(() => import("./components/AdminSettingsPage.jsx"));
import Toaster from "./components/ui/Toaster.jsx";
import CookieConsent from "./components/CookieConsent.jsx";
import CommandPalette from "./components/ui/CommandPalette.jsx";
import { getAccessToken, setAccessToken, clearAccessToken, refreshOnce } from "./utils/tokenStore";
import { startWebVitals } from "./utils/webVitals";
import { AUTH_BASE } from "./config/constants";

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
// SrtTool is imported by SrtToolPage directly — no need to lazy-load it here.
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
const ThumbnailIdeationPage = React.lazy(() => import("./components/pages/ThumbnailIdeationPage.jsx"));
// const YoutubeCaptionsPage = React.lazy(() => import("./components/pages/YoutubeCaptionsPage.jsx"));
const CustomAIsPage = React.lazy(() => import("./components/pages/CustomAIsPage.jsx"));

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
const TeamIndex = React.lazy(() => import("./components/TeamIndex.jsx"));
const MyProfilePage = React.lazy(() => import("./components/MyProfilePage.jsx"));
const GraphicDesignPage = React.lazy(() => import("./components/GraphicDesignPage.jsx"));
const ContactPage = React.lazy(() => import("./components/ContactPage.jsx"));
const ManagementHub = React.lazy(() => import("./components/ManagementHub.jsx"));
const AdminStats = React.lazy(() => import("./components/AdminStats.jsx"));
const LiveTemplates = React.lazy(() => import("./components/LiveTemplates.jsx"));
const AdminLeadsPage = React.lazy(() => import("./components/AdminLeadsPage.jsx"));
const WeeklyAuditLog = React.lazy(() => import("./components/WeeklyAuditLog.jsx"));
const AdminBlogPage = React.lazy(() => import("./components/AdminBlogPage.jsx"));
const AdminBlogEditor = React.lazy(() => import("./components/AdminBlogEditor.jsx"));
const AdminMetricsPage = React.lazy(() => import("./components/AdminMetricsPage.jsx"));
const MediaHub = React.lazy(() => import("./components/hub/MediaHub.jsx"));
const NotFound = React.lazy(() => import("./components/NotFound.jsx"));
const ClientDashboard = React.lazy(() => import("./components/hub/ClientDashboard.jsx"));
const ServicePage = React.lazy(() => import("./components/pages/ServicePage.jsx"));
const AboutPage = React.lazy(() => import("./components/pages/AboutPage.jsx"));
const FAQPage = React.lazy(() => import("./components/pages/FAQPage.jsx"));


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
      {!location.pathname.startsWith("/dashboard") && !location.pathname.startsWith("/studio") && (
        <SiteFooter isDark={isDark} />
      )}
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
      return Boolean(getAccessToken());
    } catch {
      return false;
    }
  }, []);
  return isAuthed ? <Navigate to="/studio" replace /> : children;
}

// Run logout side-effects synchronously (not inside useEffect) so that listeners
// receive `auth:changed` BEFORE the Navigate unmounts this component. Previously
// the effect fired after the redirect, which let subscribers miss the event.
function performLogout() {
  try {
    clearAccessToken();
    const legacy = [
      "token", "refresh", "refreshToken",
      "userEmail", "role", "firstName", "lastName", "rememberMe",
      "userRole", "userFirst", "userLast", "userFirstName", "userLastName", "userEmailAddress",
    ];
    for (const k of legacy) {
      try { localStorage.removeItem(k); } catch { /* */ }
    }
    // Best-effort server-side revocation via httpOnly cookie — don't block UX on it.
    fetch(`${AUTH_BASE}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
  } catch { /* */ }
  try { window.dispatchEvent(new Event("auth:changed")); } catch { /* */ }
}

function Logout() {
  // Synchronous on render; useMemo runs before the returned <Navigate> takes effect.
  React.useMemo(() => { performLogout(); }, []);
  return <Navigate to="/" replace />;
}

/* -------------------------------------------------------------------------- */
/*                                   App Root                                 */
/* -------------------------------------------------------------------------- */

export default function App() {
  const location = useLocation();

  // Silent refresh on mount. Access token lives only in memory (tokenStore) — so on
  // every page load we redeem the httpOnly ss_refresh cookie for a fresh access
  // token. A 401 simply means "stay logged out". refreshOnce() dedupes concurrent
  // callers (App.jsx + ProtectedRoute) so only one network call is made per page.
  React.useEffect(() => { refreshOnce(AUTH_BASE); }, []);

  // Core Web Vitals beacon. Anonymous, respects DNT, skipped on localhost.
  // Single POST per pageview on visibility-hidden / pagehide.
  React.useEffect(() => { startWebVitals(AUTH_BASE); }, []);

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
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FAQPage />} />

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
          <Route path="/gfx" element={<Navigate to="/work" replace />} />
          <Route path="/gfx/branding" element={<Navigate to="/branding" replace />} />
          <Route path="/gfx/thumbnails" element={<Navigate to="/thumbnails" replace />} />
          {/* No "/services" landing \u2014 Work page is the single browse surface.
              Anyone who types /services (or an un-aliased /services/<something>) lands on /work. */}
          <Route path="/services" element={<Navigate to="/work" replace />} />

          {/* Guard against service slugs colliding with /portfolio/:slug (team profile).
              Someone typing /portfolio/graphic-design gets the service page, not a
              "profile not found" screen. */}
          <Route path="/portfolio/graphic-design" element={<Navigate to="/graphic-design" replace />} />
          <Route path="/portfolio/video-editing" element={<Navigate to="/video-editing" replace />} />
          <Route path="/portfolio/branding" element={<Navigate to="/branding" replace />} />
          <Route path="/portfolio/thumbnails" element={<Navigate to="/thumbnails" replace />} />
          <Route path="/portfolio/shorts" element={<Navigate to="/shorts" replace />} />

          {/* Deep link redirects for SEO/Consistency */}
          <Route path="/services/gfx/thumbnails" element={<Navigate to="/thumbnails" replace />} />
          <Route path="/services/gfx/branding" element={<Navigate to="/branding" replace />} />
          <Route path="/services/editing/shorts" element={<Navigate to="/shorts" replace />} />
          <Route path="/services/editing/long" element={<Navigate to="/video-editing" replace />} />

          <Route path="/pulse" element={<Navigate to="/live" replace />} />
          <Route path="/work/:slug" element={<Navigate to="/portfolio/:slug" replace />} />

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
          <Route path="/team" element={<TeamIndex />} />
          <Route path="/team/:slug" element={<PortfolioPage />} />
          <Route path="/services/graphic-design" element={<GraphicDesignPage />} />
          <Route path="/graphic-design" element={<GraphicDesignPage />} />
          <Route path="/contact" element={<ContactPage />} />
          {/* Legacy /profile and /settings links in SiteHeader user-menu
              were never wired to real routes. Point them to the live
              self-serve editor at /me so the menu items stop 404ing. */}
          <Route path="/profile" element={<Navigate to="/me" replace />} />
          <Route path="/settings" element={<Navigate to="/me" replace />} />
          <Route
            path="/me"
            element={
              <ProtectedRoute>
                <MyProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/me/settings"
            element={
              <ProtectedRoute>
                <MyProfilePage />
              </ProtectedRoute>
            }
          />

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
            element={<ThumbnailIdeationPage />}
          />


          {/* YouTube Captions page hidden — requires a yt-dlp backend at
              CAPTIONS_API_URL. Unhide when a host is available. */}
          {/* <Route
            path="/tools/youtube-captions"
            element={<YoutubeCaptionsPage />}
          /> */}


          <Route
            path="/tools/custom-ais"
            element={<CustomAIsPage />}
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
            <Route path="videos" element={<Navigate to="/dashboard/media?tab=videos" replace />} />
            <Route path="thumbnails" element={<Navigate to="/dashboard/media?tab=thumbnails" replace />} />
            <Route path="blog" element={<AdminBlogPage />} />
            <Route path="blog/:slug" element={<AdminBlogEditor />} />
            <Route path="media" element={<MediaHub />} />
            <Route path="audits" element={<WeeklyAuditLog />} />
            <Route path="metrics" element={<AdminMetricsPage />} />
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
