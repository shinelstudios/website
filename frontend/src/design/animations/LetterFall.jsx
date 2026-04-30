/**
 * LetterFall — splits a string into per-letter spans and drops each in
 * with translateY + opacity, staggered. One-shot when the element
 * enters viewport. Reduced-motion users get the plain text immediately.
 *
 * Usage:
 *   <LetterFall as="h2" className="text-display-lg">Your headline</LetterFall>
 *
 * Notes:
 *   - Strings only. Pass nested elements through `children` and they
 *     render unanimated — keep this primitive for *text*.
 *   - Whitespace preserved as non-breaking spaces so layout doesn't
 *     reflow during the stagger.
 *   - `aria-label` set on the container, individual letters
 *     `aria-hidden` so SR readers hear the whole word once.
 */
import React, { useMemo } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useInView } from "../hooks/useInView";

export default function LetterFall({
  children,
  as: Tag = "span",
  className = "",
  staggerMs = 28,
  durationMs = 520,
  delayMs = 0,
}) {
  const reduce = useReducedMotion();
  const [ref, inView] = useInView({ once: true, threshold: 0.4 });

  const text = typeof children === "string" ? children : "";
  const chars = useMemo(() => text.split(""), [text]);

  if (reduce || !text) {
    // Strip animation entirely — render as plain text.
    return <Tag ref={ref} className={className}>{children}</Tag>;
  }

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {chars.map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            display: "inline-block",
            transform: inView ? "translate3d(0, 0, 0)" : "translate3d(0, 0.4em, 0)",
            opacity: inView ? 1 : 0,
            transition: `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs + i * staggerMs}ms, opacity ${durationMs}ms ease ${delayMs + i * staggerMs}ms`,
            // Non-breaking space prevents layout collapse on " " chars.
            whiteSpace: ch === " " ? "pre" : undefined,
          }}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </Tag>
  );
}
