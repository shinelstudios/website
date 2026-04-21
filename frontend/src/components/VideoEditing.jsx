// src/components/VideoEditing.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { getAccessToken } from "../utils/tokenStore";
import { extractYouTubeId } from "../utils/youtube";
import { formatViewsLocale as formatViews } from "../utils/formatters";
import MetaTags, { BreadcrumbSchema } from "./MetaTags";
import { Kicker, Display, Lede, RevealOnScroll } from "../design";

/**
 * Public/Protected read:
 * - If your Worker requires auth for GET endpoints, set one of:
 *   - VITE_PUBLIC_READ_TOKEN   (compile-time)
 *   - localStorage["token"]    (runtime; e.g., after admin login)
 * The component will automatically attach `Authorization: Bearer <token>` to reads.
 *
 * Endpoint used:
 *   GET  /videos   → { videos: [...] } with ETag
 *
 * Enhancements:
 * - In-page video player (modal with YouTube iframe) → no navigation away.
 * - "Hype" chip:
 *      • Uses v.hype or v.hypeScore if present from API
 *      • Fallback: derived from views & recency (cheap to compute)
 * - Gentle, CPU-friendly animations (respect prefers-reduced-motion).
 * - Category filters synced with URL (?category=GAMING) so you can share filtered links.
 */

import { AUTH_BASE } from "../config/constants";
const PUBLIC_READ_TOKEN = import.meta.env.VITE_PUBLIC_READ_TOKEN || "";

/* ---------------- Cache key (ETag) ---------------- */
const STORAGE_KEY = "videosCacheV4";

/* ---------------- Helpers (copied / extended) ---------------- */
// formatViews moved to utils/formatters.js as formatViewsLocale.

async function fetchJSONWithETag(
  url,
  { etag, signal, authToken, timeoutMs = 30000, retries = 2 } = {}
) {
  const attemptOnce = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = new Headers();
      if (etag) headers.set("If-None-Match", etag);
      if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
      const res = await fetch(url, {
        headers,
        signal: signal || controller.signal,
        credentials: "omit",
      });
      const newEtag = res.headers.get("ETag") || null;

      if (res.status === 304) {
        return { status: 304, etag: etag || newEtag, data: null };
      }
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
          if (j?.message) msg = j.message;
        } catch { }
        const err = new Error(msg);
        err.status = res.status;
        throw err;
      }
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }
      return { status: res.status, etag: newEtag, data };
    } finally {
      clearTimeout(timer);
    }
  };

  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await attemptOnce();
    } catch (e) {
      lastErr = e;
      const retriable =
        e?.name === "AbortError" ||
        e?.status === 429 ||
        (e?.status >= 500 && e?.status < 600) ||
        !e?.status;
      if (i < retries && retriable) {
        const backoff = 400 * Math.pow(2, i) + Math.floor(Math.random() * 150);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error("Network error");
}

/* ---------------- Main page ---------------- */
export default function VideoEditing() {
  // ONLY server-managed videos (no hard-coded imports)
  const [videos, setVideos] = useState([]);
  const [etag, setEtag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Inline player state
  const [playerOpen, setPlayerOpen] = useState(false);
  const [activeYouTubeId, setActiveYouTubeId] = useState(null);
  const [activeTitle, setActiveTitle] = useState("");

  const location = useLocation();
  const navigate = useNavigate();

  // Optional auth for reads (mirrors Thumbnails.jsx)
  const readToken = useMemo(() => {
    return PUBLIC_READ_TOKEN || getAccessToken();
  }, []);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      // restore cached ETag/data
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (cached?.items && cached?.etag) {
        setVideos(cached.items);
        setEtag(cached.etag);
      }

      const { data, etag: newEtag, status } = await fetchJSONWithETag(
        `${AUTH_BASE.replace(/\/$/, "")}/videos`,
        { etag: cached?.etag, authToken: readToken, timeoutMs: 35000, retries: 2 }
      );

      if (status !== 304 && data?.videos) {
        // normalize to the fields our UI needs
        const normalized = data.videos.map((v) => {
          // SHINEL URL MUST WIN
          const shinelUrl = v.mirror_url || v.mirrorUrl || v.youtube_url || v.primaryUrl || v.primary_url;
          const youtubeId =
            extractYouTubeId(shinelUrl) ||
            extractYouTubeId(v.creatorUrl) ||
            v.video_id ||
            v.videoId ||
            v.youtubeId;

          return {
            id:
              v.id ||
              v.video_id ||
              v.videoId ||
              v.youtubeId ||
              v.primaryUrl ||
              Math.random().toString(36).slice(2),
            title: v.title || "",
            category: v.category || "OTHER",
            subcategory: v.subcategory || "",
            kind: v.kind || "LONG",
            primaryUrl: v.youtube_url || v.primaryUrl || "",
            creatorUrl: v.creatorUrl || "",
            youtubeId, // <-- now based on shinelUrl first
            views: Number(v.youtube_views ?? v.youtubeViews ?? v.views ?? 0),
            lastViewUpdate: v.lastViewUpdate || v.updated || null,
            tags: Array.isArray(v.tags) ? v.tags : [],
            hype:
              typeof v.hype === "number"
                ? v.hype
                : typeof v.hypeScore === "number"
                  ? v.hypeScore
                  : null,
            thumb:
              v.image_url ||
              v.imageUrl ||
              v.image ||
              v.thumb ||
              (youtubeId
                ? (["t-vPWTJUIO4", "R2jcaMDAvOU"].includes(youtubeId)
                  ? "https://placehold.co/600x400/202020/white?text=No+Preview"
                  : `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`)
                : null),
            shinelUrl,
          };
        });


        setVideos(normalized);
        setEtag(newEtag || null);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            etag: newEtag || null,
            items: normalized,
            ts: Date.now(),
          })
        );
      }
    } catch (e) {
      setErr(e.message || "Failed to load videos");
    } finally {
      setLoading(false);
    }
  }, [readToken]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Read category from URL on mount / URL change
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get("category");
    if (cat && cat !== categoryFilter) {
      setCategoryFilter(cat);
    }
    if (!cat && categoryFilter !== "ALL") {
      setCategoryFilter("ALL");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // All categories available in data
  const categoryOptions = useMemo(() => {
    const set = new Set();
    videos.forEach((v) => {
      if (v.category) set.add(v.category);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [videos]);

  // Apply filters
  const filteredVideos = useMemo(() => {
    let list = videos;
    if (categoryFilter !== "ALL") {
      list = list.filter(
        (v) => (v.category || "OTHER") === categoryFilter
      );
    }
    return list;
  }, [videos, categoryFilter]);

  const handleCategoryChange = useCallback(
    (next) => {
      setCategoryFilter(next);
      const params = new URLSearchParams(location.search);
      if (next === "ALL") {
        params.delete("category");
      } else {
        params.set("category", next);
      }
      navigate(
        {
          pathname: location.pathname,
          search: params.toString(),
        },
        { replace: false }
      );
    },
    [location.pathname, location.search, navigate]
  );

  // open inline modal player
  const openPlayer = useCallback((youtubeId, title = "") => {
    if (!youtubeId) return;
    setActiveYouTubeId(youtubeId);
    setActiveTitle(title || "");
    setPlayerOpen(true);
  }, []);
  const closePlayer = useCallback(() => {
    setPlayerOpen(false);
    setTimeout(() => {
      // allow fade-out before clearing iframe (reduces CPU)
      setActiveYouTubeId(null);
      setActiveTitle("");
    }, 150);
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <MetaTags
        title="Professional Video Editing | Shinel Studios - Cinematic Post-Production"
        description="Transform your raw footage into high-retention stories. Expert long-form editing for gaming, vlogs, and business."
        keywords="video editing services, youtube editor, cinematic editing, retention optimization"
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Work', url: '/work' },
          { name: 'Video Editing', url: '/video-editing' },
        ]}
      />
      <header className="mb-10 md:mb-14 pt-6 md:pt-10 max-w-3xl">
        <RevealOnScroll>
          <Kicker className="mb-5">Video Editing</Kicker>
        </RevealOnScroll>
        <RevealOnScroll delay="80ms">
          <Display as="h1" size="lg" className="mb-4">
            Long-form that <span style={{ color: "var(--orange)" }}>holds attention.</span>
          </Display>
        </RevealOnScroll>
        <RevealOnScroll delay="160ms">
          <Lede>
            Cinematic cuts, retention-first pacing, and finish-grade audio for
            vlogs, gaming, business, and documentary-style creators. Every edit
            named and attributed to a maker you can see on their profile.
          </Lede>
        </RevealOnScroll>
      </header>

      {err && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {err}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-6 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No videos yet. Add some in <strong>Tools → Admin • Videos</strong>.
          </p>
        </div>
      ) : (
        <>
          {/* Filters row */}
          <div className="mb-4 sm:mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-[11px] sm:text-xs mr-1"
                style={{ color: "var(--text-muted)" }}
              >
                Filter by category:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {categoryOptions.map((cat) => (
                  <FilterChip
                    key={cat}
                    label={cat === "ALL" ? "All" : cat}
                    active={
                      (cat === "ALL" && categoryFilter === "ALL") ||
                      cat === categoryFilter
                    }
                    onClick={() => handleCategoryChange(cat)}
                  />
                ))}
              </div>
            </div>
            <div className="sm:ml-auto text-[11px] sm:text-xs">
              <span style={{ color: "var(--text-muted)" }}>
                Showing{" "}
                <strong style={{ color: "var(--text)" }}>
                  {filteredVideos.length}
                </strong>{" "}
                of{" "}
                <strong style={{ color: "var(--text)" }}>
                  {videos.length}
                </strong>{" "}
                videos
              </span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-6 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No videos in this category yet. Try another filter or add more
                in <strong>Tools → Admin • Videos</strong>.
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
              style={{
                contentVisibility: 'auto',
                containIntrinsicSize: '0 800px'
              }}
            >
              {filteredVideos.map((v, idx) => (
                <VideoCard key={v.id || idx} v={v} onPlay={openPlayer} />
              ))}
            </div>
          )}

          {/* Inline modal player (same tab) */}
          <VideoPlayerModal
            open={playerOpen}
            youtubeId={activeYouTubeId}
            title={activeTitle}
            onClose={closePlayer}
          />
        </>
      )}
    </section>
  );
}

const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] animate-pulse">
    <div className="w-full aspect-[16/9] bg-[var(--text-muted)]/10" />
    <div className="p-4 sm:p-5 space-y-3">
      <div className="flex gap-2">
        <div className="h-5 bg-[var(--text-muted)]/10 rounded w-20"></div>
        <div className="h-5 bg-[var(--text-muted)]/10 rounded w-14"></div>
      </div>
      <div className="h-6 bg-[var(--text-muted)]/10 rounded w-3/4"></div>
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 bg-[var(--text-muted)]/10 rounded w-16"></div>
        <div className="h-4 bg-[var(--text-muted)]/10 rounded w-24"></div>
      </div>
      <div className="pt-2">
        <div className="h-9 bg-[var(--text-muted)]/10 rounded w-24"></div>
      </div>
    </div>
  </div>
);

/* ---------------- Card ---------------- */
function VideoCard({ v, onPlay }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const formattedViews = formatViews(v.views);
  const youtubeId = v.youtubeId; // already normalized with primaryUrl priority
  const playable = !!youtubeId;


  // Hype: prefer API-provided; else cheap fallback based on views + freshness

  return (
    <article
      className="group relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] transition-[transform,box-shadow,border-color] hover:scale-[1.01] hover:shadow-xl hover:border-[var(--orange)] will-change-transform"
    >
      <button
        type="button"
        onClick={() => playable && onPlay(youtubeId, v.title)}
        className="relative w-full aspect-[16/9] bg-black/30 overflow-hidden text-left"
        aria-label={playable ? "Play video" : "Thumbnail"}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[var(--surface-alt)] animate-pulse" />
        )}

        <ThumbnailImage
          v={v}
          youtubeId={youtubeId}
          imageLoaded={imageLoaded}
          setImageLoaded={setImageLoaded}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {playable && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/90 backdrop-blur-md shadow-md">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-black"
              >
                <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <span className="text-sm font-semibold text-black">Play</span>
            </div>
          </div>
        )}
      </button>

      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
            {v.category}
            {v.subcategory ? (
              <span className="opacity-70"> • {v.subcategory}</span>
            ) : null}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold border bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]">
            {v.kind || "LONG"}
          </span>
        </div>

        <h3 className="text-[var(--text)] text-sm sm:text-base font-semibold line-clamp-2 min-h-[2.5rem] leading-tight">
          {v.title || "Untitled"}
        </h3>

        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] sm:text-xs text-[var(--text-muted)]">
          {formattedViews && (
            <div
              title={
                v.lastViewUpdate
                  ? `Views last updated ${new Date(
                    v.lastViewUpdate
                  ).toLocaleString()}`
                  : ""
              }
            >
              <div className="flex items-center gap-1">
                <Eye size={12} className="opacity-70" />
                <span className="font-medium text-[var(--text-muted)]">{formattedViews}</span>
              </div>
            </div>
          )}
          {v.tags?.length > 0 && (
            <div className="flex items-center gap-2 truncate">
              {v.tags.slice(0, 2).map((t, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full border text-[10px]"
                >
                  {t}
                </span>
              ))}
              {v.tags.length > 2 && <span>+{v.tags.length - 2}</span>}
            </div>
          )}
        </div>

        {playable && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => onPlay(youtubeId, v.title)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm"
              style={{ background: "var(--orange)" }}
            >
              ▶ View
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

/* ---------------- Inline Modal Player ---------------- */
function VideoPlayerModal({ open, youtubeId, shinelUrl, title, onClose }) {
  const refBackdrop = useRef(null);

  // If we have a mirrorUrl that is NOT a YouTube ID, it might be a direct link
  const isDirectVideo = shinelUrl && !extractYouTubeId(shinelUrl) && (
    shinelUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) || 
    shinelUrl.includes("drive.google.com/file/d/") // handle drive links if shared as raw (though uncommon for iframe)
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={refBackdrop}
      className="fixed inset-0 z-50 grid place-items-center px-3"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Video player"}
      onMouseDown={(e) => {
        if (e.target === refBackdrop.current) onClose();
      }}
      style={{
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        transition: "opacity 150ms ease-out",
      }}
    >
      <div
        className="relative w-full max-w-5xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        style={{ background: "#000" }}
      >
        {/* 16:9 responsive box */}
        <div className="relative w-full bg-black/40" style={{ paddingTop: "56.25%" }}>
          {isDirectVideo ? (
            <video
              src={shinelUrl}
              controls
              autoPlay
              className="absolute top-0 left-0 w-full h-full"
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : youtubeId ? (
            <>
              <iframe
                key={youtubeId}
                title={title || "YouTube video"}
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&start=0&vq=highres&controls=0&disablekb=1&fs=0`}
                allow="autoplay; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                loading="eager"
                tabIndex="-1"
              />
              {/* Invisible overlay for protection */}
              <div
                className="absolute inset-0 z-10 bg-transparent"
                onContextMenu={(e) => e.preventDefault()}
              ></div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-sm italic">
              Video source unavailable
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 px-3 py-1.5 rounded-lg text-sm font-semibold border border-[var(--border)]"
          style={{ background: "var(--surface-alt)", color: "var(--text)" }}
          aria-label="Close player"
        >
          ✕
        </button>

        {title ? (
          <div className="px-3 py-2 text-xs sm:text-sm" style={{ color: "var(--text-muted)" }}>
            {title}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- Utilities ---------------- */
// Canonical extractYouTubeId lives in utils/youtube.js (imported above).


/* ---------------- Protected Img ---------------- */
function ProtectedImg({
  src,
  alt,
  className = "",
  onError,
  onLoad,
  fetchpriority = "auto",
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={`select-none ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onError={onError}
      onLoad={onLoad}
      loading="lazy"
      decoding="async"
      fetchPriority={fetchpriority}
      draggable="false"
    />
  );
}

/* ---------------- Filter Chip ---------------- */
function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[11px] sm:text-xs border transition-all ${active
        ? "bg-[var(--orange)] text-white border-[var(--orange)]"
        : "bg-transparent text-[var(--orange)] border-[var(--orange)] hover:bg-[var(--orange)]/10"
        }`}
    >
      {label}
    </button>
  );
}


function ThumbnailImage({ v, youtubeId, imageLoaded, setImageLoaded, className }) {
  // Known IDs that lack hqdefault, so we skip directly to mqdefault to avoid console 404s
  const KNOWN_BAD_IDS = ["t-vPWTJUIO4", "R2jcaMDAvOU"];

  // Priority: 1. v.thumb (custom), 2. youtube hqdefault (or mqdefault if known bad), 3. youtube mqdefault (fallback state), 4. placeholder
  const getBestThumb = () => {
    if (v.thumb) return v.thumb;
    if (!youtubeId) return null;
    const quality = KNOWN_BAD_IDS.includes(youtubeId) ? "mqdefault" : "hqdefault";
    return `https://img.youtube.com/vi/${youtubeId}/${quality}.jpg`;
  };

  const initialSrc = getBestThumb();
  const [src, setSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(false);

  // If initialSrc changes (e.g. video list update), reset state
  useEffect(() => {
    setSrc(getBestThumb());
    setFailed(false);
  }, [v.thumb, youtubeId]);

  const handleError = () => {
    if (!src) return;

    // Fallback logic
    if (src.includes("hqdefault.jpg")) {
      // Try medium quality
      setSrc(src.replace("hqdefault.jpg", "mqdefault.jpg"));
    } else if (src.includes("mqdefault.jpg")) {
      // Try standard definition
      setSrc(src.replace("mqdefault.jpg", "sddefault.jpg"));
    } else {
      // Give up, show placeholder or transparent
      setFailed(true);
      // Optional: set to a valid 404 placeholder image
    }
  };

  if (!src || failed) {
    // Return a placeholder div or valid placeholder image
    return <div className={`bg-gray-800 ${className} flex items-center justify-center text-white/20`}><svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg></div>;
  }

  return (
    <ProtectedImg
      src={src}
      alt={v.title || v.category}
      className={`${className} transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
      onLoad={() => setImageLoaded(true)}
      onError={handleError}
    />
  );
}
