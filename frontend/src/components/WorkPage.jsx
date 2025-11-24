// frontend/src/components/WorkPage.jsx
/**
 * WORK PAGE (Portfolio + Services, high-conversion, above-the-fold focused)
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
      { label: "Insta Posts", icon: Instagram, to: "/gfx/branding" },
      { label: "Posters", icon: Sparkles, to: "/gfx/branding" },
      { label: "Channel Banners", icon: ImageIcon, to: "/gfx/branding" },
    ],
    bullets: [
      "+40% avg CTR lift",
      "Story framing & focal depth",
      "Brand-consistent color science",
    ],
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
    gradient: "linear-gradient(135deg, rgba(2,132,199,.26), rgba(2,132,199,.12))",
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
    gradient: "linear-gradient(135deg, rgba(34,197,94,.26), rgba(34,197,94,.10))",
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

const kpis = [
  { icon: BarChart3, label: "+40% CTR", sub: "avg. lift on thumbnails" },
  { icon: Zap, label: "2× Watch Time", sub: "edits that retain" },
  { icon: ShieldCheck, label: "Consent-first", sub: "face/voice features" },
  { icon: Timer, label: "48–72 hr", sub: "standard turnaround" },
];

/* ------------------------------ Motion helpers ----------------------------- */
const fade = (d = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, delay: d, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: 4,
    transition: { duration: 0.16, ease: "easeIn" },
  },
});

/* --------------------------- Decorative background ------------------------- */
const Blobs = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div
      className="absolute -top-32 -left-16 h-64 w-64 blur-3xl opacity-35"
      style={{ background: "radial-gradient(closest-side, rgba(232,80,2,.22), transparent)" }}
    />
    <div
      className="absolute top-20 -right-16 h-72 w-72 blur-3xl opacity-25"
      style={{ background: "radial-gradient(closest-side, rgba(255,147,87,.2), transparent)" }}
    />
  </div>
);

/* ---------------------------------- UI bits -------------------------------- */
const KPI = ({ Icon, label, sub }) => (
  <div
    className="rounded-xl px-3.5 py-3 sm:px-4 sm:py-3.5 border flex items-center gap-3"
    style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
    role="group"
    aria-label={`${label}: ${sub}`}
  >
    <div
      className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
      style={{ background: "rgba(232,80,2,0.08)", border: "1px solid var(--border)" }}
      aria-hidden
    >
      <Icon size={18} style={{ color: "var(--orange)" }} />
    </div>
    <div className="min-w-0">
      <div className="text-sm sm:text-base font-semibold" style={{ color: "var(--text)" }}>
        {label}
      </div>
      <div className="text-[11px] sm:text-xs truncate" style={{ color: "var(--text-muted)" }}>
        {sub}
      </div>
    </div>
  </div>
);

/** Segmented-control pill for tabs – centered, compact, premium look */
const Pill = ({ active, onClick, Icon, label }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-2 px-4 py-1.75 rounded-full text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
    style={{
      background: active ? "var(--orange)" : "var(--surface)",
      color: active ? "#fff" : "var(--text)",
      border: `1px solid ${active ? "var(--orange)" : "var(--border)"}`,
      boxShadow: active ? "0 0 0 1px rgba(0,0,0,0.4)" : "none",
    }}
    aria-pressed={active}
    role="tab"
    type="button"
  >
    <Icon size={15} aria-hidden />
    {label}
  </button>
);

const SubtopicLink = ({ to, label, Icon }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
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

  // 👇 Replace with your real WhatsApp number, e.g. "919876543210"
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
      <div className="p-3.5 sm:p-4">
        {/* Header with gradient background */}
        <div
          className="rounded-xl px-3.5 py-3 sm:px-4 sm:py-3 flex items-start sm:items-center gap-3 mb-3"
          style={{
            background: data.gradient,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
            style={{ background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.08)" }}
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
            <li key={b} className="flex items-center gap-2" style={{ color: "var(--text)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--orange)" }} />
              <span className="opacity-90">{b}</span>
            </li>
          ))}
        </ul>

        {/* Linked subtopics */}
        <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
          {data.subtopics.map((t) => (
            <SubtopicLink key={t.label} to={t.to} label={t.label} Icon={t.icon} />
          ))}
        </div>

        {/* WhatsApp CTA */}
        <div className="mt-4">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-transform duration-150 hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
          >
            Discuss on WhatsApp
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
      {/* HERO */}
      <section className="relative pt-20 sm:pt-24 pb-4 sm:pb-5">
        <Blobs />
        <div className="container mx-auto px-3 sm:px-4 md:px-6 text-center relative">
          <motion.h1
            {...(prefersReduced ? {} : fade(0))}
            className="text-[1.9rem] sm:text-5xl font-extrabold tracking-tight"
            style={{ color: "var(--text)" }}
          >
            Our <span style={{ color: "var(--orange)" }}>Work</span>
          </motion.h1>

          <motion.p
            {...(prefersReduced ? {} : fade(0.05))}
            className="mt-2 text-sm sm:text-lg max-w-2xl mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            GFX, Editing and SEO — clean, conversion-focused work built for clicks, watch time and
            brand recall.
          </motion.p>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 max-w-4xl mx-auto">
            {kpis.map((k) => (
              <KPI key={k.label} Icon={k.icon} label={k.label} sub={k.sub} />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {/* ✅ Use #/contact to work with hashAction router */}
            <Link
              to="/#/contact"
              className="inline-flex items-center rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold text-white transition-transform duration-150 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
              style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
            >
              Start a Project
              <ChevronRight size={16} className="ml-1" aria-hidden />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
              style={{ color: "var(--orange)", border: "1px solid var(--orange)", background: "transparent" }}
            >
              Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* TABS */}
      <section className="pb-14 sm:pb-16">
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          <div
            className="rounded-2xl p-1.5 border bg-[var(--surface-alt)] flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto"
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
              />
            ))}
          </div>

          <div className="mt-4">
            <AnimatePresence mode="wait">
              <TabPanel key={active} data={sections[active]} />
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* STICKY CTA DOCK (mobile only) */}
      <div className="fixed left-0 right-0 bottom-2 z-40 px-3 sm:hidden" aria-hidden={false}>
        <div
          className="mx-auto max-w-[680px] rounded-full shadow-lg flex items-center justify-between gap-2 px-2 py-2"
          style={{
            background: "color-mix(in oklab, var(--header-bg) 92%, transparent)",
            backdropFilter: "blur(6px)",
            border: "1px solid var(--border)",
          }}
        >
          {/* ✅ Mobile CTA also uses #/contact for hash router */}
          <Link
            to="/#/contact"
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
