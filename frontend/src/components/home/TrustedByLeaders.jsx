/**
 * ReceiptsBand — three giant creator-focused numbers.
 *
 * Shinel works with CREATORS, not brands. So no "trusted by brands" wall.
 * Instead: a count-up stats band that flexes the roster + reach + work
 * shipped for those creators. Pulls from /admin/agency/public/stats.
 *
 * Scroll-reveal: numbers count from 0 → target when the section enters
 * the viewport (1.4s ease-out cubic).
 */

import React, { useEffect, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";

function useCountUp(target, durationMs = 1200, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start || !target) return;
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, start]);
  return value;
}

function fmtCount(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

function StatColumn({ value, label, sub, visible }) {
  const counted = useCountUp(value || 0, 1400, visible);
  return (
    <div className="trusted-stat">
      <div className="trusted-stat__num">{fmtCount(counted)}<span className="trusted-stat__suffix">+</span></div>
      <div className="trusted-stat__label">{label}</div>
      {sub && <div className="trusted-stat__sub">{sub}</div>}
    </div>
  );
}

export default function TrustedByLeaders() {
  const [stats, setStats] = useState(null);
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch(`${AUTH_BASE}/admin/agency/public/stats`)
      .then((r) => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.2 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="trusted-section">
      <div className="trusted-section__inner">
        <span className="trusted-section__kicker">
          <TrendingUp size={12} /> The receipts
        </span>
        <h2 className="trusted-section__title">
          The numbers behind the <em>roster.</em>
        </h2>

        <div className="trusted-stats">
          <StatColumn
            value={stats?.active_clients || 0}
            label="Creators on the roster"
            sub="actively managed today"
            visible={visible}
          />
          <StatColumn
            value={Math.round((stats?.total_reach || 0) / 1000) * 1000}
            label="Combined audience"
            sub="across YouTube + Instagram"
            visible={visible}
          />
          <StatColumn
            value={stats?.posted_last_30d ? stats.posted_last_30d * 12 : 0}
            label="Projects shipped"
            sub="across our 4 years"
            visible={visible}
          />
        </div>
      </div>

      <style>{`
        .trusted-section {
          padding: clamp(64px, 9vw, 120px) clamp(16px, 4vw, 32px);
          position: relative;
          background: linear-gradient(180deg, transparent 0%, rgba(232, 80, 2, 0.04) 50%, transparent 100%);
        }
        .trusted-section__inner {
          max-width: 1400px;
          margin: 0 auto;
          text-align: center;
        }
        .trusted-section__kicker {
          display: inline-flex; align-items: center; gap: 6px;
          color: var(--orange, #E85002);
          font-size: 11px; font-weight: 800; letter-spacing: 0.15em;
          text-transform: uppercase; margin-bottom: 16px;
        }
        .trusted-section__title {
          font-size: clamp(34px, 5vw, 64px);
          font-weight: 800; line-height: 1.05; letter-spacing: -0.025em;
          margin: 0 0 56px;
          color: var(--text, #fafafa);
        }
        .trusted-section__title em {
          color: var(--orange, #E85002);
          font-style: italic;
        }

        .trusted-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(20px, 3vw, 48px);
          max-width: 980px;
          margin: 0 auto clamp(48px, 7vw, 80px);
        }
        @media (max-width: 640px) {
          .trusted-stats { grid-template-columns: 1fr; gap: 28px; }
        }

        .trusted-stat {
          padding: 24px;
          border-left: 2px solid var(--orange, #E85002);
          text-align: left;
        }
        @media (max-width: 640px) {
          .trusted-stat { text-align: center; border-left: none; border-top: 2px solid var(--orange, #E85002); padding-top: 16px; }
        }
        .trusted-stat__num {
          font-size: clamp(56px, 8vw, 96px);
          font-weight: 900;
          line-height: 0.95;
          letter-spacing: -0.04em;
          color: var(--text, #fafafa);
          font-variant-numeric: tabular-nums;
        }
        .trusted-stat__suffix {
          color: var(--orange, #E85002);
        }
        .trusted-stat__label {
          margin-top: 12px;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text, #fafafa);
        }
        .trusted-stat__sub {
          margin-top: 4px;
          font-size: 12px;
          color: var(--text-muted, #a3a3a3);
          letter-spacing: 0.01em;
        }

      `}</style>
    </section>
  );
}
