// src/components/VideoEditing.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Play } from "lucide-react";
import gamingVideos from "../data/gamingVideos.js";

/* ---------- helpers ---------- */
const ytThumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
const norm = (s = "") => String(s).toLowerCase();

/** Infer a category dynamically if one isn’t defined in data */
const inferCategory = (v) => {
  if (v.category) return v.category;
  const tags = (v.tags || []).map(norm).join(" | ");

  if (tags.match(/\bbgmi\b|battlegrounds/i)) return "BGMI";
  if (tags.match(/\bvalorant\b/i)) return "Valorant";
  if (tags.match(/\blive\b|stream/i)) return "Live";
  if (tags.match(/\bvlog\b/i)) return "Vlog";
  if (tags.match(/\bdoc(umentary)?\b/i)) return "Documentary";
  if (tags.match(/\btrailer|teaser\b/i)) return "Trailers";
  if (tags.match(/\bmontage|cinematic\b/i)) return "Cinematics";
  if (tags.match(/\bclient|brand\b/i)) return "Client Work";
  return "Other";
};

/* ---------- small UI atoms ---------- */
const FilterChip = ({ children, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-xs sm:text-sm px-3 py-1 rounded-full border transition-colors whitespace-nowrap"
    style={{
      color: active ? "#fff" : "var(--orange)",
      background: active
        ? "var(--orange)"
        : "color-mix(in oklab, var(--orange) 12%, transparent)",
      borderColor: active
        ? "var(--orange)"
        : "color-mix(in oklab, var(--orange) 35%, transparent)",
    }}
  >
    {children}
  </button>
);

const Tag = ({ children }) => (
  <span
    className="text-xs px-2 py-1 rounded-full"
    style={{
      color: "var(--orange)",
      background: "color-mix(in oklab, var(--orange) 12%, transparent)",
      border: "1px solid color-mix(in oklab, var(--orange) 35%, transparent)",
    }}
  >
    {children}
  </span>
);

/* ---------- modal YouTube player (auto-plays) ---------- */
const YouTubeModalPlayer = ({ youtubeId, title }) => {
  return (
    <iframe
      className="w-full h-full"
      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );
};

/* ---------- video card (opens modal via hash route) ---------- */
const VideoCard = ({ v }) => {
  const cat = inferCategory(v);
  const cover = v.thumb || (v.type === "youtube" ? ytThumb(v.youtubeId) : undefined);

  return (
    <article
      className="group rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all relative"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Full-cover anchor makes the entire card clickable */}
      <a href={`#/videos/${v.id}`} className="absolute inset-0 z-[1]" aria-label={`Open ${v.title}`} />

      <div className="relative w-full aspect-video bg-black/5">
        {/* Poster image / preview layer */}
        {cover ? (
          <>
            <img
              src={cover}
              alt={v.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-white/90">
            No preview
          </div>
        )}

        {/* Play pill */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/90 backdrop-blur-md shadow-lg transition-all group-hover:shadow-xl">
            <Play size={18} className="text-black" />
            <span className="text-sm font-semibold text-black">Play</span>
          </div>
        </div>

        {/* category badge */}
        <div
          className="absolute left-3 top-3 px-2 py-1 rounded-md text-xs font-semibold"
          style={{
            background: "rgba(0,0,0,.6)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,.18)",
          }}
        >
          {cat}
        </div>
      </div>

      <div className="p-4 sm:p-5 relative z-[2]">
        <h3
          className="text-base sm:text-lg font-semibold mb-1 line-clamp-2"
          style={{ color: "var(--text)" }}
        >
          {v.title}
        </h3>
        <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
          {v.creator} • {v.duration}
        </p>

        {v.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {v.tags.map((t, i) => (
              <Tag key={i}>{t}</Tag>
            ))}
          </div>
        )}

        <div className="mt-4">
          <a
            href={`#/videos/${v.id}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm"
            style={{ background: "var(--orange)" }}
          >
            <Play size={16} /> View
          </a>
        </div>
      </div>
    </article>
  );
};

/* ---------- main page ---------- */
export default function VideoEditing() {
  // categories
  const categories = useMemo(() => {
    const set = new Set([
      "All",
      "BGMI",
      "Valorant",
      "Live",
      "Vlog",
      "Documentary",
      "Trailers",
      "Cinematics",
      "Client Work",
    ]);
    gamingVideos.forEach((v) => set.add(inferCategory(v)));
    return ["All", ...Array.from(set).filter((c) => c !== "All")];
  }, []);

  const [selected, setSelected] = useState("All");

  // filter videos
  const filtered = useMemo(
    () => gamingVideos.filter((v) => selected === "All" || inferCategory(v) === selected),
    [selected]
  );

  // fix for header overlap
  useEffect(() => {
    const header = document.querySelector("header");
    const updateHeight = () => {
      if (header) {
        const h = Math.round(header.getBoundingClientRect().height);
        document.documentElement.style.setProperty("--header-h", `${h}px`);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  /* ---------------- Modal + hash routing (generic) ---------------- */
  const [openId, setOpenId] = useState(null);

  // helper: open (push hash + emit global event)
  const openById = useCallback((id, push = true) => {
    if (!id) return;
    if (push && location.hash !== `#/videos/${id}`) {
      history.pushState({}, "", `#/videos/${id}`);
    }
    // fire the global action so ANY listener can react
    window.dispatchEvent(new CustomEvent("open:video", { detail: { id } }));
  }, []);

  const closeModal = useCallback(() => {
    setOpenId(null);
    if (/^#\/videos\/\w+/.test(location.hash)) {
      history.pushState({}, "", location.pathname + location.search);
    }
  }, []);

  // listen to global hash-action event
  useEffect(() => {
    const onOpen = (e) => setOpenId(e.detail.id);
    window.addEventListener("open:video", onOpen);
    return () => window.removeEventListener("open:video", onOpen);
  }, []);

  // deep link on load & back/forward
  useEffect(() => {
    const match = location.hash.match(/^#\/videos\/(\w+)/);
    if (match) setOpenId(match[1]);
    const onPop = () => {
      const m = location.hash.match(/^#\/videos\/(\w+)/);
      setOpenId(m ? m[1] : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // delegate clicks to anchors with href="#/videos/:id"
  const onGridClick = useCallback((e) => {
    const a = e.target.closest('a[href^="#/videos/"]');
    if (!a) return;
    e.preventDefault(); // prevent navigation to /
    const m = a.getAttribute("href").match(/^#\/videos\/(\w+)/);
    if (m) openById(m[1]);
  }, [openById]);

  // resolve currently open video
  const current = useMemo(
    () => gamingVideos.find((v) => String(v.id) === String(openId)) || null,
    [openId]
  );

  return (
    <div className="min-h-screen">
      {/* Meta tags */}
      <title>Video Editing Services | Shinel Studios</title>
      <meta
        name="description"
        content="High-impact edits, cinematic montages, trailers and shorts crafted for creators & brands. Optimized for YouTube, TikTok & Reels."
      />
      <meta property="og:title" content="Video Editing Services | Shinel Studios" />
      <meta
        property="og:description"
        content="High-impact edits, cinematic montages, trailers and shorts crafted for creators & brands."
      />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://shinelstudios.in/video-editing" />

      {/* Hero section */}
      <section
        className="pt-28 pb-10 text-center overflow-hidden"
        style={{ background: "var(--hero-bg)" }}
      >
        <div className="container mx-auto px-4">
          <h1
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold font-['Poppins']"
            style={{ color: "var(--text)" }}
          >
            Video <span style={{ color: "var(--orange)" }}>Editing</span>
          </h1>
          <p
            className="mt-4 text-base sm:text-lg md:text-xl max-w-3xl mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            High-impact edits, cinematic montages, trailers and shorts crafted for creators &amp;
            brands. Optimized for YouTube, TikTok &amp; Reels.
          </p>

          {/* Category filters */}
          <div className="mt-6 flex flex-wrap justify-center gap-2 px-2 sm:px-0">
            {categories.map((c) => (
              <FilterChip key={c} active={c === selected} onClick={() => setSelected(c)}>
                {c}
              </FilterChip>
            ))}
          </div>
        </div>
      </section>

      {/* Video Grid */}
      <section className="py-12 sm:py-14" style={{ background: "var(--surface)" }}>
        <div className="container mx-auto px-3 sm:px-4">
          <div
            onClick={onGridClick}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
          >
            {filtered.map((v) => (
              <VideoCard key={v.id} v={v} />
            ))}
          </div>
        </div>
      </section>

      {/* Modal player */}
      {openId && current && (
        <div
          className="fixed inset-0 z-50 bg-black/60 p-6 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="relative w-[min(960px,96vw)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] overflow-hidden">
            <button
              onClick={closeModal}
              className="icon-btn absolute right-3 top-3 border border-[var(--border)] bg-[var(--surface-alt)] z-10"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="relative w-full bg-black" style={{ aspectRatio: "16 / 9" }}>
              {current.type === "youtube" ? (
                <YouTubeModalPlayer youtubeId={current.youtubeId} title={current.title} />
              ) : (
                <video
                  className="w-full h-full"
                  src={current.src}
                  poster={current.thumb}
                  controls
                  autoPlay
                  preload="metadata"
                />
              )}
            </div>

            <div className="p-4 sm:p-5">
              <h3 className="text-base sm:text-lg font-semibold mb-1" style={{ color: "var(--text)" }}>
                {current.title}
              </h3>
              <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                {current.creator} • {inferCategory(current)} • {current.duration}
              </p>
              {current.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {current.tags.map((t, i) => (
                    <Tag key={i}>{t}</Tag>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
