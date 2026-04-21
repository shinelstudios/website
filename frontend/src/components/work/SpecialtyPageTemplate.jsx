/**
 * SpecialtyPageTemplate — shared microsite template used by the three
 * AI specialty sub-pages: /work/ai-music, /work/ai-tattoo, /work/ai-gfx.
 *
 * Driven by a config object from `src/config/specialties.js`. Same
 * shape, different content + palette, so we build once, apply three
 * times.
 *
 * Section order:
 *   1. Themed hero (kicker · display · lede · CTAs · hero art)
 *   2. Sample strip (horizontal scroll of placeholder slots; empty-state
 *      if no samples yet)
 *   3. What we handle — service chips
 *   4. Process — 3 steps specific to this specialty
 *   5. Pricing anchor
 *   6. Related specialties (the OTHER two)
 *   7. Final CTA band
 */
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle2, ImageIcon } from "lucide-react";
import MetaTags, { BreadcrumbSchema } from "../MetaTags";
import {
  Section,
  Kicker,
  Display,
  Lede,
  RevealOnScroll,
  GrainOverlay,
} from "../../design";
import { SPECIALTIES, SPECIALTY_SAMPLES } from "../../config/specialties";
import SpecialtyCard from "./SpecialtyCard";
import KineticVerb from "./KineticVerb";

function HeroArt({ slug, palette }) {
  // Tiny per-specialty graphic so each hero feels bespoke.
  const common = "absolute inset-0 w-full h-full pointer-events-none";
  if (slug === "ai-music") {
    return (
      <svg viewBox="0 0 400 400" className={common} aria-hidden="true">
        <defs>
          <radialGradient id="m-g" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={palette.accent} stopOpacity="0.5" />
            <stop offset="1" stopColor={palette.accent} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="180" fill="url(#m-g)" />
        {Array.from({ length: 80 }, (_, i) => {
          const t = (i / 80) * Math.PI * 2;
          const r = 100 + Math.sin(i * 0.7) * 30;
          const x1 = 200 + Math.cos(t) * 70;
          const y1 = 200 + Math.sin(t) * 70;
          const x2 = 200 + Math.cos(t) * r;
          const y2 = 200 + Math.sin(t) * r;
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={palette.accent}
              strokeOpacity={0.4 + (Math.sin(i * 0.3) * 0.3)}
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    );
  }
  if (slug === "ai-tattoo") {
    return (
      <svg viewBox="0 0 400 400" className={common} aria-hidden="true">
        <defs>
          <radialGradient id="t-g" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={palette.accent} stopOpacity="0.45" />
            <stop offset="1" stopColor={palette.accent} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="180" fill="url(#t-g)" />
        <g stroke={palette.accent} strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M80 260 C 130 140, 200 90, 270 140 C 330 180, 340 260, 300 320" strokeOpacity="0.75" />
          <path d="M60 200 C 110 120, 250 100, 320 160" strokeOpacity="0.45" />
          <path d="M120 320 C 170 260, 230 240, 310 280" strokeOpacity="0.55" />
          <circle cx="200" cy="200" r="14" fill={palette.accent} fillOpacity="0.85" />
          <circle cx="200" cy="200" r="38" strokeOpacity="0.65" />
        </g>
      </svg>
    );
  }
  // ai-gfx — iridescent stack
  return (
    <svg viewBox="0 0 400 400" className={common} aria-hidden="true">
      <defs>
        <radialGradient id="g-g" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={palette.accent} stopOpacity="0.45" />
          <stop offset="1" stopColor={palette.accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="180" fill="url(#g-g)" />
      <g fill="none" stroke={palette.accent} strokeWidth="2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={120 + i * 10}
            y={120 + i * 10}
            width={160 - i * 20}
            height={160 - i * 20}
            strokeOpacity={0.3 + i * 0.12}
            transform={`rotate(${i * 4} 200 200)`}
          />
        ))}
      </g>
    </svg>
  );
}

function SampleStrip({ samples, palette }) {
  if (!samples || samples.length === 0) {
    return (
      <div
        className="rounded-2xl md:rounded-3xl p-8 md:p-12 text-center hairline"
        style={{ background: "var(--surface)" }}
      >
        <div
          className="mx-auto w-14 h-14 rounded-2xl grid place-items-center mb-4"
          style={{ background: palette.accentSoft, color: palette.accent }}
          aria-hidden="true"
        >
          <ImageIcon size={22} />
        </div>
        <h3 className="text-xl md:text-2xl font-black mb-2" style={{ color: "var(--text)" }}>
          Fresh pieces incoming.
        </h3>
        <p className="max-w-md mx-auto text-sm md:text-base" style={{ color: "var(--text-muted)" }}>
          We're uploading our latest. For our most recent work on this lane,
          drop us a DM — we'll send a reel within the hour.
        </p>
      </div>
    );
  }

  return (
    <ul
      className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-4 md:mx-0 px-4 md:px-0 pb-2"
      style={{ scrollbarWidth: "thin" }}
    >
      {samples.map((s, i) => (
        <li
          key={i}
          className="snap-start shrink-0 w-[85%] md:w-[420px] rounded-xl md:rounded-2xl overflow-hidden hairline"
          style={{ background: "var(--surface-alt)" }}
        >
          <div
            className="relative w-full"
            style={{ aspectRatio: s.ratio || "16 / 9" }}
          >
            {s.kind === "video" ? (
              <video
                src={s.src}
                poster={s.poster}
                muted
                playsInline
                loop
                preload="metadata"
                className="block w-full h-full object-cover"
                aria-label={s.alt || ""}
              />
            ) : (
              <img
                src={s.src}
                alt={s.alt || ""}
                loading="lazy"
                decoding="async"
                className="block w-full h-full object-cover"
              />
            )}
          </div>
          {s.alt && (
            <div className="p-3 text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>
              {s.alt}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function SpecialtyPageTemplate({ slug }) {
  const specialty = SPECIALTIES.find((s) => s.slug === slug);
  if (!specialty) {
    return (
      <main className="min-h-[60vh] grid place-items-center px-4 py-20">
        <div className="text-center">
          <h1 className="text-2xl font-black mb-2">Specialty not found</h1>
          <Link to="/work" className="text-[var(--orange)] font-bold">← Back to work</Link>
        </div>
      </main>
    );
  }

  const { palette, title, tagline, heroCopy, services, processSteps, pricingAnchor, verb, meta } = specialty;
  const samples = SPECIALTY_SAMPLES[slug] || [];

  const whatsappHref = `https://wa.me/919876543210?text=${encodeURIComponent(
    `Hi Shinel — I'd like to talk about ${title}.`
  )}`;

  return (
    <main className="min-h-screen" style={{ color: "var(--text)" }}>
      <MetaTags
        title={meta.title}
        description={meta.description}
        path={meta.path}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Work", url: "/work" },
          { name: title, url: meta.path },
        ]}
      />

      <GrainOverlay />

      {/* HERO */}
      <Section
        size="lg"
        className="relative overflow-hidden pt-24 md:pt-28"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(800px 600px at 85% 0%, ${palette.accentSoft}, transparent 60%)`,
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          <div className="lg:col-span-7 order-1">
            <RevealOnScroll>
              <Link
                to="/work"
                className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] mb-4 focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
                style={{ color: "var(--text-muted)" }}
              >
                <ArrowLeft size={12} />
                Back to Work
              </Link>
            </RevealOnScroll>

            <RevealOnScroll delay="60ms">
              <Kicker>{heroCopy.kicker}</Kicker>
            </RevealOnScroll>

            <RevealOnScroll delay="140ms">
              <h1
                className="font-black leading-[0.95] mt-3 mb-5"
                style={{
                  color: "var(--text)",
                  fontSize: "clamp(2.5rem, 6vw, 5rem)",
                }}
              >
                {heroCopy.headline}{" "}
                <span style={{ color: palette.accent }}>
                  <KineticVerb
                    words={[verb, ...Array.from(new Set([
                      "craft",
                      "ship",
                      "land",
                    ]))]}
                    intervalMs={3200}
                  />
                </span>
                <span style={{ color: palette.accent }}>.</span>
              </h1>
            </RevealOnScroll>

            <RevealOnScroll delay="220ms">
              <Lede className="mb-8 max-w-xl">{heroCopy.lede}</Lede>
            </RevealOnScroll>

            <RevealOnScroll delay="300ms">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-full font-black text-base focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    background: palette.accent,
                    color: "#0a0a0a",
                    boxShadow: `0 10px 30px ${palette.glow}`,
                  }}
                  aria-label={`Start a ${title} project`}
                >
                  Start a project
                  <ArrowRight size={18} />
                </a>
                <a
                  href="#samples"
                  className="inline-flex items-center gap-2 px-5 py-4 rounded-full font-bold text-sm hairline hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  style={{ color: "var(--text)" }}
                >
                  See samples ↓
                </a>
              </div>
            </RevealOnScroll>
          </div>

          <div className="lg:col-span-5 order-2 relative">
            <div
              className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden hairline"
              style={{
                aspectRatio: "1 / 1",
                background: `linear-gradient(145deg, ${palette.accentSoft}, var(--surface))`,
              }}
            >
              <HeroArt slug={slug} palette={palette} />
              <span
                className="absolute top-4 left-4 text-[10px] font-black uppercase tracking-[0.25em] px-2.5 py-1 rounded-full"
                style={{ background: palette.accent, color: "#0a0a0a" }}
              >
                {specialty.shortLabel}
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* SAMPLES */}
      <Section id="samples" size="md" tone="alt" hairlineTop hairlineBot>
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <RevealOnScroll><Kicker>The work</Kicker></RevealOnScroll>
            <RevealOnScroll delay="80ms">
              <Display as="h2" size="lg" className="mt-2">
                Recent samples.
              </Display>
            </RevealOnScroll>
          </div>
          <RevealOnScroll delay="160ms">
            <span className="text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>
              Scroll horizontally →
            </span>
          </RevealOnScroll>
        </div>
        <RevealOnScroll delay="200ms">
          <SampleStrip samples={samples} palette={palette} />
        </RevealOnScroll>
      </Section>

      {/* WHAT WE HANDLE */}
      <Section size="md">
        <RevealOnScroll><Kicker>What we handle</Kicker></RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display as="h2" size="lg" className="mt-2 mb-8">
            {tagline}
          </Display>
        </RevealOnScroll>

        <ul className="flex flex-wrap gap-2 md:gap-3">
          {services.map((s, i) => (
            <RevealOnScroll key={s} delay={`${40 + i * 40}ms`}>
              <li
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm md:text-base"
                style={{
                  background: palette.accentSoft,
                  color: palette.accent,
                  border: `1px solid ${palette.accentSoft}`,
                }}
              >
                <CheckCircle2 size={14} />
                {s}
              </li>
            </RevealOnScroll>
          ))}
        </ul>
      </Section>

      {/* PROCESS */}
      <Section size="md" tone="alt" hairlineTop>
        <RevealOnScroll><Kicker>How we ship</Kicker></RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display as="h2" size="lg" className="mt-2 mb-8">
            Three clean steps.
          </Display>
        </RevealOnScroll>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {processSteps.map((step, i) => (
            <RevealOnScroll key={step.title} delay={`${60 + i * 80}ms`}>
              <li
                className="h-full p-5 md:p-6 rounded-2xl md:rounded-3xl hairline"
                style={{ background: "var(--surface)" }}
              >
                <div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm mb-4"
                  style={{ background: palette.accent, color: "#0a0a0a" }}
                  aria-hidden="true"
                >
                  {i + 1}
                </div>
                <h3 className="text-lg md:text-xl font-black mb-2" style={{ color: "var(--text)" }}>
                  {step.title}
                </h3>
                <p className="text-sm md:text-base" style={{ color: "var(--text-muted)" }}>
                  {step.body}
                </p>
              </li>
            </RevealOnScroll>
          ))}
        </ol>
      </Section>

      {/* PRICING ANCHOR */}
      <Section size="sm">
        <RevealOnScroll>
          <div
            className="rounded-2xl md:rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 hairline"
            style={{ background: "var(--surface)" }}
          >
            <div
              className="w-12 h-12 rounded-xl grid place-items-center shrink-0"
              style={{ background: palette.accentSoft, color: palette.accent }}
              aria-hidden="true"
            >
              <Sparkles size={20} />
            </div>
            <div className="flex-1">
              <div
                className="text-xs font-black uppercase tracking-[0.25em] mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                Pricing
              </div>
              <p className="text-base md:text-lg font-bold" style={{ color: "var(--text)" }}>
                {pricingAnchor}
              </p>
            </div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-black text-sm focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ background: palette.accent, color: "#0a0a0a" }}
            >
              Get a quote
              <ArrowRight size={14} />
            </a>
          </div>
        </RevealOnScroll>
      </Section>

      {/* RELATED SPECIALTIES */}
      <Section size="md" tone="alt" hairlineTop>
        <RevealOnScroll><Kicker>Also in our lanes</Kicker></RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display as="h2" size="md" className="mt-2 mb-8">
            Other specialties.
          </Display>
        </RevealOnScroll>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {SPECIALTIES.filter((s) => s.slug !== slug).map((s, i) => (
            <RevealOnScroll key={s.slug} delay={`${60 + i * 80}ms`}>
              <SpecialtyCard specialty={s} />
            </RevealOnScroll>
          ))}
        </div>
      </Section>

      {/* FINAL CTA */}
      <section
        className="w-full py-16 md:py-20"
        style={{ background: `linear-gradient(90deg, ${palette.accent}, ${palette.accentDeep})` }}
      >
        <div className="container mx-auto px-4 md:px-6 text-center text-[#0a0a0a]">
          <RevealOnScroll>
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Let's ship the next one.
            </h2>
          </RevealOnScroll>
          <RevealOnScroll delay="80ms">
            <p className="text-base md:text-lg font-semibold opacity-90 max-w-2xl mx-auto mb-8">
              Tell us the brief — we'll reply inside 3 hours with a sample
              concept or a quote. No long forms.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay="160ms">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full font-black bg-[#0a0a0a] text-white text-base md:text-lg focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                Start a project
                <ArrowRight size={18} />
              </a>
              <a
                href="mailto:hello@shinelstudios.in?subject=Project%20enquiry"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full font-bold border-2 text-base"
                style={{ borderColor: "#0a0a0a", color: "#0a0a0a" }}
              >
                Email us
              </a>
            </div>
          </RevealOnScroll>
        </div>
      </section>
    </main>
  );
}
