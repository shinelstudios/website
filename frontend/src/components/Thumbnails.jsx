import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE || "https://shinel-auth.shinelstudioofficial.workers.dev";

// Client cache key for warm render
const STORAGE_KEY = "thumbnailsCacheV1";

/* ---------- Fallback ---------- */
const FALLBACK = [
  {
    id: "fallback",
    category: "GAMING",
    subcategory: "Valorant",
    variant: "LIVE",
    image: "https://placehold.co/1200x800?text=Thumbnail",
  },
];

/* ---------- Helpers ---------- */
function formatViews(count) {
  if (!count || count === 0) return null;
  
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return count.toLocaleString();
}

/* ---------- Check for reduced motion ---------- */
const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

/* ---------- Get items per page based on screen size ---------- */
function getItemsPerPage(gridSize) {
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

/* ---------- Skeleton Loader ---------- */
const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] animate-pulse">
    <div className="w-full aspect-[16/9] bg-gray-700/30"></div>
    <div className="p-3 sm:p-4 space-y-2.5">
      <div className="flex gap-2">
        <div className="h-5 bg-gray-700/30 rounded w-20"></div>
        <div className="h-5 bg-gray-700/30 rounded w-14"></div>
      </div>
      <div className="h-8 bg-gray-700/30 rounded w-3/4"></div>
      <div className="flex items-center gap-3">
        <div className="h-4 bg-gray-700/30 rounded w-16"></div>
        <div className="h-4 bg-gray-700/30 rounded flex-1"></div>
      </div>
      <div className="h-9 bg-gray-700/30 rounded w-full"></div>
    </div>
  </div>
);

/* ---------- Protected Image Component ---------- */
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
      fetchpriority={fetchpriority}
    />
  );
}

/* ---------- Chip Component ---------- */
const Chip = ({ children, active, onClick }) => {
  const reducedMotion = prefersReducedMotion();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        text-xs sm:text-sm px-4 py-2 rounded-full border font-medium whitespace-nowrap select-none
        transition-all duration-200
        ${active 
          ? "bg-[var(--orange)] text-white border-[var(--orange)]" 
          : "bg-transparent text-[var(--orange)] border-[var(--orange)] hover:bg-[var(--orange)]/10"
        }
        ${reducedMotion ? "!transition-none" : "hover:scale-105"}
      `}
    >
      {children}
    </button>
  );
};

/* ---------- Thumbnail Card ---------- */
const ThumbCard = ({ t, onOpen, onBroken, gridSize, fetchPriority = "auto" }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const formattedViews = formatViews(t.views);
  const isDeleted = t.viewStatus === 'deleted';
  
  return (
    <article 
      className="group relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-[var(--orange)]"
      onClick={() => onOpen(t.id)}
    >
      {/* Media area - CLEAN, NO OVERLAYS */}
      <div className="relative w-full aspect-[16/9] bg-gray-900 overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-700/30 animate-pulse"></div>
        )}
        <ProtectedImg
          src={t.imageUrl || t.image}
          alt={`${t.category} ${t.subcategory || ""}`}
          onError={() => onBroken?.(t.id)}
          onLoad={() => setImageLoaded(true)}
          fetchpriority={fetchPriority}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {/* All info BELOW the thumbnail */}
      <div className="p-3 sm:p-4 space-y-2.5">
        {/* Badges row - Category, Variant, YouTube */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
            {t.category}
            {t.subcategory && <span className="opacity-70">• {t.subcategory}</span>}
          </span>
          
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold border ${
            t.variant === "LIVE" 
              ? "bg-red-600/20 text-red-400 border-red-500/30 animate-pulse" 
              : "bg-gray-700/30 text-gray-300 border-gray-600/30"
          }`}>
            {t.variant}
          </span>

          {t.youtubeUrl && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-red-600/20 text-red-400 border border-red-500/30">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              YouTube
            </span>
          )}
        </div>

        {/* Video title */}
        {t.youtubeTitle ? (
          <h3 className="text-[var(--text)] text-xs sm:text-sm font-semibold line-clamp-2 min-h-[2.5rem] leading-tight">
            {t.youtubeTitle}
          </h3>
        ) : (
          <div className="min-h-[2.5rem]"></div>
        )}
        
        {/* Stats row */}
        <div className="flex items-center justify-between gap-3 text-[10px] sm:text-xs text-[var(--text-muted)]">
          {formattedViews && (
            <div className={`flex items-center gap-1.5 ${isDeleted ? 'opacity-60' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span className="font-medium">{formattedViews}</span>
              {isDeleted && <span title="Video deleted">⚠</span>}
            </div>
          )}
          
          {t.dateAdded && (
            <div className="flex items-center gap-1.5 ml-auto">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span className="font-medium">{new Date(t.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* View button */}
        <button className="w-full text-xs sm:text-sm font-semibold py-2 sm:py-2.5 rounded-lg bg-[var(--orange)] text-white hover:opacity-90 transition-all duration-300 group-hover:scale-105">
          View Full Size
        </button>
      </div>
    </article>
  );
};

/* ---------- Share Modal ---------- */
const ShareModal = ({ item, onClose }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}${window.location.pathname}?thumbnail=${item.id}`;
  const shareText = item.youtubeTitle || `Check out this ${item.category} thumbnail`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-xl p-6 max-w-md w-full border border-[var(--border)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--text)]">
            Share Thumbnail
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Preview - Protected */}
          <div 
            className="relative aspect-video rounded-lg overflow-hidden border border-[var(--border)] select-none"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            <img 
              src={item.imageUrl || item.image} 
              alt={item.youtubeTitle || 'Thumbnail'}
              className="w-full h-full object-cover pointer-events-none"
              draggable="false"
            />
          </div>

          {/* Copy Link */}
          <div>
            <label className="text-xs mb-2 block text-[var(--text-muted)] font-medium">
              Copy Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-sm"
              />
              <button
                onClick={copyLink}
                className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                  copied ? "bg-green-600" : "bg-[var(--orange)] hover:opacity-90"
                }`}
              >
                {copied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div>
            <label className="text-xs mb-2 block text-[var(--text-muted)] font-medium">
              Share on Social Media
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, "_blank")}
                className="px-3 py-2 rounded-lg text-white text-sm font-medium bg-[#1DA1F2] hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
                </svg>
                Twitter
              </button>
              <button
                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank")}
                className="px-3 py-2 rounded-lg text-white text-sm font-medium bg-[#4267B2] hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
                </svg>
                Facebook
              </button>
              <button
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, "_blank")}
                className="px-3 py-2 rounded-lg text-white text-sm font-medium bg-[#25D366] hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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

/* ---------- Enhanced Modal ---------- */
const Modal = ({ items, currentId, onClose, onNavigate, onShare }) => {
  const currentIndex = items.findIndex((x) => x.id === currentId);
  const currentItem = items[currentIndex];
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef(null);
  const imageContainerRef = useRef(null);

  // Disable context menu and screenshots
  useEffect(() => {
    const preventActions = (e) => {
      e.preventDefault();
      return false;
    };

    // Add class to body to prevent screenshots
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    
    document.addEventListener("contextmenu", preventActions);
    document.addEventListener("dragstart", preventActions);
    document.addEventListener("copy", preventActions);
    document.addEventListener("cut", preventActions);

    // Prevent screenshot keys
    const preventScreenshot = (e) => {
      if (e.key === 'PrintScreen' || 
          (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) ||
          (e.metaKey && e.shiftKey && e.key === 's')) {
        e.preventDefault();
        return false;
      }
    };
    
    document.addEventListener("keyup", preventScreenshot);
    document.addEventListener("keydown", preventScreenshot);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.removeEventListener("contextmenu", preventActions);
      document.removeEventListener("dragstart", preventActions);
      document.removeEventListener("copy", preventActions);
      document.removeEventListener("cut", preventActions);
      document.removeEventListener("keyup", preventScreenshot);
      document.removeEventListener("keydown", preventScreenshot);
    };
  }, []);

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
      if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(z + 0.25, 3));
      }
      if (e.key === "-" || e.key === "_") {
        setZoom((z) => Math.max(z - 0.25, 0.5));
      }
      if (e.key === "0") {
        setZoom(1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, items, onClose, onNavigate]);

  // Mouse wheel zoom
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
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
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
    >
      <div className="relative w-full max-w-6xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-alt)]">
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-medium text-[var(--text)]">
              {currentIndex + 1} / {items.length}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              Zoom: {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                className="p-1.5 rounded hover:bg-[var(--surface-alt)] text-[var(--text)] transition-colors"
                title="Zoom out (- or Ctrl+Scroll)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35M8 11h6" />
                </svg>
              </button>
              <button
                onClick={() => setZoom(1)}
                className="px-2 py-1 text-xs rounded hover:bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                title="Reset (0)"
              >
                100%
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                className="p-1.5 rounded hover:bg-[var(--surface-alt)] text-[var(--text)] transition-colors"
                title="Zoom in (+ or Ctrl+Scroll)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
                </svg>
              </button>
            </div>

            {/* Share button */}
            <button
              onClick={() => onShare(currentItem)}
              className="p-2 rounded-lg hover:bg-[var(--orange)] transition-colors text-[var(--text)] hover:text-white"
              title="Share"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
              </svg>
            </button>

            {/* Fullscreen button */}
            <button
              onClick={toggleFullscreen}
              className="hidden sm:block p-2 rounded-lg hover:bg-[var(--orange)] transition-colors text-[var(--text)] hover:text-white"
              title="Fullscreen (F)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isFullscreen ? (
                  <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
                ) : (
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                )}
              </svg>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-red-600 transition-colors text-[var(--text)] hover:text-white"
              title="Close (Esc)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          <div
            className="relative max-w-full max-h-full transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          >
            <ProtectedImg
              src={currentItem.imageUrl || currentItem.image}
              alt={`${currentItem.category} ${currentItem.subcategory || ""}`}
              className="max-w-full max-h-full object-contain pointer-events-none"
            />
          </div>

          {/* Protection overlay */}
          <div className="absolute inset-0 pointer-events-none select-none" 
               style={{ 
                 background: 'repeating-linear-gradient(transparent, transparent 50px, rgba(0,0,0,0.001) 50px, rgba(0,0,0,0.001) 51px)',
                 mixBlendMode: 'multiply'
               }} 
          />

          {/* Navigation buttons */}
          {currentIndex > 0 && (
            <button
              onClick={() => { onNavigate(items[currentIndex - 1].id); setZoom(1); }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 rounded-lg bg-black/60 hover:bg-[var(--orange)] text-white transition-all backdrop-blur-sm z-10"
              title="Previous (←)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}

          {currentIndex < items.length - 1 && (
            <button
              onClick={() => { onNavigate(items[currentIndex + 1].id); setZoom(1); }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 rounded-lg bg-black/60 hover:bg-[var(--orange)] text-white transition-all backdrop-blur-sm z-10"
              title="Next (→)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Info footer */}
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

/* ---------- Pagination Component ---------- */
const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) => {
  const reducedMotion = prefersReducedMotion();
  
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="mt-12 flex flex-col items-center gap-4">
      <div className="text-sm text-[var(--text-muted)]">
        Showing {startItem} - {endItem} of {totalItems} thumbnails
      </div>
      
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm font-medium
            ${currentPage === 1 
              ? 'opacity-40 cursor-not-allowed' 
              : `hover:bg-[var(--orange)] hover:text-white hover:border-[var(--orange)] ${reducedMotion ? '' : 'hover:scale-105'}`}
            transition-all`}
        >
          Previous
        </button>
        
        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-[var(--text-muted)]">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[2.5rem] px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${page === currentPage
                  ? 'bg-[var(--orange)] text-white border border-[var(--orange)]'
                  : `border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--orange)] hover:text-white hover:border-[var(--orange)] ${reducedMotion ? '' : 'hover:scale-105'}`}`}
            >
              {page}
            </button>
          )
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm font-medium
            ${currentPage === totalPages 
              ? 'opacity-40 cursor-not-allowed' 
              : `hover:bg-[var(--orange)] hover:text-white hover:border-[var(--orange)] ${reducedMotion ? '' : 'hover:scale-105'}`}
            transition-all`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

/* ---------- Main Component ---------- */
export default function Thumbnails() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brokenIds, setBrokenIds] = useState(new Set());

  const [openId, setOpenId] = useState(null);
  const [shareItem, setShareItem] = useState(null);
  const closeModal = useCallback(() => setOpenId(null), []);
  const navigateModal = useCallback((id) => setOpenId(id), []);

  const [searchQuery, setSearchQuery] = useState("");
  const [gridSize, setGridSize] = useState("medium");
  const [sortBy, setSortBy] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Fetch thumbnails from worker with warm render + background revalidation
  useEffect(() => {
    const controller = new AbortController();

    async function fetchThumbnails() {
      // 1) Warm paint from sessionStorage if available
      try {
        const cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length) {
            setItems(parsed);
            setLoading(false);
          }
        }
      } catch {}

      // 2) Fetch fresh in background
      try {
        if (controller.signal.aborted) return;
        // Only show skeletons if nothing warm-painted
        setLoading((prev) => (items.length ? false : true));

        const response = await fetch(`${AUTH_BASE}/thumbnails`, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        const arr = Array.isArray(data?.thumbnails) ? data.thumbnails : [];
        const thumbnails = (arr.length ? arr : FALLBACK).map(t => ({
          id: t.id,
          filename: t.filename,
          category: t.category || 'OTHER',
          subcategory: t.subcategory || '',
          variant: t.variant || 'VIDEO',
          youtubeUrl: t.youtubeUrl,
          youtubeTitle: t.youtubeTitle,
          imageUrl: t.imageUrl,
          image: t.imageUrl,
          videoId: t.videoId,
          views: t.youtubeViews,
          viewStatus: t.viewStatus,
          lastViewUpdate: t.lastViewUpdate,
          dateAdded: t.dateAdded,
          lastUpdated: t.lastUpdated,
        }));

        if (!controller.signal.aborted) {
          setItems(thumbnails);
          try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(thumbnails)); } catch {}
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error('Error fetching thumbnails:', error);
          if (!controller.signal.aborted) setItems(prev => prev.length ? prev : FALLBACK);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    
    fetchThumbnails();
    
    const params = new URLSearchParams(window.location.search);
    const thumbId = params.get("thumbnail");
    if (thumbId) {
      setOpenId(thumbId);
    }

    return () => controller.abort();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(getItemsPerPage(gridSize));
    };

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, [gridSize]);

  const markBroken = useCallback((id) => {
    setBrokenIds((prev) => new Set(prev).add(id));
  }, []);

  const visible = useMemo(
    () => items.filter((x) => !brokenIds.has(x.id)),
    [items, brokenIds]
  );

  const CATEGORY_CHIPS = ["ALL", "GAMING", "VLOG", "MUSIC & BHAJANS", "OTHER"];
  const [cat, setCat] = useState("ALL");

  const TYPE_CHIPS = ["ALL", "LIVE", "VIDEO"];
  const [typ, setTyp] = useState("ALL");

  const gamingSubcats = useMemo(() => {
    const s = new Set();
    visible
      .filter((x) => x.category === "GAMING" && x.subcategory)
      .forEach((x) => s.add(x.subcategory));
    const main = ["BGMI", "Valorant", "Once Human"];
    const rest = [...s].filter((x) => !main.includes(x)).sort();
    return main.filter((x) => s.has(x)).concat(rest);
  }, [visible]);
  const [sub, setSub] = useState("ALL");

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

    if (cat !== "ALL") {
      list = list.filter((x) => x.category === cat);
    }

    if (cat === "GAMING" && sub !== "ALL") {
      list = list.filter((x) => (x.subcategory || "General") === sub);
    }

    if (typ !== "ALL") {
      list = list.filter((x) => x.variant === typ);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter((x) => {
        return (
          x.category.toLowerCase().includes(query) ||
          x.subcategory?.toLowerCase().includes(query) ||
          x.variant.toLowerCase().includes(query) ||
          x.filename.toLowerCase().includes(query) ||
          x.youtubeTitle?.toLowerCase().includes(query)
        );
      });
    }

    if (sortBy === "newest") {
      list = [...list].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    } else if (sortBy === "oldest") {
      list = [...list].sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
    } else if (sortBy === "category") {
      list = [...list].sort((a, b) => {
        const catCompare = a.category.localeCompare(b.category);
        if (catCompare !== 0) return catCompare;
        return (a.subcategory || "").localeCompare(b.subcategory || "");
      });
    } else if (sortBy === "popular") {
      list = [...list].sort((a, b) => {
        if (a.views === null && b.views === null) return 0;
        if (a.views === null) return 1;
        if (b.views === null) return -1;
        return b.views - a.views;
      });
    }

    return list;
  }, [shuffled, visible, cat, sub, typ, searchQuery, sortBy]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [cat, sub, typ, searchQuery, sortBy, gridSize]);

  useEffect(() => {
    if (cat !== "GAMING") setSub("ALL");
  }, [cat]);

  const gridClasses = {
    small: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3",
    medium: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6",
    large: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8",
  };

  const reducedMotion = prefersReducedMotion();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    scrollToTop();
  };

  return (
    <div className="min-h-screen bg-[var(--surface)]">
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
        <section className="pt-28 pb-12 text-center bg-hero">
          <div className="container mx-auto px-3 sm:px-4 md:px-6">
            <h1 className={`text-4xl sm:text-6xl font-extrabold text-[var(--text)] ${reducedMotion ? "" : "animate-in fade-in duration-600"}`}>
              Thumbnail <span className="text-[var(--orange)]">Gallery</span>
            </h1>
            <p className={`mt-3 text-base sm:text-lg text-[var(--text-muted)] ${reducedMotion ? "" : "animate-in fade-in duration-600 delay-100"}`}>
              Designed for clicks. Optimized for retention.
            </p>

            {/* Search bar */}
            <div className={`mt-6 max-w-md mx-auto ${reducedMotion ? "" : "animate-in fade-in duration-600 delay-200"}`}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search thumbnails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Controls row */}
            <div className={`mt-4 flex flex-wrap items-center justify-center gap-3 ${reducedMotion ? "" : "animate-in fade-in duration-600 delay-300"}`}>
              {/* Grid size */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                <span className="text-xs mr-1 text-[var(--text-muted)]">
                  Grid:
                </span>
                {["small", "medium", "large"].map((size) => (
                  <button
                    key={size}
                    onClick={() => setGridSize(size)}
                    className={`px-2 py-0.5 rounded text-xs capitalize transition-colors ${
                      gridSize === size
                        ? "bg-[var(--orange)] text-white font-semibold"
                        : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs sm:text-sm outline-none cursor-pointer"
              >
                <option value="default">Sort: Default</option>
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="popular">Sort: Most Popular</option>
                <option value="category">Sort: Category</option>
              </select>

              {/* Results count */}
              <span className="px-3 py-1 rounded-full text-xs bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--border)]">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Category chips */}
            <div className={`mt-4 flex flex-wrap justify-center gap-2 ${reducedMotion ? "" : "animate-in fade-in duration-600 delay-400"}`}>
              {CATEGORY_CHIPS.map((c) => (
                <Chip key={c} active={c === cat} onClick={() => setCat(c)}>
                  {c}
                </Chip>
              ))}
            </div>

            {/* Gaming subcategories */}
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
        <section className="py-12 bg-[var(--surface)]">
          <div className="container mx-auto px-3 sm:px-4 md:px-6">
            {loading ? (
              <div className={`grid ${gridClasses[gridSize]}`}>
                {Array.from({ length: itemsPerPage }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg mb-2 text-[var(--text)]">
                  No thumbnails found
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  Try adjusting your filters or search query
                </p>
              </div>
            ) : (
              <>
                <div className={`grid ${gridClasses[gridSize]}`}>
                  {paginatedItems.map((t, index) => (
                    <div
                      key={t.id}
                      className={reducedMotion ? "" : "animate-in fade-in duration-400"}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <ThumbCard
                        t={t}
                        onOpen={setOpenId}
                        onBroken={markBroken}
                        gridSize={gridSize}
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
