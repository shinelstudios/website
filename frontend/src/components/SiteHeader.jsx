// frontend/src/components/SiteHeader.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Moon, Menu, X, ChevronDown, Lock, Wand2, Search, Languages,
  Lightbulb, Brain, UserCog, Bell, Settings, LogOut, User,
  Shield, Zap, ArrowRight, ExternalLink, Home, Briefcase, Mail,
  BarChart3, Video
} from "lucide-react";
import TrustBar from "./Trustbar.jsx"; // ✅ your new iOS-fixed marquee
import logoLight from "../assets/logo_light.png";
import logoDark from "../assets/logo_dark.png";

/* ---------------- helpers: auth + theme favicon ---------------- */
function parseJwt(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

function getAuthState() {
  try {
    const token = localStorage.getItem("token");
    const payload = token ? parseJwt(token) : null;
    const now = Math.floor(Date.now() / 1000);
    const expired = payload?.exp && payload.exp <= now;

    const email = (payload?.email || localStorage.getItem("userEmail") || "").trim();
    const role = (payload?.role || localStorage.getItem("userRole") || "").trim().toLowerCase();
    const firstName = (payload?.firstName || localStorage.getItem("userFirstName") || "").trim();
    const lastName = (payload?.lastName || localStorage.getItem("userLastName") || "").trim();

    return {
      isAuthed: Boolean(token) && !expired,
      email: email || null,
      role: role || null,
      firstName: firstName || null,
      lastName: lastName || null,
      exp: payload?.exp || null,
    };
  } catch {
    return { isAuthed: false, email: null, role: null, firstName: null, lastName: null, exp: null };
  }
}

function initialsFrom(first, last, email) {
  const a = (first || "").trim();
  const b = (last || "").trim();
  if (a || b) return `${a.charAt(0)}${b.charAt(0)}`.toUpperCase() || "?";
  const nameFromEmail = (email || "").split("@")[0] || "";
  return (nameFromEmail.charAt(0) || "?").toUpperCase();
}

function setFaviconForTheme(isDark) {
  try {
    const light = document.querySelector('link[rel="icon"][data-theme="light"]');
    const dark = document.querySelector('link[rel="icon"][data-theme="dark"]');
    if (light && dark) {
      light.disabled = !!isDark;
      dark.disabled = !isDark;
    }
    const link =
      document.getElementById("favicon") ||
      document.querySelector('link[rel="icon"]:not([data-theme])');
    if (link) link.href = isDark ? "/favicon-dark-32x32.png" : "/favicon-light-32x32.png";
  } catch {}
}

/* ---------------- NEW: Notification system ---------------- */
function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("notifications") || "[]");
      setNotifications(saved);
      setUnreadCount(saved.filter(n => !n.read).length);
    } catch {}

    const handler = (e) => {
      const newNotif = {
        id: Date.now(),
        message: e.detail.message,
        type: e.detail.type || "info",
        read: false,
        timestamp: Date.now(),
      };
      setNotifications(prev => {
        const updated = [newNotif, ...prev].slice(0, 20);
        localStorage.setItem("notifications", JSON.stringify(updated));
        return updated;
      });
      setUnreadCount(c => c + 1);
    };

    window.addEventListener("notify", handler);
    return () => window.removeEventListener("notify", handler);
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem("notifications", JSON.stringify(updated));
      return updated;
    });
    setUnreadCount(c => Math.max(0, c - 1));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem("notifications");
  }, []);

  return { notifications, unreadCount, markAsRead, clearAll };
}

/* ---------------- NEW: Keyboard shortcuts ---------------- */
function useKeyboardShortcuts(handlers) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handlers.openTools?.();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        handlers.toggleTheme?.();
      }
      if (e.key === 'Escape') {
        handlers.closeAll?.();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}

/* ---------------- tools matrix (role-gated) ---------------- */
const toolsCatalog = [
  {
    name: "Auto SRT Files (Multi-Language)",
    path: "/tools/srt",
    icon: Languages,
    roles: ["admin", "editor"],
    description: "Generate accurate subtitles in 50+ languages"
  },
  {
    name: "SEO Tool (Titles, Descriptions, Tags)",
    path: "/tools/seo",
    icon: Search,
    roles: ["admin", "editor", "client"],
    description: "Optimize content for maximum discoverability"
  },
  {
    name: "Viral Thumbnail Ideation",
    path: "/tools/thumbnail-ideation",
    icon: Lightbulb,
    roles: ["admin", "editor", "client"],
    description: "AI-powered thumbnail concepts that convert"
  },
  {
    name: "Custom AIs",
    path: "/tools/custom-ais",
    icon: Brain,
    roles: ["admin"],
    description: "Configure specialized AI workflows"
  },
  {
    name: "Admin • Users",
    path: "/admin/users",
    icon: UserCog,
    roles: ["admin"],
    description: "Manage team access and permissions"
  },
];

/* ---------------- tiny UI helpers ---------------- */
const animations = {
  fadeDown: (reduced) => reduced ? {} : {
    hidden: { opacity: 0, y: -8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
  },
  slideIn: (reduced) => reduced ? {} : {
    hidden: { opacity: 0, x: -12 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: "easeOut" } },
  },
};

/* ---------------- SiteHeader ---------------- */
const SiteHeader = ({ isDark, setIsDark }) => {
  const [auth, setAuth] = useState(getAuthState());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // nested "Work" submenu toggles (desktop)
  const [workGfxOpen, setWorkGfxOpen] = useState(false);
  const [workVidOpen, setWorkVidOpen] = useState(false);

  const [workOpen, setWorkOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState("Home");
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [headerH, setHeaderH] = useState(76);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const menuPanelRef = useRef(null);
  const workRef = useRef(null);
  const toolsRef = useRef(null);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);
  const searchInputRef = useRef(null);

  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();

  const prefersReduced = useMemo(() => {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => setFaviconForTheme(isDark), [isDark]);

  // ✅ Close EVERYTHING (safe on iOS/Android)
  const closeAllMenus = useCallback(() => {
    setToolsOpen(false);
    setWorkOpen(false);
    setWorkGfxOpen(false);
    setWorkVidOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
    setIsMenuOpen(false);
    setShowSearch(false);
    try {
      document.documentElement.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.body.style.touchAction = "";
    } catch {}
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    openTools: () => setToolsOpen(true),
    toggleTheme: () => setIsDark(d => !d),
    closeAll: () => closeAllMenus()
  });

  // Focus search when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      try { searchInputRef.current.focus(); } catch {}
    }
  }, [showSearch]);

  // react to auth changes / storage events
  useEffect(() => {
    const update = () => setAuth(getAuthState());
    window.addEventListener("storage", update);
    window.addEventListener("auth:changed", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("auth:changed", update);
    };
  }, []);

  // auto logout when exp passes
  useEffect(() => {
    if (!auth.isAuthed || !auth.exp) return;
    const now = Math.floor(Date.now() / 1000);
    const ms = Math.max(0, (auth.exp - now) * 1000 + 1000);
    const t = setTimeout(() => {
      try {
        localStorage.removeItem("token");
      } catch {}
      window.dispatchEvent(new Event("auth:changed"));
      window.dispatchEvent(new CustomEvent("notify", {
        detail: { message: "Session expired. Please login again.", type: "warning" }
      }));
    }, ms);
    return () => clearTimeout(t);
  }, [auth.isAuthed, auth.exp]);

  // header height css var (lightweight)
  useEffect(() => {
    if (!headerRef.current || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver((entries) => {
      const h = Math.round(entries[0].contentRect.height) || 76;
      setHeaderH(h);
      const root = document.documentElement;
      root.style.setProperty("--header-h", `${h}px`);
      root.style.setProperty("scroll-padding-top", `${h + 8}px`);
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--header-offset", `${headerH}px`);
  }, [headerH]);

  // scroll progress + shadow (throttled)
  useEffect(() => {
    let lastRun = 0;
    let lastProgress = progress;
    const minInterval = 40; // ms
    const changeThreshold = 0.4; // percent
    const tick = () => {
      const now = Date.now();
      if (now - lastRun < minInterval) return;
      lastRun = now;

      const y = window.scrollY || 0;
      const doc = document.documentElement;
      const h = Math.max(1, doc.scrollHeight - window.innerHeight);
      const p = Math.min(100, (y / h) * 100);
      if (Math.abs(p - lastProgress) > changeThreshold) {
        setProgress(p);
        lastProgress = p;
      }
      setScrolled(y > 6);
    };
    const onScroll = () => requestAnimationFrame(tick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // active nav based on route/hash (for basic highlight)
  useEffect(() => {
    const hash = (location.hash || "#home").replace("#", "");
    const map = { "": "Home", home: "Home", services: "Services", work: "Work", contact: "Contact" };
    setActive(map[hash] || "Home");
  }, [location.pathname, location.hash]);

  // Auto-close on navigation (fixes mobile tap not redirecting)
  useEffect(() => {
    closeAllMenus();
  }, [location.pathname, location.hash, closeAllMenus]);

  // close popovers on outside / ESC
  useEffect(() => {
    const onDocDown = (e) => {
      if (workOpen && workRef.current && !workRef.current.contains(e.target)) setWorkOpen(false);
      if (toolsOpen && toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") closeAllMenus();
    };
    document.addEventListener("pointerdown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [workOpen, toolsOpen, userMenuOpen, notifOpen, closeAllMenus]);

  // lock scroll when mobile menu open (prevents page behind from moving)
  useEffect(() => {
    const lock = (v) => {
      document.documentElement.style.overflow = v ? "hidden" : "";
      document.body.style.overscrollBehavior = v ? "contain" : "";
      document.body.style.touchAction = v ? "none" : ""; // keep this line
    };
    lock(isMenuOpen);
    return () => lock(false);
  }, [isMenuOpen]);

  const role = (auth.role || "client").toLowerCase();
  const availableTools = toolsCatalog.filter((t) => t.roles.includes(role));
  const allToolsForMenu = auth.isAuthed ? availableTools : toolsCatalog;
  const logoSrc = isDark ? logoLight : logoDark;
  const initials = initialsFrom(auth.firstName, auth.lastName, auth.email);

  // logout
  const handleLogout = useCallback(() => {
    ["token","refresh","userEmail","userFirstName","userLastName","userRole","rememberMe"].forEach((k)=>localStorage.removeItem(k));
    window.dispatchEvent(new Event("auth:changed"));
    window.dispatchEvent(new CustomEvent("notify", {
      detail: { message: "Successfully logged out", type: "success" }
    }));
    setUserMenuOpen(false);
    setIsMenuOpen(false);
    navigate("/");
  }, [navigate]);

  // helper: robust navigate (also handles hash paths) for mobile buttons
  const go = useCallback((to) => {
    setIsMenuOpen(false);
    // Unmount the sheet first; iOS WebKit sometimes swallows tap if route changes mid-transition
    setTimeout(() => {
      if (to.startsWith("/#")) {
        // let the router keep us on the same page and update the hash
        const [path, hash] = to.split("#");
        if (path && path !== "/") navigate(path, { replace: false });
        // use native hash so ScrollToHash runs and offsets by header
        window.location.hash = `#${hash}`;
      } else {
        navigate(to);
      }
    }, 0);
  }, [navigate]);

  // tool search filter
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return allToolsForMenu;
    const q = searchQuery.toLowerCase();
    return allToolsForMenu.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [searchQuery, allToolsForMenu]);

  const NavLink = ({ label, to, icon: Icon }) => {
    const isActive = active === label;
    const reduced = prefersReduced;

    // Handle hash links with an onClick so iOS navigates reliably
    const isHash = to.includes("#");
    const onClick = isHash
      ? (e) => {
          e.preventDefault();
          closeAllMenus();
          const [path, hash] = to.split("#");
          if (path && path !== location.pathname) navigate(path, { replace: false });
          // Use native update: App’s ScrollToHash will offset correctly
          window.location.hash = `#${hash}`;
        }
      : closeAllMenus;

    return (
      <motion.div whileHover={reduced ? {} : { y: -1 }} transition={{ duration: 0.14 }}>
        <Link
          to={to}
          className="relative px-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded flex items-center gap-1.5"
          aria-current={isActive ? "page" : undefined}
          onMouseEnter={() => setHovered(label)}
          onMouseLeave={() => setHovered(null)}
          style={{ color: isActive ? "var(--nav-hover)" : "var(--nav-link)" }}
          onClick={onClick}
        >
          {Icon && <Icon size={16} />}
          <span
            className="absolute left-0 -bottom-1 h-[2px] bg-[var(--orange)] transition-all duration-200 rounded-full"
            style={{ width: isActive || hovered === label ? "100%" : "0%" }}
          />
          <span>{label}</span>
        </Link>
      </motion.div>
    );
  };

  // trust items (static)
  const trustItems = useMemo(() => ([
    { icon: Wand2, text: "AI-first studio • human-directed quality" },
    { icon: UserCog, text: "20+ active clients across niches" },
    { icon: BarChart3, text: "Thumbnails delivering +40% CTR" },
    { icon: Zap, text: "Edits driving 2× watch time" },
    { icon: ExternalLink, text: "7M+ views driven for clients" },
    { icon: Languages, text: "Auto-captions & multi-language subs" },
    { icon: Shield, text: "Consent-first face/voice features" },
    { icon: Lightbulb, text: "Hook scoring & title testing" },
    { icon: Brain, text: "Script co-pilot for ideation" },
    { text: "48–72 hr standard turnaround" },
    { text: "Dedicated PM & weekly checkpoints" },
  ]), []);

  return (
    <motion.div className="fixed top-0 w-full z-50">
      <motion.header
        ref={headerRef}
        variants={animations.fadeDown(prefersReduced)}
        initial="hidden"
        animate="visible"
        role="banner"
        style={{
          background: "color-mix(in oklab, var(--header-bg) 88%, transparent) 0% / cover",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "0",
          boxShadow: scrolled ? "0 10px 28px rgba(0,0,0,0.18)" : "none",
          transition: "box-shadow .25s ease, background-color .25s ease",
          overflow: "visible",
        }}
      >
        {/* progress hairline */}
        <div
          className="absolute left-0 top-0 h-[2px] origin-left"
          style={{
            width: "100%",
            transform: `scaleX(${Math.max(0, Math.min(1, progress / 100)).toFixed(4)})`,
            background: "linear-gradient(90deg, var(--orange), #ff9357)",
            transition: "transform .12s linear",
            opacity: scrolled ? 1 : 0.95,
          }}
          aria-hidden="true"
        />

        {/* nav row */}
        <nav
          className="container mx-auto px-4 flex items-center justify-between"
          style={{
            paddingTop: scrolled ? "6px" : "10px",
            paddingBottom: scrolled ? "6px" : "10px",
            transition: "padding .2s ease",
            position: "relative",
            zIndex: 3,
          }}
          aria-label="Primary"
        >
          {/* logo + badge */}
          <Link
            to="/"
            onClick={closeAllMenus}
            className="flex items-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
          >
            <div className="h-12 flex items-center overflow-visible">
              <motion.img
                src={logoSrc}
                alt="Shinel Studios"
                className="h-auto w-36 sm:w-44 object-contain block select-none"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
                decoding="async"
                initial={prefersReduced ? {} : { opacity: 0, scale: 0.96 }}
                animate={prefersReduced ? {} : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.36, ease: "easeOut" }}
              />
            </div>
            <span
              className="ml-2 hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                color: "var(--orange)",
                border: "1px solid var(--border)",
                background: "rgba(232,80,2,0.08)",
              }}
            >
              <Wand2 size={12} />
              AI-first
            </span>
          </Link>

          {/* desktop nav */}
          <div className="hidden md:flex items-center gap-8 relative">
            <NavLink label="Home" to="/" icon={Home} />
            <NavLink label="Services" to="/#services" icon={Briefcase} />

            {/* Work dropdown (desktop) */}
            <div className="relative" ref={workRef}>
              <motion.button
                type="button"
                className="inline-flex items-center gap-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
                aria-expanded={workOpen}
                aria-haspopup="menu"
                aria-controls="work-menu"
                onClick={() => {
                  setWorkOpen(v => !v);
                  if (!workOpen) { setWorkGfxOpen(false); setWorkVidOpen(false); }
                }}
                initial={false}
                style={{ color: hovered === "Work" || workOpen ? "var(--nav-hover)" : "var(--nav-link)" }}
                whileHover={prefersReduced ? {} : { y: -1 }}
                transition={{ duration: 0.22 }}
                onMouseEnter={() => setHovered("Work")}
                onMouseLeave={() => setHovered(null)}
              >
                <BarChart3 size={16} />
                <span className="nav-label">Work</span>
                <ChevronDown size={16} className={`ml-1 transition-transform ${workOpen ? "rotate-180" : ""}`} />
              </motion.button>

              <AnimatePresence>
                {workOpen && (
                  <motion.div
                    id="work-menu"
                    role="menu"
                    initial={prefersReduced ? {} : { opacity: 0, scale: 0.98, y: 6 }}
                    animate={prefersReduced ? {} : { opacity: 1, scale: 1, y: 0 }}
                    exit={prefersReduced ? {} : { opacity: 0, scale: 0.98, y: 6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute left-0 mt-3 w-[420px] rounded-2xl shadow-xl overflow-hidden"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", zIndex: 4 }}
                  >
                    <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                      <div className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
                        Explore our work
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-0">
                      {/* GFX column */}
                      <div className="p-3 border-r" style={{ borderColor: "var(--border)" }}>
                        <button
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                          style={{ color: "var(--text)" }}
                          onClick={() => {
                            setWorkGfxOpen(v => !v);
                            if (!workGfxOpen) setWorkVidOpen(false);
                          }}
                          aria-expanded={workGfxOpen}
                          aria-controls="work-gfx-submenu"
                        >
                          <span className="flex items-center gap-2">
                            <Wand2 size={16} style={{ color: "var(--orange)" }} />
                            GFX
                          </span>
                          <ChevronDown size={16} className={`transition-transform ${workGfxOpen ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence initial={false}>
                          {workGfxOpen && (
                            <motion.div
                              id="work-gfx-submenu"
                              role="menu"
                              initial={prefersReduced ? {} : { height: 0, opacity: 0 }}
                              animate={prefersReduced ? {} : { height: "auto", opacity: 1 }}
                              exit={prefersReduced ? {} : { height: 0, opacity: 0 }}
                              className="overflow-hidden mt-2"
                            >
                              <ul className="space-y-1">
                                <li>
                                  <Link
                                    to="/gfx/thumbnails"
                                    className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                                    style={{ color: "var(--text)" }}
                                    onClick={closeAllMenus}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-alt)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                  >
                                    <span>Thumbnails</span>
                                    <ArrowRight size={14} style={{ color: "var(--orange)" }} />
                                  </Link>
                                </li>
                                <li>
                                  <Link
                                    to="/gfx/branding"
                                    className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                                    style={{ color: "var(--text)" }}
                                    onClick={closeAllMenus}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-alt)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                  >
                                    <span>Logo / Banner / Overlays (3-in-1)</span>
                                    <ArrowRight size={14} style={{ color: "var(--orange)" }} />
                                  </Link>
                                </li>
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Videos column */}
                      <div className="p-3">
                        <button
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                          style={{ color: "var(--text)" }}
                          onClick={() => {
                            setWorkVidOpen(v => !v);
                            if (!workVidOpen) setWorkGfxOpen(false);
                          }}
                          aria-expanded={workVidOpen}
                          aria-controls="work-vid-submenu"
                        >
                          <span className="flex items-center gap-2">
                            <Video size={16} style={{ color: "var(--orange)" }} />
                            Videos
                          </span>
                          <ChevronDown size={16} className={`transition-transform ${workVidOpen ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence initial={false}>
                          {workVidOpen && (
                            <motion.div
                              id="work-vid-submenu"
                              role="menu"
                              initial={prefersReduced ? {} : { height: 0, opacity: 0 }}
                              animate={prefersReduced ? {} : { height: "auto", opacity: 1 }}
                              exit={prefersReduced ? {} : { height: 0, opacity: 0 }}
                              className="overflow-hidden mt-2"
                            >
                              <ul className="space-y-1">
                                <li>
                                  <Link
                                    to="/videos/shorts"
                                    className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                                    style={{ color: "var(--text)" }}
                                    onClick={closeAllMenus}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-alt)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                  >
                                    <span>Shorts</span>
                                    <ArrowRight size={14} style={{ color: "var(--orange)" }} />
                                  </Link>
                                </li>
                                <li>
                                  <Link
                                    to="/videos/long"
                                    className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                                    style={{ color: "var(--text)" }}
                                    onClick={closeAllMenus}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-alt)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                  >
                                    <span>Long Videos</span>
                                    <ArrowRight size={14} style={{ color: "var(--orange)" }} />
                                  </Link>
                                </li>
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="px-4 py-3 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                      Tip: Use <kbd className="px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border)" }}>Esc</kbd> to close menus.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <NavLink label="Contact" to="/#contact" icon={Mail} />

            {/* Tools dropdown with search */}
            <div className="relative" ref={toolsRef}>
              <motion.button
                type="button"
                className="inline-flex items-center gap-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
                aria-controls="ai-tools-menu"
                onClick={() => setToolsOpen((v) => !v)}
                initial={false}
                style={{ color: hovered === "Tools" || toolsOpen ? "var(--nav-hover)" : "var(--nav-link)" }}
                whileHover={prefersReduced ? {} : { y: -1 }}
                transition={{ duration: 0.22 }}
              >
                <Zap size={16} />
                <span className="nav-label">Tools</span>
                {!auth.isAuthed && <Lock size={14} className="ml-1 opacity-70" />}
                <ChevronDown size={16} className={`ml-1 transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
              </motion.button>

              <AnimatePresence>
                {toolsOpen && (
                  <motion.div
                    id="ai-tools-menu"
                    role="menu"
                    initial={prefersReduced ? {} : { opacity: 0, scale: 0.98, y: 6 }}
                    animate={prefersReduced ? {} : { opacity: 1, scale: 1, y: 0 }}
                    exit={prefersReduced ? {} : { opacity: 0, scale: 0.98, y: 6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute left-0 mt-3 w-[380px] rounded-2xl shadow-xl overflow-hidden"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", zIndex: 4 }}
                  >
                    {/* Header with search */}
                    <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
                          {auth.isAuthed ? `Your tools • ${role}` : "AI Tools · Login required"}
                        </div>
                        <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
                          <span>⌘</span>K
                        </kbd>
                      </div>

                      {/* Quick search */}
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                        <input
                          type="text"
                          placeholder="Search tools..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                          style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                        />
                      </div>
                    </div>

                    {/* Tools list */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {filteredTools.length > 0 ? (
                        filteredTools.map((t, i) => {
                          const Icon = t.icon;
                          const allowed = auth.isAuthed && t.roles.includes(role);
                          const to = allowed ? t.path : "/login?next=/studio";
                          return (
                            <Link
                              key={t.name}
                              role="menuitem"
                              tabIndex={0}
                              to={to}
                              className="flex items-start gap-3 w-full px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                              style={{
                                color: "var(--text)",
                                transition: "color .15s, background-color .15s",
                                borderBottom: i === filteredTools.length - 1 ? "0" : "1px solid var(--border)",
                                opacity: auth.isAuthed ? (allowed ? 1 : 0.6) : 1,
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-alt)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                              onClick={() => {
                                setToolsOpen(false);
                                setSearchQuery("");
                                closeAllMenus();
                              }}
                              aria-label={allowed ? t.name : `${t.name} (login required)`}
                            >
                              <div
                                className="w-10 h-10 rounded-lg grid place-items-center shrink-0"
                                style={{ background: "rgba(232,80,2,0.10)", border: "1px solid var(--border)" }}
                                aria-hidden="true"
                              >
                                {Icon && <Icon size={20} style={{ color: "var(--orange)" }} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium flex items-center gap-2">
                                  <span className="truncate">{t.name}</span>
                                  {!allowed && <Lock size={12} className="opacity-70 shrink-0" />}
                                </div>
                                {t.description && (
                                  <div className="text-xs mt-0.5 opacity-80" style={{ color: "var(--text-muted)" }}>
                                    {t.description}
                                  </div>
                                )}
                              </div>
                              <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 shrink-0" style={{ color: "var(--orange)" }} />
                            </Link>
                          );
                        })
                      ) : (
                        <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                          No tools found for "{searchQuery}"
                        </div>
                      )}
                    </div>

                    {!auth.isAuthed && (
                      <div className="p-4 border-t" style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}>
                        <Link
                          to="/login"
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                          style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                          onClick={() => {
                            setToolsOpen(false);
                            closeAllMenus();
                          }}
                        >
                          Login to unlock all tools
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* right actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {auth.isAuthed ? (
              <>
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <motion.button
                    onClick={() => setNotifOpen(v => !v)}
                    className="hidden md:flex p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] relative"
                    style={{ background: notifOpen ? "var(--surface-alt)" : "transparent", color: "var(--text)" }}
                    aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                    whileHover={prefersReduced ? {} : { scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                        style={{ background: "var(--orange)", color: "#fff" }}
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div
                        initial={prefersReduced ? {} : { opacity: 0, scale: 0.98, y: 6 }}
                        animate={prefersReduced ? {} : { opacity: 1, scale: 1, y: 0 }}
                        exit={prefersReduced ? {} : { opacity: 0, scale: 0.98, y: 6 }}
                        className="absolute right-0 mt-3 w-[320px] rounded-2xl shadow-xl overflow-hidden"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)", zIndex: 4 }}
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                          <div className="font-semibold" style={{ color: "var(--text)" }}>
                            Notifications
                          </div>
                          {notifications.length > 0 && (
                            <button onClick={clearAll} className="text-xs underline" style={{ color: "var(--text-muted)" }}>
                              Clear all
                            </button>
                          )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                          {notifications.length > 0 ? (
                            notifications.map(n => (
                              <motion.div
                                key={n.id}
                                className="px-4 py-3 border-b cursor-pointer"
                                style={{
                                  borderColor: "var(--border)",
                                  background: n.read ? "transparent" : "rgba(232,80,2,0.05)",
                                }}
                                onClick={() => markAsRead(n.id)}
                                whileHover={prefersReduced ? {} : { background: "var(--surface-alt)" }}
                              >
                                <div className="text-sm" style={{ color: "var(--text)" }}>
                                  {n.message}
                                </div>
                                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                                  {new Date(n.timestamp).toLocaleTimeString()}
                                </div>
                              </motion.div>
                            ))
                          ) : (
                            <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                              No notifications yet
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* User menu */}
                <div className="relative" ref={userMenuRef}>
                  <motion.button
                    onClick={() => setUserMenuOpen(v => !v)}
                    className="hidden md:flex items-center gap-2 px-2 py-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                    style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
                    whileHover={prefersReduced ? {} : { scale: 1.02 }}
                    whileTap={prefersReduced ? {} : { scale: 0.98 }}
                  >
                    <div
                      className="h-7 w-7 rounded-full grid place-items-center text-[11px] font-bold"
                      style={{ background: "var(--orange)", color: "#fff" }}
                      title={`${auth.firstName || ""} ${auth.lastName || ""}`.trim() || auth.email || ""}
                    >
                      {initials}
                    </div>
                    <span className="text-sm font-medium max-w-[100px] truncate" style={{ color: "var(--text)" }}>
                      {auth.firstName || auth.email || "Account"}
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                  </motion.button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={prefersReduced ? {} : { opacity: 0, scale: 0.98, y: 6 }}
                        animate={prefersReduced ? {} : { opacity: 1, scale: 1, y: 0 }}
                        exit={prefersReduced ? {} : { opacity: 0, scale: 0.98, y: 6 }}
                        className="absolute right-0 mt-3 w-[280px] rounded-2xl shadow-xl overflow-hidden"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)", zIndex: 4 }}
                      >
                        {/* User info */}
                        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-10 rounded-full grid place-items-center text-sm font-bold"
                              style={{ background: "var(--orange)", color: "#fff" }}
                            >
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate" style={{ color: "var(--text)" }}>
                                {`${auth.firstName || ""} ${auth.lastName || ""}`.trim() || "User"}
                              </div>
                              <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                                {auth.email}
                              </div>
                              {role && (
                                <span
                                  className="inline-block mt-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full"
                                  style={{ background: "rgba(232,80,2,0.15)", color: "var(--orange)" }}
                                >
                                  {role}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Menu items */}
                        <div className="py-2">
                          <Link
                            to="/studio"
                            onClick={() => { setUserMenuOpen(false); closeAllMenus(); }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium focus:outline-none"
                            style={{ color: "var(--text)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-alt)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >
                            <Briefcase size={18} style={{ color: "var(--orange)" }} />
                            <span>Studio</span>
                          </Link>

                          <Link
                            to="/profile"
                            onClick={() => { setUserMenuOpen(false); closeAllMenus(); }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium focus:outline-none"
                            style={{ color: "var(--text)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-alt)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >
                            <User size={18} style={{ color: "var(--orange)" }} />
                            <span>Profile</span>
                          </Link>

                          <Link
                            to="/settings"
                            onClick={() => { setUserMenuOpen(false); closeAllMenus(); }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium focus:outline-none"
                            style={{ color: "var(--text)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-alt)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >
                            <Settings size={18} style={{ color: "var(--orange)" }} />
                            <span>Settings</span>
                          </Link>

                          {role === "admin" && (
                            <Link
                              to="/admin"
                              onClick={() => { setUserMenuOpen(false); closeAllMenus(); }}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium focus:outline-none"
                              style={{ color: "var(--text)" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-alt)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                              <Shield size={18} style={{ color: "var(--orange)" }} />
                              <span>Admin Panel</span>
                            </Link>
                          )}
                        </div>

                        {/* Logout */}
                        <div className="border-t px-2 py-2" style={{ borderColor: "var(--border)" }}>
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                            style={{ color: "var(--text)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-alt)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >
                            <LogOut size={18} style={{ color: "var(--orange)" }} />
                            <span>Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile: Studio button */}
                <Link
                  to="/studio"
                  className="md:hidden inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                  onClick={closeAllMenus}
                >
                  Studio
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="md:hidden inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                  onClick={closeAllMenus}
                >
                  Login
                </Link>
                <motion.div className="hidden md:inline-flex gap-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                    style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                    onClick={closeAllMenus}
                  >
                    Login
                  </Link>
                </motion.div>
              </>
            )}

            {/* theme toggle */}
            {typeof isDark === "boolean" && typeof setIsDark === "function" && (
              <motion.button
                onClick={() => setIsDark((v) => !v)}
                className="p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{
                  background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  color: "var(--text)",
                }}
                aria-label="Toggle theme"
                aria-pressed={isDark}
                whileTap={prefersReduced ? {} : { rotate: 180, scale: 0.9 }}
                transition={{ duration: 0.32 }}
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </motion.button>
            )}

            {/* mobile menu toggle */}
            <motion.button
              onClick={() => setIsMenuOpen((s) => !s)}
              className="md:hidden p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
              style={{ color: "var(--text)" }}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              whileTap={{ scale: 0.95 }}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>
          </div>
        </nav>

        {/* mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.aside
              id="mobile-menu"
              ref={menuPanelRef}
              initial={prefersReduced ? {} : { opacity: 0, y: -8 }}
              animate={prefersReduced ? {} : { opacity: 1, y: 0 }}
              exit={prefersReduced ? {} : { opacity: 0, y: -8 }}
              className="md:hidden fixed left-0 right-0"
              style={{
                top: `var(--header-h, ${headerH}px)`,
                height: "calc(100dvh - var(--header-h, 76px))",
                background: "var(--surface)",
                borderTop: "1px solid var(--border)",
                zIndex: 60,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
                paddingBottom: "max(12px, env(safe-area-inset-bottom))",
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
            >
              <nav className="px-4 py-3">
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-muted)" }}
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search tools..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                      style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                  </div>
                </div>

                {/* Main nav links */}
                <ul className="flex flex-col gap-2">
                  <li>
                    <button
                      onClick={() => go("/")}
                      className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-base font-medium"
                      style={{ color: "var(--text)", background: "var(--surface-alt)", border: "1px solid var(--border)" }}
                    >
                      <Home size={20} style={{ color: "var(--orange)" }} /> Home
                    </button>
                  </li>

                  <li>
                    <button
                      onClick={() => go("/#services")}
                      className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-base font-medium"
                      style={{ color: "var(--text)", background: "var(--surface-alt)", border: "1px solid var(--border)" }}
                    >
                      <Briefcase size={20} style={{ color: "var(--orange)" }} /> Services
                    </button>
                  </li>

                  {/* Work accordion */}
                  <li>
                    <button
                      type="button"
                      className="flex items-center justify-between w-full rounded-xl px-4 py-3 text-base font-medium"
                      style={{ color: "var(--text)", background: "var(--surface-alt)", border: "1px solid var(--border)" }}
                      aria-expanded={workOpen}
                      aria-controls="mobile-work-accordion"
                      onClick={() => setWorkOpen(v => !v)}
                    >
                      <span className="flex items-center gap-3">
                        <BarChart3 size={20} style={{ color: "var(--orange)" }} />
                        Work
                      </span>
                      <ChevronDown size={18} className={`transition-transform ${workOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence initial={false}>
                      {workOpen && (
                        <motion.div
                          id="mobile-work-accordion"
                          initial={prefersReduced ? {} : { height: 0, opacity: 0 }}
                          animate={prefersReduced ? {} : { height: "auto", opacity: 1 }}
                          exit={prefersReduced ? {} : { height: 0, opacity: 0 }}
                          className="overflow-hidden mt-2 ml-2"
                        >
                          {/* GFX subgroup */}
                          <div className="mb-2">
                            <div className="px-3 py-2 text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                              GFX
                            </div>
                            <div className="grid gap-2">
                              <button
                                onClick={() => go("/gfx/thumbnails")}
                                className="flex items-center justify-between px-4 py-2 rounded-lg text-sm"
                                style={{ color: "var(--text)", background: "var(--surface-alt)", border: "1px solid var(--border)" }}
                              >
                                Thumbnails <ArrowRight size={14} style={{ color: "var(--orange)" }} />
                              </button>
                              <button
                                onClick={() => go("/gfx/branding")}
                                className="flex items-center justify-between px-4 py-2 rounded-lg text-sm"
                                style={{ color: "var(--text)", background: "var(--surface-alt)", border: "1px solid var(--border)" }}
                              >
                                Logo / Banner / Overlays (3-in-1) <ArrowRight size={14} style={{ color: "var(--orange)" }} />
                              </button>
                            </div>
                          </div>

                          {/* Videos subgroup */}
                          <div className="mb-1">
                            <div className="px-3 py-2 text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                              Videos
                            </div>
                            <div className="grid gap-2">
                              <button
                                onClick={() => go("/videos/shorts")}
                                className="flex items-center justify-between px-4 py-2 rounded-lg text-sm"
                                style={{ color: "var(--text)", background: "var(--surface-alt)", border: "1px solid var(--border)" }}
                              >
                                Shorts <ArrowRight size={14} style={{ color: "var(--orange)" }} />
                              </button>
                              <button
                                onClick={() => go("/videos/long")}
                                className="flex items-center justify-between px-4 py-2 rounded-lg text-sm"
                                style={{ color: "var(--text)", background: "var(--surface-alt)", border: "1px solid var(--border)" }}
                              >
                                Long Videos <ArrowRight size={14} style={{ color: "var(--orange)" }} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>

                  <li>
                    <button
                      onClick={() => go("/#contact")}
                      className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-base font-medium"
                      style={{ color: "var(--text)", background: "var(--surface-alt)", border: "1px solid var(--border)" }}
                    >
                      <Mail size={20} style={{ color: "var(--orange)" }} /> Contact
                    </button>
                  </li>
                </ul>
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Trust Bar under header on every page */}
        <TrustBar
          items={trustItems}
          prefersReduced={prefersReduced}
          forceMotion   // ✅ ensure iOS always animates the marquee
          speed={45}
          direction="rtl"
        />
      </motion.header>

      {/* Keyboard shortcuts help (Cmd+K etc.) */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
            style={{ zIndex: 60 }}
            initial={prefersReduced ? {} : { opacity: 0 }}
            animate={prefersReduced ? {} : { opacity: 1 }}
            exit={prefersReduced ? {} : { opacity: 0 }}
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              className="w-full max-w-2xl rounded-2xl overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              initial={prefersReduced ? {} : { scale: 0.98, y: -10 }}
              animate={prefersReduced ? {} : { scale: 1, y: 0 }}
              exit={prefersReduced ? {} : { scale: 0.98, y: -10 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-xl font-bold mb-4" style={{ color: "var(--text)" }}>
                  Keyboard Shortcuts
                </h3>
                <div className="space-y-3">
                  {[
                    { keys: ["⌘", "K"], action: "Open Tools" },
                    { keys: ["⌘", "/"], action: "Toggle Theme" },
                    { keys: ["Esc"], action: "Close Menus" },
                  ].map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span style={{ color: "var(--text)" }}>{shortcut.action}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, ki) => (
                          <kbd
                            key={ki}
                            className="px-2 py-1 rounded text-xs font-mono"
                            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SiteHeader;
