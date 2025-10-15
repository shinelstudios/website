// src/components/VideoEditing.jsx
import React, { useMemo, useState } from "react";
import { Play } from "lucide-react";
import gamingVideos from "../data/gamingVideos.js";

/* ---------- helpers ---------- */
const ytThumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
const norm = (s = "") => String(s).toLowerCase();

/** Try to infer a category from the item (works even if your data doesn't have `category`) */
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
    className="text-xs px-3 py-1 rounded-full border transition-colors"
    style={{
      color: active ? "#fff" : "var(--orange)",
      background: active ? "var(--orange)" : "color-mix(in oklab, var(--orange) 12%, transparent)",
      borderColor: active ? "var(--orange)" : "color-mix(in oklab, var(--orange) 35%, transparent)",
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

/* ---------- smart player ---------- */
const YouTubeSmartPlayer = ({ youtubeId, title, thumb }) => {
  const [playing, setPlaying] = useState(false);

  if (playing) {
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
  }

  const src = thumb || ytThumb(youtubeId);

  return (
    <button
      type="button"
      className="group relative w-full h-full overflow-hidden"
      onClick={() => setPlaying(true)}
      aria-label={`Play ${title}`}
    >
      <img
        src={src}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent opacity-90" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/90 backdrop-blur-md shadow-lg transition-all group-hover:shadow-xl">
          <Play size={18} className="text-black" />
          <span className="text-sm font-semibold text-black">Play</span>
        </div>
      </div>
    </button>
  );
};

const VideoCard = ({ v }) => {
  const cat = inferCategory(v);
  return (
    <article
      className="rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="relative w-full aspect-video bg-black">
        {v.type === "youtube" ? (
          <YouTubeSmartPlayer youtubeId={v.youtubeId} title={v.title} thumb={v.thumb} />
        ) : (
          <video className="w-full h-full" src={v.src} poster={v.thumb} controls preload="metadata" />
        )}

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

      <div className="p-4">
        <h3 className="text-lg font-semibold mb-1 line-clamp-2" style={{ color: "var(--text)" }}>
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
      </div>
    </article>
  );
};

/* ---------- page ---------- */
export default function VideoEditing() {
  // Build category list from data + helpful defaults
  const categories = useMemo(() => {
    const set = new Set(["All", "BGMI", "Valorant", "Live", "Vlog", "Documentary", "Trailers", "Cinematics", "Client Work"]);
    gamingVideos.forEach((v) => set.add(inferCategory(v)));
    // Keep "All" first, then others by insertion order
    return ["All", ...Array.from(set).filter((c) => c !== "All")];
  }, []);

  const [selected, setSelected] = useState("All");

  // Filter items by selected category
  const filtered = useMemo(
    () => gamingVideos.filter((v) => selected === "All" || inferCategory(v) === selected),
    [selected]
  );

  return (
    <div className="min-h-screen">
      {/* Meta */}
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

      {/* Hero */}
      <section className="pt-28 pb-10 text-center" style={{ background: "var(--hero-bg)" }}>
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-extrabold font-['Poppins']" style={{ color: "var(--text)" }}>
            Video <span style={{ color: "var(--orange)" }}>Editing</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto" style={{ color: "var(--text-muted)" }}>
            High-impact edits, cinematic montages, trailers and shorts crafted for creators & brands. Optimized for
            YouTube, TikTok & Reels.
          </p>

          {/* Category filter */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {categories.map((c) => (
              <FilterChip key={c} active={c === selected} onClick={() => setSelected(c)}>
                {c}
              </FilterChip>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-14" style={{ background: "var(--surface)" }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((v) => (
              <VideoCard key={v.id} v={v} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
