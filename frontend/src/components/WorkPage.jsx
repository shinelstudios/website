// frontend/src/components/WorkPage.jsx
/**
 * WORK PAGE — Agency-style Portfolio Landing (Mobile-first, CPU-friendly)
 * ---------------------------------------------------------------------
 * Routes kept intact:
 * - /thumbnails, /shorts, /video-editing, /branding, /pricing, /#contact
 *
 * Goals:
 * - Premium "agency portfolio" first impression
 * - No repeating the same info across multiple sections
 * - Subtle animations only (viewport once, light hover)
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Image as ImageIcon,
  Clapperboard,
  Film,
  Palette,
  BadgeCheck,
  ChevronRight,
  Zap,
  Timer,
  ShieldCheck,
  BarChart3,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";

/* ------------------------------ WhatsApp config ------------------------------ */
const WHATSAPP_NUMBER = "918968141585";
const wa = (message) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

/* ------------------------------ motion helpers ------------------------------ */
const useReveal = () => {
  const reduced = useReducedMotion();
  return useMemo(() => {
    if (reduced) {
      return {
        container: {},
        item: {},
      };
    }
    return {
      container: {
        initial: "hidden",
        whileInView: "show",
        viewport: { once: true, amount: 0.2 },
        variants: {
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.06, delayChildren: 0.02 },
          },
        },
      },
      item: {
        variants: {
          hidden: { opacity: 0, y: 14 },
          show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
        },
      },
    };
  }, [reduced]);
};

/* ---------------------------------- Data ---------------------------------- */
const KPIS = [
  { icon: BarChart3, label: "CTR-first packaging", sub: "thumb + title pairing system" },
  { icon: Zap, label: "Retention editing", sub: "cuts that hold attention" },
  { icon: ShieldCheck, label: "Brand-consistent", sub: "clean visual identity" },
  { icon: Timer, label: "Fast turnaround", sub: "reliable pipeline" },
];

const SERVICES = [
  {
    title: "Thumbnails",
    to: "/thumbnails",
    icon: ImageIcon,
    sub: "High-CTR designs built for mobile viewing.",
    bullets: ["Concept variants", "Strong contrast & focus", "Brand typography"],
    tag: "GFX",
  },
  {
    title: "Shorts / Reels",
    to: "/shorts",
    icon: Clapperboard,
    sub: "Fast pacing, captions, hooks, loops.",
    bullets: ["Hook-first pacing", "Captions & emphasis", "Batch delivery"],
    tag: "Editing",
  },
  {
    title: "Video Editing",
    to: "/video-editing",
    icon: Film,
    sub: "Long-form edits designed for retention.",
    bullets: ["Dead-air removal", "Pattern interrupts", "Sound polish"],
    tag: "Editing",
  },
  {
    title: "Branding",
    to: "/branding",
    icon: Palette,
    sub: "Channel identity and social design system.",
    bullets: ["Premium look", "Templates & assets", "Consistency across posts"],
    tag: "GFX",
  },
  {
    title: "Plans / Pricing",
    to: "/pricing",
    icon: BadgeCheck,
    sub: "Bundles for serious creators & teams.",
    bullets: ["Monthly packs", "Priority delivery", "Clear deliverables"],
    tag: "Plans",
  },
];

const HIGHLIGHTS = [
  {
    title: "Thumbnail Pack System",
    sub: "Multiple directions → one final winner",
    points: ["3–6 concepts", "CTR-focused hierarchy", "Brand style lock"],
    to: "/thumbnails",
  },
  {
    title: "Shorts Production Flow",
    sub: "High volume without quality drop",
    points: ["Hook tightening", "Captions rhythm", "Batch exports"],
    to: "/shorts",
  },
  {
    title: "Long-form Retention Pass",
    sub: "Make the video feel “faster” without losing clarity",
    points: ["Structure fixes", "Momentum edits", "Sound design polish"],
    to: "/video-editing",
  },
  {
    title: "Brand Kit Consistency",
    sub: "Your content starts looking “big channel”",
    points: ["Typography rules", "Color system", "Reusable templates"],
    to: "/branding",
  },
];

const PROCESS = [
  {
    title: "Audit + Direction",
    sub: "We align on your niche, audience, and what’s winning right now.",
  },
  {
    title: "Production Sprint",
    sub: "We execute with a repeatable system (fast + consistent quality).",
  },
  {
    title: "Review + Improve",
    sub: "We iterate quickly, lock the style, and scale the output.",
  },
];

/* ---------------------------------- UI ---------------------------------- */
const Section = ({ title, sub, right, children }) => (
  <section className="py-10 sm:py-14">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-extrabold" style={{ color: "var(--text)" }}>
            {title}
          </h2>
          {sub ? (
            <p className="mt-1 text-sm sm:text-base max-w-2xl" style={{ color: "var(--text-muted)" }}>
              {sub}
            </p>
          ) : null}
        </div>
        {right}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  </section>
);

const SoftCard = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl border ${className}`}
    style={{
      borderColor: "var(--border)",
      background: "color-mix(in oklab, var(--surface-alt) 92%, #000 8%)",
    }}
  >
    {children}
  </div>
);

function ServiceCard({ s, reduced }) {
  const Icon = s.icon;
  return (
    <Link
      to={s.to}
      className={`group block rounded-2xl border p-4 sm:p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
        reduced ? "" : "transition-transform hover:scale-[1.01]"
      }`}
      style={{
        borderColor: "var(--border)",
        background: "var(--surface-alt)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
            style={{
              background: "rgba(232,80,2,0.10)",
              border: "1px solid var(--border)",
            }}
            aria-hidden
          >
            <Icon size={18} style={{ color: "var(--orange)" }} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-base sm:text-lg font-extrabold truncate" style={{ color: "var(--text)" }}>
                {s.title}
              </div>
              <span
                className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border"
                style={{
                  color: "var(--orange)",
                  borderColor: "color-mix(in oklab, var(--orange) 60%, var(--border))",
                  background: "rgba(232,80,2,0.10)",
                }}
              >
                {s.tag}
              </span>
            </div>
            <div className="mt-1 text-xs sm:text-sm" style={{ color: "var(--text-muted)" }}>
              {s.sub}
            </div>
          </div>
        </div>

        <ArrowUpRight
          size={18}
          className={`shrink-0 opacity-80 ${reduced ? "" : "transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"}`}
          style={{ color: "var(--orange)" }}
          aria-hidden
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        {s.bullets.map((b) => (
          <div key={b} className="flex items-start gap-2 text-xs sm:text-sm">
            <CheckCircle2 size={16} style={{ color: "var(--orange)" }} className="mt-[1px] shrink-0" />
            <span style={{ color: "var(--text-muted)" }}>{b}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}

function KPI({ k }) {
  const Icon = k.icon;
  return (
    <div
      className="rounded-2xl border px-3.5 py-3 sm:px-4 sm:py-3.5 flex items-center gap-3"
      style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
    >
      <div
        className="h-9 w-9 rounded-xl grid place-items-center shrink-0"
        style={{ background: "rgba(232,80,2,0.08)", border: "1px solid var(--border)" }}
        aria-hidden
      >
        <Icon size={18} style={{ color: "var(--orange)" }} />
      </div>
      <div className="min-w-0">
        <div className="text-sm sm:text-base font-semibold" style={{ color: "var(--text)" }}>
          {k.label}
        </div>
        <div className="text-[11px] sm:text-xs truncate" style={{ color: "var(--text-muted)" }}>
          {k.sub}
        </div>
      </div>
    </div>
  );
}

function HighlightCard({ h, reduced }) {
  return (
    <Link
      to={h.to}
      className={`block rounded-2xl border p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
        reduced ? "" : "transition-transform hover:scale-[1.01]"
      }`}
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in oklab, var(--surface-alt) 92%, #000 8%)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-extrabold text-base sm:text-lg" style={{ color: "var(--text)" }}>
            {h.title}
          </div>
          <div className="mt-1 text-xs sm:text-sm" style={{ color: "var(--text-muted)" }}>
            {h.sub}
          </div>
        </div>
        <ChevronRight size={18} style={{ color: "var(--orange)" }} className="shrink-0" aria-hidden />
      </div>

      <div className="mt-3 grid gap-2">
        {h.points.map((p) => (
          <div key={p} className="flex items-start gap-2 text-xs sm:text-sm">
            <span className="mt-[7px] h-1.5 w-1.5 rounded-full" style={{ background: "var(--orange)" }} />
            <span style={{ color: "var(--text-muted)" }}>{p}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}

export default function WorkPage() {
  const reduced = useReducedMotion();
  const reveal = useReveal();

  // tiny “agency” micro-copy rotation without animation-heavy stuff
  const [line, setLine] = useState(0);
  const heroLines = useMemo(
    () => [
      "Packaging + Production for creators who want to scale.",
      "Premium thumbnails, editing, and branding—built like a studio.",
      "Clean systems. Fast delivery. Consistent quality.",
    ],
    []
  );

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setLine((v) => (v + 1) % heroLines.length), 3200);
    return () => clearInterval(t);
  }, [reduced, heroLines.length]);

  return (
    <div className="min-h-screen" style={{ background: "var(--surface)" }}>
      {/* HERO */}
      <section className="pt-14 sm:pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SoftCard className="p-5 sm:p-8">
            <motion.div {...reveal.container}>
              <motion.div {...reveal.item}>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold"
                  style={{
                    borderColor: "var(--border)",
                    background: "rgba(232,80,2,0.08)",
                    color: "var(--orange)",
                  }}
                >
                  <Sparkles size={14} />
                  Shinel Studios • Creative Growth Partner
                </div>
              </motion.div>

              <motion.h1
                {...reveal.item}
                className="mt-3 text-[1.95rem] sm:text-[3rem] leading-tight font-extrabold tracking-tight"
                style={{ color: "var(--text)" }}
              >
                A studio that makes your content{" "}
                <span style={{ color: "var(--orange)" }}>look premium</span> and{" "}
                <span style={{ color: "var(--orange)" }}>perform better</span>.
              </motion.h1>

              <motion.p
                {...reveal.item}
                className="mt-2 text-sm sm:text-base max-w-2xl"
                style={{ color: "var(--text-muted)" }}
              >
                {heroLines[line]}
              </motion.p>

              {/* 2 CTAs only */}
              <motion.div {...reveal.item} className="mt-4 flex flex-col sm:flex-row gap-2.5">
                <Link
                  to="/#contact"
                  className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
                    reduced ? "" : "transition-transform hover:scale-[1.02]"
                  }`}
                  style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                >
                  Start a Project <ChevronRight size={16} className="ml-1" aria-hidden />
                </Link>

                <Link
                  to="/pricing"
                  className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
                    reduced ? "" : "transition-transform hover:scale-[1.02]"
                  }`}
                  style={{
                    color: "var(--orange)",
                    border: "1px solid var(--orange)",
                    background: "transparent",
                  }}
                >
                  View Pricing
                </Link>
              </motion.div>

              {/* KPIs (only once) */}
              <motion.div
                {...reveal.item}
                className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4"
              >
                {KPIS.map((k) => (
                  <KPI key={k.label} k={k} />
                ))}
              </motion.div>
            </motion.div>
          </SoftCard>
        </div>
      </section>

      {/* SERVICES GRID (this is your main portfolio hub) */}
      <Section
        title="Capabilities"
        sub="Open any category to see the dedicated page. Built for creators, agencies, and businesses."
        right={
          <a
            href={wa("Hi Shinel Studios! I want to discuss a project.")}
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
              reduced ? "" : "transition-transform hover:scale-[1.02]"
            }`}
            style={{
              color: "var(--orange)",
              borderColor: "var(--orange)",
              background: "transparent",
            }}
          >
            WhatsApp <ArrowUpRight size={16} />
          </a>
        }
      >
        <motion.div {...reveal.container} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {SERVICES.map((s) => (
            <motion.div key={s.title} {...reveal.item}>
              <ServiceCard s={s} reduced={reduced} />
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* SELECTED HIGHLIGHTS (proof, not repeating services text) */}
      <Section
        title="Selected Highlights"
        sub="A quick look at the systems we deliver. Tap any card to view the service page."
      >
        <motion.div {...reveal.container} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {HIGHLIGHTS.map((h) => (
            <motion.div key={h.title} {...reveal.item}>
              <HighlightCard h={h} reduced={reduced} />
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* PROCESS (agency feel) */}
      <Section
        title="How We Work"
        sub="Clear process. Fast communication. Consistent outputs."
      >
        <motion.div {...reveal.container} className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {PROCESS.map((p, idx) => (
            <motion.div key={p.title} {...reveal.item}>
              <SoftCard className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div
                    className="h-9 w-9 rounded-xl grid place-items-center font-extrabold text-sm"
                    style={{
                      background: "rgba(232,80,2,0.10)",
                      border: "1px solid var(--border)",
                      color: "var(--orange)",
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold" style={{ color: "var(--text)" }}>
                      {p.title}
                    </div>
                    <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                      {p.sub}
                    </div>
                  </div>
                </div>
              </SoftCard>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <a
            href={wa("Hi Shinel Studios! I want to start a project.")}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
              reduced ? "" : "transition-transform hover:scale-[1.02]"
            }`}
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
          >
            Message on WhatsApp <ArrowUpRight size={16} className="ml-2" />
          </a>

          <Link
            to="/#contact"
            className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
              reduced ? "" : "transition-transform hover:scale-[1.02]"
            }`}
            style={{ borderColor: "var(--border)", background: "var(--surface-alt)", color: "var(--text)" }}
          >
            Open Contact Form <ChevronRight size={16} className="ml-1" />
          </Link>
        </div>
      </Section>

      {/* MOBILE DOCK (2 actions only) */}
      <div className="fixed left-0 right-0 bottom-2 z-40 px-3 sm:hidden">
        <div
          className="mx-auto max-w-[680px] rounded-full shadow-xl flex items-center justify-between gap-2 px-2.5 py-2 backdrop-blur-md border"
          style={{
            borderColor: "var(--border)",
            background: "color-mix(in oklab, var(--header-bg) 94%, #000 6%)",
          }}
        >
          <Link
            to="/#contact"
            className="flex-1 inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
          >
            Start Project
          </Link>

          <a
            href={wa("Hi Shinel Studios! I'd like to discuss a project.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full px-3 py-2 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{ color: "var(--orange)", border: "1px solid var(--orange)" }}
            aria-label="WhatsApp"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
