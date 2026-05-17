/**
 * ServicePillars — "What we ship" editorial grid.
 *
 * Replaces the EditorialServicesGrid mount on the homepage with 4 BIG
 * image-led vertical tiles, each representing a Shinel service pillar.
 * Layout: 3:4 portrait cards, 2-column on desktop, 1-column on mobile.
 * Each tile has a distinct hue gradient, a large icon, a bold title,
 * and 3 sub-bullets. Hover lifts the card.
 *
 * Pattern + CSS variables mirror OurCreatorsHero.jsx for consistency.
 */

import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Film, Smartphone, Image as ImageIcon, Radio } from "lucide-react";

const PILLARS = [
  {
    key: "long-form",
    title: "LONG-FORM EDIT",
    Icon: Film,
    bullets: [
      "Story-driven cuts",
      "Hook-first openings",
      "Retention-optimized pacing",
    ],
    // Deep crimson → ember
    gradient:
      "linear-gradient(160deg, hsl(8 75% 28%) 0%, hsl(20 80% 14%) 100%)",
    accent: "hsl(20 90% 60%)",
  },
  {
    key: "shorts",
    title: "SHORTS & REELS",
    Icon: Smartphone,
    bullets: [
      "Vertical-first edits",
      "Caption styling",
      "Trending audio matched",
    ],
    // Royal purple → indigo
    gradient:
      "linear-gradient(160deg, hsl(265 65% 30%) 0%, hsl(245 70% 14%) 100%)",
    accent: "hsl(275 85% 70%)",
  },
  {
    key: "gfx",
    title: "THUMBNAILS & GFX",
    Icon: ImageIcon,
    bullets: [
      "Click-through tested",
      "Brand-consistent",
      "3 variants per upload",
    ],
    // Teal → ocean
    gradient:
      "linear-gradient(160deg, hsl(180 70% 26%) 0%, hsl(195 75% 12%) 100%)",
    accent: "hsl(170 80% 60%)",
  },
  {
    key: "live",
    title: "LIVE STREAM PRODUCTION",
    Icon: Radio,
    bullets: [
      "Stream packages",
      "Soul characters",
      "Custom alerts + overlays",
    ],
    // Sunburst gold → amber
    gradient:
      "linear-gradient(160deg, hsl(35 80% 32%) 0%, hsl(15 75% 14%) 100%)",
    accent: "hsl(45 95% 65%)",
  },
];

function PillarCard({ pillar, index }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const { Icon } = pillar;

  return (
    <article
      ref={ref}
      className="pillar-card"
      style={{
        transitionDelay: `${Math.min(index * 80, 600)}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        background: pillar.gradient,
        ["--pillar-accent"]: pillar.accent,
      }}
    >
      <div className="pillar-card__scrim" aria-hidden="true" />

      {/* Top: icon */}
      <div className="pillar-card__icon">
        <Icon size={56} strokeWidth={1.5} />
      </div>

      {/* Bottom: title + bullets */}
      <div className="pillar-card__body">
        <h3 className="pillar-card__title">{pillar.title}</h3>
        <ul className="pillar-card__bullets">
          {pillar.bullets.map((b, i) => (
            <li key={i} className="pillar-card__bullet">
              {b}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function ServicePillars() {
  return (
    <section className="service-pillars">
      {/* Header */}
      <div className="service-pillars__header">
        <span className="service-pillars__kicker">
          <Sparkles size={12} /> What we ship
        </span>
        <h2 className="service-pillars__title">
          Built for the <em>6 niches</em> we know cold.
        </h2>
        <p className="service-pillars__lede">
          Music videos, gaming, devotional, vlogs, tattoo, live — each pillar
          tuned to its audience.
        </p>
      </div>

      {/* Grid */}
      <div className="service-pillars__grid">
        {PILLARS.map((p, i) => (
          <PillarCard key={p.key} pillar={p} index={i} />
        ))}
      </div>

      <style>{`
        .service-pillars {
          padding: clamp(48px, 8vw, 96px) clamp(16px, 4vw, 32px);
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
        }
        .service-pillars__header {
          margin-bottom: clamp(32px, 5vw, 56px);
          max-width: 760px;
        }
        .service-pillars__kicker {
          display: inline-flex; align-items: center; gap: 6px;
          color: var(--orange, #E85002);
          font-size: 11px; font-weight: 800; letter-spacing: 0.15em;
          text-transform: uppercase; margin-bottom: 14px;
        }
        .service-pillars__title {
          font-size: clamp(36px, 6vw, 72px);
          font-weight: 800;
          line-height: 1.02;
          letter-spacing: -0.025em;
          margin: 0 0 16px;
          color: var(--text, #fafafa);
        }
        .service-pillars__title em {
          color: var(--orange, #E85002);
          font-style: italic;
        }
        .service-pillars__lede {
          font-size: clamp(15px, 1.2vw, 18px);
          line-height: 1.55;
          color: var(--text-muted, #a3a3a3);
          margin: 0;
          max-width: 580px;
        }

        .service-pillars__grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: clamp(16px, 2vw, 28px);
        }
        @media (max-width: 760px) {
          .service-pillars__grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }

        .pillar-card {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          aspect-ratio: 3 / 4;
          padding: clamp(20px, 2.4vw, 32px);
          border-radius: 22px;
          overflow: hidden;
          color: white;
          transform: translateY(40px);
          transition: opacity 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      transform 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      box-shadow 250ms ease;
          box-shadow:
            0 8px 24px rgba(0,0,0,0.4),
            0 0 0 1px rgba(255,255,255,0.05);
          isolation: isolate;
        }
        .pillar-card:hover {
          transform: translateY(-6px) !important;
          box-shadow:
            0 22px 50px rgba(0,0,0,0.5),
            0 0 0 1px var(--pillar-accent, rgba(232,80,2,0.4));
        }
        .pillar-card__scrim {
          position: absolute; inset: 0;
          background: linear-gradient(180deg,
            rgba(0,0,0,0.05) 0%,
            rgba(0,0,0,0.15) 50%,
            rgba(0,0,0,0.55) 100%);
          pointer-events: none;
          z-index: 0;
        }
        .pillar-card__icon {
          position: relative;
          z-index: 1;
          color: var(--pillar-accent, #fafafa);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 88px; height: 88px;
          border-radius: 18px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .pillar-card__body {
          position: relative;
          z-index: 1;
        }
        .pillar-card__title {
          font-size: clamp(20px, 2.4vw, 30px);
          font-weight: 800;
          letter-spacing: -0.01em;
          line-height: 1.1;
          margin: 0 0 14px;
          text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }
        .pillar-card__bullets {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .pillar-card__bullet {
          font-size: clamp(13px, 1vw, 15px);
          font-weight: 400;
          letter-spacing: 0.005em;
          color: rgba(255,255,255,0.82);
          line-height: 1.4;
          position: relative;
          padding-left: 16px;
        }
        .pillar-card__bullet::before {
          content: "";
          position: absolute;
          left: 0; top: 0.6em;
          width: 8px; height: 1px;
          background: var(--pillar-accent, rgba(255,255,255,0.6));
          opacity: 0.85;
        }
      `}</style>
    </section>
  );
}
