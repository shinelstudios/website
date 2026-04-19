import React from "react";

/**
 * Section — editorial layout primitive. Vertical rhythm and container in one.
 * All page sections should reach for this instead of ad-hoc div/className combos.
 *
 * Props:
 *   id          — anchor target
 *   size        — "sm" | "md" | "lg"   controls vertical padding
 *   bleed       — true = full-bleed background (no horizontal gutter constraint)
 *   tone        — "surface" | "alt" | "elev" | "ink" | "transparent"
 *   hairlineTop — render a top hairline
 *   hairlineBot — render a bottom hairline
 */
export default function Section({
  id,
  size = "md",
  bleed = false,
  tone = "transparent",
  hairlineTop = false,
  hairlineBot = false,
  className = "",
  children,
  ...rest
}) {
  const padY = {
    sm: "py-10 md:py-14",
    md: "py-16 md:py-24",
    lg: "py-24 md:py-32",
  }[size] || "py-16 md:py-24";

  const bg = {
    surface: "bg-[var(--surface)]",
    alt: "bg-[var(--surface-alt)]",
    elev: "bg-[var(--surface-elev)]",
    ink: "bg-[var(--ink)] text-[var(--paper)]",
    transparent: "",
  }[tone] || "";

  const border = [
    hairlineTop ? "hairline-t" : "",
    hairlineBot ? "hairline-b" : "",
  ].filter(Boolean).join(" ");

  return (
    <section id={id} className={`relative ${padY} ${bg} ${border} ${className}`} {...rest}>
      {bleed ? children : <div className="container mx-auto px-4 md:px-6">{children}</div>}
    </section>
  );
}
