// src/components/VideoEditing.jsx
import React, { useMemo, useState } from "react";
import { Play } from "lucide-react";
import gamingVideos from "../data/gamingVideos.js";

/* Helpers */
const ytThumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

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

const VideoCard = ({ v }) => (
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

export default function VideoEditing() {
  const allTags = useMemo(() => {
    const s = new Set();
    gamingVideos.forEach((v) => v.tags?.forEach((t) => s.add(t)));
    return Array.from(s);
  }, []);

  return (
    <>
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

      <div className="min-h-screen">
        {/* Hero */}
        <section className="pt-12 pb-10 text-center" style={{ background: "var(--hero-bg)" }}>
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-extrabold font-['Poppins']" style={{ color: "var(--text)" }}>
              Video <span style={{ color: "var(--orange)" }}>Editing</span>
            </h1>
            <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto" style={{ color: "var(--text-muted)" }}>
              High-impact edits, cinematic montages, trailers and shorts crafted for creators & brands. Optimized for
              YouTube, TikTok & Reels.
            </p>

            {allTags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {allTags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Grid */}
        <section className="py-14" style={{ background: "var(--surface)" }}>
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gamingVideos.map((v) => (
                <VideoCard key={v.id} v={v} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
