/**
 * ScrollZoomReveal — wrap any section to give it a soft zoom-in reveal as
 * it enters the viewport. Once it scrolls past, it gently zooms back out
 * (parallax-feel without the perf cost of true parallax).
 *
 * Usage:
 *   <ScrollZoomReveal><MySection /></ScrollZoomReveal>
 *
 * Intersection-observer driven so we only do work when the section is
 * actually near the viewport. Respects prefers-reduced-motion.
 */

import React, { useEffect, useRef, useState } from "react";

export default function ScrollZoomReveal({ children, intensity = 0.05, fadeIn = true }) {
  const ref = useRef(null);
  const [phase, setPhase] = useState("entering"); // "entering" | "in" | "leaving"
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!ref.current || reducedMotion) return;

    // 3 thresholds — entering (bottom edge crossing in), in (centered), leaving
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const r = e.intersectionRatio;
          if (r > 0.7) setPhase("in");
          else if (r > 0.2) setPhase("entering");
          else setPhase("leaving");
        }
      },
      { threshold: [0, 0.2, 0.5, 0.7, 1] }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [reducedMotion]);

  // Map phase to transform
  let scale = 1;
  let opacity = 1;
  if (!reducedMotion) {
    if (phase === "entering") {
      scale = 1 - intensity; // start slightly smaller
      opacity = fadeIn ? 0.6 : 1;
    } else if (phase === "in") {
      scale = 1; // settled
      opacity = 1;
    } else if (phase === "leaving") {
      scale = 1 - intensity * 0.5; // gentle zoom-out as it leaves
      opacity = 0.9;
    }
  }

  return (
    <div
      ref={ref}
      style={{
        transform: `scale(${scale})`,
        opacity,
        transition: "transform 900ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 900ms ease",
        transformOrigin: "center 40%",
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}
