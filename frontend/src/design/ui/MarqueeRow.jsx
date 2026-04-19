import React, { useMemo } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

/**
 * MarqueeRow — duplicates children and slides them horizontally with a
 * CSS keyframe. Transform-only, infinite, pause-on-hover (desktop).
 *
 * Props:
 *   direction — "left" | "right"        default "left"
 *   speed     — "slow" | "medium" | "fast"  default "medium"
 *   gap       — tailwind gap class     default "gap-12"
 *   pauseOnHover — default true
 *   children — items; will be cloned once for seamless loop
 */
export default function MarqueeRow({
  direction = "left",
  speed = "medium",
  gap = "gap-12",
  pauseOnHover = true,
  className = "",
  children,
}) {
  const reduce = useReducedMotion();
  const duration = { slow: "60s", medium: "40s", fast: "25s" }[speed] || "40s";
  const animClass = direction === "right" ? "animate-marquee-ltr" : "animate-marquee-rtl";

  const items = useMemo(() => React.Children.toArray(children), [children]);

  if (reduce) {
    return (
      <div className={`marquee-viewport mask-fade-x ${className}`}>
        <div className={`flex ${gap} px-8 overflow-x-auto no-scrollbar`}>
          {items}
        </div>
      </div>
    );
  }

  return (
    <div className={`marquee-viewport mask-fade-x ${pauseOnHover ? "marquee-hover-pause" : ""} ${className}`}>
      <div
        className={`marquee-track ${animClass}`}
        style={{ "--marquee-duration": duration }}
      >
        <div className={`flex ${gap} px-8`}>{items}</div>
        <div className={`flex ${gap} px-8`} aria-hidden="true">{items}</div>
      </div>
    </div>
  );
}
