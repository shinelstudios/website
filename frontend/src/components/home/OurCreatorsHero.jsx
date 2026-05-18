/**
 * OurCreatorsHero — the trophy wall, editorial bento edition.
 *
 * Premium homepage section flexing our roster. The highest-reach creator
 * gets a hero "wide" card with BIG vertical stat blocks; the next 4 fill
 * standard portrait cards in an asymmetric bento grid. Cinematic scrim,
 * subtle film grain on the hero, soft orange glow on hover.
 *
 * Data: GET /admin/agency/public/clients (already public, 60s edge cached).
 * Sorted by reach DESC, top 5 shown in the bento, rest accessible via CTA.
 */

import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Youtube, Instagram, ArrowRight, ArrowUpRight, Trophy, Crown, Tag } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";

function fmtCount(n) {
  if (!n) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
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

// Shared intersection-observer hook for the scroll-reveal.
function useReveal() {
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
  return [ref, visible];
}

/**
 * HeroCreatorCard — the wide, editorial hero treatment for the top creator.
 * Avatar is the soft full-card background, name + tagline bottom-left,
 * BIG vertical stat stacks on the right, "OPEN PROFILE" pill top-right.
 */
function HeroCreatorCard({ creator, index }) {
  const [ref, visible] = useReveal();

  const hasYt = creator.yt_subscribers > 0;
  const hasIg = creator.ig_followers > 0;

  // Order stats so the bigger number leads (visually anchors the right column).
  const stats = [];
  if (hasIg) stats.push({ icon: Instagram, value: creator.ig_followers, label: "Instagram followers" });
  if (hasYt) stats.push({ icon: Youtube,   value: creator.yt_subscribers, label: "YouTube subscribers" });
  stats.sort((a, b) => b.value - a.value);

  return (
    <Link
      ref={ref}
      to={creator.slug ? `/c/${creator.slug}` : `/creators`}
      className="creator-card creator-card--hero group"
      style={{
        transitionDelay: `${Math.min(index * 60, 600)}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        background: creator.avatar_url ? "#0a0a0a" : gradientFor(creator.name),
      }}
    >
      {creator.avatar_url && (
        <img
          src={creator.avatar_url}
          alt=""
          loading="lazy"
          className="creator-card__bg"
        />
      )}

      {/* Cinematic scrim: top transparent → bottom rgba(0,0,0,0.85) */}
      <div className="creator-card__scrim creator-card__scrim--hero" />

      {/* Subtle film-grain overlay — CSS only, very faint */}
      <div className="creator-card__grain" aria-hidden="true" />

      {/* OPEN PROFILE pill, top-right */}
      <div className="creator-card__open-pill">
        OPEN PROFILE <ArrowUpRight size={12} strokeWidth={2.5} />
      </div>

      {/* BIG stat stack, right side */}
      <div className="creator-card__stats">
        {stats.map((s, i) => (
          <div className="creator-card__stat" key={s.label}>
            <div className="creator-card__stat-head">
              <s.icon size={16} strokeWidth={2} />
            </div>
            <div className="creator-card__stat-value">{fmtCount(s.value)}</div>
            <div className="creator-card__stat-label">{s.label}</div>
            {i < stats.length - 1 && <div className="creator-card__stat-divider" />}
          </div>
        ))}
      </div>

      {/* Bottom-left: name + tagline */}
      <div className="creator-card__bottom creator-card__bottom--hero">
        <div className="creator-card__name creator-card__name--hero">{creator.name}</div>
        {creator.tagline && (
          <div className="creator-card__sub creator-card__sub--hero">{creator.tagline}</div>
        )}
      </div>

      {creator.status && creator.status !== "active" && (
        <span className="creator-card__status">
          {creator.status === "paused" ? "Paused" : creator.status === "old" ? "Past Work" : "Inactive"}
        </span>
      )}
    </Link>
  );
}

/**
 * Standard portrait card — the cleaner, more cinematic version of the old
 * card. Same 3:4 ratio. Slightly bigger count chips (~20% larger font),
 * darker avatar so numbers pop, subtle radial vignette, orange-glow hover.
 */
function CreatorCard({ creator, index }) {
  const [ref, visible] = useReveal();

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
      {creator.avatar_url && (
        <img
          src={creator.avatar_url}
          alt=""
          loading="lazy"
          className="creator-card__bg creator-card__bg--dim"
        />
      )}

      <div className="creator-card__scrim" />
      <div className="creator-card__vignette" aria-hidden="true" />

      <div className="creator-card__top">
        {hasYt && (
          <span className="creator-card__chip">
            <Youtube size={13} /> {fmtCount(creator.yt_subscribers)}
          </span>
        )}
        {hasIg && (
          <span className="creator-card__chip">
            <Instagram size={13} /> {fmtCount(creator.ig_followers)}
          </span>
        )}
        {thirdChip && (
          <span className="creator-card__chip creator-card__chip--soft">
            <thirdChip.icon size={12} /> {thirdChip.label}
          </span>
        )}
      </div>

      <div className="creator-card__bottom">
        <div className="creator-card__name">{creator.name}</div>
        {creator.tagline && (
          <div className="creator-card__sub">{creator.tagline}</div>
        )}
        {!creator.tagline && reach > 0 && (
          <div className="creator-card__sub">{fmtCount(reach)} total reach</div>
        )}
      </div>

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

  // Bento: first creator is the hero, next 4 fill the standard slots (5 total).
  const heroCreator = creators[0];
  const restCreators = creators.slice(1, 5);

  return (
    <section className="our-creators-hero">
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

      {loading ? (
        <div className="our-creators-hero__bento">
          <div className="creator-card creator-card--hero creator-card--skeleton" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="creator-card creator-card--skeleton" />
          ))}
        </div>
      ) : fetchError ? (
        <p className="our-creators-hero__fallback">Roster temporarily unavailable.</p>
      ) : (
        <div className="our-creators-hero__bento">
          {heroCreator && <HeroCreatorCard creator={heroCreator} index={0} />}
          {restCreators.map((c, i) => (
            <CreatorCard key={c.slug || c.name} creator={c} index={i + 1} />
          ))}
        </div>
      )}

      <div className="our-creators-hero__cta">
        <Link to="/creators" className="our-creators-hero__cta-link">
          See full roster <ArrowRight size={14} />
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

        /* === Bento grid layout ===
           Desktop: hero spans cols 1–2 + rows 1–2, four standard cards
           fill col 3 row 1, col 3 row 2, then wrap onto a second row pair.
           We use 3 columns × 2 rows for a clean 5-card composition. */
        .our-creators-hero__bento {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          grid-auto-rows: minmax(0, 1fr);
          grid-template-rows: repeat(2, 1fr);
          gap: clamp(12px, 1.5vw, 20px);
          /* Anchor the grid height so the hero "wide" feels properly 2x tall. */
          min-height: clamp(520px, 56vw, 720px);
        }
        .our-creators-hero__bento > .creator-card--hero {
          grid-column: 1 / span 2;
          grid-row: 1 / span 2;
        }
        /* Standard cards naturally fill columns 3 + remainder of the implicit
           grid. We pin them to single cells so they keep the 1:1 bento feel. */
        .our-creators-hero__bento > .creator-card:not(.creator-card--hero) {
          aspect-ratio: auto;
        }

        @media (max-width: 980px) {
          .our-creators-hero__bento {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto;
            min-height: 0;
          }
          .our-creators-hero__bento > .creator-card--hero {
            grid-column: 1 / span 2;
            grid-row: auto;
            aspect-ratio: 16 / 10;
          }
          .our-creators-hero__bento > .creator-card:not(.creator-card--hero) {
            aspect-ratio: 3 / 4;
          }
        }
        @media (max-width: 640px) {
          .our-creators-hero__bento {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .our-creators-hero__bento > .creator-card--hero {
            grid-column: 1;
            aspect-ratio: 4 / 5;
          }
          .our-creators-hero__bento > .creator-card:not(.creator-card--hero) {
            aspect-ratio: 4 / 5;
          }
        }

        /* === Card base === */
        .creator-card {
          position: relative;
          display: block;
          border-radius: 22px;
          overflow: hidden;
          text-decoration: none;
          color: white;
          transform: translateY(40px);
          transition: opacity 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      box-shadow 250ms ease;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
          isolation: isolate;
          aspect-ratio: 3 / 4;
        }
        .creator-card:hover {
          transform: translateY(-4px) !important;
          box-shadow:
            0 22px 48px rgba(232, 80, 2, 0.28),
            0 0 0 1.5px rgba(232, 80, 2, 0.55),
            0 0 32px rgba(232, 80, 2, 0.18);
        }
        .creator-card--hero {
          border-radius: 28px;
          aspect-ratio: auto;
          height: 100%;
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
          filter: brightness(0.78) saturate(1.08);
          transition: transform 600ms ease, filter 300ms ease;
        }
        /* Standard cards: darker so the count chips pop. */
        .creator-card__bg--dim {
          filter: brightness(0.62) saturate(1.12) contrast(1.04);
        }
        .creator-card:hover .creator-card__bg {
          transform: scale(1.06);
          filter: brightness(0.92) saturate(1.18);
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
        /* Hero scrim is heavier on the right too so the BIG stats read. */
        .creator-card__scrim--hero {
          background:
            linear-gradient(180deg,
              rgba(0,0,0,0.05) 0%,
              rgba(0,0,0,0.05) 30%,
              rgba(0,0,0,0.65) 75%,
              rgba(0,0,0,0.92) 100%),
            linear-gradient(270deg,
              rgba(0,0,0,0.55) 0%,
              rgba(0,0,0,0.1) 45%,
              rgba(0,0,0,0) 70%);
        }

        /* Radial vignette on the smaller cards — adds cinematic depth. */
        .creator-card__vignette {
          position: absolute; inset: 0;
          background: radial-gradient(120% 80% at 50% 35%,
            rgba(0,0,0,0) 0%,
            rgba(0,0,0,0) 55%,
            rgba(0,0,0,0.45) 100%);
          pointer-events: none;
          mix-blend-mode: multiply;
        }

        /* CSS-only film grain — repeating tiny noise via SVG data-url. */
        .creator-card__grain {
          position: absolute; inset: 0;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          background-size: 160px 160px;
          opacity: 0.07;
          mix-blend-mode: overlay;
          pointer-events: none;
        }

        /* === Standard card chips (bumped ~20% larger) === */
        .creator-card__top {
          position: absolute; top: 12px; right: 12px;
          display: flex; flex-direction: column; gap: 6px; align-items: flex-end;
          z-index: 2;
        }
        .creator-card__chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 999px;
          font-size: 13px;
          font-weight: 800;
          color: white;
          letter-spacing: 0.01em;
          font-variant-numeric: tabular-nums;
        }
        .creator-card__chip--soft {
          font-size: 11px;
          font-weight: 700;
          background: rgba(0,0,0,0.45);
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
          color: rgba(255,255,255,0.78);
          text-transform: uppercase;
        }

        /* === Hero card overlays === */
        .creator-card__open-pill {
          position: absolute; top: 18px; right: 18px;
          z-index: 3;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 12px 7px 14px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.22);
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: white;
          transition: background 200ms ease, border-color 200ms ease;
        }
        .creator-card--hero:hover .creator-card__open-pill {
          background: var(--orange, #E85002);
          border-color: var(--orange, #E85002);
        }

        .creator-card__stats {
          position: absolute;
          top: 50%; right: clamp(20px, 3vw, 36px);
          transform: translateY(-50%);
          z-index: 2;
          display: flex; flex-direction: column;
          gap: clamp(18px, 2.4vw, 32px);
          text-align: right;
          max-width: 46%;
        }
        .creator-card__stat {
          position: relative;
        }
        .creator-card__stat-head {
          display: inline-flex;
          width: 28px; height: 28px;
          align-items: center; justify-content: center;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 8px;
          margin-bottom: 8px;
          color: white;
        }
        .creator-card__stat-value {
          font-size: clamp(48px, 6.2vw, 80px);
          font-weight: 900;
          line-height: 0.95;
          letter-spacing: -0.04em;
          font-variant-numeric: tabular-nums;
          color: white;
          text-shadow: 0 4px 24px rgba(0,0,0,0.55);
        }
        .creator-card__stat-label {
          margin-top: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.7);
        }
        .creator-card__stat-divider {
          margin-top: clamp(14px, 1.8vw, 22px);
          margin-left: auto;
          width: 32px;
          height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 100%);
        }

        .creator-card__bottom--hero {
          bottom: clamp(20px, 3vw, 32px);
          left: clamp(20px, 3vw, 32px);
          right: auto;
          max-width: 52%;
        }
        .creator-card__name--hero {
          font-size: clamp(28px, 3.4vw, 44px);
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1.05;
          margin-bottom: 8px;
        }
        .creator-card__sub--hero {
          font-size: 13px;
          color: rgba(255,255,255,0.82);
          text-transform: none;
          letter-spacing: 0;
          font-weight: 500;
          line-height: 1.4;
        }

        /* Stat layout shrinks gracefully on tablet/mobile. */
        @media (max-width: 980px) {
          .creator-card__stats {
            top: auto;
            bottom: clamp(20px, 3vw, 28px);
            right: clamp(20px, 3vw, 28px);
            transform: none;
            flex-direction: row;
            gap: clamp(20px, 4vw, 36px);
            text-align: right;
            max-width: 60%;
          }
          .creator-card__stat-divider { display: none; }
          .creator-card__bottom--hero {
            top: clamp(20px, 3vw, 28px);
            bottom: auto;
            max-width: 60%;
          }
        }
        @media (max-width: 640px) {
          .creator-card__stats {
            position: absolute;
            bottom: 18px;
            right: 18px;
            flex-direction: column;
            gap: 14px;
            text-align: right;
            max-width: 55%;
          }
          .creator-card__stat-value {
            font-size: clamp(40px, 12vw, 56px);
          }
          .creator-card__bottom--hero {
            top: 18px;
            left: 18px;
            max-width: 50%;
          }
          .creator-card__name--hero {
            font-size: clamp(22px, 6.5vw, 30px);
          }
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
