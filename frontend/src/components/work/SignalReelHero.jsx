/**
 * SignalReelHero — the flagship /work hero.
 *
 * Two-column on desktop:
 *   LEFT   counters · kicker · giant kinetic headline · CTA pair
 *   RIGHT  KineticMosaic (6 cross-fading thumbnail tiles)
 *
 * Mobile stacks vertically: copy on top, mosaic below (2×2), CTAs above
 * the mosaic for tap-first conversion.
 *
 * Hero owns the "prove scale in 3 seconds" job. Real inventory drives the
 * mosaic sources — plan says filter for `isShinel` items with a video id
 * so YouTube's free CDN serves thumbnails.
 */
import React, { useMemo } from "react";
import { ArrowRight, PhoneCall } from "lucide-react";
import {
  Section,
  Kicker,
  RevealOnScroll,
  SpotlightSweep,
  useReducedMotion,
} from "../../design";
import KineticVerb from "./KineticVerb";
import KineticMosaic from "./KineticMosaic";
import KineticCounters from "./KineticCounters";

const YT_THUMB = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/**
 * Build 6 mosaic tiles from a list of normalised work items.
 * Each tile gets a rotation of 3–4 distinct thumbnails sampled across
 * categories so the grid looks varied.
 */
function buildTilesFromProjects(projects = []) {
  const usable = projects.filter(
    (p) => p && ((p.videoId && p.videoId.length >= 5) || p.image)
  );
  if (usable.length === 0) {
    const fallback = "https://placehold.co/640x360/0A0A0A/E85002?text=Shinel+Studios";
    return Array.from({ length: 6 }, (_, i) => ({
      sources: [fallback],
      alt: `Sample tile ${i + 1}`,
    }));
  }

  // Distribute: 6 tiles, each drawing 3 images at stride (6). Gives variance.
  const tiles = [];
  for (let t = 0; t < 6; t++) {
    const sources = [];
    for (let k = 0; k < 3; k++) {
      const idx = (t + k * 6) % usable.length;
      const p = usable[idx];
      const src = p.videoId ? YT_THUMB(p.videoId) : p.image;
      if (src && !sources.includes(src)) sources.push(src);
    }
    if (sources.length === 0) sources.push("https://placehold.co/640x360/0A0A0A/E85002?text=Shinel");
    tiles.push({ sources, alt: usable[t % usable.length]?.title || "Sample of our work" });
  }
  return tiles;
}

export default function SignalReelHero({
  projects = [],
  counters = [],
  onBookCall,
  whatsappHref = "https://wa.me/919876543210?text=Hi%20Shinel%20—%20I%27d%20like%20to%20start%20a%20project",
}) {
  const reduced = useReducedMotion();
  const tiles = useMemo(() => buildTilesFromProjects(projects), [projects]);

  return (
    <Section
      size="lg"
      className="relative pt-24 md:pt-28 pb-12 md:pb-20 overflow-hidden"
    >
      {/* Soft orange spotlight — cursor-followed on desktop, slow drift on mobile. */}
      {!reduced && <SpotlightSweep />}

      <div
        className="absolute -top-24 -left-24 w-[40vw] h-[40vw] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(closest-side, rgba(232,80,2,0.14), transparent 70%)",
          filter: "blur(20px)",
        }}
        aria-hidden="true"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* LEFT — editorial column */}
        <div className="lg:col-span-6 xl:col-span-7 order-1">
          <RevealOnScroll>
            <KineticCounters stats={counters} />
          </RevealOnScroll>

          <RevealOnScroll delay="60ms">
            <Kicker>The Work · Shinel Studios</Kicker>
          </RevealOnScroll>

          <RevealOnScroll delay="140ms">
            <h1
              className="text-display-xl md:text-display-xl font-black leading-[0.95] mt-3 mb-5"
              style={{ color: "var(--text)", fontSize: "clamp(2.75rem, 6.5vw, 5.5rem)" }}
            >
              <span className="block">
                We{" "}
                <span style={{ color: "var(--orange)" }}>
                  <KineticVerb
                    words={["edit", "grow", "brand", "ship", "launch"]}
                    intervalMs={2800}
                  />
                </span>{" "}
                videos
              </span>
              <span className="block">
                that{" "}
                <span style={{ color: "var(--orange)" }}>
                  <KineticVerb
                    words={["convert", "hit", "land", "sell", "breathe"]}
                    intervalMs={3200}
                  />
                </span>
                <span style={{ color: "var(--orange)" }}>.</span>
              </span>
            </h1>
          </RevealOnScroll>

          <RevealOnScroll delay="220ms">
            <p
              className="text-lg md:text-xl max-w-xl mb-8"
              style={{ color: "var(--text-muted)" }}
            >
              GFX, editing, SEO, AI — the full creative stack behind channels
              that actually move. One link, everything we ship.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay="300ms">
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full font-black text-base md:text-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--orange)]"
                style={{
                  background: "var(--orange)",
                  color: "#fff",
                  boxShadow: "0 10px 30px rgba(232,80,2,0.35)",
                }}
                aria-label="Start a project on WhatsApp"
              >
                Start a project
                <ArrowRight size={18} />
              </a>
              {onBookCall ? (
                <button
                  type="button"
                  onClick={onBookCall}
                  className="inline-flex items-center gap-2 px-5 py-4 rounded-full font-bold text-sm md:text-base hairline hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  style={{ color: "var(--text)" }}
                >
                  <PhoneCall size={16} />
                  Book a 15-min call
                </button>
              ) : (
                <a
                  href="#reel"
                  className="inline-flex items-center gap-2 px-5 py-4 rounded-full font-bold text-sm md:text-base hairline hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  style={{ color: "var(--text)" }}
                >
                  See the reel ↓
                </a>
              )}
            </div>
          </RevealOnScroll>
        </div>

        {/* RIGHT — kinetic mosaic */}
        <div className="lg:col-span-6 xl:col-span-5 order-2 w-full">
          <RevealOnScroll delay="180ms">
            <KineticMosaic tiles={tiles} />
          </RevealOnScroll>
          {/* Subtle caption under the mosaic on desktop only */}
          <div
            className="hidden md:flex items-center gap-2 mt-4 text-[11px] uppercase tracking-[0.25em] font-bold"
            style={{ color: "var(--text-muted)" }}
            aria-hidden="true"
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--orange)" }} />
            A living reel · rotates every few seconds
          </div>
        </div>
      </div>
    </Section>
  );
}
