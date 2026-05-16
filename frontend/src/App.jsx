/**
 * App.jsx
 * 
 * About: Core routing and layout component for the Shinel Studios website.
 * Used in: main.jsx
 * Features: React Router setup, Lazy loading, Dark/Light theme management, Scroll to Hash, Auth state handling.
 */
import React from "react";
import ToastHost from "./components/ui/Toast";
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
const ThumbnailClickability = React.lazy(() =>
  import("./components/tools/ThumbnailClickability.jsx")
);
const ChannelAudit = React.lazy(() =>
  import("./components/tools/ChannelAudit.jsx")
);
const ContentCalendar = React.lazy(() =>
  import("./components/tools/ContentCalendar.jsx")
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
const AiMusicPage = React.lazy(() => import("./components/work/AiMusicPage.jsx"));
const AiTattooPage = React.lazy(() => import("./components/work/AiTattooPage.jsx"));
const AiGfxPage = React.lazy(() => import("./components/work/AiGfxPage.jsx"));
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
const AdminTestimonialsPage = React.lazy(() => import("./components/AdminTestimonialsPage.jsx"));
const AdminLandingPagesPage = React.lazy(() => import("./components/AdminLandingPagesPage.jsx"));
const AdminLiveTemplatesPage = React.lazy(() => import("./components/AdminLiveTemplatesPage.jsx"));
const MediaHub = React.lazy(() => import("./components/hub/MediaHub.jsx"));
const NotFound = React.lazy(() => import("./components/NotFound.jsx"));
const ClientDashboard = React.lazy(() => import("./components/hub/ClientDashboard.jsx"));
const OpsCockpit = React.lazy(() => import("./components/hub/OpsCockpit.jsx"));
const ClientDeepDive = React.lazy(() => import("./components/hub/ClientDeepDive.jsx"));
const ProjectsPage = React.lazy(() => import("./components/hub/ProjectsPage.jsx"));
const EditorMe = React.lazy(() => import("./components/hub/EditorMe.jsx"));
const EditorPublicPage = React.lazy(() => import("./components/EditorPublicPage.jsx"));
const MobileBottomNav = React.lazy(() => import("./components/hub/MobileBottomNav.jsx"));
const ServicePage = React.lazy(() => import("./components/pages/ServicePage.jsx"));
const AboutPage = React.lazy(() => import("./components/pages/AboutPage.jsx"));
const FAQPage = React.lazy(() => import("./components/pages/FAQPage.jsx"));

// Client Portal v1 — public per-client pages at /c/<slug> + self-edit at /clients/me/*
const ClientPublicPage = React.lazy(() => import("./components/c/ClientPublicPage.jsx"));
const ClientPortalDashboard = React.lazy(() => import("./components/clientportal/ClientPortalDashboard.jsx"));
const ClientPortalEditor = React.lazy(() => import("./components/clientportal/ClientPortalEditor.jsx"));
const ClientPortalInbox = React.lazy(() => import("./components/clientportal/ClientPortalInbox.jsx"));

// Stable role list for the dashboard guard. Defined at module scope so the
// reference is identical across renders — past behaviour: an inline
// [...] literal in the <ProtectedRoute roles={...}> JSX created a new
// array every parent render, which made ProtectedRoute's
// useEffect(..., [loc.pathname, roles]) re-run every time and spam
// /auth/refresh. The 5s refresh_lock now in the worker would catch a
// runaway loop, but the cleanest fix is just not to churn the identity.
const TEAM_ROLES = ["admin", "team", "editor", "artist"];


/* -------------------------------------------------------------------------- */
/*                             Utility Components                             */
/* -------------------------------------------------------------------------- */

// Two jobs:
//   - New route with no hash  → jump to top instantly (prevents the "opens
//     mid-page" bug where the previous page's scroll position was kept).
//   - Route with #hash         → smooth-scroll to the target, offset by header.
// React Router's default PUSH navigation preserves scroll across routes, which
// is almost never what visitors expect on a marketing site.
function ScrollToHash() {
  const { pathname, hash } = useLocation();

  React.useEffect(() => {
    if (hash) {
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
      return;
    }

    // No hash → route change. Jump to top so the new page starts at its hero.
    // Using "auto" not "smooth" because smooth-scrolling from mid-page to the
    // top of a brand-new page feels like a glitch.
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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
    // passive: true so Android Chrome doesn't throttle the resize fires
    // (it warns + back-pressures non-passive resize/scroll listeners)
    window.addEventListener("resize", setHeaderVar, { passive: true });

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
      <MobileBottomNav />
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
  if (!isAuthed) return children;
  // Role-aware bounce — clients land in their own portal, not /studio.
  let target = "/studio";
  try {
    const roles = (localStorage.getItem("role") || "").toLowerCase().split(",").map(s => s.trim());
    if (roles.includes("client") && !roles.includes("admin") && !roles.includes("team")) {
      target = "/clients/me";
    }
  } catch { /* */ }
  return <Navigate to={target} replace />;
}

// Run logout side-effects synchronously (not inside useEffect) so that listeners
// receive `auth:changed` BEFORE the Navigate unmounts this component. Previously
// the effect fired after the redirect, which let subscribers miss the event.
//
// Now also returns a Promise so callers can wait for the server-side
// revocation before navigating away — past behaviour was fire-and-forget,
// which on slow Android networks meant the user reloaded with the
// `ss_refresh` cookie still valid → /auth/refresh handed them a fresh
// access token → they appeared "still logged in" after a logout.
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
    // Best-effort cache invalidation so the SW doesn't keep serving
    // authed-fetch responses (e.g. /thumbnails) to a logged-out user.
    try {
      if (typeof caches !== "undefined" && caches?.keys) {
        caches.keys().then((names) =>
          Promise.all(names.map((n) => caches.delete(n).catch(() => false)))
        ).catch(() => { /* */ });
      }
    } catch { /* */ }
  } catch { /* */ }
  try { window.dispatchEvent(new Event("auth:changed")); } catch { /* */ }

  // Server-side revocation. Race the fetch against a 1.5 s timeout so a
  // slow network doesn't leave the user staring at /logout for 30 s, but
  // the cookie clear at least gets a fair shot before we navigate away.
  const revokePromise = fetch(`${AUTH_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
    keepalive: true, // helps the request survive even if the page unloads first
  }).catch(() => null);
  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
  return Promise.race([revokePromise, timeoutPromise]);
}

function Logout() {
  // Wait for the server-side cookie clear (or the 1.5 s timeout) before
  // bouncing to /. Without the wait, the cookie often outlives the
  // redirect, especially on mobile networks. Show a tiny "Logging out…"
  // marker so the user knows something is happening.
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    performLogout().finally(() => { if (!cancelled) setDone(true); });
    return () => { cancelled = true; };
  }, []);
  if (done) return <Navigate to="/" replace />;
  return (
    <main style={{
      minHeight: "100dvh",
      display: "grid",
      placeItems: "center",
      background: "var(--surface, #0a0a0a)",
      color: "var(--text, #f5f5f5)",
      fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 32,
          height: 32,
          margin: "0 auto 16px",
          border: "3px solid rgba(232,80,2,0.2)",
          borderTopColor: "#E85002",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted, #a3a3a3)" }}>
          Logging out…
        </div>
      </div>
    </main>
  );
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
      <ToastHost />
      <Routes key={location.pathname}>
        <Route element={<Layout />}>
          {/* ---------------------------- Public Pages ---------------------------- */}
          <Route index element={<ShinelStudiosHomepage />} />
          <Route path="/work" element={<WorkPage />} />
          <Route path="/work/ai-music" element={<AiMusicPage />} />
          <Route path="/work/ai-tattoo" element={<AiTattooPage />} />
          <Route path="/work/ai-gfx" element={<AiGfxPage />} />
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

          {/* The old /work/:slug → /portfolio/:slug redirect was a no-op:
              react-router's <Navigate to=> doesn't interpolate route params,
              so any /work/<anything> not matching /work/ai-music|ai-tattoo|
              ai-gfx above ended up on the literal /portfolio/:slug page and
              produced a "Profile not found" dead-end. Deleted; the SPA's
              NotFound catch-all handles unknown /work/* paths cleanly. */}

          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/live-templates" element={<LiveTemplates />} />

          {/* Client portal — public per-client pages (/c/<slug>) + self-edit (/clients/me/*) */}
          <Route path="/c/:slug" element={<ClientPublicPage />} />
          <Route
            path="/clients/me"
            element={
              <ProtectedRoute>
                <ClientPortalDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/me/edit"
            element={
              <ProtectedRoute>
                <ClientPortalEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/me/inbox"
            element={
              <ProtectedRoute>
                <ClientPortalInbox />
              </ProtectedRoute>
            }
          />

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

          <Route
            path="/tools/thumbnail-clickability"
            element={<ThumbnailClickability />}
          />

          <Route path="/tools/channel-audit" element={<ChannelAudit />} />
          <Route path="/tools/content-calendar" element={<ContentCalendar />} />


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

          {/* Editor self-view — anyone authenticated; the worker matches their
              email against editors.email and returns only their own queue. */}
          <Route path="/editor/me" element={
            <ProtectedRoute>
              <EditorMe />
            </ProtectedRoute>
          } />

          {/* Public editor portfolio page — no auth required.
              The worker filters by public_enabled=1 so unpublished editors 404. */}
          <Route path="/editor/:slug" element={<EditorPublicPage />} />

          {/* ----------------------------- Dashboard ------------------------------ */}
          <Route path="/hub" element={
            <ProtectedRoute>
              <ClientDashboard />
            </ProtectedRoute>
          } />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={TEAM_ROLES}>
                <ManagementHub />
              </ProtectedRoute>
            }
          >
            {/* /dashboard root → cockpit (used to render AdminStats which is now
                redundant with the cockpit). AdminStats stays available at
                /dashboard/legacy-stats for the few diagnostics that haven't
                been ported yet (Pulse X-Ray expanded, Recent Activity feed). */}
            <Route index element={<Navigate to="/dashboard/ops" replace />} />
            <Route path="legacy-stats" element={<AdminStats />} />
            <Route path="overview" element={<ClientDashboard />} />
            <Route path="ops" element={<OpsCockpit />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="clients" element={<AdminClientsPage />} />
            <Route path="clients/:id" element={<ClientDeepDive />} />
            <Route path="leads" element={<AdminLeadsPage />} />
            <Route path="videos" element={<Navigate to="/dashboard/media?tab=videos" replace />} />
            <Route path="thumbnails" element={<Navigate to="/dashboard/media?tab=thumbnails" replace />} />
            <Route path="blog" element={<AdminBlogPage />} />
            <Route path="blog/:slug" element={<AdminBlogEditor />} />
            <Route path="media" element={<MediaHub />} />
            <Route path="audits" element={<WeeklyAuditLog />} />
            <Route path="metrics" element={<AdminMetricsPage />} />
            <Route path="testimonials" element={<AdminTestimonialsPage />} />
            <Route path="landing-pages" element={<AdminLandingPagesPage />} />
            <Route path="live-templates" element={<AdminLiveTemplatesPage />} />
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
