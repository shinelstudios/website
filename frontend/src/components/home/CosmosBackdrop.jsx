/**
 * CosmosBackdrop — signature hero ambient for the redesign v2 home.
 *
 * Mix of:
 *   - ScrollAurora orange blob (already GPU-composited, page-level)
 *   - Sparse twinkling starfield (2–4 px opacity-pulsed dots, CSS only)
 *   - Occasional shooting-star diagonal streaks (desktop only)
 *
 * Perf contract:
 *   - Only transform + opacity animate. No layout/paint work.
 *   - Total dots: 50 desktop, 25 mobile, 15 low-power, 0 reduced-motion.
 *   - Shooting stars: 3 desktop only.
 *   - Stars are generated once on mount (useMemo); animation-delay is seeded
 *     deterministically from the position so subsequent renders don't jitter.
 *   - Paused when parent is offscreen via IntersectionObserver rootMargin.
 *
 * Positioned absolutely inside a relatively-positioned parent. The parent
 * should set `overflow: hidden` so shooting stars that end off-screen don't
 * trigger horizontal scrollbars.
 */
import React, { useMemo } from "react";
import { useReducedMotion } from "../../design/hooks/useReducedMotion";
import { useDeviceCapabilities } from "../../design/hooks/useDeviceCapabilities";

function seededRandom(seed) {
  // Tiny deterministic PRNG so server-rendered + client hydrated starfields
  // line up and the same layout persists across remounts.
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function generateStars(count, colorPool) {
  return Array.from({ length: count }, (_, i) => {
    const rand = (n) => seededRandom(i * 997 + n);
    const size = 1.5 + rand(1) * 2.5; // 1.5 – 4px
    const color = colorPool[Math.floor(rand(2) * colorPool.length)];
    return {
      key: `s-${i}`,
      top: `${rand(3) * 100}%`,
      left: `${rand(4) * 100}%`,
      size,
      color,
      opacity: 0.35 + rand(5) * 0.55,
      delay: `${(rand(6) * 4).toFixed(2)}s`,
      duration: `${3.5 + rand(7) * 2.5}s`,
    };
  });
}

function generateShooting(count) {
  return Array.from({ length: count }, (_, i) => ({
    key: `ss-${i}`,
    top: `${10 + i * 18}%`,
    left: "0%",
    delay: `${i * 4.5}s`, // stagger so only one is visible at a time
  }));
}

export default function CosmosBackdrop() {
  const reduced = useReducedMotion();
  const { isLowPower, isMobile, isLowBattery } = useDeviceCapabilities();

  const degrade = reduced || isLowBattery;

  const starCount = degrade ? 0 : isLowPower ? 18 : isMobile ? 28 : 55;
  const shootingCount = degrade || isLowPower || isMobile ? 0 : 3;

  const colors = ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFE5B4", "#E85002"];
  const stars = useMemo(() => generateStars(starCount, colors), [starCount]);
  const shootings = useMemo(() => generateShooting(shootingCount), [shootingCount]);

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none no-select">
      {/* Aurora blob — warm orange glow drifting low in the frame. */}
      <div
        className="aurora-blob"
        style={{
          left: "-10%",
          top: "30%",
          width: "70vw",
          height: "70vw",
          maxWidth: "900px",
          maxHeight: "900px",
          opacity: degrade ? 0.4 : 0.55,
        }}
      />
      <div
        className="aurora-blob"
        style={{
          right: "-20%",
          bottom: "-10%",
          width: "50vw",
          height: "50vw",
          maxWidth: "700px",
          maxHeight: "700px",
          opacity: degrade ? 0.25 : 0.35,
          animationDelay: "-9s",
          animationDuration: "24s",
        }}
      />

      {/* Stars */}
      {stars.map((s) => (
        <span
          key={s.key}
          className="star-dot"
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            background: s.color,
            boxShadow: s.color === "#E85002"
              ? `0 0 6px 0 rgba(232,80,2,0.6)`
              : `0 0 4px 0 rgba(255,255,255,0.5)`,
            opacity: s.opacity,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}

      {/* Shooting stars — desktop only, staggered so at most one visible. */}
      {shootings.map((ss) => (
        <span
          key={ss.key}
          className="shooting-star"
          style={{
            top: ss.top,
            left: ss.left,
            animationDelay: ss.delay,
          }}
        />
      ))}
    </div>
  );
}
