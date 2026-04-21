/**
 * EditorialHero v2 — redesign v2 home hero.
 *
 * Two signature beats, both mobile-aware:
 *   (A) Cosmos backdrop: aurora blob + sparse twinkling starfield + rare
 *       diagonal shooting-star streaks (desktop only). Learned from the old
 *       HeroSection's galaxy vibe, rebuilt on the new perf contract.
 *   (B) Kinetic portfolio grid: a 3×2 bento of real thumbnails from the live
 *       inventory. Every ~6 s a random tile "peeks" — title + category
 *       crossfade in then fade back. Hover-peek on desktop.
 *
 * Mobile:
 *   - The bento grid stays visible but collapses from 3×2 to 2×2, below the
 *     headline and CTAs. Good visual proof-of-work without dominating a
 *     5 in phone screen.
 *   - Shooting stars disabled; star density halved automatically via
 *     useDeviceCapabilities.
 *
 * onAudit — called when the primary CTA fires. API-compatible with the old
 * HeroSection so the homepage wiring didn't need to change.
 */
import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Play, Clock, Film, Eye } from "lucide-react";
import {
  Kicker,
  Display,
  Lede,
  RevealOnScroll,
} from "../../design";
import CosmosBackdrop from "./CosmosBackdrop";
import KineticPortfolioGrid from "./KineticPortfolioGrid";

export default function EditorialHero({ onAudit }) {
  const handleStart = () => {
    try { onAudit?.("hero"); } catch { /* harmless */ }
  };

  return (
    <section
      className="relative overflow-hidden"
      style={{
        // Deep ink backdrop so the starfield + aurora read even in light mode.
        // Text stays white inside the hero regardless of site theme.
        background: "#0A0A0A",
        color: "#F5F5F5",
        minHeight: "100svh",
      }}
    >
      {/* (A) Cosmos ambient backdrop — aurora + stars + shooting streaks. */}
      <CosmosBackdrop />

      {/* Hero content.
          Top padding tuned to the header (72px fixed) + Trustbar strip.
          Was pt-28/pt-36 which made the fold feel empty below the bar. */}
      <div className="container mx-auto px-4 md:px-6 pt-20 md:pt-24 pb-16 md:pb-24 relative z-10">
        <div className="grid md:grid-cols-[1.3fr_1fr] gap-10 md:gap-12 items-center">
          {/* ── Left column: typographic hero ── */}
          <div>
            <RevealOnScroll>
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <Kicker className="!m-0" style={{ color: "#F16001" }}>
                  Post-production · India
                </Kicker>
                <span
                  className="inline-flex items-center gap-1.5 text-meta px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(232,80,2,0.14)",
                    color: "#ffb68a",
                    border: "1px solid rgba(232,80,2,0.35)",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "#E85002", animation: "pulse 2s ease-in-out infinite" }}
                    aria-hidden="true"
                  />
                  Reply inside 24 h
                </span>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay="80ms">
              <Display
                as="h1"
                size="xl"
                className="mb-6 md:mb-8"
                style={{ color: "#F5F5F5", lineHeight: 0.95 }}
              >
                We edit.<br />
                We design.<br />
                <span
                  className="italic"
                  style={{
                    color: "#E85002",
                    textShadow: "0 0 24px rgba(232,80,2,0.35)",
                  }}
                >
                  Your channel grows.
                </span>
              </Display>
            </RevealOnScroll>

            <RevealOnScroll delay="160ms">
              <Lede
                className="mb-8 md:mb-10 max-w-xl"
                style={{ color: "rgba(245,245,245,0.75)" }}
              >
                Shinel Studios is a post-production house for creators and brands.
                Long-form edits, scroll-stopping shorts, high-CTR thumbnails, and
                brand systems — shipped by named makers, tuned for the numbers
                that move channels.
              </Lede>
            </RevealOnScroll>

            <RevealOnScroll delay="240ms">
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={handleStart} className="btn-editorial">
                  Start a project <ArrowUpRight size={14} />
                </button>
                <Link
                  to="/work"
                  className="btn-editorial-ghost"
                  style={{ color: "#F5F5F5", borderColor: "rgba(255,255,255,0.28)" }}
                >
                  <Play size={14} /> See recent work
                </Link>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay="320ms">
              <div
                className="mt-8 md:mt-10 flex flex-wrap gap-5 text-meta"
                style={{ color: "rgba(245,245,245,0.55)" }}
              >
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

          {/* ── Right column: kinetic portfolio bento ── */}
          <RevealOnScroll delay="160ms">
            <div className="relative">
              <KineticPortfolioGrid />
              {/* Tiny caption under the bento, desktop only. Helps with WCAG
                  context — the grid is a teaser link, not just decoration. */}
              <div
                className="hidden md:flex items-center justify-between mt-3 text-meta"
                style={{ color: "rgba(245,245,245,0.5)" }}
              >
                <span>Live from /work</span>
                <Link to="/work" className="inline-flex items-center gap-1 hover:text-white transition-colors">
                  Browse all <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>

      {/* Subtle bottom fade so the hero blends into the next section. */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: "120px",
          background: "linear-gradient(180deg, rgba(10,10,10,0) 0%, var(--surface) 100%)",
          zIndex: 2,
        }}
      />
    </section>
  );
}
