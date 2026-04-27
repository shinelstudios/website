/**
 * KineticPortfolioGrid — hero right-rail bento for the redesign v2 home.
 *
 * Creative bento layout (4 mixed-aspect tiles) so 16:9 long-form thumbnails
 * and 9:16 shorts both get cells that match their natural shape — no more
 * forcing everything into squares.
 *
 *   ┌──────────┬───┬───┐
 *   │          │   │   │
 *   │  HERO    │ T │ T │   HERO  = 1:1 cell, fits a 16:9 long-form thumbnail
 *   │  (1:1)   │ A │ A │   TALL  = 1:3 cell, fits a 9:16 short cleanly
 *   │          │ L │ L │   WIDE  = 2:1 cell, fits a 16:9 banner-style cover
 *   ├──────────┤ L │ L │
 *   │  WIDE    │ 1 │ 2 │
 *   │  (2:1)   │   │   │
 *   └──────────┴───┴───┘
 *
 * Container aspect ~4:3 (slightly taller than the old 3:2). Faces stay
 * visible because `object-position` favors the upper-third of each tile,
 * which is where YouTube thumbnail faces typically sit.
 *
 * The peek timer (every ~6s a random tile crossfades a title overlay)
 * still drives variety. Mobile collapses to a horizontal MarqueeRow above
 * via the parent.
 *
 * Perf contract:
 *   - Opacity-only crossfade, no layout/paint on tick.
 *   - setInterval pauses when the tab is hidden and grid is off-screen.
 *   - <img> uses lazy + async decode.
 *
 * Fallback tiles cover the case where the live feed has fewer entries than
 * tile slots; bundled assets ship with the app and decode instantly.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { resolveThumbnailImage } from "../../utils/formatters";

// Bundled fallback thumbnails — real work samples already in the repo.
import BGMI_1 from "../../assets/bgmi-thumbnail-creator1.jpg";
import BGMI_2 from "../../assets/bgmi-thumbnail-creator2.jpg";
import BGMI_3 from "../../assets/bgmi-thumbnail-creator3.jpg";
import BGMI_4 from "../../assets/bgmi-thumbnail-creator4.jpg";
import VLOG_AFTER from "../../assets/Vlog_sample_after.jpg";

// Slot definitions — each slot has a fixed shape + a hint about what
// content shape fits best. The peek timer cycles through SLOTS in order
// (predictable, not random) so users see all four tiles over time.
const SLOTS = [
  { id: "hero", spanCols: 2, spanRows: 2, shape: "square", label: "Featured work" },
  { id: "tall1", spanCols: 1, spanRows: 3, shape: "tall", label: "Short" },
  { id: "tall2", spanCols: 1, spanRows: 3, shape: "tall", label: "Short" },
  { id: "wide", spanCols: 2, spanRows: 1, shape: "wide", label: "Long-form" },
];

const FALLBACKS = [
  { id: "fb-bgmi-1", image: BGMI_1, title: "Gaming Thumbnail Set", category: "GAMING" },
  { id: "fb-bgmi-2", image: BGMI_2, title: "Tournament Cover",     category: "GAMING" },
  { id: "fb-vlog-after", image: VLOG_AFTER, title: "Vlog Color Grade", category: "VLOG" },
  { id: "fb-bgmi-3", image: BGMI_3, title: "Creator Pack",         category: "GAMING" },
  { id: "fb-bgmi-4", image: BGMI_4, title: "Livestream Cover",     category: "GAMING" },
];

export default function KineticPortfolioGrid() {
  const [items, setItems] = useState(FALLBACKS);
  const [peekIdx, setPeekIdx] = useState(-1);
  const gridRef = useRef(null);

  // --- Fetch live thumbnails once on mount. Fall back gracefully. ---
  useEffect(() => {
    let alive = true;
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${AUTH_BASE}/thumbnails`, { signal: ac.signal });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const rows = Array.isArray(data?.thumbnails) ? data.thumbnails : [];
        if (!rows.length) return;

        const live = rows
          .filter((r) => (r.is_shinel ?? r.isShinel) !== false)
          .map((r) => ({
            id: r.id,
            image: resolveThumbnailImage(r, AUTH_BASE),
            title: r.title || r.filename || "Shinel Studios",
            category: r.category || "WORK",
          }))
          .filter((r) => r.image);

        if (!alive || !live.length) return;

        const merged = [...live, ...FALLBACKS]
          .filter((v, i, arr) => arr.findIndex((x) => x.image === v.image) === i)
          .slice(0, SLOTS.length);
        setItems(merged);
      } catch {
        /* ignore — fallback already populated */
      }
    })();
    return () => { alive = false; ac.abort(); };
  }, []);

  // --- Peek timer — cycles through SLOTS in order every ~6s. ---
  useEffect(() => {
    if (items.length === 0) return;
    if (typeof document === "undefined") return;

    let t1, t2;
    let stopped = false;

    let inView = true;
    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { rootMargin: "100px" })
      : null;
    if (io && gridRef.current) io.observe(gridRef.current);

    let cursor = 0;
    const runOnce = () => {
      if (stopped) return;
      if (document.hidden || !inView) {
        t1 = setTimeout(runOnce, 6000);
        return;
      }
      cursor = (cursor + 1) % SLOTS.length;
      setPeekIdx(cursor);
      t2 = setTimeout(() => setPeekIdx(-1), 1800);
      t1 = setTimeout(runOnce, 6000);
    };
    t1 = setTimeout(runOnce, 3000);

    return () => {
      stopped = true;
      clearTimeout(t1);
      clearTimeout(t2);
      if (io) io.disconnect();
    };
  }, [items.length]);

  const tiles = useMemo(() => {
    // Pair each slot with an item, falling back if the live feed under-fills.
    return SLOTS.map((slot, i) => ({
      slot,
      item: items[i] || FALLBACKS[i % FALLBACKS.length],
    }));
  }, [items]);

  return (
    <div
      ref={gridRef}
      className="grid gap-3 md:gap-4"
      style={{
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        aspectRatio: "4/3",
      }}
    >
      {tiles.map(({ slot, item }, i) => (
        <Tile
          key={slot.id}
          slot={slot}
          item={item}
          peek={i === peekIdx}
          fallbackIdx={i}
        />
      ))}
    </div>
  );
}

function Tile({ slot, item, peek, fallbackIdx }) {
  // Swap to a bundled fallback on image error rather than showing "image
  // unavailable". The hero grid should always look full and polished.
  const fallback = FALLBACKS[fallbackIdx % FALLBACKS.length].image;
  const [src, setSrc] = useState(item.image);
  useEffect(() => { setSrc(item.image); }, [item.image]);

  // Object-position picks the most flattering crop for each shape. YouTube
  // thumbnails put faces and bold text in the upper-third, so all three
  // shapes favour `center 30%` — keeps faces in frame on tall and wide
  // tiles where vertical cropping happens.
  const objectPosition =
    slot.shape === "tall" ? "center 25%"
    : slot.shape === "wide" ? "center center"
    : "center 30%";

  return (
    <Link
      to="/work"
      className="relative block rounded-xl md:rounded-2xl overflow-hidden hairline group"
      style={{
        background: "var(--surface-alt)",
        gridColumn: `span ${slot.spanCols}`,
        gridRow: `span ${slot.spanRows}`,
        // Subtle staggered offset so the bento feels alive without animation.
        transform: fallbackIdx % 2 === 0 ? "translateY(0)" : "translateY(-4px)",
      }}
      aria-label={item.title}
    >
      <img
        src={src}
        alt={item.title}
        loading="lazy"
        decoding="async"
        draggable="false"
        onError={() => { if (src !== fallback) setSrc(fallback); }}
        className="w-full h-full transition-transform duration-500 group-hover:scale-105"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition,
        }}
      />

      {/* Shape-aware label — each tile carries a small badge so visitors
          read the bento as "we do all of these formats". */}
      <div
        className="absolute top-2 md:top-3 left-2 md:left-3 px-2 py-0.5 rounded-full pointer-events-none"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <span
          className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.16em]"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          {slot.label}
        </span>
      </div>

      {/* Peek overlay — crossfades in when this tile is chosen by the timer. */}
      <div
        className="absolute inset-0 flex flex-col justify-end p-3 md:p-4 transition-opacity duration-500 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.82) 100%)",
          opacity: peek ? 1 : 0,
        }}
      >
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div
              className="text-meta mb-1"
              style={{ color: "var(--orange)", letterSpacing: "0.15em" }}
            >
              {item.category}
            </div>
            <div
              className="text-sm font-semibold truncate"
              style={{ color: "#fff", fontFamily: "'Outfit Variable', 'Outfit', sans-serif" }}
            >
              {item.title}
            </div>
          </div>
          <ArrowUpRight size={14} style={{ color: "#fff", flexShrink: 0 }} />
        </div>
      </div>

      {/* Hover-only peek for desktop. Touch devices rely on the timer. */}
      <div
        className="absolute inset-0 flex flex-col justify-end p-3 md:p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none md:block hidden"
        style={{
          background: "linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.85) 100%)",
        }}
      >
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div
              className="text-meta mb-1"
              style={{ color: "var(--orange)", letterSpacing: "0.15em" }}
            >
              {item.category}
            </div>
            <div
              className="text-sm font-semibold truncate"
              style={{ color: "#fff", fontFamily: "'Outfit Variable', 'Outfit', sans-serif" }}
            >
              {item.title}
            </div>
          </div>
          <ArrowUpRight size={14} style={{ color: "#fff", flexShrink: 0 }} />
        </div>
      </div>
    </Link>
  );
}
