/* ===================== Imports & Globals (TOP OF FILE ONLY) ===================== */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Image as IconImage, Zap, Wand2, PenTool, Bot, Megaphone, BarChart3, Quote, ExternalLink, MessageCircle, FileText, ChevronUp
} from "lucide-react";

// Component imports
const RoiCalculator = React.lazy(() => import("./RoiCalculator"));
import QuickQuoteBar from "./QuickQuoteBar";
const CreatorsWorkedWithMarquee = React.lazy(() => import("@/components/CreatorsWorkedWithMarquee.jsx"));
const ExitIntentLeadModal = React.lazy(() => import("@/components/ExitIntentLeadModal.jsx"));
import HeroSection from "../components/HeroSection";
const ServicesSection = React.lazy(() => import("../components/ServicesSection.jsx"));
import QuickLeadForm from "./QuickLeadForm.jsx";
const ProofSection = React.lazy(() => import("../components/ProofSection"));
const CalendlyModal = React.lazy(() => import("../components/CalendlyModal").then(module => ({ default: module.CalendlyModal })));
import { BeforeAfter } from './BeforeAfter';

// New helper components
import ErrorBoundary from './ErrorBoundary';
import MetaTags, { BreadcrumbSchema, OrganizationSchema, FAQSchema } from './MetaTags';
import ProgressiveImage from './ProgressiveImage';
import SkeletonLoader, { SectionSkeleton } from './SkeletonLoader';

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
} from './CinematicComponents';
import FestivalOfferBanner from './ui/FestivalOfferBanner';

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
import SAMPLE_VLOG_BEFORE from '../assets/Vlog_sample_before.jpg';
import SAMPLE_VLOG_AFTER from '../assets/Vlog_sample_after.jpg';

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
    `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#E85002' font-family='Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' font-size='28' font-weight='700'>${safe}</text>` +
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


/* ===================== Enhanced Case Studies (metric-first) ===================== */
const CaseStudies = () => {
  const reduceMotion = false;

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
  const reduceMotion = false;

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
  const reduceMotion = false;

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
  const reduceMotion = false;

  const [openFAQ, setOpenFAQ] = useState(null);

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
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      question: 'Do you work with small YouTube channels?',
      answer: 'Yes! We work with YouTube creators of all sizes - from new channels under 1K subscribers to established creators with 100K+ subscribers. Our pricing packages are flexible and designed to fit different budgets and growth stages.',
      category: 'Pricing',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      question: 'What payment methods do you accept for video editing services?',
      answer: 'We accept Indian bank transfers (NEFT/RTGS/IMPS), UPI payments, credit/debit cards, and international wire transfers. Payment terms are flexible - 50% upfront for new clients, with monthly retainers available for ongoing projects.',
      category: 'Pricing',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M1 10h22" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
  ];


  const toggleFAQ = (idx) => setOpenFAQ((cur) => (cur === idx ? null : idx));

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
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((f, i) => {
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
          })}
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
        backgroundImage: `linear-gradient(90deg, var(--orange), ${COLORS.orangeLight})`,
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

/* ===================== Smart Floating WhatsApp Button (iOS-optimized, CPU-friendly) ===================== */
const FloatingWhatsApp = () => {
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const lastScrollY = useRef(0);
  const hideTimeout = useRef(null);

  const reduceMotion = false;

  // Simplified visibility logic
  useEffect(() => {
    let ticking = false;

    const updateVisibility = () => {
      const currentScrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollPercent = currentScrollY / (scrollHeight - windowHeight);

      // Show after threshold scroll
      const shouldShow = scrollPercent > THRESHOLDS.whatsappShowScroll;

      // Hide when scrolling down, show when scrolling up
      const scrollingUp = currentScrollY < lastScrollY.current;

      lastScrollY.current = currentScrollY;

      if (shouldShow && scrollingUp) {
        setVisible(true);
        setMinimized(false);

        // Auto-minimize after delay
        clearTimeout(hideTimeout.current);
        hideTimeout.current = setTimeout(() => {
          setMinimized(true);
        }, TIMING.whatsappAutoMinimize);
      } else if (!scrollingUp && currentScrollY > lastScrollY.current) {
        setMinimized(true);
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateVisibility);
        ticking = true;
      }
    };

    // Initial check
    updateVisibility();

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(hideTimeout.current);
    };
  }, []);

  // Hide near footer/contact sections
  useEffect(() => {
    const targets = ['#contact', '#leadform-section']
      .map(s => document.querySelector(s))
      .filter(Boolean);

    if (!targets.length || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        const nearBottom = entries.some(e => e.isIntersecting && e.intersectionRatio > THRESHOLDS.intersectionRatio);
        if (nearBottom) {
          setVisible(false);
        }
      },
      { rootMargin: '0px 0px -15% 0px', threshold: [0, THRESHOLDS.intersectionRatio, 0.1] }
    );

    targets.forEach(t => io.observe(t));
    return () => io.disconnect();
  }, []);

  // Hide when keyboard is open (iOS)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const keyboardOpen = window.innerHeight - vv.height > 150;
      if (keyboardOpen) {
        setVisible(false);
      } else if (lastScrollY.current > 100) {
        setVisible(true);
      }
    };

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

  // Listen to calendar/form events
  useEffect(() => {
    const hide = () => setVisible(false);
    const show = () => setVisible(true);

    window.addEventListener('calendly:open', hide);
    window.addEventListener('calendly:close', show);
    document.addEventListener('leadform:visible', (e) => {
      if (e.detail?.visible) hide();
      else show();
    });

    return () => {
      window.removeEventListener('calendly:open', hide);
      window.removeEventListener('calendly:close', show);
    };
  }, []);

  const whatsappUrl = `${CONTACT.whatsappUrl}?text=${encodeURIComponent(CONTACT.whatsappDefaultMessage)}`;

  const handleClick = useCallback(() => {
    try {
      window.dispatchEvent(
        new CustomEvent("analytics", { detail: { ev: ANALYTICS_EVENTS.ctaClickWhatsapp, src: 'floating' } })
      );
    } catch { }
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }, [whatsappUrl]);

  const handleMouseEnter = useCallback(() => {
    setMinimized(false);
    clearTimeout(hideTimeout.current);
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="md:hidden fixed z-50"
        style={{
          right: 'max(16px, env(safe-area-inset-right, 16px))',
          bottom: 'max(20px, calc(env(safe-area-inset-bottom, 16px) + 4px))',
          willChange: 'transform, opacity',
          transform: 'translate3d(0, 0, 0)',
          WebkitTransform: 'translate3d(0, 0, 0)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: minimized ? 0.9 : 1,
          opacity: 1,
        }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
          mass: 0.8,
        }}
      >
        <motion.button
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onTouchStart={handleMouseEnter}
          className="relative rounded-full shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${COLORS.whatsappGreen}, ${COLORS.whatsappGreenDark})`,
            width: minimized ? '56px' : '60px',
            height: minimized ? '56px' : '60px',
            willChange: 'transform',
            transform: 'translate3d(0, 0, 0)',
            WebkitTransform: 'translate3d(0, 0, 0)',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            boxShadow: `0 8px 24px rgba(37, 211, 102, 0.4), 0 4px 12px rgba(0, 0, 0, 0.2)`,
          }}
          whileHover={!reduceMotion ? {} : {}}
          whileTap={{ scale: 0.92 }}
          aria-label="Chat on WhatsApp"
        >
          {/* WhatsApp Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width={minimized ? "26" : "30"}
              height={minimized ? "26" : "30"}
              viewBox="0 0 24 24"
              fill="none"
              style={{
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: 'translate3d(0, 0, 0)',
                WebkitTransform: 'translate3d(0, 0, 0)',
              }}
            >
              <path
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                fill="white"
              />
            </svg>
          </div>

          {/* Pulse ring animation - CPU friendly */}
          {!reduceMotion && !minimized && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                border: `2px solid ${COLORS.whatsappGreen}`,
                transform: 'translate3d(0, 0, 0)',
                WebkitTransform: 'translate3d(0, 0, 0)',
              }}
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeOut",
                repeatDelay: 0.5,
              }}
              aria-hidden="true"
            />
          )}

          {/* Notification badge */}
          {!minimized && (
            <motion.div
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                background: '#ff3b30',
                color: 'white',
                boxShadow: '0 2px 8px rgba(255, 59, 48, 0.5)',
                border: '2px solid white',
              }}
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            >
              1
            </motion.div>
          )}
        </motion.button>

        {/* Tooltip - only show when expanded */}
        <AnimatePresence>
          {!minimized && (
            <motion.div
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none"
              initial={{ opacity: 0, x: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              transition={{
                duration: 0.2,
                ease: "easeOut",
              }}
            >
              <div
                className="px-3 py-2 rounded-lg text-xs font-semibold shadow-xl"
                style={{
                  background: 'rgba(0, 0, 0, 0.9)',
                  color: 'white',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              >
                💬 Quick chat?
                {/* Arrow */}
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full"
                  style={{
                    width: 0,
                    height: 0,
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderLeft: '5px solid rgba(0, 0, 0, 0.9)',
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

/* ===================== SEO Schema (Organization + WebSite + Service + FAQPage) ===================== */
const SeoSchema = () => {
  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://shinelstudios.in";
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
          "email": "hello@shinelstudios.in",
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

  const handleOpenCalendly = useCallback((source) => {
    setShowCalendly(true);
    track(ANALYTICS_EVENTS.ctaClickAudit, { src: source });
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen overflow-x-hidden">
        {/* SEO Meta Tags */}
        <MetaTags
          title={META.title}
          description={META.description}
          keywords={META.keywords}
          ogImage={META.ogImage}
        />

        {/* Structured Data */}
        <OrganizationSchema />
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

        {/* Main content wrapper */}
        <main id="main-content">
          {/* 0) Festival Offer Banner (Sticky or Top) */}
          <ErrorBoundary>
            <FestivalOfferBanner />
          </ErrorBoundary>

          {/* 1) Hero (Above the fold, loads immediately) */}
          <ErrorBoundary fallback={<SectionSkeleton content="card" contentCount={1} />}>
            <HeroSection isDark={isDark} onAudit={() => handleOpenCalendly("hero")} />
          </ErrorBoundary>

          {/* 2) Desktop sticky quick-quote bar with Calendly (non-intrusive) */}
          <ErrorBoundary>
            <QuickQuoteBar onBook={() => setShowCalendly(true)} />
          </ErrorBoundary>

          {/* 3) Social proof (logos) */}
          <ErrorBoundary>
            <React.Suspense fallback={<SectionSkeleton content="card" contentCount={1} />}>
              <CreatorsWorkedWithMarquee isDark={isDark} />
            </React.Suspense>
          </ErrorBoundary>

          {/* 4) Services (clear value props) */}
          <ErrorBoundary fallback={<SectionSkeleton content="card" contentCount={4} />}>
            <React.Suspense fallback={<SectionSkeleton content="card" contentCount={4} />}>
              <ServicesSection />
            </React.Suspense>
          </ErrorBoundary>

          {/* 5) Proof (Before/After CTR lift) */}
          <ErrorBoundary fallback={<SectionSkeleton content="image" contentCount={2} />}>
            <React.Suspense fallback={<SectionSkeleton content="image" contentCount={2} />}>
              <ProofSection />
            </React.Suspense>
          </ErrorBoundary>

          {/* 6) Case studies (wins) */}
          <ErrorBoundary fallback={<SectionSkeleton content="card" contentCount={3} />}>
            <CaseStudies />
          </ErrorBoundary>

          {/* 7) Testimonials (human proof + analytics) */}
          <ErrorBoundary fallback={<SectionSkeleton content="testimonial" contentCount={4} />}>
            <TestimonialsSection isDark={isDark} />
          </ErrorBoundary>

          {/* 8) ROI / CTR Lift Calculator */}
          <ErrorBoundary>
            <React.Suspense fallback={<SectionSkeleton content="card" contentCount={1} />}>
              <RoiCalculator onBook={() => setShowCalendly(true)} />
            </React.Suspense>
          </ErrorBoundary>

          {/* 9) FAQ (Better for SEO - kept as requested) */}
          <ErrorBoundary fallback={<SectionSkeleton content="listItem" contentCount={5} />}>
            <FAQSection />
          </ErrorBoundary>

          {/* 10) Process (Secondary trust) */}
          <ErrorBoundary fallback={<SectionSkeleton content="processStep" contentCount={4} />}>
            <ProcessSection />
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

          {/* 12) Final CTA */}
          <ErrorBoundary>
            <ContactCTA onBook={() => setShowCalendly(true)} />
          </ErrorBoundary>
        </main>

        {/* Floating elements */}
        <ErrorBoundary>
          <FloatingWhatsApp />
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