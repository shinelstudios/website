// frontend/src/components/WorkPage.jsx
/**
 * WORK PAGE (Portfolio Parent Page) — Mobile First + Premium Desktop
 * -----------------------------------------------------------------
 * Canonical links used here (clean + already in App.jsx):
 * - /thumbnails, /shorts, /video-editing, /branding, /pricing, /#contact
 *
 * NOTE:
 * - No Creators marquee (per request).
 * - No links to /tools/* because those routes are protected.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  Scissors,
  Search as SearchIcon,
  Image as ImageIcon,
  Film,
  Clapperboard,
  Sparkles,
  Zap,
  BarChart3,
  ShieldCheck,
  Timer,
  ChevronRight,
  FolderKanban,
  BadgeCheck,
} from "lucide-react";

/* -------------------------------- Helpers -------------------------------- */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduced(!!mq.matches);
    set();
    try {
      mq.addEventListener("change", set);
      return () => mq.removeEventListener("change", set);
    } catch {
      mq.addListener(set);
      return () => mq.removeListener(set);
    }
  }, []);
  return reduced;
}

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, delay: d, ease: "easeOut" } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.18, ease: "easeIn" } },
});

/* ------------------------------ WhatsApp config ------------------------------ */
const WHATSAPP_NUMBER = "918968141585";
const wa = (message) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

/* ---------------------------------- Data ---------------------------------- */
const kpis = [
  { icon: BarChart3, label: "CTR-first", sub: "thumb packaging system" },
  { icon: Zap, label: "Retention", sub: "edits that hold viewers" },
  { icon: ShieldCheck, label: "Brand-safe", sub: "clean consistent visuals" },
  { icon: Timer, label: "Fast delivery", sub: "smooth pipeline" },
];

const categories = [
  { title: "Thumbnails", icon: ImageIcon, to: "/thumbnails", sub: "CTR-first design system" },
  { title: "Shorts / Reels", icon: Clapperboard, to: "/shorts", sub: "fast pacing + captions" },
  { title: "Video Editing", icon: Film, to: "/video-editing", sub: "story + retention edits" },
  { title: "Branding", icon: Palette, to: "/branding", sub: "channel + social assets" },
  { title: "Plans / Pricing", icon: BadgeCheck, to: "/pricing", sub: "bundles for serious creators" },
];

const featured = [
  {
    title: "High-CTR Thumbnail Pack",
    tag: "GFX",
    to: "/thumbnails",
    bullets: ["concept variants", "contrast + focus", "brand typography"],
  },
  {
    title: "Shorts System",
    tag: "Editing",
    to: "/shorts",
    bullets: ["hook-first cut", "captions + pacing", "batch exports"],
  },
  {
    title: "Long-form Retention Edit",
    tag: "Editing",
    to: "/video-editing",
    bullets: ["dead-air removal", "pattern interrupts", "sound polish"],
  },
  {
    title: "Branding Kit",
    tag: "GFX",
    to: "/branding",
    bullets: ["channel consistency", "post templates", "premium look"],
  },
];

const tabs = [
  {
    key: "gfx",
    label: "GFX",
    icon: Palette,
    gradient: "linear-gradient(135deg, rgba(232,80,2,.26), rgba(255,147,87,.12))",
    tagline: "Thumbnails & visuals that stop the scroll.",
    bullets: ["CTR-first design", "brand-consistent style", "clean cinematic look"],
    links: [
      { label: "Thumbnails", icon: ImageIcon, to: "/thumbnails" },
      { label: "Branding", icon: Palette, to: "/branding" },
    ],
    waText: "Hi Shinel Studios! I want GFX (thumbnails / branding).",
  },
  {
    key: "editing",
    label: "Editing",
    icon: Scissors,
    gradient: "linear-gradient(135deg, rgba(2,132,199,.20), rgba(2,132,199,.10))",
    tagline: "Edits built for retention (shorts + long-form).",
    bullets: ["hook tightening", "pacing + structure", "FX only where it matters"],
    links: [
      { label: "Shorts / Reels", icon: Clapperboard, to: "/shorts" },
      { label: "Video Editing", icon: Film, to: "/video-editing" },
    ],
    waText: "Hi Shinel Studios! I want video editing (shorts/long-form).",
  },
  {
    key: "growth",
    label: "Growth",
    icon: SearchIcon,
    gradient: "linear-gradient(135deg, rgba(34,197,94,.16), rgba(34,197,94,.08))",
    tagline: "Packaging + planning that improves clicks & watch time.",
    bullets: ["title/thumb pairing", "content packaging system", "monthly growth bundles"],
    links: [
      { label: "Pricing / Plans", icon: BadgeCheck, to: "/pricing" },
      { label: "Start Project", icon: Sparkles, to: "/#contact" },
    ],
    waText: "Hi Shinel Studios! I want growth help (packaging/strategy).",
  },
];

/* ---------------------------------- UI ---------------------------------- */
const Blobs = ({ reduced }) => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div
      className="absolute -top-32 -left-16 h-64 w-64 blur-3xl opacity-30"
      style={{
        background: "radial-gradient(closest-side, rgba(232,80,2,.20), transparent)",
        animation: reduced ? "none" : "blob1 10s ease-in-out infinite",
      }}
    />
    <div
      className="absolute top-20 -right-20 h-72 w-72 blur-3xl opacity-22"
      style={{
        background: "radial-gradient(closest-side, rgba(255,147,87,.18), transparent)",
        animation: reduced ? "none" : "blob2 12s ease-in-out infinite",
      }}
    />
    <style>{`
      @keyframes blob1 { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(18px,10px,0)} }
      @keyframes blob2 { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(-16px,-10px,0)} }
    `}</style>
  </div>
);

const KPI = ({ Icon, label, sub }) => (
  <div
    className="rounded-2xl px-3.5 py-3 sm:px-4 sm:py-3.5 border flex items-center gap-3"
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
        {label}
      </div>
      <div className="text-[11px] sm:text-xs truncate" style={{ color: "var(--text-muted)" }}>
        {sub}
      </div>
    </div>
  </div>
);

const SectionTitle = ({ Icon, title, sub }) => (
  <div className="flex items-start gap-3">
    <div
      className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
      style={{ background: "rgba(232,80,2,0.08)", border: "1px solid var(--border)" }}
      aria-hidden
    >
      <Icon size={18} style={{ color: "var(--orange)" }} />
    </div>
    <div className="min-w-0">
      <div className="text-base sm:text-lg font-extrabold" style={{ color: "var(--text)" }}>
        {title}
      </div>
      {sub ? (
        <div className="text-xs sm:text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {sub}
        </div>
      ) : null}
    </div>
  </div>
);

const CardLink = ({ to, icon: Icon, title, sub, reduced }) => (
  <Link
    to={to}
    className={`rounded-2xl border p-4 block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
      reduced ? "" : "transition-transform hover:scale-[1.01]"
    }`}
    style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
          style={{ background: "rgba(232,80,2,0.08)", border: "1px solid var(--border)" }}
          aria-hidden
        >
          <Icon size={18} style={{ color: "var(--orange)" }} />
        </div>
        <div className="min-w-0">
          <div className="font-extrabold" style={{ color: "var(--text)" }}>
            {title}
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {sub}
          </div>
        </div>
      </div>
      <ChevronRight size={18} style={{ color: "var(--orange)" }} aria-hidden />
    </div>
  </Link>
);

const FeaturedCard = ({ item, reduced }) => (
  <Link
    to={item.to}
    className={`rounded-2xl border p-4 block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
      reduced ? "" : "transition-transform hover:scale-[1.01]"
    }`}
    style={{
      borderColor: "var(--border)",
      background: "color-mix(in oklab, var(--surface-alt) 92%, #000 8%)",
    }}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div
          className="text-xs font-semibold inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border"
          style={{ color: "var(--text)", borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <BadgeCheck size={14} style={{ color: "var(--orange)" }} aria-hidden />
          {item.tag}
        </div>

        <div className="mt-2 font-extrabold text-base" style={{ color: "var(--text)" }}>
          {item.title}
        </div>

        <ul className="mt-2 space-y-1.5">
          {item.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full" style={{ background: "var(--orange)" }} />
              <span className="opacity-90">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <ChevronRight size={18} style={{ color: "var(--orange)" }} aria-hidden />
    </div>
  </Link>
);

const Pill = ({ active, onClick, Icon, label, reduced }) => (
  <button
    type="button"
    onClick={onClick}
    role="tab"
    aria-selected={active}
    className={`relative inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
      reduced ? "" : "transition-transform hover:scale-[1.02]"
    } transition-colors`}
    style={{
      color: active ? "#fff" : "var(--text-muted)",
      border: `1px solid ${
        active ? "var(--orange)" : "color-mix(in oklab, var(--border) 90%, transparent)"
      }`,
      background: active
        ? "var(--orange)"
        : "color-mix(in oklab, var(--surface-alt) 90%, #000 10%)",
      boxShadow: active ? "0 0 0 1px rgba(0,0,0,0.35), 0 12px 30px rgba(0,0,0,0.55)" : "none",
    }}
  >
    <span
      className="inline-flex items-center justify-center h-5 w-5 rounded-full"
      style={{
        background: active ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.04)",
        border: active ? "1px solid rgba(0,0,0,0.25)" : "1px solid transparent",
      }}
      aria-hidden
    >
      <Icon size={13} />
    </span>
    {label}
  </button>
);

const ChipLink = ({ to, Icon, label }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs sm:text-sm font-semibold border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-transform hover:scale-[1.01]"
    style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }}
  >
    <Icon size={14} style={{ color: "var(--orange)" }} aria-hidden />
    {label}
  </Link>
);

function TabPanel({ tab, reduced }) {
  const Icon = tab.icon;
  return (
    <motion.div
      key={tab.key}
      {...fade(0)}
      className="rounded-2xl border"
      style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
      role="tabpanel"
    >
      <div className="p-4 sm:p-5">
        <div
          className="rounded-xl px-4 py-4 flex items-start gap-3"
          style={{ background: tab.gradient, border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
            style={{ background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.10)" }}
            aria-hidden
          >
            <Icon size={18} style={{ color: "var(--orange)" }} />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-extrabold" style={{ color: "var(--text)" }}>
              {tab.label}
            </div>
            <div className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {tab.tagline}
            </div>
          </div>
        </div>

        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
          {tab.bullets.map((b) => (
            <li key={b} className="flex items-center gap-2" style={{ color: "var(--text)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--orange)" }} />
              <span style={{ color: "var(--text-muted)" }}>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap gap-2">
          {tab.links.map((l) => (
            <ChipLink key={l.label} to={l.to} Icon={l.icon} label={l.label} />
          ))}
        </div>

        {/* 2 CTAs only: WhatsApp + Pricing */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <a
            href={wa(tab.waText)}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
              reduced ? "" : "transition-transform hover:scale-[1.01]"
            }`}
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
          >
            Message on WhatsApp
            <ChevronRight size={16} className="ml-1" aria-hidden />
          </a>

          <Link
            to="/pricing"
            className={`inline-flex items-center justify-center w-full rounded-lg px-4 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
              reduced ? "" : "transition-transform hover:scale-[1.01]"
            }`}
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
          >
            View Pricing
            <ChevronRight size={16} className="ml-1" aria-hidden />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------- Component -------------------------------- */
export default function WorkPage() {
  const reduced = usePrefersReducedMotion();
  const { pathname, hash } = useLocation();
  const [active, setActive] = useState("gfx");
  const servicesRef = useRef(null);

  // Optional: /work#editing etc. opens tabs
  useEffect(() => {
    if (pathname !== "/work") return;
    const h = (hash || "").toLowerCase();
    if (h === "#gfx") setActive("gfx");
    if (h === "#editing") setActive("editing");
    if (h === "#growth") setActive("growth");
  }, [pathname, hash]);

  const tabMap = useMemo(() => {
    const m = new Map();
    tabs.forEach((t) => m.set(t.key, t));
    return m;
  }, []);

  const activeTab = tabMap.get(active) || tabs[0];

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* HERO (tightened) */}
      <section className="relative pt-14 sm:pt-18 pb-5 sm:pb-6">
        <Blobs reduced={reduced} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div {...(reduced ? {} : fade(0))} className="text-center sm:text-left">
            <h1
              className="text-[1.9rem] leading-tight sm:text-[2.5rem] sm:leading-[1.1] font-extrabold tracking-tight"
              style={{ color: "var(--text)" }}
            >
              Portfolio that <span style={{ color: "var(--orange)" }}>wins attention</span>
            </h1>

            <p className="mt-2 text-sm sm:text-base max-w-xl mx-auto sm:mx-0" style={{ color: "var(--text-muted)" }}>
              Thumbnails, Shorts, Video Editing & Branding — built like a real YouTube growth studio.
            </p>

            {/* Only 2 CTAs here (no duplication) */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5 sm:gap-3 sm:items-center sm:justify-start justify-center">
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
                className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{ color: "var(--orange)", border: "1px solid var(--orange)", background: "transparent" }}
              >
                View Pricing
              </Link>

              {/* Optional quick jump (not a CTA duplication): scroll to services */}
              <button
                type="button"
                onClick={() => servicesRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })}
                className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--surface-alt)" }}
              >
                Services
              </button>
            </div>
          </motion.div>

          <motion.div
            {...(reduced ? {} : fade(0.06))}
            className="mt-5 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4"
          >
            {kpis.map((k) => (
              <KPI key={k.label} Icon={k.icon} label={k.label} sub={k.sub} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* PORTFOLIO HUB (tightened) */}
      <section className="pb-8 sm:pb-10" aria-label="Portfolio hub">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div {...(reduced ? {} : fade(0))}>
            <SectionTitle Icon={FolderKanban} title="Portfolio" sub="Pick a category — open the dedicated page." />
          </motion.div>

          <motion.div
            {...(reduced ? {} : fade(0.05))}
            className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4"
          >
            {categories.map((c) => (
              <CardLink key={c.title} to={c.to} icon={c.icon} title={c.title} sub={c.sub} reduced={reduced} />
            ))}
          </motion.div>

          <motion.div {...(reduced ? {} : fade(0.1))} className="mt-5">
            <SectionTitle Icon={Sparkles} title="Featured" sub="High-signal examples — click to view the page." />
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {featured.map((item) => (
                <FeaturedCard key={item.title} item={item} reduced={reduced} />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* SERVICES TABS (tightened) */}
      <section className="pb-18 sm:pb-20" aria-label="Services" ref={servicesRef}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div {...(reduced ? {} : fade(0))}>
            <SectionTitle Icon={BadgeCheck} title="Services" sub="Choose a pillar — jump to the exact page." />
          </motion.div>

          <div
            className="mt-3 rounded-full px-1.5 py-1.5 border flex flex-row flex-wrap items-center justify-center gap-1.5 bg-[color-mix(in_oklab,var(--surface-alt)_92%,#000_8%)] shadow-[0_12px_35px_rgba(0,0,0,0.45)] backdrop-blur-sm"
            style={{ borderColor: "var(--border)" }}
            role="tablist"
          >
            <Pill active={active === "gfx"} onClick={() => setActive("gfx")} Icon={Palette} label="GFX" reduced={reduced} />
            <Pill active={active === "editing"} onClick={() => setActive("editing")} Icon={Scissors} label="Editing" reduced={reduced} />
            <Pill active={active === "growth"} onClick={() => setActive("growth")} Icon={SearchIcon} label="Growth" reduced={reduced} />
          </div>

          <div className="mt-4 sm:mt-5">
            <AnimatePresence mode="wait">
              <TabPanel key={activeTab.key} tab={activeTab} reduced={reduced} />
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* MOBILE DOCK (2 actions only) */}
      <div className="fixed left-0 right-0 bottom-2 z-40 px-3 sm:hidden">
        <div
          className="mx-auto max-w-[680px] rounded-full shadow-xl flex items-center justify-between gap-2 px-2.5 py-2 bg-[color-mix(in_oklab,var(--header-bg)_94%,#000_6%)] backdrop-blur-md border"
          style={{ borderColor: "var(--border)" }}
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
