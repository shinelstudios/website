/**
 * KineticPortfolioGrid — hero right-rail bento for the redesign v2 home.
 *
 * 6 tiles in a 3-col × 2-row grid, each showing a real thumbnail from the
 * live inventory (/thumbnails public endpoint). Every ~6 seconds, a random
 * tile "peeks" — crossfades in a semi-transparent overlay with the
 * thumbnail's title + category for ~1.8s, then fades out.
 *
 * Mobile: the grid collapses to a single-row horizontal marquee below the
 * hero headline (handled by the parent). This file renders only the desktop
 * grid; the mobile MarqueeRow is composed separately so we can tune spacing
 * independently.
 *
 * Perf contract:
 *   - Opacity-only crossfade. No layout/paint work on tick.
 *   - setInterval pauses when the tab is hidden and when the grid is
 *     off-screen (IntersectionObserver).
 *   - Thumbnails are <Img> which gates loading="lazy", decoding="async",
 *     intrinsic dimensions.
 *
 * Fallback tiles: if the live feed returns fewer than 6 items, we pad with
 * imported bundled assets so the grid is always full. These ship with the
 * app and decode instantly.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { resolveMediaUrl } from "../../utils/formatters";
import { Img } from "../../design";

// Bundled fallback thumbnails — real work samples already in the repo.
import BGMI_1 from "../../assets/bgmi-thumbnail-creator1.jpg";
import BGMI_2 from "../../assets/bgmi-thumbnail-creator2.jpg";
import BGMI_3 from "../../assets/bgmi-thumbnail-creator3.jpg";
import BGMI_4 from "../../assets/bgmi-thumbnail-creator4.jpg";
import VLOG_BEFORE from "../../assets/Vlog_sample_before.jpg";
import VLOG_AFTER from "../../assets/Vlog_sample_after.jpg";

const FALLBACKS = [
  { id: "fb-bgmi-1", image: BGMI_1, title: "Gaming Thumbnail Set", category: "GAMING" },
  { id: "fb-bgmi-2", image: BGMI_2, title: "Tournament Cover",     category: "GAMING" },
  { id: "fb-vlog-after", image: VLOG_AFTER, title: "Vlog Color Grade", category: "VLOG" },
  { id: "fb-bgmi-3", image: BGMI_3, title: "Creator Pack",         category: "GAMING" },
  { id: "fb-vlog-before", image: VLOG_BEFORE, title: "Before / After", category: "VLOG" },
  { id: "fb-bgmi-4", image: BGMI_4, title: "Livestream Cover",      category: "GAMING" },
];

const TILE_COUNT = 6;

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

        // Prefer rows with is_shinel=true and a working image. Avoid YouTube
        // deep-linking by keeping the image local (resolveMediaUrl handles
        // the /api/media/view → worker-origin absolute-ification).
        const live = rows
          .filter((r) => (r.is_shinel ?? r.isShinel) !== false)
          .map((r) => ({
            id: r.id,
            image: resolveMediaUrl(r.image_url || r.imageUrl, AUTH_BASE),
            title: r.title || r.filename || "Shinel Studios",
            category: r.category || "WORK",
          }))
          .filter((r) => r.image);

        if (!alive || !live.length) return;

        // Mix live-first, then pad with fallbacks to always have TILE_COUNT.
        const merged = [...live, ...FALLBACKS]
          .filter((v, i, arr) => arr.findIndex((x) => x.image === v.image) === i) // dedupe by image
          .slice(0, TILE_COUNT);
        setItems(merged);
      } catch {
        // ignore — fallback already populated
      }
    })();
    return () => { alive = false; ac.abort(); };
  }, []);

  // --- Peek timer — cycles a random tile every ~6s. Pauses when hidden. ---
  useEffect(() => {
    if (items.length === 0) return;
    if (typeof document === "undefined") return;

    let t1, t2;
    let stopped = false;

    // IntersectionObserver: stop cycling when grid is off-screen.
    let inView = true;
    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { rootMargin: "100px" })
      : null;
    if (io && gridRef.current) io.observe(gridRef.current);

    const runOnce = () => {
      if (stopped) return;
      if (document.hidden || !inView) {
        t1 = setTimeout(runOnce, 6000);
        return;
      }
      const next = Math.floor(Math.random() * items.length);
      setPeekIdx(next);
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

  const tiles = useMemo(() => items.slice(0, TILE_COUNT), [items]);

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-3 grid-rows-2 gap-3 md:gap-4"
      style={{ aspectRatio: "3/2" }}
    >
      {tiles.map((t, i) => (
        <Tile
          key={t.id}
          item={t}
          peek={i === peekIdx}
          index={i}
        />
      ))}
    </div>
  );
}

function Tile({ item, peek, index }) {
  return (
    <Link
      to="/work"
      className="relative block rounded-xl md:rounded-2xl overflow-hidden hairline group"
      style={{
        background: "var(--surface-alt)",
        // Slight tilt pattern so the bento feels alive without animation.
        transform: index % 2 === 0 ? "translateY(0)" : "translateY(-4px)",
      }}
      aria-label={item.title}
    >
      <Img
        src={item.image}
        alt={item.title}
        aspect="1/1"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Peek overlay — crossfades in when this tile is chosen by the timer,
          or when the user hovers on desktop. Opacity-only, GPU composited. */}
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

      {/* Hover-only peek for desktop (never hides the timer peek; both just
          set opacity to 1). Touchless mobile uses only the timer. */}
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
