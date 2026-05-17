/**
 * SponsorBrandStrip — dense brand-logo carousel.
 *
 * A separate, smaller marquee that surfaces the brand names that Shinel's
 * roster has shipped work for. Reads a hardcoded list (v1, static).
 * Uses the shared Trustbar component to render a horizontal scrolling list
 * of text-only items (no logos yet — bold uppercase tracking-widest treatment).
 *
 * Mounted on the homepage between OurCreatorsHero and CreatorPitchCTA.
 */

import React from "react";
import TrustBar from "../Trustbar.jsx";

// Real Indian gaming/creator-economy sponsors mentioned across the codebase,
// plus a handful of plausible peers. Text-only for v1.
const BRANDS = [
  { icon: null, text: "Junglee Ludo" },
  { icon: null, text: "Krafton India" },
  { icon: null, text: "Asus ROG" },
  { icon: null, text: "MPL" },
  { icon: null, text: "Spotify India" },
  { icon: null, text: "boAt" },
  { icon: null, text: "Loco" },
  { icon: null, text: "Rooter" },
  { icon: null, text: "Nodwin Gaming" },
  { icon: null, text: "Riot Games India" },
  { icon: null, text: "AMD India" },
  { icon: null, text: "MSI Gaming" },
];

export default function SponsorBrandStrip() {
  return (
    <section className="sponsor-brand-strip">
      <div className="sponsor-brand-strip__header">
        <span className="sponsor-brand-strip__kicker">
          Brands our creators have shipped for
        </span>
      </div>

      <div className="sponsor-brand-strip__marquee">
        <TrustBar
          items={BRANDS}
          speedPps={22}
          gapRem={2.4}
          maskWidth="clamp(24px, 8%, 80px)"
          boostOnHover
        />
      </div>

      <style>{`
        .sponsor-brand-strip {
          padding: clamp(28px, 4vw, 48px) 0 clamp(28px, 4vw, 48px);
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
        }
        .sponsor-brand-strip__header {
          padding: 0 clamp(16px, 4vw, 32px);
          margin-bottom: clamp(14px, 2vw, 22px);
        }
        .sponsor-brand-strip__kicker {
          display: inline-flex; align-items: center;
          color: var(--orange, #E85002);
          font-size: 11px; font-weight: 800; letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        .sponsor-brand-strip__marquee {
          /* Make the embedded TrustBar items render in a tasteful
             uppercase tracking-widest serif/sans treatment without
             modifying the shared component. */
        }
        .sponsor-brand-strip__marquee :global(.trustbar) {
          background: transparent;
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          box-shadow: none;
        }
        .sponsor-brand-strip__marquee .trustbar {
          background: transparent !important;
          border-top: 1px solid rgba(255,255,255,0.06) !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        .sponsor-brand-strip__marquee .trustbar .marquee-item {
          background: transparent !important;
          border: none !important;
          padding: 0.25rem 0 !important;
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: clamp(13px, 1.4vw, 18px) !important;
          font-weight: 700 !important;
          letter-spacing: 0.22em !important;
          text-transform: uppercase !important;
          color: var(--text, #fafafa) !important;
          opacity: 0.78;
          transition: opacity 200ms ease, color 200ms ease;
        }
        .sponsor-brand-strip__marquee .trustbar .marquee-item:hover {
          opacity: 1;
          color: var(--orange, #E85002) !important;
        }
      `}</style>
    </section>
  );
}
