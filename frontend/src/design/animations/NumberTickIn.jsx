/**
 * NumberTickIn — animates a number from 0 (or `from`) to `to` once, when the
 * element enters the viewport. Transform/opacity free: it only mutates a span's
 * textContent. Zero layout thrash because the container reserves space.
 */
import React, { useEffect, useRef, useState } from "react";
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
    const start = performance.now();
    const delta = to - from;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + delta * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, from, to, duration, reduce]);

  return (
    <span ref={ref} className={`text-mono-num tabular-nums ${className}`}>
      {prefix}{format(value, formatter)}{suffix}
    </span>
  );
}
