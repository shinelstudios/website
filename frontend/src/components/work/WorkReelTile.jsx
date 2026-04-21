/**
 * WorkReelTile — single tile in the immersive work reel.
 *
 * On desktop hover, the thumbnail zooms in and a title/meta overlay fades up.
 * On touch, the same overlay is permanently visible (no hover state), still
 * legible without touching anything.
 *
 * Clicking the tile opens the case-study side-drawer via the parent's
 * onOpen(item) callback — we never embed a full YouTube iframe in the grid
 * tile itself. That would be 6+ iframes on screen at once — a guaranteed jank
 * bomb on every device. The heavy embed lives inside the drawer and
 * unmounts when it closes.
 *
 * Perf contract:
 *   - transform + opacity only (no layout work on hover)
 *   - thumbnail images are native <img loading="lazy" decoding="async">
 *   - aspect-ratio reserved so CLS is zero
 *   - onError swaps to a placeholder so one dead thumbnail never breaks the grid
 */
import React, { useState } from "react";
import { Play, ArrowUpRight } from "lucide-react";
import { formatCompactNumber as formatViews } from "../../utils/formatters";

const PLACEHOLDER = "https://placehold.co/600x338/0A0A0A/E85002?text=Shinel+Studios";

export default function WorkReelTile({ item, onOpen, index = 0 }) {
  const [imgErr, setImgErr] = useState(false);
  const src = imgErr || !item.image ? PLACEHOLDER : item.image;

  const categoryLabel = item.category || (item.kind === "video" ? "VIDEO" : "GFX");

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group relative block w-full text-left rounded-2xl overflow-hidden hairline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
      style={{
        background: "var(--surface-alt)",
        // Subtle layout jitter so the masonry feels alive. No animation —
        // just a per-index static offset, cheap.
        transform: index % 3 === 1 ? "translateY(-8px)" : index % 3 === 2 ? "translateY(4px)" : "none",
      }}
      aria-label={`Open case study: ${item.title || "Untitled work"}`}
    >
      <div className="relative" style={{ aspectRatio: "16 / 9" }}>
        <img
          src={src}
          alt={item.title || ""}
          loading="lazy"
          decoding="async"
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
          onError={() => setImgErr(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* Play indicator for video tiles */}
        {item.kind === "video" && (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          >
            <div
              className="w-14 h-14 rounded-full grid place-items-center backdrop-blur-md"
              style={{
                background: "rgba(232,80,2,0.9)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              }}
            >
              <Play size={22} fill="#fff" stroke="#fff" />
            </div>
          </div>
        )}

        {/* Always-on bottom metadata gradient (touch visible, desktop visible) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.9) 100%)",
          }}
        />

        {/* Meta overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div
              className="text-meta mb-1"
              style={{ color: "var(--orange)", letterSpacing: "0.18em" }}
            >
              {categoryLabel}
            </div>
            <div
              className="text-sm md:text-base font-semibold truncate"
              style={{ color: "#fff", fontFamily: "'Outfit Variable', 'Outfit', sans-serif" }}
            >
              {item.title || "Untitled"}
            </div>
            {item.attributedTo && (
              <div className="text-meta mt-1 truncate" style={{ color: "rgba(255,255,255,0.65)" }}>
                by {String(item.attributedTo).split("@")[0]}
              </div>
            )}
          </div>
          <ArrowUpRight
            size={18}
            className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            style={{ color: "#fff" }}
          />
        </div>

        {/* Views pill (top-right). Shows only when present. */}
        {Number(item.views || 0) > 0 && (
          <div
            className="absolute top-3 right-3 text-meta px-2 py-0.5 rounded-full backdrop-blur-md"
            style={{
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {formatViews(item.views)}
          </div>
        )}
      </div>
    </button>
  );
}

// formatViews uses the shared formatCompactNumber (utils/formatters.js).
