import React from "react";

/**
 * HairlineCard — baseline surface for card-like content. Hairline border,
 * hover-lift on desktop, safe on touch. Pass `as` to change tag; defaults div.
 */
export default function HairlineCard({
  as: As = "div",
  tone = "alt",
  interactive = false,
  className = "",
  children,
  ...rest
}) {
  const bg = {
    alt: "bg-[var(--surface-alt)]",
    elev: "bg-[var(--surface-elev)]",
    surface: "bg-[var(--surface)]",
  }[tone] || "bg-[var(--surface-alt)]";

  const interactiveClasses = interactive
    ? "transition-all duration-300 hover:border-[color-mix(in_oklab,var(--orange)_35%,var(--hairline))] card-hover"
    : "";

  return (
    <As
      className={`${bg} hairline rounded-2xl ${interactiveClasses} ${className}`}
      {...rest}
    >
      {children}
    </As>
  );
}
