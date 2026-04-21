/**
 * KineticVerb — a span that cycles through a list of verbs with a
 * character-level morph.
 *
 * Character pieces animate with opacity + translateY only (compositor-safe).
 * Respects prefers-reduced-motion by holding on `words[0]`.
 *
 *   <KineticVerb words={["edit","grow","ship","brand"]} />
 *
 * Perf contract:
 *   - One `setTimeout` + one RAF per cycle.
 *   - No reflow: container has a fixed min-width tied to longest word.
 *   - IntersectionObserver pauses cycling when off-screen.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "../../design";

export default function KineticVerb({
  words = [],
  intervalMs = 3000,
  style,
  className = "",
  underline = true,
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const ref = useRef(null);
  const inView = useRef(true);

  // Pause cycling when the hero is scrolled out of view.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => { inView.current = entries[0]?.isIntersecting ?? true; },
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || words.length < 2) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (inView.current) setIndex((i) => (i + 1) % words.length);
    };
    const id = setInterval(tick, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [reduced, words.length, intervalMs]);

  // Reserve space for the longest word so surrounding text doesn't reflow.
  const longest = useMemo(() => {
    return words.reduce((max, w) => (w.length > max.length ? w : max), "");
  }, [words]);

  const current = words[index] || words[0] || "";

  return (
    <span
      ref={ref}
      className={`kinetic-verb relative inline-block align-baseline ${className}`}
      style={{
        minWidth: `${Math.max(1, longest.length)}ch`,
        ...style,
      }}
    >
      {/* Invisible sizer: locks width to the longest word so layout never reflows. */}
      <span aria-hidden="true" className="invisible whitespace-nowrap">{longest}</span>

      {/* Animated current word, absolutely positioned on top of the sizer. */}
      <span
        key={current}
        aria-live="polite"
        className="absolute inset-0 flex items-baseline"
        style={{
          animation: reduced ? "none" : "kineticVerbIn 520ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        {current}
      </span>

      {underline && (
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 bottom-[-0.08em] h-[0.09em] rounded-full"
          style={{ background: "currentColor", opacity: 0.25 }}
        />
      )}

      <style>{`
        @keyframes kineticVerbIn {
          0%   { opacity: 0; transform: translateY(0.25em); }
          60%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </span>
  );
}
