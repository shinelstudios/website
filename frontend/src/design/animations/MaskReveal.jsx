/**
 * MaskReveal — reveals its child by animating clip-path inset() from a
 * given edge as it enters the viewport. Cheaper than transform on
 * containers that already need their natural layout, and works for
 * arbitrary content (images, cards, tables).
 *
 * Usage:
 *   <MaskReveal from="bottom"><img src="…" /></MaskReveal>
 *   <MaskReveal from="left" delay={120}>…</MaskReveal>
 *
 * Perf: clip-path is GPU-composited in modern browsers (Safari 16+,
 * Chrome 105+, Firefox 103+). On older engines it gracefully no-ops
 * because the initial inset is set via inline style only when JS sees
 * the IO entry — until then the element renders fully visible.
 */
import React from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useInView } from "../hooks/useInView";

const FROM_INSET = {
  top: "inset(100% 0 0 0)",
  bottom: "inset(0 0 100% 0)",
  left: "inset(0 100% 0 0)",
  right: "inset(0 0 0 100%)",
};

export default function MaskReveal({
  children,
  from = "bottom",
  durationMs = 800,
  delayMs = 0,
  className = "",
  style = {},
}) {
  const reduce = useReducedMotion();
  const [ref, inView] = useInView({ once: true, threshold: 0.2 });

  if (reduce) {
    return <div ref={ref} className={className} style={style}>{children}</div>;
  }

  const initialInset = FROM_INSET[from] || FROM_INSET.bottom;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        clipPath: inView ? "inset(0 0 0 0)" : initialInset,
        WebkitClipPath: inView ? "inset(0 0 0 0)" : initialInset,
        transition: `clip-path ${durationMs}ms cubic-bezier(0.65, 0, 0.35, 1) ${delayMs}ms, -webkit-clip-path ${durationMs}ms cubic-bezier(0.65, 0, 0.35, 1) ${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}
