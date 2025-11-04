// src/components/Pricing.jsx
import React from "react";
import { motion } from "framer-motion";
import { formatINR, track } from "../lib/helpers"; // currency + lightweight analytics

const CATS = [ /* your CATS array */ ];
const RATE_CARD = { /* your RATE_CARD object */ };
const PLANS = { /* your PLANS object */ };
const POPULAR = { /* your POPULAR object */ };
const Pricing = ({ onOpenCalendly }) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const isTouch =
    typeof window !== "undefined" &&
    window.matchMedia?.("(hover: none)").matches;

  // Detect mobile viewport (≤ 640px) for carousel mode
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 640px)").matches
      : false
  );
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  /* ---------- Tabs ---------- */
  const CATS = [
    {
      k: "gaming",
      label: "Gaming",
      headline: "Level up your channel, not just your KD",
      sub: "Hook-first edits, cracked thumbnails, and highlight engines built for any title.",
    },
    {
      k: "vlog",
      label: "Vlogs",
      headline: "Turn everyday moments into bingeable stories",
      sub: "Cleaner cuts, clearer hooks, and packaging that earns the click.",
    },
    {
      k: "talking",
      label: "Talking Heads & Motion Graphics",
      headline: "Ship long-form, spin a clips flywheel",
      sub: "Studio-grade edits, transcripts, and steady clips for discovery.",
    },
    {
      k: "others",
      label: "Others",
      headline: "Custom mix for brands & niches",
      sub: "Tell us your format and goals — we’ll tailor a plan.",
    },
  ];
  const [cat, setCat] = React.useState("gaming");

  /* ---------- INTERNAL rate card (not rendered) ---------- */
  const RATE_CARD = {
    gaming: { thumb: 170, short: 200, longPerMin: 200 },
    vlog: { longPerMin: 200, longPerMinCine: 250, thumb: 170, short: 200 },
    talking: { editPerMin: 180, clip: 220, thumb: 170 }, // podcasts merged here
  };

  const estimatePlan = (catKey, spec = {}) => {
    const r = RATE_CARD[catKey] || {};
    let total = 0;

    if (catKey === "gaming") {
      total += (spec.thumbs || 0) * (r.thumb || 0);
      total += (spec.shorts || 0) * (r.short || 0);
      total += (spec.longMins || 0) * (r.longPerMin || 0);
    } else if (catKey === "vlog") {
      const cine = Math.min(spec.longMins || 0, spec.cineMins || 0);
      const normal = Math.max(0, (spec.longMins || 0) - cine);
      total += (spec.thumbs || 0) * (r.thumb || 0);
      total += (spec.shorts || 0) * (r.short || 0);
      total += cine * (r.longPerMinCine || r.longPerMin || 0);
      total += normal * (r.longPerMin || 0);
    } else if (catKey === "talking") {
      total += (spec.episodeMins || 0) * (r.editPerMin || 0);
      total += (spec.clips || 0) * (r.clip || 0);
      total += (spec.thumbs || 0) * (r.thumb || 0);
    }
    return Math.round(total || 0);
  };

  /* ---------- Plans (public prices) ---------- */
  const PLANS = {
    gaming: [
      {
        name: "Starter — Warm-Up",
        tag: "Kickoff + mini audit",
        key: "starter",
        cta: "Start Warm-Up",
        priceInr: 599, // one-time
        billing: "one-time",
        bullets: [
          "1 Thumbnail (AI-assisted + human polish)",
          "1 Short (≤50s) with kinetic captions & sound design",
          "Mini channel audit (hooks, metadata, packaging)",
        ],
        includes: [
          "A/B-ready: 2 thumbnail comps (color & text style)",
          "Custom short thumbnail",
          "Turnaround: 48–72h",
        ],
        spec: { thumbs: 1, shorts: 1, longMins: 0 },
      },
      {
        name: "Clutch Highlights",
        tag: "Predictable Shorts growth",
        key: "highlights",
        cta: "Book Highlights",
        priceInr: 6999, // monthly
        billing: "monthly",
        bullets: [
          "30 Gaming Shorts (feed-optimized)",
          "30 custom short thumbnails",
          "Subscribe/Follow animation (YT/IG/TikTok)",
        ],
        includes: [
          "Meme timing • emoji accents • SFX",
          "5 AI-made transitions/hooks",
          "Captions + title suggestions",
        ],
        spec: { shorts: 30, thumbs: 4, longMins: 0 },
      },
      {
        name: "Rank Up",
        tag: "Thumbnails + long-form rhythm",
        key: "rankup",
        cta: "Book Rank Up",
        priceInr: 5499, // monthly
        billing: "monthly",
        bullets: [
          "2 Long-form edits (≤8 min each)",
          "2 Thumbnails (A/B-ready) + 5 Live thumbnails",
          "Titles, tags & descriptions (full SEO for these videos)",
        ],
        includes: [
          "Intros/outros • memes • sound design • captions",
          "Transitions • zooms • subscribe animations",
          "AI transitions & custom templates where needed",
        ],
        spec: { thumbs: 7, shorts: 0, longMins: 16 },
      },
      {
        name: "Pro League",
        tag: "End-to-end growth engine",
        key: "pro",
        cta: "Book Pro League",
        priceInr: 13499, // monthly
        billing: "monthly",
        bullets: [
          "4 Long-form edits (≤8 min each)",
          "4 Video thumbnails A/B + 6 Live thumbnails",
          "20 Shorts",
        ],
        includes: [
          "All Rank Up inclusions + free SEO for live streams",
          "Access to Shinel SEO Tools",
          "SLA: 48–72h, priority queueing",
        ],
        spec: { thumbs: 10, shorts: 20, longMins: 32 },
      },
    ],
    vlog: [
      {
        name: "Starter — Spark",
        tag: "Kickoff + mini audit",
        key: "starter",
        cta: "Start Spark",
        priceInr: 699, // one-time
        billing: "one-time",
        bullets: ["1 Thumbnail", "1 Short/Reel (≤50s)", "Mini audit (storyline & packaging)"],
        includes: [
          "AI hook help for openers",
          "Color & audio cleanup on the short",
          "Basic SEO checklist",
        ],
        spec: { thumbs: 1, shorts: 1, longMins: 0, cineMins: 0 },
      },
      {
        name: "Daily Driver",
        tag: "Reliable cadence",
        key: "driver",
        cta: "Book Daily Driver",
        priceInr: 9999, // monthly
        billing: "monthly",
        bullets: ["3 Vlog edits (≤8 min each)", "3 Thumbnails", "9 Reels/Shorts (platform-ready)"],
        includes: [
          "Color grading • captions where needed",
          "Intro/Outro for videos",
          "AI short thumbnails • AI opening beat/transition",
        ],
        spec: { longMins: 24, cineMins: 0, thumbs: 3, shorts: 9 },
      },
      {
        name: "Storyteller",
        tag: "Narrative & cinematic polish",
        key: "story",
        cta: "Book Storyteller",
        priceInr: 7499, // monthly
        billing: "monthly",
        bullets: ["2 Cinematic vlogs (≤8 min)", "2 Thumbnails", "6 Reels/Shorts"],
        includes: [
          "Music curation & SFX",
          "Cinematic LUT pass + stabilization",
          "Color grading • captions • AI opener/transition",
        ],
        spec: { longMins: 16, cineMins: 16, thumbs: 2, shorts: 6 },
      },
      {
        name: "Creator Suite",
        tag: "Scale up everything",
        key: "suite",
        cta: "Book Creator Suite",
        priceInr: 17999, // monthly
        billing: "monthly",
        bullets: [
          "4 Vlog edits (≤8 min) + 2 Cinematic vlogs (≤8 min)",
          "6 Thumbnails (A/B-ready)",
          "15 Reels/Shorts + brand-kit starter",
        ],
        includes: [
          "Title/Thumb concept board",
          "AI thumbnail credits",
          "Early access to Shinel AI tools",
        ],
        spec: { longMins: 48, cineMins: 16, thumbs: 6, shorts: 15 },
      },
    ],
    talking: [
      {
        name: "Starter — On Air",
        tag: "One-time",
        key: "starter",
        cta: "Start On Air",
        priceInr: 999, // one-time
        billing: "one-time",
        bullets: ["1 Thumbnail", "1 Short/Reel (≤50s)"],
        includes: [
          "Motion-graphics lower-third & speaker ID",
          "Kinetic captions on the short",
          "Basic SEO checklist • 48–72h SLA",
        ],
        spec: { episodeMins: 0, clips: 1, thumbs: 1 },
      },
      {
        name: "Studio",
        tag: "Long-form + clips flywheel",
        key: "studio",
        cta: "Book Studio",
        priceInr: 13999, // monthly
        billing: "monthly",
        bullets: [
          "2 Full videos (≤8 min) edited",
          "12 Clips (30–60s) • 2 Thumbnails",
          "Show notes + timestamps",
        ],
        includes: [
          "Transcription & filler-word removal pass",
          "Noise cleanup preset • light motion graphics",
          "72h SLA",
        ],
        spec: { episodeMins: 16, clips: 12, thumbs: 2 },
      },
      {
        name: "Clips Engine",
        tag: "High-volume discovery",
        key: "clips",
        cta: "Book Clips Engine",
        priceInr: 14999, // monthly
        billing: "monthly",
        bullets: [
          "30 Clips (30–60s) from long recordings",
          "Square/vertical exports",
          "30 clip covers",
        ],
        includes: [
          "Multi-cam auto-framing",
          "Kinetic captions • subscribe/follow animations",
          "Topic tags & title suggestions",
        ],
        spec: { episodeMins: 0, clips: 30, thumbs: 4 },
      },
      {
        name: "Network",
        tag: "Scale your show",
        key: "network",
        cta: "Book Network",
        priceInr: 24999, // monthly
        billing: "monthly",
        bullets: [
          "4 Videos (≤8 min) • 20 Clips",
          "4 Thumbnails",
          "Chapters + blog draft",
        ],
        includes: [
          "Template pack (FFX/MOGRT)",
          "Brand kit & style guide",
          "Access to Shinel SEO tools",
        ],
        spec: { episodeMins: 32, clips: 20, thumbs: 4 },
      },
    ],
    others: [
      {
        name: "Explainer Sprint",
        tag: "Business • Product • SaaS",
        key: "explainer",
        cta: "Plan an Explainer",
        priceInr: null, // quote
        billing: "quote",
        bullets: [
          "30–60s product explainer or ad",
          "Script assist + storyboard frames",
          "On-brand motion graphics",
        ],
        includes: [
          "Voiceover guidance (or provided VO)",
          "Two styleboards to choose from",
          "Square/vertical exports + captions",
        ],
        spec: {},
      },
      {
        name: "Custom Builder",
        tag: "Strategy-first",
        key: "custom",
        cta: "Build My Plan",
        priceInr: null, // quote only
        billing: "quote",
        bullets: [
          "Mix editing • thumbnails • shorts • motion graphics",
          "Ideal for brands, explainers, tutorials & more",
          "We’ll scope to your cadence and KPIs",
        ],
        includes: [
          "Free 15-min audit call",
          "Roadmap & sample concepts before you commit",
          "Tailored SLA & handoff",
        ],
        spec: {},
      },
    ],
  };

  // "Most Popular" mapping per category
  const POPULAR = {
    gaming: "highlights",
    vlog: "driver",
    talking: "clips",
    others: "explainer",
  };

  const plans = PLANS[cat] || [];
  const [openIdx, setOpenIdx] = React.useState(null);

  const handleCTA = (plan) => {
    const estimate = estimatePlan(cat, plan.spec || {});
    try {
      track("pricing_estimate", { category: cat, plan: plan.key, estimate });
      track("plan_click", { category: cat, plan: plan.key, billing: plan.billing });
    } catch {}
    onOpenCalendly?.();
  };

  const PriceBadge = ({ priceInr, billing }) => {
    if (priceInr == null) {
      return (
        <span
          className="ml-2 inline-flex items-center text-xs px-2 py-1 rounded-full border"
          style={{ color: "var(--orange)", borderColor: "var(--orange)" }}
        >
          Get Quote
        </span>
      );
    }
    return (
      <span
        className="ml-2 inline-flex items-center text-xs px-2 py-1 rounded-full"
        style={{ background: "rgba(232,80,2,.12)", color: "var(--orange)" }}
      >
        {formatINR(priceInr)} {billing === "monthly" ? "/mo" : ""}
      </span>
    );
  };

  /* ---------- Mobile carousel logic ---------- */
  const railRef = React.useRef(null);
  const [idx, setIdx] = React.useState(0);

   const scrollToIndex = React.useCallback((i) => {
    const rail = railRef.current;
    if (!rail) return;
    const clamped = Math.max(0, Math.min(i, plans.length - 1));
    const child = rail.children[clamped];
    if (!child) return;
    child.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
    setIdx(clamped);
  }, [plans.length, reduceMotion]);

  const onPrev = React.useCallback(() => scrollToIndex(idx - 1), [idx, scrollToIndex]);
  const onNext = React.useCallback(() => scrollToIndex(idx + 1), [idx, scrollToIndex]);

  // Update active index on user scroll (mobile)
  React.useEffect(() => {
    if (!isMobile || !railRef.current) return;
    const rail = railRef.current;
    let t = null;
    const onScroll = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const { scrollLeft, clientWidth } = rail;
        const newIdx = Math.round(scrollLeft / clientWidth);
        setIdx(Math.max(0, Math.min(newIdx, plans.length - 1)));
      }, 60);
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => rail.removeEventListener("scroll", onScroll);
  }, [isMobile, plans.length]);

  // Keyboard arrow support
  const onKeyDownCarousel = React.useCallback((e) => {
  if (e.key === "ArrowRight") {
    e.preventDefault();
    onNext();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    onPrev();
  }
}, [onNext, onPrev]);

  return (
    <section
      id="pricing"
      className="py-18 md:py-20 relative overflow-hidden"
      style={{ background: "var(--surface)" }}
      aria-labelledby="pricing-heading"
    >
      {/* Ambient glows (light & CPU-friendly) */}
      {!reduceMotion && (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(232,80,2,.14), rgba(232,80,2,0) 70%)",
              filter: "blur(10px)",
            }}
            initial={{ opacity: 0.18 }}
            animate={{ opacity: [0.12, 0.18, 0.15] }}
            transition={{ duration: 7.5, repeat: Infinity }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -bottom-40 -right-40 w-[420px] h-[420px] rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,147,87,.14), rgba(255,147,87,0) 70%)",
              filter: "blur(12px)",
            }}
            initial={{ opacity: 0.18 }}
            animate={{ opacity: [0.1, 0.18, 0.14] }}
            transition={{ duration: 7.8, repeat: Infinity, delay: 0.4 }}
          />
        </>
      )}

      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6">
          <motion.h2
            id="pricing-heading"
            className="text-3xl md:text-4xl font-bold font-['Poppins']"
            style={{ color: "var(--text)" }}
            initial={reduceMotion ? {} : { opacity: 0, y: 12 }}
            whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
          >
            Simple, Proven Packages — tuned for your category
          </motion.h2>
          <motion.p
            className="mt-2 text-sm md:text-base"
            style={{ color: "var(--text-muted)" }}
            initial={reduceMotion ? {} : { opacity: 0, y: 8 }}
            whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            Gaming, Vlogs, Talking Heads & Motion Graphics — or build your own.
          </motion.p>
        </div>

        {/* Category Tabs */}
        <motion.div
          className="mx-auto mb-5 md:mb-7 flex w-full max-w-[1080px] items-center justify-center gap-2 flex-wrap"
          initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.28 }}
        >
          {CATS.map((c) => {
            const on = c.k === cat;
            return (
              <button
                key={c.k}
                onClick={() => {
  setCat(c.k);
  setOpenIdx(null);
  setIdx(0);
  requestAnimationFrame(() => scrollToIndex(0)); // reset rail scroll on tab switch
}}

                className={`rounded-full px-4 py-2 text-sm font-semibold border ${
                  on ? "shadow" : ""
                }`}
                style={{
                  color: "var(--text)",
                  borderColor: "var(--border)",
                  background: on ? "rgba(232,80,2,.12)" : "var(--surface-alt)",
                }}
                aria-pressed={on}
                aria-label={`Select ${c.label}`}
              >
                {c.label}
              </button>
            );
          })}
        </motion.div>

        {/* Category headline */}
        <div className="text-center mb-6">
          <div className="text-lg md:text-xl font-semibold" style={{ color: "var(--text)" }}>
            {CATS.find((x) => x.k === cat)?.headline}
          </div>
          <div className="text-sm md:text-base mt-1" style={{ color: "var(--text-muted)" }}>
            {CATS.find((x) => x.k === cat)?.sub}
          </div>
        </div>

        {/* ---------- DESKTOP/TABLET GRID ---------- */}
        {!isMobile && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map((p, i) => {
              const open = openIdx === i;
              const isPopular = POPULAR[cat] === p.key;
              return (
                <motion.article
                  key={`${cat}-${p.key}`}
                  initial={{ opacity: 0, y: 22, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
                  {...(!isTouch && !reduceMotion ? { whileHover: { y: -3 } } : {})}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="group relative rounded-2xl p-6 border"
                  style={{
                    background: "var(--surface-alt)",
                    borderColor: "var(--border)",
                    boxShadow: "0 10px 22px rgba(0,0,0,0.10)",
                  }}
                  aria-label={`${p.name} plan`}
                >
                  {/* Popular ribbon */}
                  {isPopular && (
                    <div
                      className="absolute -top-3 left-4 text-[11px] px-2 py-1 rounded-full font-semibold"
                      style={{
                        background: "linear-gradient(90deg, var(--orange), #ff9357)",
                        color: "#fff",
                        boxShadow: "0 6px 14px rgba(232,80,2,.25)",
                      }}
                    >
                      Most Popular
                    </div>
                  )}

                  <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                    {p.tag || "\u00A0"} {p.billing && p.billing !== "quote" ? "• " + p.billing : ""}
                    {p.billing === "monthly" ? " • cancel anytime" : ""}
                  </div>

                  <h3 className="text-xl font-semibold flex items-center flex-wrap" style={{ color: "var(--text)" }}>
                    <span>{p.name}</span>
                    <PriceBadge priceInr={p.priceInr} billing={p.billing} />
                  </h3>

                  <ul className="mt-4 space-y-2" style={{ color: "var(--text)" }}>
                    {p.bullets.map((b, bi) => (
                      <li key={bi} className="flex items-start gap-2">
                        <span aria-hidden>•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Expandable details */}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setOpenIdx(open ? null : i)}
                      className="text-sm underline"
                      style={{ color: "var(--orange)" }}
                      aria-expanded={open}
                      aria-controls={`inc-${cat}-${i}`}
                    >
                      {open ? "Hide details" : "What’s included"}
                    </button>
                    <motion.div
                      id={`inc-${cat}-${i}`}
                      initial={false}
                      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden" }}
                      className="mt-2"
                    >
                      <ul className="text-sm space-y-1.5" style={{ color: "var(--text-muted)" }}>
                        {p.includes?.map((x, xi) => (
                          <li key={xi} className="flex items-start gap-2">
                            <span aria-hidden>–</span>
                            <span>{x}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  </div>

                  <button
                    onClick={() => handleCTA(p)}
                    className="w-full mt-6 rounded-xl py-3 font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                    style={{
                      background: "linear-gradient(90deg, var(--orange), #ff9357)",
                      boxShadow: "0 12px 26px rgba(232,80,2,0.25)",
                    }}
                    aria-label={p.cta}
                  >
                    {p.cta}
                  </button>

                  <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    No payment needed to preview concepts.
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {/* ---------- MOBILE CAROUSEL ---------- */}
        {isMobile && (
          <div
            role="region"
            aria-label={`${cat} plans carousel`}
            className="relative"
            onKeyDown={onKeyDownCarousel}
          >
            <div aria-live="polite" className="sr-only">
  {`Plan ${idx + 1} of ${plans.length}`}
</div>

            {/* Arrow buttons */}
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                type="button"
                onClick={onPrev}
                className="rounded-full border px-3 py-1 text-sm"
                style={{
                  color: "var(--text)",
                  borderColor: "var(--border)",
                  background: "var(--surface-alt)",
                }}
                aria-label="Previous plan"
                disabled={idx <= 0}
              >
                ←
              </button>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                Use ← → to browse
              </div>
              <button
                type="button"
                onClick={onNext}
                className="rounded-full border px-3 py-1 text-sm"
                style={{
                  color: "var(--text)",
                  borderColor: "var(--border)",
                  background: "var(--surface-alt)",
                }}
                aria-label="Next plan"
                disabled={idx >= plans.length - 1}
              >
                →
              </button>
            </div>

            {/* Rail */}
            <div
              ref={railRef}
              tabIndex={0}
              aria-roledescription="carousel"
              aria-label="Plans"
              className="flex overflow-x-auto snap-x snap-mandatory scroll-px-4 gap-4 px-1 no-scrollbar"
              style={{
                scrollBehavior: reduceMotion ? "auto" : "smooth",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {plans.map((p, i) => {
                const isPopular = POPULAR[cat] === p.key;
                const open = openIdx === i;
                return (
                  <article
                    key={`${cat}-${p.key}`}
                    className="snap-start shrink-0 w-[92%] mx-2 rounded-2xl p-5 border"
                    style={{
                      background: "var(--surface-alt)",
                      borderColor: "var(--border)",
                      boxShadow: "0 10px 22px rgba(0,0,0,0.10)",
                    }}
                    aria-label={`${p.name} plan`}
                  >
                    {/* Popular ribbon */}
                    {isPopular && (
                      <div
                        className="inline-block -mt-3 mb-2 text-[11px] px-2 py-1 rounded-full font-semibold"
                        style={{
                          background: "linear-gradient(90deg, var(--orange), #ff9357)",
                          color: "#fff",
                          boxShadow: "0 6px 14px rgba(232,80,2,.25)",
                        }}
                      >
                        Most Popular
                      </div>
                    )}

                    <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      {p.tag || "\u00A0"}{" "}
                      {p.billing && p.billing !== "quote" ? "• " + p.billing : ""}{" "}
                      {p.billing === "monthly" ? "• cancel anytime" : ""}
                    </div>

                    <h3
                      className="text-lg font-semibold flex items-center flex-wrap"
                      style={{ color: "var(--text)" }}
                    >
                      <span>{p.name}</span>
                      <PriceBadge priceInr={p.priceInr} billing={p.billing} />
                    </h3>

                    <ul className="mt-3 space-y-1.5 text-sm" style={{ color: "var(--text)" }}>
                      {p.bullets.map((b, bi) => (
                        <li key={bi} className="flex items-start gap-2">
                          <span aria-hidden>•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Expandable details */}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setOpenIdx(open ? null : i)}
                        className="text-sm underline"
                        style={{ color: "var(--orange)" }}
                        aria-expanded={open}
                        aria-controls={`m-inc-${cat}-${i}`}
                      >
                        {open ? "Hide details" : "What’s included"}
                      </button>
                      <div
                        id={`m-inc-${cat}-${i}`}
                        hidden={!open}
                        className="mt-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <ul className="text-sm space-y-1.5">
                          {p.includes?.map((x, xi) => (
                            <li key={xi} className="flex items-start gap-2">
                              <span aria-hidden>–</span>
                              <span>{x}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCTA(p)}
                      className="w-full mt-4 rounded-xl py-3 font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                      style={{
                        background: "linear-gradient(90deg, var(--orange), #ff9357)",
                        boxShadow: "0 12px 26px rgba(232,80,2,0.25)",
                      }}
                      aria-label={p.cta}
                    >
                      {p.cta} →
                    </button>

                    <div className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                      No payment needed to preview concepts.
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Dots */}
            <div className="mt-3 flex items-center justify-center gap-2" aria-hidden="true">
              {plans.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToIndex(i)}
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: i === idx ? "var(--orange)" : "var(--border)",
                    transform: i === idx ? "scale(1.2)" : "scale(1)",
                    transition: "transform .2s ease",
                  }}
                  aria-label={`Go to plan ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add-ons & Always included */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            className="rounded-2xl p-5 border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>
              Add-ons (any tier)
            </div>
            <ul className="text-sm space-y-1.5" style={{ color: "var(--text-muted)" }}>
              <li>Rush 24h: +20% cost</li>
              <li>Extra A/B thumbnail: +30%</li>
              <li>Advanced motion pack (long-form): +₹200/min</li>
              <li>Multi-language captions (2× SRT): +₹2,000/video</li>
              <li>
                Face-swap / Voice generation: custom — consent-first & policy-compliant (get quote)
              </li>
            </ul>
          </div>
          <div
            className="rounded-2xl p-5 border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>
              Always included
            </div>
            <ul className="text-sm space-y-1.5" style={{ color: "var(--text-muted)" }}>
              <li>1 major + 2 minor revision rounds per deliverable</li>
              <li>
                Organized handoff, export presets, project files on request (very large timelines
                may add cost)
              </li>
              <li>
                AI for speed (transcripts, hook/metadata/thumbnail ideation) + human-directed finish
              </li>
              <li>Standard turnaround: 48–72 hours (coordinated queues on larger plans)</li>
            </ul>
          </div>
        </div>

        {/* reassurance */}
        <div className="text-center mt-8">
          <p className="text-sm md:text-base" style={{ color: "var(--text-muted)" }}>
            Prices in INR. Taxes extra if applicable. Don’t love the first delivery? We’ll revise or
            credit your trial.
          </p>
        </div>
      </div>

      {/* Hide scrollbar utility (scoped) */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
};

export default Pricing;
