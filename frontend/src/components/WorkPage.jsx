// frontend/src/components/WorkPage.jsx
/**
 * WORK PAGE (Portfolio + Services, high-conversion, mobile-first)
 * ---------------------------------------------------------------------------
 * - 3 core pillars (GFX / Editing / SEO) in a tabbed layout.
 * - Each tab: tagline → proof bullets → deep links → CTA.
 * - Tight hero with KPIs + dual CTAs; sticky CTA dock on mobile.
 * - Mobile-first layout, cleaner visuals, CPU-friendly animations.
 * - Honors CSS design tokens (var(--surface), var(--orange), etc.).
 * - Respects reduced motion.
 */

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  Scissors,
  Search as SearchIcon,
  Image as ImageIcon,
  Film,
  Clapperboard,
  Instagram,
  Sparkles,
  Zap,
  BarChart3,
  ShieldCheck,
  Timer,
  ChevronRight,
} from "lucide-react";

/* ---------------------------------- Data ---------------------------------- */
const sections = {
  gfx: {
    key: "gfx",
    title: "GFX",
    icon: Palette,
    tagline: "High-impact visuals that stop the scroll.",
    gradient: "linear-gradient(135deg, rgba(232,80,2,.30), rgba(255,147,87,.18))",
    subtopics: [
      { label: "Thumbnails", icon: ImageIcon, to: "/gfx/thumbnails" },
      { label: "Instagram Posts", icon: Instagram, to: "/gfx/branding" },
      { label: "Posters", icon: Sparkles, to: "/gfx/branding" },
      { label: "Channel Banners", icon: ImageIcon, to: "/gfx/branding" },
    ],
    bullets: [
      "+40% avg CTR lift",
      "Story framing & focal depth",
      "Brand-consistent colour science",
    ],
  },
  editing: {
    key: "editing",
    title: "Editing",
    icon: Scissors,
    tagline: "Long-form and vertical edits tuned for retention.",
    gradient: "linear-gradient(135deg, rgba(2,132,199,.26), rgba(2,132,199,.12))",
    subtopics: [
      { label: "Long Videos", icon: Film, to: "/videos/long" },
      {
        label: "Vertical Shorts / Reels",
        icon: Clapperboard,
        to: "/videos/shorts",
      },
    ],
    bullets: [
      "Hook mapping & pacing",
      "Cutting patterns that retain",
      "Motion/FX where it matters",
    ],
  },
  seo: {
    key: "seo",
    title: "SEO",
    icon: SearchIcon,
    tagline: "Titles, descriptions & tags that rank and convert.",
    gradient: "linear-gradient(135deg, rgba(34,197,94,.26), rgba(34,197,94,.10))",
    subtopics: [
      { label: "YouTube SEO", icon: SearchIcon, to: "/tools/seo" },
      { label: "Hashtags", icon: Sparkles, to: "/tools/seo" },
      { label: "Captions", icon: Sparkles, to: "/tools/srt" },
      { label: "Engagement Hooks", icon: Sparkles, to: "/tools/seo" },
    ],
    bullets: [
      "Search intent → click intent",
      "Keyword clustering",
      "Multi-language metadata",
    ],
  },
};

const kpis = [
  { icon: BarChart3, label: "+40% CTR", sub: "avg. lift on thumbnails" },
  { icon: Zap, label: "2× Watch Time", sub: "edits that retain" },
  { icon: ShieldCheck, label: "Consent-first", sub: "face/voice features" },
  { icon: Timer, label: "48–72 hr", sub: "standard turnaround" },
];

/* ------------------------------ Motion helpers ----------------------------- */
const fade = (d = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, delay: d, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: { duration: 0.16, ease: "easeIn" },
  },
});

/* --------------------------- Decorative background ------------------------- */
const Blobs = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div
      className="absolute -top-32 -left-16 h-64 w-64 blur-3xl opacity-35"
      style={{
        background:
          "radial-gradient(closest-side, rgba(232,80,2,.22), transparent)",
      }}
    />
    <div
      className="absolute top-16 -right-16 h-72 w-72 blur-3xl opacity-25"
      style={{
        background:
          "radial-gradient(closest-side, rgba(255,147,87,.2), transparent)",
      }}
    />
  </div>
);

/* ---------------------------------- UI bits -------------------------------- */
const KPI = ({ Icon, label, sub }) => (
  <div
    className="rounded-2xl px-3.5 py-3 sm:px-4 sm:py-3.5 border flex items-center gap-3"
    style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
    role="group"
    aria-label={`${label}: ${sub}`}
  >
    <div
      className="h-9 w-9 rounded-xl grid place-items-center shrink-0"
      style={{
        background: "rgba(232,80,2,0.08)",
        border: "1px solid var(--border)",
      }}
      aria-hidden
    >
      <Icon size={18} style={{ color: "var(--orange)" }} />
    </div>
    <div className="min-w-0">
      <div
        className="text-sm sm:text-base font-semibold"
        style={{ color: "var(--text)" }}
      >
        {label}
      </div>
      <div
        className="text-[11px] sm:text-xs truncate"
        style={{ color: "var(--text-muted)" }}
      >
        {sub}
      </div>
    </div>
  </div>
);

/** Segmented-control pill for tabs – mobile-first, compact, CPU-friendly */
const Pill = ({ active, onClick, Icon, label, reducedMotion }) => (
  <button
    onClick={onClick}
    type="button"
    role="tab"
    aria-pressed={active}
    className={`relative inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
      reducedMotion ? "" : "transition-transform hover:scale-[1.03]"
    } transition-colors`}
    style={{
      color: active ? "#fff" : "var(--text-muted)",
      border: `1px solid ${
        active ? "var(--orange)" : "color-mix(in oklab, var(--border) 90%, transparent)"
      }`,
      background: active
        ? "var(--orange)"
        : "color-mix(in oklab, var(--surface-alt) 90%, #000 10%)",
      boxShadow: active
        ? "0 0 0 1px rgba(0,0,0,0.4), 0 12px 30px rgba(0,0,0,0.6)"
        : "none",
    }}
  >
    <span
      className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[11px]"
      style={{
        background: active ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.04)",
        border: active ? "1px solid rgba(0,0,0,0.25)" : "1px solid transparent",
      }}
      aria-hidden
    >
      <Icon size={13} />
    </span>
    <span className="whitespace-nowrap">{label}</span>
  </button>
);

const SubtopicLink = ({ to, label, Icon }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-colors"
    style={{
      borderColor: "var(--border)",
      color: "var(--text)",
      background: "var(--surface)",
    }}
    aria-label={label}
  >
    <Icon size={14} aria-hidden />
    <span className="truncate">{label}</span>
  </Link>
);

/* ----------------------------- Tabbed Content ------------------------------ */
const TabPanel = ({ data }) => {
  const Icon = data.icon;

  // 👉 Replace with your real WhatsApp number, e.g. "919876543210"
  const whatsappNumber = "91XXXXXXXXXX";
  const message = encodeURIComponent(
    `Hi Shinel Studios, I'd like to discuss ${data.title} work.`
  );
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <motion.div
      key={data.key}
      {...fade(0)}
      className="rounded-2xl border"
      style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
      role="tabpanel"
      aria-labelledby={`tab-${data.key}`}
    >
      <div className="p-4 sm:p-5">
        {/* Header with gradient background */}
        <div
          className="rounded-xl px-3.5 py-3.5 sm:px-4 sm:py-4 flex items-start sm:items-center gap-3 mb-3.5"
          style={{
            background: data.gradient,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
            style={{
              background: "rgba(0,0,0,0.18)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
            aria-hidden
          >
            <Icon size={18} style={{ color: "var(--orange)" }} />
          </div>
          <div className="min-w-0">
            <h2
              id={`tab-${data.key}`}
              className="text-base sm:text-lg font-extrabold leading-tight"
              style={{ color: "var(--text)" }}
            >
              {data.title}
            </h2>
            <p
              className="text-xs sm:text-sm mt-1 leading-snug"
              style={{ color: "var(--text-muted)" }}
            >
              {data.tagline}
            </p>
          </div>
        </div>

        {/* Proof bullets */}
        <ul className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 text-xs sm:text-sm">
          {data.bullets.map((b) => (
            <li
              key={b}
              className="flex items-center gap-2"
              style={{ color: "var(--text)" }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--orange)" }}
              />
              <span className="opacity-90">{b}</span>
            </li>
          ))}
        </ul>

        {/* Linked subtopics */}
        <div className="mt-3 flex flex-wrap gap-2">
          {data.subtopics.map((t) => (
            <SubtopicLink
              key={t.label}
              to={t.to}
              label={t.label}
              Icon={t.icon}
            />
          ))}
        </div>

        {/* WhatsApp CTA */}
        <div className="mt-4">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-transform duration-150 hover:scale-[1.01]"
            style={{
              background: "linear-gradient(90deg, var(--orange), #ff9357)",
            }}
          >
            Discuss this on WhatsApp
            <ChevronRight size={16} className="ml-1" aria-hidden />
          </a>
        </div>
      </div>
    </motion.div>
  );
};

/* -------------------------------- Component -------------------------------- */
export default function WorkPage() {
  const [active, setActive] = useState("gfx");

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const tabDefs = useMemo(
    () => [
      { key: "gfx", label: "GFX", Icon: sections.gfx.icon },
      { key: "editing", label: "Editing", Icon: sections.editing.icon },
      { key: "seo", label: "SEO", Icon: sections.seo.icon },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* HERO – mobile-first vertical stack */}
      <section className="relative pt-16 sm:pt-20 pb-6 sm:pb-8">
        <Blobs />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            {...(prefersReduced ? {} : fade(0))}
            className="text-center sm:text-left"
          >
            <h1
              className="text-[2rem] leading-tight sm:text-[2.6rem] sm:leading-[1.1] font-extrabold tracking-tight"
              style={{ color: "var(--text)" }}
            >
              Work that{" "}
              <span style={{ color: "var(--orange)" }}>wins attention</span>
            </h1>
            <p
              className="mt-2 text-sm sm:text-base max-w-xl mx-auto sm:mx-0"
              style={{ color: "var(--text-muted)" }}
            >
              GFX, long-form edits, shorts and SEO — packaged together to improve
              clicks, watch time and brand recall.
            </p>

            {/* Primary CTAs */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5 sm:gap-3 sm:items-center sm:justify-start justify-center">
              <Link
                to="/#contact"
                className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-transform duration-150 hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(90deg, var(--orange), #ff9357)",
                }}
              >
                Start a Project
                <ChevronRight size={16} className="ml-1" aria-hidden />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{
                  color: "var(--orange)",
                  border: "1px solid var(--orange)",
                  background: "transparent",
                }}
              >
                View Pricing
              </Link>
            </div>
          </motion.div>

          {/* KPIs – mobile 2x2 grid, desktop 4-column */}
          <motion.div
            {...(prefersReduced ? {} : fade(0.05))}
            className="mt-6 sm:mt-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4"
          >
            {kpis.map((k) => (
              <KPI key={k.label} Icon={k.icon} label={k.label} sub={k.sub} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* TABS / SECTIONS */}
      <section className="pb-16 sm:pb-18">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Tab selector – centred on mobile, inline on desktop */}
          <div
            className="rounded-full px-1.5 py-1.5 border flex flex-row flex-wrap items-center justify-center gap-1.5 bg-[color-mix(in_oklab,var(--surface-alt)_92%,#000_8%)] shadow-[0_12px_35px_rgba(0,0,0,0.45)] backdrop-blur-sm"
            style={{ borderColor: "var(--border)" }}
            role="tablist"
            aria-label="Work sections"
          >
            {tabDefs.map(({ key, label, Icon }) => (
              <Pill
                key={key}
                active={active === key}
                onClick={() => setActive(key)}
                Icon={Icon}
                label={label}
                reducedMotion={prefersReduced}
              />
            ))}
          </div>

          {/* Panel */}
          <div className="mt-5 sm:mt-6">
            <AnimatePresence mode="wait">
              <TabPanel key={active} data={sections[active]} />
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* STICKY CTA DOCK (mobile only) */}
      <div
        className="fixed left-0 right-0 bottom-2 z-40 px-3 sm:hidden"
        aria-hidden={false}
      >
        <div
          className="mx-auto max-w-[680px] rounded-full shadow-xl flex items-center justify-between gap-2 px-2.5 py-2 bg-[color-mix(in_oklab,var(--header-bg)_94%,#000_6%)] backdrop-blur-md border"
          style={{ borderColor: "var(--border)" }}
        >
          <Link
            to="/#contact"
            className="flex-1 inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{
              background: "linear-gradient(90deg, var(--orange), #ff9357)",
            }}
          >
            Talk to Us
          </Link>
          <Link
            to="/work"
            className="inline-flex items-center rounded-full px-3 py-2 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{
              color: "var(--orange)",
              border: "1px solid var(--orange)",
            }}
            aria-label="Open portfolio"
          >
            Portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}
