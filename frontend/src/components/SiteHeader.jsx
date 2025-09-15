// src/components/SiteHeader.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Moon, Menu, X, ChevronDown, Lock,
  Wand2, Languages, Search, Lightbulb, Brain
} from "lucide-react";

import logoLight from "../assets/logo_light.png";
import logoDark from "../assets/logo_dark.png";

const animations = {
  fadeDown: {
    hidden: { opacity: 0, y: -12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  },
};

// --- parse JWT payload (no crypto) ---
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

// --- auth lookup (reads token + local fallbacks) ---
function getAuthState() {
  try {
    const token = localStorage.getItem("token");
    const emailLS = localStorage.getItem("userEmail");

    if (!token) return { isAuthed: false, email: null, role: null, exp: null, firstName: null, lastName: null };

    const payload = parseJwt(token) || {};
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    const now = Math.floor(Date.now() / 1000);
    if (exp && exp <= now) {
      localStorage.removeItem("token");
      return { isAuthed: false, email: null, role: null, exp: null, firstName: null, lastName: null };
    }

    const email = (payload.email || emailLS || "").trim() || null;
    const role = payload.role || localStorage.getItem("userRole") || null;
    const firstName = payload.firstName || localStorage.getItem("userFirstName") || null;
    const lastName  = payload.lastName  || localStorage.getItem("userLastName")  || null;

    return { isAuthed: true, email, role, exp, firstName, lastName };
  } catch {
    return { isAuthed: false, email: null, role: null, exp: null, firstName: null, lastName: null };
  }
}

// --- favicon swapper ---
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

const SiteHeader = ({ isDark, setIsDark }) => {
  const [workOpen, setWorkOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState("Home");
  const [progress, setProgress] = useState(0);
  const [auth, setAuth] = useState(getAuthState());

  const headerRef = useRef(null);
  const menuPanelRef = useRef(null);
  const workRef = useRef(null);
  const toolsRef = useRef(null);
  const [headerH, setHeaderH] = useState(76);

  useEffect(() => setFaviconForTheme(isDark), [isDark]);

  // react to login/logout from other tabs or pages
  useEffect(() => {
    const update = () => setAuth(getAuthState());
    window.addEventListener("storage", update);
    window.addEventListener("auth:changed", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("auth:changed", update);
    };
  }, []);

  // auto-expire
  useEffect(() => {
    if (!auth.isAuthed || !auth.exp) return;
    const now = Math.floor(Date.now() / 1000);
    const ms = Math.max(0, (auth.exp - now) * 1000 + 1000);
    const t = setTimeout(() => {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth:changed"));
    }, ms);
    return () => clearTimeout(t);
  }, [auth.isAuthed, auth.exp]);

  // progress + shadow
  const lastAnimFrame = useRef(null);
  useEffect(() => {
    const tick = () => {
      const y = window.scrollY || 0;
      setScrolled(y > 6);
      const doc = document.documentElement;
      const h = Math.max(1, doc.scrollHeight - window.innerHeight);
      setProgress(Math.min(100, (y / h) * 100));
      lastAnimFrame.current = null;
    };
    const onScroll = () => {
      if (lastAnimFrame.current == null) lastAnimFrame.current = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    tick();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (lastAnimFrame.current) cancelAnimationFrame(lastAnimFrame.current);
    };
  }, []);

  // header height -> CSS vars
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

  // section highlight (IDs: home/services/work/contact)
  const sections = useMemo(() => ["Home", "Services", "Work", "Contact"], []);
  useEffect(() => {
    const ids = sections.map((s) => s.toLowerCase());
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = visible.target.id || "";
          const match = sections.find((s) => s.toLowerCase() === id);
          if (match) setActive(match);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    const onHash = () => {
      const hash = (location.hash || "#home").replace("#", "");
      const match = sections.find((s) => s.toLowerCase() === hash);
      if (match) setActive(match);
    };
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => {
      io.disconnect();
      window.removeEventListener("hashchange", onHash);
    };
  }, [sections]);

  // close dropdowns on outside / ESC
  useEffect(() => {
    const onDocDown = (e) => {
      if (workOpen && workRef.current && !workRef.current.contains(e.target)) setWorkOpen(false);
      if (toolsOpen && toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setWorkOpen(false);
        setToolsOpen(false);
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [workOpen, toolsOpen]);

  // lock body scroll for mobile menu
  useEffect(() => {
    const lock = (v) => {
      document.documentElement.style.overflow = v ? "hidden" : "";
      document.body.style.overscrollBehavior = v ? "contain" : "";
    };
    lock(isMenuOpen);
    if (isMenuOpen && menuPanelRef.current) {
      const first = menuPanelRef.current.querySelector('a,button,[tabindex]:not([tabindex="-1"])');
      first?.focus?.();
    }
    return () => lock(false);
  }, [isMenuOpen]);

  const NavLink = ({ label, to, active }) => {
    const isActive = active === label;
    return (
      <motion.div whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
        <Link
          to={to}
          className="relative px-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
          aria-current={isActive ? "page" : undefined}
          onMouseEnter={() => setHovered(label)}
          onMouseLeave={() => setHovered(null)}
          style={{ color: isActive ? "var(--nav-hover)" : "var(--nav-link)" }}
        >
          <span
            className="absolute left-0 -bottom-1 h-[2px] bg-[var(--orange)] transition-all duration-200 rounded-full"
            style={{ width: isActive || hovered === label ? "100%" : "0%" }}
          />
          <span>{label}</span>
        </Link>
      </motion.div>
    );
  };

  // role-aware tool links
  const toolsCatalog = useMemo(
    () => [
      { name: "Auto SRT Files (Multi-Language)", path: "/tools/srt", icon: Languages, roles: ["admin", "editor"] },
      { name: "SEO Tool (Titles, Descriptions, Tags)", path: "/tools/seo", icon: Search, roles: ["admin", "editor", "client"] },
      { name: "Viral Thumbnail Ideation", path: "/tools/thumbnail-ideation", icon: Lightbulb, roles: ["admin", "editor", "client"] },
      { name: "Custom AIs", path: "/tools/custom-ais", icon: Brain, roles: ["admin"] },
    ],
    []
  );
  const role = (auth.role || "").toLowerCase();
  const toolsVisible = auth.isAuthed ? toolsCatalog.filter(t => t.roles.includes(role)) : toolsCatalog;

  const logoSrc = isDark ? logoLight : logoDark;

  const initials = (() => {
    const a = (auth.firstName || "").trim().charAt(0).toUpperCase();
    const b = (auth.lastName || "").trim().charAt(0).toUpperCase();
    if (a || b) return `${a}${b || ""}`;
    const email = auth.email || "";
    return email ? (email[0] || "?").toUpperCase() : "?";
  })();

  const displayName = auth.firstName?.trim()
    ? auth.firstName.trim()
    : (auth.email || "Signed in");

  const toolHref = (path) => (auth.isAuthed ? path : `/login?next=${encodeURIComponent(path)}`);

  return (
    <motion.div className="fixed top-0 w-full z-50">
      <motion.header
        ref={headerRef}
        variants={animations.fadeDown}
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
        {/* scroll progress */}
        <div
          className="absolute left-0 top-0 h-[2px] origin-left"
          style={{
            width: "100%",
            transform: `scaleX(${Math.max(0, Math.min(1, progress / 100)).toFixed(4)})`,
            background: "linear-gradient(90deg, var(--orange), #ff9357)",
            transition: "transform .08s linear",
            opacity: scrolled ? 1 : 0.9,
          }}
          aria-hidden="true"
        />

        {/* nav row */}
        <nav
          className="container mx-auto px-4 flex items-center justify-between"
          style={{ paddingTop: scrolled ? "6px" : "10px", paddingBottom: scrolled ? "6px" : "10px", transition: "padding .2s ease", position: "relative", zIndex: 3 }}
          aria-label="Primary"
        >
          {/* logo */}
          <Link to="/" className="flex items-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded">
            <div className="h-12 flex items-center overflow-visible">
              <motion.img
                src={logoSrc}
                alt="Shinel Studios"
                className="h-auto w-36 sm:w-44 object-contain block select-none"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
                decoding="async"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <span
              className="ml-2 hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ color: "var(--orange)", border: "1px solid var(--border)", background: "rgba(232,80,2,0.08)" }}
            >
              <Wand2 size={12} />
              AI-first
            </span>
          </Link>

          {/* desktop links */}
          <div className="hidden md:flex items-center gap-8 relative">
            <NavLink label="Home" to="/" active={active} />
            <NavLink label="Services" to="/#services" active={active} />

            {/* Our Work (simple) */}
            <div className="relative" ref={workRef}>
              <motion.button
                type="button"
                className="inline-flex items-center gap-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
                onClick={() => setWorkOpen((v) => !v)}
                initial={false}
                style={{ color: workOpen ? "var(--nav-hover)" : "var(--nav-link)" }}
              >
                <span>Our Work</span>
                <ChevronDown size={16} className={`transition-transform ${workOpen ? "rotate-180" : ""}`} />
              </motion.button>

              <AnimatePresence>
                {workOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute left-0 mt-3 w-64 rounded-2xl shadow-xl overflow-hidden"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", zIndex: 4 }}
                  >
                    {[
                      { name: "Video Editing", href: "/video-editing" },
                      { name: "GFX", href: "/gfx" },
                      { name: "Thumbnails", href: "/thumbnails" },
                      { name: "Shorts", href: "/shorts" },
                    ].map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="block w-full px-4 py-3 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                        style={{ color: "var(--orange)" }}
                        onClick={() => setWorkOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tools (role-aware) */}
            <div className="relative" ref={toolsRef}>
              <motion.button
                type="button"
                className="inline-flex items-center gap-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
                onClick={() => setToolsOpen((v) => !v)}
                initial={false}
                style={{ color: toolsOpen ? "var(--nav-hover)" : "var(--nav-link)" }}
              >
                <span>Tools</span>
                {!auth.isAuthed && <Lock size={14} className="ml-1 opacity-70" />}
                <ChevronDown size={16} className={`ml-1 transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
              </motion.button>

              <AnimatePresence>
                {toolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute left-0 mt-3 w-[320px] rounded-2xl shadow-xl overflow-hidden"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", zIndex: 4 }}
                  >
                    <div
                      className="px-4 py-2 text-[11px] font-semibold tracking-wide uppercase"
                      style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}
                    >
                      AI Tools {auth.isAuthed ? (role ? `· ${role}` : "") : "· Login required"}
                    </div>

                    {(auth.isAuthed ? toolsVisible : toolsCatalog).map(({ name, path, icon: Icon }, i, arr) => (
                      <Link
                        key={name}
                        to={toolHref(path)}
                        className="flex items-center gap-2 w-full px-4 py-3 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                        style={{
                          color: "var(--text)",
                          transition: "color .15s, background-color .15s",
                          borderBottom: i === arr.length - 1 ? "0" : "1px solid var(--border)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-alt)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        onClick={() => setToolsOpen(false)}
                        aria-label={auth.isAuthed ? name : `${name} (login required)`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
                          style={{ background: "rgba(232,80,2,0.10)", border: "1px solid var(--border)" }}
                          aria-hidden="true"
                        >
                          <Icon size={18} style={{ color: "var(--orange)" }} />
                        </div>
                        <span className="flex-1">{name}</span>
                        {!auth.isAuthed && <Lock size={14} className="opacity-70" />}
                      </Link>
                    ))}

                    <div className="px-4 py-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                      Voice/face features are consent-first & policy-compliant.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* right actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {auth.isAuthed ? (
              <>
                {/* Admin quick link */}
                {role === "admin" && (
                  <Link
                    to="/admin/users"
                    className="hidden md:inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                    style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                  >
                    Admin
                  </Link>
                )}

                {/* Studio */}
                <Link
                  to="/studio"
                  className="hidden md:inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                >
                  Studio
                </Link>

                {/* Compact identity pill */}
                <div
                  className="hidden md:flex items-center gap-2 px-2 py-1 rounded-full"
                  style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
                >
                  <div
                    aria-hidden
                    className="h-6 w-6 rounded-full grid place-items-center text-[11px] font-bold"
                    style={{ background: "var(--orange)", color: "#fff" }}
                    title={auth.email || ""}
                  >
                    {initials}
                  </div>
                  <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {displayName}
                  </span>
                  {auth.role && (
                    <span
                      className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ background: "var(--border)", color: "var(--text-muted)" }}
                    >
                      {role}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      localStorage.removeItem("token");
                      localStorage.removeItem("userEmail");
                      localStorage.removeItem("userFirstName");
                      localStorage.removeItem("userLastName");
                      localStorage.removeItem("userRole");
                      window.dispatchEvent(new Event("auth:changed"));
                    }}
                    className="ml-2 underline text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Logout
                  </button>
                </div>
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
                <motion.div className="hidden md:inline-flex">
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
                style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", color: "var(--text)" }}
                aria-label="Toggle theme"
                aria-pressed={isDark}
                whileTap={{ rotate: 180, scale: 0.9 }}
                transition={{ duration: 0.4 }}
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
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden"
              style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", paddingBottom: "max(12px, env(safe-area-inset-bottom))", position: "relative", zIndex: 3 }}
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
            >
              <nav className="px-4 py-3">
                <ul className="flex flex-col gap-2">
                  {[
                    { label: "Home", to: "/" },
                    { label: "Services", to: "/#services" },
                    { label: "Our Work", to: "/#work" },
                    ...(auth.isAuthed ? [{ label: "Studio", to: "/studio" }] : [{ label: "Tools", to: toolHref("/tools") }]),
                    ...(auth.isAuthed && role === "admin" ? [{ label: "Admin", to: "/admin/users" }] : []),
                  ].map((item) => (
                    <li key={item.label}>
                      <Link
                        to={item.to}
                        onClick={() => setIsMenuOpen(false)}
                        className="block w-full rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                        style={{ color: "var(--text)", background: "var(--surface-alt)", border: "1px solid var(--border)" }}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* AI Tools quick links (role-aware) */}
                <div className="mt-4">
                  <div className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    AI Tools {auth.isAuthed ? (role ? `· ${role}` : "") : "(login)"}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(auth.isAuthed ? toolsVisible : toolsCatalog).map(({ name, path, icon: Icon }) => (
                      <Link
                        key={name}
                        to={toolHref(path)}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                        style={{ color: "var(--text)", background: "var(--surface-alt)", border: "1px solid var(--border)" }}
                      >
                        <Icon size={16} style={{ color: "var(--orange)" }} />
                        <span className="flex-1">{name}</span>
                        {!auth.isAuthed && <Lock size={12} className="opacity-70" />}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* identity footer (mobile) */}
                {auth.isAuthed ? (
                  <div className="mt-6 flex items-center justify-between px-1 text-sm" style={{ color: "var(--text)" }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        aria-hidden
                        className="h-6 w-6 rounded-full grid place-items-center text-[11px] font-bold"
                        style={{ background: "var(--orange)", color: "#fff" }}
                        title={auth.email || ""}
                      >
                        {initials}
                      </div>
                      <span className="truncate max-w-[60%]">{displayName}</span>
                      {auth.role && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--border)", color: "var(--text-muted)" }}>
                          {role}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        localStorage.removeItem("token");
                        localStorage.removeItem("userEmail");
                        localStorage.removeItem("userFirstName");
                        localStorage.removeItem("userLastName");
                        localStorage.removeItem("userRole");
                        window.dispatchEvent(new Event("auth:changed"));
                        setIsMenuOpen(false);
                      }}
                      className="underline text-xs"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="mt-6">
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full rounded-full px-5 py-3 text-center font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                      style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                    >
                      Login
                    </Link>
                  </div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </motion.div>
  );
};

export default SiteHeader;
