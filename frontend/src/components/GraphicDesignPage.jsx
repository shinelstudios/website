/**
 * GraphicDesignPage — /services/graphic-design
 *
 * Distinct from Branding and Thumbnails pages: this one covers the print- and
 * social-first deliverables that currently get lumped under Branding —
 * logos, posts, banners, flex, visiting cards. Built on the redesign v2
 * design system so every primitive used here is reusable across future
 * redesigned service pages.
 */
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Palette,
  Instagram,
  Monitor,
  CreditCard,
  Shapes,
  FileImage,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import MetaTags from "./MetaTags";
import {
  Section,
  Kicker,
  Eyebrow,
  Display,
  Lede,
  HairlineCard,
  RevealOnScroll,
  GrainOverlay,
  NumberTickIn,
} from "../design";
import { TURNAROUND } from "../config/constants";

const DELIVERABLES = [
  {
    icon: Palette,
    title: "Logos",
    blurb:
      "Wordmark, symbol, stacked, and monogram variants — all built on a grid, delivered as SVG + PNG + favicon kit.",
    bullets: [
      "3 concept directions, 2 revisions each",
      "Full brand mark system (light/dark, mono)",
      "Source files (Illustrator, Figma, Affinity)",
    ],
    turnaround: "5–7 days",
  },
  {
    icon: Instagram,
    title: "Posts & Reels Covers",
    blurb:
      "Scroll-stopping Instagram and LinkedIn posts, templated so you can ship a month of content in an afternoon.",
    bullets: [
      "10 post set or monthly retainer",
      "Editable Canva / Figma template with your fonts",
      "Carousel, single-panel, reel-cover variants",
    ],
    turnaround: "48–72 h per batch",
  },
  {
    icon: Monitor,
    title: "Banners",
    blurb:
      "YouTube channel art, LinkedIn banners, website hero art, Twitter/X headers — sized per platform spec with safe-zones baked in.",
    bullets: [
      "All device-size exports (mobile/tablet/TV-safe YT)",
      "Layered PSD / Figma provided",
      "Retina + WebP variants on request",
    ],
    turnaround: "3–5 days",
  },
  {
    icon: Shapes,
    title: "Flex & Hoardings",
    blurb:
      "Print-ready outdoor advertising at any scale. Vector-first so it stays sharp from a storefront sticker to a 40ft hoarding.",
    bullets: [
      "Print-safe CMYK + 3mm bleed included",
      "Ready-to-press PDF/X-4 or PSB on request",
      "We liaise with your print vendor if needed",
    ],
    turnaround: "4–6 days",
  },
  {
    icon: CreditCard,
    title: "Visiting Cards",
    blurb:
      "Double-sided, finish-aware (matte, spot-UV, emboss) card designs that actually get kept.",
    bullets: [
      "Standard (3.5×2in) or square formats",
      "Production-ready PDF, tested with your printer",
      "Digital signature version for email too",
    ],
    turnaround: "2–3 days",
  },
  {
    icon: FileImage,
    title: "One-offs",
    blurb:
      "Brochures, pitch decks, event invites, merch prints, menus, certificates — if it's graphic and needs to look sharp, we make it.",
    bullets: [
      "Scoped per project, no surprises",
      "Source files always yours",
      "Unlimited minor tweaks until final",
    ],
    turnaround: "Varies",
  },
];

const PROCESS = [
  { step: "01", title: "Brief", body: "15-min call or async form. We learn your brand, audience, and where this will live." },
  { step: "02", title: "Moodboard", body: "Visual directions in 48 h. You react to 3 pinned references; we lock the tone." },
  { step: "03", title: "Draft", body: "First round inside your committed turnaround. Everything in a shared Figma file you can annotate live." },
  { step: "04", title: "Revise", body: "2 rounds of tight revisions included per deliverable. Extra rounds billed hourly, transparently." },
  { step: "05", title: "Ship", body: "Final files in every format you need: SVG, PDF/X, WebP, source. Archived for a year of free re-exports." },
];

export default function GraphicDesignPage() {
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <main className="min-h-svh bg-[var(--surface)] relative">
      <MetaTags
        title="Graphic Design — Logos, Posts, Banners, Flex, Cards | Shinel Studios"
        description="Studio-grade graphic design for creators and brands: logo systems, social posts, YouTube banners, flex hoardings, visiting cards. Retainers or one-offs."
        url="https://www.shinelstudios.in/services/graphic-design"
      />

      <GrainOverlay />

      {/* Hero */}
      <Section size="lg" className="pt-24 md:pt-32">
        <div className="grid md:grid-cols-[1.3fr_1fr] gap-10 md:gap-16 items-end">
          <div>
            <RevealOnScroll>
              <Kicker className="mb-6">Graphic Design · {year}</Kicker>
            </RevealOnScroll>
            <RevealOnScroll delay="80ms">
              <Display as="h1" size="xl" className="mb-6">
                Visual identity, social art, and print —<br />
                <span style={{ color: "var(--orange)" }}>made at studio pace.</span>
              </Display>
            </RevealOnScroll>
            <RevealOnScroll delay="160ms">
              <Lede>
                From a single visiting card to a 40-foot hoarding, every graphic we ship
                is built on a grid, delivered in every format you need, and ready to scale.
                Hire us per project or keep us on retainer — the editors and artists you'll
                work with are named on <Link to="/team" style={{ color: "var(--orange)" }}>/team</Link>.
              </Lede>
            </RevealOnScroll>
          </div>

          <RevealOnScroll delay="240ms">
            <HairlineCard className="p-6 md:p-8">
              <Eyebrow className="mb-4">This year</Eyebrow>
              <div className="space-y-4">
                <StatRow label="Designs shipped" value={<NumberTickIn to={2400} suffix="+" formatter="compact" />} />
                <StatRow label="Creators served" value={<NumberTickIn to={150} suffix="+" />} />
                <StatRow label="Reply time" value="under 24 h" />
                <StatRow label="Avg revisions" value="2 rounds" />
              </div>
            </HairlineCard>
          </RevealOnScroll>
        </div>
      </Section>

      {/* Deliverables grid */}
      <Section size="lg" hairlineTop>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <Eyebrow className="mb-3">Deliverables</Eyebrow>
            <Display size="md">Everything we make, at a glance.</Display>
          </div>
          <Link to="/contact" className="btn-editorial-ghost">
            Ask about a custom scope <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DELIVERABLES.map((d, idx) => (
            <RevealOnScroll key={d.title} delay={`${(idx % 3) * 80}ms`}>
              <HairlineCard interactive className="p-6 h-full flex flex-col">
                <div
                  className="w-11 h-11 rounded-xl hairline grid place-items-center mb-5"
                  style={{ background: "var(--orange-soft)" }}
                >
                  <d.icon size={18} style={{ color: "var(--orange)" }} />
                </div>
                <Display size="sm" className="mb-2">{d.title}</Display>
                <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>
                  {d.blurb}
                </p>
                <ul className="space-y-2 mb-5 flex-1">
                  {d.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: "var(--orange)" }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="hairline-t pt-4 flex items-center justify-between text-meta" style={{ color: "var(--text-muted)" }}>
                  <span>Turnaround</span>
                  <span>{d.turnaround}</span>
                </div>
              </HairlineCard>
            </RevealOnScroll>
          ))}
        </div>
      </Section>

      {/* Process */}
      <Section size="lg" tone="alt" hairlineTop>
        <div className="max-w-3xl mb-12">
          <Eyebrow className="mb-3">Process</Eyebrow>
          <Display size="md" className="mb-4">
            Every project runs on the same five-step groove.
          </Display>
          <Lede>
            No mystery. You always know what's next, who's doing it, and when it lands.
            Most projects finish inside the initial turnaround quote.
          </Lede>
        </div>

        <div className="grid md:grid-cols-5 gap-4 md:gap-0">
          {PROCESS.map((p, i) => (
            <RevealOnScroll key={p.step} delay={`${i * 80}ms`}>
              <div
                className="h-full p-5 md:p-6 md:border-r last:border-r-0"
                style={{ borderColor: "var(--hairline)" }}
              >
                <div className="text-meta mb-4" style={{ color: "var(--orange)" }}>{p.step}</div>
                <div className="text-display-sm mb-2">{p.title}</div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {p.body}
                </p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </Section>

      {/* Retainer vs one-off */}
      <Section size="lg" hairlineTop>
        <div className="grid md:grid-cols-2 gap-6">
          <RevealOnScroll>
            <HairlineCard interactive className="p-6 md:p-8 h-full flex flex-col">
              <Eyebrow className="mb-4" style={{ color: "var(--orange)" }}>Retainer</Eyebrow>
              <Display size="sm" className="mb-3">Monthly flat fee, unlimited iterations.</Display>
              <Lede className="mb-6">
                For brands and creators shipping weekly. One ongoing channel, one
                priced-per-month fee, predictable output, no per-deliverable haggling.
              </Lede>
              <ul className="space-y-2 mb-6 flex-1">
                {[
                  "Up to N designs / month (by tier)",
                  "Unlimited minor revisions",
                  "Dedicated lead + Slack channel",
                  "Same-day response on edits",
                  "Rolling source-file archive",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: "var(--orange)" }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link to="/pricing" className="btn-editorial w-fit">
                See retainer tiers <ArrowUpRight size={14} />
              </Link>
            </HairlineCard>
          </RevealOnScroll>

          <RevealOnScroll delay="120ms">
            <HairlineCard interactive className="p-6 md:p-8 h-full flex flex-col">
              <Eyebrow className="mb-4">One-off</Eyebrow>
              <Display size="sm" className="mb-3">Project-based, quoted up-front.</Display>
              <Lede className="mb-6">
                Perfect for a one-shot identity refresh, a launch kit, or a single
                large-format print piece. Single fee, one payment, no lock-in.
              </Lede>
              <ul className="space-y-2 mb-6 flex-1">
                {[
                  "Fixed scope, fixed price",
                  "2 revision rounds included",
                  "Source files handed over at close",
                  "No monthly commitment",
                  "Turnaround per deliverable above",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link to="/contact" className="btn-editorial-ghost w-fit">
                Request a quote <ArrowRight size={14} />
              </Link>
            </HairlineCard>
          </RevealOnScroll>
        </div>
      </Section>

      {/* Closing CTA */}
      <Section size="md" tone="ink" hairlineTop>
        <div className="max-w-3xl">
          <Eyebrow className="mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>Start today</Eyebrow>
          <Display size="lg" as="h2" className="mb-6" style={{ color: "var(--paper)" }}>
            Send us the brief. We'll reply with a scope and timeline before your next meeting.
          </Display>
          <div className="flex flex-wrap gap-3">
            <Link to="/contact" className="btn-editorial">Start a project <ArrowUpRight size={14} /></Link>
            <Link to="/team" className="btn-editorial-ghost" style={{ color: "var(--paper)", borderColor: "rgba(255,255,255,0.25)" }}>
              Meet the designers <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </Section>
    </main>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between hairline-b pb-3 last:border-b-0 last:pb-0">
      <span className="text-eyebrow">{label}</span>
      <span className="text-display-sm">{value}</span>
    </div>
  );
}
