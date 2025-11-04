// frontend/src/components/WorkPage.jsx
/**
 * WORK PAGE (Portfolio + Services, high-conversion, above-the-fold focused)
 * -----------------------------------------------------------------------------
 * WHAT THIS COMPONENT DOES
 * - Presents your 3 core pillars (GFX / Editing / SEO) in a tabbed layout to keep
 *   most value above the fold on all devices.
 * - Each tab shows: 3 proof bullets → deep-link subtopics → mini-portfolio strip → CTA.
 * - Tight hero with KPIs + dual CTAs; sticky CTA dock on mobile.
 * - Honors CSS design tokens you already use (var(--surface), var(--orange), etc.).
 * - Honors reduced motion if the user requests it via system settings.
 *
 * IMPORTANT INTERACTIONS WITH OTHER FILES
 * - App routes: The subtopic links assume these routes exist (as you already added):
 *      /gfx/thumbnails        -> maps to <Thumbnails /> (in App.jsx)
 *      /gfx/branding          -> maps to <Branding />   (in App.jsx)
 *      /videos/long           -> maps to <VideoEditing />
 *      /videos/shorts         -> maps to <Shorts />
 *      /tools/seo             -> maps to <SeoTool /> and is behind <ProtectedRoute />
 *      /tools/srt             -> maps to <AutoSRTTool /> behind <ProtectedRoute />
 *   If you rename or relocate those components, update the `to:` paths below.
 *
 * - Header & Footer:
 *      <SiteHeader /> includes a “Work” nav item that should point to "/work".
 *      <SiteFooter /> style variables and container spacing are reused here.
 *
 * - Hash/CTAs:
 *      The primary CTAs use "/#contact" which is handled by your existing hash router
 *      and Contact section (see startHashActionRouter / registerHashAction in App.jsx).
 *
 * - Styles:
 *      Uses your CSS variables and Tailwind utility classes (as elsewhere in the app).
 *      No new global CSS required; optional: you can tune paddings via existing tokens.
 *
 * ACCESSIBILITY & UX
 * - Buttons/links have aria-pressed, aria-labels, and consistent focus styles inherited
 *   from your global CSS.
 * - Interactive controls (tabs) are operable and visually distinct.
 * - Motion is subtle and respects "prefers-reduced-motion".
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
/**
 * Centralized content model for each tab.
 * If you add new service pillars later, extend this object and the `tabDefs` array below.
 */
const sections = {
  gfx: {
    key: "gfx",
    title: "GFX",
    icon: Palette,
    tagline: "High-impact visuals that stop the scroll.",
    // Decorative gradient for the card cover
    gradient: "linear-gradient(145deg, rgba(232,80,2,.28), rgba(255,147,87,.18))",
    // Deep links to pages you already have
    subtopics: [
      { label: "Thumbnails", icon: ImageIcon, to: "/gfx/thumbnails" },
      { label: "Insta Posts", icon: Instagram, to: "/gfx/branding" },
      { label: "Posters", icon: Sparkles, to: "/gfx/branding" },
      { label: "Channel Banners", icon: ImageIcon, to: "/gfx/branding" },
    ],
    // Fast proof points above the fold
    bullets: [
      "+40% avg CTR lift",
      "Story framing & focal depth",
      "Brand-consistent color science",
    ],
    // Mini portfolio (swap with real images later if desired)
    portfolio: [
      { k: "g1", label: "GFX • Thumbnails", to: "/gfx/thumbnails" },
      { k: "g2", label: "GFX • Branding", to: "/gfx/branding" },
      { k: "g3", label: "GFX • Posters", to: "/gfx/branding" },
    ],
  },
  editing: {
    key: "editing",
    title: "Editing",
    icon: Scissors,
    tagline: "Retention-first edits that feel effortless.",
    gradient: "linear-gradient(145deg, rgba(2,132,199,.25), rgba(2,132,199,.1))",
    subtopics: [
      { label: "Video", icon: Film, to: "/videos/long" },
      { label: "Shorts", icon: Clapperboard, to: "/videos/shorts" },
      { label: "Reels", icon: Instagram, to: "/videos/shorts" },
      { label: "Promo Clips", icon: Sparkles, to: "/videos/shorts" },
    ],
    bullets: ["Hook mapping & pacing", "Cutting patterns that retain", "Motion/FX where it matters"],
    portfolio: [
      { k: "e1", label: "Editing • Shorts", to: "/videos/shorts" },
      { k: "e2", label: "Editing • Video", to: "/videos/long" },
      { k: "e3", label: "Editing • Promos", to: "/videos/shorts" },
    ],
  },
  seo: {
    key: "seo",
    title: "SEO",
    icon: SearchIcon,
    tagline: "Titles, descriptions & tags that rank and convert.",
    gradient: "linear-gradient(145deg, rgba(34,197,94,.23), rgba(34,197,94,.08))",
    subtopics: [
      { label: "YouTube SEO", icon: SearchIcon, to: "/tools/seo" },
      { label: "Hashtags", icon: Sparkles, to: "/tools/seo" },
      { label: "Captions", icon: Sparkles, to: "/tools/srt" },
      { label: "Engagement Hooks", icon: Sparkles, to: "/tools/seo" },
    ],
    bullets: ["Search intent → click intent", "Keyword clustering", "Multi-language metadata"],
    portfolio: [
      { k: "s1", label: "SEO • Titles & Tags", to: "/tools/seo" },
      { k: "s2", label: "SEO • Captions", to: "/tools/srt" },
      { k: "s3", label: "SEO • Hooks", to: "/tools/seo" },
    ],
  },
};

// KPI chips in the hero (fast social proof)
const kpis = [
  { icon: BarChart3, label: "+40% CTR", sub: "avg. lift on thumbnails" },
  { icon: Zap, label: "2× Watch Time", sub: "edits that retain" },
  { icon: ShieldCheck, label: "Consent-first", sub: "face/voice features" },
  { icon: Timer, label: "48–72 hr", sub: "standard turnaround" },
];

/* ------------------------------ Motion helpers ----------------------------- */
const fade = (d = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, delay: d } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.2 } },
});

/* --------------------------- Decorative background ------------------------- */
/** Soft blobs for subtle depth; pointer-events: none so they don’t block taps. */
const Blobs = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div
      className="absolute -top-32 -left-16 h-80 w-80 blur-3xl opacity-40"
      style={{ background: "radial-gradient(closest-side, rgba(232,80,2,.25), transparent)" }}
    />
    <div
      className="absolute top-24 -right-16 h-96 w-96 blur-3xl opacity-30"
      style={{ background: "radial-gradient(closest-side, rgba(255,147,87,.22), transparent)" }}
    />
  </div>
);

/* ---------------------------------- UI bits -------------------------------- */
/** KPI chip (hero) */
const KPI = ({ Icon, label, sub }) => (
  <div
    className="rounded-xl px-4 py-3 sm:px-5 sm:py-4 border"
    style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
    role="group"
    aria-label={`${label}: ${sub}`}
  >
    <div className="flex items-center gap-3">
      <div
        className="h-10 w-10 rounded-lg grid place-items-center shrink-0"
        style={{ background: "rgba(232,80,2,0.10)", border: "1px solid var(--border)" }}
        aria-hidden
      >
        <Icon size={18} style={{ color: "var(--orange)" }} />
      </div>
      <div>
        <div className="text-base sm:text-lg font-extrabold" style={{ color: "var(--text)" }}>
          {label}
        </div>
        <div className="text-xs sm:text-sm" style={{ color: "var(--text-muted)" }}>
          {sub}
        </div>
      </div>
    </div>
  </div>
);

/** Segmented-control pill for tabs (GFX / Editing / SEO) */
const Pill = ({ active, onClick, Icon, label }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
    style={{
      background: active ? "var(--orange)" : "var(--surface-alt)",
      color: active ? "#fff" : "var(--text)",
      border: `1px solid ${active ? "var(--orange)" : "var(--border)"}`,
    }}
    aria-pressed={active}
    role="tab"
    type="button"
  >
    <Icon size={16} aria-hidden />
    {label}
  </button>
);

/** Deep-link chip to existing pages (e.g., /videos/shorts) */
const SubtopicLink = ({ to, label, Icon }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
    style={{
      borderColor: "var(--border)",
      color: "var(--text)",
      background: "var(--surface)",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "var(--orange)";
      e.currentTarget.style.borderColor = "var(--orange)";
      e.currentTarget.style.color = "#fff";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "var(--surface)";
      e.currentTarget.style.borderColor = "var(--border)";
      e.currentTarget.style.color = "var(--text)";
    }}
    aria-label={label}
  >
    <Icon size={14} aria-hidden />
    {label}
  </Link>
);

/** Horizontal mini-portfolio (swipeable on mobile) */
const MiniPortfolio = ({ items }) => (
  <div
    className="flex gap-3 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory"
    style={{ WebkitOverflowScrolling: "touch" }}
    role="region"
    aria-label="Recent work highlights"
  >
    {items.map((it) => (
      <Link
        key={it.k}
        to={it.to}
        className="snap-start shrink-0 w-[72%] xs:w-[60%] sm:w-[46%] md:w-[30%] lg:w-[26%] rounded-xl overflow-hidden border hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
        style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
        aria-label={it.label}
      >
        {/* Placeholder cover; swap for real images if desired */}
        <div
          className="aspect-[16/10] w-full"
          style={{
            background:
              "repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 12px, rgba(255,255,255,.03) 12px 24px)",
          }}
        />
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
            {it.label}
          </span>
          <span
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: "rgba(232,80,2,.14)", color: "var(--orange)" }}
          >
            View
          </span>
        </div>
      </Link>
    ))}
  </div>
);

/* ----------------------------- Tabbed Content ------------------------------ */
/** One panel per tab: tagline → proof bullets → subtopics → mini-portfolio → CTA  */
const TabPanel = ({ data }) => {
  const Icon = data.icon;
  return (
    <motion.div
      key={data.key}
      {...fade(0)}
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
      role="tabpanel"
      aria-labelledby={`tab-${data.key}`}
    >
      {/* Decorative cover with gradient */}
      <div
        className="h-24 sm:h-28 w-full"
        style={{ background: data.gradient, borderBottom: "1px solid var(--border)" }}
        aria-hidden
      />
      <div className="p-4 sm:p-5">
        {/* Header area with icon + tagline */}
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
            style={{ background: "rgba(232,80,2,0.10)", border: "1px solid var(--border)" }}
            aria-hidden
          >
            <Icon size={18} style={{ color: "var(--orange)" }} />
          </div>
          <div className="min-w-0">
            <h2
              id={`tab-${data.key}`}
              className="text-lg sm:text-xl font-extrabold leading-6 truncate"
              style={{ color: "var(--text)" }}
            >
              {data.title}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {data.tagline}
            </p>
          </div>
        </div>

        {/* 3 quick proof bullets */}
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          {data.bullets.map((b) => (
            <li key={b} className="flex items-center gap-2" style={{ color: "var(--text)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--orange)" }} />
              <span className="opacity-90">{b}</span>
            </li>
          ))}
        </ul>

        {/* Linked subtopics → your existing pages/tools */}
        <div className="mt-4 flex flex-wrap gap-2">
          {data.subtopics.map((t) => (
            <SubtopicLink key={t.label} to={t.to} label={t.label} Icon={t.icon} />
          ))}
        </div>

        {/* Mini portfolio carousel */}
        <div className="mt-4">
          <MiniPortfolio items={data.portfolio} />
        </div>

        {/* Primary CTA */}
        <div className="mt-4">
          <Link
            to="/#contact"
            className="inline-flex items-center justify-center w-full rounded-lg px-4 py-2.75 text-sm font-semibold text-white transition-transform duration-150 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
          >
            Discuss {data.title}
            <ChevronRight size={16} className="ml-1" aria-hidden />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

/* -------------------------------- Component -------------------------------- */
export default function WorkPage() {
  // Default active tab: GFX (change here if you want another default)
  const [active, setActive] = useState("gfx");

  // Respect users who prefer reduced motion
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // Tab metadata (label + icon). Add entries here to add new tabs.
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
      {/* HERO: compact and conversion-focused */}
      <section className="relative pt-22 sm:pt-24 pb-4">
        <Blobs />
        <div className="container mx-auto px-3 sm:px-4 md:px-6 text-center relative">
          <motion.h1
            {...(prefersReduced ? {} : fade(0))}
            className="text-[2rem] sm:text-5xl font-extrabold tracking-tight"
            style={{ color: "var(--text)" }}
          >
            Our <span style={{ color: "var(--orange)" }}>Work</span>
          </motion.h1>

          <motion.p
            {...(prefersReduced ? {} : fade(0.05))}
            className="mt-2 text-sm sm:text-lg max-w-2xl mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            GFX, Editing, and SEO — built for clicks, watch time, and growth.
          </motion.p>

          {/* Fast social proof */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {kpis.map((k) => (
              <KPI key={k.label} Icon={k.icon} label={k.label} sub={k.sub} />
            ))}
          </div>

          {/* Primary CTAs */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              to="/#contact"
              className="inline-flex items-center rounded-full px-5 py-2.75 text-sm sm:text-base font-semibold text-white transition-transform duration-150 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
              style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
            >
              Start a Project
              <ChevronRight size={16} className="ml-1" aria-hidden />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center rounded-full px-5 py-2.75 text-sm sm:text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
              style={{ color: "var(--orange)", border: "1px solid var(--orange)", background: "transparent" }}
            >
              Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* TABS: keeps most content above the fold */}
      <section className="pb-14 sm:pb-16">
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          {/* Segmented control */}
          <div
            className="rounded-2xl p-1 border flex items-center justify-between gap-1 overflow-hidden"
            style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
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
              />
            ))}
          </div>

          {/* Active panel */}
          <div className="mt-4">
            <AnimatePresence mode="wait">
              <TabPanel key={active} data={sections[active]} />
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* STICKY CTA DOCK (mobile only) for quick conversion */}
      <div className="fixed left-0 right-0 bottom-2 z-40 px-3 sm:hidden" aria-hidden={false}>
        <div
          className="mx-auto max-w-[680px] rounded-full shadow-lg flex items-center justify-between gap-2 px-2 py-2"
          style={{
            background: "color-mix(in oklab, var(--header-bg) 92%, transparent)",
            backdropFilter: "blur(6px)",
            border: "1px solid var(--border)",
          }}
        >
          <Link
            to="/#contact"
            className="flex-1 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
          >
            Talk to Us
          </Link>
          <Link
            to="/work#"
            className="inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{ color: "var(--orange)", border: "1px solid var(--orange)" }}
            aria-label="Open portfolio"
          >
            Portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}
