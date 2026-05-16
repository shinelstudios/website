/**
 * FieldFocusUnderline — wraps an input/textarea, adds a thin orange
 * line that scaleX-draws across the bottom on focus and reverses on
 * blur. Pure CSS once the wrapper is rendered — no JS frame work.
 *
 * Usage:
 *   <FieldFocusUnderline>
 *     <input type="email" className="…" />
 *   </FieldFocusUnderline>
 *
 * The underline sits on a pseudo-element via the `field-focus-underline`
 * class declared in index.css. Reduced-motion users get the line snap
 * to its end state without animating.
 */
import React from "react";

export default function FieldFocusUnderline({ children, className = "" }) {
  return (
    <span className={`field-focus-underline ${className}`}>
      {children}
    </span>
  );
}
