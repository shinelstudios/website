/**
 * SpotlightSweep — desktop-only radial gradient that follows the cursor.
 *
 * Uses CSS custom properties + a single radial-gradient, so updating the
 * cursor position costs *zero* layout/paint work — the browser only re-runs
 * the compositor. Skipped entirely on touch devices.
 */
import React, { useEffect, useRef } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useDeviceCapabilities } from "../hooks/useDeviceCapabilities";

export default function SpotlightSweep({ color = "rgba(232, 80, 2, 0.15)" }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { isTouch, isLowPower } = useDeviceCapabilities();

  useEffect(() => {
    if (reduce || isTouch || isLowPower) return;
    const node = ref.current;
    if (!node) return;

    let raf = 0;
    const onMove = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        node.style.setProperty("--x", `${e.clientX}px`);
        node.style.setProperty("--y", `${e.clientY}px`);
        raf = 0;
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduce, isTouch, isLowPower]);

  if (reduce || isTouch || isLowPower) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none no-select"
      style={{
        "--x": "50%",
        "--y": "50%",
        background: `radial-gradient(600px circle at var(--x) var(--y), ${color}, transparent 60%)`,
        zIndex: 2,
      }}
    />
  );
}
