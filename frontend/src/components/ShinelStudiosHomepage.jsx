/* ===================== Imports & Globals (TOP OF FILE ONLY) ===================== */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sun, Moon, Menu, X, ChevronDown, Play, Image, TrendingUp, FileText,
  MessageCircle, Users, Eye, Target, Mail, Twitter, Instagram, 
  Linkedin, Zap, Wand2, PenTool, Bot, Megaphone, BarChart3, Quote, ExternalLink, Star, MousePointer2, Timer} from "lucide-react";

/**
 * Centralized asset glob (Vite)
 * - New syntax: { query: '?url', import: 'default' } replaces deprecated "as: 'url'"
 * - Loads anything under /src/assets (creators, logos, proofs, etc.)
 * - Access via findAssetByBase()
 */
const ALL_ASSETS = import.meta.glob(
  "../assets/**/*.{png,jpg,jpeg,webp,svg}",
  { eager: true, query: "?url", import: "default" }
);

/* ===================== Shared Helpers ===================== */

/** Safe INR formatter (no decimals by default) */
export const formatINR = (num, options = {}) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
      ...options,
    }).format(Number(num || 0));
  } catch {
    return `₹${num}`;
  }
};

/** Find first asset whose basename contains key (case-insensitive) */
export const findAssetByBase = (key, map = ALL_ASSETS) => {
  if (!key) return null;
  const search = String(key).toLowerCase();
  for (const p in map) {
    const url = map[p];
    if (typeof url !== "string") continue;const file = p.split("/").pop() || "";
    const base = file.replace(/\.(png|jpe?g|webp|svg)$/i, "").toLowerCase();
    if (base.includes(search)) return map[p];
  }
  return null;
};


/** Tiny inline SVG placeholder */
export const svgPlaceholder = (label = "Image") => {
  const safe = String(label).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0%' stop-color='#FFF1E8'/><stop offset='100%' stop-color='#FFE4D6'/></linearGradient></defs>` +
    `<rect fill='url(#g)' width='800' height='450'/>` +
    `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#E85002' font-family='Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' font-size='28' font-weight='700'>${safe}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/** Lightweight analytics dispatcher (no-op safe) */
export const track = (ev, detail = {}) => {
  try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev, ...detail } })); } catch {}
};

/* Motion variants (shared) */
export const animations = {
  fadeDown: { hidden:{opacity:0,y:-12}, visible:{opacity:1,y:0,transition:{duration:.35,ease:"easeOut"}} },
  fadeUp:   { hidden:{opacity:0,y: 16}, visible:{opacity:1,y:0,transition:{duration:.35,ease:"easeOut"}} },
  fadeIn:   { hidden:{opacity:0},       visible:{opacity:1,      transition:{duration:.35,ease:"easeOut"}} },
  staggerParent: { hidden:{}, visible:{ transition:{ staggerChildren:.08 } } },
  scaleIn: { hidden:{opacity:0,scale:.96,y:8}, visible:{opacity:1,scale:1,y:0,transition:{duration:.25,ease:"easeOut"}} },
};

// card hover polish for grids
export const tiltHover = {
  whileHover: { y: -3, rotateX: 0.6, rotateY: -0.6 },
  transition: { type: "spring", stiffness: 240, damping: 18 }
};


/* Brand palette (read by sections for consistent styling) */
export const BRAND = {
  orange: "#E85002",
  orangeLight: "#FFB48A",
  light: {
    text: "#0D0D0D",
    textMuted: "rgba(13,13,13,0.7)",
    surface: "#FFFFFF",
    surfaceAlt: "#FFF9F6",
    border: "rgba(0,0,0,0.10)",
    headerBg: "rgba(255,255,255,0.85)",
  },
  dark: {
    text: "#FFFFFF",
    textMuted: "rgba(255,255,255,0.7)",
    surface: "#0F0F0F",
    surfaceAlt: "#0B0B0B",
    border: "rgba(255,255,255,0.12)",
    headerBg: "rgba(0,0,0,0.75)",
  },
};

/* Consistent CTA buttons */
export const BrandButton = ({ href, onClick, className = "", children, ...rest }) => {
  const Base = href ? motion.a : motion.button;
  const baseProps = href ? { href } : { type: "button", onClick };
  return (
    <Base
      {...baseProps}
      {...rest}
      className={`relative overflow-hidden rounded-full px-6 py-3 text-white font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${className}`}
      style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)", boxShadow: "0 10px 26px rgba(232,80,2,.35), inset 0 0 0 1px rgba(255,255,255,.08)" }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3"
        style={{
          background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.28) 50%, rgba(255,255,255,0) 100%)",
          filter: "blur(5px)",
        }}
        initial={{ x: "-120%" }}
        animate={{ x: ["-120%", "120%"] }}
        transition={{ repeat: Infinity, duration: 1.9, ease: "linear" }}
      />
      <span className="relative z-10">{children}</span>
    </Base>
  );
};

export const GhostButton = ({ href, onClick, className = "", children, ...rest }) => (
  <motion.a
    href={href}
    onClick={onClick}
    {...rest}
    className={`rounded-full px-6 py-3 font-semibold text-center ${className}`}
    style={{
      color: "var(--text, #0b0b0b)",
      border: "1px solid var(--border, rgba(0,0,0,.16))",
      background: "var(--btn-ghost-bg, rgba(255,255,255,.75))",
      boxShadow: "var(--btn-ghost-shadow, 0 4px 12px rgba(0,0,0,.06))",
    }}
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.98 }}
  >
    {children}
  </motion.a>
);

/* Resolve logos via asset glob (fallbacks if missing) */
export const logoLight =
  findAssetByBase("logo_light") || findAssetByBase("logo-light") || svgPlaceholder("Shinel Studios");
export const logoDark  =
  findAssetByBase("logo_dark")  || findAssetByBase("logo-dark")  || svgPlaceholder("Shinel Studios");

export const SAMPLE_BEFORE = findAssetByBase("sample_before") || svgPlaceholder("Before");
export const SAMPLE_AFTER  = findAssetByBase("sample_after")  || svgPlaceholder("After");

/* ===================== Header (thinner) ===================== */
const Header = ({ isDark, setIsDark /* onBook removed */ }) => {
  const [workOpen, setWorkOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState("Home");
  const [progress, setProgress] = useState(0);
  const [quickBarVisible, setQuickBarVisible] = useState(false);

  // Measure + IO
  const headerRef = useRef(null);
  const menuPanelRef = useRef(null);
  const workRef = useRef(null);
  /* ↓ default fallback height slightly smaller (was 92) */
  const [headerH, setHeaderH] = useState(76);

  // RAF scroll/throttle
  const lastAnimFrame = useRef(null);

  const sections = useMemo(() => ["Home", "Services", "Testimonials", "Contact"], []);
  const workItems = useMemo(
    () => [
      { name: "Video Editing", href: "/video-editing" },
      { name: "GFX", href: "/gfx" },
      { name: "Thumbnails", href: "/thumbnails" },
      { name: "Shorts", href: "/shorts" },
    ],
    []
  );

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- scroll/progress + pin logic ---------- */
  useEffect(() => {
    const TOL = 6;
    const tick = () => {
      const y = window.scrollY || 0;
      setScrolled(y > 8);

      const doc = document.documentElement;
      const h = Math.max(1, doc.scrollHeight - window.innerHeight);
      setProgress(Math.min(100, (y / h) * 100));

      lastAnimFrame.current = null;
    };
    const onScroll = () => { if (lastAnimFrame.current == null) lastAnimFrame.current = requestAnimationFrame(tick); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    tick();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (lastAnimFrame.current) cancelAnimationFrame(lastAnimFrame.current);
    };
  }, []);

  /* ---------- header size → CSS vars for offsets ---------- */
  useEffect(() => {
    if (!headerRef.current || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver((entries) => {
      const h = Math.round(entries[0].contentRect.height) || 76; // was 92
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

  /* ---------- section tracking (IO + hash) ---------- */
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
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    const onHash = () => {
      const hash = (location.hash || "#home").replace("#", "");
      const match = sections.find((s) => s.toLowerCase() === hash);
      if (match) setActive(match);
    };
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => { io.disconnect(); window.removeEventListener("hashchange", onHash); };
  }, [sections]);

  /* ---------- QuickQuoteBar sync ---------- */
  useEffect(() => {
    const handler = (e) => setQuickBarVisible(Boolean(e.detail?.visible));
    document.addEventListener("qqb:visible", handler);
    return () => document.removeEventListener("qqb:visible", handler);
  }, []);

  /* ---------- Our Work dropdown: hover intent + outside ---------- */
  const hoverTimer = useRef(null);
  const onWorkEnter = () => { clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setWorkOpen(true), 80); setHovered("Our Work"); };
  const onWorkLeave = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => { setHovered(null); setWorkOpen(false); }, 120);
  };
  useEffect(() => {
    const onDocDown = (e) => { if (!workOpen) return; if (workRef.current && !workRef.current.contains(e.target)) setWorkOpen(false); };
    const onEsc = (e) => { if (e.key === "Escape") { setWorkOpen(false); setIsMenuOpen(false); } };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown, { passive: true });
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [workOpen]);

  /* ---------- Mobile menu lock + focus ---------- */
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

  // Mobile reveal items
  const mobileItem = {
    hidden: { opacity: 0, y: 10 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.045 * i, duration: 0.18, ease: "easeOut" } }),
  };

  const NavLink = ({ label, active }) => {
    const isActive = active === label;
    return (
      <motion.a
        href={`#${label.toLowerCase()}`}
        className="relative px-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
        aria-current={isActive ? "page" : undefined}
        data-navlink
        onMouseEnter={() => setHovered(label)}
        onMouseLeave={() => setHovered(null)}
        initial={false}
        /* color now from CSS vars so theme swap is instant */
        style={{ color: isActive ? "var(--nav-hover)" : "var(--nav-link)" }}
        whileHover={reduceMotion ? {} : { y: -1, letterSpacing: 0.2 }}
        transition={{ duration: 0.22 }}
      >
        <span className="nav-ink" aria-hidden="true" />
        <span className="sr-only">{isActive ? "Current section: " : ""}</span>
        <span aria-hidden="true" className="nav-label">{label}</span>
      </motion.a>
    );
  };

  return (
    <motion.div className="fixed top-0 w-full z-50">
      <motion.header
        ref={headerRef}
        variants={animations.fadeDown}
        initial="hidden"
        animate="visible"
        role="banner"
        style={{
          background: "var(--header-bg)",
          paddingTop: "max(0px, env(safe-area-inset-top))",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderBottom: "0",
          boxShadow: scrolled ? "0 6px 18px rgba(0,0,0,0.16)" : "none",
          transition: "box-shadow .25s ease",
        }}
      >
        {/* Skip link */}
        <a href="#services" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[100] bg-[var(--orange)] text-white px-3 py-2 rounded">
          Skip to content
        </a>

        {/* Top progress (height thinner: was 1.5px) */}
        <div
          className="absolute left-0 top-0 h-[1px] origin-left"
          style={{
            width: "100%",
            transform: `scaleX(${Math.max(0, Math.min(1, progress / 100)).toFixed(4)})`,
            background: "linear-gradient(90deg, var(--orange), #ff9357)",
            transition: reduceMotion ? "none" : "transform .08s linear",
          }}
          aria-hidden="true"
        />

        <nav
          className="container mx-auto px-4 flex items-center justify-between"
          /* tighter vertical padding: was 10/6 */
          style={{
            paddingTop: scrolled ? "4px" : "8px",
            paddingBottom: scrolled ? "4px" : "8px",
            transition: "padding .2s ease"
          }}
          aria-label="Primary"
        >
          {/* Brand (match Login sizing) */}
          <a
            href="#home"
            className="flex items-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
          >
            <div className="h-12 flex items-center overflow-visible">
              <img
                src={isDark ? logoLight : logoDark}
                alt="Shinel Studios"
                className="h-full w-auto object-contain block select-none"
                style={{
                  transform: "scale(2.8)",
                  transformOrigin: "left center",
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))",
                }}
                decoding="async"
              />
            </div>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-10 relative">
            <NavLink label="Home" active={active} />
            {sections.filter((s) => s !== "Home").map((s) => (
              <NavLink key={s} label={s} active={active} />
            ))}

            {/* Our Work dropdown */}
            <div
              className="relative"
              ref={workRef}
              onMouseEnter={onWorkEnter}
              onMouseLeave={onWorkLeave}
            >
              <motion.button
                type="button"
                className="inline-flex items-center gap-1 text-[15px] lg:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
                aria-expanded={workOpen}
                aria-haspopup="menu"
                aria-controls="our-work-menu"
                onFocus={() => setHovered("Our Work")}
                onBlur={() => setHovered(null)}
                onClick={() => setWorkOpen((v) => !v)}
                initial={false}
                /* color now from CSS vars */
                style={{ color: (hovered === "Our Work" || workOpen) ? "var(--nav-hover)" : "var(--nav-link)" }}
                whileHover={reduceMotion ? {} : { y: -1, letterSpacing: 0.2 }}
                transition={{ duration: 0.22 }}
              >
                <span className="nav-ink" aria-hidden="true" />
                <span className="nav-label">Our Work</span>
                <ChevronDown size={16} className={`transition-transform ${workOpen ? "rotate-180" : ""}`} />
              </motion.button>

              <AnimatePresence>
                {workOpen && (
                  <motion.div
                    id="our-work-menu"
                    role="menu"
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute left-0 mt-3 w-64 rounded-xl shadow-xl overflow-hidden"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    onMouseEnter={() => setHovered("Our Work")}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {workItems.map((item) => (
                      <Link
                        key={item.name}
                        role="menuitem"
                        tabIndex={0}
                        to={item.href}
                        className="block w-full px-4 py-3 text-left font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                        style={{ color: "var(--orange)", transition: "color .15s, background-color .15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--orange)"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--orange)"; }}
                        onClick={() => setWorkOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right actions (audit removed; Login slightly larger for balance) */}
          <div className="flex items-center gap-2 md:gap-3">
            <motion.div className="hidden md:inline-flex">
              <Link
                to="/login"
                className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
              >
                Login
              </Link>
            </motion.div>

            <motion.button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
              style={{ background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", color: "var(--text)" }}
              aria-label="Toggle theme"
              aria-pressed={isDark}
              whileTap={{ rotate: 180, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </motion.button>

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

        {/* Mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              id="mobile-menu"
              ref={menuPanelRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden"
              style={{
                background: "var(--surface)",
                borderTop: "1px solid var(--border)",
                paddingBottom: "max(12px, env(safe-area-inset-bottom))"
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
            >
              <nav className="px-4 py-3">
                {/* Main links */}
                <motion.ul
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col gap-2"
                >
                  {[
                    { label: "Home", href: "#home" },
                    { label: "Services", href: "#services" },
                    { label: "Testimonials", href: "#testimonials" },
                    { label: "Contact", href: "#contact" },
                  ].map((item, i) => (
                    <motion.li
                      key={item.label}
                      variants={mobileItem}
                      custom={i}
                    >
                      <a
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          setIsMenuOpen(false);
                          const el = document.querySelector(item.href);
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="block w-full rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                        style={{
                          color: "var(--text)",
                          background: "var(--surface-alt)",
                          border: "1px solid var(--border)"
                        }}
                      >
                        {item.label}
                      </a>
                    </motion.li>
                  ))}
                </motion.ul>

                {/* Our Work shortcuts */}
                <div className="mt-4">
                  <div
                    className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Our Work
                  </div>
                  <motion.div
                    className="grid grid-cols-2 gap-2"
                    initial="hidden"
                    animate="visible"
                  >
                    {[
                      { name: "Video Editing", to: "/video-editing" },
                      { name: "Thumbnails", to: "/thumbnails" },
                      { name: "Shorts", to: "/shorts" },
                      { name: "GFX", to: "/gfx" },
                    ].map((item, i) => (
                      <motion.div key={item.name} variants={mobileItem} custom={i}>
                        <Link
                          to={item.to}
                          onClick={() => setIsMenuOpen(false)}
                          className="block rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                          style={{
                            color: "var(--text)",
                            background: "var(--surface-alt)",
                            border: "1px solid var(--border)"
                          }}
                        >
                          {item.name}
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>

                {/* CTAs (Audit removed; keep Login only) */}
                <div className="mt-6 flex flex-col gap-2">
                  <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block w-full rounded-full px-5 py-3 text-center font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                      style={{
                        color: "var(--text)",
                        background: "transparent",
                        border: "1px solid var(--border)"
                      }}
                    >
                      Login
                    </Link>
                  </motion.div>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust/Rating bar (unchanged) */}
        <TrustBar />

        <style>{`
  /* Keep any decorative ::after off */
  header[role="banner"] nav a::after,
  header[role="banner"] nav [data-navlink]::after { content: none !important; display: none !important; }

  /* Ensure text inherits from CSS vars set by theme */
  header[role="banner"] nav .nav-label { color: inherit !important; }

  /* Default link color from theme */
  header[role="banner"] nav [data-navlink],
  header[role="banner"] nav button[aria-controls="our-work-menu"] {
    color: var(--nav-link) !important;
  }

  /* Active/hover state = brand orange */
  header[role="banner"] nav [data-navlink]:hover,
  header[role="banner"] nav [data-navlink][aria-current="page"],
  header[role="banner"] nav button[aria-controls="our-work-menu"]:hover,
  header[role="banner"] nav button[aria-controls="our-work-menu"][aria-expanded="true"] {
    color: var(--nav-hover) !important;
  }

  /* Remove stray borders from the header stack */
  header[role="banner"] *,
  header[role="banner"] { border-bottom-width: 0 !important; }
  header[role="banner"] .trustbar { border-top: 0 !important; }
`}</style>

      </motion.header>
    </motion.div>
  );
};

/* ===================== Calendly Modal (focus-trap, ARIA polish, safer sandbox) ===================== */

const buildCalendlyUrl = () => {
  const base = "https://calendly.com/shinelstudios/15min-audit";
  try {
    const u = new URL(base);
    const utm = JSON.parse(localStorage.getItem("utm") || "{}");
    Object.entries(utm).forEach(([k, v]) => u.searchParams.set(k, v));
    u.searchParams.set("hide_event_type_details", "1");
    u.searchParams.set("primary_color", "E85002");
    return u.toString();
  } catch {
    return base;
  }
};

const CalendlyModal = ({ open, onClose }) => {
  const dialogRef = useRef(null);
  const firstFocusable = useRef(null);
  const lastFocusable = useRef(null);
  const url = useMemo(buildCalendlyUrl, []); // stable per mount

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    // focus trap
    const el = dialogRef.current;
    if (el) {
      const focusables = el.querySelectorAll(
        'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length) {
        firstFocusable.current = focusables[0];
        lastFocusable.current = focusables[focusables.length - 1];
        firstFocusable.current.focus();
      }
    }

    const onKeydown = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab" && firstFocusable.current && lastFocusable.current) {
        if (e.shiftKey && document.activeElement === firstFocusable.current) {
          e.preventDefault(); lastFocusable.current.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable.current) {
          e.preventDefault(); firstFocusable.current.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeydown);

    return () => {
      document.documentElement.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeydown);
    };
  }, [open, onClose]);

  if (!open) return null;
  const onOverlay = (e) => { if (e.currentTarget === e.target) onClose?.(); };

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Free 15-minute content audit"
      onMouseDown={onOverlay}
      onTouchStart={onOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        ref={dialogRef}
        className="bg-[var(--surface)] rounded-2xl w-full max-w-3xl overflow-hidden border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
        style={{ borderColor: "var(--border)" }}
        initial={{ scale: 0.98, y: 8, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.98, y: 8, opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ color: "var(--text)" }}>
          <b>Free 15-min Content Audit</b>
          <button
            onClick={onClose}
            className="text-sm opacity-80 hover:opacity-100 px-3 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            aria-label="Close scheduling dialog"
          >
            Close
          </button>
        </div>

        <div className="h-[70vh]">
          <iframe
            title="Book a call"
            src={url}
            className="w-full h-full"
            style={{ border: 0 }}
            loading="lazy"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ===================== Trust Bar (appears after hero, marquee, pro icons) ===================== */
const TrustBar = () => {
  const [show, setShow] = React.useState(false);
  const [qqbHidden, setQqbHidden] = React.useState(true);

  // Respect reduced motion
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // Hide when your Quick Quote Bar is visible
  React.useEffect(() => {
    const onToggle = (e) => setQqbHidden(!Boolean(e.detail?.visible));
    document.addEventListener("qqb:visible", onToggle);
    return () => document.removeEventListener("qqb:visible", onToggle);
  }, []);

  // Show only after we pass the hero (#home). Works on mobile/desktop.
  React.useEffect(() => {
    let raf = null;

    const getHeaderH = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--header-h");
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : 76;
    };

    const computeShow = () => {
      const hero = document.getElementById("home");
      const headerH = getHeaderH();
      if (!hero) {
        const y = window.scrollY || 0;
        setShow(qqbHidden && y > 140);
        return;
      }
      const heroBottom = hero.offsetTop + hero.offsetHeight;
      const y = window.scrollY || 0;
      const BUFFER = 6; // small hysteresis to avoid flicker
      setShow(qqbHidden && y + headerH > heroBottom - BUFFER);
    };

    const onScrollOrResize = () => {
      if (raf == null)
        raf = requestAnimationFrame(() => {
          raf = null;
          computeShow();
        });
    };

    computeShow();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [qqbHidden]);

  // ---- Content (icons + short proof points) ----
  const items = [
    {
      icon: Star,
      text: (
        <>
          Rated <b>4.7/5</b> by creators
        </>
      ),
      aria: "Rated 4.7 out of 5 by creators",
    },
    {
      icon: Users,
      text: (
        <>
          <b>20+ active</b> clients
        </>
      ),
      aria: "More than 20 active clients",
    },
    {
      icon: MousePointer2,
      text: (
        <>
          Thumbnails deliver <b>+40% CTR</b>
        </>
      ),
      aria: "Thumbnails deliver plus forty percent click-through rate",
    },
    {
      icon: Timer,
      text: (
        <>
          Edits drive <b>2× watch time</b>
        </>
      ),
      aria: "Edits drive two times watch time",
    },
    {
      icon: Eye,
      text: (
        <>
          <b>7M+ views</b> driven
        </>
      ),
      aria: "Over seven million views driven",
    },
    {
      icon: TrendingUp,
      text: (
        <>
          Shorts → <b>predictable growth</b>
        </>
      ),
      aria: "Shorts lead to predictable growth",
    },
  ];

  // Single item renderer
  const RowItem = ({ Icon, children, aria }) => (
    <span className="inline-flex items-center gap-2">
      <Icon size={14} style={{ color: "var(--text)" }} aria-hidden="true" />
      <span aria-label={aria} style={{ color: "var(--text)" }} className="align-middle">
        {children}
      </span>
    </span>
  );

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          className="w-full trustbar"
          style={{
            background: "var(--header-bg)",
            boxShadow: "inset 0 1px 0 var(--border)",
          }}
          role="region"
          aria-label="Trust indicators"
          initial={reduceMotion ? false : { y: -8, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { y: -8, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div
            className="overflow-hidden select-none"
            style={{
              WebkitMaskImage:
                "linear-gradient(90deg, transparent, black 6%, black 94%, transparent)",
              maskImage:
                "linear-gradient(90deg, transparent, black 6%, black 94%, transparent)",
            }}
          >
            {reduceMotion ? (
              // Static line for reduced motion
              <div className="container mx-auto px-3 py-1.5 text-center text-[11px] md:text-sm">
                <div className="inline-flex items-center gap-6 md:gap-10">
                  {items.map((it, i) => (
                    <RowItem key={i} Icon={it.icon} aria={it.aria}>
                      {it.text}
                    </RowItem>
                  ))}
                </div>
              </div>
            ) : (
              // Smooth marquee
              <div className="relative py-1.5">
                <div className="marquee-row whitespace-nowrap will-change-transform">
                  <span className="inline-flex items-center gap-6 md:gap-10 px-3 text-[11px] md:text-sm">
                    {items.map((it, i) => (
                      <React.Fragment key={`a-${i}`}>
                        <RowItem Icon={it.icon} aria={it.aria}>
                          {it.text}
                        </RowItem>
                        {/* fancy separator */}
                        <span
                          className="mx-1 md:mx-2 h-[6px] w-[6px] rounded-full inline-block"
                          style={{
                            background:
                              "radial-gradient(circle at 30% 30%, #fff 0%, #ffd9c7 45%, rgba(255,255,255,0) 70%)",
                            boxShadow: "0 0 10px rgba(232,80,2,0.35)",
                            opacity: 0.85,
                          }}
                          aria-hidden="true"
                        />
                      </React.Fragment>
                    ))}
                  </span>
                  {/* duplicate for seamless loop */}
                  <span className="inline-flex items-center gap-6 md:gap-10 px-3 text-[11px] md:text-sm">
                    {items.map((it, i) => (
                      <React.Fragment key={`b-${i}`}>
                        <RowItem Icon={it.icon} aria={it.aria}>
                          {it.text}
                        </RowItem>
                        <span
                          className="mx-1 md:mx-2 h-[6px] w-[6px] rounded-full inline-block"
                          style={{
                            background:
                              "radial-gradient(circle at 30% 30%, #fff 0%, #ffd9c7 45%, rgba(255,255,255,0) 70%)",
                            boxShadow: "0 0 10px rgba(232,80,2,0.35)",
                            opacity: 0.85,
                          }}
                          aria-hidden="true"
                        />
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>

          <style>{`
            .marquee-row {
              display: inline-block;
              min-width: 200%;
              animation: ss-marquee 28s linear infinite;
            }
            /* Pause on hover (desktop) for readability */
            @media (hover: hover) and (pointer: fine) {
              .trustbar:hover .marquee-row { animation-play-state: paused; }
            }
            @keyframes ss-marquee {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            /* Subtle speed-up on small screens to keep density comfortable */
            @media (max-width: 480px) {
              .marquee-row { animation-duration: 24s; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};



/* ===================== Quick Quote Bar (compact + proximity hide near form + event listener) ===================== */
const QuickQuoteBar = ({ onBook }) => {
  const [showBase, setShowBase] = React.useState(false);   // base “scrolled enough” rule
  const [nearForm, setNearForm] = React.useState(false);   // hide when approaching lead form
  const [forcedHidden, setForcedHidden] = React.useState(false); // hide via leadform:visible event

  // (NEW) Hide when the lead form broadcasts visibility
  React.useEffect(() => {
    const onLead = (e) => {
      // if the form is visible, force-hide the bar (mirrors your snippet)
      setForcedHidden(Boolean(e?.detail?.visible));
    };
    document.addEventListener("leadform:visible", onLead);
    return () => document.removeEventListener("leadform:visible", onLead);
  }, []);

  // show after 20% scroll
  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      const h = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setShowBase(h > 0 && y / h > 0.2);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // hide when we're close to the lead form (both down and up directions)
  React.useEffect(() => {
    const target = () => document.getElementById("leadform") || document.getElementById("leadform-section");
    const check = () => {
      const el = target();
      if (!el) return setNearForm(false);
      const rect = el.getBoundingClientRect();
      // if the form’s top is within ~220px of the viewport top, hide the QQB
      setNearForm(rect.top < 220 && rect.bottom > 0);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  const visible = showBase && !nearForm && !forcedHidden;

  // broadcast visibility so Header/TrustBar can react
  React.useEffect(() => {
    document.dispatchEvent(new CustomEvent("qqb:visible", { detail: { visible } }));
    return () =>
      document.dispatchEvent(new CustomEvent("qqb:visible", { detail: { visible: false } }));
  }, [visible]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      className="hidden md:block fixed left-0 right-0 z-40"
      style={{ top: "calc(var(--header-offset, var(--header-h, 92px)) + 10px)" }}
    >
      <div className="container mx-auto px-4">
        <motion.div
          className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 18px rgba(0,0,0,0.12)",
          }}
          initial={{ filter: "saturate(0.96)" }}
          animate={{ filter: "saturate(1)" }}
          transition={{ duration: 0.2 }}
        >
          <span className="text-sm" style={{ color: "var(--text)" }}>
            🚀 Get a <b>free content audit</b> in 24 hours.
          </span>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => onBook?.()}
              className="rounded-lg px-4 h-[36px] text-sm font-semibold text-white relative overflow-hidden"
              style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.span
                aria-hidden="true"
                initial={false}
                animate={{ x: ["-120%", "120%"] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.30) 50%, rgba(255,255,255,0) 100%)",
                  filter: "blur(5px)",
                }}
              />
              Get Free Audit
            </motion.button>

            <motion.a
              href="#contact"
              className="rounded-lg px-4 h-[36px] grid place-items-center text-sm font-semibold"
              style={{ border: "2px solid var(--orange)", color: "var(--orange)" }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Quote
            </motion.a>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};


/* ===================== Hero (responsive, tone-aware, efficient) ===================== */
const HeroSection = ({ isDark, onAudit }) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleAudit = () => {
    try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "cta_click_audit", src: "hero" } })); } catch {}
    onAudit?.();
  };

  const handleSeeWork = (e) => {
    e.preventDefault();
    try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "see_work", src: "hero" } })); } catch {}
    const el = document.querySelector("#work");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---------- Efficient, adaptive star field ---------- */
  const fieldRef = React.useRef(null);

  // Count adapts to width, theme & DPR; disabled if reduced motion
  const stars = React.useMemo(() => {
    if (reduceMotion) return [];
    const w = typeof window !== "undefined" ? window.innerWidth : 1280;
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;

    // base by breakpoint
    if (w < 340) return []; // ultra-small devices: skip completely
    let base = w < 380 ? 0 : w < 640 ? 8 : w < 1024 ? 10 : 12;
    // fewer in light
    if (!isDark) base = Math.max(0, Math.round(base * 0.6));
    // dampen on high DPR phones
    base = Math.round(base / (dpr > 1.5 ? 1.25 : 1));

    const out = [];
    for (let i = 0; i < base; i++) {
      out.push({
        top: `${12 + ((i * 13 + 37) % 72)}%`,
        left: `${6 + ((i * 23 + 37) % 88)}%`,
        size: 9 + ((i * 3) % 5),
        delay: (i * 0.35) % 2.2,
        drift: i % 2 ? 6 : -6,
        rot: (i * 37) % 360,
        speed: 2.3 + ((i % 5) * 0.35), // varied twinkle duration
      });
    }
    return out;
  }, [reduceMotion, isDark]);

  // Pause star animations when hero is off-screen (battery friendly)
  React.useEffect(() => {
    if (!fieldRef.current || !("IntersectionObserver" in window)) return;
    const root = fieldRef.current;
    const io = new IntersectionObserver(
      ([entry]) => root.setAttribute("data-animate", entry.isIntersecting ? "1" : "0"),
      { rootMargin: "-10% 0px -70% 0px", threshold: [0, 0.2] }
    );
    const section = root.closest("section");
    if (section) io.observe(section);
    return () => io.disconnect();
  }, []);

  const bgDark =
    "radial-gradient(900px 500px at -10% -20%, rgba(232,80,2,.14), transparent 55%), radial-gradient(900px 500px at 110% -20%, rgba(232,80,2,.08), transparent 55%), linear-gradient(180deg,#0b0b0b,#101010 45%, #0e0e0e)";
  const bgLight =
    "linear-gradient(180deg,#fffdfb 0%,#fff8f2 55%, #fff3ea 100%), radial-gradient(750px 420px at 0% -10%, rgba(232,80,2,.06), transparent 60%), radial-gradient(750px 420px at 100% -10%, rgba(255,147,87,.05), transparent 60%)";

  return (
    <section
      id="home"
      className="relative overflow-hidden"
      style={{
        padding: "clamp(80px, 9vw, 132px) 0 clamp(40px, 6vw, 96px)",
        background: isDark ? bgDark : bgLight,
        contentVisibility: "auto",
        containIntrinsicSize: "900px",
      }}
      aria-label="Shinel Studios introduction"
    >
      {/* Star field (behind content) */}
      {!reduceMotion && (
        <div ref={fieldRef} className="ss-field pointer-events-none absolute inset-0 z-0" data-animate="1" aria-hidden="true">
          {stars.map((s, i) => (
            <span
              key={i}
              className={`ss-sparkle ${isDark ? "dark" : "light"}`}
              style={{
                top: s.top,
                left: s.left,
                ["--s"]: `${s.size}px`,
                ["--delay"]: `${s.delay}s`,
                ["--drift"]: `${s.drift}px`,
                ["--rot"]: `${s.rot}deg`,
                ["--spd"]: `${s.speed}s`,
                opacity: isDark ? 0.9 : 0.7,
              }}
            />
          ))}
        </div>
      )}

      <div className="container mx-auto px-4 relative z-[1]">
        {/* Headline: perfect wrap on phones */}
        <motion.h1
          className="font-bold font-['Poppins'] tracking-tight hero-title"
          style={{
            color: isDark ? "#fff" : "#0b0b0b",
            lineHeight: 1.06,
            letterSpacing: "-.01em",
            fontSize: "clamp(2rem, 6.6vw, 4.5rem)",
            maxWidth: "28ch",
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 18 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span className="block md:inline">Packaging that boosts CTR.</span>{" "}
          <span className="block md:inline">Edits that keep people watching.</span>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          className="mt-3 sm:mt-4"
          style={{
            color: isDark ? "rgba(255,255,255,.80)" : "rgba(20,20,20,.75)",
            fontSize: "clamp(1rem, 2.2vw, 1.25rem)",
            maxWidth: "52ch",
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          We help creators win attention with thumb-stopping thumbnails, hook-first shorts, and clean long-form edits.
        </motion.p>

        {/* Proof strip (stacks on phones) */}
        <motion.div
          className="mt-5 sm:mt-6 rounded-2xl"
          style={{
            background: isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.045)",
            border: `1px solid ${isDark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.08)"}`,
            backdropFilter: "blur(6px)",
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          aria-label="Social proof"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-0 px-4 py-3">
            <div className="flex items-center justify-start sm:justify-center gap-2 text-sm" style={{ color: isDark ? "rgba(255,255,255,.92)" : "#1a1a1a" }}>
              {/* star icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              Rated <strong className="ml-1">4.7/5</strong>
            </div>
            <div className="flex items-center justify-start sm:justify-center gap-2 text-sm" style={{ color: isDark ? "rgba(255,255,255,.92)" : "#1a1a1a" }}>
              {/* users icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M20 21v-2a4 4 0 0 0-3-3.87M12 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm6-1a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <strong>20+ active</strong> clients
            </div>
            <div className="flex items-center justify-start sm:justify-center gap-2 text-sm" style={{ color: isDark ? "rgba(255,255,255,.92)" : "#1a1a1a" }}>
              {/* eye icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <strong>7M+</strong> views
            </div>
          </div>
        </motion.div>

        {/* CTAs */}
        <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
          <motion.button
            onClick={handleAudit}
            className="w-full sm:w-auto rounded-full px-6 py-3 text-white font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)", boxShadow: "0 10px 26px rgba(232,80,2,.35), inset 0 0 0 1px rgba(255,255,255,.08)" }}
            whileHover={reduceMotion ? {} : { y: -2 }}
            whileTap={reduceMotion ? {} : { scale: 0.98 }}
            aria-label="Get Free Audit"
          >
            Get Free Audit
          </motion.button>

          <motion.a
            href="#work"
            onClick={handleSeeWork}
            className="w-full sm:w-auto rounded-full px-6 py-3 font-semibold text-center"
            style={{
              color: isDark ? "#fff" : "#0b0b0b",
              border: `1px solid ${isDark ? "rgba(255,255,255,.22)" : "rgba(0,0,0,.16)"}`,
              background: isDark ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.75)",
              boxShadow: isDark ? "0 2px 10px rgba(0,0,0,.25)" : "0 4px 12px rgba(0,0,0,.06)",
            }}
            whileHover={reduceMotion ? {} : { y: -2 }}
            whileTap={reduceMotion ? {} : { scale: 0.98 }}
          >
            See Work
          </motion.a>
        </div>
      </div>

      {/* Styles: tone-aware sparkles + efficiency guards */}
      <style>{`
        .hero-title { text-wrap: balance; }

        .ss-field[data-animate="0"] .ss-sparkle { animation-play-state: paused !important; }

        .ss-sparkle {
          position: absolute;
          width: var(--s, 12px);
          height: var(--s, 12px);
          transform: translate3d(0,0,0);
          border-radius: 9999px;
          will-change: transform, opacity, filter;
          animation:
            ss-twinkle var(--spd,2.6s) ease-in-out infinite var(--delay,0s),
            ss-drift 7s ease-in-out infinite alternate var(--delay,0s);
        }

        /* Dark: bright cross-flare, screen blend */
        .ss-sparkle.dark {
          background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,147,87,.95) 45%, rgba(255,147,87,0) 70%);
          filter: drop-shadow(0 2px 12px rgba(232,80,2,.35));
          mix-blend-mode: screen;
        }
        .ss-sparkle.dark::before,
        .ss-sparkle.dark::after {
          content: ""; position: absolute; left: 50%; top: 50%;
          width: calc(var(--s,12px) * 1.8); height: 2px; border-radius: 2px;
          transform-origin: center center; transform: translate(-50%, -50%) rotate(var(--rot, 0deg));
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.95), transparent); opacity: .85;
        }
        .ss-sparkle.dark::after { transform: translate(-50%, -50%) rotate(calc(var(--rot, 0deg) + 90deg)); opacity: .75; }

        /* Light: soft amber glint, multiply blend (no harsh white) */
        .ss-sparkle.light {
          background: radial-gradient(circle, rgba(232,80,2,.55) 0%, rgba(232,80,2,.25) 38%, rgba(232,80,2,0) 68%);
          filter: blur(.2px);
          mix-blend-mode: multiply;
        }
        .ss-sparkle.light::before,
        .ss-sparkle.light::after {
          content: ""; position: absolute; left: 50%; top: 50%;
          width: calc(var(--s,12px) * 1.4); height: 1px; border-radius: 2px;
          transform-origin: center center; transform: translate(-50%, -50%) rotate(var(--rot, 0deg));
          background: linear-gradient(90deg, transparent, rgba(232,80,2,.45), transparent); opacity: .6;
        }
        .ss-sparkle.light::after { transform: translate(-50%, -50%) rotate(calc(var(--rot, 0deg) + 90deg)); opacity: .5; }

        @keyframes ss-twinkle {
          0%   { opacity: 0; transform: translate3d(0,0,0) scale(.82); }
          20%  { opacity: 1; }
          50%  { transform: translate3d(var(--drift,6px), -4px, 0) scale(1); }
          80%  { opacity: .95; }
          100% { opacity: 0; transform: translate3d(0,0,0) scale(.82); }
        }
        @keyframes ss-drift {
          0%   { filter: drop-shadow(0 0 0 rgba(232,80,2,0)); }
          100% { filter: drop-shadow(0 3px 14px rgba(232,80,2,.25)); }
        }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .ss-sparkle { animation: none !important; opacity: .55; }
        }
      `}</style>
    </section>
  );
};



  /* ===================== Services ===================== */
const ServicesSection = () => {
  const services = [
    {
      icon: <Play size={40} />,
      title: "Video Editing",
      outcome: "Keep people watching 2× longer.",
      proof: "Kamz Inkzone (172k): +38% avg view duration in 30 days",
    },
    {
      icon: <Image size={40} />,
      title: "Thumbnail Design",
      outcome: "Get up to 40% more clicks.",
      proof: "Aish: CTR 3.1% → 5.0% after 3 iterations",
    },
    {
      icon: <Zap size={40} />,
      title: "Shorts Production",
      outcome: "Grow subs with algorithm-ready hooks.",
      proof: "Manav: +9.4k subs from Shorts in Q2",
    },
    {
      icon: <Wand2 size={40} />,
      title: "GFX / Motion Graphics",
      outcome: "Professional polish that sets you apart.",
      proof: "GamerMummy: +22% session time with motion overlays",
    },
    {
      icon: <PenTool size={40} />,
      title: "Scripting & Hook Writing",
      outcome: "Open strong with scroll-stopping hooks.",
      proof: "Hook retention +18% in A/B tests (first 8s)",
    },
    {
      icon: <Wand2 size={40} />,
      title: "AI Repurposing",
      outcome: "Turn 1 video into 10 assets (clips, reels, posts).",
      proof: "10× output, auto-captions & resizing included",
    },
    {
      icon: <Bot size={40} />,
      title: "Workflow Automations",
      outcome: "Auto-posting, captions, assets → less grunt work.",
      proof: "Save 2–3 hours per upload cycle",
    },
    {
      icon: <Megaphone size={40} />,
      title: "SEO & Metadata",
      outcome: "Rank for the right searches and suggested.",
      proof: "+27% browse/search traffic after metadata revamp",
    },
  ]

  return (
    <section id="services" className="py-20" style={{ background: "var(--surface-alt)" }}>
      <div className="container mx-auto px-4">
        {/* Section Heading */}
        <motion.div
          variants={animations.fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2
            className="text-4xl md:text-5xl font-bold mb-4 font-['Poppins']"
            style={{ color: "var(--text)" }}
          >
            Our Services
          </h2>
          <p className="text-xl max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
            Outcomes over deliverables — creative built to convert
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={animations.staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {services.map((s, i) => (
            <motion.div
              key={i}
              variants={animations.scaleIn}
              {...tiltHover}
              className="p-8 rounded-2xl shadow-lg"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="mb-4" style={{ color: "var(--orange)" }}>
                {s.icon}
              </div>

              <h3
                className="text-xl font-bold mb-2 font-['Poppins']"
                style={{ color: "var(--text)" }}
              >
                {s.title}
              </h3>

              <p className="mb-3 font-medium" style={{ color: "var(--text)" }}>
                {s.outcome}
              </p>

              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {s.proof}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ===================== Before/After (keyboard + drag + a11y + lazy images) ===================== */
const BeforeAfter = ({
  before,
  after,
  label = "Thumbnail Revamp",
  beforeAlt = "Before",
  afterAlt = "After",
  width = 1280,
  height = 720,
}) => {
  const [v, setV] = useState(50);             // percentage reveal of BEFORE on top of AFTER
  const wrapRef = useRef(null);
  const dragging = useRef(false);

  // Clamp helper
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const setFromClientX = (clientX) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setV(clamp(pct, 0, 100));
  };

  // Pointer handlers (mouse + touch + pointer)
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      if (e.type.startsWith("touch")) {
        setFromClientX(e.touches[0].clientX);
      } else {
        setFromClientX(e.clientX);
      }
      e.preventDefault();
    };
    const onUp = () => (dragging.current = false);

    document.addEventListener("mousemove", onMove, { passive: false });
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onUp);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
  }, []);

  return (
    <figure className="w-full max-w-4xl mx-auto" role="group" aria-labelledby="ba-caption">
      {/* Wrapper */}
      <div
        ref={wrapRef}
        className="relative rounded-xl overflow-hidden border select-none"
        style={{ borderColor: "var(--border)" }}
        onMouseDown={(e) => {
          dragging.current = true;
          setFromClientX(e.clientX);
        }}
        onTouchStart={(e) => {
          dragging.current = true;
          setFromClientX(e.touches[0].clientX);
        }}
      >
        {/* AFTER image (background) */}
        <img
          src={after}
          alt={afterAlt}
          loading="lazy"
          decoding="async"
          width={width}
          height={height}
          className="w-full block"
          style={{ aspectRatio: `${width} / ${height}` }}
        />

        {/* BEFORE image (revealed by clipPath) */}
        <img
          src={before}
          alt={beforeAlt}
          loading="lazy"
          decoding="async"
          width={width}
          height={height}
          className="w-full block absolute inset-0"
          style={{
            clipPath: `inset(0 ${100 - v}% 0 0)`,
            aspectRatio: `${width} / ${height}`,
          }}
        />

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `${v}%`,
            width: 2,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.0), rgba(255,255,255,0.9), rgba(0,0,0,0.0))",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />

        {/* Handle (keyboard + drag) */}
        <button
          type="button"
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-10 rounded-full shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
          style={{
            left: `${v}%`,
            background: "linear-gradient(90deg, var(--orange), #ff9357)",
            color: "#fff",
            border: "2px solid rgba(255,255,255,0.7)",
          }}
          aria-label={`Reveal slider: ${Math.round(v)} percent`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(v)}
          role="slider"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setV((p) => clamp(p - 2, 0, 100));
            if (e.key === "ArrowRight") setV((p) => clamp(p + 2, 0, 100));
            if (e.key === "Home") setV(0);
            if (e.key === "End") setV(100);
          }}
          onMouseDown={() => (dragging.current = true)}
          onTouchStart={() => (dragging.current = true)}
        >
          {/* Handle icon (double chevrons) */}
          <div className="flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M13 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        {/* Visually-hidden, but accessible native range (backup for AT) */}
        <label htmlFor="ba-range" className="sr-only">
          Drag to compare {beforeAlt} and {afterAlt}
        </label>
        <input
          id="ba-range"
          type="range"
          min="0"
          max="100"
          step="1"
          value={v}
          onChange={(e) => setV(+e.target.value)}
          className="sr-only"
          aria-hidden="false"
        />
      </div>

      <figcaption id="ba-caption" className="text-center mt-2">
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>
          {label}: <span className="font-medium" style={{ color: "var(--text)" }}>drag</span> or use{" "}
          <kbd className="px-1 py-0.5 rounded border" style={{ borderColor: "var(--border)" }}>←</kbd> /{" "}
          <kbd className="px-1 py-0.5 rounded border" style={{ borderColor: "var(--border)" }}>→</kbd> to compare
        </div>
      </figcaption>
    </figure>
  );
};

/* ===================== Proof Section (placed above Creators) ===================== */
const ProofSection = () => (
  <section id="proof" className="py-16" style={{ background: "var(--surface-alt)" }} aria-labelledby="proof-heading">
    <div className="container mx-auto px-4 text-center">
      <h2
        id="proof-heading"
        className="text-3xl md:text-4xl font-bold font-['Poppins'] mb-2"
        style={{ color: "var(--text)" }}
      >
        Packaging That Lifts CTR
      </h2>
      <p className="mb-8 text-lg" style={{ color: "var(--text-muted)" }}>
        Real thumbnails revamped for higher clarity, curiosity, and clicks.
      </p>

      {/* Your existing BeforeAfter slider (keep your current props) */}
      <BeforeAfter
        before={SAMPLE_BEFORE}
        after={SAMPLE_AFTER}
        label="Drag to compare (Before → After)"
        beforeAlt="Original thumbnail"
        afterAlt="Optimized thumbnail"
        width={1280}
        height={720}
      />

      {/* outcome-first caption */}
      <div className="mt-4 text-sm md:text-base font-medium" style={{ color: "var(--text)" }}>
        <span className="px-2 py-1 rounded-full text-white" style={{ background: "var(--orange)" }}>+62% CTR</span>{" "}
        after packaging revamp (real campaign)
      </div>
    </div>
  </section>
);

/* ===================== Creators Worked With (premium single row) ===================== */
const CreatorsWorkedWith = ({ isDark }) => {
  const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const LOGOS = import.meta.glob("../assets/creators/*.{png,jpg,jpeg,webp,svg}", { eager: true, query: "?url", import: "default" });
  const SUBS  = (typeof window !== "undefined" && window.SS_SUBS) || {};

  const creators = [
    { name: "Kamz Inkzone", key: "kamz" },
    { name: "Deadlox Gaming", key: "deadlox" },
    { name: "Kundan Parashar", key: "kundan" },
    { name: "Aish is Live", key: "aish" },
    { name: "Gamer Mummy", key: "gamermummy" },
    { name: "Gamify Anchit", key: "anchit" },
    { name: "Maggie Live", key: "maggie" },
    { name: "Crown Ankit", key: "ankit" },
    { name: "Manav Maggie Sukhija", key: "manav" },
  ].map((c) => {
    const url = findAssetByBase(c.key, LOGOS);
    return url ? { ...c, url, subs: SUBS[c.key] } : null;
  }).filter(Boolean);

  if (!creators.length) return null;
  const loop = [...creators, ...creators];

  const fmt = (n) => {
    if (n == null) return null;
    if (n >= 1_000_000) return `${(n/1_000_000).toFixed(n%1_000_000?1:0)}M`;
    if (n >= 1_000) return `${(n/1_000).toFixed(n%1_000?1:0)}K`;
    return `${n}`;
  };

  return (
    <section className="relative py-14" style={{ background: "var(--surface)" }}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-sm md:text-base tracking-[0.14em] font-medium uppercase" style={{ color: "var(--text-muted)" }}>
            Trusted by creators across <span style={{ color: "var(--text)" }}>Gaming</span>, <span style={{ color: "var(--text)" }}>Lifestyle</span>, <span style={{ color: "var(--text)" }}>Devotional</span>
          </h2>
        </div>

        <div className="relative overflow-hidden">
          {/* side fades */}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-16"
               style={{ background: `linear-gradient(90deg, ${isDark?"rgba(0,0,0,.85)":"rgba(255,249,246,.96)"} 0%, transparent 100%)` }} />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-16"
               style={{ background: `linear-gradient(270deg, ${isDark?"rgba(0,0,0,.85)":"rgba(255,249,246,.96)"} 0%, transparent 100%)` }} />

          <ul className={`flex items-center gap-3 whitespace-nowrap will-change-transform ${reduceMotion ? "" : "animate-[marq_28s_linear_infinite]"}`}>
            {loop.map((c, i) => (
              <li key={`${c.key}-${i}`} className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5"
                  style={{ background: "var(--surface-alt)", borderColor: "var(--border)", boxShadow: "0 6px 14px rgba(0,0,0,.08)" }}>
                <span className="relative w-12 h-12 rounded-full overflow-hidden">
                  <img src={c.url} alt={`${c.name} logo`} className="w-full h-full object-cover"
                       style={{ filter: "grayscale(.2) saturate(.95) contrast(1.04)" }} loading="lazy" />
                  <span className="absolute inset-0 rounded-full" style={{
                    boxShadow: "inset 0 0 0 1.5px rgba(232,80,2,.45), 0 2px 10px rgba(232,80,2,.18)" }} aria-hidden="true" />
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{c.name}</span>
                  {fmt(c.subs) && (
                    <span className="text-xs px-2 py-1 rounded-full border" style={{ color: "var(--text)", borderColor: "var(--border)" }}>
                      {fmt(c.subs)} <span style={{ opacity: .7 }}>subs</span>
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* local keyframes */}
      <style>{`
        @keyframes marq { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { ul[class*="animate-"] { animation: none !important; } }
      `}</style>
    </section>
  );
};


/* ===================== Case Studies (metric-first) ===================== */
const CaseStudies = () => {
  const MEDIA = import.meta.glob("../assets/case_studies/*.{png,jpg,jpeg,webp,avif,mp4,webm}", { eager: true, query: "?url", import: "default" });
  const [open, setOpen] = useState(null); // index

  const items = [
    {
      metric: "+62% CTR",
      period: "in 6 weeks",
      title: "Packaging revamp for Gaming creator",
      keys: { hook: "cs1_hook", edit: "cs1_edit", thumb: "cs1_thumb" },
    },
    {
      metric: "+38% retention",
      period: "in 4 weeks",
      title: "Hook-first shorts strategy",
      keys: { hook: "cs2_hook", edit: "cs2_edit", thumb: "cs2_thumb" },
    },
    {
      metric: "3.1x views",
      period: "in 8 weeks",
      title: "Title/Thumb alignment & cadence",
      keys: { hook: "cs3_hook", edit: "cs3_edit", thumb: "cs3_thumb" },
    },
  ].map((it) => {
    const hook = findAssetByBase(it.keys.hook, MEDIA);
    const edit = findAssetByBase(it.keys.edit, MEDIA);
    const thumb = findAssetByBase(it.keys.thumb, MEDIA);
    return { ...it, media: { hook, edit, thumb } };
  });

  return (
    <section id="work" className="py-20" style={{ background: "var(--surface)" }}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold font-['Poppins']" style={{ color: "var(--text)" }}>Recent Wins</h2>
          <p className="text-sm md:text-base mt-2" style={{ color: "var(--text-muted)" }}>Outcome first. Tap to see the breakdown.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <motion.article
              key={i}
              className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--surface-alt)", borderColor: "var(--border)", boxShadow: "0 10px 24px rgba(0,0,0,.08)" }}
              whileHover={{ y: -6 }}
              onClick={() => setOpen(i)}
            >
              <div className="aspect-[16/9] relative">
                {it.media.thumb ? (
                  <img src={it.media.thumb} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="absolute inset-0" style={{ background: "linear-gradient(120deg,#222,#333)" }} />
                )}
                <div className="absolute top-3 left-3 rounded-full text-xs font-semibold px-3 py-1"
                     style={{ background: "rgba(0,0,0,.55)", color: "#fff", border: "1px solid rgba(255,255,255,.15)" }}>
                  {it.metric} <span style={{ opacity:.75 }}>({it.period})</span>
                </div>
              </div>
              <div className="p-4">
                <div className="font-semibold" style={{ color: "var(--text)" }}>{it.title}</div>
                <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Hook • Edit • Thumbnail</div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {open != null && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,.55)" }}
            onClick={() => setOpen(null)}
          >
            <motion.div
              className="w-full max-w-3xl rounded-2xl overflow-hidden border"
              initial={{ scale: .96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 10 }}
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="text-lg font-semibold" style={{ color: "var(--text)" }}>{items[open].title}</div>
                <div className="text-sm" style={{ color: "var(--text-muted)" }}>{items[open].metric} — {items[open].period}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                {["hook","edit","thumb"].map((k) => {
                  const src = items[open].media[k];
                  return (
                    <div key={k} className="aspect-[4/3] relative border-r md:last:border-r-0"
                         style={{ borderColor: "var(--border)" }}>
                      {src ? (
                        <img src={src} alt={k} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0" style={{ background: "linear-gradient(120deg,#222,#333)" }} />
                      )}
                      <div className="absolute bottom-2 left-2 text-xs px-2 py-1 rounded"
                           style={{ background: "rgba(0,0,0,.5)", color:"#fff", border:"1px solid rgba(255,255,255,.12)" }}>
                        {k}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 text-right">
                <button className="px-4 py-2 rounded-xl font-semibold"
                        style={{ color: "var(--text)", border:"1px solid var(--border)", background:"var(--surface-alt)" }}
                        onClick={() => setOpen(null)}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};


/* ===================== Process Section ===================== */
const ProcessSection = () => {
  const steps = [
    { n: 1, title: "Discovery Call (15–20 min)", desc: "Goals, niche, roadblocks, assets. Quick audit if needed." },
    { n: 2, title: "Pilot Sprint (7–10 days)", desc: "2–3 edited videos + thumbnails/shorts to prove ROI fast." },
    { n: 3, title: "Scale & Systemize", desc: "Monthly calendar, brand kit, iteration loop for retention/CTR." },
  ];
  return (
    <section className="py-20" style={{ background: 'var(--surface)' }}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold font-['Poppins']" style={{ color: 'var(--text)' }}>
            How We Work
          </h2>
          <p className="text-lg mt-3" style={{ color: 'var(--text-muted)' }}>
            A simple path to results (no fluff, just outcomes).
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map(s => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="p-6 rounded-2xl"
              style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold mb-4"
                style={{ background: 'var(--orange)', color: '#fff' }}
              >
                {s.n}
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>{s.title}</h3>
              <p style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ===================== Testimonials (Video + Analytics) ===================== */
const TestimonialsSection = ({ isDark }) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches

  // ---- DATA -----------------------------------------------------------------
  // Put your local assets under /src/assets/testimonials/*
  // For analytics cards, use screenshots exported from YT Studio (CTR / AVD / views).
  const TESTIMONIALS = [
    {
      type: "video",
      name: "Kamz Inkzone",
      tag: "Gaming • 172K",
      avatarKey: "kamz", // if you use your img(key) helper elsewhere
      video: "/assets/testimonials/kamz-45s.mp4",
      poster: "/assets/testimonials/kamz-thumb.jpg",
      quote:
        "These edits + motion graphics made my content feel premium. Retention lifted immediately.",
      metrics: [{ label: "Avg View Dur.", value: "+38%" }],
    },
    {
      type: "analytics",
      name: "Aish is Live",
      tag: "Streamer • 13K",
      avatarKey: "aish",
      image: "/assets/testimonials/aish-ctr.png",
      alt: "YouTube Studio CTR uplift graph for Aish is Live",
      quote:
        "Thumbnail iterations increased CTR consistently over three uploads.",
      metrics: [{ label: "CTR", value: "3.1% → 5.0%" }],
      cta: { label: "See case", href: "/work/aish" },
    },
    {
      type: "video",
      name: "Gamer Mummy",
      tag: "Gaming • 14.8K",
      avatarKey: "gamermummy",
      video: "/assets/testimonials/gamermummy-35s.mp4",
      poster: "/assets/testimonials/gamermummy-thumb.jpg",
      quote: "The brand kit + overlays improved watch time and comments.",
      metrics: [{ label: "Session Time", value: "+22%" }],
    },
    {
      type: "analytics",
      name: "Manav Sukhija",
      tag: "Creator • 49.6K",
      avatarKey: "manav",
      image: "/assets/testimonials/manav-shorts.png",
      alt: "Shorts growth from YouTube Studio for Manav",
      quote: "Hook-first shorts strategy drove predictable growth.",
      metrics: [{ label: "Subs from Shorts", value: "+9.4k" }],
      cta: { label: "See case", href: "/work/manav" },
    },
  ]

  // Optional: your existing img(key) helper; fallback to null if not found
  const getAvatar = (key) => (typeof img === "function" ? img(key) : null)

  // ---- MODAL STATE ----------------------------------------------------------
  const [openVideo, setOpenVideo] = React.useState(null) // stores the selected item or null

  // ---- CARD COMPONENTS ------------------------------------------------------
  const MetricPill = ({ label, value }) => (
    <span
      className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full border"
      style={{
        color: "var(--text)",
        borderColor: "var(--border)",
        background: "color-mix(in oklab, var(--orange) 8%, transparent)",
      }}
      aria-label={`${label}: ${value}`}
    >
      <BarChart3 size={14} /> <strong>{label}</strong> {value}
    </span>
  )

  const HeaderRow = ({ name, tag, avatarKey }) => {
    const avatar = getAvatar(avatarKey)
    const initials = name
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()

    return (
      <div className="flex items-center gap-3 mb-3">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="w-10 h-10 rounded-full object-cover ring-2"
            style={{ ringColor: "var(--orange)" }}
            loading="lazy"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
            style={{ background: "var(--orange)" }}
            aria-hidden="true"
          >
            {initials}
          </div>
        )}
        <div>
          <div className="font-semibold" style={{ color: "var(--text)" }}>
            {name}
          </div>
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            {tag}
          </div>
        </div>
      </div>
    )
  }

  const VideoCard = ({ item, i }) => (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.45, delay: (i % 6) * 0.05 }}
      className="rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl focus-within:shadow-xl transition-all"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <button
        type="button"
        onClick={() => setOpenVideo(item)}
        className="relative w-full aspect-video group"
        aria-label={`Play testimonial from ${item.name}`}
      >
        <img
          src={item.poster}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md shadow group-hover:scale-105 transition">
            <Play size={16} className="text-black" />
            <span className="text-sm font-semibold text-black">Play</span>
          </div>
        </div>
      </button>

      <div className="p-5">
        <HeaderRow name={item.name} tag={item.tag} avatarKey={item.avatarKey} />
        <p className="mb-3" style={{ color: "var(--text-muted)" }}>
          <Quote className="inline mr-2 -mt-1" size={16} />
          {item.quote}
        </p>
        <div className="flex flex-wrap gap-2">
          {item.metrics?.map((m, idx) => (
            <MetricPill key={idx} {...m} />
          ))}
        </div>
      </div>
    </motion.article>
  )

  const AnalyticsCard = ({ item, i }) => (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.45, delay: (i % 6) * 0.05 }}
      className="rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="relative w-full aspect-[16/10] bg-black">
        <img
          src={item.image}
          alt={item.alt}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-2 left-2">
          {item.metrics?.slice(0, 2).map((m, idx) => (
            <MetricPill key={idx} {...m} />
          ))}
        </div>
      </div>

      <div className="p-5">
        <HeaderRow name={item.name} tag={item.tag} avatarKey={item.avatarKey} />
        <p className="mb-3" style={{ color: "var(--text-muted)" }}>
          <Quote className="inline mr-2 -mt-1" size={16} />
          {item.quote}
        </p>

        {item.cta && (
          <a
            href={item.cta.href}
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color: "var(--orange)" }}
          >
            {item.cta.label} <ExternalLink size={14} />
          </a>
        )}
      </div>
    </motion.article>
  )

  // ---- RENDER ----------------------------------------------------------------
  return (
    <section id="testimonials" className="py-24"
    style={{ background: "var(--surface-alt)", contentVisibility: "auto", containIntrinsicSize: "900px" }}>
      <div className="container mx-auto px-4">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-['Poppins']" style={{ color: "var(--text)" }}>
            Proof it works
          </h2>
          <p className="text-lg md:text-xl mt-3" style={{ color: "var(--text-muted)" }}>
            Quick 30–45s reels from creators, plus real screenshots from YouTube Studio
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TESTIMONIALS.map((t, i) =>
            t.type === "video" ? (
              <VideoCard key={i} item={t} i={i} />
            ) : (
              <AnalyticsCard key={i} item={t} i={i} />
            )
          )}
        </div>
      </div>

      {/* ---- Modal Player (for video items) ---- */}
      {openVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Testimonial from ${openVideo.name}`}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setOpenVideo(null)}
          />
          <div
            className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: isDark ? "#0F0F0F" : "#FFFFFF", border: "1px solid var(--border)" }}
          >
            <button
              className="absolute top-3 right-3 p-2 rounded-lg"
              style={{ background: "rgba(0,0,0,0.45)" }}
              aria-label="Close video"
              onClick={() => setOpenVideo(null)}
            >
              <X size={18} color="#fff" />
            </button>

            <div className="relative w-full aspect-video">
              {reduceMotion ? (
                // If user prefers reduced motion, don’t autoplay
                <video
                  src={openVideo.video}
                  poster={openVideo.poster}
                  controls
                  className="absolute inset-0 w-full h-full"
                />
              ) : (
                <video
                  src={openVideo.video}
                  poster={openVideo.poster}
                  className="absolute inset-0 w-full h-full"
                  autoPlay
                  muted
                  playsInline
                  controls
                />
              )}
            </div>

            <div className="p-5">
              <HeaderRow
                name={openVideo.name}
                tag={openVideo.tag}
                avatarKey={openVideo.avatarKey}
              />
              <div className="flex flex-wrap gap-2">
                {openVideo.metrics?.map((m, idx) => (
                  <MetricPill key={idx} {...m} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}



  /* ===================== FAQ ===================== */
const FAQSection = () => {
  // NEW: local state for which item is open (null = none)
  const [openFAQ, setOpenFAQ] = React.useState(null);

  const faqs = [
    { question: 'What services does Shinel Studios offer?', answer: 'We specialize in video editing, thumbnail design, SEO & marketing, and comprehensive content strategy to help creators and brands shine online.' },
    { question: 'How long does a typical project take?', answer: 'Simple thumbnails can be delivered within 24–48 hours, while comprehensive video projects may take 1–2 weeks depending on scope.' },
    { question: 'Do you work with small creators or just big brands?', answer: 'We work with creators and brands of all sizes and tailor services to your needs and budget.' },
    { question: "What's included in content strategy?", answer: 'Market research, competitor analysis, content planning, posting schedules, and performance optimization recommendations.' },
    { question: 'How do you ensure quality?', answer: 'Multi-stage QA with client reviews and revisions until you’re fully satisfied.' },
  ];

  // NEW: simple toggle handler
  const toggleFAQ = (idx) => setOpenFAQ((cur) => (cur === idx ? null : idx));

  return (
    <section className="py-20" style={{ background: 'var(--surface)' }}>
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          variants={animations.fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 font-['Poppins']" style={{ color: 'var(--text)' }}>
            Frequently Asked Questions
          </h2>
          <p className="text-xl" style={{ color: 'var(--text-muted)' }}>
            Get answers to common questions about our services
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((f, i) => {
            const open = openFAQ === i;
            return (
              <motion.div
                key={i}
                variants={animations.fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ duration: 0.25 }}
                className="rounded-lg overflow-hidden"
                style={{ border: '1px solid var(--border)', background: 'var(--surface-alt)' }}
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(i)}
                  aria-expanded={open}
                  aria-controls={`faq-panel-${i}`}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                  style={{ color: 'var(--text)' }}
                >
                  <span className="font-semibold">{f.question}</span>
                  {/* simple icon without extra imports */}
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full border`}
                    style={{
                      borderColor: 'var(--border)',
                      background: open ? 'var(--orange)' : 'transparent',
                      color: open ? '#fff' : 'var(--text-muted)',
                      transition: 'transform .2s ease',
                      transform: open ? 'rotate(45deg)' : 'none'
                    }}
                  >
                    +
                  </span>
                </button>

                <div
                  id={`faq-panel-${i}`}
                  hidden={!open}
                  className="px-5 pb-5 -mt-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {f.answer}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};


/* ===================== Inline Lead Capture ===================== */
const InlineLeadCapture = ({ onOpenCalendly }) => {
  const [channel, setChannel] = useState("");
  const [contact, setContact] = useState("");
  const [err, setErr] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr("");

    const clean = (s) => s.trim();
    const ch = clean(channel);
    const ct = clean(contact);
    if (!ch || !ct) { setErr("Please add your channel link and a contact."); return; }

    track("lead_submit", { src: "inline_form" });

    // Prefer your existing Calendly modal
    const note = `Channel: ${ch}\nContact: ${ct}`;
    window.__SS_PREFILL__ = { note }; // app can read this if desired

    if (typeof onOpenCalendly === "function") {
      onOpenCalendly(); // e.g., setShowCalendly(true)
    } else {
      // safe fallback: open public Calendly (replace with your link)
      const url = new URL("https://calendly.com/shinelstudios/free-audit");
      url.searchParams.set("utm_source", "homepage");
      url.searchParams.set("utm_medium", "inline_form");
      url.searchParams.set("utm_campaign", "lead_capture");
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section aria-labelledby="leadcap-heading" className="py-12" style={{ background: "var(--surface)" }}>
      <div className="container mx-auto px-4">
        <h2 id="leadcap-heading" className="text-2xl md:text-3xl font-bold font-['Poppins'] mb-4" style={{ color: "var(--text)" }}>
          Get a free 15-min channel audit
        </h2>
        <p className="text-sm md:text-base mb-5" style={{ color: "var(--text-muted)" }}>
          Quick form. We’ll review your packaging, CTR, and retention opportunities.
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto] gap-3">
          <input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            type="url"
            inputMode="url"
            placeholder="YouTube channel URL"
            aria-label="YouTube channel URL"
            className="rounded-xl px-4 py-3 border"
            style={{ background: "var(--surface-alt)", borderColor: "var(--border)", color: "var(--text)" }}
          />
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            type="text"
            placeholder="WhatsApp or email"
            aria-label="WhatsApp or email"
            className="rounded-xl px-4 py-3 border"
            style={{ background: "var(--surface-alt)", borderColor: "var(--border)", color: "var(--text)" }}
          />
          <button
            type="submit"
            className="rounded-xl px-6 py-3 font-semibold text-white"
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)", boxShadow: "0 10px 24px rgba(232,80,2,.35)" }}
            aria-label="Submit for free audit"
          >
            Get Free Audit
          </button>
        </form>

        {err && <div className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>{err}</div>}
      </div>
    </section>
  );
};


/* ===================== Pricing (conversion-focused) ===================== */
const Pricing = ({ onOpenCalendly }) => {
  const reduceMotion = typeof window !== "undefined" && window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const tiers = [
    {
      name: "7-Day Trial",
      priceInr: 499,
      tag: "Low-risk start",
      trial: true,
      bullet: ["1 Thumbnail", "1 Short edit (≤50s)", "Mini SEO checklist"],
      note: "Upgrade anytime — trial fee adjusts in first package",
      cta: "Start Trial",
      key: "trial",
    },
    {
      name: "Starter",
      priceInr: 3999,
      tag: "Entry Plan",
      bullet: ["3 Thumbnails", "2 Video edits (≤8 min each)", "Basic SEO setup"],
      cta: "Choose Starter",
      key: "starter",
    },
    {
      name: "Shorts Pack",
      priceInr: 5999,
      tag: "Most Popular",
      featured: true,
      bullet: ["30 Shorts optimized for YT Shorts feed", "Hook-first scripting support", "Metadata assist (titles + tags)", "Custom short thumbnail", "Free “Subscribe” animation"],
      cta: "Book Shorts Pack",
      key: "shorts",
    },
    {
      name: "Creator Essentials",
      priceInr: 9999,
      tag: "Best Value",
      bullet: ["10 Thumbnails", "4 Long-form edits (≤10 min each)", "15 Shorts", "Light brand kit & packaging", "Monthly growth check-in", "Free “Subscribe” animation"],
      cta: "Book Essentials",
      key: "essentials",
    },
  ];

  const [intent, setIntent] = useState("growth"); // growth, consistency, polish
  const highlight = (key) => {
    if (intent === "growth" && key === "shorts") return true;
    if (intent === "consistency" && key === "starter") return true;
    if (intent === "polish" && key === "essentials") return true;
    return false;
  };

  return (
    <section id="pricing" className="py-20 relative overflow-hidden" style={{ background: "var(--surface)" }} aria-labelledby="pricing-heading">
      {/* soft corners */}
      {!reduceMotion && (
        <>
          <motion.div aria-hidden className="pointer-events-none absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full"
            style={{ background: "radial-gradient(closest-side, rgba(232,80,2,.18), rgba(232,80,2,0) 70%)", filter: "blur(10px)" }}
            initial={{ opacity: 0.28 }} animate={{ opacity: [0.16,0.28,0.2] }} transition={{ duration: 6, repeat: Infinity }} />
          <motion.div aria-hidden className="pointer-events-none absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full"
            style={{ background: "radial-gradient(closest-side, rgba(255,147,87,.18), rgba(255,147,87,0) 70%)", filter: "blur(12px)" }}
            initial={{ opacity: 0.28 }} animate={{ opacity: [0.16,0.28,0.2] }} transition={{ duration: 6.5, repeat: Infinity, delay: .4 }} />
        </>
      )}

      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 id="pricing-heading" className="text-3xl md:text-4xl font-bold font-['Poppins']" style={{ color: "var(--text)" }}>
            Simple, Proven Packages
          </h2>
          <p className="mt-2 text-sm md:text-base" style={{ color: "var(--text-muted)" }}>
            Pick what you need now—upgrade anytime as you see results.
          </p>
        </div>

        {/* intent nudges */}
        <div className="mx-auto mb-8 flex w-full max-w-[660px] items-center justify-center gap-2">
          {[
            { k: "growth", label: "Growth" },
            { k: "consistency", label: "Consistency" },
            { k: "polish", label: "Polish" },
          ].map((opt) => (
            <button key={opt.k}
              onClick={() => setIntent(opt.k)}
              className={`rounded-full px-4 py-2 text-sm font-semibold border ${intent===opt.k ? "shadow" : ""}`}
              style={{ color: "var(--text)", borderColor: "var(--border)", background: intent===opt.k ? "rgba(232,80,2,.14)" : "var(--surface-alt)" }}>
              I want: {opt.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {tiers.map((t, i) => {
            const isFeatured = t.featured || highlight(t.key);
            return (
              <motion.article
                key={t.name}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className={`group relative rounded-2xl p-6 border overflow-hidden ${isFeatured ? "ring-2 ring-[var(--orange)]/45" : ""}`}
                style={{
                  background: "var(--surface-alt)",
                  borderColor: "var(--border)",
                  boxShadow: isFeatured
                    ? "0 18px 48px rgba(232,80,2,0.25), 0 8px 24px rgba(0,0,0,0.25)"
                    : "0 10px 24px rgba(0,0,0,0.10)",
                }}
                aria-label={`${t.name} plan, starting ${formatINR(t.priceInr)}`}
              >
                <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{t.tag || "\u00A0"}</div>
                <h3 className="text-xl font-semibold" style={{ color: "var(--text)" }}>{t.name}</h3>
                <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{t.trial ? "One-time" : "Starting at"}</div>
                <div className="text-4xl font-bold mt-1 font-['Poppins']" style={{ color: "var(--text)" }}>{formatINR(t.priceInr)}</div>

                <ul className="mt-4 space-y-2" style={{ color: "var(--text)" }}>
                  {t.bullet.map((b, bi) => (
                    <li key={bi} className="flex items-start gap-2">
                      <span aria-hidden="true">•</span><span>{b}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => { track("plan_click", { plan: t.key }); onOpenCalendly?.(); }}
                  className="w-full mt-6 rounded-xl py-3 font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  style={{
                    background: isFeatured ? "linear-gradient(90deg, var(--orange), #ff9357)" : "linear-gradient(90deg, #ff9357, var(--orange))",
                    boxShadow: isFeatured ? "0 18px 36px rgba(232,80,2,0.35)" : "0 12px 26px rgba(232,80,2,0.25)",
                  }}
                  aria-label={t.cta}
                >
                  {t.cta}
                </button>

                {t.trial && (
                  <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    Trial fee adjusted in first package
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>

        {/* reassurance */}
        <div className="text-center mt-8">
          <p className="text-sm md:text-base" style={{ color: "var(--text-muted)" }}>
            100% satisfaction promise — if you don’t love the first delivery, we’ll revise it or refund the trial.
          </p>
        </div>
      </div>
    </section>
  );
};




/* ===================== Quick Lead Form (labels + creative placeholders) ===================== */

const QuickLeadForm = () => {
  const [name, setName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [toast, setToast] = React.useState(null); // {type:'success'|'error', text:string}
  const [website, setWebsite] = React.useState(""); // honeypot
  const [selected, setSelected] = React.useState([]);

  const interests = React.useMemo(
    () => ["Video Editing", "Thumbnails", "Shorts", "GFX", "Strategy"],
    []
  );

  const inputStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || "").trim());
  const clean = (v) => (v || "").replace(/\s+/g, " ").trim();
  const valid = clean(name).length >= 2 && isEmail(email);

  const toggleChip = (label) =>
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );

  const makeMailto = () => {
    const to = "hello@shinelstudiosofficial.com";
    const subject = `Quick Quote Request — ${clean(name) || "Creator"}`;
    const lines = [
      `Name: ${clean(name)}`,
      `Handle/URL: ${clean(handle)}`,
      `Email: ${clean(email)}`,
      selected.length ? `Interests: ${selected.join(", ")}` : null,
      msg ? `Note: ${clean(msg)}` : null,
      "",
      "Hi Shinel Studios, I'd like a quick quote and a content audit.",
    ].filter(Boolean);
    const body = lines.join("\n");
    return `mailto:${to}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  const whatsappURL = () => {
    const base = "https://wa.me/918968141585";
    const text =
      `Hi Shinel Studios!` +
      ` Name: ${clean(name) || "-"}` +
      ` | Handle: ${clean(handle) || "-"}` +
      ` | Email: ${clean(email) || "-"}` +
      (selected.length ? ` | Interests: ${selected.join(", ")}` : "");
    return `${base}?text=${encodeURIComponent(text)}`;
  };

  const showToast = (type, text) => {
    setToast({ type, text });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2600);
  };

  const onSubmit = (e) => {
    e?.preventDefault?.();
    if (website) return showToast("error", "Something went wrong. Please try again.");
    if (!valid) {
      if (!name.trim()) return showToast("error", "Please enter your name.");
      if (!isEmail(email)) return showToast("error", "Please enter a valid email.");
    }
    setSending(true);
    try {
      const href = makeMailto();
      setTimeout(() => {
        window.location.href = href;
        setSending(false);
        showToast("success", "Opening your email app…");
      }, 120);
    } catch {
      setSending(false);
      showToast("error", "Could not open your email app.");
    }
  };

  // Ask the quick quote bar to hide when this section is near
  React.useEffect(() => {
    const el = document.getElementById("leadform-section");
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        // visible when we’re approaching the section; tune rootMargin to taste
        const v = entries.some((e) => e.isIntersecting && e.intersectionRatio > 0.08);
        document.dispatchEvent(new CustomEvent("leadform:visible", { detail: { visible: v } }));
      },
      { rootMargin: "0px 0px -60% 0px", threshold: [0, 0.08, 0.12] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="leadform-section"
      className="py-14"
      style={{ background: "var(--surface-alt)" }}
      aria-labelledby="leadform-heading"
    >
      <div className="container mx-auto px-4 max-w-3xl relative">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute left-1/2 -top-4 -translate-x-1/2 z-10 px-4 py-2 rounded-lg text-sm text-white"
              style={{
                background:
                  toast.type === "success"
                    ? "linear-gradient(90deg,#16a34a,#22c55e)"
                    : "linear-gradient(90deg,#e11d48,#f97316)",
                boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
              }}
              role="status" aria-live="polite"
            >
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Heading */}
        <div className="text-center mb-8">
          <h3
            id="leadform-heading"
            className="text-3xl md:text-4xl font-bold font-['Poppins']"
            style={{ color: "var(--text)" }}
          >
            Get a Quick Quote
          </h3>
          <p className="mt-2 text-base md:text-lg" style={{ color: "var(--text-muted)" }}>
            Tell us where you post — we’ll reply within 24 hours.
          </p>
        </div>

        {/* Honeypot */}
        <label className="sr-only" htmlFor="website">
          Website
        </label>
        <input
          id="website"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
          aria-hidden="true"
        />

        {/* Form */}
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {/* Top row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label htmlFor="lead-name" className="block text-sm mb-1" style={{ color: "var(--text)" }}>
                Your Name *
              </label>
              <input
                id="lead-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-[48px] rounded-2xl px-4 outline-none"
                style={inputStyle}
                placeholder="Alex from Daily Vlogs"
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="lead-handle" className="block text-sm mb-1" style={{ color: "var(--text)" }}>
                @handle or channel URL
              </label>
              <input
                id="lead-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full h-[48px] rounded-2xl px-4 outline-none"
                style={inputStyle}
                placeholder="@gaminglegend or youtube.com/yourchannel"
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="lead-email" className="block text-sm mb-1" style={{ color: "var(--text)" }}>
                Email *
              </label>
              <input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[48px] rounded-2xl px-4 outline-none"
                style={inputStyle}
                placeholder="creator@email.com"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Interest chips */}
          <div>
            <div className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
              What are you most interested in?
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.map((t) => {
                const on = selected.includes(t);
                return (
                  <motion.button
                    key={t}
                    type="button"
                    onClick={() => toggleChip(t)}
                    className="px-3 py-2 rounded-full text-sm border transition-all select-none"
                    style={{
                      borderColor: on ? "var(--orange)" : "var(--border)",
                      color: on ? "var(--orange)" : "var(--text)",
                      background: on ? "rgba(232,80,2,0.10)" : "transparent",
                    }}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    aria-pressed={on}
                  >
                    {t}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="lead-note" className="block text-sm mb-1" style={{ color: "var(--text)" }}>
              Anything specific you want us to know? (optional)
            </label>
            <div className="relative">
              <textarea
                id="lead-note"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={6}
                maxLength={400}
                className="w-full rounded-2xl px-4 py-3 resize-y outline-none"
                style={inputStyle}
                placeholder="Share goals: grow Shorts, boost CTR, redesign thumbnails, or streamline your edit pipeline…"
              />
              <div
                className="absolute right-3 bottom-2 text-xs"
                style={{ color: "var(--text-muted)" }}
                aria-hidden="true"
              >
                {(msg || "").length}/400
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <motion.button
              type="submit"
              disabled={!valid || sending}
              className="flex-1 rounded-xl py-3 font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
              whileHover={!sending ? { y: -2, boxShadow: "0 10px 24px rgba(232,80,2,0.35)" } : {}}
              whileTap={!sending ? { scale: 0.98 } : {}}
              aria-live="polite"
            >
              {sending ? "Opening mail…" : "Send & Get Quote"}
            </motion.button>

            <motion.a
              href={whatsappURL()}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center rounded-xl py-3 font-semibold"
              style={{ border: "2px solid var(--orange)", color: "var(--orange)" }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              Message on WhatsApp
            </motion.a>
          </div>

          <p className="mt-2 text-xs text-center md:text-left" style={{ color: "var(--text-muted)" }}>
            By contacting us, you agree to receive a one-time reply on your email or WhatsApp. We don’t send newsletters from this form.
          </p>
        </form>
      </div>
    </section>
  );
};

/* ===================== Sticky Mobile CTA ===================== */
const StickyCTA = ({ onAudit }) => (
  <div className="fixed bottom-3 inset-x-3 z-40 md:hidden">
    <button
      onClick={() => { track("cta_click_audit", { src: "sticky" }); onAudit?.(); }}
      className="w-full rounded-full py-3 px-5 text-white font-semibold shadow-lg"
      style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
      aria-label="Get Free Audit"
    >
      Get Free Audit — Free 15-min
    </button>
  </div>
);

/* ===================== Contact ===================== */
const ContactCTA = () => (
  <section
    id="contact"
    className="w-full py-20"
    style={{ backgroundImage: 'linear-gradient(90deg, var(--orange), #ff9357)' }}
  >
    <div className="max-w-7xl mx-auto px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto"
      >
        <h2
          className="text-4xl md:text-6xl font-bold mb-6 font-['Poppins']"
          style={{ color: '#fff' }}
        >
          Let’s Build Something Amazing Together
        </h2>
        <p
          className="text-xl mb-8 max-w-2xl mx-auto"
          style={{ color: 'rgba(255,255,255,0.9)' }}
        >
          Ready to take your content to the next level? Reach out and let’s start crafting your success story.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <motion.a
            href="https://wa.me/918968141585?text=Hi%20Shinel%20Studios!%20I%20want%20to%20grow%20my%20channel.%20Can%20we%20talk?"
            target="_blank"
            rel="noreferrer"
            className="bg-white text-black px-8 py-4 rounded-lg font-medium text-lg"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            WhatsApp Us
          </motion.a>
          <motion.a
            href="mailto:hello@shinelstudiosofficial.com"
            className="px-8 py-4 rounded-lg font-medium text-lg border-2 border-white text-white"
            whileHover={{ y: -2, backgroundColor: '#fff', color: '#000' }}
          >
            Email Us
          </motion.a>
        </div>
      </motion.div>
    </div>
  </section>
);

/* ===================== Sticky Mobile CTA (safe-area, keyboard-aware) ===================== */
const StickyMobileCTA = ({ onAudit }) => {
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    const vv = window.visualViewport;

    const handleVV = () => {
      if (!vv) return;
      const keyboardLikely = window.innerHeight - vv.height > 140;
      setHidden(keyboardLikely);
    };

    const hide = () => setHidden(true);
    const show = () => setHidden(false);

    vv?.addEventListener("resize", handleVV);
    vv?.addEventListener("scroll", handleVV);
    window.addEventListener("focusin", handleVV);
    window.addEventListener("focusout", handleVV);
    window.addEventListener("ss:hideMobileCTA", hide);
    window.addEventListener("ss:showMobileCTA", show);
    window.addEventListener("calendly:open", hide);
    window.addEventListener("calendly:close", show);

    return () => {
      vv?.removeEventListener("resize", handleVV);
      vv?.removeEventListener("scroll", handleVV);
      window.removeEventListener("focusin", handleVV);
      window.removeEventListener("focusout", handleVV);
      window.removeEventListener("ss:hideMobileCTA", hide);
      window.removeEventListener("ss:showMobileCTA", show);
      window.removeEventListener("calendly:open", hide);
      window.removeEventListener("calendly:close", show);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      className="md:hidden fixed left-0 right-0 z-40 px-3"
      style={{ bottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
      role="region"
      aria-label="Quick contact options"
    >
      <div
        className="flex gap-2 rounded-2xl p-2 shadow-xl header-blur"
        style={{ border: "1px solid var(--border)" }}
      >
        <a
          href="https://wa.me/918968141585?text=Hi%20Shinel%20Studios!%20I%20want%20to%20grow%20my%20channel."
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brand flex-1 text-center"
          onClick={() => {
            try {
              window.dispatchEvent(
                new CustomEvent("analytics", {
                  detail: { ev: "cta_click_whatsapp", src: "sticky" },
                })
              );
            } catch {}
          }}
          aria-label="Chat on WhatsApp"
        >
          WhatsApp
        </a>

        <a
          href="#contact"
          className="btn-ghost flex-1 text-center"
          style={{ borderColor: "var(--orange)", color: "var(--orange)" }}
          onClick={(e) => {
            try {
              window.dispatchEvent(
                new CustomEvent("analytics", {
                  detail: { ev: "cta_click_quote", src: "sticky" },
                })
              );
            } catch {}
            // To open Calendly instead of scrolling:
            // e.preventDefault(); onAudit?.();
          }}
          aria-label="Get a quick quote"
        >
          Get Quote
        </a>
      </div>
    </div>
  );
};


/* ===================== Footer (bigger zoomed logo + animations) ===================== */
const Footer = () => (
  <motion.footer
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    variants={animations.staggerParent}
    className="py-16"
    style={{ background: '#000', color: '#fff' }}
  >
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        
        {/* Column 1 - Logo + Socials */}
        <motion.div variants={animations.fadeUp}>
          <div className="flex items-center gap-3 mb-4">
            <motion.img
              src={logoLight}
              alt="Shinel Studios"
              className="h-20 w-auto object-contain select-none"
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1.4, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              whileHover={{ scale: 1.5 }}
              style={{
                transformOrigin: 'left center',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))',
              }}
            />
          </div>
          <p className="mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
            We're a creative media agency dedicated to helping creators and brands shine through unforgettable visuals and strategic content.
          </p>
          <div className="flex gap-4">
            {[
              { icon: <Instagram size={28} />, href: "https://www.instagram.com/shinel.studios/?hl=en", label: "Instagram" },
              { icon: <Twitter size={28} />,   href: "https://linktr.ee/ShinelStudios",               label: "Linktree"  },
              { icon: <Linkedin size={28} />,  href: "https://www.linkedin.com/company/shinel-studios/posts/?feedView=all", label: "LinkedIn" }
            ].map((s, i) => (
            <motion.a
            key={i}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            whileHover={{ scale: 1.2, y: -2 }}
            whileTap={{ scale: 0.95 }}
            style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              {s.icon}
              </motion.a>
            ))}
          </div>
        </motion.div>

        {/* Column 2 - Links */}
        <motion.div variants={animations.fadeUp}>
          <h3 className="text-xl font-bold mb-6 font-['Poppins']">Quick Links</h3>
          <ul className="space-y-3">
            {['Home','Services','Testimonials','Contact'].map((t) => (
              <li key={t}>
                <a
                  href={`#${t.toLowerCase()}`}
                  className="transition-colors hover:text-[var(--orange)]"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  {t}
                </a>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Column 3 - Newsletter */}
        <motion.div variants={animations.fadeUp}>
          <h3 className="text-xl font-bold mb-6 font-['Poppins']">Stay Updated</h3>
          <p className="mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Subscribe to get the latest tips and updates from our team.
          </p>
          <div className="flex gap-2">
            <motion.input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            />
            <motion.button
              className="px-6 py-3 rounded-lg text-white"
              style={{ background: 'var(--orange)' }}
              whileHover={{ scale: 1.05, boxShadow: '0px 8px 18px rgba(232,80,2,0.4)' }}
              whileTap={{ scale: 0.95 }}
            >
              <Mail size={20} />
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Footer Bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mt-12 pt-8 text-center"
        style={{ borderTop: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
      >
        <p>© 2025 Shinel Studios™ — Where Ideas Shine. All rights reserved.</p>
      </motion.div>
    </div>
  </motion.footer>
);

/* ===================== SEO Schema (Organization + WebSite + Service + FAQPage) ===================== */
const SeoSchema = () => {
  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://shinelstudiosofficial.com";
    const logoUrl = `${origin}/assets/logo_light.png`;

    const faq = [
      { q: "What services does Shinel Studios offer?", a: "We specialize in video editing, thumbnail design, SEO & marketing, and comprehensive content strategy." },
      { q: "How long does a typical project take?", a: "Thumbnails in 24–48 hours; longer edits may take 1–2 weeks depending on scope." },
      { q: "Do you work with small creators?", a: "Yes, we tailor packages for creators and brands of all sizes." },
      { q: "What's included in content strategy?", a: "Research, competitor analysis, planning, schedules, and performance optimization." },
      { q: "How do you ensure quality?", a: "Multi-stage QA with client reviews and revisions until approval." },
    ];

    const ld = [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Shinel Studios",
        "url": origin,
        "logo": logoUrl,
        "sameAs": [
          "https://www.instagram.com/shinel.studios/",
          "https://www.linkedin.com/company/shinel-studios/",
          "https://linktr.ee/ShinelStudios"
        ],
        "contactPoint": [{
          "@type": "ContactPoint",
          "contactType": "customer support",
          "email": "hello@shinelstudiosofficial.com",
          "areaServed": "IN",
          "availableLanguage": ["en", "hi"]
        }]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Shinel Studios",
        "url": origin,
        "potentialAction": [{
          "@type": "SearchAction",
          "target": `${origin}/?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }]
      },
      {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "YouTube Editing & Packaging",
        "provider": { "@type": "Organization", "name": "Shinel Studios", "url": origin },
        "areaServed": "IN",
        "offers": [
          { "@type": "Offer", "name": "Starter", "priceCurrency": "INR", "price": "3999", "availability": "https://schema.org/InStock" },
          { "@type": "Offer", "name": "Shorts Pack", "priceCurrency": "INR", "price": "6000", "availability": "https://schema.org/InStock" },
          { "@type": "Offer", "name": "Creator Essentials", "priceCurrency": "INR", "price": "9999", "availability": "https://schema.org/InStock" }
        ],
        "url": `${origin}/#services`
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faq.map(({ q, a }) => ({
          "@type": "Question",
          "name": q,
          "acceptedAnswer": { "@type": "Answer", "text": a }
        }))
      }
    ];

    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.text = JSON.stringify(ld);
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);
  return null;
};

/* ===================== Page Component (wrapper + section order) ===================== */
function ShinelStudiosHomepage() {
  const [isDark, setIsDark] = React.useState(() =>
  document.documentElement.classList.contains('dark'));
  const [showCalendly, setShowCalendly] = React.useState(false);

  // Analytics + mobile text-sizing stability (NOW inside a component)
  React.useEffect(() => {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch {}

  // keep the browser UI color in sync (nice polish)
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute('content', isDark ? '#0F0F0F' : '#ffffff');

  const fav = document.getElementById('favicon');
  if (fav) fav.href = isDark ? '/favicon-dark-32x32.png' : '/favicon-light-32x32.png';
}, [isDark]);


  return (
    <div className={`min-h-screen ${isDark ? 'dark' : ''} overflow-x-hidden`}>
      {/* 1) Navigation */}
      <Header isDark={isDark} setIsDark={setIsDark} />

      {/* 2) Hero (has proof pill + main CTA) */}
      <HeroSection isDark={isDark} onAudit={() => setShowCalendly(true)} />

      {/* 3) Subtle top hook */}
      <QuickQuoteBar onBook={() => setShowCalendly(true)} />

      {/* 4) Before/After proof */}
      <ProofSection />

      {/* 5) Logos (single premium row) */}
      <CreatorsWorkedWith isDark={isDark} />

      {/* 6) Outcomes then services */}
      <CaseStudies />
      <ServicesSection />

      {/* 7) Testimonials wall */}
      <TestimonialsSection isDark={isDark} />


      {/* 8) Inline lead capture just before pricing */}
      <QuickLeadForm />

      {/* 9) Pricing */}
      <Pricing onOpenCalendly={() => setShowCalendly(true)} />

      {/* 10) Objections + process */}
      <FAQSection />
      <ProcessSection />

      {/* 11) Final CTA + footer */}
      <ContactCTA />
      <Footer />

      {/* Utilities */}
      <StickyMobileCTA />
      <SeoSchema />
      <CalendlyModal open={showCalendly} onClose={() => setShowCalendly(false)} />
    </div>
  );
}

/* ==== keep this at the very end of the file, at top level (NOT inside any block) ==== */
export default ShinelStudiosHomepage;


