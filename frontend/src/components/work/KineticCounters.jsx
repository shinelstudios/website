/**
 * KineticCounters — thin horizontal strip of big ticked-in numbers.
 *
 * Sits above the hero headline on /work. Gives scale-proof in one glance
 * before the user reads a single word of copy.
 *
 * Each stat animates with the existing NumberTickIn primitive from @/design
 * (IntersectionObserver-gated, respects reduced motion).
 */
import React from "react";
import { NumberTickIn } from "../../design";

export default function KineticCounters({ stats = [] }) {
  if (!stats.length) return null;
  return (
    <div
      className="flex flex-wrap items-baseline gap-x-6 gap-y-3 mb-6 md:mb-8"
      role="list"
      aria-label="Studio scale"
    >
      {stats.map((s, i) => (
        <div key={i} role="listitem" className="flex items-baseline gap-2 min-w-0">
          <span
            className="font-mono font-black tabular-nums text-lg md:text-xl"
            style={{ color: "var(--text)" }}
          >
            <NumberTickIn
              to={s.value}
              formatter={s.formatter}
              prefix={s.prefix || ""}
              suffix={s.suffix || ""}
            />
          </span>
          <span
            className="text-[10px] md:text-[11px] uppercase tracking-[0.18em] font-bold whitespace-nowrap"
            style={{ color: "var(--text-muted)" }}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
