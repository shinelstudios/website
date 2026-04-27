/**
 * AnalyticsTestimonialCard — testimonial with quantified metrics. Cleaner
 * than the old inline cards: HairlineCard + design tokens + Mono numerals
 * for the metrics grid.
 */
import React from "react";
import { Quote, TrendingUp } from "lucide-react";
import { HairlineCard } from "../../design";

export default function AnalyticsTestimonialCard({ testimonial }) {
  const t = testimonial;
  const metrics = Array.isArray(t.metrics) ? t.metrics.slice(0, 3) : [];

  return (
    <HairlineCard className="p-5 md:p-6 h-full flex flex-col">
      <Quote size={16} className="mb-3" style={{ color: "var(--orange)", opacity: 0.7 }} aria-hidden="true" />
      <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text)" }}>
        {t.quote}
      </p>

      {metrics.length > 0 && (
        <div
          className="grid grid-cols-3 gap-2 mb-5 p-3 rounded-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
        >
          {metrics.map((m, i) => (
            <div key={i} className="text-center">
              <p className="text-display-sm leading-none text-mono-num tabular-nums" style={{ color: "var(--orange)" }}>
                {m.value}
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest mt-1" style={{ color: "var(--text-muted)" }}>
                {m.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-end justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text)" }}>
            {t.creator}
          </p>
          {t.handle ? (
            <p className="text-[10px] font-mono opacity-60" style={{ color: "var(--text-muted)" }}>
              {t.handle}
            </p>
          ) : null}
        </div>
        {t.deltaLabel ? (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-mono"
            style={{ color: "#16a34a" }}
          >
            <TrendingUp size={10} aria-hidden="true" /> {t.deltaLabel}
          </span>
        ) : null}
      </div>
    </HairlineCard>
  );
}
