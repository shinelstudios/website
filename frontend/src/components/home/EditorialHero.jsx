/**
 * EditorialHero — new homepage hero, redesign v2.
 * Replaces HeroSection.jsx at the top of the page.
 *
 * Design principles:
 *   - Full-viewport stage. Editorial left-aligned type. No centered shout.
 *   - Two clear CTAs: primary "Start a project" (opens Calendly via onAudit),
 *     secondary "See recent work" routes to /work.
 *   - Right rail: hairline stats card with NumberTickIn numbers sourced from
 *     GlobalConfig (falls back to sensible defaults).
 *   - ScrollAurora ambient is rendered *inside* the hero (scoped to this
 *     section) so it doesn't bleed over the whole page.
 *   - 100svh on mobile so iOS address bar doesn't cut the card off.
 *   - Motion contract: transform + opacity only; RevealOnScroll handles the
 *     entrance; no per-element JS animation.
 *
 * Props:
 *   onAudit — callback (source: string) that opens the Calendly iframe.
 *             Kept API-compatible with HeroSection so homepage wiring is
 *             a one-liner swap.
 */
import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Play, Clock, Users, Film, Eye } from "lucide-react";
import {
  Kicker,
  Eyebrow,
  Display,
  Lede,
  HairlineCard,
  RevealOnScroll,
  NumberTickIn,
  ScrollAurora,
} from "../../design";
import { useGlobalConfig } from "../../context/GlobalConfigContext";

export default function EditorialHero({ onAudit }) {
  const { config } = useGlobalConfig();

  // Live stats if config provides them, else sane editorial defaults.
  const totalViewsMillions = Math.max(
    100,
    Math.round(((config?.stats?.totalReach || 100_000_000) / 1_000_000) * 10) / 10
  );
  const creatorsImpacted = config?.stats?.creatorsImpacted || 150;
  const videosShipped = config?.stats?.videosShipped || 5000;

  const handleStart = () => {
    try { onAudit?.("hero"); } catch { /* harmless */ }
  };

  return (
    <section
      className="relative overflow-hidden bg-[var(--surface)]"
      style={{ minHeight: "92svh" }}
    >
      {/* Ambient: scroll-driven aurora blob, orange glow. */}
      <ScrollAurora intensity={0.9} />

      {/* Hero content */}
      <div className="container mx-auto px-4 md:px-6 pt-28 md:pt-36 pb-20 md:pb-28 relative z-10">
        <div className="grid md:grid-cols-[1.5fr_1fr] gap-10 md:gap-16 items-end">
          <div>
            <RevealOnScroll>
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <Kicker className="!m-0">Post-production · India</Kicker>
                <span
                  className="inline-flex items-center gap-1.5 text-meta px-2.5 py-1 rounded-full"
                  style={{
                    background: "var(--orange-soft)",
                    color: "var(--orange)",
                    border: "1px solid color-mix(in oklab, var(--orange) 25%, transparent)",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--orange)", animation: "pulse 2s ease-in-out infinite" }}
                    aria-hidden="true"
                  />
                  Reply inside 24 h
                </span>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay="80ms">
              <Display as="h1" size="xl" className="mb-6 md:mb-8" style={{ lineHeight: 0.95 }}>
                We edit.<br />
                We design.<br />
                <span style={{ color: "var(--orange)" }} className="italic">Your channel grows.</span>
              </Display>
            </RevealOnScroll>

            <RevealOnScroll delay="160ms">
              <Lede className="mb-10 max-w-2xl">
                Shinel Studios is a post-production house for creators and brands.
                Long-form edits, scroll-stopping shorts, high-CTR thumbnails, and
                brand systems — shipped by named makers, tuned for the numbers
                that move channels.
              </Lede>
            </RevealOnScroll>

            <RevealOnScroll delay="240ms">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleStart}
                  className="btn-editorial"
                >
                  Start a project <ArrowUpRight size={14} />
                </button>
                <Link to="/work" className="btn-editorial-ghost">
                  <Play size={14} /> See recent work
                </Link>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay="320ms">
              <div className="mt-10 flex flex-wrap gap-6 text-meta" style={{ color: "var(--text-muted)" }}>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={12} /> Long-form in 5–10 days
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Film size={12} /> Shorts in 48–72 h
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye size={12} /> Named editor per project
                </span>
              </div>
            </RevealOnScroll>
          </div>

          <RevealOnScroll delay="240ms">
            <HairlineCard className="p-6 md:p-8">
              <Eyebrow className="mb-5">This year, in numbers</Eyebrow>
              <div className="space-y-4">
                <StatRow
                  icon={Eye}
                  label="Views delivered"
                  value={
                    <span className="text-mono-num">
                      <NumberTickIn to={totalViewsMillions} suffix="M+" />
                    </span>
                  }
                />
                <StatRow
                  icon={Users}
                  label="Creators served"
                  value={<NumberTickIn to={creatorsImpacted} suffix="+" />}
                />
                <StatRow
                  icon={Film}
                  label="Videos shipped"
                  value={
                    <span className="text-mono-num">
                      <NumberTickIn to={videosShipped} suffix="+" formatter="compact" />
                    </span>
                  }
                />
                <StatRow icon={Clock} label="Reply time" value="< 24 h" />
              </div>

              <div className="hairline-t mt-6 pt-5">
                <div className="text-meta mb-3" style={{ color: "var(--text-muted)" }}>
                  Trusted by creators across
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Gaming", "Tech", "Vlog", "Podcast", "Finance"].map((cat) => (
                    <span
                      key={cat}
                      className="text-meta px-2.5 py-1 rounded-full hairline"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </HairlineCard>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

function StatRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-baseline justify-between hairline-b pb-3 last:border-b-0 last:pb-0">
      <span className="inline-flex items-center gap-2 text-eyebrow">
        {Icon && <Icon size={11} style={{ color: "var(--orange)" }} />}
        {label}
      </span>
      <span className="text-display-sm">{value}</span>
    </div>
  );
}
