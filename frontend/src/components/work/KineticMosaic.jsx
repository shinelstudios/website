/**
 * KineticMosaic — the right-hand half of the Signal Reel hero.
 *
 * A 3×2 (desktop) / 2×2 (mobile) grid of thumbnail cards, each cross-fading
 * through a rotation of 3–4 images. Stagger offsets mean the grid never
 * all-changes at once — the overall impression is a quietly breathing reel.
 *
 * Perf contract:
 *   - Fades are OPACITY ONLY (no transform, no filter).
 *   - IntersectionObserver pauses rotation when off-screen.
 *   - `useReducedMotion` degrades to a static frame.
 *   - Each <img> uses loading="lazy" + decoding="async" + aspect-ratio.
 *
 * Implementation: two fixed <img> layers per tile. On each tick, the hidden
 * layer gets the new src, then we flip which layer is visible via opacity.
 * This means no repainting of the current image, no decode stutter, and
 * opacity is compositor-only.
 *
 * Props:
 *   tiles: Array<{ sources: string[], alt?: string }>
 */
import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../design";

const ROTATE_MS = 2800;
const STAGGER_MS = 460;
const FALLBACK = "https://placehold.co/640x360/0A0A0A/E85002?text=Shinel";

function Tile({ tile, offsetMs, active }) {
  const reduced = useReducedMotion();
  const sources = Array.isArray(tile.sources) && tile.sources.length
    ? tile.sources
    : [FALLBACK];

  const [idx, setIdx] = useState(0);
  const [errored, setErrored] = useState(() => new Set());

  useEffect(() => {
    if (reduced || !active || sources.length < 2) return;
    const start = setTimeout(() => {
      setIdx((i) => (i + 1) % sources.length);
    }, offsetMs);
    const int = setInterval(() => {
      setIdx((i) => (i + 1) % sources.length);
    }, ROTATE_MS + offsetMs === 0 ? ROTATE_MS : ROTATE_MS);
    return () => { clearTimeout(start); clearInterval(int); };
  }, [reduced, active, sources.length, offsetMs]);

  const pick = (i) => {
    const s = sources[((i % sources.length) + sources.length) % sources.length];
    return errored.has(s) ? FALLBACK : s;
  };

  const markError = (src) => () => {
    setErrored((prev) => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  };

  // Two layers: layer A is visible when idx is even, layer B when idx is odd.
  // Each tick, the hidden layer preloads the *next* source silently — no
  // flash. Opacity swap happens on the next render via CSS transition.
  const aVisible = idx % 2 === 0;
  const aSrc = pick(aVisible ? idx : idx + 1);
  const bSrc = pick(aVisible ? idx + 1 : idx);

  return (
    <div
      className="relative overflow-hidden rounded-xl md:rounded-2xl hairline"
      style={{ aspectRatio: "16 / 9", background: "var(--surface-alt)" }}
    >
      <img
        src={aSrc}
        alt={tile.alt || ""}
        loading="lazy"
        decoding="async"
        draggable="false"
        onError={markError(aSrc)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: aVisible ? 1 : 0,
          transition: "opacity 900ms ease",
        }}
      />
      <img
        src={bSrc}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        draggable="false"
        onError={markError(bSrc)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: aVisible ? 0 : 1,
          transition: "opacity 900ms ease",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    </div>
  );
}

export default function KineticMosaic({ tiles = [] }) {
  const wrapRef = useRef(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let io;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => setActive(!!entries[0]?.isIntersecting),
        { threshold: 0 }
      );
      io.observe(el);
    }
    const onVis = () => setActive(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (io) io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const safe = tiles.slice(0, 6);

  return (
    <div
      ref={wrapRef}
      className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 w-full"
      aria-label="Sample of our work"
      role="region"
    >
      {safe.map((t, i) => (
        <div
          key={i}
          className={i >= 4 ? "hidden md:block" : ""}
          style={{
            transform:
              i % 3 === 1 ? "translateY(14px)" :
              i % 3 === 2 ? "translateY(-10px)" : "none",
          }}
        >
          <Tile tile={t} offsetMs={i * STAGGER_MS} active={active} />
        </div>
      ))}
    </div>
  );
}
