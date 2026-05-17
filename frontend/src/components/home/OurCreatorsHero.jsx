/**
 * OurCreatorsHero — the trophy wall.
 *
 * Big editorial section the homepage uses to flex our roster.
 * Each card is a tall 3:4 portrait card with the creator's avatar as the
 * background, name overlaid at the bottom, reach + platform glyph hovering
 * top-right. Scroll-reveal animation: cards fade up as they enter the
 * viewport. Hover lifts the card with a subtle glow.
 *
 * Data: GET /admin/agency/public/clients (already public, 60s edge cached).
 * Sorted by reach DESC, top 12 by default.
 */

import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Youtube, Instagram, ArrowRight, Trophy, Crown, Tag } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";

function fmtCount(n) {
  if (!n) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

// Third chip on each card — pure derivation from public client fields.
// We don't have growth deltas on the public clients endpoint, so we pick
// a meaningful static-ish badge in priority order:
//   1. IG >= 1M  → "1M+ club"  (Crown icon)
//   2. YT >= 100K → "Top 0.1%" (Trophy icon)
//   3. niche      → e.g. "Gaming", "Music" (Tag icon)
// Returns null when none of those apply so the chip silently drops out.
function thirdChipFor(creator) {
  if ((creator.ig_followers || 0) >= 1_000_000) {
    return { icon: Crown, label: "1M+ club" };
  }
  if ((creator.yt_subscribers || 0) >= 100_000) {
    return { icon: Trophy, label: "Top 0.1%" };
  }
  if (creator.niche && typeof creator.niche === "string") {
    const cap = creator.niche.charAt(0).toUpperCase() + creator.niche.slice(1).toLowerCase();
    return { icon: Tag, label: cap };
  }
  return null;
}

// Deterministic per-name gradient so each creator card has a distinct
// background mood (only used as the fallback when avatar_url is missing).
function gradientFor(name) {
  const seed = [...(name || "?")].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = seed * 137 % 360;
  return `linear-gradient(160deg, hsl(${hue} 70% 28%) 0%, hsl(${(hue + 50) % 360} 70% 14%) 100%)`;
}

function CreatorCard({ creator, index }) {
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

  const hasYt = creator.yt_subscribers > 0;
  const hasIg = creator.ig_followers > 0;
  const reach = creator.reach || 0;
  const thirdChip = thirdChipFor(creator);

  return (
    <Link
      ref={ref}
      to={creator.slug ? `/c/${creator.slug}` : `/creators`}
      className="creator-card group"
      style={{
        transitionDelay: `${Math.min(index * 60, 600)}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        background: creator.avatar_url ? "#0a0a0a" : gradientFor(creator.name),
      }}
    >
      {/* Background avatar — large, dimmed so text reads */}
      {creator.avatar_url && (
        <img
          src={creator.avatar_url}
          alt=""
          loading="lazy"
          className="creator-card__bg"
        />
      )}

      {/* Subtle gradient overlay so the bottom text is always legible */}
      <div className="creator-card__scrim" />

      {/* Top-right: reach badge */}
      <div className="creator-card__top">
        {hasYt && (
          <span className="creator-card__chip">
            <Youtube size={11} /> {fmtCount(creator.yt_subscribers)}
          </span>
        )}
        {hasIg && (
          <span className="creator-card__chip">
            <Instagram size={11} /> {fmtCount(creator.ig_followers)}
          </span>
        )}
        {thirdChip && (
          <span className="creator-card__chip">
            <thirdChip.icon size={11} /> {thirdChip.label}
          </span>
        )}
      </div>

      {/* Bottom: name + niche */}
      <div className="creator-card__bottom">
        <div className="creator-card__name">{creator.name}</div>
        {creator.tagline && (
          <div className="creator-card__sub">{creator.tagline}</div>
        )}
        {!creator.tagline && reach > 0 && (
          <div className="creator-card__sub">{fmtCount(reach)} total reach</div>
        )}
      </div>

      {/* Status badge bottom-left for archived/paused so the wall isn't misleading */}
      {creator.status && creator.status !== "active" && (
        <span className="creator-card__status">
          {creator.status === "paused" ? "Paused" : creator.status === "old" ? "Past Work" : "Inactive"}
        </span>
      )}
    </Link>
  );
}

export default function OurCreatorsHero({ limit = 12 }) {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch(`${AUTH_BASE}/admin/agency/public/clients`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((j) => setCreators((j.clients || []).slice(0, limit)))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [limit]);

  if (!loading && !fetchError && creators.length === 0) return null;

  return (
    <section className="our-creators-hero">
      {/* Header */}
      <div className="our-creators-hero__header">
        <span className="our-creators-hero__kicker">
          <Sparkles size={12} /> Our Roster
        </span>
        <h2 className="our-creators-hero__title">
          The creators that <em>chose us.</em>
        </h2>
        <p className="our-creators-hero__lede">
          From 100K gaming streamers to 1M+ tattoo artists, we ship the work that ships their channels.
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <ul className="our-creators-hero__grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="creator-card creator-card--skeleton" />
          ))}
        </ul>
      ) : fetchError ? (
        <p className="our-creators-hero__fallback">Roster temporarily unavailable.</p>
      ) : (
        <ul className="our-creators-hero__grid">
          {creators.map((c, i) => (
            <li key={c.slug || c.name}>
              <CreatorCard creator={c} index={i} />
            </li>
          ))}
        </ul>
      )}

      {/* See-all CTA */}
      <div className="our-creators-hero__cta">
        <Link to="/creators" className="our-creators-hero__cta-link">
          See every creator we've shipped for <ArrowRight size={14} />
        </Link>
      </div>

      <style>{`
        .our-creators-hero {
          padding: clamp(48px, 8vw, 96px) clamp(16px, 4vw, 32px);
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
        }
        .our-creators-hero__header {
          margin-bottom: clamp(32px, 5vw, 56px);
          max-width: 760px;
        }
        .our-creators-hero__kicker {
          display: inline-flex; align-items: center; gap: 6px;
          color: var(--orange, #E85002);
          font-size: 11px; font-weight: 800; letter-spacing: 0.15em;
          text-transform: uppercase; margin-bottom: 14px;
        }
        .our-creators-hero__title {
          font-size: clamp(36px, 6vw, 72px);
          font-weight: 800;
          line-height: 1.02;
          letter-spacing: -0.025em;
          margin: 0 0 16px;
          color: var(--text, #fafafa);
        }
        .our-creators-hero__title em {
          color: var(--orange, #E85002);
          font-style: italic;
        }
        .our-creators-hero__lede {
          font-size: clamp(15px, 1.2vw, 18px);
          line-height: 1.55;
          color: var(--text-muted, #a3a3a3);
          margin: 0;
          max-width: 580px;
        }

        .our-creators-hero__grid {
          list-style: none; padding: 0; margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: clamp(12px, 1.5vw, 20px);
        }
        @media (max-width: 480px) {
          .our-creators-hero__grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }

        .creator-card {
          position: relative;
          display: block;
          aspect-ratio: 3 / 4;
          border-radius: 18px;
          overflow: hidden;
          text-decoration: none;
          color: white;
          transform: translateY(40px);
          transition: opacity 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      transform 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      box-shadow 250ms ease;
          box-shadow: 0 8px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04);
          isolation: isolate;
        }
        .creator-card:hover {
          box-shadow: 0 16px 40px rgba(232, 80, 2, 0.25), 0 0 0 1px rgba(232,80,2,0.4);
        }
        .creator-card--skeleton {
          background: linear-gradient(135deg, #1a1a1a, #0a0a0a);
          opacity: 0.6;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        .creator-card__bg {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          filter: brightness(0.85) saturate(1.1);
          transition: transform 600ms ease, filter 300ms ease;
        }
        .creator-card:hover .creator-card__bg {
          transform: scale(1.06);
          filter: brightness(1) saturate(1.2);
        }
        .creator-card__scrim {
          position: absolute; inset: 0;
          background: linear-gradient(180deg,
            rgba(0,0,0,0.15) 0%,
            rgba(0,0,0,0.05) 35%,
            rgba(0,0,0,0.55) 70%,
            rgba(0,0,0,0.85) 100%);
          pointer-events: none;
        }
        .creator-card__top {
          position: absolute; top: 12px; right: 12px;
          display: flex; flex-direction: column; gap: 6px; align-items: flex-end;
          z-index: 2;
        }
        .creator-card__chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 8px;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          font-size: 11px; font-weight: 700;
          color: white;
          letter-spacing: 0.02em;
        }
        .creator-card__bottom {
          position: absolute; bottom: 16px; left: 16px; right: 16px;
          z-index: 2;
        }
        .creator-card__name {
          font-size: clamp(15px, 1.4vw, 19px);
          font-weight: 800;
          letter-spacing: -0.01em;
          line-height: 1.15;
          margin-bottom: 4px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.6);
        }
        .creator-card__sub {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: rgba(255,255,255,0.75);
          text-transform: uppercase;
        }
        .creator-card__status {
          position: absolute; bottom: 12px; left: 12px;
          z-index: 3;
          font-size: 9px; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 3px 7px;
          background: rgba(0,0,0,0.7);
          border-radius: 4px;
          color: rgba(255,255,255,0.7);
        }

        .our-creators-hero__fallback {
          font-size: 13px;
          color: var(--text-muted, #a3a3a3);
          opacity: 0.7;
          margin: 0;
          padding: 24px 0;
        }

        .our-creators-hero__cta {
          margin-top: clamp(28px, 4vw, 44px);
          display: flex; justify-content: center;
        }
        .our-creators-hero__cta-link {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 26px;
          font-size: 14px; font-weight: 700;
          letter-spacing: 0.02em;
          color: var(--text, #fafafa);
          background: transparent;
          border: 2px solid var(--orange, #E85002);
          border-radius: 999px;
          text-decoration: none;
          transition: background 250ms ease, color 250ms ease, transform 250ms ease;
        }
        .our-creators-hero__cta-link:hover {
          background: var(--orange, #E85002);
          color: white;
          transform: translateY(-2px);
        }
      `}</style>
    </section>
  );
}
