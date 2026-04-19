/**
 * ScrollAurora — signature ambient for /home hero.
 *
 * A soft orange radial blob that drifts slowly and shifts position as the
 * user scrolls. Cost: one GPU-composited div animating transform+opacity.
 * Cost budget: < 0.3ms main-thread / frame.
 *
 * Pauses automatically when off-screen (IntersectionObserver) and when the
 * tab is hidden (Page Visibility API).
 */
import React, { useEffect, useRef } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useDeviceCapabilities } from "../hooks/useDeviceCapabilities";

export default function ScrollAurora({ intensity = 1 }) {
  const blobRef = useRef(null);
  const containerRef = useRef(null);
  const reduce = useReducedMotion();
  const { isLowPower, isLowBattery } = useDeviceCapabilities();

  useEffect(() => {
    if (reduce || isLowPower || isLowBattery) return;
    const blob = blobRef.current;
    const container = containerRef.current;
    if (!blob || !container) return;

    let raf = 0;
    let paused = false;
    let lastScroll = window.scrollY || 0;

    const onScroll = () => {
      if (paused) return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const progress = Math.max(0, Math.min(1, y / (window.innerHeight * 1.2)));
        // Drift blob horizontally as user scrolls — opposite direction for parallax
        const x = -15 + progress * 20;
        blob.style.transform = `translate3d(${x}vw, ${progress * -10}vh, 0) scale(${1 + progress * 0.15})`;
        lastScroll = y;
        raf = 0;
      });
    };

    const io = new IntersectionObserver(
      ([entry]) => { paused = !entry.isIntersecting; },
      { rootMargin: "0px", threshold: 0 }
    );
    io.observe(container);

    const onVis = () => { paused = document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduce, isLowPower, isLowBattery]);

  // Static fallback for reduced-motion / low-end devices.
  const staticFallback = reduce || isLowPower || isLowBattery;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none no-select"
    >
      <div
        ref={blobRef}
        className={`aurora-blob ${staticFallback ? "" : ""}`}
        style={{
          top: "10%",
          left: "10%",
          opacity: Math.min(1, 0.7 * intensity),
          animation: staticFallback ? "none" : undefined,
        }}
      />
      <div
        className={`aurora-blob ${staticFallback ? "" : ""}`}
        style={{
          bottom: "5%",
          right: "-10%",
          width: "45vw",
          height: "45vw",
          opacity: Math.min(1, 0.4 * intensity),
          animationDelay: "-9s",
          animationDuration: "22s",
        }}
      />
    </div>
  );
}
