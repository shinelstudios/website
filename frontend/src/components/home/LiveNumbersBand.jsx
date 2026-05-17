/**
 * LiveNumbersBand — three NumberTickIn counters fed by /api/homepage-stats.
 * Falls back to sensible defaults if the endpoint is empty/unreachable, so
 * the strip never renders blank.
 */
import React from "react";
import { Section, NumberTickIn, RevealOnScroll, Eyebrow } from "../../design";
import { AUTH_BASE } from "../../config/constants";

const FALLBACK = {
  videosThisMonth: 80,
  totalViews: 1_700_000,
  hoursEdited: 950,
};

export default function LiveNumbersBand() {
  const [stats, setStats] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`${AUTH_BASE}/api/homepage-stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        // Use server numbers only if they look real — else stay on fallback
        // so the band always shows compelling figures on cold/empty DBs.
        const next = {
          videosThisMonth: d.videosThisMonth > 0 ? d.videosThisMonth : FALLBACK.videosThisMonth,
          totalViews: d.totalViews > 0 ? d.totalViews : FALLBACK.totalViews,
          hoursEdited: d.hoursEdited > 0 ? d.hoursEdited : FALLBACK.hoursEdited,
        };
        setStats(next);
      })
      .catch(() => { /* fallback already set */ });
  }, []);

  const data = stats || FALLBACK;

  // Founder policy: ONE hero number only — total reach. Beats the noise of
  // 3 competing stats and lets the trophy wall + receipts band downstream
  // carry the depth. Total reach is the single most flexable number we have.
  const totalReach = (data.totalViews && data.totalViews > 1_000_000)
    ? data.totalViews
    : (data.totalReach || data.totalViews || 0);
  return (
    <Section size="md" tone="surface" hairlineTop hairlineBottom>
      <RevealOnScroll>
        <div className="text-center">
          <Eyebrow className="mb-3" style={{ color: "var(--orange)" }}>Total managed reach</Eyebrow>
          <div className="text-display-xl md:text-display-2xl leading-none mb-3" style={{ color: "var(--text)" }}>
            <NumberTickIn
              to={totalReach}
              formatter="compact"
              suffix="+"
              duration={1800}
            />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            humans following the creators on our roster
          </p>
        </div>
      </RevealOnScroll>
    </Section>
  );
}
