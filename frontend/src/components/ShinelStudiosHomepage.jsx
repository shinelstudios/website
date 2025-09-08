/* ===================== Imports & Globals (TOP OF FILE ONLY) ===================== */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Image, Zap, Wand2, PenTool, Bot, Megaphone, BarChart3, Quote, ExternalLink
} from "lucide-react";

import RoiCalculator from "./RoiCalculator";
import ExitIntentModal from "./ExitIntentModal";

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

/* Resolve sample images via asset glob (fallbacks if missing) */
export const SAMPLE_BEFORE = findAssetByBase("sample_before") || svgPlaceholder("Before");
export const SAMPLE_AFTER  = findAssetByBase("sample_after")  || svgPlaceholder("After");

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

/* ===================== Quick Quote Bar (compact + proximity hide near form + event listener) ===================== */
const QuickQuoteBar = ({ onBook }) => {
  const [showBase, setShowBase] = React.useState(false);   // base “scrolled enough” rule
  const [nearForm, setNearForm] = React.useState(false);   // hide when approaching lead form
  const [forcedHidden, setForcedHidden] = React.useState(false); // hide via leadform:visible event

  // (NEW) Hide when the lead form broadcasts visibility
  React.useEffect(() => {
    const onLead = (e) => {
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
    try {
      window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "cta_click_audit", src: "hero" } }));
    } catch {}
    onAudit?.();
  };

  const handleSeeWork = (e) => {
    e.preventDefault();
    try {
      window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "see_work", src: "hero" } }));
    } catch {}
    const el = document.querySelector("#work");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---------- Efficient, adaptive star field ---------- */
  const fieldRef = React.useRef(null);

  // Count adapts to width & DPR; disabled if reduced motion
  const stars = React.useMemo(() => {
    if (reduceMotion) return [];
    const w = typeof window !== "undefined" ? window.innerWidth : 1280;
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;

    if (w < 340) return [];
    let base = w < 380 ? 0 : w < 640 ? 8 : w < 1024 ? 10 : 12;
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
        speed: 2.3 + ((i % 5) * 0.35),
      });
    }
    return out;
  }, [reduceMotion]);

  // Pause star animations when hero is off-screen
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

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-hero"
      style={{
        padding: "clamp(80px, 9vw, 132px) 0 clamp(40px, 6vw, 96px)",
        background: "var(--hero-bg)",
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
              className="ss-sparkle"
              style={{
                top: s.top,
                left: s.left,
                ["--s"]: `${s.size}px`,
                ["--delay"]: `${s.delay}s`,
                ["--drift"]: `${s.drift}px`,
                ["--rot"]: `${s.rot}deg`,
                ["--spd"]: `${s.speed}s`,
                opacity: 0.88,
              }}
            />
          ))}
        </div>
      )}

      <div className="container mx-auto px-4 relative z-[1]">
        {/* Headline */}
        <motion.h1
          className="font-bold font-['Poppins'] tracking-tight hero-title"
          style={{
            color: "var(--text)",
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
            color: "var(--text-muted)",
            fontSize: "clamp(1rem, 2.2vw, 1.25rem)",
            maxWidth: "52ch",
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          We help creators win attention with thumb-stopping thumbnails, hook-first shorts, and clean long-form edits.
        </motion.p>

        {/* Proof strip */}
        <motion.div
          className="mt-5 sm:mt-6 rounded-2xl"
          style={{
            background: "color-mix(in oklab, var(--surface) 92%, transparent)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(6px)",
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 8 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          aria-label="Social proof"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-0 px-4 py-3">
            <div className="flex items-center justify-start sm:justify-center gap-2 text-sm" style={{ color: "var(--text)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              Rated <strong className="ml-1">4.7/5</strong>
            </div>
            <div className="flex items-center justify-start sm:justify-center gap-2 text-sm" style={{ color: "var(--text)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M20 21v-2a4 4 0 0 0-3-3.87M12 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm6-1a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <strong>20+ active</strong> clients
            </div>
            <div className="flex items-center justify-start sm:justify-center gap-2 text-sm" style={{ color: "var(--text)" }}>
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
              color: "var(--text)",
              border: "1px solid var(--border)",
              background: "var(--surface-alt)",
              boxShadow: "0 4px 12px rgba(0,0,0,.06)",
            }}
            whileHover={reduceMotion ? {} : { y: -2 }}
            whileTap={reduceMotion ? {} : { scale: 0.98 }}
          >
            See Work
          </motion.a>
        </div>
      </div>

      {/* Styles: base sparkle anim only (theme handled in index.css) */}
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

      <BeforeAfter
        before={SAMPLE_BEFORE}
        after={SAMPLE_AFTER}
        label="Drag to compare (Before → After)"
        beforeAlt="Original thumbnail"
        afterAlt="Optimized thumbnail"
        width={1280}
        height={720}
      />

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
  const TESTIMONIALS = [
    {
      type: "video",
      name: "Kamz Inkzone",
      tag: "Gaming • 172K",
      avatarKey: "kamz",
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
  const [openFAQ, setOpenFAQ] = React.useState(null);

  const faqs = [
    { question: 'What services does Shinel Studios offer?', answer: 'We specialize in video editing, thumbnail design, SEO & marketing, and comprehensive content strategy to help creators and brands shine online.' },
    { question: 'How long does a typical project take?', answer: 'Simple thumbnails can be delivered within 24–48 hours, while comprehensive video projects may take 1–2 weeks depending on scope.' },
    { question: 'Do you work with small creators or just big brands?', answer: 'We work with creators and brands of all sizes and tailor services to your needs and budget.' },
    { question: "What's included in content strategy?", answer: 'Market research, competitor analysis, content planning, posting schedules, and performance optimization recommendations.' },
    { question: 'How do you ensure quality?', answer: 'Multi-stage QA with client reviews and revisions until you’re fully satisfied.' },
  ];

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

/* ===================== Page Component (conversion-first order) ===================== */
function ShinelStudiosHomepage() {
  const isDark = document.documentElement.classList.contains("dark");
  const [showCalendly, setShowCalendly] = React.useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* SEO first so bots see it immediately */}
      <SeoSchema />

      {/* 1) Hero (core pitch + primary CTA) */}
      <HeroSection isDark={isDark} onAudit={() => setShowCalendly(true)} />

      {/* 2) Desktop sticky quick-quote bar with Calendly (non-intrusive) */}
      <QuickQuoteBar onBook={() => setShowCalendly(true)} />

      {/* 3) Social proof (logos) */}
      <CreatorsWorkedWith isDark={isDark} />

      {/* 4) Proof (Before/After CTR lift) */}
      <ProofSection />

      {/* 5) Services (clear value props) */}
      <ServicesSection />

      {/* 6) Case studies (wins) */}
      <CaseStudies />

      {/* 7) Testimonials (human proof + analytics) */}
      <TestimonialsSection isDark={isDark} />

      {/* 8) Pricing (intent toggles + Calendly CTA) */}
      <Pricing onOpenCalendly={() => setShowCalendly(true)} />

      {/* 8.5) ROI / CTR Lift Calculator (lead magnet → micro-commitment) */}
      <RoiCalculator onBook={() => setShowCalendly(true)} />

      {/* 9) Single lead capture (no duplicate forms) */}
      <QuickLeadForm />

      {/* 10) FAQ (objection handling) */}
      <FAQSection />

      {/* 11) Process (how it works) */}
      <ProcessSection />

      {/* 12) Final CTA (secondary contact paths) */}
      <ContactCTA />

      {/* Utilities / overlays */}
      <StickyMobileCTA onAudit={() => setShowCalendly(true)} />
      <CalendlyModal open={showCalendly} onClose={() => setShowCalendly(false)} />
      <ExitIntentModal pdfUrl="/lead/thumbnail-checklist.pdf" />
    </div>
  );
}

export default ShinelStudiosHomepage;

