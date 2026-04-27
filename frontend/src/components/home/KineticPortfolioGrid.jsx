/**
 * KineticPortfolioGrid — hero right-rail bento for the redesign v2 home.
 *
 * Pulls from BOTH /videos AND /thumbnails so we can route content into
 * cells that match the source's natural aspect:
 *
 *   - SHORT / REEL videos → 9:16 cells (true vertical, no crop)
 *   - LONG videos + thumbnails → 16:9 cells (true landscape, no crop)
 *
 * Layout (flexbox, each tile uses its NATURAL aspect ratio so nothing
 * gets squashed):
 *
 *   ┌──────────────────────────────┐
 *   │      HERO LONG (16:9)        │
 *   │      full-width feature      │
 *   ├────┬──────────────────┬──────┤
 *   │ T  │                  │  T   │
 *   │ A  │   WIDE LONG      │  A   │
 *   │ L  │   (16:9)         │  L   │
 *   │ L  │                  │  L   │
 *   │ 1  │                  │  2   │
 *   │9:16│                  │ 9:16 │
 *   └────┴──────────────────┴──────┘
 *
 * If the source data is short on one type (no shorts in /videos yet, or
 * no thumbnails available), we fall back to bundled assets so the grid
 * is always full and polished.
 *
 * Perf contract:
 *   - Opacity-only crossfade for the peek timer.
 *   - Timer pauses when tab hidden + grid off-screen (IntersectionObserver).
 *   - <img> uses lazy + async decode.
 *   - YouTube thumbnail URLs decode immediately from cached CDN.
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

// Slot definitions — kind tells us what content to put here, aspect tells
// us the cell shape, label is what shows in the corner badge.
const SLOTS = [
  { id: "hero",  kind: "long",  shape: "wide", aspect: "16/9", label: "Long-form" },
  { id: "tall1", kind: "short", shape: "tall", aspect: "9/16", label: "Short" },
  { id: "wide",  kind: "long",  shape: "wide", aspect: "16/9", label: "Long-form" },
  { id: "tall2", kind: "short", shape: "tall", aspect: "9/16", label: "Short" },
];

// Bundled fallbacks — used when live feed under-fills a slot.
// All bundled assets are 16:9 thumbnails; for a tall-cell fallback, we'll
// still use them, accepting that they get center-cropped horizontally.
const FALLBACK_LONG = [
  { id: "fb-bgmi-1", image: BGMI_1, title: "Gaming Thumbnail Set", category: "GAMING", kind: "long" },
  { id: "fb-bgmi-2", image: BGMI_2, title: "Tournament Cover",     category: "GAMING", kind: "long" },
  { id: "fb-vlog",   image: VLOG_AFTER, title: "Vlog Color Grade", category: "VLOG",    kind: "long" },
  { id: "fb-bgmi-3", image: BGMI_3, title: "Creator Pack",         category: "GAMING", kind: "long" },
  { id: "fb-bgmi-4", image: BGMI_4, title: "Livestream Cover",     category: "GAMING", kind: "long" },
];
const FALLBACK_SHORT = [
  // No bundled vertical assets yet — fall back to BGMI thumbs but flag as
  // shorts so the badge still reads correctly. Real shorts populate from
  // /videos as soon as inventory has SHORT/REEL rows.
  { id: "fb-short-1", image: BGMI_3, title: "Shorts Showcase", category: "GAMING", kind: "short" },
  { id: "fb-short-2", image: BGMI_4, title: "Reel Highlight",  category: "GAMING", kind: "short" },
];

// YouTube thumbnail URL by videoId. maxres is 1280×720 (16:9), unavailable
// for some videos — hqdefault always works. We try maxres first and let
// onError swap to hq.
const ytMaxThumb = (videoId) => `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
const ytHqThumb  = (videoId) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

export default function KineticPortfolioGrid() {
  const [longs, setLongs] = useState(FALLBACK_LONG);
  const [shorts, setShorts] = useState(FALLBACK_SHORT);
  const [peekIdx, setPeekIdx] = useState(-1);
  const gridRef = useRef(null);

  // --- Fetch BOTH endpoints in parallel; categorise by kind. ---
  useEffect(() => {
    let alive = true;
    const ac = new AbortController();
    (async () => {
      try {
        const [thumbsRes, videosRes] = await Promise.all([
          fetch(`${AUTH_BASE}/thumbnails`, { signal: ac.signal }).catch(() => null),
          fetch(`${AUTH_BASE}/videos`,     { signal: ac.signal }).catch(() => null),
        ]);

        // /thumbnails — every entry is treated as long-form (16:9 cover art).
        const thumbRows = thumbsRes && thumbsRes.ok
          ? (await thumbsRes.json().catch(() => ({})))?.thumbnails || []
          : [];
        const liveLongFromThumbs = thumbRows
          .filter((r) => (r.is_shinel ?? r.isShinel) !== false)
          .map((r) => ({
            id: r.id,
            image: resolveThumbnailImage(r, AUTH_BASE),
            title: r.filename || r.title || "Shinel Studios",
            category: r.category || "WORK",
            kind: "long",
          }))
          .filter((r) => r.image);

        // /videos — split into SHORT/REEL vs LONG by `kind`. Each video has
        // a videoId we can use to construct a YouTube thumbnail URL (since
        // /videos doesn't carry an imageUrl).
        const videoRows = videosRes && videosRes.ok
          ? (await videosRes.json().catch(() => ({})))?.videos || []
          : [];
        const eligibleVideos = videoRows
          .filter((v) => (v.is_shinel ?? v.isShinel) !== false && v.videoId);
        const liveShorts = eligibleVideos
          .filter((v) => {
            const k = String(v.kind || "").toUpperCase();
            return k === "SHORT" || k === "REEL";
          })
          .map((v) => ({
            id: v.id,
            image: ytMaxThumb(v.videoId),
            fallbackImage: ytHqThumb(v.videoId),
            title: v.title || "Shinel Studios",
            category: v.category || "SHORTS",
            kind: "short",
            videoId: v.videoId,
          }));
        const liveLongFromVideos = eligibleVideos
          .filter((v) => String(v.kind || "").toUpperCase() === "LONG")
          .map((v) => ({
            id: v.id,
            image: ytMaxThumb(v.videoId),
            fallbackImage: ytHqThumb(v.videoId),
            title: v.title || "Shinel Studios",
            category: v.category || "WORK",
            kind: "long",
            videoId: v.videoId,
          }));

        // Mix and dedupe by image URL.
        const dedupeByImage = (arr) =>
          arr.filter((v, i, a) => a.findIndex((x) => x.image === v.image) === i);

        const mergedLongs = dedupeByImage([...liveLongFromThumbs, ...liveLongFromVideos, ...FALLBACK_LONG]);
        const mergedShorts = dedupeByImage([...liveShorts, ...FALLBACK_SHORT]);

        if (!alive) return;
        if (mergedLongs.length) setLongs(mergedLongs);
        if (mergedShorts.length) setShorts(mergedShorts);
      } catch {
        /* ignore — fallbacks already populated */
      }
    })();
    return () => { alive = false; ac.abort(); };
  }, []);

  // --- Allocate items to slots by kind. Two long slots, two short slots. ---
  const tiles = useMemo(() => {
    let longCursor = 0;
    let shortCursor = 0;
    return SLOTS.map((slot) => {
      if (slot.kind === "short") {
        const item = shorts[shortCursor++ % Math.max(1, shorts.length)] || FALLBACK_SHORT[0];
        return { slot, item };
      }
      const item = longs[longCursor++ % Math.max(1, longs.length)] || FALLBACK_LONG[0];
      return { slot, item };
    });
  }, [longs, shorts]);

  // --- Peek timer cycles through slots in order every ~6s. ---
  useEffect(() => {
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
  }, []);

  return (
    <div ref={gridRef} className="flex flex-col gap-3 md:gap-4">
      {/* Row 1: full-width 16:9 hero long-form */}
      <Tile {...tiles[0]} peek={peekIdx === 0} />

      {/* Row 2: tall + wide + tall — uses the talls' 9:16 height to set the
          row, with the middle wide tile vertically centred. */}
      <div className="flex gap-3 md:gap-4 items-stretch">
        <div className="w-[24%] shrink-0">
          <Tile {...tiles[1]} peek={peekIdx === 1} />
        </div>
        <div className="flex-1 self-center">
          <Tile {...tiles[2]} peek={peekIdx === 2} />
        </div>
        <div className="w-[24%] shrink-0">
          <Tile {...tiles[3]} peek={peekIdx === 3} />
        </div>
      </div>
    </div>
  );
}

function Tile({ slot, item, peek }) {
  const [src, setSrc] = useState(item.image);
  useEffect(() => { setSrc(item.image); }, [item.image]);

  const onError = () => {
    // First try the per-item fallback (e.g. hqdefault for missing maxres),
    // then a bundled asset of the right kind.
    if (item.fallbackImage && src !== item.fallbackImage) {
      setSrc(item.fallbackImage);
      return;
    }
    const fb = slot.kind === "short" ? FALLBACK_SHORT[0] : FALLBACK_LONG[0];
    if (src !== fb.image) setSrc(fb.image);
  };

  // Object-position favours the upper-third where YouTube thumbnails put
  // faces and bold title text — keeps subjects in frame when 16:9 source
  // is fitted into a non-16:9 cell (matters for the tall slots when
  // shorts source falls back to a 16:9 image).
  const objectPosition =
    slot.shape === "tall" ? "center 30%" : "center center";

  return (
    <Link
      to="/work"
      className="relative block rounded-xl md:rounded-2xl overflow-hidden hairline group w-full"
      style={{
        background: "var(--surface-alt)",
        aspectRatio: slot.aspect,
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
          objectPosition,
        }}
      />

      {/* Format badge — derived from the tile's actual content kind. */}
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

      {/* Peek overlay — title + category crossfade in on timer / hover. */}
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

      {/* Hover-only peek for desktop. */}
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
