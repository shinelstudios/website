// src/components/Shorts.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MetaTags, { BreadcrumbSchema } from "./MetaTags";

/**
 * Shorts & Reels page
 *
 * - Reads from the same Worker endpoint as Admin Videos:
 *     GET /videos  → { videos: [...] }
 * - Shows ONLY vertical pieces (kind !== "LONG")
 * - Filter is based on SUBCATEGORY (with URL sync):
 *     ?subcategory=Gaming%20Shorts&type=reels
 *   (also accepts legacy ?category=... as a fallback)
 * - Primary YouTube URL is preferred when deciding what to play.
 * - Modal supports ← / → keys + on-screen arrows to move between shorts.
 */

const AUTH_BASE =
  import.meta.env.VITE_AUTH_BASE ||
  "https://shinel-auth.your-account.workers.dev";
const PUBLIC_READ_TOKEN = import.meta.env.VITE_PUBLIC_READ_TOKEN || "";

// LocalStorage cache key for this page
const STORAGE_KEY = "shortsCacheV1";

/* ---------------- Helpers ---------------- */

function formatViews(count) {
  if (!count || count === 0) return null;
  if (count >= 1_000_000)
    return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (count >= 1_000)
    return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return Number(count).toLocaleString();
}

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

const canAnimate =
  typeof window !== "undefined" &&
  !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function extractYouTubeId(url = "") {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https:${url}`);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/\/shorts\/([^/]+)/);
      if (m) return m[1];
    }
  } catch { }
  return null;
}

// Cheap, bounded "hype" fallback; returns a small integer (0–999)
function computeFallbackHype(views = 0, lastViewUpdate = null) {
  if (!views) return 0;
  const days = lastViewUpdate
    ? Math.max(0, (Date.now() - Number(lastViewUpdate)) / 86400000)
    : 7;
  const freshness = Math.max(0.5, Math.min(1, 1 - days / 30)); // 0.5–1 range
  const raw = Math.log10(views + 1) * 100 * freshness; // ~0–(300+) range
  return Math.round(Math.min(999, raw));
}
function formatHype(n) {
  if (n == null) return null;
  if (n >= 900) return "S+";
  if (n >= 750) return "S";
  if (n >= 600) return "A";
  if (n >= 450) return "B";
  if (n >= 300) return "C";
  return "D";
}

const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] animate-pulse">
    <div className="w-full aspect-[9/16] bg-[var(--text-muted)]/10" />
    <div className="p-4 space-y-2.5">
      <div className="h-6 bg-[var(--text-muted)]/10 rounded w-3/4"></div>
      <div className="h-4 bg-[var(--text-muted)]/10 rounded w-1/2"></div>
      <div className="h-9 bg-[var(--text-muted)]/10 rounded w-full"></div>
    </div>
  </div>
);

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
  // Known IDs that lack hqdefault
  const KNOWN_BAD_IDS = ["t-vPWTJUIO4", "R2jcaMDAvOU"];

  const getBestThumb = () => {
    if (v.thumb) return v.thumb;
    if (!youtubeId) return null;
    const quality = KNOWN_BAD_IDS.includes(youtubeId) ? "mqdefault" : "hqdefault";
    return `https://img.youtube.com/vi/${youtubeId}/${quality}.jpg`;
  };

  const initialSrc = getBestThumb();
  const [src, setSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(getBestThumb());
    setFailed(false);
  }, [v.thumb, youtubeId]);

  const handleError = () => {
    if (!src) return;
    if (src.includes("hqdefault.jpg")) {
      setSrc(src.replace("hqdefault.jpg", "mqdefault.jpg"));
    } else if (src.includes("mqdefault.jpg")) {
      setSrc(src.replace("mqdefault.jpg", "sddefault.jpg"));
    } else {
      setFailed(true);
    }
  };

  if (!src || failed) {
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

/* ---------------- Main page: Shorts & Reels ---------------- */

export default function Shorts() {
  const [videos, setVideos] = useState([]);
  const [etag, setEtag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // FILTERS (based on SUBCATEGORY)
  const [subFilter, setSubFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL | SHORTS | REELS

  // inline player + index
  const [playerOpen, setPlayerOpen] = useState(false);
  const [activeYouTubeId, setActiveYouTubeId] = useState(null);
  const [activeTitle, setActiveTitle] = useState("");
  const [activeIndex, setActiveIndex] = useState(null); // index inside filteredVideos

  const location = useLocation();
  const navigate = useNavigate();

  const readToken = useMemo(
    () => PUBLIC_READ_TOKEN || localStorage.getItem("token") || "",
    []
  );

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      // restore cache
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
        const normalized = data.videos.map((v) => {
          // PRIMARY URL MUST WIN for what we play
          const youtubeId =
            extractYouTubeId(v.primaryUrl) ||
            extractYouTubeId(v.creatorUrl) ||
            v.videoId ||
            v.youtubeId;

          const kind = (v.kind || "LONG").toUpperCase();

          return {
            id:
              v.id ||
              v.videoId ||
              v.youtubeId ||
              v.primaryUrl ||
              Math.random().toString(36).slice(2),
            title: v.title || "",
            category: v.category || "OTHER", // kept for reference
            subcategory: v.subcategory || "Uncategorized",
            kind,
            primaryUrl: v.primaryUrl || "",
            creatorUrl: v.creatorUrl || "",
            youtubeId,
            views: Number(v.youtubeViews ?? v.views ?? 0),
            lastViewUpdate: v.lastViewUpdate || v.updated || null,
            tags: Array.isArray(v.tags) ? v.tags : [],
            hype:
              typeof v.hype === "number"
                ? v.hype
                : typeof v.hypeScore === "number"
                  ? v.hypeScore
                  : null,
            thumb:
              v.thumb ||
              (youtubeId
                ? (["t-vPWTJUIO4", "R2jcaMDAvOU"].includes(youtubeId)
                  ? "https://placehold.co/600x400/202020/white?text=No+Preview"
                  : `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`)
                : null),
          };
        });

        // keep ONLY vertical / short-form pieces
        const verticalOnly = normalized.filter(
          (v) => (v.kind || "LONG").toUpperCase() !== "LONG"
        );

        setVideos(verticalOnly);
        setEtag(newEtag || null);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            etag: newEtag || null,
            items: verticalOnly,
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

  // sync filters from URL (subcategory + type)
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    // primary param: subcategory
    let sub = params.get("subcategory");
    // legacy support: ?category=
    if (!sub) {
      sub = params.get("category");
    }
    const type = params.get("type");

    setSubFilter(sub || "ALL");
    setTypeFilter((type || "ALL").toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // subcategory options from data
  const subOptions = useMemo(() => {
    const set = new Set();
    videos.forEach((v) => v.subcategory && set.add(v.subcategory));
    return ["ALL", ...Array.from(set).sort()];
  }, [videos]);

  const handleSubChange = useCallback(
    (next) => {
      const params = new URLSearchParams(location.search);
      if (next === "ALL") {
        params.delete("subcategory");
        params.delete("category"); // clean legacy
      } else {
        params.set("subcategory", next);
        params.delete("category");
      }
      navigate(
        { pathname: location.pathname, search: params.toString() },
        { replace: false }
      );
    },
    [location.pathname, location.search, navigate]
  );

  const handleTypeChange = useCallback(
    (next) => {
      const params = new URLSearchParams(location.search);
      if (next === "ALL") {
        params.delete("type");
      } else {
        params.set("type", next.toLowerCase());
      }
      navigate(
        { pathname: location.pathname, search: params.toString() },
        { replace: false }
      );
    },
    [location.pathname, location.search, navigate]
  );

  // apply filters
  const filteredVideos = useMemo(() => {
    let list = videos;

    if (subFilter !== "ALL") {
      list = list.filter(
        (v) => (v.subcategory || "Uncategorized") === subFilter
      );
    }

    const tf = (typeFilter || "ALL").toUpperCase();
    if (tf === "SHORTS") {
      list = list.filter((v) => v.kind === "SHORT" || v.kind === "BRIEF");
    } else if (tf === "REELS") {
      list = list.filter((v) => v.kind === "REEL");
    }

    return list;
  }, [videos, subFilter, typeFilter]);

  // clamp modal index if filters change
  useEffect(() => {
    if (!playerOpen) return;
    if (
      activeIndex == null ||
      activeIndex < 0 ||
      activeIndex >= filteredVideos.length
    ) {
      setPlayerOpen(false);
      setActiveIndex(null);
      setActiveYouTubeId(null);
      setActiveTitle("");
    }
  }, [filteredVideos.length, playerOpen, activeIndex]);

  const openPlayer = useCallback(
    (index, youtubeId, title = "") => {
      if (!youtubeId) return;
      setActiveIndex(index);
      setActiveYouTubeId(youtubeId);
      setActiveTitle(title || "");
      setPlayerOpen(true);
    },
    []
  );

  const closePlayer = useCallback(() => {
    setPlayerOpen(false);
    setTimeout(() => {
      setActiveYouTubeId(null);
      setActiveTitle("");
      setActiveIndex(null);
    }, 150);
  }, []);

  const goNext = useCallback(() => {
    if (
      filteredVideos.length === 0 ||
      activeIndex == null ||
      activeIndex < 0
    )
      return;
    const nextIndex = (activeIndex + 1) % filteredVideos.length;
    const next = filteredVideos[nextIndex];
    if (!next?.youtubeId) return;
    setActiveIndex(nextIndex);
    setActiveYouTubeId(next.youtubeId);
    setActiveTitle(next.title || "");
  }, [activeIndex, filteredVideos]);

  const goPrev = useCallback(() => {
    if (
      filteredVideos.length === 0 ||
      activeIndex == null ||
      activeIndex < 0
    )
      return;
    const prevIndex =
      (activeIndex - 1 + filteredVideos.length) % filteredVideos.length;
    const prev = filteredVideos[prevIndex];
    if (!prev?.youtubeId) return;
    setActiveIndex(prevIndex);
    setActiveYouTubeId(prev.youtubeId);
    setActiveTitle(prev.title || "");
  }, [activeIndex, filteredVideos]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <MetaTags
        title="Short-Form Video & Reels Editing | Shinel Studios - Viral Pacing"
        description="Fast-paced editing for YouTube Shorts, Instagram Reels, and TikTok. High-retention hooks, kinetic captions, and batch delivery."
        keywords="shorts editing, reels editor, tiktok video editor, vertical video production"
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Work', url: '/work' },
          { name: 'Shorts & Reels', url: '/shorts' },
        ]}
      />
      <header className="mb-6 sm:mb-8">
        <h1
          className="text-3xl sm:text-4xl font-extrabold tracking-tight"
          style={{ color: "var(--text)" }}
        >
          Shorts &amp; Reels
        </h1>
        <p
          className="mt-2 text-sm sm:text-base"
          style={{ color: "var(--text-muted)" }}
        >
          Vertical clips curated from the Admin Videos panel. Only items with
          kind ≠ LONG are displayed. Filters use the{" "}
          <strong>Subcategory</strong> field.
        </p>
      </header>

      {err && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {err}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-6 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No vertical videos yet. Add some in{" "}
            <strong>Tools → Admin • Videos</strong>.
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-[11px] sm:text-xs mr-1"
                style={{ color: "var(--text-muted)" }}
              >
                Subcategory:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {subOptions.map((sub) => (
                  <FilterChip
                    key={sub}
                    label={sub === "ALL" ? "All" : sub}
                    active={
                      (sub === "ALL" && subFilter === "ALL") ||
                      sub === subFilter
                    }
                    onClick={() => handleSubChange(sub)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <span
                className="text-[11px] sm:text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Type:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  label="All"
                  active={typeFilter === "ALL"}
                  onClick={() => handleTypeChange("ALL")}
                />
                <FilterChip
                  label="Shorts"
                  active={typeFilter === "SHORTS"}
                  onClick={() => handleTypeChange("SHORTS")}
                />
                <FilterChip
                  label="Reels"
                  active={typeFilter === "REELS"}
                  onClick={() => handleTypeChange("REELS")}
                />
              </div>
              <span className="text-[11px] sm:text-xs ml-1">
                <span style={{ color: "var(--text-muted)" }}>
                  Showing{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {filteredVideos.length}
                  </strong>{" "}
                  of{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {videos.length}
                  </strong>{" "}
                  clips
                </span>
              </span>
            </div>
          </div>

          {filteredVideos.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-6 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No clips match these filters yet. Try another subcategory or
                type.
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5"
              style={{
                contentVisibility: 'auto',
                containIntrinsicSize: '0 1000px'
              }}
            >
              {filteredVideos.map((v, idx) => (
                <ShortCard
                  key={v.id}
                  v={v}
                  index={idx}
                  onPlay={openPlayer}
                />
              ))}
            </div>
          )}

          <VideoPlayerModal
            open={playerOpen}
            youtubeId={activeYouTubeId}
            title={activeTitle}
            onClose={closePlayer}
            onNext={goNext}
            onPrev={goPrev}
          />
        </>
      )}
    </section>
  );
}

/* ---------------- Card (vertical) ---------------- */

function ShortCard({ v, index, onPlay }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const formattedViews = formatViews(v.views);
  const youtubeId = v.youtubeId;
  const playable = !!youtubeId;

  const hype = useMemo(() => {
    if (typeof v.hype === "number") return v.hype;
    return computeFallbackHype(v.views, v.lastViewUpdate);
  }, [v.hype, v.views, v.lastViewUpdate]);

  return (
    <article
      className={`group relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] transition-[transform,box-shadow,border-color] ${canAnimate ? "hover:scale-[1.01]" : ""
        } hover:shadow-xl hover:border-[var(--orange)] will-change-transform`}
    >
      <button
        type="button"
        onClick={() => playable && onPlay(index, youtubeId, v.title)}
        className="relative w-full aspect-[9/16] bg-[var(--surface-alt)] overflow-hidden text-left"
        aria-label={playable ? "Play video" : "Thumbnail"}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[var(--text-muted)]/10 animate-pulse" />
        )}
        <ThumbnailImage
          v={v}
          youtubeId={youtubeId}
          imageLoaded={imageLoaded}
          setImageLoaded={setImageLoaded}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {playable && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-md">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-black"
              >
                <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <span className="text-xs font-semibold text-black">Play</span>
            </div>
          </div>
        )}
      </button>

      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          {v.subcategory && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
              {v.subcategory}
            </span>
          )}
          {hype != null && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold border bg-amber-500/15 text-amber-300 border-amber-500/30 ml-auto"
              title="Hype (engagement momentum)"
            >
              🔥 {formatHype(hype)}
            </span>
          )}
        </div>

        <h3 className="text-[var(--text)] text-xs sm:text-sm font-semibold line-clamp-2 min-h-[2.1rem] leading-snug">
          {v.title || "Untitled"}
        </h3>

        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] sm:text-xs text-[var(--text-muted)]">
          {formattedViews && (
            <div>
              👁️‍🗨️ <span className="font-medium">{formattedViews}</span>
            </div>
          )}
          <span className="px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] uppercase tracking-wide">
            {v.kind}
          </span>
        </div>

        {playable && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => onPlay(index, youtubeId, v.title)}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-white text-xs sm:text-sm"
              style={{ background: "var(--orange)" }}
            >
              ▶ Watch
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

/* ---------------- Inline modal player (responsive 9:16 + arrows) ---------------- */

function VideoPlayerModal({ open, youtubeId, title, onClose, onNext, onPrev }) {
  const refBackdrop = useRef(null);
  const [dims, setDims] = useState({ width: 320, height: 568 });

  // Calculate best 9:16 box that fits viewport (90% of width/height)
  useEffect(() => {
    if (!open) return;

    const updateDims = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxW = vw * 0.9;
      const maxH = vh * 0.9;

      // start with height-limited box
      let height = maxH;
      let width = (height * 9) / 16;

      // if too wide, limit by width instead
      if (width > maxW) {
        width = maxW;
        height = (width * 16) / 9;
      }
      setDims({ width, height });
    };

    updateDims();
    window.addEventListener("resize", updateDims);
    return () => window.removeEventListener("resize", updateDims);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext && onNext();
      if (e.key === "ArrowLeft") onPrev && onPrev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, onNext, onPrev]);

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
        background: "rgba(0,0,0,0.6)",
        transition: "opacity 150ms ease-out",
      }}
    >
      {/* left/right arrow buttons */}
      <button
        type="button"
        onClick={onPrev}
        className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full items-center justify-center bg-black/60 text-white border border-white/30"
        aria-label="Previous short"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={onNext}
        className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full items-center justify-center bg-black/60 text-white border border-white/30"
        aria-label="Next short"
      >
        ›
      </button>

      <div
        className="relative rounded-xl overflow-hidden border bg-black"
        style={{
          borderColor: "var(--border)",
          width: `${dims.width}px`,
        }}
      >
        {/* Video area – full 9:16, nothing over the bottom so YT controls are free */}
        <div
          className="relative w-full"
          style={{ height: `${dims.height}px` }}
        >
          {youtubeId ? (
            <iframe
              key={youtubeId}
              title={title || "YouTube short"}
              // start=0 -> always from beginning
              // vq=hd1080 -> request highest quality; YouTube may still downgrade
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&controls=1&fs=1&start=0&vq=hd1080`}
              allow="autoplay; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full"
              loading="eager"
            />
          ) : null}

          {/* Close button only, in the corner – not covering quality/settings */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.9)", color: "#111" }}
            aria-label="Close player"
          >
            ✕
          </button>
        </div>

        {/* Our title is now BELOW the player, so it doesn't block YT UI at all */}
        {title ? (
          <div className="px-3 py-2 text-xs sm:text-sm text-gray-100 bg-black">
            {title}
          </div>
        ) : null}
      </div>
    </div>
  );
}
