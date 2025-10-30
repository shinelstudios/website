// frontend/src/components/SiteHeader.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Moon, Menu, X, ChevronDown, Lock, Wand2, Search, Languages,
  Lightbulb, Brain, UserCog, Bell, Settings, LogOut, User,
  Shield, Zap, ArrowRight, ExternalLink, Home, Briefcase, Mail,
  BarChart3, Video, Image as ImageIcon
} from "lucide-react";
import TrustBar from "./Trustbar.jsx";
import logoLight from "../assets/logo_light.png";
import logoDark from "../assets/logo_dark.png";

/* ---------------- helpers: safe base64url + jwt + theme favicon ---------------- */
function base64UrlDecode(str) {
  try {
    if (!str) return "";
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
    if (typeof atob !== "function") return "";
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const dec = new TextDecoder("utf-8", { fatal: false });
    return dec.decode(bytes);
  } catch { return ""; }
}

function parseJwt(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const json = base64UrlDecode(parts[1]);
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

function getAuthState() {
  try {
    const token = (typeof localStorage !== "undefined" && localStorage.getItem("token")) || null;
    const payload = token ? parseJwt(token) : null;
    const now = Math.floor(Date.now() / 1000);
    const expired = !!(payload?.exp && payload.exp <= now);

    const safeGet = (k) => {
      try { return (localStorage.getItem(k) || "").trim(); } catch { return ""; }
    };

    const email = (payload?.email || safeGet("userEmail") || "").trim();
    const role = (payload?.role || safeGet("userRole") || "").trim().toLowerCase();
    const firstName = (payload?.firstName || safeGet("userFirstName") || "").trim();
    const lastName = (payload?.lastName || safeGet("userLastName") || "").trim();

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

/* ---------------- Notification system ---------------- */
function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("notifications") || "[]");
      setNotifications(Array.isArray(saved) ? saved : []);
      setUnreadCount((Array.isArray(saved) ? saved : []).filter(n => !n.read).length);
    } catch {}

    const handler = (e) => {
      try {
        const detail = e?.detail || {};
        const newNotif = {
          id: Date.now(),
          message: String(detail.message || "Notification"),
          type: String(detail.type || "info"),
          read: false,
          timestamp: Date.now(),
        };
        setNotifications(prev => {
          const updated = [newNotif, ...prev].slice(0, 50);
          try { localStorage.setItem("notifications", JSON.stringify(updated)); } catch {}
          return updated;
        });
        setUnreadCount(c => c + 1);
      } catch {}
    };

    if (typeof window !== "undefined") {
      window.addEventListener("notify", handler);
      return () => window.removeEventListener("notify", handler);
    }
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      try { localStorage.setItem("notifications", JSON.stringify(updated)); } catch {}
      return updated;
    });
    setUnreadCount(c => Math.max(0, c - 1));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    try { localStorage.removeItem("notifications"); } catch {}
  }, []);

  return { notifications, unreadCount, markAsRead, clearAll };
}

/* ---------------- tools matrix (role-gated) ---------------- */
const toolsCatalog = [
  { name: "Auto SRT Files (Multi-Language)", path: "/tools/srt", icon: Languages, roles: ["admin", "editor"], description: "Generate accurate subtitles in 50+ languages" },
  { name: "SEO Tool (Titles, Descriptions, Tags)", path: "/tools/seo", icon: Search, roles: ["admin", "editor", "client"], description: "Optimize content for maximum discoverability" },
  { name: "Viral Thumbnail Ideation", path: "/tools/thumbnail-ideation", icon: Lightbulb, roles: ["admin", "editor", "client"], description: "AI-powered thumbnail concepts that convert" },
  { name: "Custom AIs", path: "/tools/custom-ais", icon: Brain, roles: ["admin"], description: "Configure specialized AI workflows" },
  { name: "Admin • Users", path: "/admin/users", icon: UserCog, roles: ["admin"], description: "Manage team access and permissions" },
];

/* ---------------- SiteHeader ---------------- */
const SiteHeader = ({ isDark, setIsDark }) => {
  const [auth, setAuth] = useState(getAuthState());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [headerH, setHeaderH] = useState(76);
  const [searchQuery, setSearchQuery] = useState("");

  const location = useLocation();
  const navigate = useNavigate();

  const headerRef = useRef(null);
  const toolsRef = useRef(null);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);
  const searchInputRef = useRef(null);

  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();

  const prefersReduced = useMemo(() => {
    try { return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false; } catch { return false; }
  }, []);

  useEffect(() => setFaviconForTheme(!!isDark), [isDark]);

  const closeAllMenus = useCallback(() => {
    setToolsOpen(false);
    setWorkOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
    setIsMenuOpen(false);
    try {
      document.documentElement.style.overflow = "";
      document.body.style.overscrollBehavior = "";
    } catch {}
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      try {
        document.documentElement.style.overflow = "hidden";
        document.body.style.overscrollBehavior = "contain";
      } catch {}
    } else {
      try {
        document.documentElement.style.overflow = "";
        document.body.style.overscrollBehavior = "";
      } catch {}
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const update = () => setAuth(getAuthState());
      window.addEventListener("storage", update);
      window.addEventListener("auth:changed", update);
      return () => {
        window.removeEventListener("storage", update);
        window.removeEventListener("auth:changed", update);
      };
    }
  }, []);

  // Measure header height & set CSS var used by ScrollToHash in App.jsx
  useEffect(() => {
    const setVars = () => {
      try {
        const h = Math.round(headerRef.current?.getBoundingClientRect?.().height || 76);
        setHeaderH(h);
        document.documentElement.style.setProperty("--header-h", `${h}px`);
        document.documentElement.style.setProperty("scroll-padding-top", `${h + 8}px`);
      } catch {}
    };
    setVars();
    const ro = "ResizeObserver" in window ? new ResizeObserver(setVars) : null;
    if (ro && headerRef.current) ro.observe(headerRef.current);
    window.addEventListener("resize", setVars);
    return () => {
      try { ro?.disconnect(); } catch {}
      window.removeEventListener("resize", setVars);
    };
  }, []);

  // Scroll progress + shadow
  useEffect(() => {
    let ticking = false;
    const tick = () => {
      ticking = false;
      try {
        const y = window.scrollY || 0;
        const doc = document.documentElement;
        const h = Math.max(1, doc.scrollHeight - window.innerHeight);
        const p = Math.min(100, (y / h) * 100);
        setProgress(p);
        setScrolled(y > 6);
      } catch {}
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(tick);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Close menus on route/hash change
  useEffect(() => { closeAllMenus(); }, [location.pathname, location.hash, closeAllMenus]);

  // Outside click & ESC
  useEffect(() => {
    const onDocDown = (e) => {
      try {
        if (toolsOpen && toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
        if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
        if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      } catch {}
    };
    const onEsc = (e) => { if (e.key === "Escape") closeAllMenus(); };
    document.addEventListener("pointerdown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [toolsOpen, userMenuOpen, notifOpen, closeAllMenus]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (["input", "textarea"].includes(tag) || e.target?.isContentEditable) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setToolsOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setIsDark?.((d) => !d);
      }
      if (e.key === "Escape") closeAllMenus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeAllMenus, setIsDark]);

  const role = (auth.role || "client").toLowerCase();
  const availableTools = toolsCatalog.filter((t) => t.roles.includes(role));
  const allToolsForMenu = auth.isAuthed ? availableTools : toolsCatalog;
  const logoSrc = isDark ? logoLight : logoDark;
  const initials = initialsFrom(auth.firstName, auth.lastName, auth.email);

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return allToolsForMenu;
    const q = searchQuery.toLowerCase();
    return allToolsForMenu.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [searchQuery, allToolsForMenu]);

  const handleLogout = useCallback(() => {
    try {
      ["token","refresh","userEmail","userFirstName","userLastName","userRole","rememberMe"].forEach((k)=>localStorage.removeItem(k));
    } catch {}
    try {
      window.dispatchEvent(new Event("auth:changed"));
      window.dispatchEvent(new CustomEvent("notify", {
        detail: { message: "Successfully logged out", type: "success" }
      }));
    } catch {}
    closeAllMenus();
    navigate("/");
  }, [closeAllMenus, navigate]);

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

  const DesktopNavLink = ({ label, to, icon: Icon }) => {
    const isActive = location.pathname === to || (to === "/#contact" && location.hash === "#contact");
    return (
      <div className="relative">
        <Link
          to={to}
          className="relative px-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded flex items-center gap-1.5 transition-all duration-200"
          aria-current={isActive ? "page" : undefined}
          onMouseEnter={() => setHovered(label)}
          onMouseLeave={() => setHovered(null)}
          style={{
            color: isActive ? "var(--nav-hover)" : "var(--nav-link)",
            transform: hovered === label && !prefersReduced ? "translateY(-1px)" : "translateY(0)"
          }}
        >
          {Icon && <Icon size={16} />}
          <span
            className="absolute left-0 -bottom-1 h-[2px] bg-[var(--orange)] transition-all duration-200 rounded-full"
            style={{ width: isActive || hovered === label ? "100%" : "0%" }}
            aria-hidden="true"
          />
          <span>{label}</span>
        </Link>
      </div>
    );
  };

  /* ---------------- Mobile components (new polished subheadings) ---------------- */
  const haptic = () => {
    try { if (navigator?.vibrate) navigator.vibrate(7); } catch {}
  };

  const SectionHeader = ({ icon: Icon, title, subtitle, right }) => (
    <div className="flex items-center justify-between px-2 pb-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={18} style={{ color: "var(--orange)" }} />}
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</div>
          {subtitle && (
            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {right}
    </div>
  );

  const MobileCardLink = ({ to, icon: Icon, title, subtitle }) => (
    <Link
      to={to}
      className="group w-full rounded-xl p-3.5 min-h-[56px] flex items-center justify-between"
      style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
      onClick={haptic}
    >
      <div className="flex items-center gap-3 pr-2">
        <div className="h-9 w-9 rounded-lg grid place-items-center"
             style={{ background: "rgba(232,80,2,0.10)", border: "1px solid var(--border)" }}>
          {Icon && <Icon size={18} style={{ color: "var(--orange)" }} />}
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-5 truncate">{title}</div>
          {subtitle && <div className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{subtitle}</div>}
        </div>
      </div>
      <ArrowRight size={18} className="shrink-0 opacity-90 group-active:translate-x-0.5 transition-transform duration-150" style={{ color: "var(--orange)" }} />
    </Link>
  );

  return (
    <div className="fixed top-0 w-full z-50">
      <header
        ref={headerRef}
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
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
          >
            <div className="h-12 flex items-center overflow-visible">
              <img
                src={logoSrc}
                alt="Shinel Studios"
                className="h-auto w-36 sm:w-44 object-contain block select-none transition-opacity duration-300"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
                decoding="async"
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
            <DesktopNavLink label="Home" to="/" icon={Home} />

            {/* Work dropdown (desktop) */}
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded transition-all duration-200"
                aria-expanded={workOpen}
                aria-haspopup="menu"
                aria-controls="work-menu"
                onClick={() => setWorkOpen(v => !v)}
                style={{
                  color: hovered === "Work" || workOpen ? "var(--nav-hover)" : "var(--nav-link)",
                  transform: hovered === "Work" && !prefersReduced ? 'translateY(-1px)' : 'translateY(0)'
                }}
                onMouseEnter={() => setHovered("Work")}
                onMouseLeave={() => setHovered(null)}
              >
                <BarChart3 size={16} />
                <span className="nav-label">Work</span>
                <ChevronDown size={16} className={`ml-1 transition-transform duration-200 ${workOpen ? "rotate-180" : ""}`} />
              </button>

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
                        <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold"
                             style={{ color: "var(--text)" }}>
                          <span className="flex items-center gap-2">
                            <Wand2 size={16} style={{ color: "var(--orange)" }} />
                            GFX
                          </span>
                        </div>

                        <ul className="space-y-1 mt-2">
                          <li>
                            <Link
                              to="/gfx/thumbnails"
                              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150 w-full"
                              style={{ color: "var(--text)" }}
                            >
                              <span>Thumbnails</span>
                              <ArrowRight size={14} style={{ color: "var(--orange)" }} />
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/gfx/branding"
                              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150 w-full"
                              style={{ color: "var(--text)" }}
                            >
                              <span>Logo / Banner / Overlays (3-in-1)</span>
                              <ArrowRight size={14} style={{ color: "var(--orange)" }} />
                            </Link>
                          </li>
                        </ul>
                      </div>

                      {/* Videos column */}
                      <div className="p-3">
                        <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold"
                             style={{ color: "var(--text)" }}>
                          <span className="flex items-center gap-2">
                            <Video size={16} style={{ color: "var(--orange)" }} />
                            Videos
                          </span>
                        </div>

                        <ul className="space-y-1 mt-2">
                          <li>
                            <Link
                              to="/videos/shorts"
                              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150 w-full"
                              style={{ color: "var(--text)" }}
                            >
                              <span>Shorts</span>
                              <ArrowRight size={14} style={{ color: "var(--orange)" }} />
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/videos/long"
                              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-150 w-full"
                              style={{ color: "var(--text)" }}
                            >
                              <span>Long Videos</span>
                              <ArrowRight size={14} style={{ color: "var(--orange)" }} />
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="px-4 py-3 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                      Tip: Use <kbd className="px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border)" }}>Esc</kbd> to close menus.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link to="/#contact" className="relative">
              <span className="relative px-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded flex items-center gap-1.5 transition-all duration-200"
                style={{ color: "var(--nav-link)" }}>
                <Mail size={16} />
                Contact
              </span>
            </Link>

            {/* Tools dropdown with search */}
            <div className="relative" ref={toolsRef}>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded transition-all duration-200"
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
                aria-controls="ai-tools-menu"
                onClick={() => setToolsOpen((v) => !v)}
                style={{
                  color: hovered === "Tools" || toolsOpen ? "var(--nav-hover)" : "var(--nav-link)",
                  transform: hovered === "Tools" && !prefersReduced ? 'translateY(-1px)' : 'translateY(0)'
                }}
                onMouseEnter={() => setHovered("Tools")}
                onMouseLeave={() => setHovered(null)}
              >
                <Zap size={16} />
                <span className="nav-label">Tools</span>
                {!auth.isAuthed && <Lock size={14} className="ml-1 opacity-70" />}
                <ChevronDown size={16} className={`ml-1 transition-transform duration-200 ${toolsOpen ? "rotate-180" : ""}`} />
              </button>

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
                    <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
                          {auth.isAuthed ? `Your tools • ${role}` : "AI Tools · Login required"}
                        </div>
                        <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
                          <span>⌘</span>K
                        </kbd>
                      </div>

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

                    <div className="max-h-[400px] overflow-y-auto">
                      {(searchQuery.trim() ? filteredTools : allToolsForMenu).map((t, i) => {
                        const Icon = t.icon;
                        const allowed = auth.isAuthed && t.roles.includes(role);
                        const to = allowed ? t.path : "/login?next=/studio";
                        return (
                          <Link
                            key={t.name}
                            role="menuitem"
                            to={to}
                            className="flex items-start gap-3 w-full px-4 py-3 text-left transition-colors duration-150"
                            style={{
                              color: "var(--text)",
                              borderBottom: i === (searchQuery.trim() ? filteredTools.length : allToolsForMenu.length) - 1 ? "0" : "1px solid var(--border)",
                              opacity: auth.isAuthed ? (allowed ? 1 : 0.6) : 1,
                              background: "transparent"
                            }}
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
                            <ArrowRight size={16} className="opacity-100 shrink-0" style={{ color: "var(--orange)" }} />
                          </Link>
                        );
                      })}
                    </div>

                    {!auth.isAuthed && (
                      <div className="p-4 border-t" style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}>
                        <Link
                          to="/login"
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-transform duration-150 hover:scale-[1.02]"
                          style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
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
                  <button
                    onClick={() => setNotifOpen(v => !v)}
                    className="hidden md:flex p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] relative transition-all duration-150"
                    style={{
                      background: notifOpen ? "var(--surface-alt)" : "transparent",
                      color: "var(--text)",
                      transform: !prefersReduced && notifOpen ? 'scale(1.04)' : 'scale(1)'
                    }}
                    aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
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
                  </button>

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
                              <div
                                key={n.id}
                                className="px-4 py-3 border-b cursor-pointer transition-colors duration-150"
                                style={{
                                  borderColor: "var(--border)",
                                  background: n.read ? "transparent" : "rgba(232,80,2,0.05)",
                                }}
                                onClick={() => markAsRead(n.id)}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-alt)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = n.read ? "transparent" : "rgba(232,80,2,0.05)"; }}
                              >
                                <div className="text-sm" style={{ color: "var(--text)" }}>
                                  {n.message}
                                </div>
                                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                                  {new Date(n.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
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
  <button
    onClick={() => setUserMenuOpen(v => !v)}
    className="hidden md:flex items-center gap-2 px-2 py-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-transform duration-150"
    style={{
      background: "var(--surface-alt)",
      border: "1px solid var(--border)",
      transform: !prefersReduced && userMenuOpen ? 'scale(1.02)' : 'scale(1)'
    }}
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
    <ChevronDown size={14} className={`transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
  </button>

  <AnimatePresence>
    {userMenuOpen && (
      <motion.div
        initial={prefersReduced ? {} : { opacity: 0, scale: 0.98, y: 6 }}
        animate={prefersReduced ? {} : { opacity: 1, scale: 1, y: 0 }}
        exit={prefersReduced ? {} : { opacity: 0, scale: 0.98, y: 6 }}
        className="absolute right-0 mt-3 w-[280px] rounded-2xl shadow-xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", zIndex: 4 }}
      >
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

        <div className="py-2">
          <Link
            to="/studio"
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150"
            style={{ color: "var(--text)", background: "transparent" }}
          >
            <Briefcase size={18} style={{ color: "var(--orange)" }} />
            <span>Studio</span>
          </Link>

          <Link
            to="/profile"
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150"
            style={{ color: "var(--text)" }}
          >
            <User size={18} style={{ color: "var(--orange)" }} />
            <span>Profile</span>
          </Link>

          <Link
            to="/settings"
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150"
            style={{ color: "var(--text)" }}
          >
            <Settings size={18} style={{ color: "var(--orange)" }} />
            <span>Settings</span>
          </Link>

          {role === "admin" && (
            <>
              <Link
                to="/admin"
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150"
                style={{ color: "var(--text)" }}
              >
                <Shield size={18} style={{ color: "var(--orange)" }} />
                <span>Admin Panel</span>
              </Link>

              <Link
                to="/admin/users"
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150"
                style={{ color: "var(--text)" }}
              >
                <UserCog size={18} style={{ color: "var(--orange)" }} />
                <span>Users</span>
              </Link>

              <Link
                to="/admin/thumbnails"
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150"
                style={{ color: "var(--text)" }}
              >
                <ImageIcon size={18} style={{ color: "var(--orange)" }} />
                <span>Thumbnails</span>
              </Link>
            </>
          )}
        </div>

        <div className="border-t px-2 py-2" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-colors duration-150"
            style={{ color: "var(--text)" }}
          >
            <LogOut size={18} style={{ color: "var(--orange)" }} />
            <span>Logout</span>
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>


                {/* quick access for small screens */}
                <Link
                  to="/studio"
                  className="md:hidden inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-transform duration-150 active:scale-95"
                  style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                >
                  Studio
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="md:hidden inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-transform duration-150 active:scale-95"
                  style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                >
                  Login
                </Link>
                <div className="hidden md:inline-flex gap-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-transform duration-150 hover:scale-[1.02]"
                    style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                  >
                    Login
                  </Link>
                </div>
              </>
            )}

            {/* theme toggle */}
            {typeof isDark === "boolean" && typeof setIsDark === "function" && (
              <button
                onClick={() => setIsDark((v) => !v)}
                className="p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-all duration-200"
                style={{
                  background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  color: "var(--text)",
                }}
                aria-label="Toggle theme"
                aria-pressed={isDark}
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}

            {/* mobile menu toggle */}
            <button
              onClick={() => setIsMenuOpen((s) => !s)}
              className="md:hidden p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded transition-transform duration-150 active:scale-95"
              style={{ color: "var(--text)" }}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>

        {/* MOBILE MENU — polished subheadings */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              id="mobile-menu"
              initial={prefersReduced ? {} : { opacity: 0, y: -10 }}
              animate={prefersReduced ? {} : { opacity: 1, y: 0 }}
              exit={prefersReduced ? {} : { opacity: 0, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="md:hidden fixed left-0 right-0"
              style={{
                top: `var(--header-h, ${headerH}px)`,
                maxHeight: `min(72vh, calc(100vh - var(--header-h, 76px) - 20px))`,
                background: "var(--surface)",
                borderTop: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                zIndex: 60,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                paddingBottom: "max(16px, env(safe-area-inset-bottom))",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
              onClick={() => setIsMenuOpen(false)}
            >
              <nav className="px-4 py-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                {/* Search */}
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

                {/* Primary quick actions */}
                <div className="grid grid-cols-2 gap-3">
                  <MobileCardLink to="/" icon={Home} title="Home" subtitle="Back to main" />
                  <MobileCardLink to="/#contact" icon={Mail} title="Contact" subtitle="Reach out to us" />
                </div>

                {/* Work section with collapsible groups */}
                <div className="space-y-3">
                  <SectionHeader
                    icon={BarChart3}
                    title="Work"
                    subtitle="Explore services & showcases"
                    right={
                      <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                        4 items
                      </span>
                    }
                  />

                  {/* GFX */}
                  <details className="rounded-2xl" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }} open>
                    <summary className="list-none cursor-pointer select-none">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3"
                        onClick={(e) => { e.preventDefault(); const el = e.currentTarget.closest('details'); el.open = !el.open; haptic(); }}
                      >
                        <span className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-lg grid place-items-center"
                               style={{ background: "rgba(232,80,2,0.10)", border: "1px solid var(--border)" }}>
                            <Wand2 size={18} style={{ color: "var(--orange)" }} />
                          </div>
                          <div>
                            <div className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>GFX</div>
                            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Designs, logos & overlays</div>
                          </div>
                        </span>
                        <ChevronDown size={18} className="transition-transform duration-200" />
                      </button>
                    </summary>
                    <div className="px-3 pb-3 space-y-2">
                      <MobileCardLink to="/gfx/thumbnails" icon={Wand2} title="Thumbnails" subtitle=" High-CTR concepts" />
                      <MobileCardLink to="/gfx/branding" icon={Wand2} title="Branding (3-in-1)" subtitle="Logo • Banner • Overlays" />
                    </div>
                  </details>

                  {/* Videos */}
                  <details className="rounded-2xl" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }} open>
                    <summary className="list-none cursor-pointer select-none">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3"
                        onClick={(e) => { e.preventDefault(); const el = e.currentTarget.closest('details'); el.open = !el.open; haptic(); }}
                      >
                        <span className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-lg grid place-items-center"
                               style={{ background: "rgba(232,80,2,0.10)", border: "1px solid var(--border)" }}>
                            <Video size={18} style={{ color: "var(--orange)" }} />
                          </div>
                          <div>
                            <div className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>Videos</div>
                            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Shorts & long-form edits</div>
                          </div>
                        </span>
                        <ChevronDown size={18} className="transition-transform duration-200" />
                      </button>
                    </summary>
                    <div className="px-3 pb-3 space-y-2">
                      <MobileCardLink to="/videos/shorts" icon={Video} title="Shorts" subtitle="Snappy vertical edits" />
                      <MobileCardLink to="/videos/long" icon={Video} title="Long Videos" subtitle="Narrative & pacing" />
                    </div>
                  </details>
                </div>

                {/* Tools quick list (styled cards) */}
                <div className="space-y-2">
                  <SectionHeader
                    icon={Zap}
                    title="Tools"
                    subtitle={auth.isAuthed ? "Your available utilities" : "Login to unlock everything"}
                    right={null}
                  />
                  <div className="grid grid-cols-1 gap-2">
                    {(searchQuery.trim() ? filteredTools : allToolsForMenu).map(t => {
                      const Icon = t.icon;
                      const allowed = auth.isAuthed && t.roles.includes(role);
                      const to = allowed ? t.path : "/login?next=/studio";
                      return (
                        <Link
                          key={t.name}
                          to={to}
                          className="group rounded-xl p-3.5 flex items-center justify-between"
                          style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                          onClick={haptic}
                        >
                          <span className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-lg grid place-items-center"
                                 style={{ background: "rgba(232,80,2,0.10)", border: "1px solid var(--border)" }}>
                              {Icon && <Icon size={18} style={{ color: "var(--orange)" }} />}
                            </div>
                            <span className="min-w-0">
                              <div className="text-[15px] font-semibold truncate">{t.name}</div>
                              {t.description && <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{t.description}</div>}
                            </span>
                            {!allowed && <Lock size={12} className="opacity-70 shrink-0 ml-1" />}
                          </span>
                          <ArrowRight size={18} className="shrink-0 opacity-90 group-active:translate-x-0.5 transition-transform duration-150" style={{ color: "var(--orange)" }} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <TrustBar items={trustItems} prefersReduced={prefersReduced} forceMotion={true} speed={45} direction="rtl" />
      </header>
    </div>
  );
};

export default SiteHeader;
