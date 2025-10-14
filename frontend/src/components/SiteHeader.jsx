import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Moon, Menu, X, ChevronDown, Lock, Wand2, Search, Languages,
  Lightbulb, Brain, UserCog, Bell, Settings, LogOut, User,
  Shield, Zap, ArrowRight, ExternalLink, Home, Briefcase, Mail,
  BarChart3
} from "lucide-react";
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
      // Cmd/Ctrl + K: Search/Tools
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handlers.openTools?.();
      }
      // Cmd/Ctrl + /: Toggle theme
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        handlers.toggleTheme?.();
      }
      // Esc: Close all menus
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

  // Keyboard shortcuts
  useKeyboardShortcuts({
    openTools: () => setToolsOpen(true),
    toggleTheme: () => setIsDark(d => !d),
    closeAll: () => {
      setToolsOpen(false);
      setWorkOpen(false);
      setUserMenuOpen(false);
      setNotifOpen(false);
      setIsMenuOpen(false);
      setShowSearch(false);
    }
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

  // scroll progress + shadow (throttled & delta-check for CPU friendlier updates)
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
    // initial
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally no progress as dependency to avoid frequent rebinds

  // active nav based on route/hash
  useEffect(() => {
    const hash = (location.hash || "#home").replace("#", "");
    const map = { "": "Home", home: "Home", services: "Services", work: "Work", contact: "Contact" };
    setActive(map[hash] || "Home");
  }, [location.pathname, location.hash]);

  // close popovers on outside / ESC
  useEffect(() => {
    const onDocDown = (e) => {
      if (workOpen && workRef.current && !workRef.current.contains(e.target)) setWorkOpen(false);
      if (toolsOpen && toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setWorkOpen(false);
        setToolsOpen(false);
        setUserMenuOpen(false);
        setNotifOpen(false);
        setIsMenuOpen(false);
        setShowSearch(false);
      }
    };
    document.addEventListener("pointerdown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [workOpen, toolsOpen, userMenuOpen, notifOpen]);

  // lock scroll when mobile menu open
  useEffect(() => {
    const lock = (v) => {
      document.documentElement.style.overflow = v ? "hidden" : "";
      document.body.style.overscrollBehavior = v ? "contain" : "";
    };
    lock(isMenuOpen);
    return () => lock(false);
  }, [isMenuOpen]);

  const role = (auth.role || "client").toLowerCase();
  const availableTools = toolsCatalog.filter((t) => t.roles.includes(role));
  const allToolsForMenu = auth.isAuthed ? availableTools : toolsCatalog;
  const logoSrc = isDark ? logoLight : logoDark;
  const initials = initialsFrom(auth.firstName, auth.lastName, auth.email);

  // NEW: Handle logout
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

  // NEW: Quick search filter
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
    return (
      <motion.div whileHover={reduced ? {} : { y: -1 }} transition={{ duration: 0.14 }}>
        <Link
          to={to}
          className="relative px-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded flex items-center gap-1.5"
          aria-current={isActive ? "page" : undefined}
          onMouseEnter={() => setHovered(label)}
          onMouseLeave={() => setHovered(null)}
          style={{ color: isActive ? "var(--nav-hover)" : "var(--nav-link)" }}
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

  // Memoize trust items (static)
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
            {/* Work now has an icon (BarChart3) like others */}
            <NavLink label="Work" to="/#work" icon={BarChart3} />
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
                style={{
                  color: hovered === "Tools" || toolsOpen ? "var(--nav-hover)" : "var(--nav-link)",
                }}
                whileHover={prefersReduced ? {} : { y: -1 }}
                transition={{ duration: 0.22 }}
              >
                <Zap size={16} />
                <span className="nav-label">Tools</span>
                {!auth.isAuthed && <Lock size={14} className="ml-1 opacity-70" />}
                <ChevronDown
                  size={16}
                  className={`ml-1 transition-transform ${toolsOpen ? "rotate-180" : ""}`}
                />
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
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      zIndex: 4,
                    }}
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
                          style={{
                            background: "var(--surface-alt)",
                            border: "1px solid var(--border)",
                            color: "var(--text)",
                          }}
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
                          onClick={() => setToolsOpen(false)}
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
                    style={{
                      background: notifOpen ? "var(--surface-alt)" : "transparent",
                      color: "var(--text)",
                    }}
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
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          zIndex: 4,
                        }}
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                          <div className="font-semibold" style={{ color: "var(--text)" }}>
                            Notifications
                          </div>
                          {notifications.length > 0 && (
                            <button
                              onClick={clearAll}
                              className="text-xs underline"
                              style={{ color: "var(--text-muted)" }}
                            >
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
                    style={{
                      background: userMenuOpen ? "var(--surface-alt)" : "var(--surface-alt)",
                      border: "1px solid var(--border)"
                    }}
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
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                    />
                  </motion.button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={prefersReduced ? {} : { opacity: 0, scale: 0.98, y: 6 }}
                        animate={prefersReduced ? {} : { opacity: 1, scale: 1, y: 0 }}
                        exit={prefersReduced ? {} : { opacity: 0, scale: 0.98, y: 6 }}
                        className="absolute right-0 mt-3 w-[280px] rounded-2xl shadow-xl overflow-hidden"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          zIndex: 4,
                        }}
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
                            onClick={() => setUserMenuOpen(false)}
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
                            onClick={() => setUserMenuOpen(false)}
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
                            onClick={() => setUserMenuOpen(false)}
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
                              onClick={() => setUserMenuOpen(false)}
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
                >
                  Login
                </Link>
                <motion.div className="hidden md:inline-flex gap-2">
                  {/* Sign Up removed as requested */}
                  <Link
                    to="/login"
                    className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                    style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
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
            <motion.div
              id="mobile-menu"
              ref={menuPanelRef}
              initial={prefersReduced ? {} : { height: 0, opacity: 0 }}
              animate={prefersReduced ? {} : { height: "auto", opacity: 1 }}
              exit={prefersReduced ? {} : { height: 0, opacity: 0 }}
              className="md:hidden"
              style={{
                background: "var(--surface)",
                borderTop: "1px solid var(--border)",
                paddingBottom: "max(12px, env(safe-area-inset-bottom))",
                position: "relative",
                zIndex: 3,
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
            >
              <nav className="px-4 py-3">
                {/* Search in mobile */}
                <div className="mb-4">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search tools..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                      style={{
                        background: "var(--surface-alt)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    />
                  </div>
                </div>

                {/* Main nav links */}
                <ul className="flex flex-col gap-2">
                  {[
                    { label: "Home", to: "/", icon: Home },
                    { label: "Services", to: "/#services", icon: Briefcase },
                    { label: "Work", to: "/#work", icon: BarChart3 },
                    { label: "Contact", to: "/#contact", icon: Mail }
                  ].map((item) => (
                    <li key={item.label}>
                      <Link
                        to={item.to}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                        style={{
                          color: "var(--text)",
                          background: "var(--surface-alt)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {item.icon && <item.icon size={20} style={{ color: "var(--orange)" }} />}
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Tools quick links */}
                <div className="mt-4">
                  <div
                    className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider flex items-center justify-between"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <span>{auth.isAuthed ? `Your tools • ${role}` : "AI Tools (login)"}</span>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-xs normal-case underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(searchQuery ? filteredTools : toolsCatalog).slice(0, 6).map((t) => {
                      const Icon = t.icon;
                      const allowed = auth.isAuthed && t.roles.includes(role);
                      const to = allowed ? t.path : "/login?next=/studio";
                      return (
                        <Link
                          key={t.name}
                          to={to}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                          style={{
                            color: "var(--text)",
                            background: "var(--surface-alt)",
                            border: "1px solid var(--border)",
                            opacity: auth.isAuthed ? (allowed ? 1 : 0.6) : 1,
                          }}
                        >
                          <div className="relative">
                            {Icon && <Icon size={24} style={{ color: "var(--orange)" }} />}
                            {!allowed && (
                              <Lock size={10} className="absolute -top-1 -right-1 opacity-70" />
                            )}
                          </div>
                          <span className="text-xs text-center line-clamp-2">{t.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Notifications in mobile */}
                {auth.isAuthed && notifications.length > 0 && (
                  <div className="mt-4">
                    <div
                      className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider flex items-center justify-between"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span>Notifications ({unreadCount})</span>
                      <button
                        onClick={clearAll}
                        className="text-xs normal-case underline"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {notifications.slice(0, 3).map(n => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className="px-3 py-2 rounded-lg text-sm"
                          style={{
                            background: n.read ? "var(--surface-alt)" : "rgba(232,80,2,0.08)",
                            border: "1px solid var(--border)",
                            color: "var(--text)",
                          }}
                        >
                          {n.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* auth summary / actions */}
                {!auth.isAuthed ? (
                  <div className="mt-6 flex flex-col gap-2">
                    {/* Sign Up removed as requested */}
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full rounded-full px-5 py-3 text-center font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                      style={{
                        color: "var(--text)",
                        background: "linear-gradient(90deg, var(--orange), #ff9357)",
                      }}
                    >
                      Login
                    </Link>
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between px-1 text-sm" style={{ color: "var(--text)" }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold"
                          style={{ background: "var(--orange)", color: "#fff" }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{auth.firstName || auth.email || "Signed in"}</div>
                          {role && (
                            <span
                              className="inline-block text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0"
                              style={{ background: "var(--border)", color: "var(--text-muted)" }}
                            >
                              {role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                        style={{
                          color: "var(--text)",
                          background: "var(--surface-alt)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <User size={16} />
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                        style={{
                          color: "var(--text)",
                          background: "var(--surface-alt)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <Settings size={16} />
                        Settings
                      </Link>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold"
                      style={{
                        color: "var(--text)",
                        background: "var(--surface-alt)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <TrustBar items={trustItems} prefersReduced={prefersReduced} />
      </motion.header>

      {/* Keyboard shortcuts help - Show on Cmd+? */}
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
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
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
                            style={{
                              background: "var(--surface-alt)",
                              border: "1px solid var(--border)",
                              color: "var(--text)",
                            }}
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

/* ---------------- Trust Bar (iOS-Fixed & Enhanced) ---------------- */
const TrustBar = ({ items, prefersReduced }) => {
  const elements = items || [];
  const trackRef = useRef(null);
  const containerRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const animationFrameRef = useRef(null);

  // Memoize duplicated items for better performance
  const duplicatedItems = useMemo(() => [...elements, ...elements, ...elements], [elements]);

  // Detect iOS
  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
  }, []);

  // iOS-specific: Ensure animation starts properly
  useEffect(() => {
    if (!prefersReduced && trackRef.current && isIOS) {
      const track = trackRef.current;
      
      // Multiple strategies to ensure iOS animation works
      const startAnimation = () => {
        // Strategy 1: Remove and re-add animation
        track.style.animation = 'none';
        track.offsetHeight; // Force reflow
        track.style.animation = '';
        
        // Strategy 2: Force GPU layer creation
        track.style.transform = 'translate3d(0, 0, 0)';
        track.style.webkitTransform = 'translate3d(0, 0, 0)';
        
        // Strategy 3: Trigger animation via class
        track.classList.remove('animate');
        void track.offsetWidth; // Force reflow
        track.classList.add('animate');
      };

      // Initial start
      const timer1 = setTimeout(startAnimation, 100);
      
      // Backup start (in case iOS is slow)
      const timer2 = setTimeout(startAnimation, 500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [prefersReduced, isIOS]);

  // Pause animation when tab is not visible (performance boost)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      
      // On iOS, restart animation when tab becomes visible
      if (visible && isIOS && trackRef.current) {
        const track = trackRef.current;
        track.style.animation = 'none';
        track.offsetHeight;
        track.style.animation = '';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isIOS]);

  // Enhanced touch handling for iOS - prevents animation stop
  const handleTouchStart = (e) => {
    setIsPaused(true);
  };

  const handleTouchEnd = (e) => {
    setIsPaused(false);
    
    // Restart animation on iOS after touch
    if (isIOS && trackRef.current) {
      const track = trackRef.current;
      requestAnimationFrame(() => {
        track.style.animation = 'none';
        track.offsetHeight;
        track.style.animation = '';
      });
    }
  };

  // Handle mouse events
  const handleMouseEnter = () => {
    if (!isIOS) {
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isIOS) {
      setIsPaused(false);
    }
  };

  return (
    <div
      className="w-full trustbar"
      style={{
        background: "var(--header-bg)",
        boxShadow: "inset 0 1px 0 var(--border)",
        position: "relative",
        zIndex: 2,
        overflow: "hidden",
        WebkitOverflowScrolling: "touch",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {prefersReduced ? (
        // Static version for users who prefer reduced motion
        <div 
          className="static-trust-bar"
          style={{ 
            padding: "0.625rem 1rem", 
            display: "flex", 
            gap: "1.5rem", 
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {elements.map((item, i) => (
            <div 
              key={`static-${i}`} 
              style={{ 
                whiteSpace: "nowrap", 
                fontSize: "0.75rem", 
                color: "var(--text)", 
                display: "inline-flex", 
                gap: "0.5rem", 
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              {item.icon && <item.icon size={14} style={{ color: "var(--orange)", flexShrink: 0 }} />}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      ) : (
        // Animated marquee version
        <div
          ref={containerRef}
          className="marquee-container"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            position: "relative",
            overflow: "hidden",
            cursor: "default",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
        >
          {/* Gradient masks for smooth fade */}
          <div
            className="marquee-mask-left"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "clamp(20px, 8%, 60px)",
              background: "linear-gradient(90deg, var(--header-bg) 0%, transparent 100%)",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
          <div
            className="marquee-mask-right"
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "clamp(20px, 8%, 60px)",
              background: "linear-gradient(90deg, transparent 0%, var(--header-bg) 100%)",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />

          {/* Scrolling content */}
          <div
            ref={trackRef}
            className={`marquee-track animate ${isPaused ? 'paused' : ''} ${!isVisible ? 'hidden-tab' : ''} ${isIOS ? 'ios-track' : ''}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "2rem",
              padding: "0.625rem 0",
              whiteSpace: "nowrap",
            }}
          >
            {duplicatedItems.map((item, i) => (
              <span 
                key={`item-${i}`} 
                className="marquee-item"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "clamp(0.6875rem, 1.5vw, 0.875rem)",
                  lineHeight: 1.2,
                  color: "var(--text)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {item.icon && (
                  <item.icon 
                    size={14} 
                    style={{ 
                      color: "var(--orange)", 
                      flexShrink: 0,
                      minWidth: "14px",
                      minHeight: "14px",
                    }} 
                  />
                )}
                <span>{item.text}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <style>{`
        /* Base styles */
        .trustbar {
          --marquee-duration: 45s;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* Hide scrollbar for static version */
        .static-trust-bar::-webkit-scrollbar {
          display: none;
        }

        /* iOS-optimized marquee animation with hardware acceleration */
        @keyframes marquee-scroll {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-33.333%, 0, 0);
          }
        }

        @-webkit-keyframes marquee-scroll {
          0% {
            -webkit-transform: translate3d(0, 0, 0);
            transform: translate3d(0, 0, 0);
          }
          100% {
            -webkit-transform: translate3d(-33.333%, 0, 0);
            transform: translate3d(-33.333%, 0, 0);
          }
        }

        /* Base track styles with GPU acceleration */
        .marquee-track {
          will-change: transform;
          transform: translate3d(0, 0, 0);
          -webkit-transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          perspective: 1000px;
          -webkit-perspective: 1000px;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
        }

        /* Animation application */
        .marquee-track.animate {
          animation: marquee-scroll var(--marquee-duration) linear infinite;
          -webkit-animation: marquee-scroll var(--marquee-duration) linear infinite;
        }

        /* iOS-specific enhancements */
        .marquee-track.ios-track {
          -webkit-font-smoothing: subpixel-antialiased;
          font-smoothing: subpixel-antialiased;
          -webkit-transform: translate3d(0, 0, 0.01px);
          transform: translate3d(0, 0, 0.01px);
        }

        .marquee-track.ios-track.animate {
          animation-timing-function: linear;
          animation-fill-mode: forwards;
          -webkit-animation-timing-function: linear;
          -webkit-animation-fill-mode: forwards;
        }

        /* Pause states */
        .marquee-track.paused {
          animation-play-state: paused !important;
          -webkit-animation-play-state: paused !important;
        }

        .marquee-track.hidden-tab {
          animation-play-state: paused;
          -webkit-animation-play-state: paused;
        }

        /* Responsive speeds */
        @media (max-width: 640px) {
          .trustbar {
            --marquee-duration: 35s;
          }
        }

        @media (min-width: 641px) and (max-width: 1024px) {
          .trustbar {
            --marquee-duration: 40s;
          }
        }

        @media (min-width: 1025px) {
          .trustbar {
            --marquee-duration: 50s;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none !important;
            -webkit-animation: none !important;
          }
        }

        /* Container optimizations */
        .marquee-container {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
          isolation: isolate;
        }

        /* Item rendering optimization */
        .marquee-item {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translate3d(0, 0, 0);
          -webkit-transform: translate3d(0, 0, 0);
          -webkit-font-smoothing: subpixel-antialiased;
        }

        /* iOS Safari specific fixes */
        @supports (-webkit-touch-callout: none) {
          .marquee-track {
            -webkit-transform: translate3d(0, 0, 0);
            -webkit-perspective: 1000px;
            -webkit-backface-visibility: hidden;
            transform-style: preserve-3d;
            -webkit-transform-style: preserve-3d;
          }
          
          .marquee-track.animate {
            animation-name: marquee-scroll;
            -webkit-animation-name: marquee-scroll;
          }
          
          .marquee-container {
            -webkit-overflow-scrolling: touch;
            isolation: isolate;
            contain: layout style paint;
          }

          /* Force GPU acceleration on iOS */
          .marquee-item {
            -webkit-transform: translateZ(0) scale(1.0001);
            transform: translateZ(0) scale(1.0001);
          }

          /* Fix for iOS bounce during animation */
          body {
            overscroll-behavior-x: none;
          }
        }

        /* iPad specific optimizations */
        @media only screen 
          and (min-device-width: 768px) 
          and (max-device-width: 1024px) 
          and (-webkit-min-device-pixel-ratio: 2) {
          .marquee-track {
            -webkit-transform: translate3d(0, 0, 0.001px);
            transform: translate3d(0, 0, 0.001px);
          }
        }

        /* iPhone specific optimizations */
        @media only screen 
          and (max-device-width: 896px) 
          and (-webkit-min-device-pixel-ratio: 2) {
          .marquee-track.animate {
            animation-duration: calc(var(--marquee-duration) * 0.9);
            -webkit-animation-duration: calc(var(--marquee-duration) * 0.9);
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .marquee-mask-left,
          .marquee-mask-right {
            display: none;
          }
        }

        /* Fix for iOS 15+ animation bug */
        @supports (hanging-punctuation: first) and (font: -apple-system-body) {
          .marquee-track.animate {
            animation-timing-function: linear;
            animation-fill-mode: forwards;
            animation-iteration-count: infinite;
            -webkit-animation-timing-function: linear;
            -webkit-animation-fill-mode: forwards;
            -webkit-animation-iteration-count: infinite;
          }
        }

        /* Prevent iOS text selection during animation */
        .marquee-container * {
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* Force hardware acceleration on all items */
        .marquee-track > * {
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }

        /* Smooth rendering across all browsers */
        @supports (animation-timeline: scroll()) {
          .marquee-track {
            animation-composition: replace;
          }
        }

        /* Fix for Safari 14+ */
        @supports (backdrop-filter: blur(1px)) {
          .marquee-track {
            -webkit-backface-visibility: hidden;
            -webkit-perspective: 1000;
            -webkit-transform: translate3d(0, 0, 0);
          }
        }

        /* Performance optimization for low-end devices */
        @media (prefers-reduced-data: reduce) {
          .trustbar {
            --marquee-duration: 60s;
          }
        }

        /* Dark mode optimization */
        @media (prefers-color-scheme: dark) {
          .marquee-item {
            -webkit-font-smoothing: antialiased;
          }
        }
      `}</style>
    </div>
  );
};

export default SiteHeader;
