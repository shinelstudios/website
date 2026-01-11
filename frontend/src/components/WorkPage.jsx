// frontend/src/components/WorkPage.jsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  ArrowRight,
} from "lucide-react";

/* ------------------------------ Config (edit) ------------------------------ */
const WHATSAPP_NUMBER = "91XXXXXXXXXX"; // ✅ change to your real number (no +)

/* --------------------------------- Helpers -------------------------------- */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(!!mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function makeWhatsAppLink(text) {
  const msg = encodeURIComponent(text);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
}

/* ---------------------------------- Data ---------------------------------- */
const sections = {
  gfx: {
    key: "gfx",
    title: "GFX",
    icon: Palette,
    tagline: "High-impact visuals that stop the scroll.",
    gradient: "linear-gradient(135deg, rgba(232,80,2,.30), rgba(255,147,87,.18))",
    bullets: ["CTR-first concepts", "Clean typography & contrast", "Brand-consistent packaging"],
    subtopics: [
      { label: "Thumbnails", icon: ImageIcon, to: "/gfx/thumbnails" },
      { label: "Branding / Social", icon: Sparkles, to: "/gfx/branding" },
    ],
    whatsappText: "Hi Shinel Studios, I want help with GFX (thumbnails/branding).",
  },
  editing: {
    key: "editing",
    title: "Editing",
    icon: Scissors,
    tagline: "Long-form + Shorts edits tuned for retention.",
    gradient: "linear-gradient(135deg, rgba(2,132,199,.26), rgba(2,132,199,.12))",
    bullets: ["Hook tightening", "Pacing + pattern interrupts", "Clean beats + sound polish"],
    subtopics: [
      { label: "Long Videos", icon: Film, to: "/videos/long" },
      { label: "Shorts / Reels", icon: Clapperboard, to: "/videos/shorts" },
    ],
    whatsappText: "Hi Shinel Studios, I want help with video editing (long/shorts).",
  },
  seo: {
    key: "seo",
    title: "SEO",
    icon: SearchIcon,
    tagline: "Titles + descriptions + tags that rank and convert.",
    gradient: "linear-gradient(135deg, rgba(34,197,94,.26), rgba(34,197,94,.10))",
    bullets: ["Search intent → click intent", "Keyword clustering", "Retention-friendly metadata"],
    subtopics: [
      { label: "SEO Toolkit", icon: SearchIcon, to: "/tools/seo" },
      { label: "SRT / Captions", icon: Sparkles, to: "/tools/srt" },
    ],
    whatsappText: "Hi Shinel Studios, I want help with YouTube SEO (titles/desc/tags).",
  },
};

const kpis = [
  { icon: BarChart3, label: "+40% CTR", sub: "avg. lift on thumbnails" },
  { icon: Zap, label: "2× Watch Time", sub: "retention-focused edits" },
  { icon: ShieldCheck, label: "Consent-first", sub: "face/voice features" },
  { icon: Timer, label: "48–72 hr", sub: "standard turnaround" },
];

const portfolioCategories = [
  { title: "Thumbnails", icon: ImageIcon, to: "/gfx/thumbnails", sub: "CTR-first packaging" },
  { title: "Long-form Edits", icon: Film, to: "/videos/long", sub: "Retention + story beats" },
  { title: "Shorts / Reels", icon: Clapperboard, to: "/videos/shorts", sub: "Fast pace, clean hooks" },
  { title: "Branding", icon: Palette, to: "/gfx/branding", sub: "Social + channel assets" },
  { title: "SEO Toolkit", icon: SearchIcon, to: "/tools/seo", sub: "Titles, desc, tags" },
];

const featuredWork = [
  {
    title: "High-CTR Thumbnail Pack",
    tag: "GFX",
    to: "/gfx/thumbnails",
    bullets: ["2–3 concepts per video", "Contrast + focal depth", "Brand-safe typography"],
  },
  {
    title: "Retention Edit (Long-form)",
    tag: "Editing",
    to: "/videos/long",
    bullets: ["Hook tightening", "Pattern interrupts", "Dead-air removal"],
  },
  {
    title: "Shorts System (Reels/Shorts)",
    tag: "Editing",
    to: "/videos/shorts",
    bullets: ["Punchy pacing", "Caption styling", "Batch exports"],
  },
  {
    title: "SEO Metadata Sprint",
    tag: "SEO",
    to: "/tools/seo",
    bullets: ["Intent mapping", "CTR-first titles", "Keyword clustering"],
  },
];

/* ------------------------------ Motion helpers ----------------------------- */
const fade = (d = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.24, delay: d, ease: "easeOut" } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.16, ease: "easeIn" } },
});

/* --------------------------- Decorative background ------------------------- */
const Blobs = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div
      className="absolute -top-32 -left-16 h-64 w-64 blur-3xl opacity-35"
      style={{ background: "radial-gradient(closest-side, rgba(232,80,2,.22), transparent)" }}
    />
    <div
      className="absolute top-16 -right-16 h-72 w-72 blur-3xl opacity-25"
      style={{ background: "radial-gradient(closest-side, rgba(255,147,87,.2), transparent)" }}
    />
  </div>
);

/* ---------------------------------- UI bits -------------------------------- */
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

const SectionTitle = ({ icon: Icon, title, sub }) => (
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
  </div>
);

const CategoryCard = ({ Icon, title, sub, to, reducedMotion }) => (
  <Link
    to={to}
    className={`rounded-2xl border p-4 block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
      reducedMotion ? "" : "transition-transform hover:scale-[1.01]"
    }`}
    style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
    aria-label={title}
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

const FeaturedCard = ({ item, reducedMotion }) => (
  <Link
    to={item.to}
    className={`rounded-2xl border p-4 block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
      reducedMotion ? "" : "transition-transform hover:scale-[1.01]"
    }`}
    style={{
      borderColor: "var(--border)",
      background: "color-mix(in oklab, var(--surface-alt) 92%, #000 8%)",
    }}
    aria-label={item.title}
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

const Pill = ({ active, onClick, Icon, label, reducedMotion }) => (
  <button
    onClick={onClick}
    type="button"
    role="tab"
    aria-selected={active}
    className={`relative inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
      reducedMotion ? "" : "transition-transform hover:scale-[1.03]"
    } transition-colors`}
    style={{
      color: active ? "#fff" : "var(--text-muted)",
      border: `1px solid ${
        active
          ? "var(--orange)"
          : "color-mix(in oklab, var(--border) 90%, transparent)"
      }`,
      background: active
        ? "var(--orange)"
        : "color-mix(in oklab, var(--surface-alt) 90%, #000 10%)",
      boxShadow: active ? "0 0 0 1px rgba(0,0,0,0.35), 0 12px 30px rgba(0,0,0,0.55)" : "none",
    }}
    id={`tab-${label.toLowerCase()}`}
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
    <span className="whitespace-nowrap">{label}</span>
  </button>
);

const SubtopicLink = ({ to, label, Icon }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] transition-colors"
    style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--surface)" }}
    aria-label={label}
  >
    <Icon size={14} aria-hidden />
    <span className="truncate">{label}</span>
  </Link>
);

const TabPanel = ({ data, reducedMotion }) => {
  const Icon = data.icon;
  const whatsappHref = makeWhatsAppLink(data.whatsappText);

  return (
    <motion.div
      key={data.key}
      {...fade(0)}
      className="rounded-2xl border"
      style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
      role="tabpanel"
      aria-label={`${data.title} panel`}
    >
      <div className="p-4 sm:p-5">
        <div
          className="rounded-xl px-3.5 py-3.5 sm:px-4 sm:py-4 flex items-start sm:items-center gap-3 mb-3.5"
          style={{ background: data.gradient, border: "1px solid rgba(255,255,255,0.06)" }}
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
            <h3 className="text-base sm:text-lg font-extrabold leading-tight" style={{ color: "var(--text)" }}>
              {data.title}
            </h3>
            <p className="text-xs sm:text-sm mt-1 leading-snug" style={{ color: "var(--text-muted)" }}>
              {data.tagline}
            </p>
          </div>
        </div>

        <ul className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 text-xs sm:text-sm">
          {data.bullets.map((b) => (
            <li key={b} className="flex items-center gap-2" style={{ color: "var(--text)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--orange)" }} />
              <span className="opacity-90">{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap gap-2">
          {data.subtopics.map((t) => (
            <SubtopicLink key={t.label} to={t.to} label={t.label} Icon={t.icon} />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
              reducedMotion ? "" : "transition-transform hover:scale-[1.01]"
            }`}
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
          >
            Message on WhatsApp
            <ChevronRight size={16} className="ml-1" aria-hidden />
          </a>

          <Link
            to="/pricing"
            className={`inline-flex items-center justify-center w-full rounded-lg px-4 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
              reducedMotion ? "" : "transition-transform hover:scale-[1.01]"
            }`}
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
            }}
          >
            View Pricing
            <ChevronRight size={16} className="ml-1" aria-hidden />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

/* -------------------------------- Component -------------------------------- */
export default function WorkPage() {
  const reducedMotion = usePrefersReducedMotion();
  const [active, setActive] = useState("gfx");

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ If user lands on /work#portfolio or /work#services etc., auto-scroll.
  useEffect(() => {
    if (!location?.hash) return;
    const id = location.hash.replace("#", "");
    setTimeout(() => scrollToId(id), 50);
  }, [location?.hash]);

  const tabDefs = useMemo(
    () => [
      { key: "gfx", label: "GFX", Icon: sections.gfx.icon },
      { key: "editing", label: "Editing", Icon: sections.editing.icon },
      { key: "seo", label: "SEO", Icon: sections.seo.icon },
    ],
    []
  );

  const goToContact = useCallback(() => {
    // Works from /work page: navigate to home with hash
    navigate("/#contact");
  }, [navigate]);

  const goToPortfolio = useCallback(() => {
    scrollToId("portfolio");
  }, []);

  const goToServices = useCallback(() => {
    scrollToId("services");
  }, []);

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* HERO */}
      <section className="relative pt-16 sm:pt-20 pb-6 sm:pb-8">
        <Blobs />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div {...(reducedMotion ? {} : fade(0))} className="text-center sm:text-left">
            <h1
              className="text-[2rem] leading-tight sm:text-[2.6rem] sm:leading-[1.1] font-extrabold tracking-tight"
              style={{ color: "var(--text)" }}
            >
              Portfolio that{" "}
              <span style={{ color: "var(--orange)" }}>wins attention</span>
            </h1>

            <p className="mt-2 text-sm sm:text-base max-w-xl mx-auto sm:mx-0" style={{ color: "var(--text-muted)" }}>
              GFX, long-form edits, shorts and SEO — packaged to improve clicks, watch time and brand recall.
            </p>

            {/* ✅ No duplications: 1 primary CTA + 2 secondary anchors */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5 sm:gap-3 sm:items-center sm:justify-start justify-center">
              <button
                type="button"
                onClick={goToContact}
                className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)] ${
                  reducedMotion ? "" : "transition-transform hover:scale-[1.02]"
                }`}
                style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
              >
                Start a Project <ArrowRight size={16} className="ml-2" aria-hidden />
              </button>

              <button
                type="button"
                onClick={goToPortfolio}
                className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{ color: "var(--orange)", border: "1px solid var(--orange)", background: "transparent" }}
              >
                View Portfolio <ChevronRight size={16} className="ml-1" aria-hidden />
              </button>

              <button
                type="button"
                onClick={goToServices}
                className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm sm:text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--surface-alt)" }}
              >
                Services <ChevronRight size={16} className="ml-1" aria-hidden />
              </button>
            </div>
          </motion.div>

          <motion.div
            {...(reducedMotion ? {} : fade(0.05))}
            className="mt-6 sm:mt-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4"
          >
            {kpis.map((k) => (
              <KPI key={k.label} Icon={k.icon} label={k.label} sub={k.sub} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* PORTFOLIO (PARENT HUB) */}
      <section id="portfolio" className="pb-8 sm:pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div {...(reducedMotion ? {} : fade(0))}>
            <SectionTitle icon={FolderKanban} title="Portfolio" sub="Browse categories or jump into featured work." />
          </motion.div>

          {/* Categories */}
          <motion.div
            {...(reducedMotion ? {} : fade(0.05))}
            className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4"
          >
            {portfolioCategories.map((c) => (
              <CategoryCard
                key={c.title}
                Icon={c.icon}
                title={c.title}
                sub={c.sub}
                to={c.to}
                reducedMotion={reducedMotion}
              />
            ))}
          </motion.div>

          {/* Featured */}
          <motion.div {...(reducedMotion ? {} : fade(0.1))} className="mt-6">
            <SectionTitle icon={Sparkles} title="Featured" sub="High-signal examples — click to explore details." />
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {featuredWork.map((item) => (
                <FeaturedCard key={item.title} item={item} reducedMotion={reducedMotion} />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* SERVICES (PILLARS) */}
      <section id="services" className="pb-16 sm:pb-18">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div {...(reducedMotion ? {} : fade(0))}>
            <SectionTitle
              icon={BadgeCheck}
              title="Services"
              sub="Choose one pillar — or combine for best results."
            />
          </motion.div>

          <div
            className="mt-4 rounded-full px-1.5 py-1.5 border flex flex-row flex-wrap items-center justify-center gap-1.5 bg-[color-mix(in_oklab,var(--surface-alt)_92%,#000_8%)] shadow-[0_12px_35px_rgba(0,0,0,0.45)] backdrop-blur-sm"
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
                reducedMotion={reducedMotion}
              />
            ))}
          </div>

          <div className="mt-5 sm:mt-6">
            <AnimatePresence mode="wait">
              <TabPanel key={active} data={sections[active]} reducedMotion={reducedMotion} />
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* MOBILE STICKY CTA DOCK (no duplication: 2 clear actions only) */}
      <div className="fixed left-0 right-0 bottom-2 z-40 px-3 sm:hidden">
        <div
          className="mx-auto max-w-[680px] rounded-full shadow-xl flex items-center justify-between gap-2 px-2.5 py-2 bg-[color-mix(in_oklab,var(--header-bg)_94%,#000_6%)] backdrop-blur-md border"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            onClick={goToContact}
            className="flex-1 inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
          >
            Start Project
          </button>

          <button
            type="button"
            onClick={goToPortfolio}
            className="inline-flex items-center rounded-full px-3 py-2 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            style={{ color: "var(--orange)", border: "1px solid var(--orange)" }}
            aria-label="Open portfolio"
          >
            Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}
