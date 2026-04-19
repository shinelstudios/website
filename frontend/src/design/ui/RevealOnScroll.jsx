import React from "react";
import { useInView } from "../hooks/useInView";

/**
 * RevealOnScroll — wraps children in a CSS-driven fade-up reveal that runs
 * exactly once when the node scrolls into view. Uses the global .reveal class
 * defined in index.css; no framer-motion overhead.
 *
 * Props:
 *   delay — optional CSS transition-delay (e.g. "120ms")
 *   as    — tag override
 */
export default function RevealOnScroll({
  as: As = "div",
  delay,
  className = "",
  style,
  children,
  ...rest
}) {
  const [ref, inView] = useInView({ once: true, threshold: 0.1 });

  const appliedStyle = delay
    ? { ...style, transitionDelay: delay }
    : style;

  return (
    <As
      ref={ref}
      className={`reveal ${inView ? "reveal-in" : ""} ${className}`}
      style={appliedStyle}
      {...rest}
    >
      {children}
    </As>
  );
}
