import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sun, Moon, Menu, X, Play, Image, TrendingUp, FileText,
  ChevronDown,           // ← add this
  MessageCircle, Users, Eye, Target, Mail, Twitter, Instagram, Linkedin
} from "lucide-react";
import logoLight from "../assets/logo_light.png";
import logoDark  from "../assets/logo_dark.png";


/* --------- sample image resolver (handles missing files & any extension) --------- */
const allAssetMods = import.meta.glob('../assets/**/*.{png,jpg,jpeg,webp,svg}', { eager: true });
const findAssetByBase = (basename) => {
  // returns first match whose file name starts with basename (case-insensitive)
  const entries = Object.entries(allAssetMods);
  for (const [p, mod] of entries) {
    const file = p.split('/').pop()?.toLowerCase() || '';
    if (file.startsWith(basename.toLowerCase())) return mod.default;
  }
  return null;
};
// creator logos (auto-import any .png/.jpg/.jpeg/.webp/.svg in src/assets/creators)
const creatorImageModules = import.meta.glob(
  '../assets/creators/*.{png,jpg,jpeg,webp,svg}',
  { eager: true }
);

// map like { kamz: 'url', deadlox: 'url', ... }
const creatorImages = Object.fromEntries(
  Object.entries(creatorImageModules).map(([path, mod]) => {
    const file = path.split('/').pop() || '';
    const base = file.replace(/\.[^.]+$/, '').toLowerCase();
    return [base, mod.default];
  })
);

// helper to fetch by basename
const img = (key) => creatorImages[(key || '').toLowerCase()] || '';


// inline SVG placeholders (no network)
const svgPlaceholder = (label) =>
  `data:image/svg+xml;utf8,` +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#111"/>
          <stop offset="100%" stop-color="#333"/>
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#g)"/>
      <text x="50%" y="50%" fill="#fff" font-family="Arial, Helvetica, sans-serif"
            font-size="56" text-anchor="middle" dominant-baseline="middle">${label}</text>
    </svg>`
  );

const SAMPLE_BEFORE = findAssetByBase('sample_before') || svgPlaceholder('Before');
const SAMPLE_AFTER  = findAssetByBase('sample_after')  || svgPlaceholder('After');


// ===================== Custom Hooks =====================
const usePrevious = (value) => {
  const ref = React.useRef(value);
  React.useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
};

// helper: Indian currency formatting
const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// 🎬 Animation Variants
const animations = {
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  },
  fadeDown: {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
  },
  staggerParent: {
    visible: { transition: { staggerChildren: 0.15 } }
  },
  float: {
    animate: { y: [0, -6, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } }
  },
};

const BRAND = {
  orange: '#E85002',
  orangeLight: '#FFB48A',
  light: {
    text: '#0D0D0D',
    textMuted: 'rgba(13,13,13,0.7)',
    surface: '#FFFFFF',
    surfaceAlt: '#FFF9F6',
    border: 'rgba(0,0,0,0.10)',
    headerBg: 'rgba(255,255,255,0.85)',
    heroBg: 'linear-gradient(180deg,#FFF6F2 0%,#FFE7DC 50%,#FFD7C4 100%)'
  },
  dark: {
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.7)',
    surface: '#0F0F0F',
    surfaceAlt: '#0B0B0B',
    border: 'rgba(255,255,255,0.12)',
    headerBg: 'rgba(0,0,0,0.75)',
    heroBg: 'linear-gradient(180deg,#000000 0%,#0E0E0E 50%,#1A1A1A 100%)'
  }
};


const ShinelStudiosHomepage = () => {
  const reduceMotion = typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [isDark, setIsDark] = useState(true);
  const [openFAQ, setOpenFAQ] = useState(null);
  const [showCalendly, setShowCalendly] = useState(false);

  // 4a) Load theme + UTM once on mount
useEffect(() => {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') setIsDark(saved === 'dark');

  const params = new URLSearchParams(window.location.search);
  const fields = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
  const utm = fields.reduce((o,k)=>{ const v=params.get(k); if(v) o[k]=v; return o; },{});
  if (Object.keys(utm).length) localStorage.setItem("utm", JSON.stringify(utm));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// 4b) Apply theme whenever isDark changes (and persist it)
useEffect(() => {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);

  const t = isDark ? BRAND.dark : BRAND.light;
  // ✅ NEW: header nav colors
  root.style.setProperty('--nav-link', t.text);
  root.style.setProperty('--nav-hover', BRAND.orange);

  root.style.setProperty('--text', t.text);
  root.style.setProperty('--text-muted', t.textMuted);
  root.style.setProperty('--surface', t.surface);
  root.style.setProperty('--surface-alt', t.surfaceAlt);
  root.style.setProperty('--border', t.border);
  root.style.setProperty('--header-bg', t.headerBg);
  root.style.setProperty('--hero-bg', t.heroBg);
  root.style.setProperty('--orange', BRAND.orange);

  const favicon = document.getElementById('favicon');
  if (favicon) {
    favicon.href = isDark ? '/favicon-dark-32x32.png' : '/favicon-light-32x32.png';
  }
// ✅ Update <meta name="theme-color"> so mobile browsers change UI chrome
const metaTheme = document.querySelector('meta[name="theme-color"]:not([media])');
if (metaTheme) {
  metaTheme.setAttribute('content', isDark ? '#0F0F0F' : '#ffffff');
}
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}, [isDark]);

  const fadeIn = { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6 } };
  const staggerContainer = { animate: { transition: { staggerChildren: 0.1 } } };
  const float = { animate: { y: [0, -6, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } } };
  const tiltHover = { whileHover: { y: -8, rotateX: 2, rotateY: -2, transition: { type: 'spring', stiffness: 200, damping: 15 } } };

/* ===================== Header (thinner) ===================== */
const Header = ({ isDark, setIsDark }) => {
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
            transform: `scaleX(${progress / 100})`,
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
          {/* Brand */}
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
        transform: "scale(2.8)",   // same size as Login
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
                    {workItems.map((item, idx) => (
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

          {/* Right actions (unchanged) */}
          <div className="flex items-center gap-2 md:gap-3">
            {!quickBarVisible && (
              <motion.button
                onClick={() => setShowCalendly(true)}
                className="hidden md:inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                whileHover={{ y: -2, boxShadow: "0 10px 24px rgba(232,80,2,0.35)" }}
                whileTap={{ scale: 0.98 }}
              >
                Book Free Audit
              </motion.button>
            )}

<motion.div className="hidden md:inline-flex">
  <Link
    to="/login"
    className="items-center rounded-full px-4 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
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

        {/* Mobile menu (unchanged) */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              id="mobile-menu"
              ref={menuPanelRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden"
              style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
              role="dialog" aria-modal="true" aria-label="Main menu"
            >
              {/* ...unchanged contents... */}
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

/* ===================== Trust Bar (ultra-thin + animated + auto-hide with QQB) ===================== */
const TrustBar = () => {
  const [show, setShow] = React.useState(true);

  // Respect reduced motion
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Hide when Quick Quote Bar is visible (listens to your existing qqb:visible event)
  React.useEffect(() => {
    const onToggle = (e) => setShow(!Boolean(e.detail?.visible));
    // set initial (in case QQB already dispatched before mount)
    setShow(true);
    document.addEventListener("qqb:visible", onToggle);
    return () => document.removeEventListener("qqb:visible", onToggle);
  }, []);

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
          <div className="container mx-auto px-3 py-1 flex items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] md:text-xs leading-tight">
            {/* Rating */}
            <div className="flex items-center gap-1.5" style={{ color: "var(--text)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
              <span>
                Rated <b className="mx-0.5">4.7/5</b> by creators
              </span>
            </div>

            {/* Divider */}
            <span
              className="hidden md:inline"
              style={{ color: "var(--text-muted)" }}
              aria-hidden="true"
            >
              •
            </span>

            {/* Counters (collapse on small screens) */}
            <div
              className="hidden md:flex items-center gap-2"
              style={{ color: "var(--text-muted)" }}
            >
              <span>
                Trusted by <b style={{ color: "var(--text)" }}>20+</b> active clients
              </span>
              <span aria-hidden="true">•</span>
              <span>
                <b style={{ color: "var(--text)" }}>7M+</b> views generated
              </span>
            </div>
          </div>
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



/* ===================== Hero (LCP-optimized headline/CTA, GPU-cheap stars, light-mode banding fix) ===================== */
const HeroSection = ({ isDark }) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Theme-aware star palette
  const starPalette = isDark
    ? ["#FFFFFF", "#FFEFC7", "#FFD37A"]
    : ["#B95600", "#FFB84C", "#FFA11E"];

  // DPR-aware count
  const starCount = useMemo(() => {
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const base = isDark ? 26 : 16; // slight trim for paint time
    return reduceMotion ? 0 : Math.round(base * (0.8 + 0.2 * dpr));
  }, [isDark, reduceMotion]);

  const stars = useMemo(() => {
    if (reduceMotion) return [];
    return Array.from({ length: starCount }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 2.4,
      size: Math.random() * 7 + 6,
      color: starPalette[Math.floor(Math.random() * starPalette.length)],
      spinDir: Math.random() > 0.5 ? 1 : -1,
      scaleBase: 0.9 + Math.random() * 0.25,
      speed: 1.6 + Math.random() * 1.6,
    }));
  }, [starCount, starPalette, reduceMotion]);

  const LightFlatBg = () => (
    <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 1920 1080" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFF2E9" />
          <stop offset="50%" stopColor="#FFE0CF" />
          <stop offset="100%" stopColor="#FFD1BC" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1920" height="1080" fill="url(#lg)" />
    </svg>
  );

  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "var(--hero-bg)" }}
      aria-label="Shinel Studios — Helping creators grow with Editing, Thumbnails, Shorts, and GFX"
    >
      {!isDark && <LightFlatBg />}

      {/* Decorative Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {stars.map((s, i) => (
          <motion.svg
            key={i}
            aria-hidden="true"
            viewBox="0 0 24 24"
            width={s.size}
            height={s.size}
            className="absolute will-change-transform"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              filter: isDark ? "drop-shadow(0 0 6px rgba(255,255,255,0.7)) drop-shadow(0 0 10px rgba(232,80,2,0.18))" : "none",
              transformOrigin: "12px 10px",
            }}
            initial={{ scale: s.scaleBase, opacity: isDark ? 0.65 : 0.7, rotate: 0 }}
            animate={{
              scale: [s.scaleBase, s.scaleBase + 0.32, s.scaleBase],
              opacity: [isDark ? 0.45 : 0.55, 1, isDark ? 0.45 : 0.55],
              rotate: [0, s.spinDir * 180, s.spinDir * 360],
            }}
            transition={reduceMotion ? { duration: 0.01 } : { duration: s.speed + s.delay, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
          >
            {!isDark && (
              <defs>
                <radialGradient id={`halo-${i}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255,232,188,0.7)" />
                  <stop offset="60%" stopColor="rgba(255,204,128,0.32)" />
                  <stop offset="100%" stopColor="rgba(255,204,128,0)" />
                </radialGradient>
              </defs>
            )}
            {!isDark && <circle cx="12" cy="10" r="7" fill={`url(#halo-${i})`} opacity="0.35" />}
            <polygon
              points="12,0 14,8 22,10 14,12 12,20 10,12 2,10 10,8"
              fill={s.color}
              stroke={isDark ? "rgba(255,255,255,0.55)" : "rgba(120,55,0,0.6)"}
              strokeWidth="0.6"
            />
            <circle cx="12" cy="10" r="1.1" fill={isDark ? "#FFFFFF" : "#FFFAF0"} />
          </motion.svg>
        ))}
        {/* Subtle vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? "radial-gradient(700px 420px at 50% 40%, rgba(0,0,0,0.06), rgba(0,0,0,0.03) 45%, transparent 70%)"
              : "radial-gradient(900px 540px at 50% 40%, rgba(0,0,0,0.05), rgba(0,0,0,0.02) 45%, transparent 72%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div variants={animations.staggerParent} initial="hidden" animate="visible" className="max-w-4xl mx-auto">
          <motion.h1
            variants={animations.fadeUp}
            className="text-5xl md:text-7xl font-bold mb-6 font-['Poppins']"
            style={{ color: "var(--text)" }}
          >
            Where Ideas{" "}
            <motion.span
              className="text-transparent bg-clip-text will-change-transform inline-block"
              style={{ backgroundImage: `linear-gradient(90deg, var(--orange), #ff9357)` }}
              animate={reduceMotion ? {} : { y: [0, -6, 0] }}
              transition={reduceMotion ? { duration: 0.01 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              Shine
            </motion.span>
          </motion.h1>

          <motion.p
            variants={animations.fadeUp}
            transition={{ delay: 0.12 }}
            className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            Shinel Studios — Helping creators grow with Editing • Thumbnails • Shorts • GFX
          </motion.p>

          <motion.div
            variants={animations.fadeUp}
            transition={{ delay: 0.24 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.a
              href="#services"
              className="text-white px-8 py-4 rounded-lg font-medium text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
              style={{ background: "var(--orange)" }}
              whileHover={{ y: -2, boxShadow: "0 12px 28px rgba(232,80,2,0.35)" }}
              whileTap={{ scale: 0.98 }}
            >
              Explore Work
            </motion.a>
            <motion.a
              href="#contact"
              className="px-8 py-4 rounded-lg font-medium text-lg border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
              style={{ borderColor: "var(--orange)", color: "var(--orange)" }}
              whileHover={{ backgroundColor: "var(--orange)", color: "#fff", y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              Start a Project
            </motion.a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};


/* ===================== Creators Worked With (skeletons, CLS-safe logos, marquee polish) ===================== */
const CreatorsWorkedWith = () => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const creators = [
    { name: "Kamz Inkzone", subs: "171K", href: "https://youtube.com/@KamzInkzone", logo: img('kamz'), niche: "Gaming" },
    { name: "Deadlox Gaming", subs: "7K", href: "https://youtube.com/@DeadloxGaming", logo: img('deadlox'), niche: "Gaming" },
    { name: "Kundan Parashar", subs: "7K", href: "https://youtube.com/@KundanParashar", logo: img('kundan'), niche: "Devotional" },
    { name: "Aish is Live", subs: "13K", href: "https://youtube.com/@AishIsLive", logo: img('aish'), niche: "Streaming" },
    { name: "Gamer Mummy", subs: "14.7K", href: "https://youtube.com/@GamerMummy", logo: img('gamermummy'), niche: "Gaming" },
    { name: "Gamify Anchit", subs: "1.5K", href: "https://youtube.com/@GamifyAnchit", logo: img('anchit'), niche: "Gaming" },
    { name: "Maggie Live", subs: "22K", href: "https://youtube.com/@MaggieLive", logo: img('maggie'), niche: "Lifestyle" },
    { name: "Crown Ankit", subs: "3K", href: "https://youtube.com/@CrownAnkit", logo: img('ankit'), niche: "Gaming" },
    { name: "Manav Maggie Sukhija", subs: "50K", href: "https://youtube.com/@ManavMaggieSukhija", logo: img('manav'), niche: "YouTuber" },
  ];

  const marquee = [...creators, ...creators];

  const Logo = ({ src, alt }) => {
    const [ok, setOk] = useState(false);
    return (
      <div
        className="w-12 h-12 rounded-full shrink-0 overflow-hidden relative"
        style={{ background: "rgba(0,0,0,0.06)", border: "1px solid var(--border)" }}
        aria-hidden="true"
      >
        {!ok && <div className="absolute inset-0 animate-pulse" style={{ background: "rgba(0,0,0,0.06)" }} />}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          width={48}
          height={48}
          className="w-full h-full object-cover"
          onLoad={() => setOk(true)}
          onError={() => setOk(true)}
        />
      </div>
    );
  };

  const Card = ({ c, i }) => {
    const initials = c.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

    const Wrapper = ({ children }) =>
      c.href ? (
        <a
          href={c.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${c.name} channel (opens in new tab)`}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded-2xl"
        >
          {children}
        </a>
      ) : <div>{children}</div>;

    return (
      <motion.div
        key={`${c.name}-${i}`}
        whileHover={{ y: -6, scale: 1.03 }}
        className="min-w-[240px] sm:min-w-[260px] md:min-w-[300px] rounded-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, var(--surface), var(--surface-alt))",
          border: "1px solid var(--border)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
        }}
      >
        <Wrapper>
          <div className="p-6 flex items-center gap-4">
            {c.logo ? <Logo src={c.logo} alt="" /> : (
              <div className="w-12 h-12 rounded-full grid place-items-center" style={{ background: "rgba(0,0,0,0.06)", border: "1px solid var(--border)" }}>
                <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{initials}</span>
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-lg md:text-xl font-semibold truncate" style={{ color: "var(--text)" }} title={c.name}>
                {c.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs md:text-sm">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full" style={{ background: "rgba(232,80,2,0.12)", color: "var(--orange)" }}>
                  {c.subs}
                </span>
                {c.niche && (
                  <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                    {c.niche}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Wrapper>
      </motion.div>
    );
  };

  return (
    <section style={{ background: "var(--surface)" }} className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <motion.h2
          variants={animations.fadeDown}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-bold text-center mb-6 md:mb-12 font-['Poppins']"
          style={{ color: "var(--text)" }}
        >
          Creators We Worked With
        </motion.h2>

        {/* Mobile: swipe carousel */}
        <div className="md:hidden relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8" style={{ background: "linear-gradient(to right, var(--surface), transparent)" }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8" style={{ background: "linear-gradient(to left, var(--surface), transparent)" }} />
          <div
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4"
            style={{ scrollPaddingInline: "1rem", WebkitOverflowScrolling: "touch" }}
            role="list"
            aria-label="Creators list (swipe horizontally)"
          >
            {creators.map((c, i) => (
              <div key={i} className="snap-start">
                <Card c={c} i={i} />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: marquee */}
        {!reduceMotion ? (
          <div className="hidden md:block marquee-viewport mask-fade-x">
            <div className="marquee-hover-pause" style={{ "--marquee-duration": "40s" }}>
              <div className="marquee-track gap-6">
                {marquee.map((c, i) => (
                  <Card key={`${c.name}-${i}`} c={c} i={i} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 gap-6 mt-6" role="list">
            {creators.map((c, i) => (
              <Card key={`grid-${i}`} c={c} i={i} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .marquee-viewport { position: relative; overflow: hidden; }
        .mask-fade-x {
          mask-image: linear-gradient(to right, transparent 0, black 48px, black calc(100% - 48px), transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0, black 48px, black calc(100% - 48px), transparent 100%);
        }
        .marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation: marquee-rtl var(--marquee-duration, 40s) linear infinite;
        }
        @keyframes marquee-rtl { 0% { transform: translateX(0%);} 100% { transform: translateX(-50%);} }
        @media (hover:hover) and (pointer:fine) {
          .marquee-hover-pause:hover .marquee-track { animation-play-state: paused; }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
};


  /* ===================== Services ===================== */
const ServicesSection = () => {
  const services = [
    { icon: <Play size={40} />, title: 'Video Editing', desc: 'Professional video editing and post-production services' },
    { icon: <Image size={40} />, title: 'Thumbnail Design', desc: 'Eye-catching thumbnails that boost click-through rates' },
    { icon: <TrendingUp size={40} />, title: 'SEO & Marketing', desc: 'Strategic marketing to grow your online presence' },
    { icon: <FileText size={40} />, title: 'Content Strategy', desc: 'Comprehensive content planning and strategy' }
  ];

  return (
    <section id="services" className="py-20" style={{ background: 'var(--surface-alt)' }}>
      <div className="container mx-auto px-4">
        
        {/* Section Heading */}
        <motion.div
          variants={animations.fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 font-['Poppins']" style={{ color: 'var(--text)' }}>
            Our Services
          </h2>
          <p className="text-xl max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>
            We offer comprehensive creative solutions to elevate your brand
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
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="mb-4" style={{ color: 'var(--orange)' }}>{s.icon}</div>
              <h3 className="text-xl font-bold mb-3 font-['Poppins']" style={{ color: 'var(--text)' }}>
                {s.title}
              </h3>
              <p style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

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

/* ===================== Proof Section (stable layout + clearer copy) ===================== */
const ProofSection = () => (
  <section className="py-16" style={{ background: "var(--surface-alt)" }} aria-labelledby="proof-heading">
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

      <BeforeAfter
        before={SAMPLE_BEFORE}
        after={SAMPLE_AFTER}
        label="Drag to compare (Before → After)"
        beforeAlt="Original thumbnail"
        afterAlt="Optimized thumbnail"
        width={1280}
        height={720}
      />
    </div>
  </section>
);



/* ===================== Case Studies ===================== */
const CaseStudies = () => {
  const items = [
    { brand:'Kamz Inkzone', result:'+62% CTR', detail:'+41% avg view duration in 6 weeks', thumb:'', link:'#' },
    { brand:'Gamer Mummy',  result:'+48% retention', detail:'Shorts pipeline + packaging', thumb:'', link:'#' },
    { brand:'Aish is Live', result:'2.1x revenue', detail:'Clips → shorts → offers', thumb:'', link:'#' },
  ];
  return (
    <section className="py-20" style={{background:'var(--surface)'}}>
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-10 font-['Poppins']" style={{color:'var(--text)'}}>Recent Wins</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it,i)=>(
            <motion.a key={i} href={it.link} whileHover={{y:-6}} className="rounded-2xl p-6 border"
              style={{background:'var(--surface-alt)', borderColor:'var(--border)'}}>
              <div className="text-sm mb-2" style={{color:'var(--text-muted)'}}>Client</div>
              <div className="text-xl font-semibold" style={{color:'var(--text)'}}>{it.brand}</div>
              <div className="mt-4 text-3xl font-bold" style={{color:'var(--orange)'}}>{it.result}</div>
              <div className="mt-2" style={{color:'var(--text-muted)'}}>{it.detail}</div>
              <div className="mt-4 text-sm underline" style={{color:'var(--text)'}}>View breakdown →</div>
            </motion.a>
          ))}
        </div>
      </div>
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

/* ===================== Testimonials WALL (GPU-friendly, reduced-motion aware, cleaner DOM) ===================== */
const TestimonialsWall = () => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const testimonials = [
    { name: 'Kamz Inkzone', tag: 'YouTuber', text: 'Our brand videos got a professional uplift, engagement went crazy!' },
    { name: 'Deadlox Gaming', tag: 'Gamer', text: 'Editing & thumbnails gave me better CTR & retention 🔥' },
    { name: 'Kundan Parashar', tag: 'Devotional Creator', text: 'They handled devotional content with respect & quality 🙏' },
    { name: 'Aish is Live', tag: 'Streamer', text: 'Livestream clips turned into viral shorts 🚀' },
    { name: 'Gamer Mummy', tag: 'Gaming Creator', text: 'Editing consistency + branding helped scale fast.' },
    { name: 'Gamify Anchit', tag: 'Gamer', text: 'Loved the creative storytelling & editing finesse.' },
    { name: 'Maggie Live', tag: 'Lifestyle Creator', text: 'Packaging & thumbnails boosted CTR instantly.' },
    { name: 'Crown Ankit', tag: 'Gaming Creator', text: 'The edits really brought out my personality 💯' },
    { name: 'Manav Maggie Sukhija', tag: 'YouTuber', text: 'High quality, fast turnaround, professional team.' },
  ];

  // Stable shuffle (seedless but deterministic per mount)
  const shuffled = useMemo(() => {
    const arr = [...testimonials];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (i * 9301 + 49297) % 233280 % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  // Divide into 3 almost-equal columns
  const colSize = Math.ceil(shuffled.length / 3);
  const columns = [shuffled.slice(0, colSize), shuffled.slice(colSize, colSize * 2), shuffled.slice(colSize * 2)];

  const Card = ({ item, i }) => {
    const initials = item.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    return (
      <motion.li
        className="w-full"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
        transition={{ duration: 0.45, delay: (i % 6) * 0.06 }}
      >
        <motion.div
          className="p-6 rounded-2xl border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          animate={reduceMotion ? {} : { y: [0, -6, 0] }}
          transition={reduceMotion ? {} : { duration: 6 + (i % 5), repeat: Infinity, ease: "easeInOut" }}
          whileHover={reduceMotion ? {} : { scale: 1.03 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
              style={{ background: 'var(--orange)' }}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>{item.name}</div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.tag}</div>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>{item.text}</p>
        </motion.div>
      </motion.li>
    );
  };

  return (
    <section id="testimonials" className="relative py-24" style={{ background: 'var(--surface-alt)' }}>
      <div className="container mx-auto px-4 relative">
        {/* Heading */}
        <motion.div
          variants={animations.fadeDown}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-['Poppins']" style={{ color: 'var(--text)' }}>
            What Clients Say
          </h2>
          <p className="text-lg md:text-xl mt-3" style={{ color: 'var(--text-muted)' }}>
            Real feedback from creators and brands we work with
          </p>
        </motion.div>

        {/* Scrolling Wall */}
        <div className="relative pt-12">
          <div className="ss-viewport relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ss-wall">
              {columns.map((col, ci) => (
                <ul
                  key={ci}
                  className={`ss-col ${ci === 0 ? "slow" : ci === 1 ? "medium" : "fast"}`}
                  aria-label={`Testimonials column ${ci + 1}`}
                >
                  {/* Duplicate once for seamless loop */}
                  {[...col, ...col].map((it, i) => <Card key={`${ci}-${i}`} item={it} i={i} />)}
                </ul>
              ))}
            </div>

            {/* Gradient edges */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-12"
              style={{ background: `linear-gradient(to bottom, ${isDark ? '#0B0B0B' : '#FFF9F6'} 0%, transparent 100%)` }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
              style={{ background: `linear-gradient(to top, ${isDark ? '#0B0B0B' : '#FFF9F6'} 0%, transparent 100%)` }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <style>{`
        .ss-viewport {
          height: 600px;
          overflow: hidden;
          mask-image: linear-gradient(to bottom, transparent 0, black 40px, black calc(100% - 40px), transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 40px, black calc(100% - 40px), transparent 100%);
        }
        .ss-wall .ss-col {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          will-change: transform;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
        }
        /* Speeds tuned for readability; shorter loops reduce battery drain */
        .ss-col.slow   { animation-name: colUp;   animation-duration: 38s; }
        .ss-col.medium { animation-name: colDown; animation-duration: 30s; }
        .ss-col.fast   { animation-name: colUp;   animation-duration: 24s; }

        /* Pause on hover for desktop only (no jank on touch) */
        @media (hover: hover) and (pointer: fine) {
          .ss-viewport:hover .ss-col { animation-play-state: paused; }
        }

        @keyframes colUp   { 0% {transform:translateY(0)} 100% {transform:translateY(-50%)} }
        @keyframes colDown { 0% {transform:translateY(-50%)} 100% {transform:translateY(0)} }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .ss-col { animation: none !important; transform: none !important; }
        }
      `}</style>
    </section>
  );
};

/* ===================== Stats (count-up + reduced-motion safe + a11y) ===================== */
const StatCard = ({ icon, target, prefix = "", suffix = "", label, isDark, revealDelay = 0, reduceMotion }) => {
  const [visible, setVisible] = React.useState(false);
  const ref = React.useRef(null);
  // visibility observer
  React.useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "-20% 0px -20% 0px", threshold: 0.2 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  // count-up
  const [val, setVal] = React.useState(reduceMotion ? target : 0);
  React.useEffect(() => {
    if (!visible) return;
    if (reduceMotion) { setVal(target); return; }
    const start = performance.now();
    const duration = 1100 + revealDelay; // slight stagger
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 2); // easeOutQuad
      setVal(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, target, reduceMotion, revealDelay]);

  return (
    <motion.div
      ref={ref}
      variants={animations.fadeUp}
      className="text-center p-8 backdrop-blur-lg rounded-2xl"
      style={{
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
        border: "1px solid var(--border)",
      }}
      whileHover={reduceMotion ? {} : { y: -6, boxShadow: "0 10px 24px rgba(0,0,0,0.15)" }}
      role="group"
      aria-label={`${label}: ${prefix}${target}${suffix}`}
    >
      <div className="mb-4 flex justify-center" style={{ color: "var(--orange)" }} aria-hidden="true">
        {icon}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="text-4xl font-bold mb-2 font-['Poppins']"
        style={{ color: "var(--text)" }}
        aria-live="polite"
      >
        {prefix}{val}{suffix}
      </motion.div>
      <div style={{ color: "var(--text-muted)" }}>{label}</div>
    </motion.div>
  );
};

const StatsSection = () => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stats = [
    { icon: <Users size={40} />, number: 20, suffix: "+", label: "Active Clients" },
    { icon: <Eye size={40} />, number: 38, prefix: "+", suffix: "%", label: "Avg CTR lift (30 days)" },
    { icon: <Target size={40} />, number: 27, prefix: "+", suffix: "%", label: "Avg watch time lift" },
    { icon: <MessageCircle size={40} />, number: 2, prefix: "<", suffix: "h", label: "Avg response time" },
  ];

  return (
    <section className="py-20" style={{ background: isDark ? "#000" : "#fff" }} aria-labelledby="stats-heading">
      <div className="container mx-auto px-4">
        <h2 id="stats-heading" className="sr-only">Key performance stats</h2>

        <motion.div
          variants={animations.staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {stats.map((st, i) => (
            <StatCard
              key={st.label}
              icon={st.icon}
              target={st.number}
              prefix={st.prefix}
              suffix={st.suffix}
              label={st.label}
              isDark={isDark}
              revealDelay={i * 150}
              reduceMotion={reduceMotion}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

  /* ===================== FAQ ===================== */
  const FAQSection = () => {
  const faqs = [
    { question: 'What services does Shinel Studios offer?', answer: 'We specialize in video editing, thumbnail design, SEO & marketing, and comprehensive content strategy to help creators and brands shine online.' },
    { question: 'How long does a typical project take?', answer: 'Simple thumbnails can be delivered within 24–48 hours, while comprehensive video projects may take 1–2 weeks depending on scope.' },
    { question: 'Do you work with small creators or just big brands?', answer: 'We work with creators and brands of all sizes and tailor services to your needs and budget.' },
    { question: "What's included in content strategy?", answer: 'Market research, competitor analysis, content planning, posting schedules, and performance optimization recommendations.' },
    { question: 'How do you ensure quality?', answer: 'Multi-stage QA with client reviews and revisions until you’re fully satisfied.' },
  ];
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
          {faqs.map((f, i) => (
            <motion.div
            key={i}
            variants={animations.fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                className="w-full p-6 text-left flex items-center justify-between"
                style={{ background: 'var(--surface-alt)', color: 'var(--text)' }}
              >
                <span className="font-medium">{f.question}</span>
                <ChevronDown
                  size={20}
                  className={`transition-transform ${openFAQ === i ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--text-muted)' }}
                />
              </button>
              <AnimatePresence>
                {openFAQ === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, y: i % 2 === 0 ? 16 : -16 }}
                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: i % 2 === 0 ? 16 : -16 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="p-6" style={{ background: 'var(--surface)' }}>
                      <p style={{ color: 'var(--text-muted)' }}>{f.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>

      {/* WhatsApp CTA */}
      <div className="text-center mt-12">
        <a
          href="https://wa.me/918968141585?text=Hi%20Shinel%20Studios!%20I%20want%20to%20grow%20my%20channel."
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 px-8 py-4 bg-[var(--orange)] text-white rounded-full font-semibold shadow-md hover:shadow-lg hover:scale-[1.03] transition-all w-fit mx-auto"
        >
          <MessageCircle size={22} className="text-white" />
          Still have questions? Chat with us on <span className="font-bold">WhatsApp</span>
        </a>
      </div>
    </section>
  );
};

/* ===================== Pricing (clear hierarchy, premium hover, accessible labels) ===================== */
const Pricing = () => {
  const tiers = [
    {
      name: "Starter",
      priceInr: 3999,
      bullet: ["1 thumbnail", "1 video edit (up to 8 min)", "Basic SEO setup"],
      cta: "Request Starter",
      tag: "Entry Plan",
    },
    {
      name: "Shorts Pack",
      priceInr: 6000,
      featured: true,
      bullet: ["30 shorts", "Optimized for YT Shorts feed", "Hook-first scripting support"],
      cta: "Book Shorts Pack",
      tag: "Most Popular",
    },
    {
      name: "Creator Essentials",
      priceInr: 9999,
      bullet: ["Thumbnails + edits combo", "Light brand kit & packaging", "Monthly growth check-in"],
      cta: "Book Essentials",
      tag: "Best Value",
    },
  ];

  return (
    <section className="py-20" style={{ background: "var(--surface)" }} aria-labelledby="pricing-heading">
      <div className="container mx-auto px-4">
        <h2
          id="pricing-heading"
          className="text-4xl md:text-5xl font-bold text-center mb-10 font-['Poppins']"
          style={{ color: "var(--text)" }}
        >
          Simple Packages
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((t, i) => (
            <motion.article
              key={i}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`group relative rounded-2xl p-6 border overflow-hidden ${t.featured ? "ring-2 ring-[var(--orange)]/35" : ""}`}
              style={{ background: "var(--surface-alt)", borderColor: "var(--border)", boxShadow: "0 10px 24px rgba(0,0,0,0.08)" }}
              aria-label={`${t.name} plan, starting ${formatINR(t.priceInr)}`}
            >
              {/* animated backlight */}
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-10 -z-10 opacity-0 group-hover:opacity-100 blur-2xl"
                style={{
                  background:
                    "radial-gradient(600px 200px at 50% -20%, rgba(232,80,2,0.18), transparent 60%), radial-gradient(400px 240px at 80% 120%, rgba(255,147,87,0.18), transparent 70%)",
                }}
                animate={{ opacity: [0.08, 0.16, 0.1, 0.16, 0.08] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* badge */}
              <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                {t.tag || "\u00A0"}
              </div>

              <h3 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
                {t.name}
              </h3>

              <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                Starting at
              </div>

              <div className="text-4xl font-bold mt-1 font-['Poppins']" style={{ color: "var(--text)" }}>
                {formatINR(t.priceInr)}
              </div>

              <ul className="mt-4 space-y-2" style={{ color: "var(--text)" }}>
                {t.bullet.map((b, bi) => (
                  <li key={bi} className="flex items-start gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setShowCalendly(true)}
                className="w-full mt-6 rounded-xl py-3 font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)", boxShadow: "0 10px 24px rgba(232,80,2,0.35)" }}
                aria-label={t.cta}
              >
                {t.cta}
              </button>
            </motion.article>
          ))}
        </div>

        {/* Custom quote */}
        <div className="text-center mt-8">
          <button
            onClick={() => setShowCalendly(true)}
            className="inline-flex items-center rounded-full px-6 py-3 font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)", boxShadow: "0 10px 24px rgba(232,80,2,0.35)" }}
          >
            Need something else? Get a Custom Quote
          </button>
          <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            GST not applicable
          </div>
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
              role="status"
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

/* ===================== Sticky Mobile CTA ===================== */
const StickyMobileCTA = () => (
  <div className="md:hidden fixed bottom-3 left-0 right-0 z-40 px-3">
    <div
      className="flex gap-2 rounded-2xl p-2 shadow-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <a
        href="https://wa.me/918968141585?text=Hi%20Shinel%20Studios!%20I%20want%20to%20grow%20my%20channel."
        target="_blank" rel="noreferrer"
        className="flex-1 text-center rounded-xl py-3 font-semibold text-white"
        style={{ background: 'linear-gradient(90deg, var(--orange), #ff9357)' }}
      >
        WhatsApp
      </a>
      <a
        href="#contact"
        className="flex-1 text-center rounded-xl py-3 font-semibold"
        style={{ border: '2px solid var(--orange)', color: 'var(--orange)' }}
      >
        Get Quote
      </a>
    </div>
  </div>
);

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

/* ===================== App Wrapper ===================== */
return (
  <div className={`min-h-screen ${isDark ? 'dark' : ''} overflow-x-hidden`}>
    <Header isDark={isDark} setIsDark={setIsDark} />
    <QuickQuoteBar onBook={() => setShowCalendly(true)} />
    <HeroSection isDark={isDark} />
    <CreatorsWorkedWith />
    <ServicesSection />
    <CaseStudies />
    <ProofSection />
    <ProcessSection />
    <TestimonialsWall />
    <StatsSection />
    <FAQSection />
    <Pricing />
    <QuickLeadForm />
    <ContactCTA />
    <Footer />
    <StickyMobileCTA />
    <SeoSchema />
    <CalendlyModal open={showCalendly} onClose={() => setShowCalendly(false)} />
  </div>
);
};

export default ShinelStudiosHomepage;

