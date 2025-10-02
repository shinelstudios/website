/* ===================== OPTIMIZED Imports & Globals ===================== */
import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  X, Play, Image as IconImage, Zap, Wand2, PenTool, Bot, 
  Megaphone, BarChart3, Quote, ExternalLink, MessageCircle, FileText, ChevronUp
} from "lucide-react";

// Lazy load heavy components for better initial performance
import RoiCalculator from "./RoiCalculator";
import ExitIntentModal from "./ExitIntentModal";
import QuickQuoteBar from "./QuickQuoteBar";

/**
 * OPTIMIZED: Asset loading with lazy loading support
 * - Changed eager: false for better initial load time
 * - Assets load on-demand rather than all at once
 */
const ALL_ASSETS = import.meta.glob(
  "../assets/**/*.{png,jpg,jpeg,webp,svg,avif}",
  { eager: false, query: "?url", import: "default" }
);

/* ===================== OPTIMIZED Shared Helpers ===================== */

/**
 * Memoized INR formatter (performance boost)
 * Creates formatter once and reuses it
 */
const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const formatINR = (num, options = {}) => {
  try {
    if (Object.keys(options).length === 0) {
      return INR_FORMATTER.format(Number(num || 0));
    }
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

/**
 * OPTIMIZED: Asset finder with caching
 * Prevents repeated searches for same asset
 */
const assetCache = new Map();

export const findAssetByBase = async (key, map = ALL_ASSETS) => {
  if (!key) return null;
  
  // Check cache first
  if (assetCache.has(key)) {
    return assetCache.get(key);
  }
  
  const search = String(key).toLowerCase();
  for (const path in map) {
    const file = path.split("/").pop() || "";
    const base = file.replace(/\.(png|jpe?g|webp|svg|avif)$/i, "").toLowerCase();
    
    if (base.includes(search)) {
      try {
        const asset = await map[path]();
        const url = typeof asset === 'string' ? asset : asset.default;
        assetCache.set(key, url);
        return url;
      } catch (error) {
        console.warn(`Failed to load asset: ${key}`, error);
        return null;
      }
    }
  }
  return null;
};

/**
 * OPTIMIZED: SVG placeholder with better encoding
 */
export const svgPlaceholder = (label = "Image") => {
  const safe = String(label).replace(/[<>"'&]/g, (char) => {
    const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' };
    return entities[char];
  });
  
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Cdefs%3E%3ClinearGradient id='g'%3E%3Cstop offset='0%25' stop-color='%23FFF1E8'/%3E%3Cstop offset='100%25' stop-color='%23FFE4D6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='800' height='450'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23E85002' font-family='Poppins,sans-serif' font-size='28' font-weight='700'%3E${safe}%3C/text%3E%3C/svg%3E`;
};

/**
 * OPTIMIZED: Analytics with debouncing and batching
 */
let analyticsQueue = [];
let analyticsTimer = null;

const flushAnalytics = () => {
  if (analyticsQueue.length === 0) return;
  
  try {
    window.dispatchEvent(new CustomEvent("analytics:batch", { 
      detail: { events: [...analyticsQueue] } 
    }));
    analyticsQueue = [];
  } catch (error) {
    console.warn("Analytics error:", error);
  }
};

export const track = (ev, detail = {}) => {
  analyticsQueue.push({ 
    ev, 
    ...detail, 
    timestamp: Date.now(),
    url: window.location.pathname 
  });
  
  // Batch analytics events for performance
  if (analyticsTimer) clearTimeout(analyticsTimer);
  analyticsTimer = setTimeout(flushAnalytics, 1000);
};

/* ===================== OPTIMIZED Motion Variants ===================== */

/**
 * Centralized animation variants with reduced motion support
 * Uses shorter durations for better perceived performance
 */
export const animations = {
  fadeDown: { 
    hidden: { opacity: 0, y: -12 }, 
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } } 
  },
  fadeUp: { 
    hidden: { opacity: 0, y: 16 }, 
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } } 
  },
  fadeIn: { 
    hidden: { opacity: 0 }, 
    visible: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" } } 
  },
  staggerParent: { 
    hidden: {}, 
    visible: { transition: { staggerChildren: 0.06 } } 
  },
  scaleIn: { 
    hidden: { opacity: 0, scale: 0.96, y: 8 }, 
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } } 
  },
};

/**
 * OPTIMIZED: Card hover with performance optimizations
 */
export const tiltHover = {
  whileHover: { y: -3, rotateX: 0.6, rotateY: -0.6 },
  transition: { type: "spring", stiffness: 260, damping: 20 }
};

/* ===================== OPTIMIZED Sample Images with Lazy Loading ===================== */

let sampleBeforePromise = null;
let sampleAfterPromise = null;

export const getSampleBefore = async () => {
  if (!sampleBeforePromise) {
    sampleBeforePromise = findAssetByBase("sample_before").then(
      url => url || svgPlaceholder("Before")
    );
  }
  return sampleBeforePromise;
};

export const getSampleAfter = async () => {
  if (!sampleAfterPromise) {
    sampleAfterPromise = findAssetByBase("sample_after").then(
      url => url || svgPlaceholder("After")
    );
  }
  return sampleAfterPromise;
};

// Legacy sync exports (load immediately for backward compatibility)
export const SAMPLE_BEFORE = svgPlaceholder("Before");
export const SAMPLE_AFTER = svgPlaceholder("After");

// Preload actual images in the background
getSampleBefore().then(url => { if (url) SAMPLE_BEFORE = url; });
getSampleAfter().then(url => { if (url) SAMPLE_AFTER = url; });

/* ===================== OPTIMIZED Calendly Modal ===================== */

/**
 * Memoized URL builder to prevent recalculation
 */
const buildCalendlyUrl = () => {
  const base = "https://calendly.com/shinelstudios/15min-audit";
  try {
    const url = new URL(base);
    const utm = JSON.parse(localStorage.getItem("utm") || "{}");
    
    Object.entries(utm).forEach(([k, v]) => {
      if (v && String(v).trim()) url.searchParams.set(k, v);
    });
    
    url.searchParams.set("hide_event_type_details", "1");
    url.searchParams.set("primary_color", "E85002");
    return url.toString();
  } catch (error) {
    console.warn("Calendly URL error:", error);
    return base;
  }
};

/**
 * OPTIMIZED: Calendly Modal with better performance and accessibility
 * - Uses useReducedMotion hook from Framer Motion
 * - Better focus management
 * - Proper cleanup
 */
export const CalendlyModal = memo(({ open, onClose }) => {
  const dialogRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const url = useMemo(buildCalendlyUrl, []); // Stable per mount
  
  // Memoized close handler
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    // Track modal open
    track("modal_open", { type: "calendly" });

    // Focus management
    const el = dialogRef.current;
    if (el) {
      const focusables = el.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) {
        focusables[0]?.focus();
      }
    }

    // Keyboard handlers
    const onKeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    
    document.addEventListener("keydown", onKeydown);

    return () => {
      document.documentElement.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeydown);
      track("modal_close", { type: "calendly" });
    };
  }, [open, handleClose]);

  if (!open) return null;

  const handleOverlayClick = (e) => {
    if (e.currentTarget === e.target) handleClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendly-modal-title"
      onClick={handleOverlayClick}
      initial={shouldReduceMotion ? {} : { opacity: 0 }}
      animate={shouldReduceMotion ? {} : { opacity: 1 }}
      exit={shouldReduceMotion ? {} : { opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        ref={dialogRef}
        className="bg-[var(--surface)] rounded-2xl w-full max-w-3xl overflow-hidden border-2"
        style={{ borderColor: "var(--orange)" }}
        initial={shouldReduceMotion ? {} : { scale: 0.95, y: 20 }}
        animate={shouldReduceMotion ? {} : { scale: 1, y: 0 }}
        exit={shouldReduceMotion ? {} : { scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b" 
          style={{ borderColor: "var(--border)" }}
        >
          <h2 
            id="calendly-modal-title"
            className="font-bold text-lg" 
            style={{ color: "var(--text)" }}
          >
            Free 15-Min Content Audit
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-[var(--surface-alt)] transition-colors"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Iframe */}
        <div className="h-[70vh]">
          <iframe
            title="Schedule consultation with Shinel Studios"
            src={url}
            className="w-full h-full"
            style={{ border: 0 }}
            loading="lazy"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="camera; microphone; fullscreen"
          />
        </div>
      </motion.div>
    </motion.div>
  );
});

CalendlyModal.displayName = "CalendlyModal";

/* ===================== PERFORMANCE UTILITIES ===================== */

/**
 * Custom hook for optimized intersection observer
 */
export const useIntersectionObserver = (ref, options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) {
      setIsIntersecting(true); // Fallback for older browsers
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { rootMargin: '50px', threshold: 0.1, ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, options.rootMargin, options.threshold]);

  return isIntersecting;
};

/**
 * Debounce hook for performance
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

/* ===================== Hero Section (Enhanced) ===================== */
const HeroSection = ({ isDark, onAudit }) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleAudit = () => {
    try {
      window.dispatchEvent(
        new CustomEvent("analytics", { detail: { ev: "cta_click_audit", src: "hero" } })
      );
    } catch (e) {}
    if (onAudit) onAudit();
  };

  const handleSeeWork = (e) => {
    e.preventDefault();
    try {
      window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "see_work", src: "hero" } }));
    } catch (err) {}
    const el = document.querySelector("#work");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const fieldRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (reduceMotion) return;
    let ticking = false;
    const handleMouse = (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setMousePos({
            x: e.clientX / window.innerWidth,
            y: e.clientY / window.innerHeight,
          });
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("mousemove", handleMouse, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [reduceMotion]);

  const starLayers = useMemo(() => {
    if (reduceMotion) return [];
    const w = typeof window !== "undefined" ? window.innerWidth : 1280;
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;

    if (w < 340) return [];
    
    const layers = [];
    const layerConfigs = [
      { count: w < 640 ? 6 : w < 1024 ? 8 : 12, depth: 0.3, size: [6, 9], speed: [3, 4] },
      { count: w < 640 ? 8 : w < 1024 ? 12 : 16, depth: 0.6, size: [8, 12], speed: [2.2, 3.2] },
      { count: w < 640 ? 4 : w < 1024 ? 6 : 10, depth: 1, size: [10, 14], speed: [1.8, 2.8] },
    ];

    layerConfigs.forEach((config, layerIdx) => {
      const count = Math.round(config.count / (dpr > 1.5 ? 1.3 : 1));
      const stars = [];
      
      for (let i = 0; i < count; i++) {
        stars.push({
          top: `${5 + ((i * 17 + layerIdx * 31) % 85)}%`,
          left: `${3 + ((i * 23 + layerIdx * 41) % 94)}%`,
          size: config.size[0] + ((i * 3) % (config.size[1] - config.size[0])),
          delay: (i * 0.45 + layerIdx * 0.8) % 3,
          drift: (i % 2 ? 1 : -1) * (8 + (layerIdx * 2)),
          speed: config.speed[0] + ((i % 5) * (config.speed[1] - config.speed[0]) / 5),
          opacity: 0.5 + ((i % 4) * 0.15),
          depth: config.depth,
        });
      }
      layers.push({ stars, depth: config.depth });
    });
    
    return layers;
  }, [reduceMotion]);

  useEffect(() => {
    if (!fieldRef.current || !("IntersectionObserver" in window)) return;
    const root = fieldRef.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        root.setAttribute("data-animate", entry.isIntersecting ? "1" : "0");
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: [0, 0.2] }
    );
    const section = root.closest("section");
    if (section) io.observe(section);
    return () => io.disconnect();
  }, []);

  const chips = [
    { text: "AI Thumbnails", icon: "🎨", color: "#ff6b6b" },
    { text: "Auto Transcriptions", icon: "📝", color: "#4ecdc4" },
    { text: "Script Drafts", icon: "✍️", color: "#45b7d1" },
    { text: "Voice Generation", icon: "🎙️", color: "#f7b731" },
    { text: "Face Swap (Consent)", icon: "🔄", color: "#5f27cd" },
    { text: "Style Transitions", icon: "✨", color: "#ff9ff3" },
  ];

  return (
    <section
      id="home"
      className="relative overflow-hidden"
      style={{
        padding: "clamp(80px, 9vw, 140px) 0 clamp(50px, 7vw, 100px)",
        background: "var(--hero-bg)",
        contentVisibility: "auto",
        containIntrinsicSize: "900px",
      }}
      aria-label="Shinel Studios introduction"
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: "radial-gradient(ellipse 90% 60% at 30% -10%, color-mix(in oklab, var(--orange) 30%, transparent) 0%, transparent 50%), radial-gradient(ellipse 80% 50% at 70% 110%, color-mix(in oklab, #ff9357 25%, transparent) 0%, transparent 50%)",
          animation: isVisible && !reduceMotion ? 'ss-mesh-morph 12s ease-in-out infinite' : 'none',
          filter: 'blur(60px)',
        }}
        aria-hidden="true"
      />

      {!reduceMotion && (
        <div
          ref={fieldRef}
          className="ss-field pointer-events-none absolute inset-0 z-0"
          data-animate="1"
          aria-hidden="true"
        >
          {starLayers.map((layer, layerIdx) => (
            <div
              key={layerIdx}
              className="absolute inset-0"
              style={{
                transform: `translate3d(${(mousePos.x - 0.5) * layer.depth * 30}px, ${(mousePos.y - 0.5) * layer.depth * 30}px, 0)`,
                transition: 'transform 0.3s ease-out',
              }}
            >
              {layer.stars.map((s, i) => (
                <span
                  key={i}
                  className="ss-sparkle"
                  style={{
                    top: s.top,
                    left: s.left,
                    '--s': `${s.size}px`,
                    '--delay': `${s.delay}s`,
                    '--drift': `${s.drift}px`,
                    '--spd': `${s.speed}s`,
                    opacity: s.opacity,
                    zIndex: Math.floor(s.depth * 10),
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {!reduceMotion && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="ss-shape"
            style={{
              position: 'absolute',
              top: '12%',
              left: '8%',
              width: 'clamp(150px, 22vw, 320px)',
              height: 'clamp(150px, 22vw, 320px)',
              background: 'radial-gradient(circle, color-mix(in oklab, var(--orange) 15%, transparent), transparent 65%)',
              filter: 'blur(50px)',
              borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
              animation: isVisible ? 'ss-morph 18s ease-in-out infinite, ss-float-alt 14s ease-in-out infinite' : 'none',
              willChange: 'transform, border-radius',
            }}
          />
          <div
            className="ss-shape"
            style={{
              position: 'absolute',
              bottom: '8%',
              right: '10%',
              width: 'clamp(120px, 20vw, 280px)',
              height: 'clamp(120px, 20vw, 280px)',
              background: 'radial-gradient(circle, color-mix(in oklab, #ff9357 12%, transparent), transparent 65%)',
              filter: 'blur(55px)',
              borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
              animation: isVisible ? 'ss-morph 20s ease-in-out infinite 3s, ss-float-alt 16s ease-in-out infinite 2s' : 'none',
              willChange: 'transform, border-radius',
            }}
          />
        </div>
      )}

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(var(--text) 1px, transparent 1px), linear-gradient(90deg, var(--text) 1px, transparent 1px)",
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <motion.div
        className="container mx-auto px-4 relative z-[1]"
        initial={reduceMotion ? {} : { opacity: 0 }}
        animate={reduceMotion ? {} : { opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
          style={{
            background: "color-mix(in oklab, var(--surface) 85%, transparent)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(12px)",
            boxShadow: '0 4px 16px rgba(232,80,2,0.1)',
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          whileHover={reduceMotion ? {} : { scale: 1.03, y: -2 }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--orange)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--orange)]"></span>
          </span>
          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
            Now accepting new projects
          </span>
        </motion.div>

        <motion.h1
          className="font-bold tracking-tight hero-title"
          style={{
            fontFamily: 'Poppins, sans-serif',
            color: "var(--text)",
            lineHeight: 1.05,
            letterSpacing: "-.02em",
            fontSize: "clamp(2.2rem, 7vw, 4.8rem)",
            maxWidth: "26ch",
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 25 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span
            className="inline-block gradient-text relative"
            style={{
              backgroundImage: "linear-gradient(135deg, var(--orange) 0%, #ffb36f 45%, #ff9357 100%)",
              backgroundSize: '200% auto',
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: !reduceMotion ? 'ss-gradient-flow 8s ease infinite' : 'none',
            }}
          >
            AI-first
          </span>{" "}
          packaging that boosts CTR.{" "}
          <span className="block md:inline">
            Smart edits that{" "}
            <span className="relative inline-block">
              keep people watching
              <svg
                className="absolute -bottom-1 left-0 w-full"
                height="8"
                viewBox="0 0 200 8"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 6c20-4 40-4 60 0s40 4 60 0 40-4 60 0"
                  stroke="var(--orange)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.5"
                  style={{
                    strokeDasharray: 400,
                    strokeDashoffset: 400,
                    animation: !reduceMotion ? 'ss-draw 1.5s ease-out 0.8s forwards' : 'none',
                  }}
                />
              </svg>
            </span>
          </span>
        </motion.h1>

        <motion.p
          className="mt-4 sm:mt-5"
          style={{
            color: "var(--text-muted)",
            fontSize: "clamp(1.05rem, 2.3vw, 1.3rem)",
            maxWidth: "54ch",
            lineHeight: 1.65,
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Thumbnails, transitions, face-safe swaps, transcripts, script drafts, and voice
          pickups — accelerated by AI, finished by editors.
        </motion.p>

        <motion.div
          className="mt-5 sm:mt-6 flex flex-wrap items-center gap-2.5"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          aria-label="AI capabilities"
        >
          {chips.map((chip, idx) => (
            <motion.span
              key={chip.text}
              className="chip-enhanced group text-xs md:text-sm px-3.5 py-2 rounded-full flex items-center gap-2 cursor-default"
              style={{
                color: "var(--text)",
                border: "1px solid var(--border)",
                background: "color-mix(in oklab, var(--surface) 92%, transparent)",
                backdropFilter: "blur(10px)",
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              }}
              initial={reduceMotion ? {} : { opacity: 0, scale: 0.9 }}
              animate={reduceMotion ? {} : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 + idx * 0.05 }}
              whileHover={
                reduceMotion
                  ? {}
                  : {
                      y: -3,
                      scale: 1.03,
                      boxShadow: `0 6px 20px ${chip.color}25`,
                      borderColor: `${chip.color}40`,
                    }
              }
            >
              <span
                className="chip-icon-wrapper"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: `color-mix(in oklab, ${chip.color} 15%, transparent)`,
                  fontSize: '0.85em',
                }}
              >
                {chip.icon}
              </span>
              {chip.text}
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          className="mt-6 sm:mt-7 rounded-2xl proof-card"
          style={{
            background: "color-mix(in oklab, var(--surface) 96%, transparent)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(12px)",
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={reduceMotion ? {} : { y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
          aria-label="Social proof"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 px-5 py-4">
            <div className="flex items-center justify-start sm:justify-center gap-2.5 text-sm" style={{ color: "var(--text)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z" fill="var(--orange)" stroke="var(--orange)" strokeWidth="1"/>
              </svg>
              Rated <strong className="ml-0.5">4.7/5</strong>
            </div>
            <div className="flex items-center justify-start sm:justify-center gap-2.5 text-sm" style={{ color: "var(--text)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M20 21v-2a4 4 0 0 0-3-3.87M12 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm6-1a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <strong>20+ active clients</strong>
            </div>
            <div className="flex items-center justify-start sm:justify-center gap-2.5 text-sm" style={{ color: "var(--text)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <strong>7M+ views</strong>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="mt-7 sm:mt-8 flex flex-col sm:flex-row sm:items-center gap-3"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <motion.button
            onClick={handleAudit}
            className="cta-primary group relative overflow-hidden w-full sm:w-auto rounded-full px-7 py-3.5 text-white font-semibold text-[15px]"
            style={{
              background: "linear-gradient(135deg, var(--orange) 0%, #ff9357 50%, #ffb36f 100%)",
              backgroundSize: '200% 200%',
              boxShadow: "0 12px 32px rgba(232,80,2,.38), inset 0 0 0 1px rgba(255,255,255,.15)",
              animation: !reduceMotion && isVisible ? 'ss-gradient-move 5s ease infinite' : 'none',
            }}
            whileHover={reduceMotion ? {} : { y: -4, scale: 1.02 }}
            whileTap={reduceMotion ? {} : { scale: 0.97 }}
          >
            <span className="relative flex items-center justify-center gap-2">
              Get Free AI Audit
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </motion.button>

          <motion.a
            href="#work"
            onClick={handleSeeWork}
            className="cta-secondary group w-full sm:w-auto rounded-full px-7 py-3.5 font-semibold text-[15px] text-center flex items-center justify-center gap-2"
            style={{
              color: "var(--text)",
              border: "1.5px solid var(--border)",
              background: "var(--surface-alt)",
              boxShadow: "0 4px 14px rgba(0,0,0,.06)",
            }}
            whileHover={reduceMotion ? {} : { y: -4, scale: 1.02, borderColor: 'var(--orange)' }}
            whileTap={reduceMotion ? {} : { scale: 0.97 }}
          >
            See Work
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.a>
        </motion.div>

        <motion.p
          className="mt-4 text-xs flex items-start gap-2"
          style={{ color: "var(--text-muted)", opacity: 0.95 }}
          initial={reduceMotion ? {} : { opacity: 0 }}
          animate={reduceMotion ? {} : { opacity: 0.95 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 flex-shrink-0">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Face-swap & voice generation are offered only with creator consent and platform-policy compliance.</span>
        </motion.p>
      </motion.div>

      <style>{`
        .hero-title { text-wrap: balance; }
        .ss-field[data-animate="0"] .ss-sparkle { animation-play-state: paused !important; }
        .ss-sparkle {
          position: absolute;
          width: var(--s, 12px);
          height: var(--s, 12px);
          transform: translate3d(0,0,0);
          border-radius: 9999px;
          will-change: transform, opacity;
          background: radial-gradient(circle, var(--orange), rgba(232,80,2,0.3));
          box-shadow: 0 0 12px rgba(232,80,2,0.7);
          animation: ss-twinkle var(--spd,2.6s) ease-in-out infinite var(--delay,0s), ss-drift 9s ease-in-out infinite alternate var(--delay,0s);
        }
        .chip-enhanced { transition: all 0.25s ease; }
        .chip-icon-wrapper { transition: all 0.3s ease; }
        .chip-enhanced:hover .chip-icon-wrapper { transform: scale(1.15) rotate(5deg); }
        .proof-card, .cta-primary, .cta-secondary { transition: all 0.25s ease; }
        @keyframes ss-twinkle {
          0% { opacity: 0; transform: translate3d(0,0,0) scale(.85); }
          20% { opacity: 1; }
          50% { transform: translate3d(var(--drift,8px), -6px, 0) scale(1.05); }
          80% { opacity: .9; }
          100% { opacity: 0; transform: translate3d(0,0,0) scale(.85); }
        }
        @keyframes ss-drift {
          0% { filter: drop-shadow(0 0 4px rgba(232,80,2,0.3)); }
          100% { filter: drop-shadow(0 4px 16px rgba(232,80,2,0.6)); }
        }
        @keyframes ss-morph {
          0%, 100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
          25% { border-radius: 60% 40% 50% 50% / 50% 60% 40% 60%; }
          50% { border-radius: 50% 50% 30% 70% / 60% 40% 60% 40%; }
          75% { border-radius: 70% 30% 40% 60% / 50% 50% 70% 30%; }
        }
        @keyframes ss-float-alt {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(25px, -25px, 0) scale(1.08); }
          66% { transform: translate3d(-20px, 20px, 0) scale(0.92); }
        }
        @keyframes ss-mesh-morph {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.1); }
        }
        @keyframes ss-gradient-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes ss-gradient-move {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes ss-draw {
          to { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
          .ss-sparkle { opacity: .45; }
        }
      `}</style>
    </section>
  );
};


/* ===================== Enhanced Services Section ===================== */
const ServicesSection = () => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [activeService, setActiveService] = useState(null);

  const services = [
    {
      icon: <IconImage size={40} />,
      title: "AI Thumbnail Design",
      outcome: "Boost CTR with concept & layout exploration.",
      proof: "Multivariate iterations • A/B-ready exports",
      gradient: "linear-gradient(135deg, #ff6b6b, #ff8787)",
      features: ["AI-powered concept generation", "A/B testing ready", "Multi-variant exports", "Brand consistency"],
    },
    {
      icon: <Play size={40} />,
      title: "Retention-Led Editing",
      outcome: "Style-matched transitions and pacing that hold attention.",
      proof: "Kamz Inkzone (172k): +38% avg view duration in 30 days",
      gradient: "linear-gradient(135deg, #4ecdc4, #44a8a3)",
      features: ["Smart pacing analysis", "Hook optimization", "Retention graphs", "Style matching"],
    },
    {
      icon: <Zap size={40} />,
      title: "Shorts Production",
      outcome: "Hook-first highlights, auto-captions, meme timing.",
      proof: "Manav: +9.4k subs from Shorts in Q2",
      gradient: "linear-gradient(135deg, #f7b731, #f39c12)",
      features: ["Hook-first structure", "Auto captions", "Platform optimization", "Viral timing"],
    },
    {
      icon: <Wand2 size={40} />,
      title: "Transcriptions & Captions",
      outcome: "Auto transcripts with clean, on-brand subtitles.",
      proof: "Faster edits • Better accessibility • Higher retention",
      gradient: "linear-gradient(135deg, #45b7d1, #3498db)",
      features: ["99% accuracy AI", "Multi-language support", "Brand-matched styling", "SEO optimization"],
    },
    {
      icon: <PenTool size={40} />,
      title: "Script Drafts & Research",
      outcome: "AI outlines + beat sheets → human punch-up.",
      proof: "Hook retention +18% in A/B tests (first 8s)",
      gradient: "linear-gradient(135deg, #5f27cd, #341f97)",
      features: ["Research assistance", "Hook templates", "Beat sheet creation", "Script optimization"],
    },
    {
      icon: <Wand2 size={40} />,
      title: "Face-Safe Swap & Cleanup",
      outcome: "Consent-first face replacement & object removal.",
      proof: "Creator-approved only • Review-gated workflow",
      gradient: "linear-gradient(135deg, #ff9ff3, #f368e0)",
      features: ["Consent verification", "Review workflow", "Quality assurance", "Policy compliant"],
    },
    {
      icon: <Megaphone size={40} />,
      title: "Voice Generation / Cleanup",
      outcome: "Natural voice pickups, noise cleanup, alt takes.",
      proof: "Consent-first cloning • Platform-policy compliant",
      gradient: "linear-gradient(135deg, #ee5a6f, #c44569)",
      features: ["Voice cloning (consent)", "Noise reduction", "Alternative takes", "Natural quality"],
    },
    {
      icon: <Bot size={40} />,
      title: "Workflow Automations & SEO",
      outcome: "Auto-posting, asset handoff, titles, tags, descriptions.",
      proof: "+27% browse/search traffic after metadata revamp",
      gradient: "linear-gradient(135deg, #48dbfb, #0abde3)",
      features: ["Auto-scheduling", "Metadata optimization", "Asset management", "Analytics tracking"],
    },
  ];

  return (
    <section id="services" className="py-20 relative overflow-hidden" style={{ background: "var(--surface-alt)" }}>
      {/* Ambient background effects */}
      {!reduceMotion && (
        <>
          <div
            className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, var(--orange), transparent 70%)",
              animation: "ss-float-slow 20s ease-in-out infinite",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-20 right-10 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, #ff9357, transparent 70%)",
              animation: "ss-float-slow 18s ease-in-out infinite 2s",
            }}
            aria-hidden="true"
          />
        </>
      )}

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Heading */}
        <motion.div
          variants={animations.fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10%" }}
          className="text-center mb-16"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-4"
            style={{
              color: "var(--orange)",
              border: "1px solid var(--border)",
              background: "rgba(232,80,2,0.08)",
              boxShadow: "0 4px 12px rgba(232,80,2,0.1)",
            }}
            whileHover={reduceMotion ? {} : { scale: 1.05, y: -2 }}
          >
            <Zap size={14} />
            AI-first
          </motion.div>

          <h2
            className="text-4xl md:text-5xl font-bold mb-4 font-['Poppins']"
            style={{ color: "var(--text)" }}
          >
            Our Services
          </h2>

          <p className="text-lg md:text-xl max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
            Human editors × AI systems — outcomes over deliverables, built to convert
          </p>

          {/* Stats row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm">
            {[
              { label: "Average CTR Lift", value: "+62%" },
              { label: "Faster Turnaround", value: "48-72h" },
              { label: "Client Retention", value: "94%" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                }}
                initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
                whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <BarChart3 size={16} style={{ color: "var(--orange)" }} />
                <span style={{ color: "var(--text-muted)" }}>{stat.label}:</span>
                <strong style={{ color: "var(--orange)" }}>{stat.value}</strong>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={animations.staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-10%" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {services.map((s, i) => {
            const isActive = activeService === i;
            return (
              <motion.div
                key={i}
                variants={animations.scaleIn}
                className="group relative p-6 rounded-2xl shadow-lg cursor-pointer"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onMouseEnter={() => setActiveService(i)}
                onMouseLeave={() => setActiveService(null)}
                whileHover={
                  reduceMotion
                    ? {}
                    : {
                        y: -8,
                        scale: 1.02,
                        boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                      }
                }
                whileTap={reduceMotion ? {} : { scale: 0.98 }}
              >
                {/* Gradient glow on hover */}
                {!reduceMotion && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none"
                    style={{
                      background: s.gradient,
                      filter: "blur(20px)",
                      zIndex: -1,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isActive ? 0.15 : 0 }}
                    transition={{ duration: 0.3 }}
                    aria-hidden="true"
                  />
                )}

                {/* Icon with animated background */}
                <motion.div
                  className="relative mb-4 w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `color-mix(in oklab, var(--orange) 10%, transparent)`,
                    border: "1px solid color-mix(in oklab, var(--orange) 20%, transparent)",
                  }}
                  animate={
                    isActive && !reduceMotion
                      ? {
                          scale: [1, 1.05, 1],
                          rotate: [0, 5, -5, 0],
                        }
                      : {}
                  }
                  transition={{ duration: 0.6 }}
                >
                  <div style={{ color: "var(--orange)" }}>{s.icon}</div>

                  {/* Pulse effect */}
                  {isActive && !reduceMotion && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        border: "2px solid var(--orange)",
                      }}
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 1.3, opacity: 0 }}
                      transition={{ duration: 1, repeat: Infinity }}
                      aria-hidden="true"
                    />
                  )}
                </motion.div>

                <h3
                  className="text-lg md:text-xl font-bold mb-2 font-['Poppins']"
                  style={{ color: "var(--text)" }}
                >
                  {s.title}
                </h3>

                <p className="mb-3 text-sm md:text-base font-medium" style={{ color: "var(--text)" }}>
                  {s.outcome}
                </p>

                <p className="text-xs md:text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  {s.proof}
                </p>

                {/* Feature pills - show on hover */}
                <motion.div
                  className="space-y-1.5 overflow-hidden"
                  initial={{ height: 0, opacity: 0 }}
                  animate={
                    isActive
                      ? { height: "auto", opacity: 1 }
                      : { height: 0, opacity: 0 }
                  }
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-xs font-semibold mb-2" style={{ color: "var(--orange)" }}>
                    Key Features:
                  </div>
                  {s.features?.map((feature, fi) => (
                    <motion.div
                      key={fi}
                      className="flex items-center gap-2 text-xs"
                      style={{ color: "var(--text-muted)" }}
                      initial={{ x: -10, opacity: 0 }}
                      animate={isActive ? { x: 0, opacity: 1 } : { x: -10, opacity: 0 }}
                      transition={{ delay: fi * 0.05 }}
                    >
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{ background: "var(--orange)" }}
                        aria-hidden="true"
                      />
                      {feature}
                    </motion.div>
                  ))}
                </motion.div>

                {/* Hover indicator */}
                <motion.div
                  className="mt-4 pt-4 border-t flex items-center justify-between text-xs font-semibold"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--orange)",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isActive ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <span>Learn more</span>
                  <motion.svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    animate={isActive && !reduceMotion ? { x: [0, 4, 0] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <path
                      d="M5 12h14M12 5l7 7-7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Enhanced consent note */}
        <motion.div
          className="mt-12 p-4 rounded-xl max-w-3xl mx-auto flex items-start gap-3"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            className="flex-shrink-0 mt-0.5"
            style={{ color: "var(--orange)" }}
          >
            <path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--text)" }}>Privacy & Consent Policy:</strong> Face-swap and
            voice generation are available only with explicit creator consent and in strict
            compliance with platform policies. All AI-assisted features include human review.
          </div>
        </motion.div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes ss-float-slow {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(30px, -30px, 0) scale(1.05); }
          66% { transform: translate3d(-25px, 25px, 0) scale(0.95); }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </section>
  );
};

/* ===================== Enhanced Before/After (keyboard + drag + animations) ===================== */
const BeforeAfter = ({
  before,
  after,
  label = "Thumbnail Revamp",
  beforeAlt = "Before",
  afterAlt = "After",
  width = 1280,
  height = 720,
}) => {
  const [v, setV] = useState(50);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const wrapRef = useRef(null);
  const dragging = useRef(false);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const setFromClientX = (clientX) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setV(clamp(pct, 0, 100));
  };

  // Pointer handlers
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
    const onUp = () => {
      dragging.current = false;
      setIsDragging(false);
    };

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

  // Auto-play demo on first view
  const [hasPlayed, setHasPlayed] = useState(false);
  useEffect(() => {
    if (hasPlayed || reduceMotion) return;
    
    const el = wrapRef.current;
    if (!el || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasPlayed) {
          setHasPlayed(true);
          // Smooth auto-slide demo
          let start = null;
          const duration = 2000;
          const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            if (progress < 1) {
              // Ease in-out
              const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
              setV(50 + (eased * 50 - 25));
              requestAnimationFrame(animate);
            } else {
              setV(50);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [hasPlayed, reduceMotion]);

  return (
    <figure className="w-full max-w-4xl mx-auto" role="group" aria-labelledby="ba-caption">
      <div
        ref={wrapRef}
        className="relative rounded-2xl overflow-hidden border-2 select-none group"
        style={{
          borderColor: isDragging ? "var(--orange)" : "var(--border)",
          boxShadow: isDragging
            ? "0 20px 40px rgba(232,80,2,0.25)"
            : isHovering
            ? "0 12px 30px rgba(0,0,0,0.15)"
            : "0 8px 20px rgba(0,0,0,0.1)",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseDown={(e) => {
          dragging.current = true;
          setIsDragging(true);
          setFromClientX(e.clientX);
        }}
        onTouchStart={(e) => {
          dragging.current = true;
          setIsDragging(true);
          setFromClientX(e.touches[0].clientX);
        }}
      >
        {/* AFTER image (background) */}
        <div className="relative">
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
          
          {/* After label */}
          <motion.div
            className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              backdropFilter: "blur(8px)",
            }}
            initial={reduceMotion ? {} : { opacity: 0, x: 10 }}
            animate={reduceMotion ? {} : { opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            ✨ After
          </motion.div>
        </div>

        {/* BEFORE image (revealed by clipPath) */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 ${100 - v}% 0 0)`,
          }}
        >
          <img
            src={before}
            alt={beforeAlt}
            loading="lazy"
            decoding="async"
            width={width}
            height={height}
            className="w-full block"
            style={{ aspectRatio: `${width} / ${height}` }}
          />
          
          {/* Before label */}
          <motion.div
            className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              backdropFilter: "blur(8px)",
            }}
            initial={reduceMotion ? {} : { opacity: 0, x: -10 }}
            animate={reduceMotion ? {} : { opacity: v > 15 ? 1 : 0, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            📷 Before
          </motion.div>
        </div>

        {/* Enhanced divider line with glow */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: `${v}%`,
            width: 3,
            background: "linear-gradient(to bottom, rgba(232,80,2,0), var(--orange), rgba(232,80,2,0))",
            boxShadow: isDragging
              ? "0 0 20px rgba(232,80,2,0.8), 0 0 40px rgba(232,80,2,0.4)"
              : "0 0 10px rgba(232,80,2,0.5)",
            transition: "box-shadow 0.2s ease",
          }}
          aria-hidden="true"
        />

        {/* Handle with enhanced design */}
        <motion.button
          type="button"
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-12 w-12 rounded-full shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--orange)] z-10"
          style={{
            left: `${v}%`,
            background: "linear-gradient(135deg, var(--orange), #ff9357)",
            color: "#fff",
            border: "3px solid rgba(255,255,255,0.9)",
            cursor: isDragging ? "grabbing" : "grab",
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
          onMouseDown={() => {
            dragging.current = true;
            setIsDragging(true);
          }}
          onTouchStart={() => {
            dragging.current = true;
            setIsDragging(true);
          }}
          whileHover={reduceMotion ? {} : { scale: 1.1 }}
          whileTap={reduceMotion ? {} : { scale: 0.95 }}
          animate={
            !reduceMotion && !isDragging && isHovering
              ? {
                  scale: [1, 1.05, 1],
                }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* Enhanced icon */}
          <div className="flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M13 6l-6 6 6 6M19 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Pulse ring on hover */}
          {!reduceMotion && (isHovering || isDragging) && (
            <motion.div
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: "var(--orange)" }}
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              aria-hidden="true"
            />
          )}
        </motion.button>

        {/* Progress indicator */}
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            backdropFilter: "blur(8px)",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isDragging ? 1 : 0, y: isDragging ? 0 : 10 }}
          transition={{ duration: 0.2 }}
        >
          {Math.round(v)}%
        </motion.div>

        {/* Hint overlay (shows briefly on first view) */}
        {!hasPlayed && !reduceMotion && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(2px)",
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 3, duration: 0.5 }}
          >
            <div
              className="px-4 py-2 rounded-full text-sm font-semibold"
              style={{
                background: "rgba(255,255,255,0.95)",
                color: "var(--text)",
              }}
            >
              👆 Drag to compare
            </div>
          </motion.div>
        )}

        {/* Visually-hidden range input */}
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

      {/* Enhanced caption */}
      <figcaption id="ba-caption" className="text-center mt-4">
        <motion.div
          className="inline-flex flex-col items-center gap-2"
          initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-sm md:text-base font-semibold" style={{ color: "var(--text)" }}>
            {label}
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="hidden sm:inline">
              <span className="font-medium" style={{ color: "var(--text)" }}>Drag</span> the slider or use
            </span>
            <span className="sm:hidden">Use</span>
            <kbd
              className="px-2 py-1 rounded font-mono text-xs"
              style={{
                borderColor: "var(--border)",
                border: "1px solid",
                background: "var(--surface)",
              }}
            >
              ←
            </kbd>
            <span>/</span>
            <kbd
              className="px-2 py-1 rounded font-mono text-xs"
              style={{
                borderColor: "var(--border)",
                border: "1px solid",
                background: "var(--surface)",
              }}
            >
              →
            </kbd>
            <span>to compare</span>
          </div>
        </motion.div>
      </figcaption>
    </figure>
  );
};

/* ===================== Enhanced Proof Section ===================== */
const ProofSection = () => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [countUp, setCountUp] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const sectionRef = useRef(null);

  // Animated counter for CTR percentage
  useEffect(() => {
    if (hasAnimated || reduceMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const end = 62;
          const duration = 2000;
          const startTime = Date.now();

          const animate = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            const current = Math.floor(start + (end - start) * eased);
            
            setCountUp(current);
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated, reduceMotion]);

  const stats = [
    { 
      icon: <BarChart3 size={20} />,
      label: "Average Improvement",
      value: "+62%",
      suffix: "CTR"
    },
    { 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      label: "More Views",
      value: "2.3x",
      suffix: "avg"
    },
    { 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      label: "Faster Results",
      value: "7",
      suffix: "days"
    },
  ];

  return (
    <section 
      id="proof" 
      ref={sectionRef}
      className="py-20 relative overflow-hidden" 
      style={{ background: "var(--surface-alt)" }} 
      aria-labelledby="proof-heading"
    >
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle, var(--text) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      {/* Gradient accents */}
      {!reduceMotion && (
        <>
          <div
            className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, var(--orange), transparent 60%)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, #ff9357, transparent 60%)",
            }}
            aria-hidden="true"
          />
        </>
      )}

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.5 }}
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-5"
            style={{
              color: "var(--orange)",
              border: "1px solid var(--border)",
              background: "rgba(232,80,2,0.08)",
              boxShadow: "0 4px 12px rgba(232,80,2,0.1)",
            }}
            whileHover={reduceMotion ? {} : { scale: 1.05, y: -2 }}
          >
            <IconImage size={14} />
            Real Results
          </motion.div>

          <h2
            id="proof-heading"
            className="text-3xl md:text-5xl font-bold font-['Poppins'] mb-3"
            style={{ color: "var(--text)" }}
          >
            Packaging That Lifts CTR
          </h2>
          <p className="text-base md:text-xl max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
            Real thumbnails revamped for higher clarity, curiosity, and clicks.
          </p>
        </motion.div>

        {/* Before/After Comparison */}
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 30 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <BeforeAfter
            before={SAMPLE_BEFORE}
            after={SAMPLE_AFTER}
            label="Drag to compare (Before → After)"
            beforeAlt="Original thumbnail"
            afterAlt="Optimized thumbnail"
            width={1280}
            height={720}
          />
        </motion.div>

        {/* Animated CTR Badge */}
        <motion.div
          className="mt-8 flex justify-center"
          initial={reduceMotion ? {} : { opacity: 0, scale: 0.9 }}
          whileInView={reduceMotion ? {} : { opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <motion.div
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, var(--orange), #ff9357)",
              boxShadow: "0 10px 30px rgba(232,80,2,0.3)",
            }}
            whileHover={reduceMotion ? {} : { scale: 1.05, y: -2 }}
          >
            <div className="flex items-baseline gap-1">
              <span className="text-3xl md:text-4xl font-bold text-white">
                +{countUp}%
              </span>
              <span className="text-sm text-white/90">CTR</span>
            </div>
            <div className="h-8 w-px bg-white/30" aria-hidden="true" />
            <div className="text-left">
              <div className="text-xs text-white/80">After revamp</div>
              <div className="text-sm font-semibold text-white">Real campaign</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              className="p-5 rounded-xl border"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
              whileHover={reduceMotion ? {} : { y: -4, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div style={{ color: "var(--orange)" }}>
                  {stat.icon}
                </div>
                <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  {stat.label}
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <div className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text)" }}>
                  {stat.value}
                </div>
                <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {stat.suffix}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs"
          style={{ color: "var(--text-muted)" }}
          initial={reduceMotion ? {} : { opacity: 0 }}
          whileInView={reduceMotion ? {} : { opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {[
            "✓ A/B tested designs",
            "✓ Data-backed iterations",
            "✓ Real creator results",
            "✓ 48-72h turnaround"
          ].map((item, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-full"
              style={{
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              {item}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ===================== Enhanced Creators Worked With ===================== */
const CreatorsWorkedWith = ({ isDark }) => {
  const reduceMotion = 
    typeof window !== "undefined" && 
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [isPaused, setIsPaused] = useState(false);
  const [hoveredCreator, setHoveredCreator] = useState(null);

  const LOGOS = import.meta.glob("../assets/creators/*.{png,jpg,jpeg,webp,svg}", { 
    eager: true, 
    query: "?url", 
    import: "default" 
  });
  const SUBS = (typeof window !== "undefined" && window.SS_SUBS) || {};

  const creators = [
    { name: "Kamz Inkzone", key: "kamz", category: "Gaming", color: "#ff6b6b" },
    { name: "Deadlox Gaming", key: "deadlox", category: "Gaming", color: "#4ecdc4" },
    { name: "Kundan Parashar", key: "kundan", category: "Devotional", color: "#f7b731" },
    { name: "Aish is Live", key: "aish", category: "Lifestyle", color: "#45b7d1" },
    { name: "Gamer Mummy", key: "gamermummy", category: "Gaming", color: "#5f27cd" },
    { name: "Gamify Anchit", key: "anchit", category: "Gaming", color: "#ff9ff3" },
    { name: "Maggie Live", key: "maggie", category: "Lifestyle", color: "#ee5a6f" },
    { name: "Crown Ankit", key: "ankit", category: "Gaming", color: "#48dbfb" },
    { name: "Manav Maggie Sukhija", key: "manav", category: "Lifestyle", color: "#ff9357" },
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

  // Calculate total subs
  const totalSubs = creators.reduce((sum, c) => sum + (c.subs || 0), 0);

  return (
    <section className="relative py-24 overflow-hidden" style={{ background: "var(--surface)" }}>
      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Minimal stats badge */}
          <motion.div
            className="inline-flex items-center gap-4 px-6 py-2 rounded-full mb-6"
            style={{
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
            }}
            whileHover={reduceMotion ? {} : { scale: 1.02 }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--orange)" }}
                aria-hidden="true"
              />
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                {creators.length}+ Active Clients
              </span>
            </div>
            <div className="h-3 w-px" style={{ background: "var(--border)" }} aria-hidden="true" />
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" 
                  stroke="var(--orange)" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-sm font-medium" style={{ color: "var(--orange)" }}>
                {fmt(totalSubs)}+ Combined Reach
              </span>
            </div>
          </motion.div>

          <h2 
            className="text-3xl md:text-4xl lg:text-5xl font-bold font-['Poppins'] mb-4"
            style={{ color: "var(--text)" }}
          >
            Trusted by Creators Across Genres
          </h2>
          <p 
            className="text-base md:text-lg max-w-2xl mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            From <strong style={{ color: "var(--text)" }}>Gaming</strong> to{" "}
            <strong style={{ color: "var(--text)" }}>Lifestyle</strong> to{" "}
            <strong style={{ color: "var(--text)" }}>Devotional</strong> — we adapt to your niche
          </p>
        </motion.div>

        {/* Marquee container */}
        <div 
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          role="region"
          aria-label="Creator showcase"
        >
          {/* Cleaner gradient fades */}
          <div 
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-32 md:w-40 z-10"
            style={{ 
              background: `linear-gradient(90deg, var(--surface) 0%, transparent 100%)` 
            }} 
            aria-hidden="true"
          />
          <div 
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-32 md:w-40 z-10"
            style={{ 
              background: `linear-gradient(270deg, var(--surface) 0%, transparent 100%)` 
            }} 
            aria-hidden="true"
          />

          {/* Scrolling list - cleaner design */}
          <ul 
            className={`flex items-center gap-4 whitespace-nowrap py-2 ${
              reduceMotion || isPaused ? "" : "animate-[marq_45s_linear_infinite]"
            }`}
            style={{
              willChange: reduceMotion || isPaused ? "auto" : "transform",
            }}
          >
            {loop.map((c, i) => {
              const isHovered = hoveredCreator === `${c.key}-${i}`;
              return (
                <motion.li 
                  key={`${c.key}-${i}`}
                  className="inline-flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer select-none"
                  style={{ 
                    background: isHovered ? "var(--surface-alt)" : "transparent",
                    border: `1px solid ${isHovered ? "var(--border)" : "transparent"}`,
                    transition: "all 0.25s ease",
                    minWidth: "fit-content"
                  }}
                  onMouseEnter={() => setHoveredCreator(`${c.key}-${i}`)}
                  onMouseLeave={() => setHoveredCreator(null)}
                  whileHover={reduceMotion ? {} : { y: -4 }}
                >
                  {/* Cleaner avatar */}
                  <div className="relative flex-shrink-0">
                    <span className="relative block w-12 h-12 rounded-full overflow-hidden">
                      <img 
                        src={c.url} 
                        alt={`${c.name} logo`} 
                        className="w-full h-full object-cover"
                        style={{ 
                          filter: isHovered ? "grayscale(0)" : "grayscale(0.05)",
                          transition: "filter 0.25s ease",
                        }} 
                        loading="lazy" 
                      />
                    </span>
                    
                    {/* Simple ring on hover */}
                    <span 
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        border: isHovered ? `2px solid ${c.color}` : "2px solid transparent",
                        transition: "border 0.25s ease",
                      }} 
                      aria-hidden="true" 
                    />

                    {/* Minimal verified badge */}
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{
                        background: "var(--orange)",
                        border: "2px solid var(--surface)",
                      }}
                      aria-label="Verified client"
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                        <path 
                          d="M20 6L9 17l-5-5" 
                          stroke="white" 
                          strokeWidth="3" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </div>

                  {/* Cleaner info layout */}
                  <span className="inline-flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {c.name}
                      </span>
                      <span 
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ 
                          background: "var(--surface-alt)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {c.category}
                      </span>
                    </span>

                    {/* Subscriber count */}
                    {fmt(c.subs) && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {fmt(c.subs)} subscribers
                      </span>
                    )}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        </div>

        {/* Minimal pause hint */}
        {!reduceMotion && (
          <motion.p 
            className="text-center mt-8 text-xs"
            style={{ color: "var(--text-muted)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
          >
            Hover to pause
          </motion.p>
        )}
      </div>

      <style>{`
        @keyframes marq { 
          0% { transform: translateX(0); } 
          100% { transform: translateX(-50%); } 
        }
        
        @media (prefers-reduced-motion: reduce) { 
          ul[class*="animate-"] { animation: none !important; }
        }
      `}</style>
    </section>
  );
};


/* ===================== Enhanced Case Studies (metric-first) ===================== */
const CaseStudies = () => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const MEDIA = import.meta.glob("../assets/case_studies/*.{png,jpg,jpeg,webp,avif,mp4,webm}", { 
    eager: true, 
    query: "?url", 
    import: "default" 
  });
  
  const [open, setOpen] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  const items = [
    {
      metric: "+62% CTR",
      metricNum: 62,
      period: "in 6 weeks",
      title: "Packaging revamp for Gaming creator",
      description: "Complete thumbnail redesign with A/B testing framework",
      category: "Thumbnails",
      gradient: "linear-gradient(135deg, #ff6b6b, #ee5a6f)",
      keys: { hook: "cs1_hook", edit: "cs1_edit", thumb: "cs1_thumb" },
      highlights: [
        "15 design iterations tested",
        "Color psychology optimization",
        "Face + emotion focus",
        "Platform-specific formats"
      ],
    },
    {
      metric: "+38% retention",
      metricNum: 38,
      period: "in 4 weeks",
      title: "Hook-first shorts strategy",
      description: "Restructured content opening for immediate engagement",
      category: "Editing",
      gradient: "linear-gradient(135deg, #4ecdc4, #45b7d1)",
      keys: { hook: "cs2_hook", edit: "cs2_edit", thumb: "cs2_thumb" },
      highlights: [
        "First 3s hook optimization",
        "Pattern interrupt technique",
        "Pacing analysis",
        "Music sync timing"
      ],
    },
    {
      metric: "3.1x views",
      metricNum: 210,
      period: "in 8 weeks",
      title: "Title/Thumb alignment & cadence",
      description: "Systematic content strategy with consistent posting schedule",
      category: "Strategy",
      gradient: "linear-gradient(135deg, #f7b731, #f39c12)",
      keys: { hook: "cs3_hook", edit: "cs3_edit", thumb: "cs3_thumb" },
      highlights: [
        "Title-thumbnail consistency",
        "Upload schedule optimization",
        "SEO keyword integration",
        "Cross-platform distribution"
      ],
    },
  ].map((it) => {
    const hook = findAssetByBase(it.keys.hook, MEDIA);
    const edit = findAssetByBase(it.keys.edit, MEDIA);
    const thumb = findAssetByBase(it.keys.thumb, MEDIA);
    return { ...it, media: { hook, edit, thumb } };
  });

  return (
    <section id="work" className="py-20 relative overflow-hidden" style={{ background: "var(--surface)" }}>
      {/* Background decoration */}
      {!reduceMotion && (
        <>
          <div
            className="absolute top-20 right-10 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, var(--orange), transparent 60%)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-20 left-10 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, #ff9357, transparent 60%)",
            }}
            aria-hidden="true"
          />
        </>
      )}

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-4"
            style={{
              color: "var(--orange)",
              border: "1px solid var(--border)",
              background: "rgba(232,80,2,0.08)",
              boxShadow: "0 4px 12px rgba(232,80,2,0.1)",
            }}
            whileHover={reduceMotion ? {} : { scale: 1.05, y: -2 }}
          >
            <BarChart3 size={14} />
            Case Studies
          </motion.div>

          <h2 
            className="text-3xl md:text-5xl font-bold font-['Poppins'] mb-3"
            style={{ color: "var(--text)" }}
          >
            Recent Wins
          </h2>
          <p 
            className="text-base md:text-lg max-w-2xl mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            Outcome first. Click any card to see the complete breakdown.
          </p>
        </motion.div>

        {/* Case study cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {items.map((it, i) => {
            const isHovered = hoveredCard === i;
            return (
              <motion.article
                key={i}
                className="group relative rounded-2xl border overflow-hidden cursor-pointer"
                style={{ 
                  background: "var(--surface-alt)", 
                  borderColor: isHovered ? "var(--orange)" : "var(--border)",
                  boxShadow: isHovered 
                    ? "0 20px 40px rgba(232,80,2,0.15)" 
                    : "0 8px 20px rgba(0,0,0,.08)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
                whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={reduceMotion ? {} : { y: -8 }}
                onClick={() => setOpen(i)}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Thumbnail */}
                <div className="aspect-[16/9] relative overflow-hidden">
                  {it.media.thumb ? (
                    <motion.img 
                      src={it.media.thumb} 
                      alt={it.title}
                      className="absolute inset-0 w-full h-full object-cover" 
                      loading="lazy"
                      whileHover={reduceMotion ? {} : { scale: 1.05 }}
                      transition={{ duration: 0.4 }}
                    />
                  ) : (
                    <div 
                      className="absolute inset-0" 
                      style={{ background: "linear-gradient(135deg, #2c3e50, #34495e)" }} 
                    />
                  )}
                  
                  {/* Gradient overlay */}
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)",
                    }}
                    aria-hidden="true"
                  />

                  {/* Metric badge */}
                  <motion.div 
                    className="absolute top-3 left-3 rounded-full text-xs font-bold px-3 py-1.5"
                    style={{ 
                      background: "rgba(0,0,0,.75)", 
                      color: "#fff",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,.2)",
                    }}
                    whileHover={reduceMotion ? {} : { scale: 1.05 }}
                  >
                    {it.metric} <span style={{ opacity: 0.7 }}>({it.period})</span>
                  </motion.div>

                  {/* Category pill */}
                  <div
                    className="absolute top-3 right-3 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: it.gradient,
                      color: "#fff",
                    }}
                  >
                    {it.category}
                  </div>

                  {/* Play icon overlay */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{
                        background: "rgba(232,80,2,0.9)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </motion.div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 
                    className="text-lg font-bold mb-2 font-['Poppins']"
                    style={{ color: "var(--text)" }}
                  >
                    {it.title}
                  </h3>

                  <p 
                    className="text-sm mb-3"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {it.description}
                  </p>

                  {/* Deliverables */}
                  <div className="flex items-center gap-2 text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                    <span className="font-medium" style={{ color: "var(--text)" }}>Delivered:</span>
                    <span>Hook • Edit • Thumbnail</span>
                  </div>

                  {/* View details CTA */}
                  <motion.div
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: "var(--orange)" }}
                    animate={isHovered && !reduceMotion ? { x: [0, 4, 0] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    View breakdown
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path 
                        d="M5 12h14M12 5l7 7-7 7" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                </div>

                {/* Hover gradient accent */}
                {!reduceMotion && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
                    style={{
                      background: it.gradient,
                      mixBlendMode: "overlay",
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 0.1 : 0 }}
                    transition={{ duration: 0.3 }}
                    aria-hidden="true"
                  />
                )}
              </motion.article>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {open != null && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center p-4"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setOpen(null)}
          >
            <motion.div
              className="w-full max-w-4xl rounded-2xl overflow-hidden border-2"
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }}
              style={{ 
                background: "var(--surface)", 
                borderColor: "var(--orange)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div 
                className="p-6 border-b relative"
                style={{ 
                  borderColor: "var(--border)",
                  background: items[open].gradient,
                }}
              >
                <div className="text-xl font-bold text-white mb-1">
                  {items[open].title}
                </div>
                <div className="text-sm text-white/90 mb-3">
                  {items[open].description}
                </div>
                <div className="flex items-center gap-4 text-white/90">
                  <span className="text-2xl font-bold">{items[open].metric}</span>
                  <span className="text-sm">{items[open].period}</span>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setOpen(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} color="white" />
                </button>
              </div>

              {/* Media grid */}
              <div className="grid grid-cols-1 md:grid-cols-3">
                {["hook", "edit", "thumb"].map((k, idx) => {
                  const src = items[open].media[k];
                  return (
                    <div 
                      key={k} 
                      className="aspect-[4/3] relative border-r md:last:border-r-0 group"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {src ? (
                        <img 
                          src={src} 
                          alt={`${k} preview`}
                          className="absolute inset-0 w-full h-full object-cover" 
                        />
                      ) : (
                        <div 
                          className="absolute inset-0" 
                          style={{ background: "linear-gradient(135deg, #2c3e50, #34495e)" }} 
                        />
                      )}
                      
                      {/* Label */}
                      <div 
                        className="absolute bottom-3 left-3 text-xs font-semibold px-3 py-1.5 rounded-full capitalize"
                        style={{ 
                          background: "rgba(0,0,0,.75)", 
                          color: "#fff",
                          backdropFilter: "blur(8px)",
                          border: "1px solid rgba(255,255,255,.2)",
                        }}
                      >
                        {k}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Details */}
              <div className="p-6 bg-[var(--surface-alt)]">
                <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>
                  Key Optimizations:
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items[open].highlights?.map((h, idx) => (
                    <li 
                      key={idx}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span 
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: "var(--orange)" }}
                        aria-hidden="true"
                      />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer */}
              <div className="p-4 border-t flex justify-end" style={{ borderColor: "var(--border)" }}>
                <button 
                  className="px-5 py-2.5 rounded-xl font-semibold transition-all"
                  style={{ 
                    color: "var(--text)", 
                    border: "1px solid var(--border)", 
                    background: "var(--surface-alt)",
                  }}
                  onClick={() => setOpen(null)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};


/* ===================== Enhanced Process Section (AI-first) ===================== */
const ProcessSection = () => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [activeStep, setActiveStep] = useState(null);

  const steps = [
    {
      n: 1,
      title: "Discovery Call (15–20 min)",
      desc: "Rapid channel audit, goals, constraints, and assets. We align on north-star metrics (CTR, Retention, Subs/Upload) and success criteria.",
      icon: <MessageCircle size={24} />,
      gradient: "linear-gradient(135deg, #ff6b6b, #ee5a6f)",
      deliverables: [
        "Channel audit report",
        "Success metrics defined",
        "Asset inventory",
        "Timeline roadmap"
      ],
    },
    {
      n: 2,
      title: "AI Setup & Guardrails (1–2 days)",
      desc: "Brand kit, motion/pacing presets, auto-transcriptions, metadata assistant, and thumbnail ideation loops. Consent-first voice/face features with review gates.",
      icon: <Bot size={24} />,
      gradient: "linear-gradient(135deg, #4ecdc4, #45b7d1)",
      deliverables: [
        "Brand style guide",
        "AI workflow setup",
        "Consent documentation",
        "Quality review gates"
      ],
    },
    {
      n: 3,
      title: "Pilot Sprint (7–10 days)",
      desc: "2–3 edited videos + thumbnails/shorts. Hook testing, clean cuts, captioning. Structured A/B for title/thumbnail. 48–72 hr standard turnaround.",
      icon: <Zap size={24} />,
      gradient: "linear-gradient(135deg, #f7b731, #f39c12)",
      deliverables: [
        "2-3 full edits delivered",
        "A/B thumbnail variants",
        "Hook performance data",
        "Feedback integration"
      ],
    },
    {
      n: 4,
      title: "Measure → Systemize",
      desc: "CTR/retention dashboard, weekly iteration loop, and workflow automations (handoff, posts, assets). Scale what wins; sunset what doesn't.",
      icon: <BarChart3 size={24} />,
      gradient: "linear-gradient(135deg, #5f27cd, #341f97)",
      deliverables: [
        "Analytics dashboard",
        "Automated workflows",
        "Weekly optimization",
        "Continuous improvement"
      ],
    },
  ];

  return (
    <section className="py-20 relative overflow-hidden" style={{ background: "var(--surface)" }}>
      {/* Background elements */}
      {!reduceMotion && (
        <>
          <div
            className="absolute top-1/4 left-10 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, var(--orange), transparent 60%)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-1/4 right-10 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle, #ff9357, transparent 60%)",
            }}
            aria-hidden="true"
          />
        </>
      )}

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-4"
            style={{
              color: "var(--orange)",
              border: "1px solid var(--border)",
              background: "rgba(232,80,2,0.08)",
              boxShadow: "0 4px 12px rgba(232,80,2,0.1)",
            }}
            whileHover={reduceMotion ? {} : { scale: 1.05, y: -2 }}
          >
            <Wand2 size={14} />
            AI-first Workflow
          </motion.div>

          <h2
            className="text-4xl md:text-5xl font-bold font-['Poppins'] mb-3"
            style={{ color: "var(--text)" }}
          >
            How We Work
          </h2>
          <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
            A simple path to results — human craft × AI speed, no fluff.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((s, idx) => {
            const isActive = activeStep === idx;
            return (
              <motion.div
                key={s.n}
                initial={reduceMotion ? {} : { opacity: 0, y: 30 }}
                whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative p-6 rounded-2xl cursor-pointer"
                style={{
                  background: "var(--surface-alt)",
                  border: `2px solid ${isActive ? "var(--orange)" : "var(--border)"}`,
                  boxShadow: isActive 
                    ? "0 12px 30px rgba(232,80,2,0.2)" 
                    : "0 4px 12px rgba(0,0,0,0.05)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onMouseEnter={() => setActiveStep(idx)}
                onMouseLeave={() => setActiveStep(null)}
                whileHover={reduceMotion ? {} : { y: -8 }}
              >
                {/* Gradient background on hover */}
                {!reduceMotion && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl opacity-0 pointer-events-none"
                    style={{
                      background: s.gradient,
                      filter: "blur(20px)",
                      zIndex: -1,
                    }}
                    animate={{ opacity: isActive ? 0.15 : 0 }}
                    transition={{ duration: 0.3 }}
                    aria-hidden="true"
                  />
                )}

                {/* Number badge with icon */}
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold relative overflow-hidden"
                    style={{ 
                      background: s.gradient,
                      color: "#fff",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                    animate={
                      isActive && !reduceMotion
                        ? {
                            scale: [1, 1.05, 1],
                            rotate: [0, 5, -5, 0],
                          }
                        : {}
                    }
                    transition={{ duration: 0.6 }}
                  >
                    <span className="relative z-10">{s.n}</span>
                    
                    {/* Pulse effect */}
                    {isActive && !reduceMotion && (
                      <motion.div
                        className="absolute inset-0"
                        style={{ background: "rgba(255,255,255,0.3)" }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 1, repeat: Infinity }}
                        aria-hidden="true"
                      />
                    )}
                  </motion.div>

                  <div 
                    className="p-2 rounded-lg"
                    style={{ 
                      background: `color-mix(in oklab, var(--orange) 10%, transparent)`,
                      color: "var(--orange)",
                    }}
                  >
                    {s.icon}
                  </div>
                </div>

                {/* Title */}
                <h3
                  className="text-lg md:text-xl font-semibold mb-2 font-['Poppins']"
                  style={{ color: "var(--text)" }}
                >
                  {s.title}
                </h3>

                {/* Description */}
                <p 
                  className="text-sm mb-4 leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s.desc}
                </p>

                {/* Deliverables - expand on hover */}
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={
                    isActive
                      ? { height: "auto", opacity: 1 }
                      : { height: 0, opacity: 0 }
                  }
                  transition={{ duration: 0.3 }}
                  style={{ overflow: "hidden" }}
                >
                  <div 
                    className="pt-4 mt-4 border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div 
                      className="text-xs font-semibold mb-2"
                      style={{ color: "var(--orange)" }}
                    >
                      Deliverables:
                    </div>
                    <ul className="space-y-1.5">
                      {s.deliverables.map((d, di) => (
                        <motion.li
                          key={di}
                          className="flex items-center gap-2 text-xs"
                          style={{ color: "var(--text-muted)" }}
                          initial={{ x: -10, opacity: 0 }}
                          animate={
                            isActive 
                              ? { x: 0, opacity: 1 } 
                              : { x: -10, opacity: 0 }
                          }
                          transition={{ delay: di * 0.05 }}
                        >
                          <svg 
                            width="12" 
                            height="12" 
                            viewBox="0 0 24 24" 
                            fill="none"
                          >
                            <path 
                              d="M20 6L9 17l-5-5" 
                              stroke="var(--orange)" 
                              strokeWidth="2.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />
                          </svg>
                          {d}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </motion.div>

                {/* Arrow indicator */}
                {idx < steps.length - 1 && (
                  <div 
                    className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20"
                    aria-hidden="true"
                  >
                    <svg 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none"
                      style={{ color: "var(--orange)" }}
                    >
                      <path 
                        d="M5 12h14M12 5l7 7-7 7" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Timeline visual */}
        <motion.div
          className="max-w-3xl mx-auto mb-12"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div 
              className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2"
              style={{ 
                background: "var(--border)",
              }}
              aria-hidden="true"
            >
              <motion.div
                className="h-full"
                style={{ 
                  background: "linear-gradient(90deg, var(--orange), #ff9357)",
                }}
                initial={{ width: "0%" }}
                whileInView={{ width: "100%" }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </div>

            {/* Time markers */}
            {["Day 1", "Day 2", "Day 10", "Ongoing"].map((time, i) => (
              <div 
                key={i}
                className="relative z-10 text-center"
              >
                <div 
                  className="w-3 h-3 rounded-full mx-auto mb-2"
                  style={{ 
                    background: "var(--orange)",
                    boxShadow: "0 0 0 4px var(--surface)",
                  }}
                />
                <div 
                  className="text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {time}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Enhanced consent notice */}
        <motion.div
          className="max-w-3xl mx-auto p-5 rounded-xl flex items-start gap-3"
          style={{
            background: "var(--surface-alt)",
            border: "1px solid var(--border)",
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            className="flex-shrink-0 mt-0.5"
            style={{ color: "var(--orange)" }}
          >
            <path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--text)" }}>Privacy & Consent:</strong> Voice generation and
            face-swap are available only with explicit creator consent and in strict compliance with
            platform policies. All AI features include human review gates.
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* ===================== Enhanced Testimonials (Video + Analytics, AI-first) ===================== */
const TestimonialsSection = ({ isDark }) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const TESTIMONIALS = [
    {
      type: "video",
      name: "Kamz Inkzone",
      tag: "Gaming • 172K",
      avatarKey: "kamz",
      video: "/assets/testimonials/kamz-45s.mp4",
      poster: "/assets/testimonials/kamz-thumb.jpg",
      quote: "These edits + motion graphics made my content feel premium. Retention lifted immediately.",
      metrics: [{ label: "Avg View Dur.", value: "+38%" }],
      ai: ["AI captions", "Motion presets"],
      color: "#ff6b6b",
    },
    {
      type: "analytics",
      name: "Aish is Live",
      tag: "Streamer • 13K",
      avatarKey: "aish",
      image: "/assets/testimonials/aish-ctr.png",
      alt: "YouTube Studio CTR uplift graph for Aish is Live",
      quote: "Thumbnail iterations increased CTR consistently over three uploads.",
      metrics: [{ label: "CTR", value: "3.1% → 5.0%" }],
      cta: { label: "See case", href: "/work/aish" },
      ai: ["Thumb ideation (AI)", "Title scoring"],
      color: "#4ecdc4",
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
      ai: ["Style-matched GFX", "Auto transcript"],
      color: "#f7b731",
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
      ai: ["Hook scoring", "Auto captions"],
      color: "#5f27cd",
    },
  ];

  const getAvatar = (key) => findAssetByBase(key);

  const [openVideo, setOpenVideo] = useState(null);
  const [tab, setTab] = useState("all");

  const items = useMemo(
    () => tab === "all" ? TESTIMONIALS : TESTIMONIALS.filter((t) => t.type === tab),
    [tab]
  );

  const AIPill = ({ children }) => (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border"
      style={{
        color: "var(--text)",
        borderColor: "var(--border)",
        background: "rgba(232,80,2,0.08)",
      }}
    >
      <Wand2 size={12} />
      {children}
    </span>
  );

  const MetricPill = ({ label, value, color }) => (
    <span
      className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border"
      style={{
        color: "var(--text)",
        borderColor: color ? `${color}40` : "var(--border)",
        background: color ? `${color}15` : "color-mix(in oklab, var(--orange) 8%, transparent)",
      }}
      aria-label={`${label}: ${value}`}
    >
      <BarChart3 size={14} style={{ color: color || "var(--orange)" }} />
      <strong>{label}</strong> {value}
    </span>
  );

  const HeaderRow = ({ name, tag, avatarKey, color }) => {
    const avatar = getAvatar(avatarKey);
    const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

    return (
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="w-12 h-12 rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white"
              style={{ background: color || "var(--orange)" }}
              aria-hidden="true"
            >
              {initials}
            </div>
          )}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: `inset 0 0 0 2px ${color || "var(--orange)"}40`,
            }}
            aria-hidden="true"
          />
        </div>
        <div>
          <div className="font-semibold" style={{ color: "var(--text)" }}>
            {name}
          </div>
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            {tag}
          </div>
        </div>
      </div>
    );
  };

  const VideoCard = ({ item, i }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <motion.article
        initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
        whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.5, delay: (i % 4) * 0.1 }}
        className="group rounded-2xl overflow-hidden border"
        style={{
          background: "var(--surface)",
          borderColor: isHovered ? item.color : "var(--border)",
          boxShadow: isHovered
            ? `0 12px 30px ${item.color}25`
            : "0 4px 12px rgba(0,0,0,.06)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={reduceMotion ? {} : { y: -6 }}
      >
        <button
          type="button"
          onClick={() => setOpenVideo(item)}
          className="relative w-full aspect-video"
          aria-label={`Play testimonial from ${item.name}`}
        >
          <img
            src={item.poster}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          {/* Play button */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: isHovered ? 1 : 0.8 }}
          >
            <motion.div
              className="flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-md shadow-lg"
              style={{
                background: isHovered ? item.color : "rgba(255,255,255,0.9)",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play size={18} style={{ color: isHovered ? "#fff" : "#000" }} />
              <span
                className="text-sm font-semibold"
                style={{ color: isHovered ? "#fff" : "#000" }}
              >
                Play
              </span>
            </motion.div>
          </motion.div>

          {/* Video duration badge */}
          <div
            className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-semibold"
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
            }}
          >
            0:45
          </div>
        </button>

        <div className="p-5">
          <HeaderRow name={item.name} tag={item.tag} avatarKey={item.avatarKey} color={item.color} />
          
          <div className="flex items-start gap-2 mb-3">
            <Quote size={18} className="flex-shrink-0 mt-0.5" style={{ color: item.color, opacity: 0.6 }} />
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {item.quote}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {item.metrics?.map((m, idx) => (
              <MetricPill key={idx} {...m} color={item.color} />
            ))}
          </div>

          {Array.isArray(item.ai) && item.ai.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.ai.slice(0, 3).map((t, idx) => (
                <AIPill key={idx}>{t}</AIPill>
              ))}
            </div>
          )}
        </div>
      </motion.article>
    );
  };

  const AnalyticsCard = ({ item, i }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <motion.article
        initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
        whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.5, delay: (i % 4) * 0.1 }}
        className="rounded-2xl overflow-hidden border"
        style={{
          background: "var(--surface)",
          borderColor: isHovered ? item.color : "var(--border)",
          boxShadow: isHovered
            ? `0 12px 30px ${item.color}25`
            : "0 4px 12px rgba(0,0,0,.06)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={reduceMotion ? {} : { y: -6 }}
      >
        <div className="relative w-full aspect-[16/10] bg-black overflow-hidden">
          <motion.img
            src={item.image}
            alt={item.alt}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            whileHover={reduceMotion ? {} : { scale: 1.05 }}
            transition={{ duration: 0.4 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          
          {/* Metric overlay */}
          <div className="absolute top-3 left-3">
            {item.metrics?.slice(0, 1).map((m, idx) => (
              <MetricPill key={idx} {...m} color={item.color} />
            ))}
          </div>

          {/* Analytics badge */}
          <div
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              background: item.color,
              color: "#fff",
            }}
          >
            📊 Real Data
          </div>
        </div>

        <div className="p-5">
          <HeaderRow name={item.name} tag={item.tag} avatarKey={item.avatarKey} color={item.color} />
          
          <div className="flex items-start gap-2 mb-3">
            <Quote size={18} className="flex-shrink-0 mt-0.5" style={{ color: item.color, opacity: 0.6 }} />
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {item.quote}
            </p>
          </div>

          {item.cta && (
            <motion.a
              href={item.cta.href}
              className="inline-flex items-center gap-2 text-sm font-semibold mb-3"
              style={{ color: item.color }}
              whileHover={{ x: 4 }}
            >
              {item.cta.label}
              <ExternalLink size={14} />
            </motion.a>
          )}

          {Array.isArray(item.ai) && item.ai.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.ai.slice(0, 3).map((t, idx) => (
                <AIPill key={idx}>{t}</AIPill>
              ))}
            </div>
          )}
        </div>
      </motion.article>
    );
  };

  return (
    <section
      id="testimonials"
      className="py-24 relative overflow-hidden"
      style={{
        background: "var(--surface-alt)",
        contentVisibility: "auto",
        containIntrinsicSize: "900px",
      }}
    >
      {/* Background decoration */}
      {!reduceMotion && (
        <div
          className="absolute top-20 right-20 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, var(--orange), transparent 60%)",
          }}
          aria-hidden="true"
        />
      )}

      <div className="container mx-auto px-4 relative z-10">
        {/* Heading */}
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-4"
            style={{
              color: "var(--orange)",
              border: "1px solid var(--border)",
              background: "rgba(232,80,2,0.08)",
              boxShadow: "0 4px 12px rgba(232,80,2,0.1)",
            }}
            whileHover={reduceMotion ? {} : { scale: 1.05, y: -2 }}
          >
            <Quote size={14} />
            AI-assisted, human-directed results
          </motion.div>

          <h2
            className="text-4xl md:text-5xl font-bold font-['Poppins'] mb-3"
            style={{ color: "var(--text)" }}
          >
            Proof it works
          </h2>
          <p
            className="text-base md:text-lg max-w-2xl mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            Quick 30–45s reels from creators, plus real screenshots from YouTube Studio
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[
            { k: "all", label: "All", count: TESTIMONIALS.length },
            { k: "video", label: "Videos", count: TESTIMONIALS.filter(t => t.type === "video").length },
            { k: "analytics", label: "Analytics", count: TESTIMONIALS.filter(t => t.type === "analytics").length },
          ].map((t) => (
            <motion.button
              key={t.k}
              onClick={() => setTab(t.k)}
              className="rounded-full px-4 py-2.5 text-sm font-semibold border flex items-center gap-2"
              style={{
                color: "var(--text)",
                borderColor: tab === t.k ? "var(--orange)" : "var(--border)",
                background: tab === t.k ? "rgba(232,80,2,0.14)" : "var(--surface)",
                boxShadow: tab === t.k ? "0 4px 12px rgba(232,80,2,0.15)" : "none",
              }}
              aria-pressed={tab === t.k}
              whileHover={reduceMotion ? {} : { y: -2 }}
              whileTap={reduceMotion ? {} : { scale: 0.98 }}
            >
              {t.label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background: tab === t.k ? "var(--orange)" : "var(--border)",
                  color: tab === t.k ? "#fff" : "var(--text-muted)",
                }}
              >
                {t.count}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((t, i) =>
            t.type === "video" ? (
              <VideoCard key={i} item={t} i={i} />
            ) : (
              <AnalyticsCard key={i} item={t} i={i} />
            )
          )}
        </div>
      </div>

      {/* Modal Player */}
      <AnimatePresence>
        {openVideo && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Testimonial from ${openVideo.name}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
              onClick={() => setOpenVideo(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            
            <motion.div
              className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: "var(--surface)",
                border: `2px solid ${openVideo.color}`,
              }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <button
                className="absolute top-4 right-4 z-10 p-2 rounded-full"
                style={{ background: "rgba(0,0,0,0.75)" }}
                aria-label="Close video"
                onClick={() => setOpenVideo(null)}
              >
                <X size={20} color="#fff" />
              </button>

              <div className="relative w-full aspect-video">
                <video
                  src={openVideo.video}
                  poster={openVideo.poster}
                  className="absolute inset-0 w-full h-full"
                  autoPlay={!reduceMotion}
                  muted
                  playsInline
                  controls
                />
              </div>

              <div className="p-6 bg-[var(--surface-alt)]">
                <HeaderRow
                  name={openVideo.name}
                  tag={openVideo.tag}
                  avatarKey={openVideo.avatarKey}
                  color={openVideo.color}
                />
                <div className="flex flex-wrap gap-2 mb-3">
                  {openVideo.metrics?.map((m, idx) => (
                    <MetricPill key={idx} {...m} color={openVideo.color} />
                  ))}
                </div>

                {Array.isArray(openVideo.ai) && openVideo.ai.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {openVideo.ai.map((t, idx) => (
                      <AIPill key={idx}>{t}</AIPill>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p
        className="text-center text-xs mt-10"
        style={{ color: "var(--text-muted)" }}
        aria-live="polite"
      >
        AI features (voice/face) are used only with creator consent and in line with platform policies.
      </p>
    </section>
  );
};

/* ===================== Enhanced FAQ Section ===================== */
const FAQSection = () => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [openFAQ, setOpenFAQ] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [
    {
      question: 'What video editing services does Shinel Studios offer?',
      answer: 'Shinel Studios specializes in professional video editing, AI-powered thumbnail design, YouTube SEO optimization, and data-driven content strategy for creators and brands. We help gaming channels, lifestyle vloggers, and educational content creators grow their audience.',
      category: 'Services',
      icon: <IconImage size={20} />,
    },
    {
      question: 'How long does video editing take?',
      answer: 'Our video editing turnaround time is 24-48 hours for thumbnail design, 48-72 hours for short-form content (YouTube Shorts, Instagram Reels), and 5-10 days for long-form video projects. Rush delivery is available for urgent projects.',
      category: 'Timeline',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      question: 'Do you work with small YouTube channels?',
      answer: 'Yes! We work with YouTube creators of all sizes - from new channels under 1K subscribers to established creators with 100K+ subscribers. Our pricing packages are flexible and designed to fit different budgets and growth stages.',
      category: 'Pricing',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      question: "What's included in YouTube content strategy?",
      answer: 'Our YouTube content strategy includes keyword research, competitor analysis, content calendar planning, optimal posting schedules, thumbnail A/B testing, and performance analytics. We focus on improving CTR (click-through rate), watch time, and subscriber growth.',
      category: 'Services',
      icon: <BarChart3 size={20} />,
    },
    {
      question: 'How do you ensure video editing quality?',
      answer: "Our quality assurance process includes multiple review stages with client feedback loops. Every project includes 1 major revision and 2 minor revisions to ensure you're completely satisfied with the final video.",
      category: 'Process',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      question: 'What AI tools do you use for video editing?',
      answer: 'We use AI for automatic transcription, thumbnail concept generation, title optimization, and retention analytics. All AI-generated content receives human review and editing to ensure quality, brand consistency, and platform compliance.',
      category: 'AI Features',
      icon: <Bot size={20} />,
    },
    {
      question: 'Do you offer video editing revisions?',
      answer: "Yes! Every video editing package includes 1 major revision and 2 minor revision rounds per video to ensure you're completely satisfied. Additional revisions are available at standard hourly rates.",
      category: 'Process',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      question: 'What payment methods do you accept for video editing services?',
      answer: 'We accept Indian bank transfers (NEFT/RTGS/IMPS), UPI payments, credit/debit cards, and international wire transfers. Payment terms are flexible - 50% upfront for new clients, with monthly retainers available for ongoing projects.',
      category: 'Pricing',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M1 10h22" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
    },
  ];

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const query = searchQuery.toLowerCase();
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const toggleFAQ = (idx) => setOpenFAQ((cur) => (cur === idx ? null : idx));

  const categories = [...new Set(faqs.map((f) => f.category))];

  return (
    <section className="py-20 relative overflow-hidden" style={{ background: 'var(--surface)' }} itemScope itemType="https://schema.org/FAQPage">
      {/* JSON-LD Schema for SEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map((faq) => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer
            }
          }))
        })}
      </script>
      {/* Background decoration */}
      {!reduceMotion && (
        <div
          className="absolute bottom-20 left-20 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, var(--orange), transparent 60%)",
          }}
          aria-hidden="true"
        />
      )}

      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        {/* Header */}
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-4"
            style={{
              color: "var(--orange)",
              border: "1px solid var(--border)",
              background: "rgba(232,80,2,0.08)",
              boxShadow: "0 4px 12px rgba(232,80,2,0.1)",
            }}
            whileHover={reduceMotion ? {} : { scale: 1.05, y: -2 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Got Questions?
          </motion.div>

          <h2 
            className="text-4xl md:text-5xl font-bold mb-4 font-['Poppins']"
            style={{ color: 'var(--text)' }}
          >
            Frequently Asked Questions
          </h2>
          <p className="text-base md:text-lg" style={{ color: 'var(--text-muted)' }}>
            Get answers to common questions about our services
          </p>
        </motion.div>

        {/* Search bar */}
        <motion.div
          className="mb-8"
          initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-3 pl-12 rounded-xl outline-none"
              style={{
                background: "var(--surface-alt)",
                border: "2px solid var(--border)",
                color: "var(--text)",
              }}
            />
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            >
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSearchQuery(cat)}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  border: "1px solid var(--border)",
                  background: searchQuery.toLowerCase() === cat.toLowerCase()
                    ? "rgba(232,80,2,0.14)"
                    : "var(--surface-alt)",
                  color: searchQuery.toLowerCase() === cat.toLowerCase()
                    ? "var(--orange)"
                    : "var(--text-muted)",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Results count */}
        {searchQuery && (
          <motion.div
            className="text-center text-sm mb-6"
            style={{ color: "var(--text-muted)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Found {filteredFaqs.length} {filteredFaqs.length === 1 ? "result" : "results"}
          </motion.div>
        )}

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((f, i) => {
              const open = openFAQ === i;
              return (
                <motion.div
                  key={i}
                  initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
                  whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: `2px solid ${open ? "var(--orange)" : "var(--border)"}`,
                    background: 'var(--surface-alt)',
                    boxShadow: open ? "0 8px 20px rgba(232,80,2,0.15)" : "none",
                    transition: "all 0.3s ease",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleFAQ(i)}
                    aria-expanded={open}
                    aria-controls={`faq-panel-${i}`}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left group"
                    style={{ color: 'var(--text)' }}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          background: open
                            ? "var(--orange)"
                            : "color-mix(in oklab, var(--orange) 10%, transparent)",
                          color: open ? "#fff" : "var(--orange)",
                          transition: "all 0.3s ease",
                        }}
                      >
                        {f.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-base mb-1">{f.question}</div>
                        <div
                          className="text-xs px-2 py-0.5 rounded-full inline-block"
                          style={{
                            background: "color-mix(in oklab, var(--orange) 10%, transparent)",
                            color: "var(--orange)",
                          }}
                        >
                          {f.category}
                        </div>
                      </div>
                    </div>

                    <motion.div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-lg"
                      style={{
                        borderColor: open ? "var(--orange)" : "var(--border)",
                        background: open ? 'var(--orange)' : 'transparent',
                        color: open ? '#fff' : 'var(--text-muted)',
                      }}
                      animate={{ rotate: open ? 45 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      +
                    </motion.div>
                  </button>

                  <motion.div
                    id={`faq-panel-${i}`}
                    initial={false}
                    animate={{
                      height: open ? "auto" : 0,
                      opacity: open ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="px-5 pb-5 pl-[4.25rem]" style={{ color: 'var(--text-muted)' }}>
                      {f.answer}
                    </div>
                  </motion.div>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-lg font-semibold mb-2" style={{ color: "var(--text)" }}>
                No results found
              </div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                Try a different search term or{" "}
                <button
                  onClick={() => setSearchQuery("")}
                  className="font-semibold"
                  style={{ color: "var(--orange)" }}
                >
                  clear your search
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Still have questions CTA */}
        <motion.div
          className="mt-12 text-center p-6 rounded-xl"
          style={{
            background: "var(--surface-alt)",
            border: "1px solid var(--border)",
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-lg font-semibold mb-2" style={{ color: "var(--text)" }}>
            Still have questions?
          </div>
          <div className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            We're here to help! Reach out and we'll get back to you within 24 hours.
          </div>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white"
            style={{
              background: "linear-gradient(90deg, var(--orange), #ff9357)",
            }}
          >
            <MessageCircle size={18} />
            Contact Us
          </a>
        </motion.div>
      </div>
    </section>
  );
};

/* ===================== Conversion-Optimized Pricing ===================== */
const Pricing = ({ onOpenCalendly }) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : false
  );
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const CATS = [
    {
      k: "gaming",
      label: "Gaming",
      headline: "Level up your channel, not just your KD",
      sub: "Hook-first edits, cracked thumbnails, and highlight engines built for any title.",
      icon: <Zap size={16} />,
    },
    {
      k: "vlog",
      label: "Vlogs",
      headline: "Turn everyday moments into bingeable stories",
      sub: "Cleaner cuts, clearer hooks, and packaging that earns the click.",
      icon: <IconImage size={16} />,
    },
    {
      k: "talking",
      label: "Podcasts",
      headline: "Ship long-form, spin a clips flywheel",
      sub: "Studio-grade edits, transcripts, and steady clips for discovery.",
      icon: <MessageCircle size={16} />,
    },
    {
      k: "others",
      label: "Custom",
      headline: "Custom mix for brands & niches",
      sub: "Tell us your format and goals — we'll tailor a plan.",
      icon: <Wand2 size={16} />,
    },
  ];
  
  const [cat, setCat] = useState("gaming");

  const PLANS = {
    gaming: [
      {
        name: "Starter",
        tag: "Test the waters",
        key: "starter",
        cta: "Start Now",
        priceInr: 599,
        billing: "one-time",
        savings: null,
        bullets: [
          "1 AI-assisted thumbnail + human polish",
          "1 Short (≤50s) with captions & sound",
          "Mini channel audit report",
        ],
        includes: [
          "2 thumbnail variants (A/B ready)",
          "Custom short thumbnail",
          "48-72h turnaround",
        ],
        results: "+18% avg CTR lift (based on 50+ starters)",
      },
      {
        name: "Clutch Highlights",
        tag: "Most Popular",
        key: "highlights",
        cta: "Get Started",
        priceInr: 6999,
        billing: "monthly",
        savings: "Save ₹2,000 vs individual",
        bullets: [
          "30 Gaming Shorts (feed-optimized)",
          "30 custom short thumbnails",
          "Platform-ready animations",
        ],
        includes: [
          "Meme timing + emoji accents",
          "5 AI transitions/hooks",
          "Captions + title suggestions",
        ],
        results: "+9.4K avg subs/quarter (gaming clients)",
        popular: true,
      },
      {
        name: "Rank Up",
        tag: "Best value",
        key: "rankup",
        cta: "Level Up",
        priceInr: 5499,
        billing: "monthly",
        savings: "Save ₹3,200 vs individual",
        bullets: [
          "2 Long-form edits (8 min each)",
          "7 Thumbnails (2 A/B + 5 live)",
          "Full SEO optimization",
        ],
        includes: [
          "Intros/outros + memes + SFX",
          "Transitions + animations",
          "AI templates included",
        ],
        results: "+62% CTR on packaged videos",
      },
      {
        name: "Pro League",
        tag: "Full-service",
        key: "pro",
        cta: "Go Pro",
        priceInr: 13499,
        billing: "monthly",
        savings: "Save ₹5,500 vs individual",
        bullets: [
          "4 Long-form edits + 20 Shorts",
          "10 Total thumbnails (4 A/B + 6 live)",
          "Priority 48-72h SLA",
        ],
        includes: [
          "Everything in Rank Up",
          "Free stream SEO",
          "Shinel SEO Tools access",
        ],
        results: "3.1x views (avg growth in 8 weeks)",
      },
    ],
    // Add similar structure for vlog, talking, others...
  };

  const POPULAR = {
    gaming: "highlights",
    vlog: "driver",
    talking: "clips",
    others: "explainer",
  };

  const plans = PLANS[cat] || PLANS.gaming;
  const [openIdx, setOpenIdx] = useState(null);
  const [hoveredPlan, setHoveredPlan] = useState(null);

  const handleCTA = (plan) => {
    try {
      track("pricing_cta_click", { category: cat, plan: plan.key, price: plan.priceInr });
    } catch {}
    onOpenCalendly?.();
  };

  return (
    <section
      id="pricing"
      className="py-20 relative overflow-hidden"
      style={{ background: "var(--surface)" }}
      aria-labelledby="pricing-heading"
    >
      {/* Ambient background */}
      {!reduceMotion && (
        <div
          className="absolute top-1/4 right-20 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, var(--orange), transparent 60%)" }}
          aria-hidden="true"
        />
      )}

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        {/* Header with social proof */}
        <motion.div
          className="text-center mb-12"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-4"
            style={{
              color: "var(--orange)",
              border: "1px solid var(--border)",
              background: "rgba(232,80,2,0.08)",
              boxShadow: "0 4px 12px rgba(232,80,2,0.1)",
            }}
            whileHover={reduceMotion ? {} : { scale: 1.05, y: -2 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            94% client retention rate
          </motion.div>

          <h2
            id="pricing-heading"
            className="text-4xl md:text-5xl font-bold font-['Poppins'] mb-3"
            style={{ color: "var(--text)" }}
          >
            Pricing That Scales With You
          </h2>
          <p
            className="text-base md:text-lg max-w-2xl mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            Start small, scale fast. No setup fees. Cancel anytime.
          </p>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm">
            {[
              { icon: "✓", text: "Money-back guarantee" },
              { icon: "✓", text: "No long-term contracts" },
              { icon: "✓", text: "Flexible revisions" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2"
                style={{ color: "var(--text-muted)" }}
              >
                <span style={{ color: "var(--orange)" }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Category Tabs with icons */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-8 flex-wrap"
          initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {CATS.map((c) => {
            const on = c.k === cat;
            return (
              <motion.button
                key={c.k}
                onClick={() => {
                  setCat(c.k);
                  setOpenIdx(null);
                }}
                className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold border"
                style={{
                  color: on ? "#fff" : "var(--text)",
                  borderColor: on ? "var(--orange)" : "var(--border)",
                  background: on ? "var(--orange)" : "var(--surface-alt)",
                  boxShadow: on ? "0 4px 12px rgba(232,80,2,0.25)" : "none",
                }}
                whileHover={reduceMotion ? {} : { y: -2 }}
                whileTap={reduceMotion ? {} : { scale: 0.98 }}
              >
                {c.icon}
                {c.label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Category headline */}
        <div className="text-center mb-10">
          <div className="text-xl md:text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
            {CATS.find((x) => x.k === cat)?.headline}
          </div>
          <div className="text-sm md:text-base" style={{ color: "var(--text-muted)" }}>
            {CATS.find((x) => x.k === cat)?.sub}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((p, i) => {
            const isHovered = hoveredPlan === i;
            const isPopular = p.popular || POPULAR[cat] === p.key;
            
            return (
              <motion.article
                key={`${cat}-${p.key}`}
                className="relative rounded-2xl p-6 border-2"
                style={{
                  background: "var(--surface-alt)",
                  borderColor: isPopular ? "var(--orange)" : isHovered ? "var(--orange)" : "var(--border)",
                  boxShadow: isPopular || isHovered
                    ? "0 12px 30px rgba(232,80,2,0.2)"
                    : "0 4px 12px rgba(0,0,0,0.06)",
                  transform: isPopular ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.3s ease",
                }}
                initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
                whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onMouseEnter={() => setHoveredPlan(i)}
                onMouseLeave={() => setHoveredPlan(null)}
                whileHover={reduceMotion ? {} : { y: -6 }}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      background: "linear-gradient(90deg, var(--orange), #ff9357)",
                      color: "#fff",
                      boxShadow: "0 4px 12px rgba(232,80,2,0.3)",
                    }}
                  >
                    {p.tag}
                  </div>
                )}

                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold" style={{ color: "var(--text)" }}>
                      {p.name}
                    </h3>
                    {p.savings && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: "rgba(34,197,94,0.15)",
                          color: "#22c55e",
                        }}
                      >
                        {p.savings}
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold" style={{ color: "var(--text)" }}>
                      {p.priceInr ? formatINR(p.priceInr) : "Custom"}
                    </span>
                    {p.billing === "monthly" && (
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                        /month
                      </span>
                    )}
                  </div>

                  {p.billing === "monthly" && (
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Cancel anytime • No contracts
                    </div>
                  )}
                </div>

                {/* Results badge */}
                {p.results && (
                  <div
                    className="mb-4 p-3 rounded-lg flex items-start gap-2"
                    style={{
                      background: "rgba(232,80,2,0.08)",
                      border: "1px solid rgba(232,80,2,0.2)",
                    }}
                  >
                    <BarChart3 size={16} style={{ color: "var(--orange)", flexShrink: 0, marginTop: 2 }} />
                    <div className="text-xs" style={{ color: "var(--text)" }}>
                      <strong>Proven results:</strong> {p.results}
                    </div>
                  </div>
                )}

                {/* Bullets */}
                <ul className="space-y-2.5 mb-4">
                  {p.bullets.map((b, bi) => (
                    <li key={bi} className="flex items-start gap-2 text-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                        <path d="M20 6L9 17l-5-5" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ color: "var(--text)" }}>{b}</span>
                    </li>
                  ))}
                </ul>

                {/* Expandable */}
                <button
                  type="button"
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  className="text-sm font-medium mb-4 flex items-center gap-1"
                  style={{ color: "var(--orange)" }}
                >
                  {openIdx === i ? "Hide" : "Show"} what's included
                  <motion.svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    animate={{ rotate: openIdx === i ? 180 : 0 }}
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </motion.svg>
                </button>

                <motion.div
                  initial={false}
                  animate={{ height: openIdx === i ? "auto" : 0, opacity: openIdx === i ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  <ul className="space-y-1.5 mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
                    {p.includes?.map((inc, ii) => (
                      <li key={ii} className="flex items-start gap-2">
                        <span>•</span>
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* CTA */}
                <motion.button
                  onClick={() => handleCTA(p)}
                  className="w-full rounded-xl py-3 font-semibold text-white flex items-center justify-center gap-2"
                  style={{
                    background: isPopular
                      ? "linear-gradient(90deg, var(--orange), #ff9357)"
                      : "linear-gradient(90deg, #1a1a1a, #2a2a2a)",
                    boxShadow: isPopular 
                      ? "0 8px 20px rgba(232,80,2,0.3)" 
                      : "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                  whileHover={reduceMotion ? {} : { scale: 1.02, y: -2 }}
                  whileTap={reduceMotion ? {} : { scale: 0.98 }}
                >
                  {p.cta}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.button>

                <div className="mt-3 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
                  No payment to preview • First delivery risk-free
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* What's Always Included section */}
        <motion.div
          className="max-w-4xl mx-auto p-6 rounded-2xl mb-10"
          style={{
            background: "var(--surface-alt)",
            border: "1px solid var(--border)",
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h3 className="text-lg font-bold mb-4 text-center" style={{ color: "var(--text)" }}>
            Always Included (Every Plan)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {[
              "1 major + 2 minor revisions per deliverable",
              "48-72h standard turnaround",
              "AI speed + human quality control",
              "Organized file handoff",
              "Project files available on request",
              "Dedicated support channel",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ color: "var(--text)" }}>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Money-back guarantee */}
        <motion.div
          className="max-w-2xl mx-auto text-center p-6 rounded-xl"
          style={{
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
          initial={reduceMotion ? {} : { opacity: 0, scale: 0.95 }}
          whileInView={reduceMotion ? {} : { opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <div className="text-2xl mb-2">🛡️</div>
          <div className="font-bold mb-2" style={{ color: "var(--text)" }}>
            Risk-Free Guarantee
          </div>
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            Not satisfied with your first delivery? We'll revise until you're happy or issue a full refund. No questions asked.
          </div>
        </motion.div>
      </div>
    </section>
  );
};


/* ===================== Quick Lead Form (polished + autosave + a11y + analytics) ===================== */
const QuickLeadForm = () => {
  const [name, setName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [toast, setToast] = React.useState(null); // {type:'success'|'error', text:string}
  const [website, setWebsite] = React.useState(""); // honeypot
  const [selected, setSelected] = React.useState([]);
  const [contactMethod, setContactMethod] = React.useState("email"); // 'email' | 'whatsapp'
  const formRef = React.useRef(null);
  const startedAt = React.useRef(Date.now());

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

  const showToast = (type, text) => {
    setToast({ type, text });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2600);
  };

  const toggleChip = (label) =>
    setSelected((prev) => {
      const on = prev.includes(label);
      try {
        window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "lead_interest_toggle", label, on: !on } }));
      } catch {}
      return on ? prev.filter((x) => x !== label) : [...prev, label];
    });

  // ---- Smart helpers --------------------------------------------------------
  const getUTM = () => {
    try {
      return JSON.parse(localStorage.getItem("utm") || "{}");
    } catch {
      return {};
    }
  };

  const draftLines = () => {
    const utm = getUTM();
    const lines = [
      `Name: ${clean(name)}`,
      `Handle/URL: ${clean(handle)}`,
      `Email: ${clean(email)}`,
      selected.length ? `Interests: ${selected.join(", ")}` : null,
      msg ? `Note: ${clean(msg)}` : null,
      Object.keys(utm).length ? `UTM: ${Object.entries(utm).map(([k, v]) => `${k}=${v}`).join("&")}` : null,
      "",
      "Hi Shinel Studios, I'd like a quick quote and a content audit.",
    ].filter(Boolean);
    return lines;
  };

  const makeMailto = () => {
    const to = "hello@shinelstudiosofficial.com";
    const subject = `Quick Quote Request — ${clean(name) || "Creator"}`;
    const body = draftLines().join("\n");
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const whatsappURL = () => {
    const base = "https://wa.me/918968141585";
    const lines = draftLines();
    const text = `Hi Shinel Studios!\n${lines.join("\n")}`;
    return `${base}?text=${encodeURIComponent(text)}`;
  };

  // ---- Autosave / restore ---------------------------------------------------
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("ss_lead");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s?.name) setName(s.name);
      if (s?.handle) setHandle(s.handle);
      if (s?.email) setEmail(s.email);
      if (Array.isArray(s?.selected)) setSelected(s.selected);
      if (typeof s?.msg === "string") setMsg(s.msg);
      if (s?.contactMethod) setContactMethod(s.contactMethod);
    } catch {}
  }, []);

  React.useEffect(() => {
    const payload = { name, handle, email, selected, msg, contactMethod };
    try { localStorage.setItem("ss_lead", JSON.stringify(payload)); } catch {}
  }, [name, handle, email, selected, msg, contactMethod]);

  // Hide sticky mobile CTA while typing
  React.useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    const onFocusIn = () => window.dispatchEvent(new Event("ss:hideMobileCTA"));
    const onFocusOut = () => window.dispatchEvent(new Event("ss:showMobileCTA"));
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);
    return () => {
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
    };
  }, []);

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

  // ---- Submit ---------------------------------------------------------------
  const onSubmit = async (e) => {
    e?.preventDefault?.();

    // Simple bot guard: honeypot + too-fast submit (< 1500ms)
    const elapsed = Date.now() - startedAt.current;
    if (website || elapsed < 1500) {
      return showToast("error", "Something went wrong. Please try again.");
    }

    if (!valid) {
      if (!name.trim()) return showToast("error", "Please enter your name.");
      if (!isEmail(email)) return showToast("error", "Please enter a valid email.");
    }

    setSending(true);
    try {
      if (contactMethod === "whatsapp") {
        const href = whatsappURL();
        setTimeout(() => {
          window.open(href, "_blank", "noreferrer");
          setSending(false);
          showToast("success", "Opening WhatsApp…");
          try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "lead_submit", method: "whatsapp" } })); } catch {}
        }, 120);
      } else {
        const href = makeMailto();
        const openedViaMailto = () => {
          // Heuristic: we can't detect reliably; provide clipboard fallback after a delay
          setTimeout(async () => {
            if (!document.hasFocus() && navigator.clipboard) return; // likely switched to mail client
            try {
              await navigator.clipboard.writeText(draftLines().join("\n"));
              showToast("success", "Copied message to clipboard — paste in your email app.");
            } catch {}
          }, 900);
        };
        setTimeout(() => {
          window.location.href = href;
          openedViaMailto();
          setSending(false);
          showToast("success", "Opening your email app…");
          try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "lead_submit", method: "email" } })); } catch {}
        }, 120);
      }
    } catch {
      setSending(false);
      showToast("error", "Could not open your app. Try the other button below.");
    }
  };

  return (
    <section
      id="leadform-section"
      className="py-14"
      style={{ background: "var(--surface-alt)" }}
      aria-labelledby="leadform-heading"
    >
      <div className="container mx-auto px-4 max-w-3xl relative" ref={formRef}>
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
              aria-live="polite"
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
            Tell us where you post — we'll reply within 24 hours.
          </p>
          <div className="mt-3 flex items-center justify-center gap-3 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
            <span className="px-2 py-1 rounded-full border" style={{ borderColor: "var(--border)" }}>No spam</span>
            <span className="px-2 py-1 rounded-full border" style={{ borderColor: "var(--border)" }}>Consent-first AI</span>
            <span className="px-2 py-1 rounded-full border" style={{ borderColor: "var(--border)" }}>Reply in 24h</span>
          </div>
        </div>

        {/* Honeypot */}
        <label className="sr-only" htmlFor="website">Website</label>
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
                aria-invalid={clean(name).length < 2}
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
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[48px] rounded-2xl px-4 outline-none"
                style={inputStyle}
                placeholder="creator@email.com"
                autoComplete="email"
                aria-invalid={!isEmail(email)}
                aria-describedby="email-hint"
              />
              <div id="email-hint" className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                We'll only use this to reply to your quote.
              </div>
            </div>
          </div>

          {/* Preferred contact */}
          <fieldset className="mt-1">
            <legend className="text-sm mb-2" style={{ color: "var(--text)" }}>How should we contact you?</legend>
            <div className="flex gap-3">
              {[
                { k: "email", label: "Email" },
                { k: "whatsapp", label: "WhatsApp" },
              ].map((opt) => (
                <label key={opt.k} className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
                  <input
                    type="radio"
                    name="contactMethod"
                    value={opt.k}
                    checked={contactMethod === opt.k}
                    onChange={() => setContactMethod(opt.k)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

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
              style={{ 
                background: "linear-gradient(90deg, var(--orange), #ff9357)",
                boxShadow: "0 4px 12px rgba(232,80,2,0.25)"
              }}
              whileHover={!sending ? { y: -2, boxShadow: "0 10px 24px rgba(232,80,2,0.35)" } : {}}
              whileTap={!sending ? { scale: 0.98 } : {}}
              aria-live="polite"
            >
              {sending ? (contactMethod === "whatsapp" ? "Opening WhatsApp…" : "Opening mail…") : "Send & Get Quote"}
            </motion.button>

            <motion.a
              href={whatsappURL()}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center rounded-xl py-3 font-semibold"
              style={{ 
                border: "2px solid var(--orange)", 
                color: "var(--orange)",
                background: "rgba(232,80,2,0.05)"
              }}
              whileHover={{ y: -2, background: "rgba(232,80,2,0.1)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "cta_click_whatsapp", src: "leadform" } })); } catch {}
              }}
            >
              Message on WhatsApp
            </motion.a>
          </div>

          <p className="mt-2 text-xs text-center md:text-left" style={{ color: "var(--text-muted)" }}>
            By contacting us, you agree to receive a one-time reply on your email or WhatsApp. We don't send newsletters from this form.
          </p>
        </form>
      </div>
    </section>
  );
};


/* ===================== Contact (polished + mobile-first + CPU-friendly) ===================== */
const ContactCTA = ({ onBook }) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const buildWhatsApp = () => {
    const base = "https://wa.me/918968141585";
    let text = "Hi Shinel Studios! I want to grow my channel. Can we talk?";
    try {
      const utm = JSON.parse(localStorage.getItem("utm") || "{}");
      const meta = Object.entries(utm).map(([k, v]) => `${k}=${v}`).join("&");
      if (meta) text += `\nUTM: ${meta}`;
    } catch {}
    return `${base}?text=${encodeURIComponent(text)}`;
  };

  const buildMailto = () => {
    const to = "hello@shinelstudiosofficial.com";
    const subject = "Quick chat about my content growth";
    const body = [
      "Hi Shinel Studios,",
      "",
      "I'd love to talk about improving my thumbnails/retention and overall growth.",
      "Can we schedule a quick call?",
      "",
      "— Sent from Contact section",
    ].join("\n");
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleBook = () => {
    try {
      window.dispatchEvent(new Event("calendly:open"));
      window.dispatchEvent(
        new CustomEvent("analytics", { detail: { ev: "cta_click_audit", src: "contact" } })
      );
    } catch {}
    onBook?.();
  };

  return (
    <section
      id="contact"
      className="w-full py-16 md:py-20 relative overflow-hidden"
      style={{
        backgroundImage: "linear-gradient(90deg, var(--orange), #ff9357)",
      }}
      aria-labelledby="contact-heading"
    >
      {/* soft vignette for contrast */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 120% at 50% 0%, rgba(0,0,0,.18) 0%, rgba(0,0,0,0) 55%), radial-gradient(120% 80% at 50% 100%, rgba(0,0,0,.20) 0%, rgba(0,0,0,0) 50%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 relative">
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 30 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2
            id="contact-heading"
            className="text-3xl md:text-6xl font-bold mb-4 md:mb-6 font-['Poppins']"
            style={{ color: "#fff", lineHeight: 1.08 }}
          >
            Let’s Build Something Amazing Together
          </h2>

          <p
            className="text-lg md:text-xl mb-6 md:mb-8 mx-auto max-w-2xl"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            Ready to take your content to the next level? Reach out — we’ll map a plan and start shipping wins.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
            <motion.a
              href={buildWhatsApp()}
              target="_blank"
              rel="noreferrer"
              className="bg-white text-black px-6 md:px-8 py-3.5 md:py-4 rounded-lg font-semibold text-base md:text-lg shadow-sm text-center"
              whileHover={reduceMotion ? {} : { y: -2 }}
              whileTap={reduceMotion ? {} : { scale: 0.98 }}
              aria-label="Chat with us on WhatsApp"
              onClick={() => {
                try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "cta_click_whatsapp", src: "contact" } })); } catch {}
              }}
            >
              WhatsApp Us
            </motion.a>

            <motion.button
              type="button"
              onClick={handleBook}
              className="px-6 md:px-8 py-3.5 md:py-4 rounded-lg font-semibold text-base md:text-lg text-white"
              style={{
                border: "2px solid rgba(255,255,255,.9)",
                background:
                  "linear-gradient(90deg, rgba(255,255,255,.14), rgba(255,255,255,.08))",
                backdropFilter: "blur(4px)",
              }}
              whileHover={reduceMotion ? {} : { y: -2 }}
              whileTap={reduceMotion ? {} : { scale: 0.98 }}
              aria-label="Book a free 15-minute audit"
            >
              Book Free Audit
            </motion.button>

            <motion.a
              href={buildMailto()}
              className="px-6 md:px-8 py-3.5 md:py-4 rounded-lg font-semibold text-base md:text-lg border-2 border-white text-white text-center"
              whileHover={reduceMotion ? {} : { y: -2 }}
              whileTap={reduceMotion ? {} : { scale: 0.98 }}
              aria-label="Email us"
              onClick={() => {
                try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "cta_click_email", src: "contact" } })); } catch {}
              }}
            >
              Email Us
            </motion.a>
          </div>

          {/* Trust badges */}
          <div className="mt-5 md:mt-6 flex flex-wrap items-center justify-center gap-2.5 text-[12px] md:text-sm">
            {[
              "Reply in 24h",
              "Consent-first AI",
              "No spam",
              "Project files on request",
            ].map((t, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full"
                style={{
                  color: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(255,255,255,0.5)",
                  background: "rgba(255,255,255,0.08)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* ===================== Sticky Mobile CTA (compact, footer-aware) ===================== */
const StickyMobileCTA = ({ onAudit, variant = "auto" }) => {
  const [hidden, setHidden] = React.useState(true);
  const [iconsOnly, setIconsOnly] = React.useState(false);
  const [scrollDir, setScrollDir] = React.useState("up"); // up | down
  const lastYRef = React.useRef(0);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // decide layout once (icon-only for very narrow screens or explicit variant)
  React.useEffect(() => {
    const narrow = typeof window !== "undefined" ? window.innerWidth < 360 : false;
    setIconsOnly(variant === "icons" || (variant === "auto" && narrow));
  }, [variant]);

  /* ----- show after 20% scroll & based on direction ----- */
  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      const h = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const past20 = y / h > 0.2;

      const dir = y > lastYRef.current ? "down" : "up";
      lastYRef.current = y;
      setScrollDir(dir);

      // visible only when past 20% and scrolling up
      setHidden(!(past20 && dir === "up"));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ----- auto-hide when near footer/contact/leadform ----- */
  React.useEffect(() => {
    const selectors = ["#site-footer", "#contact", "#leadform-section"];
    const targets = selectors
      .map((s) => document.querySelector(s))
      .filter(Boolean);
    if (!targets.length || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        // hide if ANY of these is in view at least a little
        const near = entries.some((e) => e.isIntersecting);
        if (near) setHidden(true);
      },
      { rootMargin: "0px 0px -20% 0px", threshold: [0, 0.05] }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  /* ----- keyboard-aware (don’t overlap inputs) ----- */
  React.useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onVV = () => {
      const keyboardLikely = window.innerHeight - vv.height > 140;
      if (keyboardLikely) setHidden(true);
    };
    vv.addEventListener("resize", onVV);
    vv.addEventListener("scroll", onVV);
    return () => {
      vv.removeEventListener("resize", onVV);
      vv.removeEventListener("scroll", onVV);
    };
  }, []);

  /* ----- listen to other UI events (Calendly, lead form) ----- */
  React.useEffect(() => {
    const hide = () => setHidden(true);
    const show = () => setHidden(false);
    window.addEventListener("leadform:visible", hide);
    window.addEventListener("calendly:open", hide);
    window.addEventListener("calendly:close", show);
    window.addEventListener("ss:hideMobileCTA", hide);
    window.addEventListener("ss:showMobileCTA", show);
    return () => {
      window.removeEventListener("leadform:visible", hide);
      window.removeEventListener("calendly:open", hide);
      window.removeEventListener("calendly:close", show);
      window.removeEventListener("ss:hideMobileCTA", hide);
      window.removeEventListener("ss:showMobileCTA", show);
    };
  }, []);

  if (variant === "off") return null;
  if (hidden) return null;

  const waHref =
    "https://wa.me/918968141585?text=" +
    encodeURIComponent("Hi Shinel Studios! I want to grow my channel. Can we talk?");

  const onQuote = () => {
    try {
      document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
      window.dispatchEvent(
        new CustomEvent("analytics", { detail: { ev: "cta_click_quote", src: "sticky" } })
      );
    } catch {}
  };

  const onWhatsApp = () => {
    try {
      window.dispatchEvent(
        new CustomEvent("analytics", { detail: { ev: "cta_click_whatsapp", src: "sticky" } })
      );
    } catch {}
  };

  return (
    <div
      className="md:hidden fixed left-0 right-0 z-40 px-3"
      style={{
        bottom: "max(10px, env(safe-area-inset-bottom, 10px))",
      }}
      role="region"
      aria-label="Quick contact options"
    >
      <div
        className="mx-auto w-full max-w-sm flex items-center justify-center gap-2 rounded-2xl p-1.5 shadow-xl"
        style={{
          border: "1px solid var(--border)",
          background: "color-mix(in oklab, var(--surface) 85%, transparent)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 8px 24px rgba(0,0,0,.25)",
          transition: "transform .2s ease, opacity .2s ease",
          transform: reduceMotion ? "none" : "translateY(0)",
          opacity: 0.98,
        }}
      >
        {/* WhatsApp */}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onWhatsApp}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 h-11 rounded-xl font-semibold outline-none"
          style={{
            background: "linear-gradient(90deg, var(--orange), #ff9357)",
            color: "#fff",
          }}
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle size={18} />
          {!iconsOnly && <span className="truncate">WhatsApp</span>}
        </a>

        {/* Get Quote */}
        <button
          type="button"
          onClick={onQuote}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 h-11 rounded-xl font-semibold"
          style={{
            border: "2px solid var(--orange)",
            color: "var(--orange)",
            background: "transparent",
          }}
          aria-label="Get a quick quote"
        >
          <FileText size={18} />
          {!iconsOnly && <span className="truncate">Get Quote</span>}
        </button>
      </div>

      {/* tiny pull-hint when labels are hidden */}
      {iconsOnly && (
        <div className="mt-1 grid place-items-center">
          <div
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
            style={{
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              background: "var(--surface-alt)",
            }}
          >
            <ChevronUp size={12} />
            <span>More options above</span>
          </div>
        </div>
      )}
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
export default function ShinelStudiosHomepage() {
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

      {/* 8) Pricing (category tabs + estimator, no public unit prices) */}
      <Pricing onOpenCalendly={() => setShowCalendly(true)} />

      {/* 8.5) ROI / CTR Lift Calculator */}
      <RoiCalculator onBook={() => setShowCalendly(true)} />

      {/* 9) Single lead capture */}
      <QuickLeadForm />

      {/* 10) FAQ */}
      <FAQSection />

      {/* 11) Process */}
      <ProcessSection />

      {/* 12) Final CTA */}
      <ContactCTA />

      {/* Utilities / overlays */}
      <StickyMobileCTA onAudit={() => setShowCalendly(true)} />
      <CalendlyModal open={showCalendly} onClose={() => setShowCalendly(false)} />
      <ExitIntentModal pdfUrl="/lead/thumbnail-checklist.pdf" />
    </div>
  );
}
