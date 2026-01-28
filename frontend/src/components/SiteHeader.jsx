// frontend/src/components/SiteHeader.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
  Lock,
  Layout,
  Wand2,
  Search,
  Languages,
  Lightbulb,
  Brain,
  UserCog,
  Bell,
  Settings,
  LogOut,
  User,
  Shield,
  Zap,
  ArrowRight,
  ExternalLink,
  Home,
  Briefcase,
  BarChart3,
  Video,
  Image as ImageIcon,
  DollarSign,
  FolderOpen,
  Radio,
  Youtube,
} from "lucide-react";
import NotificationHub from "./ui/NotificationHub.jsx";
import TrustBar from "./Trustbar.jsx";
import FestivalOfferBanner from "./ui/FestivalOfferBanner.jsx";
import logoLight from "../assets/logo_light.png";
import logoDark from "../assets/logo_dark.png";

import { useGlobalConfig } from "../context/GlobalConfigContext";

/* ---------------- helpers: safe base64url + jwt + theme favicon ---------------- */
function base64UrlDecode(str) {
  try {
    if (!str) return "";
    const b64 =
      str.replace(/-/g, "+").replace(/_/g, "/") +
      "===".slice((str.length + 3) % 4);
    if (typeof atob !== "function") return "";
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const dec = new TextDecoder("utf-8", { fatal: false });
    return dec.decode(bytes);
  } catch {
    return "";
  }
}

function parseJwt(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const json = base64UrlDecode(parts[1]);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

function getAuthState() {
  try {
    const token =
      (typeof localStorage !== "undefined" && localStorage.getItem("token")) ||
      null;

    const payload = token ? parseJwt(token) : null;
    const now = Math.floor(Date.now() / 1000);
    const expired = !!(payload?.exp && payload.exp <= now);

    const safeGet = (k) => {
      try {
        return (localStorage.getItem(k) || "").trim();
      } catch {
        return "";
      }
    };

    // ✅ canonical keys first, then back-compat keys
    const email = (payload?.email || safeGet("userEmail") || safeGet("email") || "").trim();

    // role can be in role OR userRole (legacy)
    const role = (
      payload?.role ||
      safeGet("role") ||
      safeGet("userRole")
    ).trim().toLowerCase();

    // name can be firstName/lastName OR userFirstName/userLastName OR userFirst/userLast
    const firstName = (
      payload?.firstName ||
      safeGet("firstName") ||
      safeGet("userFirstName") ||
      safeGet("userFirst")
    ).trim();

    const lastName = (
      payload?.lastName ||
      safeGet("lastName") ||
      safeGet("userLastName") ||
      safeGet("userLast")
    ).trim();


    return {
      isAuthed: Boolean(token) && !expired,
      email: email || null,
      role: role || null,
      firstName: firstName || null,
      lastName: lastName || null,
      exp: payload?.exp || null,
    };
  } catch {
    return {
      isAuthed: false,
      email: null,
      role: null,
      firstName: null,
      lastName: null,
      exp: null,
    };
  }
}

function initialsFrom(first, last, email) {
  const a = (first || "").trim();
  const b = (last || "").trim();
  if (a || b)
    return `${a.charAt(0)}${b.charAt(0)}`.toUpperCase() || "?";
  const nameFromEmail = (email || "").split("@")[0] || "";
  return (nameFromEmail.charAt(0) || "?").toUpperCase();
}

function setFaviconForTheme(isDark) {
  try {
    const link =
      document.getElementById("favicon") ||
      document.querySelector('link[rel="icon"]:not([data-theme])');
    if (link)
      link.href = isDark
        ? "/favicon-dark-32x32.png"
        : "/favicon-light-32x32.png";
  } catch { }
}

/* ---------------- Notification unread count helper ---------------- */
const LS_NOTIF_KEY = "shinel_notifications_history";
function useUnreadCount() {
  const [count, setCount] = useState(0);

  const update = useCallback(() => {
    try {
      const saved = localStorage.getItem(LS_NOTIF_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCount(parsed.filter(n => !n.read).length);
      }
    } catch { }
  }, []);

  useEffect(() => {
    update();
    const handler = () => update();
    window.addEventListener("notify", handler);
    window.addEventListener("notif-refresh", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("notify", handler);
      window.removeEventListener("notif-refresh", handler);
      window.removeEventListener("storage", handler);
    };
  }, [update]);

  return count;
}

/* ---------------- tools matrix (role-gated) ---------------- */
const toolsCatalog = [
  {
    name: "YouTube ROI & CTR Calculator",
    path: "/roi-calculator",
    icon: DollarSign,
    roles: ["admin", "editor", "client", "public"],
    description: "Visualize potential revenue and growth lift",
  },
  {
    name: "Local SRT Builder",
    path: "/tools/srt",
    icon: Languages,
    roles: ["admin", "editor", "client", "public"],
    description: "Paste transcript lines → export .srt with simple timing",
  },
  {
    name: "Thumbnail A/B Previewer",
    path: "/tools/thumbnail-previewer",
    icon: Layout,
    roles: ["admin", "editor", "client", "public"],
    description: "Test how your designs look in YouTube search & Home grid.",
  },
  {
    name: "SEO Tool (Titles, Descriptions, Tags)",
    path: "/tools/seo",
    icon: Search,
    roles: ["admin", "editor", "client", "public"],
    description: "Optimize content for maximum discoverability",
  },
  {
    name: "Viral Thumbnail Ideation",
    path: "/tools/thumbnail-ideation",
    icon: Lightbulb,
    roles: ["admin", "editor", "client"],
    description: "AI-powered thumbnail concepts that convert",
  },
  {
    name: "Custom AIs",
    path: "/tools/custom-ais",
    icon: Brain,
    roles: ["admin"],
    description: "Configure specialized AI workflows",
  },
  {
    name: "User Registry",
    path: "/dashboard/users",
    icon: UserCog,
    roles: ["admin"],
    description: "Manage team access and permissions",
  },
  {
    name: "Thumbnail Registry",
    path: "/dashboard/thumbnails",
    icon: ImageIcon,
    roles: ["admin", "artist"],
    description: "Manage thumbnail entries & approvals",
  },
  {
    name: "Video Manager",
    path: "/dashboard/videos",
    icon: Video,
    roles: ["admin", "editor"],
    description: "Manage video entries & refresh views",
  },
  {
    name: "Pulse Registry",
    path: "/dashboard/clients",
    icon: Youtube,
    roles: ["admin"],
    description: "Manage YouTube client list",
  },
];


/* ---------------- SiteHeader ---------------- */
const SiteHeader = ({ isDark, setIsDark }) => {
  const [auth, setAuth] = useState(getAuthState());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [headerH, setHeaderH] = useState(76);

  const location = useLocation();
  const navigate = useNavigate();

  const headerRef = useRef(null);
  const userMenuRef = useRef(null);

  const unreadCount = useUnreadCount();

  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);
  const notifRef = useRef(null);

  const allToolsForMenu = useMemo(() => toolsCatalog, []);

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return allToolsForMenu;
    const q = searchQuery.toLowerCase();
    return allToolsForMenu.filter(t =>
      (t.roles.some(r => userRoles.includes(r.toLowerCase())) || t.roles.includes("public")) &&
      (t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    );
  }, [searchQuery, allToolsForMenu]);



  useEffect(() => setFaviconForTheme(!!isDark), [isDark]);

  const closeAllMenus = useCallback(() => {
    setUserMenuOpen(false);
    setNotifOpen(false);
    setIsMenuOpen(false);
    try {
      document.documentElement.style.overflow = "";
      document.body.style.overscrollBehavior = "";
    } catch { }
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      try {
        document.documentElement.style.overflow = "hidden";
        document.body.style.overscrollBehavior = "contain";
      } catch { }
    } else {
      try {
        document.documentElement.style.overflow = "";
        document.body.style.overscrollBehavior = "";
      } catch { }
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

  // Measure header height & set CSS vars
  useEffect(() => {
    const setVars = () => {
      try {
        const h = Math.round(
          headerRef.current?.getBoundingClientRect?.().height || 76
        );
        setHeaderH(h);
        document.documentElement.style.setProperty("--header-h", `${h}px`);
        document.documentElement.style.setProperty(
          "scroll-padding-top",
          `${h + 8}px`
        );
      } catch { }
    };
    setVars();
    const ro =
      "ResizeObserver" in window ? new ResizeObserver(setVars) : null;
    if (ro && headerRef.current) ro.observe(headerRef.current);
    window.addEventListener("resize", setVars);
    return () => {
      try {
        ro?.disconnect();
      } catch { }
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
      } catch { }
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
  useEffect(() => {
    closeAllMenus();
  }, [location.pathname, location.hash, closeAllMenus]);

  // Outside click & ESC
  useEffect(() => {
    const onDocDown = (e) => {
      try {
        if (
          userMenuOpen &&
          userMenuRef.current &&
          !userMenuRef.current.contains(e.target)
        )
          setUserMenuOpen(false);
        if (
          notifOpen &&
          notifRef.current &&
          !notifRef.current.contains(e.target)
        )
          setNotifOpen(false);
      } catch { }
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
  }, [userMenuOpen, notifOpen, closeAllMenus]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (["input", "textarea"].includes(tag) || e.target?.isContentEditable)
        return;

      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setIsDark?.((d) => !d);
      }
      if (e.key === "Escape") closeAllMenus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeAllMenus, setIsDark]);

  const rawRole = (auth.role || "client").toLowerCase();
  const userRoles = useMemo(() => rawRole.split(",").map(r => r.trim()).filter(Boolean), [rawRole]);
  const logoSrc = isDark ? logoLight : logoDark;
  const initials = initialsFrom(auth.firstName, auth.lastName, auth.email);

  const handleLogout = useCallback(() => {
    try {
      // ✅ canonical
      [
        "token", "refresh", "rememberMe",
        "userEmail", "email",
        "role", "userRole",
        "firstName", "lastName",
        "userFirstName", "userLastName",
        "userFirst", "userLast"
      ].forEach((k) => localStorage.removeItem(k));

      // ✅ back-compat
      ["userRole", "userFirst", "userLast", "userFirstName", "userLastName"].forEach((k) =>
        localStorage.removeItem(k)
      );
    } catch { }

    try {
      window.dispatchEvent(new Event("auth:changed"));
      window.dispatchEvent(
        new CustomEvent("notify", {
          detail: { message: "Successfully logged out", type: "success" },
        })
      );
    } catch { }

    closeAllMenus();
    navigate("/");
  }, [closeAllMenus, navigate]);

  // [MODIFIED] Use config for dynamic stats
  const { config } = useGlobalConfig();

  const trustItems = useMemo(
    () => [
      { icon: Wand2, text: "AI-First Studio • Human-Directed Quality" },
      { icon: UserCog, text: `${config?.stats?.creatorsImpacted || "20"}+ Active Creators Across Niches` },
      { icon: BarChart3, text: `Thumbnails Delivering +${config?.stats?.ctrBoostMax || "60"}% CTR Lift` },
      { icon: Zap, text: "Edits Driving 2× Average Watch Time" },
      { icon: ExternalLink, text: `${config?.stats?.totalReach || "1.2B"}${typeof config?.stats?.totalReach === 'string' ? '' : '+'} Total Views Driven for Clients` },
      { icon: Languages, text: "Auto-Captions & Multi-Language Support" },
      { icon: Shield, text: "Consent-First Face & Voice AI Features" },
      { icon: Lightbulb, text: "Hook Scoring & Title Testing" },
      { icon: Brain, text: "AI Script Co-Pilot for Viral Ideation" },
      { icon: Zap, text: "48–72 HR Standard Project Turnaround" },
      { icon: UserCog, text: "Dedicated PM & Weekly Checkpoints" },
    ],
    [config]
  );

  const DesktopNavLink = ({ label, to, icon: Icon }) => {
    const isActive =
      location.pathname === to ||
      location.pathname.startsWith(to + "/") ||
      (to === "/#contact" && location.hash === "#contact");

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
            transform:
              hovered === label
                ? "translateY(-1px)"
                : "translateY(0)",
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

  const haptic = () => {
    try {
      if (navigator?.vibrate) navigator.vibrate(7);
    } catch { }
  };

  const SectionHeader = ({ icon: Icon, title, subtitle, right }) => (
    <div className="flex items-center justify-between px-2 pb-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={18} style={{ color: "var(--orange)" }} />}
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {title}
          </div>
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
      style={{
        background: "var(--surface-alt)",
        border: "1px solid var(--border)",
        color: "var(--text)",
      }}
      onClick={haptic}
    >
      <div className="flex items-center gap-3 pr-2">
        <div
          className="h-9 w-9 rounded-lg grid place-items-center"
          style={{
            background: "rgba(232,80,2,0.10)",
            border: "1px solid var(--border)",
          }}
        >
          {Icon && <Icon size={18} style={{ color: "var(--orange)" }} />}
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-5 truncate">
            {title}
          </div>
          {subtitle && (
            <div
              className="text-[11px] mt-0.5 truncate"
              style={{ color: "var(--text-muted)" }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <ArrowRight
        size={18}
        className="shrink-0 opacity-90 group-active:translate-x-0.5 transition-transform duration-150"
        style={{ color: "var(--orange)" }}
      />
    </Link>
  );

  return (
    <div className="fixed top-0 w-full z-50">
      <header
        ref={headerRef}
        role="banner"
        style={{
          background:
            "color-mix(in oklab, var(--header-bg) 88%, transparent) 0% / cover",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "0",
          boxShadow: scrolled ? "0 10px 28px rgba(0,0,0,0.18)" : "none",
          transition: "box-shadow .25s ease, background-color .25s ease",
          overflow: "visible",
        }}
      >
        <FestivalOfferBanner />
        <div
          className="absolute left-0 top-0 h-[2px] origin-left"
          style={{
            width: "100%",
            transform: `scaleX(${Math.max(
              0,
              Math.min(1, progress / 100)
            ).toFixed(4)})`,
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
                width="176"
                height="48"
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
            <DesktopNavLink label="Work" to="/work" icon={FolderOpen} />
            <DesktopNavLink label="Pulse" to="/live" icon={Radio} />
            <DesktopNavLink label="Tools" to="/tools" icon={Wand2} />
            {auth.isAuthed && (
              <DesktopNavLink label="Hub" to="/dashboard" icon={Shield} />
            )}
            <DesktopNavLink label="Blog" to="/blog" icon={Lightbulb} />
            <DesktopNavLink label="Pricing" to="/pricing" icon={DollarSign} />

          </div>

          {/* right actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {auth.isAuthed ? (
              <>
                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(true)}
                    className="flex p-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] relative transition-all duration-200 hover:bg-white/5"
                    style={{
                      color: "var(--text)",
                      transform: notifOpen ? "scale(1.05)" : "scale(1)",
                    }}
                    aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span
                        className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(232,80,2,0.5)]"
                      />
                    )}
                  </button>
                </div>

                {/* User menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="hidden md:flex items-center gap-2 px-2 py-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-transform duration-150"
                    style={{
                      background: "var(--surface-alt)",
                      border: "1px solid var(--border)",
                      transform:
                        userMenuOpen
                          ? "scale(1.02)"
                          : "scale(1)",
                    }}
                  >
                    <div
                      className="h-7 w-7 rounded-full grid place-items-center text-[11px] font-bold"
                      style={{ background: "var(--orange)", color: "#fff" }}
                    >
                      {initials}
                    </div>
                    <span
                      className="text-sm font-medium max-w-[100px] truncate"
                      style={{ color: "var(--text)" }}
                    >
                      {auth.firstName || auth.email || "Account"}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 6 }}
                        className="absolute right-0 mt-3 w-[280px] rounded-2xl shadow-xl overflow-hidden"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          zIndex: 4,
                        }}
                      >
                        <div
                          className="px-4 py-3 border-b"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-10 rounded-full grid place-items-center text-sm font-bold"
                              style={{ background: "var(--orange)", color: "#fff" }}
                            >
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className="font-semibold truncate"
                                style={{ color: "var(--text)" }}
                              >
                                {`${auth.firstName || ""} ${auth.lastName || ""}`.trim() || "User"}
                              </div>
                              <div
                                className="text-xs truncate"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {auth.email}
                              </div>
                              {userRoles.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {userRoles.map(r => (
                                    <span
                                      key={r}
                                      className="inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full"
                                      style={{
                                        background: "rgba(232,80,2,0.15)",
                                        color: "var(--orange)",
                                      }}
                                    >
                                      {r}
                                    </span>
                                  ))}
                                </div>
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

                          {userRoles.some(r => ['editor', 'artist'].includes(r)) && (
                            <Link
                              to={`/portfolio/${auth.email}`}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150"
                              style={{ color: "var(--text)" }}
                            >
                              <User size={18} style={{ color: "var(--orange)" }} />
                              <span>Public Portfolio</span>
                            </Link>
                          )}

                          <Link
                            to="/settings"
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150"
                            style={{ color: "var(--text)" }}
                          >
                            <Settings size={18} style={{ color: "var(--orange)" }} />
                            <span>Settings</span>
                          </Link>

                          {userRoles.some(r => ['admin', 'editor', 'artist'].includes(r)) && (
                            <Link
                              to="/dashboard"
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors duration-150"
                              style={{ color: "var(--text)" }}
                            >
                              <Shield size={18} style={{ color: "var(--orange)" }} />
                              <span>Management Hub</span>
                            </Link>
                          )}
                        </div>

                        <div
                          className="border-t px-2 py-2"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-colors duration-150 hover:bg-white/5"
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
                  style={{
                    background: "linear-gradient(90deg, var(--orange), #ff9357)",
                  }}
                >
                  Studio
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="md:hidden inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-transform duration-150 active:scale-95"
                  style={{
                    background: "linear-gradient(90deg, var(--orange), #ff9357)",
                  }}
                >
                  Login
                </Link>
                <div className="hidden md:inline-flex gap-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-transform duration-150 hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(90deg, var(--orange), #ff9357)",
                    }}
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
                  background: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
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

        {/* MOBILE MENU */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
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
              <nav
                className="px-4 py-4 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-2 gap-3">
                  <MobileCardLink to="/" icon={Home} title="Home" subtitle="Back to main" />
                  <MobileCardLink
                    to="/work"
                    icon={FolderOpen}
                    title="Work"
                    subtitle="All services & samples"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MobileCardLink
                    to="/live"
                    icon={Radio}
                    title="Pulse"
                    subtitle="Live metrics"
                  />
                  <MobileCardLink to="/pricing" icon={DollarSign} title="Pricing" subtitle="Plans & quotes" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MobileCardLink to="/blog" icon={Lightbulb} title="Blog" subtitle="Insights & News" />
                  {/* Tools removed from here as it is listed below with search */}
                </div>

                {/* Authenticated User Links (Mobile) */}
                {auth.isAuthed && (
                  <div className="space-y-2 pt-2 border-t border-[var(--border)] mt-2">
                    <SectionHeader icon={User} title="Account" subtitle={`${auth.firstName || "User"}`} right={null} />
                    <div className="grid grid-cols-1 gap-2">
                      <MobileCardLink to="/profile" icon={User} title="Profile" subtitle="Personal details" />
                      <MobileCardLink to="/settings" icon={Settings} title="Settings" subtitle="Preferences" />
                      {['admin', 'editor', 'artist'].includes(role) && (
                        <MobileCardLink to="/dashboard" icon={Shield} title="Management Hub" subtitle="Studio Control" />
                      )}
                      <button
                        onClick={handleLogout}
                        className="group w-full rounded-xl p-3.5 min-h-[56px] flex items-center justify-between"
                        style={{
                          background: "rgba(255, 59, 48, 0.1)",
                          border: "1px solid rgba(255, 59, 48, 0.2)",
                          color: "#ff3b30",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <LogOut size={18} />
                          <div className="text-[15px] font-semibold">Logout</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}


                {/* Tools */}
                <div className="space-y-2">
                  <SectionHeader
                    icon={Zap}
                    title="Tools"
                    subtitle={
                      auth.isAuthed
                        ? "Your available utilities"
                        : "Login to unlock everything"
                    }
                    right={null}
                  />

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
                      style={{
                        background: "var(--surface-alt)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {(searchQuery.trim() ? filteredTools : allToolsForMenu)
                      .filter(t => t.roles.includes("public") || (auth.isAuthed && t.roles.includes(role)))
                      .map((t) => {
                        const Icon = t.icon;
                        const allowed = true; // Since we filtered, all remaining are allowed
                        const to = t.path;
                        return (
                          <Link
                            key={t.name}
                            to={to}
                            className="group rounded-xl p-3.5 flex items-center justify-between"
                            style={{
                              background: "var(--surface-alt)",
                              border: "1px solid var(--border)",
                              color: "var(--text)",
                            }}
                            onClick={haptic}
                          >
                            <span className="flex items-center gap-3 min-w-0">
                              <div
                                className="h-9 w-9 rounded-lg grid place-items-center"
                                style={{
                                  background: "rgba(232,80,2,0.10)",
                                  border: "1px solid var(--border)",
                                }}
                              >
                                {Icon && <Icon size={18} style={{ color: "var(--orange)" }} />}
                              </div>

                              <span className="min-w-0">
                                <div className="text-[15px] font-semibold truncate">{t.name}</div>
                                {t.description && (
                                  <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                                    {t.description}
                                  </div>
                                )}
                              </span>

                              {!allowed && <Lock size={12} className="opacity-70 shrink-0 ml-1" />}
                            </span>

                            <ArrowRight
                              size={18}
                              className="shrink-0 opacity-90 group-active:translate-x-0.5 transition-transform duration-150"
                              style={{ color: "var(--orange)" }}
                            />
                          </Link>
                        );
                      })}
                  </div>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <TrustBar
          items={trustItems}
          speedPps={45}
          direction="rtl"
        />
      </header>

      {/* Global Components */}
      <NotificationHub isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </div >
  );
};

export default SiteHeader;
