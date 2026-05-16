/**
 * CheckStamp — bouncy scale-in checkmark for "computed"/"saved"/"won"
 * confirmation. Use after a user action settles, or as a viewport-
 * triggered emphasis on a winning row. One-shot.
 *
 * Usage (action feedback):
 *   {wasSaved && <CheckStamp size={20} />}
 *
 * Usage (winner row in a comparison):
 *   <CheckStamp size={28} delayMs={400} />
 *
 * Reduced-motion users get the checkmark already at its end state.
 */
import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useReducedMotion } from "../hooks/useReducedMotion";

export default function CheckStamp({
  size = 24,
  delayMs = 0,
  color = "#fff",
  bg = "var(--orange)",
  className = "",
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce);

  useEffect(() => {
    if (reduce) { setShown(true); return; }
    const t = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(t);
  }, [reduce, delayMs]);

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${className}`}
      style={{
        width: size + 12,
        height: size + 12,
        background: bg,
        color,
        transform: shown ? "scale(1)" : "scale(0.4)",
        opacity: shown ? 1 : 0,
        transition: reduce
          ? "none"
          : "transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 240ms ease",
      }}
      aria-label="Confirmed"
    >
      <Check size={size} strokeWidth={3} />
    </span>
  );
}
