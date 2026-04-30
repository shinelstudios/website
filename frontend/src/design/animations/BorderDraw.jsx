/**
 * BorderDraw — animated SVG border that traces around an element.
 * Used for the thumbnail-tester winner card highlight (replaces the
 * earlier "vote burst" idea — feels intentional rather than game-y).
 *
 * Renders an absolutely-positioned SVG over its parent (parent must
 * be `position: relative`). Path is a rounded rect with stroke-dash
 * animation; total draw ~600 ms.
 *
 * Usage:
 *   <div className="relative">
 *     {isWinner && <BorderDraw />}
 *     …card content…
 *   </div>
 *
 * Reduced motion: renders the border statically (already drawn).
 */
import React, { useEffect, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

export default function BorderDraw({
  radius = 16,
  color = "var(--orange)",
  strokeWidth = 2,
  durationMs = 600,
  className = "",
}) {
  const reduce = useReducedMotion();
  const [drawn, setDrawn] = useState(reduce);

  useEffect(() => {
    if (reduce) { setDrawn(true); return; }
    // Force the dasharray to be measured before flipping to drawn so
    // the transition actually animates.
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [reduce]);

  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
      style={{ overflow: "visible" }}
    >
      <rect
        x={strokeWidth / 2}
        y={strokeWidth / 2}
        width={`calc(100% - ${strokeWidth}px)`}
        height={`calc(100% - ${strokeWidth}px)`}
        rx={radius}
        ry={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        // pathLength normalises the perimeter so dashoffset can be
        // expressed as 0..100 regardless of element size.
        pathLength="100"
        strokeDasharray="100 100"
        strokeDashoffset={drawn ? 0 : 100}
        style={{
          transition: reduce ? "none" : `stroke-dashoffset ${durationMs}ms cubic-bezier(0.65, 0, 0.35, 1)`,
        }}
      />
    </svg>
  );
}
