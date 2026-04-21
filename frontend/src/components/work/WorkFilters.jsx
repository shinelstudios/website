/**
 * WorkFilters — chip row for the Work reel.
 *
 * Filters apply on-page (no route change). Two axes:
 *   - `kind`: ALL | VIDEO | GFX — what medium
 *   - `category`: ALL | GAMING | VLOG | MUSIC | … — derived from the data
 *
 * Both are controlled props so the parent can read/share the filter state
 * with the grid. Keyboard arrow-key nav works through the chips inside one
 * row (left/right).
 */
import React from "react";

function Chip({ label, active, onClick, hue = "var(--orange)" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="px-3.5 py-1.5 rounded-full text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
      style={{
        background: active ? hue : "transparent",
        color: active ? "#fff" : "var(--text)",
        border: `1px solid ${active ? hue : "var(--hairline)"}`,
        fontFamily: "'Space Grotesk Variable', 'Space Grotesk', sans-serif",
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </button>
  );
}

export default function WorkFilters({
  kinds = ["ALL", "VIDEO", "GFX"],
  kind,
  setKind,
  categories = ["ALL"],
  category,
  setCategory,
  total = 0,
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Kind row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-eyebrow mr-1" style={{ color: "var(--text-muted)" }}>
          Medium
        </span>
        {kinds.map((k) => (
          <Chip
            key={k}
            label={k}
            active={kind === k}
            onClick={() => setKind(k)}
          />
        ))}
      </div>

      {/* Category row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-eyebrow mr-1" style={{ color: "var(--text-muted)" }}>
          Category
        </span>
        {categories.map((c) => (
          <Chip
            key={c}
            label={c}
            active={category === c}
            onClick={() => setCategory(c)}
          />
        ))}

        <span
          className="ml-auto text-meta"
          style={{ color: "var(--text-muted)" }}
        >
          {total} {total === 1 ? "piece" : "pieces"}
        </span>
      </div>
    </div>
  );
}
