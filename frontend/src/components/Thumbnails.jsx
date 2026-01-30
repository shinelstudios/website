import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import MetaTags, { BreadcrumbSchema } from "./MetaTags";

/**
 * Public/Protected read:
 * - If your Worker requires auth for GET endpoints, set one of:
 *   - VITE_PUBLIC_READ_TOKEN   (compile-time)
 *   - localStorage["token"]    (runtime; e.g., after admin login)
 * The component will automatically attach `Authorization: Bearer <token>` to reads.
 *
 * Endpoints used (read-only):
 *   GET  /thumbnails   → { thumbnails: [...] } with ETag
 */
const AUTH_BASE =
  import.meta.env.VITE_AUTH_BASE ||
  "https://shinel-auth.shinelstudioofficial.workers.dev";
const PUBLIC_READ_TOKEN = import.meta.env.VITE_PUBLIC_READ_TOKEN || "";

/* ---------------- Client cache keys ---------------- */
const STORAGE_KEY = "thumbnailsCacheV5"; // bump to invalidate older session caches {etag, items, ts}

/* ---------------- Fallback ---------------- */
const FALLBACK = [
  {
    id: "fallback",
    category: "GAMING",
    subcategory: "Valorant",
    variant: "LIVE",
    image: "https://placehold.co/1200x800?text=Thumbnail",
    imageUrl: "https://placehold.co/1200x800?text=Thumbnail",
  },
];

/* ---------------- Helpers ---------------- */
function formatViews(count) {
  if (!count || count === 0) return null;
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (count >= 1_000) return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return Number(count).toLocaleString();
}

function getItemsPerPage(gridSize) {
  if (typeof window === "undefined") return 12;
  const width = window.innerWidth;
  if (gridSize === "small") {
    if (width < 640) return 10;
    if (width < 1024) return 15;
    if (width < 1536) return 20;
    return 25;
  }
  if (gridSize === "medium") {
    if (width < 640) return 6;
    if (width < 1024) return 9;
    return 12;
  }
  if (gridSize === "large") {
    if (width < 640) return 4;
    if (width < 1024) return 6;
    return 8;
  }
  return 12;
}

/* ---------------- Small ETag-aware fetcher w/ optional auth, timeout, retries ---------------- */
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
        e?.name === "AbortError" || e?.status === 429 || (e?.status >= 500 && e?.status < 600) || !e?.status;
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

/* ---------------- Preload hint (best effort) ---------------- */
function preconnectTo(url) {
  try {
    const u = new URL(url);
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = `${u.protocol}//${u.host}`;
    link.crossOrigin = "";
    document.head.appendChild(link);
  } catch { }
}

/* ---------------- Skeleton ---------------- */
const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] animate-pulse">
    <div className="w-full aspect-[16/9] bg-[var(--text-muted)]/10" />
    <div className="p-3 sm:p-4 space-y-2.5">
      <div className="flex gap-2">
        <div className="h-5 bg-[var(--text-muted)]/10 rounded w-20"></div>
        <div className="h-5 bg-[var(--text-muted)]/10 rounded w-14"></div>
      </div>
      <div className="h-8 bg-[var(--text-muted)]/10 rounded w-3/4"></div>
      <div className="flex items-center gap-3">
        <div className="h-4 bg-[var(--text-muted)]/10 rounded w-16"></div>
        <div className="h-4 bg-[var(--text-muted)]/10 rounded flex-1"></div>
      </div>
      <div className="h-9 bg-[var(--text-muted)]/10 rounded w-full"></div>
    </div>
  </div>
);

/* ---------------- Protected Img ---------------- */
function ProtectedImg({ src, alt, onError, onLoad, className = "", fetchpriority = "auto" }) {
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

/* ---------------- Chip ---------------- */
const Chip = ({ children, active, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        text-xs sm:text-sm px-4 py-2 rounded-full border font-medium whitespace-nowrap select-none
        transition-all duration-200 hover:scale-105
        ${active
          ? "bg-[var(--orange)] text-white border-[var(--orange)]"
          : "bg-transparent text-[var(--orange)] border-[var(--orange)] hover:bg-[var(--orange)]/10"
        }
      `}
    >
      {children}
    </button>
  );
};

/* ---------------- Thumb Card ---------------- */
const ThumbCard = ({ t, onOpen, onBroken, fetchPriority = "auto" }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const formattedViews = formatViews(t.views);
  const isDeleted = t.viewStatus === "deleted";

  return (
    <article
      className="group relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-[var(--orange)] focus-within:ring-2 ring-[var(--orange)]"
      onClick={() => onOpen(t.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(t.id);
      }}
      aria-label={`Open ${t.youtubeTitle || t.filename || "thumbnail"}`}
    >
      {/* Media */}
      <div className="relative w-full aspect-[16/9] bg-[var(--surface-alt)] overflow-hidden">
        {!imageLoaded && <div className="absolute inset-0 bg-[var(--text-muted)]/10 animate-pulse" />}
        <ThumbnailImage
          t={t}
          onError={() => onBroken?.(t.id)}
          setImageLoaded={setImageLoaded}
          imageLoaded={imageLoaded}
          className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4 space-y-2.5">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
            {t.category}
            {t.subcategory && <span className="opacity-70">• {t.subcategory}</span>}
          </span>

          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold border ${t.variant === "LIVE"
              ? "bg-red-600/20 text-red-400 border-red-500/30 animate-pulse"
              : "bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]"
              }`}
          >
            {t.variant}
          </span>

          {t.youtubeUrl && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-red-600/20 text-red-400 border border-red-500/30">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              YouTube
            </span>
          )}
        </div>

        {/* Title (if available) */}
        {t.youtubeTitle ? (
          <h3 className="text-[var(--text)] text-xs sm:text-sm font-semibold line-clamp-2 min-h-[2.5rem] leading-tight">
            {t.youtubeTitle}
          </h3>
        ) : (
          <div className="min-h-[2.5rem]" />
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between gap-3 text-[10px] sm:text-xs text-[var(--text-muted)]">
          {formattedViews && (
            <div
              className={`flex items-center gap-1.5 ${isDeleted ? "opacity-60" : ""}`}
              title={
                t.lastViewUpdate
                  ? `Views last updated ${new Date(t.lastViewUpdate).toLocaleString()}`
                  : ""
              }
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span className="font-medium">{formattedViews}</span>
              {isDeleted && <span title="Video deleted">⚠</span>}
            </div>
          )}

          {t.dateAdded && (
            <div className="flex items-center gap-1.5 ml-auto">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span className="font-medium">
                {new Date(t.dateAdded).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        {/* View button (click bubbles to parent) */}
        <button
          type="button"
          className="w-full text-xs sm:text-sm font-semibold py-2 sm:py-2.5 rounded-lg bg-[var(--orange)] text-white hover:opacity-90 transition-all duration-300 group-hover:scale-105"
          aria-label="View full size"
        >
          View Full Size
        </button>
      </div>
    </article>
  );
};

/* ---------------- Share Modal ---------------- */
const ShareModal = ({ item, onClose }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}${window.location.pathname}?thumbnail=${encodeURIComponent(
    item.id
  )}`;
  const shareText = item.youtubeTitle || `Check out this ${item.category} thumbnail`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Focus trap (basic)
  const firstBtnRef = useRef(null);
  useEffect(() => {
    firstBtnRef.current?.focus?.();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-xl p-6 max-w-md w-full border border-[var(--border)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Share Thumbnail"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--text)]">Share Thumbnail</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            aria-label="Close share"
            ref={firstBtnRef}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Preview - protected */}
          <div
            className="relative aspect-video rounded-lg overflow-hidden border border-[var(--border)] select-none"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            <img
              src={item.imageUrl || item.image}
              alt={item.youtubeTitle || "Thumbnail"}
              className="w-full h-full object-cover pointer-events-none"
              draggable="false"
            />
          </div>

          {/* Copy Link */}
          <div>
            <label className="text-xs mb-2 block text-[var(--text-muted)] font-medium">Copy Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-sm"
              />
              <button
                onClick={copyLink}
                className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${copied ? "bg-green-600" : "bg-[var(--orange)] hover:opacity-90"
                  }`}
              >
                {copied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Social share */}
          <div>
            <label className="text-xs mb-2 block text-[var(--text-muted)] font-medium">Share on Social Media</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() =>
                  window.open(
                    `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
                      shareText
                    )}`,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                className="px-3 py-2 rounded-lg text-white text-sm font-medium bg-[#1DA1F2] hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
                </svg>
                Twitter
              </button>
              <button
                onClick={() =>
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank", "noopener,noreferrer")
                }
                className="px-3 py-2 rounded-lg text-white text-sm font-medium bg-[#4267B2] hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
                </svg>
                Facebook
              </button>
              <button
                onClick={() =>
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                className="px-3 py-2 rounded-lg text-white text-sm font-medium bg-[#25D366] hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path>
                </svg>
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Fullscreen Modal ---------------- */
const Modal = ({ items, currentId, onClose, onNavigate, onShare }) => {
  const currentIndex = items.findIndex((x) => x.id === currentId);
  const currentItem = items[currentIndex];
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef(null);
  const imageContainerRef = useRef(null);

  // Disable basic copying/dragging inside modal
  useEffect(() => {
    const prevent = (e) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("dragstart", prevent);
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("dragstart", prevent);
    };
  }, []);

  // Keys
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        onNavigate(items[currentIndex - 1].id);
        setZoom(1);
      }
      if (e.key === "ArrowRight" && currentIndex < items.length - 1) {
        onNavigate(items[currentIndex + 1].id);
        setZoom(1);
      }
      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 3));
      if (e.key === "-" || e.key === "_") setZoom((z) => Math.max(z - 0.25, 0.5));
      if (e.key === "0") setZoom(1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, items, onClose, onNavigate]);

  // Wheel zoom
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom((z) => Math.min(Math.max(z + delta, 0.5), 3));
      }
    };
    const container = imageContainerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => container.removeEventListener("wheel", handleWheel);
    }
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen?.().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => { });
      setIsFullscreen(false);
    }
  };

  if (!currentItem) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/95 backdrop-blur-lg select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onContextMenu={(e) => e.preventDefault()}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-6xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-alt)]">
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-medium text-[var(--text)]">
              {currentIndex + 1} / {items.length}
            </span>
            <span className="text-xs text-[var(--text-muted)]">Zoom: {Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Share */}
            <button
              onClick={() => onShare(currentItem)}
              className="p-2 rounded-lg hover:bg-[var(--orange)] transition-colors text-[var(--text)] hover:text-white"
              title="Share"
              aria-label="Share"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
              </svg>
            </button>

            {/* Zoom out */}
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              className="p-2 rounded-lg hover:bg-[var(--orange)] transition-colors text-[var(--text)] hover:text-white"
              title="Zoom out (-)"
              aria-label="Zoom out"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="7" y1="11" x2="15" y2="11"></line>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>

            {/* Zoom in */}
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
              className="p-2 rounded-lg hover:bg-[var(--orange)] transition-colors text-[var(--text)] hover:text-white"
              title="Zoom in (+)"
              aria-label="Zoom in"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="11" y1="7" x2="11" y2="15"></line>
                <line x1="7" y1="11" x2="15" y2="11"></line>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="hidden sm:block p-2 rounded-lg hover:bg-[var(--orange)] transition-colors text-[var(--text)] hover:text-white"
              title="Fullscreen (F)"
              aria-label="Toggle fullscreen"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {isFullscreen ? (
                  <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
                ) : (
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                )}
              </svg>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-red-600 transition-colors text-[var(--text)] hover:text-white"
              title="Close (Esc)"
              aria-label="Close"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Image area */}
        <div
          ref={imageContainerRef}
          className="relative bg-black flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
          style={{ height: "75vh" }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* IMPORTANT: wrapper is full size so 100% zoom fits entirely */}
          <div
            className="relative w-full h-full transition-transform duration-200"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
          >
            <ProtectedImg
              src={currentItem.imageUrl || currentItem.image}
              alt={`${currentItem.category} ${currentItem.subcategory || ""}`}
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>

          {/* Subtle protection overlay */}
          <div
            className="absolute inset-0 pointer-events-none select-none"
            style={{
              background:
                "repeating-linear-gradient(transparent, transparent 50px, rgba(0,0,0,0.001) 50px, rgba(0,0,0,0.001) 51px)",
              mixBlendMode: "multiply",
            }}
          />

          {/* Nav */}
          {currentIndex > 0 && (
            <button
              onClick={() => {
                onNavigate(items[currentIndex - 1].id);
                setZoom(1);
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 rounded-lg bg-black/60 hover:bg-[var(--orange)] text-white transition-all backdrop-blur-sm z-10"
              title="Previous (←)"
              aria-label="Previous"
              type="button"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}

          {currentIndex < items.length - 1 && (
            <button
              onClick={() => {
                onNavigate(items[currentIndex + 1].id);
                setZoom(1);
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 rounded-lg bg-black/60 hover:bg-[var(--orange)] text-white transition-all backdrop-blur-sm z-10"
              title="Next (→)"
              aria-label="Next"
              type="button"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-alt)]">
          <div className="flex items-center justify-between text-xs sm:text-sm flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-1 rounded-md text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30">
                {currentItem.category}
              </span>
              {currentItem.subcategory && (
                <span className="px-2 py-1 rounded-md text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  {currentItem.subcategory}
                </span>
              )}
              {currentItem.youtubeTitle && (
                <span className="text-[var(--text)] font-medium max-w-md truncate">{currentItem.youtubeTitle}</span>
              )}
            </div>
            <div className="text-[var(--text-muted)] hidden sm:block text-xs">
              ← → to navigate • F for fullscreen • +/- or Ctrl+Scroll to zoom
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Pagination ---------------- */
const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, "...");
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, "...");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push("...", totalPages);
    }
    return pages;
  };

  return (
    <div className="mt-12 flex flex-col items-center gap-4">
      <div className="text-sm text-[var(--text-muted)]">
        Showing {Math.min(startItem, totalItems)} - {endItem} of {totalItems} thumbnails
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm font-medium
            ${currentPage === 1
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-[var(--orange)] hover:text-white hover:border-[var(--orange)] hover:scale-105"
            }
            transition-all`}
          aria-label="Previous page"
        >
          Previous
        </button>

        {getPageNumbers().map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-[var(--text-muted)]">
              ...
            </span>
          ) : (
            <button
              type="button"
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[2.5rem] px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${page === currentPage
                  ? "bg-[var(--orange)] text-white border border-[var(--orange)]"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--orange)] hover:text-white hover:border-[var(--orange)] hover:scale-105"
                }`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm font-medium
            ${currentPage === totalPages
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-[var(--orange)] hover:text-white hover:border-[var(--orange)] hover:scale-105"
            }
            transition-all`}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
};

/* ---------------- Image prefetch (best effort) ---------------- */
function useImagePrefetch(urls) {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const links = [];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const preloads = (e.target.dataset?.preload || "").split(",").filter(Boolean);
          for (const src of preloads) {
            const link = document.createElement("link");
            link.rel = "prefetch";
            link.as = "image";
            link.href = src;
            document.head.appendChild(link);
            links.push(link);
          }
          observer.unobserve(e.target);
        }
      });
    });
    const sentinel = document.createElement("div");
    sentinel.style.cssText = "position: absolute; bottom: 0; width: 1px; height: 1px;";
    sentinel.dataset.preload = urls.join(",");
    document.body.appendChild(sentinel);
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      links.forEach((l) => l.remove());
      sentinel.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(urls)]);
}

/* ---------------- Main ---------------- */
export default function Thumbnails() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brokenIds, setBrokenIds] = useState(new Set());
  const [error, setError] = useState("");

  const [openId, setOpenId] = useState(null);
  const [shareItem, setShareItem] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [gridSize, setGridSize] = useState("medium");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Filters
  const CATEGORY_CHIPS = ["ALL", "GAMING", "VLOG", "MUSIC & BHAJANS", "OTHER"];
  const [cat, setCat] = useState("ALL");
  const TYPE_CHIPS = ["ALL", "LIVE", "VIDEO"];
  const [typ, setTyp] = useState("ALL");
  const [sub, setSub] = useState("ALL");

  const closeModal = useCallback(() => setOpenId(null), []);
  const navigateModal = useCallback((id) => setOpenId(id), []);
  const markBroken = useCallback((id) => setBrokenIds((prev) => new Set(prev).add(id)), []);

  /* -------- Service worker registration (offline warm start) -------- */
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-thumbnails.js").catch(() => { });
    }
    preconnectTo(AUTH_BASE);
  }, []);

  /* -------- React to token changes across tabs (revalidate) -------- */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "token") {
        revalidateThumbnailsRef.current?.();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const controllerRef = useRef(null);
  const revalidateThumbnailsRef = useRef(null);

  /* -------- ETag-aware fetch (thumbnails) with warm paint -------- */
  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    const warmPaintFromSession = () => {
      try {
        const cachedStr = sessionStorage.getItem(STORAGE_KEY);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached?.items?.length) {
            setItems(cached.items);
            setLoading(false);
          }
        }
      } catch { }
    };

    const normalize = (arr) =>
      (arr.length ? arr : FALLBACK).map((t, i) => ({
        id: t.id || t._id || `row-${i}`,
        filename: t.filename,
        category: t.category || "OTHER",
        subcategory: t.subcategory || "",
        variant: t.variant || "VIDEO",
        youtubeUrl: t.youtubeUrl,
        youtubeTitle: t.youtubeTitle,
        imageUrl: t.imageUrl || t.image, // normalize
        image: t.imageUrl || t.image,
        videoId: t.videoId,
        views: t.youtubeViews,
        viewStatus: t.viewStatus,
        lastViewUpdate: t.lastViewUpdate,
        dateAdded: t.dateAdded,
        lastUpdated: t.lastUpdated,
      }));

    const revalidateThumbnails = async () => {
      setError("");
      let etag = null;
      let cachedTs = 0;
      try {
        const cached = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
        etag = cached?.etag || null;
        cachedTs = cached?.ts || 0;
      } catch { }
      try {
        setLoading((prev) => (items.length ? false : true));

        const runtimeToken = localStorage.getItem("token") || "";
        const authToken = runtimeToken || PUBLIC_READ_TOKEN || "";

        const { status, etag: newEtag, data } = await fetchJSONWithETag(
          `${AUTH_BASE}/thumbnails`,
          { etag, signal: controller.signal, authToken, timeoutMs: 35000, retries: 2 }
        );

        if (status !== 304 && data) {
          const arr = Array.isArray(data?.thumbnails) ? data.thumbnails : [];
          const normalized = normalize(arr);
          if (!controller.signal.aborted) {
            setItems(normalized);
            try {
              sessionStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ etag: newEtag, items: normalized, ts: Date.now() })
              );
            } catch { }
          }
        } else if (status === 304) {
          // freshness guard: if older than 14 days, treat as stale and force repaint (server should rotate ETags weekly anyway)
          const tooOld = Date.now() - cachedTs > 14 * 24 * 60 * 60 * 1000;
          if (tooOld) {
            setItems((prev) => (prev.length ? prev : FALLBACK));
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error fetching thumbnails:", err);
          setError(err.message || "Failed to load thumbnails");
          setItems((prev) => (prev.length ? prev : FALLBACK));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    // expose for token-change revalidation
    revalidateThumbnailsRef.current = revalidateThumbnails;

    // warm paint + revalidate
    warmPaintFromSession();
    revalidateThumbnails();

    // deep link (?thumbnail= and restored state)
    const params = new URLSearchParams(window.location.search);
    const thumbId = params.get("thumbnail");
    if (thumbId) setOpenId(thumbId);

    // restore filters/search/grid/page from URL
    const fromUrl = (key, def, map) => {
      const v = params.get(key);
      if (v == null) return def;
      return map ? (map(v) ? v : def) : v;
    };
    setCat(fromUrl("cat", "ALL", (v) => ["ALL", "GAMING", "VLOG", "MUSIC & BHAJANS", "OTHER"].includes(v)));
    setTyp(fromUrl("typ", "ALL", (v) => ["ALL", "LIVE", "VIDEO"].includes(v)));
    setSub(fromUrl("sub", "ALL", () => true));
    setGridSize(fromUrl("grid", "medium", (v) => ["small", "medium", "large"].includes(v)));
    setSearchQuery(fromUrl("q", "", () => true));
    const pageFromUrl = parseInt(params.get("page") || "1", 10);
    setCurrentPage(Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1);

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------- Write current state into URL (deep link) -------- */
  useEffect(() => {
    const params = new URLSearchParams();

    if (cat !== "ALL") params.set("cat", cat);
    if (typ !== "ALL") params.set("typ", typ);
    if (sub !== "ALL") params.set("sub", sub);
    if (gridSize !== "medium") params.set("grid", gridSize);
    if (searchQuery) params.set("q", searchQuery);
    if (currentPage !== 1) params.set("page", String(currentPage));
    if (openId) params.set("thumbnail", openId);

    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [cat, typ, sub, gridSize, searchQuery, currentPage, openId]);

  // itemsPerPage by grid
  useEffect(() => {
    const update = () => setItemsPerPage(getItemsPerPage(gridSize));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [gridSize]);

  const visible = useMemo(() => items.filter((x) => !brokenIds.has(x.id)), [items, brokenIds]);

  const gamingSubcats = useMemo(() => {
    const s = new Set();
    visible
      .filter((x) => x.category === "GAMING" && x.subcategory)
      .forEach((x) => s.add(x.subcategory));
    const main = ["BGMI", "Valorant", "Once Human"];
    const rest = [...s].filter((x) => !main.includes(x)).sort();
    return main.filter((x) => s.has(x)).concat(rest);
  }, [visible]);

  const shuffled = useMemo(() => {
    const arr = [...visible];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [visible]);

  const filtered = useMemo(() => {
    let list = cat === "ALL" ? shuffled : visible;

    if (cat !== "ALL") list = list.filter((x) => x.category === cat);
    if (cat === "GAMING" && sub !== "ALL") list = list.filter((x) => (x.subcategory || "General") === sub);
    if (typ !== "ALL") list = list.filter((x) => x.variant === typ);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((x) => {
        return (
          x.category.toLowerCase().includes(q) ||
          x.subcategory?.toLowerCase().includes(q) ||
          x.variant.toLowerCase().includes(q) ||
          x.filename?.toLowerCase().includes(q) ||
          x.youtubeTitle?.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [shuffled, visible, cat, sub, typ, searchQuery]);

  const totalPages = Math.ceil(Math.max(filtered.length, 1) / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [cat, sub, typ, searchQuery, gridSize]);

  useEffect(() => {
    if (cat !== "GAMING") setSub("ALL");
  }, [cat]);

  /* -------- Prefetch images on next page (best effort) -------- */
  const nextPageImages = useMemo(() => {
    if (currentPage >= totalPages) return [];
    const start = currentPage * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage).map((t) => t.imageUrl || t.image).filter(Boolean);
  }, [filtered, currentPage, itemsPerPage, totalPages]);

  useImagePrefetch(nextPageImages);

  const gridClasses = {
    small: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3",
    medium: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6",
    large: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8",
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const handlePageChange = (page) => {
    const next = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPage(next);
    scrollToTop();
  };

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <MetaTags
        title="High-CTR Thumbnail Design | Shinel Studios - Scroll-Stopping Visuals"
        description="Premium YouTube thumbnails built for clicks and curiosity. Data-backed designs that increase your CTR and views."
        keywords="thumbnail design, high ctr thumbnails, youtube gfx, viral packaging"
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Work', url: '/work' },
          { name: 'Thumbnails', url: '/thumbnails' },
        ]}
      />
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          return false;
        }}
        onDragStart={(e) => {
          e.preventDefault();
          return false;
        }}
      >
        {/* Hero */}
        <section className="pt-28 pb-8 text-center bg-hero">
          <div className="container mx-auto px-3 sm:px-4 md:px-6">
            <h1
              className="text-4xl sm:text-6xl font-extrabold text-[var(--text)] animate-in fade-in duration-600"
            >
              Thumbnail <span className="text-[var(--orange)]">Gallery</span>
            </h1>
            <p
              className="mt-3 text-base sm:text-lg text-[var(--text-muted)] animate-in fade-in duration-600 delay-100"
            >
              Designed for clicks. Optimized for retention.
            </p>

            {/* Error banner */}
            {error && (
              <div className="mt-4 mx-auto max-w-xl text-left rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <div className="text-sm text-red-200/90 font-medium">{error}</div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold"
                    onClick={() => revalidateThumbnailsRef.current?.()}
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text)] text-xs"
                    onClick={() => {
                      try {
                        sessionStorage.removeItem(STORAGE_KEY);
                      } catch { }
                      revalidateThumbnailsRef.current?.();
                    }}
                  >
                    Clear cache & retry
                  </button>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mt-6 max-w-md mx-auto animate-in fade-in duration-600 delay-200">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search thumbnails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
                  aria-label="Search thumbnails"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Controls (grid + result count) */}
            <div
              className="mt-4 flex flex-wrap items-center justify-center gap-3 animate-in fade-in duration-600 delay-300"
            >
              {/* Grid size */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <span className="text-xs mr-1 text-[var(--text-muted)]">Grid:</span>
                {["small", "medium", "large"].map((size) => (
                  <button
                    type="button"
                    key={size}
                    onClick={() => setGridSize(size)}
                    className={`px-2 py-0.5 rounded text-xs capitalize transition-colors ${gridSize === size
                      ? "bg-[var(--orange)] text-white font-semibold"
                      : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                      }`}
                    aria-pressed={gridSize === size}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {/* Result count */}
              <span className="px-3 py-1 rounded-full text-xs bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--border)]">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Categories */}
            <div
              className="mt-4 flex flex-wrap justify-center gap-2 animate-in fade-in duration-600 delay-400"
            >
              {CATEGORY_CHIPS.map((c) => (
                <Chip key={c} active={c === cat} onClick={() => setCat(c)}>
                  {c}
                </Chip>
              ))}
            </div>

            {/* Subcategories for Gaming */}
            {cat === "GAMING" && gamingSubcats.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Chip active={sub === "ALL"} onClick={() => setSub("ALL")}>
                  ALL
                </Chip>
                {gamingSubcats.map((s) => (
                  <Chip key={s} active={sub === s} onClick={() => setSub(s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            )}

            {/* Type chips */}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {TYPE_CHIPS.map((t) => (
                <Chip key={t} active={t === typ} onClick={() => setTyp(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="py-12 bg-[var(--surface)]" aria-live="polite">
          <div className="container mx-auto px-3 sm:px-4 md:px-6">
            {loading ? (
              <div className={`grid ${gridClasses[gridSize]}`}>
                {Array.from({ length: itemsPerPage }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg mb-2 text-[var(--text)]">No thumbnails found</p>
                <p className="text-sm text-[var(--text-muted)]">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <>
                <div
                  className={`grid ${gridClasses[gridSize]}`}
                  style={{
                    contentVisibility: 'auto',
                    containIntrinsicSize: '0 1200px'
                  }}
                >
                  {paginatedItems.map((t, index) => (
                    <div
                      key={t.id}
                      className="animate-in fade-in duration-400"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <ThumbCard
                        t={t}
                        onOpen={setOpenId}
                        onBroken={markBroken}
                        fetchPriority={index < 6 ? "high" : "auto"}
                      />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    itemsPerPage={itemsPerPage}
                    totalItems={filtered.length}
                  />
                )}
              </>
            )}
          </div>
        </section>

        {/* Modal */}
        {openId && (
          <Modal
            items={filtered}
            currentId={openId}
            onClose={closeModal}
            onNavigate={navigateModal}
            onShare={(item) => setShareItem(item)}
          />
        )}

        {/* Share Modal */}
        {shareItem && <ShareModal item={shareItem} onClose={() => setShareItem(null)} />}
      </div>
    </div>
  );
}
const ThumbnailImage = ({ t, imageLoaded, setImageLoaded, className, onError }) => {
  // Known IDs that lack hqdefault
  const KNOWN_BAD_IDS = ["t-vPWTJUIO4", "R2jcaMDAvOU"];

  const getBestThumb = () => {
    let base = t.imageUrl || t.image;
    if (!base) return null;

    // Check if this URL contains a known bad ID
    const foundBadId = KNOWN_BAD_IDS.find(id => base.includes(id));
    if (foundBadId) {
      if (base.includes("hqdefault.jpg")) {
        return base.replace("hqdefault.jpg", "mqdefault.jpg");
      }
      if (base.includes("maxresdefault.jpg")) {
        return base.replace("maxresdefault.jpg", "mqdefault.jpg");
      }
    }
    return base;
  };

  const initialSrc = getBestThumb();
  const [src, setSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(getBestThumb());
    setFailed(false);
  }, [t.imageUrl, t.image]);

  const handleError = () => {
    // If it's a YouTube URL, try downgrading quality
    if (src && src.includes("img.youtube.com")) {
      if (src.includes("maxresdefault.jpg")) {
        setSrc(src.replace("maxresdefault.jpg", "hqdefault.jpg"));
        return;
      }
      if (src.includes("hqdefault.jpg")) {
        setSrc(src.replace("hqdefault.jpg", "mqdefault.jpg"));
        return;
      }
      if (src.includes("mqdefault.jpg")) {
        setSrc(src.replace("mqdefault.jpg", "sddefault.jpg"));
        return;
      }
    }

    // If not YouTube or all fallbacks failed
    setFailed(true);
    onError?.();
  };

  if (!src || failed) {
    return (
      <div className={`bg-[var(--surface-alt)] ${className} flex items-center justify-center text-[var(--text-muted)]`}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="opacity-20">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
        </svg>
      </div>
    );
  }

  return (
    <ProtectedImg
      src={src}
      alt={`${t.category} ${t.subcategory || ""}`}
      className={className}
      onLoad={() => setImageLoaded(true)}
      onError={handleError}
    />
  );
};
