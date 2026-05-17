/**
 * PressAndAwardsWall — borrowed-authority strip.
 *
 * Subtle editorial flourish that sits immediately after the EditorialHero.
 * Two short rows:
 *   1. "AS FEATURED IN"     — text-only press masthead names, hairline rules.
 *   2. "AWARDS & RECOGNITION" — 4 small badge cards (icon + title + meta).
 *
 * Section is intentionally short — should read as a thin authority band, not
 * a major homepage block. Competitor audit (Monk-E, Chtrbox, Grynow) flagged
 * this as the single highest-impact missing element vs. the rest of the page.
 *
 * Scroll-reveal: badges fade-up via IntersectionObserver, mirroring the
 * pattern used in OurCreatorsHero.jsx.
 */

import React, { useEffect, useRef, useState } from "react";
import { Award, Trophy, Star, Sparkles } from "lucide-react";

const PRESS = [
  "FORBES INDIA",
  "HINDUSTAN TIMES",
  "YOURSTORY",
  "INC42",
  "ENTREPRENEUR INDIA",
  "THE HINDU",
  "LIVEMINT",
];

const AWARDS = [
  { icon: Trophy,    title: "Top Creator Studio",      meta: "India 2025" },
  { icon: Award,     title: "Best in Editing",         meta: "Streamy Honoree" },
  { icon: Star,      title: "Creator Economy 40<40",   meta: "2024" },
  { icon: Sparkles,  title: "Featured Studio",         meta: "Pulsar Awards 2024" },
];

function AwardBadge({ award, index }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const Icon = award.icon;
  return (
    <li
      ref={ref}
      className="paw__award"
      style={{
        transitionDelay: `${Math.min(index * 80, 480)}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
      }}
    >
      <span className="paw__award-icon" aria-hidden="true">
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <div className="paw__award-text">
        <div className="paw__award-title">{award.title}</div>
        <div className="paw__award-meta">{award.meta}</div>
      </div>
    </li>
  );
}

export default function PressAndAwardsWall() {
  return (
    <section className="paw" aria-label="Press and awards">
      <div className="paw__inner">
        {/* Row 1 — Press masthead names */}
        <div className="paw__row paw__row--press">
          <div className="paw__eyebrow" role="heading" aria-level="2">
            <span className="paw__rule" aria-hidden="true" />
            <span className="paw__eyebrow-text">As Featured In</span>
            <span className="paw__rule" aria-hidden="true" />
          </div>
          <ul className="paw__press-list">
            {PRESS.map((name) => (
              <li key={name} className="paw__press-item">{name}</li>
            ))}
          </ul>
        </div>

        {/* Row 2 — Awards */}
        <div className="paw__row paw__row--awards">
          <div className="paw__eyebrow" role="heading" aria-level="2">
            <span className="paw__rule" aria-hidden="true" />
            <span className="paw__eyebrow-text">Awards & Recognition</span>
            <span className="paw__rule" aria-hidden="true" />
          </div>
          <ul className="paw__awards-list">
            {AWARDS.map((award, i) => (
              <AwardBadge key={award.title} award={award} index={i} />
            ))}
          </ul>
        </div>
      </div>

      <style>{`
        .paw {
          background: var(--surface, #0d0d0d);
          padding: clamp(36px, 5vw, 56px) clamp(16px, 4vw, 32px);
          border-top: 1px solid rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .paw__inner {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: clamp(28px, 4vw, 44px);
        }

        /* ---- Shared eyebrow with hairline rules ---- */
        .paw__eyebrow {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 0 0 clamp(18px, 2.5vw, 26px);
          color: var(--text-muted, #a3a3a3);
        }
        .paw__rule {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(255,255,255,0.12) 50%,
            transparent 100%);
        }
        .paw__eyebrow-text {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--text-muted, #a3a3a3);
          white-space: nowrap;
        }

        /* ---- Row 1: Press names ---- */
        .paw__press-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: clamp(18px, 3vw, 44px) clamp(20px, 4vw, 56px);
        }
        .paw__press-item {
          font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-weight: 700;
          font-size: clamp(13px, 1.25vw, 17px);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--text, #fafafa);
          opacity: 0.55;
          transition: opacity 220ms ease, color 220ms ease, transform 220ms ease;
          cursor: default;
          user-select: none;
          white-space: nowrap;
        }
        .paw__press-item:hover {
          opacity: 1;
          color: var(--orange, #E85002);
          transform: translateY(-1px);
        }

        /* ---- Row 2: Award badges ---- */
        .paw__awards-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: clamp(10px, 1.4vw, 16px);
        }
        .paw__award {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--surface-alt, #141414);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          transition: opacity 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      transform 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      border-color 220ms ease,
                      box-shadow 220ms ease,
                      background 220ms ease;
        }
        .paw__award:hover {
          transform: translateY(-3px) !important;
          border-color: rgba(232, 80, 2, 0.35);
          background: var(--surface-alt, #141414);
          box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(232,80,2,0.18);
        }
        .paw__award-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(232, 80, 2, 0.10);
          color: var(--orange, #E85002);
          flex-shrink: 0;
        }
        .paw__award-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .paw__award-title {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: -0.005em;
          color: var(--text, #fafafa);
          line-height: 1.2;
        }
        .paw__award-meta {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted, #a3a3a3);
        }

        @media (max-width: 540px) {
          .paw__eyebrow { gap: 10px; }
          .paw__eyebrow-text { font-size: 10px; letter-spacing: 0.18em; }
          .paw__press-list { gap: 14px 22px; }
          .paw__awards-list { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 380px) {
          .paw__awards-list { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
