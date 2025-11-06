// src/components/VideoEditing.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";

/**
 * Public/Protected read:
 * - If your Worker requires auth for GET endpoints, set one of:
 *   - VITE_PUBLIC_READ_TOKEN   (compile-time)
 *   - localStorage["token"]    (runtime; e.g., after admin login)
 * The component will automatically attach `Authorization: Bearer <token>` to reads.
 *
 * Endpoint used:
 *   GET  /videos   → { videos: [...] } with ETag
 */

const AUTH_BASE =
  import.meta.env.VITE_AUTH_BASE ||
  "https://shinel-auth.your-account.workers.dev";
const PUBLIC_READ_TOKEN = import.meta.env.VITE_PUBLIC_READ_TOKEN || "";

/* ---------------- Cache key (ETag) ---------------- */
const STORAGE_KEY = "videosCacheV1";

/* ---------------- Helpers (copied from Thumbnails style) ---------------- */
function formatViews(count) {
  if (!count || count === 0) return null;
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (count >= 1_000) return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return Number(count).toLocaleString();
}

async function fetchJSONWithETag(url, { etag, signal, authToken, timeoutMs = 30000, retries = 2 } = {}) {
  const attemptOnce = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = new Headers();
      if (etag) headers.set("If-None-Match", etag);
      if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
      const res = await fetch(url, { headers, signal: signal || controller.signal, credentials: "omit" });
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
        } catch {}
        const err = new Error(msg);
        err.status = res.status;
        throw err;
      }
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
      return { status: res.status, etag: newEtag, data };
    } finally {
      clearTimeout(timer);
    }
  };

  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try { return await attemptOnce(); }
    catch (e) {
      lastErr = e;
      const retriable = e?.name === "AbortError" || e?.status === 429 || (e?.status >= 500 && e?.status < 600) || !e?.status;
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

/* ---------------- Reusable bits (consistent with Thumbnails) ---------------- */
const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] animate-pulse">
    <div className="w-full aspect-[16/9] bg-gray-700/30" />
    <div className="p-4 space-y-2.5">
      <div className="h-6 bg-gray-700/30 rounded w-3/4"></div>
      <div className="h-4 bg-gray-700/30 rounded w-1/2"></div>
      <div className="h-9 bg-gray-700/30 rounded w-full"></div>
    </div>
  </div>
);

function ProtectedImg({ src, alt, className = "", onError, onLoad, fetchpriority = "auto" }) {
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
      fetchpriority={fetchpriority}
      draggable="false"
    />
  );
}

/* ---------------- Main page ---------------- */
export default function VideoEditing() {
  // ONLY server-managed videos (no hard-coded imports)
  const [videos, setVideos] = useState([]);
  const [etag, setEtag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Optional auth for reads (mirrors Thumbnails.jsx)
  const readToken = useMemo(() => {
    return PUBLIC_READ_TOKEN || localStorage.getItem("token") || "";
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
        const normalized = data.videos.map((v) => ({
          id: v.id || v.videoId || v.youtubeId || v.primaryUrl || Math.random().toString(36).slice(2),
          title: v.title || "",
          category: v.category || "OTHER",
          subcategory: v.subcategory || "",
          kind: v.kind || "LONG",
          primaryUrl: v.primaryUrl || "",
          creatorUrl: v.creatorUrl || "",
          youtubeId: v.videoId || v.youtubeId || extractYouTubeId(v.primaryUrl),
          // views mapping (fix #1)
          views: Number(v.youtubeViews ?? v.views ?? 0),
          lastViewUpdate: v.lastViewUpdate || v.updated || null,
          tags: Array.isArray(v.tags) ? v.tags : [],
          // preview image from YouTube if not provided
          thumb: v.thumb || (v.videoId || v.youtubeId ? `https://img.youtube.com/vi/${v.videoId || v.youtubeId}/hqdefault.jpg` : null),
        }));

        setVideos(normalized);
        setEtag(newEtag || null);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ etag: newEtag || null, items: normalized, ts: Date.now() }));
      }
    } catch (e) {
      setErr(e.message || "Failed to load videos");
    } finally {
      setLoading(false);
    }
  }, [readToken]);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
          Video Editing
        </h1>
        <p className="mt-2 text-sm sm:text-base" style={{ color: "var(--text-muted)" }}>
          Hand-picked edits crafted by our team. This list is sourced from the Admin Videos panel.
        </p>
      </header>

      {err && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {err}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-6 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No videos yet. Add some in <strong>Tools → Admin • Videos</strong>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {videos.map((v, idx) => (
            <VideoCard key={v.id || idx} v={v} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------- Card (Thumbnails look) ---------------- */
function VideoCard({ v }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const formattedViews = formatViews(v.views);

  const youtubeId = v.youtubeId || extractYouTubeId(v.primaryUrl);
  const playable = !!youtubeId;

  return (
    <article
      className="group relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-[var(--orange)]"
    >
      <div className="relative w-full aspect-[16/9] bg-black/30 overflow-hidden">
        {!imageLoaded && <div className="absolute inset-0 bg-gray-700/30 animate-pulse" />}
        <ProtectedImg
          src={v.thumb || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : "")}
          alt={v.title || v.category}
          className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setImageLoaded(true)}
        />
        {playable && (
          <a
            href={`https://www.youtube.com/watch?v=${youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center"
            aria-label="Play video on YouTube"
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/90 backdrop-blur-md shadow-lg group-hover:shadow-xl">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-black"><path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              <span className="text-sm font-semibold text-black">Play</span>
            </div>
          </a>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
            {v.category}{v.subcategory ? <span className="opacity-70"> • {v.subcategory}</span> : null}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold border bg-gray-700/30 text-gray-300 border-gray-600/30">
            {v.kind || "LONG"}
          </span>
        </div>

        <h3 className="text-[var(--text)] text-sm sm:text-base font-semibold line-clamp-2 min-h-[2.5rem] leading-tight">
          {v.title || "Untitled"}
        </h3>

        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] sm:text-xs text-[var(--text-muted)]">
          {formattedViews && (
            <div title={v.lastViewUpdate ? `Views last updated ${new Date(v.lastViewUpdate).toLocaleString()}` : ""}>
              👁️‍🗨️ <span className="font-medium">{formattedViews}</span>
            </div>
          )}
          {v.tags?.length > 0 && (
            <div className="flex items-center gap-2 truncate">
              {v.tags.slice(0, 2).map((t, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full border text-[10px]">
                  {t}
                </span>
              ))}
              {v.tags.length > 2 && <span>+{v.tags.length - 2}</span>}
            </div>
          )}
        </div>

        {playable && (
          <div className="mt-3">
            <a
              href={`https://www.youtube.com/watch?v=${youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm"
              style={{ background: "var(--orange)" }}
            >
              ▶ View
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

/* ---------------- Utilities ---------------- */
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
  } catch {}
  return null;
}
