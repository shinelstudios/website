import React from "react";

/**
 * Kicker — small uppercased tracked caption. Used above a Display.
 *   <Kicker>01 — The Process</Kicker>
 */
export function Kicker({ children, as: As = "div", className = "", color }) {
  return (
    <As
      className={`text-kicker ${className}`}
      style={{ color: color || "var(--orange)" }}
    >
      {children}
    </As>
  );
}

/**
 * Eyebrow — tiny label above a heading, muted.
 */
export function Eyebrow({ children, as: As = "div", className = "" }) {
  return <As className={`text-eyebrow ${className}`}>{children}</As>;
}

/**
 * Display — large editorial heading. Defaults to h2; override via `as`.
 *   size: "xl" | "lg" | "md" | "sm"
 */
export function Display({ children, as: As = "h2", size = "lg", className = "", ...rest }) {
  const s = {
    xl: "text-display-xl",
    lg: "text-display-lg",
    md: "text-display-md",
    sm: "text-display-sm",
  }[size] || "text-display-lg";

  return (
    <As className={`${s} ${className}`} style={{ color: "var(--text)" }} {...rest}>
      {children}
    </As>
  );
}

/**
 * Lede — generous-line body paragraph following a Display.
 */
export function Lede({ children, className = "" }) {
  return (
    <p className={`max-w-2xl text-base md:text-lg leading-relaxed ${className}`} style={{ color: "var(--text-muted)" }}>
      {children}
    </p>
  );
}

/**
 * Meta — tiny mono metadata (timestamps, counts, roles).
 */
export function Meta({ children, className = "" }) {
  return <span className={`text-meta ${className}`} style={{ color: "var(--text-muted)" }}>{children}</span>;
}
