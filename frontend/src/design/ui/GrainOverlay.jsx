import React from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

/**
 * GrainOverlay — single fixed-position SVG noise layer at 3% opacity, mix-blend
 * overlay. Renders once per page; positions itself under the header but above
 * every section. Use `local` to scope it to a parent (absolute).
 *
 * Respects prefers-reduced-motion by fading further.
 */
export default function GrainOverlay({ local = false, opacity }) {
  const reduce = useReducedMotion();
  const effective = opacity ?? (reduce ? 0.02 : 0.035);

  return (
    <div
      aria-hidden="true"
      className="grain-overlay"
      style={{
        opacity: effective,
        position: local ? "absolute" : "fixed",
      }}
    />
  );
}
