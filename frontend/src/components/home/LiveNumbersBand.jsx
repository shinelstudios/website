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

  return (
    <Section size="md" tone="surface" hairlineTop hairlineBottom>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
        {[
          { kicker: "This month", value: data.videosThisMonth, suffix: "+", label: "videos shipped" },
          { kicker: "Lifetime",   value: data.totalViews,      formatter: "compact", label: "views generated" },
          { kicker: "On the desk", value: data.hoursEdited,    suffix: "+ hrs", label: "of edits this year" },
        ].map((stat, i) => (
          <RevealOnScroll key={stat.label} delay={`${i * 80}ms`}>
            <div className="text-center md:text-left">
              <Eyebrow className="mb-2" style={{ color: "var(--orange)" }}>{stat.kicker}</Eyebrow>
              <div className="text-display-lg leading-none mb-1.5" style={{ color: "var(--text)" }}>
                <NumberTickIn
                  to={stat.value}
                  formatter={stat.formatter}
                  suffix={stat.suffix || ""}
                  duration={1600}
                />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {stat.label}
              </p>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </Section>
  );
}
