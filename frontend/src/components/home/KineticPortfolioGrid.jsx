/**
 * KineticPortfolioGrid — hero right-rail bento for the redesign v2 home.
 *
 * Layout: 1 hero feature + 3 supporting tiles, ALL 16:9 — matches the
 * source content (admin-uploaded thumbnails are video cover art, almost
 * always 16:9). No more squashing landscape thumbnails into 9:16 cells.
 *
 *   ┌──────────────────────────────┐
 *   │                              │
 *   │       FEATURED 16:9          │   Big hero — newest / best work
 *   │                              │
 *   ├────────┬─────────┬───────────┤
 *   │  16:9  │  16:9   │   16:9    │   3 supporting tiles, also 16:9
 *   └────────┴─────────┴───────────┘
 *
 * Container aspect ~4:3, similar to the original layout, so the hero text
 * column on the left still aligns nicely.
 *
 * Source: /thumbnails (admin's own Shinel work, already cover-art quality).
 *
 * If we ever start uploading true 9:16 vertical short covers — e.g. a new
 * `cover_url_vertical` column on inventory — we can re-introduce a tall
 * variant in a future pass. For now, every cell is 16:9 because every
 * source asset is 16:9.
 *
 * Perf contract:
 *   - Opacity-only crossfade on the peek timer.
 *   - Timer pauses when tab hidden + grid off-screen (IO).
 *   - <img> uses lazy + async decode.
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

const FALLBACKS = [
  { id: "fb-bgmi-1", image: BGMI_1, title: "Gaming Thumbnail Set", category: "GAMING" },
  { id: "fb-bgmi-2", image: BGMI_2, title: "Tournament Cover",     category: "GAMING" },
  { id: "fb-vlog",   image: VLOG_AFTER, title: "Vlog Color Grade", category: "VLOG" },
  { id: "fb-bgmi-3", image: BGMI_3, title: "Creator Pack",         category: "GAMING" },
  { id: "fb-bgmi-4", image: BGMI_4, title: "Livestream Cover",     category: "GAMING" },
];

const TILE_COUNT = 4; // 1 hero + 3 supporting

export default function KineticPortfolioGrid() {
  const [items, setItems] = useState(FALLBACKS);
  const [peekIdx, setPeekIdx] = useState(-1);
  const gridRef = useRef(null);

  // --- Fetch live thumbnails. Falls back gracefully on any error. ---
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
            title: r.filename || r.title || "Shinel Studios",
            category: r.category || "WORK",
          }))
          .filter((r) => r.image);

        if (!alive || !live.length) return;

        // Mix live first, then pad with fallbacks. Dedupe by image URL.
        const merged = [...live, ...FALLBACKS]
          .filter((v, i, arr) => arr.findIndex((x) => x.image === v.image) === i)
          .slice(0, TILE_COUNT);
        setItems(merged);
      } catch {
        /* ignore — fallback already populated */
      }
    })();
    return () => { alive = false; ac.abort(); };
  }, []);

  // --- Peek timer cycles tiles in order every ~6s. ---
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
      cursor = (cursor + 1) % TILE_COUNT;
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
    const out = items.slice(0, TILE_COUNT);
    while (out.length < TILE_COUNT) {
      out.push(FALLBACKS[out.length % FALLBACKS.length]);
    }
    return out;
  }, [items]);

  return (
    <div ref={gridRef} className="flex flex-col gap-3 md:gap-4">
      {/* Featured 16:9 hero */}
      <Tile
        item={tiles[0]}
        peek={peekIdx === 0}
        size="hero"
        fallbackIdx={0}
      />

      {/* 3 supporting 16:9 tiles below */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {tiles.slice(1, 4).map((item, i) => (
          <Tile
            key={item.id || `support-${i}`}
            item={item}
            peek={peekIdx === i + 1}
            size="support"
            fallbackIdx={i + 1}
          />
        ))}
      </div>
    </div>
  );
}

function Tile({ item, peek, size, fallbackIdx }) {
  const fallbackImage = FALLBACKS[fallbackIdx % FALLBACKS.length].image;
  const [src, setSrc] = useState(item.image);
  useEffect(() => { setSrc(item.image); }, [item.image]);

  const onError = () => {
    if (src !== fallbackImage) setSrc(fallbackImage);
  };

  // YouTube thumbnails put faces and big title text in the upper third —
  // 'center 35%' keeps subjects in frame for any minor crop.
  return (
    <Link
      to="/work"
      className="relative block rounded-xl md:rounded-2xl overflow-hidden hairline group w-full"
      style={{
        background: "var(--surface-alt)",
        aspectRatio: "16/9",
      }}
      aria-label={item.title}
    >
      <img
        src={src}
        alt={item.title}
        loading="lazy"
        decoding="async"
        draggable="false"
        onError={onError}
        className="w-full h-full transition-transform duration-500 group-hover:scale-105"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center 35%",
        }}
      />

      {/* Featured badge on the hero only — keeps the supporting tiles clean. */}
      {size === "hero" && (
        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full pointer-events-none"
          style={{
            background: "rgba(232,80,2,0.92)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.18em] text-white">
            Featured
          </span>
        </div>
      )}

      {/* Peek overlay: title + category fade in on timer / hover. */}
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
          <ArrowUpRight size={size === "hero" ? 16 : 12} style={{ color: "#fff", flexShrink: 0 }} />
        </div>
      </div>

      {/* Hover-only peek (desktop). */}
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
          <ArrowUpRight size={size === "hero" ? 16 : 12} style={{ color: "#fff", flexShrink: 0 }} />
        </div>
      </div>
    </Link>
  );
}
