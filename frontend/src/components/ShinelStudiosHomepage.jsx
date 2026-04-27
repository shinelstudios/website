/**
 * ShinelStudiosHomepage.jsx
 * 
 * About: The main landing page component for Shinel Studios.
 * Features: Hero section, Process overview, Case studies, Services, Social proof, Interactive components.
 */
/* ===================== Imports & Globals (TOP OF FILE ONLY) ===================== */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Image as IconImage, Zap, Wand2, PenTool, Bot, Megaphone, BarChart3, Quote, ExternalLink, MessageCircle, FileText, ChevronUp, ArrowRight
} from "lucide-react";
import { useGlobalConfig } from "../context/GlobalConfigContext";

// Component imports
import StickyFloatingCTA from "./StickyFloatingCTA";
import SocialProofNotifications from "./SocialProofNotifications";
import ScrollProgressBar from "./ScrollProgressBar";
import QuickQuoteBar from "./QuickQuoteBar";
import FloatingWhatsApp from "./FloatingWhatsApp";
const CreatorsWorkedWithMarquee = React.lazy(() => import("@/components/CreatorsWorkedWithMarquee.jsx"));
const ExitIntentLeadModal = React.lazy(() => import("@/components/ExitIntentLeadModal.jsx"));
// HeroSection retired in favour of EditorialHero. ServicesSection retired
// in favour of EditorialServicesGrid (file kept on disk as fallback).
import QuickLeadForm from "./QuickLeadForm.jsx";
import AISH_LOGO from '../assets/creators/aish.png';
import MAGGIE_LOGO from '../assets/creators/maggie.png';
import MANAV_LOGO from '../assets/creators/manav.png';
import DEADLOX_LOGO from '../assets/creators/deadlox.png';
import KAMZ_LOGO from '../assets/creators/kamz.png';
import GAMERMUMMY_LOGO from '../assets/creators/gamermummy.png';
import ANCHIT_LOGO from '../assets/creators/anchit.png';
import KUNDAN_LOGO from '../assets/creators/kundan.png';
const ProofSection = React.lazy(() => import("../components/ProofSection"));
const CalendlyModal = React.lazy(() => import("../components/CalendlyModal").then(module => ({ default: module.CalendlyModal })));
// New helper components
import ErrorBoundary from './ErrorBoundary';
import MetaTags, { BreadcrumbSchema, OrganizationSchema, FAQSchema, LocalBusinessSchema, WebSiteSchema } from './MetaTags';
import ProgressiveImage from './ProgressiveImage';
import SkeletonLoader, { SectionSkeleton } from './SkeletonLoader';
import { useClientStats } from '../context/ClientStatsContext';
import ParticleNetwork from './animations/ParticleNetwork';

// Mobile-first UI components
import {
  Container,
  Section,
  Grid,
  Card,
  Button,
  Badge,
  Heading,
  Text,
} from './MobileFirst';

// Cinematic components
import {
  FilmStripTimeline,
  MetricCounter,
  BeforeAfterSlider,
  SwipeableCarousel,
  UrgencyIndicator,
  // NetworkImpactBar retired \u2014 stats now live inside EditorialHero.
} from './CinematicComponents';

import StrategyWizard from './StrategyWizard';
import { GrainOverlay } from "../design";
import { AUTH_BASE } from "../config/constants";
import EditorialHero from "./home/EditorialHero";
import EditorialServicesMarquee from "./home/EditorialServicesMarquee";
import EditorialProcess from "./home/EditorialProcess";
// Phase 3 homepage refresh — new editorial sections + value-add strips.
import LiveNumbersBand from "./home/LiveNumbersBand.jsx";
import JustShippedTicker from "./home/JustShippedTicker.jsx";
import EditorialServicesGrid from "./home/EditorialServicesGrid.jsx";
import EditorialBeforeAfterSection from "./home/EditorialBeforeAfterSection.jsx";
import ResultsStrip from "./home/ResultsStrip.jsx";
import EditorialTestimonialsSection from "./home/EditorialTestimonialsSection.jsx";
import PricingTeaser from "./home/PricingTeaser.jsx";
import EditorialToolsCTA from "./home/EditorialToolsCTA.jsx";
import FAQAccordion from "./home/FAQAccordion.jsx";

// Custom hooks
import { useReducedMotion, useScrollPosition, useInView } from '../hooks/useCustomHooks';

// Configuration and constants
import {
  CONTACT,
  SOCIAL_LINKS,
  BRAND,
  TIMING,
  THRESHOLDS,
  TURNAROUND,
  COLORS,
  TYPOGRAPHY,
  BREAKPOINTS,
  ANIMATIONS,
  SPACING,
  SHADOWS,
  TRUST_BADGES,
  META,
  ANALYTICS_EVENTS,
} from '../config/constants';

// Sample images
// Vlog sample assets now imported by EditorialBeforeAfterSection directly.

/**
 * Centralized asset glob (Vite)
 * - New syntax: { query: '?url', import: 'default' } replaces deprecated "as: 'url'"
 * - Loads anything under /src/assets (creators, logos, proofs, etc.)
 * - Access via findAssetByBase()
 */
const ALL_ASSETS = import.meta.glob(
  "../assets/*.{png,jpg,jpeg,webp,svg}",
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
    if (typeof url !== "string") continue;
    const file = p.split("/").pop() || "";
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
    `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#E85002' font-family='Outfit, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' font-size='28' font-weight='700'>${safe}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Lightweight analytics dispatcher with error logging
 * @param {string} ev - Event name
 * @param {Object} detail - Event details
 */
export const track = (ev, detail = {}) => {
  try {
    window.dispatchEvent(new CustomEvent("analytics", { detail: { ev, ...detail } }));
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};

/* Motion variants (shared) */
export const animations = {
  fadeDown: { hidden: { opacity: 0, y: -12 }, visible: { opacity: 1, y: 0, transition: { duration: .35, ease: "easeOut" } } },
  fadeUp: { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: .35, ease: "easeOut" } } },
  fadeIn: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: .35, ease: "easeOut" } } },
  staggerParent: { hidden: {}, visible: { transition: { staggerChildren: .08 } } },
  scaleIn: { hidden: { opacity: 0, scale: .96, y: 8 }, visible: { opacity: 1, scale: 1, y: 0, transition: { duration: .25, ease: "easeOut" } } },
};

// card hover polish for grids
export const tiltHover = {
  whileHover: { y: -3, rotateX: 0.6, rotateY: -0.6 },
  transition: { type: "spring", stiffness: 240, damping: 18 }
};

/* Resolve sample images via asset glob (fallbacks if missing) */
export const SAMPLE_BEFORE = findAssetByBase("sample_before") || svgPlaceholder("Before");
export const SAMPLE_AFTER = findAssetByBase("sample_after") || svgPlaceholder("After");



/* ===================== Enhanced Testimonials (Video + Analytics, AI-first) =====================
 *
 * The hardcoded TESTIMONIALS array below keeps the rich video/analytics/poster
 * entries — admin CRUD isn't worth the upload UI surface for those.
 *
 * Simple quote-style testimonials ARE admin-editable: see /dashboard/testimonials
 * (AdminTestimonialsPage). Those are fetched at mount and rendered in the
 * "More praise" strip below this main grid.
 */
const TestimonialsSection = ({ isDark }) => {
  const reduceMotion = false;
  const { stats } = useClientStats();
  const { config } = useGlobalConfig();

  // Helper to get client logo from stats
  const getClientLogo = (avatarKey) => {
    const client = stats.find(s => s.id === avatarKey || s.youtubeId === avatarKey);
    return client?.logo || null;
  };

  const ctrMin = config?.stats?.ctrBoostMin || 3.1;
  const ctrMax = config?.stats?.ctrBoostMax || 5.0;

  const TESTIMONIALS = [
    {
      type: "video",
      name: "Aish is Live",
      tag: "Streamer • 17.1K",
      avatarKey: "aishislive",
      logo: AISH_LOGO,
      video: "/assets/testimonials/aish-video.mp4",
      poster: "/assets/testimonials/aish-thumb.jpg",
      quote: "Thumbnail iterations increased CTR consistently over three uploads.",
      metrics: [{ label: "CTR", value: `${ctrMin}% → ${ctrMax}%` }],
      ai: ["Thumb ideation (AI)", "Title scoring"],
      color: "#F16001",
    },
    {
      type: "analytics",
      name: "Katka Gaming",
      tag: "Gaming • 38.6K",
      avatarKey: "katkagaming",
      logo: "https://yt3.ggpht.com/mCFOqYFCVGR3HJhMpCOh6aUmqM37b9P1yLVxfeHsa14fcUZZ30sCyhcGjkBFjBxYQBnPGpUj=s800-c-k-c0x00ffffff-no-rj",
      image: svgPlaceholder("Katka Gaming Analytics"),
      alt: "YouTube Studio analytics for Katka Gaming",
      quote: "Professional editing quality that elevated my gaming content.",
      metrics: [{ label: "Avg View Dur.", value: "+32%" }],
      cta: { label: "See case", href: "/work/katka" },
      ai: ["Retention analysis", "Hook optimization"],
      color: "#C10801",
    },
    {
      type: "video",
      name: "Maggie Live",
      tag: "Creator • 21.3K",
      avatarKey: "maggielive",
      logo: MAGGIE_LOGO,
      video: "/assets/testimonials/maggie-video.mp4",
      poster: "/assets/testimonials/maggie-thumb.jpg",
      quote: "The editing style perfectly matches my brand. Watch time improved significantly.",
      metrics: [{ label: "Session Time", value: "+28%" }],
      ai: ["Style-matched edits", "Auto captions"],
      color: "#E85002",
    },
    {
      type: "analytics",
      name: "Manav Sukhija",
      tag: "Creator • 21.3K",
      avatarKey: "manav",
      logo: MANAV_LOGO,
      image: "/assets/testimonials/manav-shorts.png",
      alt: "Shorts growth from YouTube Studio for Manav",
      quote: "Hook-first shorts strategy drove predictable growth.",
      metrics: [{ label: "Subs from Shorts", value: "+9.4k" }],
      cta: { label: "See case", href: "/work/manav" },
      ai: ["Hook scoring", "Auto captions"],
      color: "#F16001",
    },
  ];



  const [openVideo, setOpenVideo] = useState(null);
  const [tab, setTab] = useState("all");

  // Additional KV-backed testimonials (admin-editable, additive).
  // Empty array is the safe default — rich carousel above is never blocked
  // by this fetch.
  const [kvTestimonials, setKvTestimonials] = useState([]);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${AUTH_BASE}/api/testimonials`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.testimonials)) {
          setKvTestimonials(data.testimonials);
        }
      })
      .catch(() => { /* ignore — homepage still renders */ });
    return () => ctrl.abort();
  }, []);

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

  const HeaderRow = ({ name, tag, avatarKey, color, logoFallback }) => {
    const avatar = getClientLogo(avatarKey) || logoFallback;
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
              decoding="async"
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
            decoding="async"
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
          <HeaderRow name={item.name} tag={item.tag} avatarKey={item.avatarKey} color={item.color} logoFallback={item.logo} />

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
            decoding="async"
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
            <BarChart3 size={16} className="inline" /> Real Data
          </div>
        </div>

        <div className="p-5">
          <HeaderRow name={item.name} tag={item.tag} avatarKey={item.avatarKey} color={item.color} logoFallback={item.logo} />

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

        {/* Praise wall — KV-backed quote testimonials added by admins
            without a deploy. Rendered below the rich carousel so it
            never competes for attention; only shows when non-empty. */}
        {kvTestimonials.length > 0 && (
          <div className="mt-16">
            <div className="text-center mb-8">
              <div
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-bold"
                style={{ color: "var(--text-muted)" }}
              >
                <Quote size={12} />
                More praise
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kvTestimonials.map((t) => (
                <motion.article
                  key={t.id}
                  initial={reduceMotion ? {} : { opacity: 0, y: 16 }}
                  whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10%" }}
                  transition={{ duration: 0.4 }}
                  className="p-5 rounded-2xl border"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {t.avatar ? (
                      <img
                        src={t.avatar}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full grid place-items-center font-bold text-white"
                        style={{ background: "var(--orange)" }}
                        aria-hidden="true"
                      >
                        {(t.author || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold truncate" style={{ color: "var(--text)" }}>
                        {t.author}
                      </div>
                      <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {[t.role, t.channel].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text)" }}>
                    “{t.quote}”
                  </p>
                  {t.link && (
                    <a
                      href={t.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold mt-3 inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
                      style={{ color: "var(--orange)" }}
                    >
                      Visit channel →
                    </a>
                  )}
                </motion.article>
              ))}
            </div>
          </div>
        )}
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

/* ===================== Contact (polished + mobile-first + CPU-friendly) ===================== */
const ContactCTA = ({ onBook }) => {
  const reduceMotion = false;

  const buildWhatsApp = useCallback(() => {
    let text = CONTACT.whatsappDefaultMessage;
    try {
      const utm = JSON.parse(localStorage.getItem('utm') || '{}');
      const meta = Object.entries(utm).map(([k, v]) => `${k}=${v}`).join('&');
      if (meta) text += `\nUTM: ${meta}`;
    } catch (error) {
      console.error('Error building WhatsApp URL:', error);
    }
    return `${CONTACT.whatsappUrl}?text=${encodeURIComponent(text)}`;
  }, []);

  const buildMailto = useCallback(() => {
    const subject = 'Quick chat about my content growth';
    const body = [
      `Hi ${BRAND.name},`,
      '',
      "I'd love to talk about improving my thumbnails/retention and overall growth.",
      'Can we schedule a quick call?',
      '',
      '— Sent from Contact section',
    ].join('\n');
    return `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, []);

  const handleBook = useCallback(() => {
    try {
      window.dispatchEvent(new Event('calendly:open'));
      track(ANALYTICS_EVENTS.ctaClickAudit, { src: 'contact' });
    } catch (error) {
      console.error('Error opening Calendly:', error);
    }
    onBook?.();
  }, [onBook]);

  const handleWhatsAppClick = useCallback(() => {
    track(ANALYTICS_EVENTS.ctaClickWhatsapp, { src: 'contact' });
  }, []);

  const handleEmailClick = useCallback(() => {
    track(ANALYTICS_EVENTS.ctaClickEmail, { src: 'contact' });
  }, []);

  return (
    <section
      id="contact"
      className="w-full py-16 md:py-20 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(90deg, var(--orange), #F16001)`,
      }}
      aria-labelledby="contact-heading"
    >
      {/* soft vignette for contrast */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 120% at 50% 0%, rgba(0,0,0,.18) 0%, rgba(0,0,0,0) 55%), radial-gradient(120% 80% at 50% 100%, rgba(0,0,0,.20) 0%, rgba(0,0,0,0) 50%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 relative">
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 30 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2
            id="contact-heading"
            className="text-3xl md:text-6xl font-bold mb-4 md:mb-6 font-['Poppins']"
            style={{ color: '#fff', lineHeight: 1.08 }}
          >
            Let's Build Something Amazing Together
          </h2>

          <p
            className="text-lg md:text-xl mb-6 md:mb-8 mx-auto max-w-2xl"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            Ready to take your content to the next level? Reach out — we'll map a plan and start shipping wins.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
            <motion.a
              href={buildWhatsApp()}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-black px-6 md:px-8 py-3.5 md:py-4 rounded-lg font-semibold text-base md:text-lg shadow-sm text-center"
              whileHover={reduceMotion ? {} : { y: -2 }}
              whileTap={reduceMotion ? {} : { scale: 0.98 }}
              aria-label="Chat with us on WhatsApp - Opens in new window"
              onClick={handleWhatsAppClick}
            >
              WhatsApp Us
            </motion.a>

            <motion.button
              type="button"
              onClick={handleBook}
              className="px-6 md:px-8 py-3.5 md:py-4 rounded-lg font-semibold text-base md:text-lg text-white"
              style={{
                border: '2px solid rgba(255,255,255,.9)',
                background:
                  'linear-gradient(90deg, rgba(255,255,255,.14), rgba(255,255,255,.08))',
                backdropFilter: 'blur(4px)',
              }}
              whileHover={reduceMotion ? {} : { y: -2 }}
              whileTap={reduceMotion ? {} : { scale: 0.98 }}
              aria-label="Book a free 15-minute channel audit"
            >
              Book Free Audit
            </motion.button>

            <motion.a
              href={buildMailto()}
              className="px-6 md:px-8 py-3.5 md:py-4 rounded-lg font-semibold text-base md:text-lg border-2 border-white text-white text-center"
              whileHover={reduceMotion ? {} : { y: -2 }}
              whileTap={reduceMotion ? {} : { scale: 0.98 }}
              aria-label="Send us an email"
              onClick={handleEmailClick}
            >
              Email Us
            </motion.a>
          </div>

          {/* Trust badges */}
          <div className="mt-5 md:mt-6 flex flex-wrap items-center justify-center gap-2.5 text-[12px] md:text-sm">
            {TRUST_BADGES.map((badge, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full"
                style={{
                  color: 'rgba(255,255,255,0.92)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.08)',
                }}
              >
                {badge}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};


// Simplified SEO Schema provided by MetaTags.jsx exports

/* ===================== Page Component (conversion-first order) ===================== */
export default function ShinelStudiosHomepage() {
  const isDark = document.documentElement.classList.contains("dark");
  const [showCalendly, setShowCalendly] = React.useState(false);

  const handleOpenCalendly = useCallback((source) => {
    setShowCalendly(true);
    track(ANALYTICS_EVENTS.ctaClickAudit, { src: source });
  }, []);

  // Listen for calendly:open event
  React.useEffect(() => {
    const handleCalendlyOpen = () => {
      setShowCalendly(true);
    };

    const handleCalendlyClose = () => {
      setShowCalendly(false);
    };

    window.addEventListener('calendly:open', handleCalendlyOpen);
    window.addEventListener('calendly:close', handleCalendlyClose);

    return () => {
      window.removeEventListener('calendly:open', handleCalendlyOpen);
      window.removeEventListener('calendly:close', handleCalendlyClose);
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen overflow-x-hidden">
        {/* SEO Meta Tags */}
        <MetaTags
          title={META.title}
          description={META.description}
          keywords={META.keywords}
        />

        {/* Structured Data */}
        <OrganizationSchema />
        <LocalBusinessSchema />
        <WebSiteSchema />
        <BreadcrumbSchema
          items={[
            { name: 'Home', url: '/' },
            { name: 'Services', url: '/#services' },
            { name: 'Work', url: '/#work' },
            { name: 'Contact', url: '/#contact' },
          ]}
        />

        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold"
          style={{
            background: 'var(--orange)',
            color: '#fff',
          }}
        >
          Skip to main content
        </a>

        {/* Scroll Progress Bar */}
        <ScrollProgressBar />

        {/* Main content wrapper */}
        <main id="main-content">
          {/* 1) EditorialHero \u2014 redesign v2, replaces HeroSection.
                 Has ScrollAurora ambient scoped inside; stats card on the right
                 replaces the former NetworkImpactBar below it (deleted as
                 redundant). onAudit keeps Calendly integration working. */}
          <ErrorBoundary fallback={<SectionSkeleton content="card" contentCount={1} />}>
            <EditorialHero onAudit={handleOpenCalendly} />
          </ErrorBoundary>

          {/* Ambient grain — fixed SVG noise, GPU-composited, 3% opacity */}
          <GrainOverlay />

          {/* Sticky desktop quick-quote bar with Calendly (non-intrusive).
              Ordering note: stays pinned; not part of the editorial narrative. */}
          <ErrorBoundary>
            <QuickQuoteBar onBook={() => setShowCalendly(true)} />
          </ErrorBoundary>

          {/*
            Section order reworked for the 2026-04-27 Phase 3 homepage refresh.
            Editorial v2 throughout. Order:
              1. Hero (existing)
              2. LiveNumbersBand     \u2605 NEW \u2014 three NumberTickIn counters
              3. JustShippedTicker   \u2605 NEW \u2014 rotating recent deliveries
              4. EditorialServicesMarquee (existing)
              5. EditorialServicesGrid    \u21bb rewrite of ServicesSection
              6. EditorialProcess (existing)
              7. CreatorsWorkedWithMarquee (existing)
              8. EditorialBeforeAfterSection \u21bb replaces ServiceLens
              9. ResultsStrip        \u2605 NEW
             10. EditorialTestimonialsSection \u21bb rewrite
             11. PricingTeaser       \u2605 NEW
             12. EditorialToolsCTA   \u21bb rewrite of AI Tools CTA
             13. FAQAccordion        \u2605 NEW (also FAQSchema for SEO)
            Then: Strategy Wizard + Contact CTA (existing).
          */}

          {/* 2. Live numbers band */}
          <ErrorBoundary>
            <LiveNumbersBand />
          </ErrorBoundary>

          {/* 3. Just shipped ticker */}
          <ErrorBoundary>
            <JustShippedTicker />
          </ErrorBoundary>

          {/* 4. Editorial services kinetic marquee */}
          <ErrorBoundary>
            <EditorialServicesMarquee />
          </ErrorBoundary>

          {/* 5. Services (editorial grid) */}
          <ErrorBoundary fallback={<SectionSkeleton content="card" contentCount={4} />}>
            <EditorialServicesGrid />
          </ErrorBoundary>

          {/* 6. Editorial six-step process strip */}
          <ErrorBoundary>
            <EditorialProcess />
          </ErrorBoundary>

          {/* 7. Social proof (logos) */}
          <ErrorBoundary>
            <React.Suspense fallback={<SectionSkeleton content="card" contentCount={1} />}>
              <CreatorsWorkedWithMarquee isDark={isDark} />
            </React.Suspense>
          </ErrorBoundary>

          {/* 8. Before/after demo (touch-safe slider replaces ServiceLens) */}
          <ErrorBoundary>
            <EditorialBeforeAfterSection />
          </ErrorBoundary>

          {/* 9. Results strip \u2014 case-study teaser carousel */}
          <ErrorBoundary>
            <ResultsStrip />
          </ErrorBoundary>

          {/* 10. Testimonials (editorial cards + KV quote wall) */}
          <ErrorBoundary fallback={<SectionSkeleton content="testimonial" contentCount={4} />}>
            <EditorialTestimonialsSection />
          </ErrorBoundary>

          {/* 11. Pricing teaser \u2014 3 tiers, middle highlighted */}
          <ErrorBoundary>
            <PricingTeaser />
          </ErrorBoundary>

          {/* 12. AI tools CTA */}
          <ErrorBoundary>
            <EditorialToolsCTA />
          </ErrorBoundary>

          {/* 13. FAQ accordion (also emits FAQSchema for SERP) */}
          <ErrorBoundary>
            <FAQAccordion />
          </ErrorBoundary>



          {/* 11) Single lead capture */}
          <ErrorBoundary>
            <React.Suspense fallback={null}>
              <ExitIntentLeadModal
                dwellMs={TIMING.exitIntentDwell}
                onceMode="session"
                userCooldownDays={TIMING.userCooldownDays}
              />
            </React.Suspense>
          </ErrorBoundary>

          {/* 11.5) Strategy Quiz (Lead Magnet) */}
          <section className="py-24 relative overflow-hidden" style={{ background: "var(--surface)" }}>
            <div className="container mx-auto px-4 max-w-4xl">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase mb-4">FIND YOUR <span className="text-orange-500">BLUEPRINT</span></h2>
                <p className="text-[var(--text-muted)] font-medium">Take our 30-second quiz to lock in a custom strategy for your channel.</p>
              </div>
              <ErrorBoundary>
                <StrategyWizard />
              </ErrorBoundary>
            </div>
          </section>

          {/* 12) Final CTA */}
          <ErrorBoundary>
            <ContactCTA onBook={() => setShowCalendly(true)} />
          </ErrorBoundary>
        </main>

        {/* Floating elements */}
        <ErrorBoundary>
          <FloatingWhatsApp />
        </ErrorBoundary>

        {/* Sticky Floating CTA */}
        <ErrorBoundary>
          <StickyFloatingCTA onBook={() => setShowCalendly(true)} scrollThreshold={0.3} />
        </ErrorBoundary>

        {/* Social Proof Notifications */}
        <ErrorBoundary>
          <SocialProofNotifications interval={15000} enabled={true} />
        </ErrorBoundary>

        <ErrorBoundary>
          <CalendlyModal open={showCalendly} onClose={() => setShowCalendly(false)} />
        </ErrorBoundary>

        {/* iOS and Performance Optimizations */}
        <style>{`
  /* iOS-specific optimizations */
  @supports (-webkit-touch-callout: none) {
    /* Prevent iOS bounce/rubber-band on body */
    body {
      overscroll-behavior-y: none;
      -webkit-overflow-scrolling: touch;
    }

    /* Hardware acceleration for floating elements */
    .fixed, 
    [class*="fixed"],
    [style*="position: fixed"] {
      -webkit-transform: translate3d(0, 0, 0);
      transform: translate3d(0, 0, 0);
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      -webkit-perspective: 1000px;
      perspective: 1000px;
    }

    /* Smooth scrolling on iOS */
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Fix for iOS button tap */
    button, 
    a,
    [role="button"] {
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }

    /* Prevent text selection during interactions */
    [draggable],
    .no-select {
      -webkit-user-select: none;
      user-select: none;
    }

    /* Fix for iOS input zoom */
    input,
    select,
    textarea {
      font-size: 16px !important;
    }

    /* Better touch scrolling */
    .overflow-auto,
    .overflow-scroll {
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }
  }

  /* CPU-friendly animations - only transform and opacity */
  * {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Optimize animated elements */
  [class*="motion-"],
  [class*="animate-"],
  .animated {
    will-change: transform, opacity;
    transform: translate3d(0, 0, 0);
    -webkit-transform: translate3d(0, 0, 0);
  }

  /* Optimize for 60fps animations */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translate3d(0, 20px, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1) translate3d(0, 0, 0);
      opacity: 1;
    }
    50% {
      transform: scale(1.05) translate3d(0, 0, 0);
      opacity: 0.9;
    }
  }

  /* Fix for Safari safe area */
  @supports (padding: max(0px)) {
    .fixed-bottom {
      padding-bottom: max(16px, env(safe-area-inset-bottom));
    }
  }

  /* Prevent layout shift from scrollbar */
  html {
    scrollbar-gutter: stable;
  }

  /* Smooth momentum scrolling for iOS */
  .smooth-scroll {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }

  /* Screen reader only utility class */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .sr-only:focus {
    position: static;
    width: auto;
    height: auto;
    padding: inherit;
    margin: inherit;
    overflow: visible;
    clip: auto;
    white-space: normal;
  }

  /* Focus visible for better keyboard navigation */
  *:focus-visible {
    outline: 2px solid var(--orange);
    outline-offset: 2px;
  }

  /* Fallback for color-mix() - browser compatibility */
  @supports not (background: color-mix(in oklab, red, blue)) {
    [style*="color-mix"] {
      background: rgba(232, 80, 2, 0.1) !important;
    }
  }
`}</style>
      </div>
    </ErrorBoundary>
  );
}