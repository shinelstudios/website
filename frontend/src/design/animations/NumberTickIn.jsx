/**
 * NumberTickIn — animates a number from 0 (or `from`) to `to` once, when the
 * element enters the viewport. Transform/opacity free: it only mutates a span's
 * textContent. Zero layout thrash because the container reserves space.
 *
 * Implementation note: prior version called setState every RAF tick (60×/sec
 * → 60 React renders per ticking element per second). On a hero with 3 tickers
 * that's 180 renders/sec just to update text. Now the RAF loop mutates the
 * span's textContent directly via a ref; React renders happen only at mount,
 * unmount, and prop change.
 */
import React, { useEffect, useRef } from "react";
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
  const [inViewRef, inView] = useInView({ once: true, threshold: 0.3 });
  const spanRef = useRef(null);

  // Combine the inView ref + the textContent-mutation ref onto the same span.
  const setRef = (node) => {
    spanRef.current = node;
    if (typeof inViewRef === "function") {
      inViewRef(node);
    } else if (inViewRef) {
      inViewRef.current = node;
    }
  };

  // Initial textContent set on mount + whenever the props that determine the
  // final value change.
  useEffect(() => {
    if (!spanRef.current) return;
    spanRef.current.textContent = `${prefix}${format(reduce ? to : from, formatter)}${suffix}`;
  }, [from, to, prefix, suffix, formatter, reduce]);

  useEffect(() => {
    if (reduce) {
      if (spanRef.current) {
        spanRef.current.textContent = `${prefix}${format(to, formatter)}${suffix}`;
      }
      return;
    }
    if (!inView) return;

    let raf = 0;
    const start = performance.now();
    const delta = to - from;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + delta * eased;
      // Direct DOM mutation — no React render. textContent assignment is
      // cheap and doesn't trigger reflow when the string length is stable.
      if (spanRef.current) {
        spanRef.current.textContent = `${prefix}${format(value, formatter)}${suffix}`;
      }
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, from, to, duration, reduce, prefix, suffix, formatter]);

  return (
    <span ref={setRef} className={`text-mono-num tabular-nums ${className}`}>
      {/* Initial render — replaced by the effect above before paint. */}
      {prefix}{format(reduce ? to : from, formatter)}{suffix}
    </span>
  );
}
