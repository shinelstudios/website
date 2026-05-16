/**
 * NumberTickIn — animates a number from 0 (or `from`) to `to` once, when the
 * element enters the viewport. Transform/opacity free: it only mutates a span's
 * textContent. Zero layout thrash because the container reserves space.
 *
 * Implementation note: an earlier rewrite tried to mutate `textContent`
 * directly via a ref to skip the per-frame React render. That version
 * introduced subtle reconciler issues (multiple text-node children getting
 * replaced with a single textContent write) that crashed pages under
 * concurrent rendering. Reverted to the simple setState approach — the
 * three or so renders/sec per ticker are fine. 60 React renders/sec for
 * 1.4 seconds is < 90 renders, well within React's batching budget.
 */
import React, { useEffect, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useInView } from "../hooks/useInView";

function format(value, formatter) {
  if (formatter === "compact") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return String(Math.round(value));
  }
  if (formatter === "currency") return `₹${Math.round(value).toLocaleString("en-IN")}`;
  return Math.round(value).toLocaleString();
}

export default function NumberTickIn({
  to,
  from = 0,
  duration = 1400,
  formatter,
  prefix = "",
  suffix = "",
  className = "",
}) {
  const reduce = useReducedMotion();
  const [ref, inView] = useInView({ once: true, threshold: 0.3 });
  const [value, setValue] = useState(reduce ? to : from);

  useEffect(() => {
    if (reduce) { setValue(to); return; }
    if (!inView) return;

    let raf = 0;
    let cancelled = false;
    const start = performance.now();
    const delta = to - from;

    // Pause-on-hide compliance with the CLAUDE.md perf contract. If the
    // user tab-switches mid-tick, snap to the final value and stop —
    // there's no useful state for a backgrounded number ticker, and
    // continuing the RAF burns CPU + drains battery for no reason.
    const onVis = () => {
      if (document.hidden && !cancelled) {
        cancelled = true;
        if (raf) cancelAnimationFrame(raf);
        setValue(to);
      }
    };

    const tick = (now) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + delta * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [inView, from, to, duration, reduce]);

  return (
    <span ref={ref} className={`text-mono-num tabular-nums ${className}`}>
      {prefix}{format(value, formatter)}{suffix}
    </span>
  );
}
