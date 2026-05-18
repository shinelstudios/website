/**
 * FeaturedCaseStudies — homepage "see what landed" showcase.
 *
 * Pattern lifted from Monk-E / Whizco competitor sites: each big project
 * gets a card with a 16:9 hero video poster (autoplay-muted in v2; right
 * now we render a deterministic gradient + Play overlay so visitors see
 * the "watch the cut" affordance), title, client name, publish date,
 * type chip, and 2–3 metric badges.
 *
 * Data: fetched on mount from /admin/agency/public/case-studies (D1-backed
 * since the case-studies-2026-05-18 migration). The hardcoded list below
 * stays as a fallback so the section never renders blank if:
 *   - the migration hasn't been applied yet on a fresh deploy
 *   - the worker fetch fails (network blip, edge cache miss)
 *   - the founder soft-deleted every row in the cockpit
 * The fallback list matches the seed rows in case-studies-2026-05-18.sql.
 * Section header reuses the kicker / italic-em h2 / lede pattern from
 * OurCreatorsHero so the editorial voice stays consistent.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles, Play, Eye, Users, Radio, Heart, Music2, Gamepad2,
  Shield, ShieldCheck, Clock, TrendingUp,
} from "lucide-react";
import { AUTH_BASE } from "../../config/constants";

// Icon name (string from D1) → lucide-react component. Anything missing
// from this map falls back to Sparkles so the row still renders.
const ICON_MAP = {
  Eye, Users, Radio, Heart, Music2, Gamepad2, Sparkles, Play,
  Shield, ShieldCheck, Clock, TrendingUp,
};

// "stream" → "Stream", "music_video" → "Music Video", etc. Used for the
// poster chip + meta chip labels.
function prettifyAssetType(t) {
  if (!t) return "Project";
  return String(t)
    .split(/[_-]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
function iconForAssetType(t) {
  switch (String(t || "").toLowerCase()) {
    case "stream":      return Gamepad2;
    case "music_video": return Music2;
    case "short":       return Play;
    case "long_form":   return Play;
    default:            return Sparkles;
  }
}

// "8 days ago" / "30 days ago" — same vocabulary the old hardcoded list used.
function relativeLabel(unixSec) {
  if (!unixSec) return "";
  const nowSec = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, nowSec - Number(unixSec));
  const day = 86400;
  if (diff < day)            return "today";
  if (diff < 2 * day)        return "1 day ago";
  if (diff < 30 * day)       return `${Math.floor(diff / day)} days ago`;
  if (diff < 60 * day)       return "1 month ago";
  if (diff < 365 * day)      return `${Math.floor(diff / (30 * day))} months ago`;
  return `${Math.floor(diff / (365 * day))} years ago`;
}

// Convert a D1 row (from /admin/agency/public/case-studies) into the shape
// the card renderer expects. Kept separate so the fallback list and the
// fetched list go through the same downstream path.
function studyFromApi(row) {
  const typeIcon = iconForAssetType(row.asset_type);
  const metrics = (row.metrics || []).map((m) => ({
    icon: ICON_MAP[m.icon] || Sparkles,
    // Prefer "<value> <label>" when both exist (matches the old visual);
    // fall back to whichever one is set so partially-filled rows still render.
    label: m.value && m.label ? `${m.value} ${m.label}` : (m.value || m.label || ""),
  })).filter((m) => m.label);
  return {
    id: row.id,
    title: row.title,
    client: row.client_name || "",
    type: prettifyAssetType(row.asset_type),
    typeIcon,
    publishedLabel: relativeLabel(row.posted_at),
    metrics,
  };
}

// Deterministic per-title gradient so each card has its own mood — same
// trick as OurCreatorsHero. Used as the 16:9 poster background until we
// have real video posters wired up.
function gradientFor(seedStr) {
  const seed = [...(seedStr || "?")].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = seed * 137 % 360;
  return `linear-gradient(135deg, hsl(${hue} 75% 32%) 0%, hsl(${(hue + 60) % 360} 70% 16%) 60%, hsl(${(hue + 120) % 360} 60% 10%) 100%)`;
}

// Fallback list — kept in lockstep with the seed rows in
// migrations/case-studies-seed-real-2026-05-18.sql. Used ONLY when the D1
// fetch fails or returns count:0 (migration pending, founder deleted
// everything, network blip). Refresh whenever the seed migration changes.
const FALLBACK_CASE_STUDIES = [
  {
    id: "aish-remonetization",
    title: "AiSH is Live — Channel Cleanup & Remonetization",
    client: "AiSH is Live",
    type: "Long Form",
    typeIcon: Play,
    publishedLabel: "1 month ago",
    metrics: [
      { icon: Shield,   label: "Demonetization → Monetized" },
      { icon: Clock,    label: "9-day Resolution" },
      { icon: Sparkles, label: "Original Content + SEO" },
    ],
  },
  {
    id: "kundan-parashar-takeover",
    title: "Kundan Parashar — End-of-2024 Channel Takeover",
    client: "Kundan Parashar",
    type: "Long Form",
    typeIcon: Play,
    publishedLabel: "6 months ago",
    metrics: [
      { icon: Users,    label: "10K+ Subscribers" },
      { icon: Eye,      label: "250K+ Total Views" },
      { icon: Sparkles, label: "Devotional Niche" },
    ],
  },
  {
    id: "ap-sports-arena-reels",
    title: "AP Sports Arena — Reels That Punch Above the Page",
    client: "AP Sports Arena",
    type: "Short",
    typeIcon: Play,
    publishedLabel: "2 weeks ago",
    metrics: [
      { icon: Eye,        label: "10K+ Avg Views per Reel" },
      { icon: TrendingUp, label: "50K+ Peak Reel" },
      { icon: Sparkles,   label: "New Page" },
    ],
  },
];

function CaseStudyCard({ study, index }) {
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

  const TypeIcon = study.typeIcon;

  return (
    <article
      ref={ref}
      className="case-study-card"
      style={{
        transitionDelay: `${Math.min(index * 80, 600)}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
      }}
    >
      {/* 16:9 video poster — deterministic gradient bg + Play affordance */}
      <button
        type="button"
        className="case-study-card__poster"
        style={{ background: gradientFor(study.id) }}
        aria-label={`Watch the cut: ${study.title}`}
      >
        <div className="case-study-card__poster-scrim" />
        <div className="case-study-card__play">
          <Play size={26} fill="currentColor" />
        </div>
        <span className="case-study-card__poster-chip">
          <TypeIcon size={11} /> {study.type}
        </span>
      </button>

      <div className="case-study-card__body">
        <div className="case-study-card__client">{study.client}</div>
        <h3 className="case-study-card__title">{study.title}</h3>
        <div className="case-study-card__meta">
          <span>{study.publishedLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="case-study-card__meta-chip">
            <TypeIcon size={10} /> {study.type}
          </span>
        </div>

        <div className="case-study-card__metrics">
          {study.metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <span key={i} className="case-study-card__metric">
                <Icon size={12} /> {m.label}
              </span>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export default function FeaturedCaseStudies() {
  // D1-backed fetch: hydrate from /admin/agency/public/case-studies on mount.
  // The hardcoded FALLBACK_CASE_STUDIES list is the initial state so the
  // section renders instantly during the fetch and stays populated if the
  // worker call fails or returns nothing.
  const [studies, setStudies] = useState(FALLBACK_CASE_STUDIES);

  useEffect(() => {
    let cancelled = false;
    fetch(`${AUTH_BASE}/admin/agency/public/case-studies`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((j) => {
        if (cancelled) return;
        const rows = Array.isArray(j?.studies) ? j.studies : [];
        if (!rows.length) return; // keep fallback when API returns empty
        setStudies(rows.map(studyFromApi));
      })
      .catch(() => { /* swallow — fallback already showing */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="featured-case-studies">
      <div className="featured-case-studies__header">
        <span className="featured-case-studies__kicker">
          <Sparkles size={12} /> Recent ship
        </span>
        <h2 className="featured-case-studies__title">
          See what <em>landed.</em>
        </h2>
        <p className="featured-case-studies__lede">
          Pick a project. See the brief, the cut, and the numbers it pulled in.
        </p>
      </div>

      <ul className="featured-case-studies__grid">
        {studies.map((s, i) => (
          <li key={s.id}>
            <CaseStudyCard study={s} index={i} />
          </li>
        ))}
      </ul>

      <style>{`
        .featured-case-studies {
          padding: clamp(48px, 8vw, 96px) clamp(16px, 4vw, 32px);
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
        }
        .featured-case-studies__header {
          margin-bottom: clamp(32px, 5vw, 56px);
          max-width: 760px;
        }
        .featured-case-studies__kicker {
          display: inline-flex; align-items: center; gap: 6px;
          color: var(--orange, #E85002);
          font-size: 11px; font-weight: 800; letter-spacing: 0.15em;
          text-transform: uppercase; margin-bottom: 14px;
        }
        .featured-case-studies__title {
          font-size: clamp(36px, 6vw, 72px);
          font-weight: 800;
          line-height: 1.02;
          letter-spacing: -0.025em;
          margin: 0 0 16px;
          color: var(--text, #fafafa);
        }
        .featured-case-studies__title em {
          color: var(--orange, #E85002);
          font-style: italic;
        }
        .featured-case-studies__lede {
          font-size: clamp(15px, 1.2vw, 18px);
          line-height: 1.55;
          color: var(--text-muted, #a3a3a3);
          margin: 0;
          max-width: 580px;
        }

        .featured-case-studies__grid {
          list-style: none; padding: 0; margin: 0;
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(16px, 2vw, 24px);
        }
        @media (min-width: 900px) {
          .featured-case-studies__grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .case-study-card {
          display: flex;
          flex-direction: column;
          border-radius: 18px;
          overflow: hidden;
          background: var(--surface, #111);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 8px 20px rgba(0,0,0,0.35);
          transition: opacity 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      transform 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      box-shadow 250ms ease,
                      border-color 250ms ease;
        }
        .case-study-card:hover {
          box-shadow: 0 16px 40px rgba(232, 80, 2, 0.22);
          border-color: rgba(232, 80, 2, 0.4);
        }

        .case-study-card__poster {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          display: block;
          border: 0;
          padding: 0;
          cursor: pointer;
          overflow: hidden;
          color: white;
        }
        .case-study-card__poster-scrim {
          position: absolute; inset: 0;
          background: linear-gradient(180deg,
            rgba(0,0,0,0.1) 0%,
            rgba(0,0,0,0.0) 50%,
            rgba(0,0,0,0.5) 100%);
          pointer-events: none;
        }
        .case-study-card__play {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 64px; height: 64px;
          border-radius: 999px;
          background: rgba(255,255,255,0.95);
          color: var(--orange, #E85002);
          display: grid; place-items: center;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
          transition: transform 250ms ease, background 250ms ease;
        }
        .case-study-card:hover .case-study-card__play {
          transform: translate(-50%, -50%) scale(1.08);
          background: var(--orange, #E85002);
          color: white;
        }
        .case-study-card__poster-chip {
          position: absolute;
          top: 12px; left: 12px;
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 8px;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          font-size: 10px; font-weight: 700;
          color: white;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .case-study-card__body {
          padding: 18px 20px 22px;
        }
        .case-study-card__client {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--orange, #E85002);
          margin-bottom: 8px;
        }
        .case-study-card__title {
          font-size: clamp(16px, 1.4vw, 19px);
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: -0.01em;
          margin: 0 0 10px;
          color: var(--text, #fafafa);
        }
        .case-study-card__meta {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px;
          color: var(--text-muted, #a3a3a3);
          margin-bottom: 14px;
        }
        .case-study-card__meta-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text, #fafafa);
        }

        .case-study-card__metrics {
          display: flex; flex-wrap: wrap; gap: 6px;
        }
        .case-study-card__metric {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 9px;
          background: rgba(232, 80, 2, 0.10);
          border: 1px solid rgba(232, 80, 2, 0.28);
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text, #fafafa);
          letter-spacing: 0.02em;
        }
      `}</style>
    </section>
  );
}
