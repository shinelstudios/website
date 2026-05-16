/**
 * ConstellationHover — draws thin SVG lines from a "source" element
 * to a list of "target" element refs on hover. On the /tools/custom-ais
 * grid, hovering one tool card lights up its related tools by drawing
 * lines to them.
 *
 * Implementation: a single absolutely-positioned SVG inside a wrapper
 * that contains both the source and the targets. Lines are rendered
 * only while `active`. Endpoints recalc on mount + resize.
 *
 * Skipped on coarse pointers (touch) — there's no hover state to
 * trigger from, and forcing it on tap would steal attention.
 *
 * Usage:
 *   const targetRefs = useRef([]);
 *   <ConstellationHoverScope>
 *     {tools.map((tool, i) => (
 *       <div ref={el => targetRefs.current[i] = el} key={tool.id}>…</div>
 *     ))}
 *     <ConstellationHover sourceRef={sourceRef} targets={targetRefs} active={hoverIndex === i} />
 *   </ConstellationHoverScope>
 *
 * For brevity, this single-file primitive is invoked PER source card,
 * with the page-level wrapper providing the SVG canvas via context.
 * The /tools/custom-ais integration ships in a follow-up commit.
 */
import React, { useEffect, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

export default function ConstellationHover({
  sourceRef,
  targetRefs = [],
  active = false,
  color = "var(--orange)",
  strokeWidth = 1,
  containerRef,
}) {
  const reduce = useReducedMotion();
  const [lines, setLines] = useState([]);

  useEffect(() => {
    if (reduce) return;
    const fine = typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return;
    if (!active) { setLines([]); return; }

    const src = sourceRef?.current;
    const wrap = containerRef?.current;
    if (!src || !wrap) return;

    const wrapRect = wrap.getBoundingClientRect();
    const srcRect = src.getBoundingClientRect();
    const srcCx = srcRect.left + srcRect.width / 2 - wrapRect.left;
    const srcCy = srcRect.top + srcRect.height / 2 - wrapRect.top;

    const next = targetRefs
      .map((el) => {
        if (!el || el === src) return null;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2 - wrapRect.left;
        const cy = r.top + r.height / 2 - wrapRect.top;
        return { x1: srcCx, y1: srcCy, x2: cx, y2: cy };
      })
      .filter(Boolean);

    setLines(next);
  }, [active, sourceRef, targetRefs, containerRef, reduce]);

  if (reduce || !active || lines.length === 0) return null;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ overflow: "visible", zIndex: 1 }}
    >
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity="0.5"
          style={{
            // Slight stagger so the lines feel additive, not all-at-once.
            transition: `opacity 260ms ease ${i * 40}ms`,
          }}
        />
      ))}
    </svg>
  );
}
