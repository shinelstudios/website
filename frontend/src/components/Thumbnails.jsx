import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { CloudflareViewStorage } from "./cloudflare-storage";

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

const PUBLIC_BASE = (import.meta?.env?.BASE_URL ?? "/").replace(/\/+$/, "/");
const url = (file) => encodeURI(`${PUBLIC_BASE}thumbnails/${file}`);

// YouTube API Key - Replace this with your actual API key from Google Cloud Console
// Get it from: https://console.cloud.google.com/apis/credentials
const YOUTUBE_API_KEY = "AIzaSyD6p-nyJ7N9ZFfvFCQQJDC4V9hcAIRGvXw";

// Cache configuration
const CACHE_KEY = "youtube_views_cache";
const PERMANENT_STORAGE_KEY = "youtube_views_permanent"; // Permanent storage
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const DAILY_UPDATE_HOUR = 3; // Update at 3 AM daily (adjust as needed)

/* ---------- Permanent Storage Manager ---------- */
class PermanentViewStorage {
  constructor() {
    this.storage = this.loadStorage();
  }

  loadStorage() {
    try {
      const stored = localStorage.getItem(PERMANENT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Error loading permanent storage:", error);
      return {};
    }
  }

  saveStorage() {
    try {
      localStorage.setItem(PERMANENT_STORAGE_KEY, JSON.stringify(this.storage));
    } catch (error) {
      console.error("Error saving permanent storage:", error);
    }
  }

  // Get permanent view count (never expires)
  get(videoId) {
    return this.storage[videoId] || null;
  }

  // Store view count permanently
  set(videoId, views) {
    // Only update if new view count is higher (to handle deleted videos)
    const existing = this.storage[videoId];
    if (!existing || views > existing.views) {
      this.storage[videoId] = {
        views: views,
        lastUpdated: Date.now(),
        status: "active"
      };
      this.saveStorage();
    }
  }

  // Mark video as deleted but keep the last known views
  markDeleted(videoId) {
    if (this.storage[videoId]) {
      this.storage[videoId].status = "deleted";
      this.storage[videoId].deletedAt = Date.now();
      this.saveStorage();
    }
  }

  // Get all stored data
  getAll() {
    return this.storage;
  }

  // Export data as JSON (for backup)
  export() {
    return JSON.stringify(this.storage, null, 2);
  }

  // Import data from JSON
  import(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      this.storage = { ...this.storage, ...imported };
      this.saveStorage();
      return true;
    } catch (error) {
      console.error("Error importing data:", error);
      return false;
    }
  }

  // Clear all permanent storage
  clear() {
    this.storage = {};
    localStorage.removeItem(PERMANENT_STORAGE_KEY);
  }

  // Get statistics
  getStats() {
    const videos = Object.keys(this.storage);
    const active = videos.filter(id => this.storage[id].status === "active").length;
    const deleted = videos.filter(id => this.storage[id].status === "deleted").length;
    
    return {
      total: videos.length,
      active,
      deleted,
      totalViews: videos.reduce((sum, id) => sum + (this.storage[id].views || 0), 0)
    };
  }
}

/* ---------- Cache Management ---------- */
class ViewsCache {
  constructor() {
    this.cache = this.loadCache();
  }

  loadCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error("Error loading cache:", error);
      return {};
    }
  }

  saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.error("Error saving cache:", error);
    }
  }

  get(videoId) {
    const entry = this.cache[videoId];
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if cache is still valid
    if (age < CACHE_DURATION) {
      return entry.views;
    }

    // Check if we should wait for the daily update time
    if (this.shouldWaitForDailyUpdate(entry.timestamp)) {
      return entry.views; // Return cached value, will update at scheduled time
    }

    return null; // Cache expired, needs refresh
  }

  shouldWaitForDailyUpdate(lastUpdate) {
    const now = new Date();
    const lastUpdateDate = new Date(lastUpdate);
    
    // If last update was today, don't update again
    if (
      now.getFullYear() === lastUpdateDate.getFullYear() &&
      now.getMonth() === lastUpdateDate.getMonth() &&
      now.getDate() === lastUpdateDate.getDate()
    ) {
      return true;
    }

    // Check if we've passed the scheduled update hour today
    const todayUpdateTime = new Date();
    todayUpdateTime.setHours(DAILY_UPDATE_HOUR, 0, 0, 0);

    // If current time is before today's update time, wait for it
    if (now < todayUpdateTime) {
      return true;
    }

    return false;
  }

  set(videoId, views) {
    this.cache[videoId] = {
      views: views,
      timestamp: Date.now(),
    };
    this.saveCache();
  }

  needsUpdate(videoId) {
    return this.get(videoId) === null;
  }

  getAll() {
    return this.cache;
  }

  clear() {
    this.cache = {};
    localStorage.removeItem(CACHE_KEY);
  }

  // Get statistics about cache
  getStats() {
    const entries = Object.keys(this.cache);
    const now = Date.now();
    let fresh = 0;
    let stale = 0;

    entries.forEach(videoId => {
      const entry = this.cache[videoId];
      const age = now - entry.timestamp;
      if (age < CACHE_DURATION) {
        fresh++;
      } else {
        stale++;
      }
    });

    return {
      total: entries.length,
      fresh,
      stale,
    };
  }
}

/* ---------- Helpers ---------- */
const titleFromFile = (name = "") => name.replace(/\.(png|jpe?g|webp)$/i, "");
const variantFromFile = (name = "") =>
  /[-_]live\.(jpg|jpeg|png|webp)$/i.test(name) ? "LIVE" : "VIDEO";

function deriveCat(title = "") {
  const lower = title.toLowerCase();
  if (lower.includes("vlog")) return { category: "VLOG" };
  if (lower.includes("bhajan") || lower.includes("music"))
    return { category: "MUSIC & BHAJANS" };

  const gamingKeys = [
    "bgmi",
    "valorant",
    "once human",
    "pubg",
    "codm",
    "free fire",
    "minecraft",
    "roblox",
    "fortnite",
  ];
  for (const key of gamingKeys) {
    if (lower.includes(key)) {
      return {
        category: "GAMING",
        subcategory:
          key === "once human"
            ? "Once Human"
            : key.replace(/\b\w/g, (m) => m.toUpperCase()).replace("Codm", "CODM"),
      };
    }
  }
  return { category: "OTHER" };
}

/* ---------- YouTube Functions ---------- */
// Extract video ID from YouTube URL
function extractVideoId(url) {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return null;
}

// Format view count with K, M suffixes
function formatViews(count) {
  if (!count || count === 0) return null;
  
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return count.toString();
}

// Fetch views from YouTube API with rate limiting
async function fetchYouTubeViews(videoId) {
  if (!videoId || YOUTUBE_API_KEY === "YOUR_API_KEY_HERE") {
    return { views: null, error: "No API key" };
  }
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!response.ok) {
      if (response.status === 403) {
        console.warn("YouTube API quota exceeded or invalid API key");
        return { views: null, error: "quota_exceeded" };
      }
      if (response.status === 404) {
        return { views: null, error: "video_not_found" };
      }
      throw new Error("Failed to fetch");
    }
    
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const viewCount = parseInt(data.items[0].statistics.viewCount, 10);
      return { views: viewCount, error: null };
    }
    
    // Video exists but no views data (might be deleted or private)
    return { views: null, error: "video_deleted" };
  } catch (error) {
    console.error("Error fetching YouTube views:", error);
    return { views: null, error: error.message };
  }
}

// Batch fetch multiple video views with delay between requests
async function batchFetchViews(videoIds, cache, permanentStorage, onProgress) {
  const results = {};
  const DELAY_BETWEEN_REQUESTS = 100; // 100ms delay to respect rate limits
  
  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i];
    
    // Check cache first
    const cachedViews = cache.get(videoId);
    if (cachedViews !== null) {
      results[videoId] = { views: cachedViews, fromCache: true };
      if (onProgress) onProgress(i + 1, videoIds.length, true);
      continue;
    }

    // Fetch from API
    const result = await fetchYouTubeViews(videoId);
    
    if (result.views !== null) {
      // Update both cache and permanent storage
      cache.set(videoId, result.views);
      permanentStorage.set(videoId, result.views);
      results[videoId] = { views: result.views, fromCache: false };
    } else if (result.error === "video_deleted" || result.error === "video_not_found") {
      // Video deleted - mark in permanent storage
      permanentStorage.markDeleted(videoId);
      // Use last known view count from permanent storage
      const lastKnown = permanentStorage.get(videoId);
      results[videoId] = { 
        views: lastKnown ? lastKnown.views : null, 
        fromCache: false,
        deleted: true
      };
    } else {
      // Other error - use permanent storage if available
      const lastKnown = permanentStorage.get(videoId);
      results[videoId] = { 
        views: lastKnown ? lastKnown.views : null, 
        fromCache: false 
      };
    }
    
    if (onProgress) onProgress(i + 1, videoIds.length, false);
    
    // Add delay between requests to avoid rate limiting
    if (i < videoIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }
  }
  
  return results;
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

/* ---------- Protected Image Component ---------- */
function ProtectedImg({ src, alt, onError, className = "" }) {
  const handleContextMenu = (e) => {
    e.preventDefault();
    return false;
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    return false;
  };

  return (
    <img
      src={src}
      alt={alt}
      className={`select-none pointer-events-none ${className}`}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      onError={onError}
      loading="lazy"
      decoding="async"
    />
  );
}

/* ---------- Enhanced Lazy Image ---------- */
function LazyImg({ src, alt, onError }) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if ("loading" in HTMLImageElement.prototype) {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "240px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 bg-black/10">
      {visible && (
        <ProtectedImg
          src={src}
          alt={alt}
          onError={onError}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-400 ${
            loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
          } ${reducedMotion ? "!transition-none" : ""}`}
        />
      )}
      {visible && (
        <img
          src={src}
          alt=""
          onLoad={() => setLoaded(true)}
          className="hidden"
        />
      )}
    </div>
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
        text-xs sm:text-sm px-4 py-2 rounded-full border font-medium whitespace-nowrap select-none touch-target
        transition-all duration-200
        ${active 
          ? "bg-[var(--orange)] text-white border-[var(--orange)]" 
          : "bg-transparent text-[var(--orange)] border-[var(--orange)] hover:bg-[var(--orange)]/10"
        }
        ${reducedMotion ? "!transition-none" : "hover:scale-105"}
        ring-focus
      `}
    >
      {children}
    </button>
  );
};

/* ---------- Thumbnail Card ---------- */
const ThumbCard = ({ t, onOpen, onBroken, gridSize, views, isDeleted }) => {
  const reducedMotion = prefersReducedMotion();
  const formattedViews = formatViews(views);

  return (
    <article
      className={`
        group relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface)]
        cursor-pointer touch-target
        transition-all duration-200
        ${reducedMotion ? "!transition-none" : "hover:-translate-y-1 hover:shadow-xl hover:border-[var(--orange)]/50"}
      `}
      onClick={() => onOpen(t.id)}
    >
      {/* Media area */}
      <div className="relative w-full aspect-[16/10] bg-black/5">
        <LazyImg
          src={t.image}
          alt={`${t.category} ${t.subcategory || ""}`}
          onError={() => onBroken?.(t.id)}
        />

        {/* Protection overlay */}
        <div
          className="absolute inset-0 z-[1]"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        />

        {/* Category badge */}
        <div className="absolute left-3 top-3 z-10 px-2 py-1 rounded-md text-[11px] font-semibold backdrop-blur-sm bg-black/70 text-white border border-white/15">
          {t.category}
          {t.subcategory && t.category === "GAMING" && ` • ${t.subcategory}`}
        </div>

        {/* Variant badge */}
        <div className={`absolute right-3 top-3 z-10 px-2 py-[2px] rounded-md text-[10px] font-bold tracking-wide backdrop-blur-sm text-white border border-white/15 ${
          t.variant === "LIVE" ? "bg-red-600/90" : "bg-black/70"
        }`}>
          {t.variant}
        </div>

        {/* Views badge - only show if we have views */}
        {formattedViews && (
          <div className={`absolute right-3 bottom-3 z-10 px-2 py-1 rounded-md text-[10px] backdrop-blur-sm text-white border border-white/15 flex items-center gap-1 ${
            isDeleted ? "bg-gray-600/90" : "bg-black/70"
          }`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {formattedViews}
            {isDeleted && <span className="ml-1 opacity-70">*</span>}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4">
        <button className="btn-brand w-full text-xs sm:text-sm">
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
        <h3 className="text-lg font-bold mb-4 text-[var(--text)]">
          Share Thumbnail
        </h3>

        <div className="space-y-3">
          {/* Copy Link */}
          <div>
            <label className="text-xs mb-1 block text-[var(--text-muted)]">
              Copy Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-sm ring-focus"
              />
              <button
                onClick={copyLink}
                className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                  copied ? "bg-green-600" : "bg-[var(--orange)] hover:opacity-90"
                }`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div>
            <label className="text-xs mb-2 block text-[var(--text-muted)]">
              Share on Social Media
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`, "_blank")}
                className="flex-1 px-3 py-2 rounded-lg text-white text-sm font-medium bg-[#1DA1F2] hover:opacity-90 transition-opacity"
              >
                Twitter
              </button>
              <button
                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank")}
                className="flex-1 px-3 py-2 rounded-lg text-white text-sm font-medium bg-[#4267B2] hover:opacity-90 transition-opacity"
              >
                Facebook
              </button>
              <button
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareUrl)}`, "_blank")}
                className="flex-1 px-3 py-2 rounded-lg text-white text-sm font-medium bg-[#25D366] hover:opacity-90 transition-opacity"
              >
                WhatsApp
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="btn-ghost mt-4 w-full"
        >
          Close
        </button>
      </div>
    </div>
  );
};

/* ---------- Enhanced Modal ---------- */
const Modal = ({ items, currentId, onClose, onNavigate, onShare }) => {
  const currentIndex = items.findIndex((x) => x.id === currentId);
  const currentItem = items[currentIndex];
  const reducedMotion = prefersReducedMotion();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const modalRef = useRef(null);

  useEffect(() => {
    const preventActions = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("contextmenu", preventActions);
    document.addEventListener("dragstart", preventActions);

    return () => {
      document.removeEventListener("contextmenu", preventActions);
      document.removeEventListener("dragstart", preventActions);
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

  const touchStart = useRef({ x: 0, y: 0 });
  const handleTouchStart = (e) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);

    if (deltaY < 50 && Math.abs(deltaX) > 50) {
      if (deltaX > 0 && currentIndex > 0) {
        onNavigate(items[currentIndex - 1].id);
        setZoom(1);
      } else if (deltaX < 0 && currentIndex < items.length - 1) {
        onNavigate(items[currentIndex + 1].id);
        setZoom(1);
      }
    }
  };

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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/95 backdrop-blur-lg"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative w-full max-w-6xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-alt)]">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-[var(--text)]">
              {currentIndex + 1} / {items.length}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              currentItem.variant === "LIVE" 
                ? "bg-red-600/20 text-red-500" 
                : "bg-[var(--surface)] text-[var(--text-muted)]"
            }`}>
              {currentItem.variant}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                className="icon-btn text-[var(--text)]"
                title="Zoom out (-)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35M8 11h6" />
                </svg>
              </button>
              <span className="text-xs px-1 text-[var(--text-muted)]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                className="icon-btn text-[var(--text)]"
                title="Zoom in (+)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
                </svg>
              </button>
              <button
                onClick={() => setZoom(1)}
                className="text-xs px-2 text-[var(--text-muted)] hover:text-[var(--text)]"
                title="Reset zoom (0)"
              >
                Reset
              </button>
            </div>

            {/* Share button */}
            <button
              onClick={() => onShare(currentItem)}
              className="icon-btn bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--orange)] hover:text-white transition-colors"
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
              className="hidden sm:block icon-btn bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--orange)] hover:text-white transition-colors"
              title="Fullscreen (F)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isFullscreen ? (
                  <>
                    <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
                  </>
                ) : (
                  <>
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </>
                )}
              </svg>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="icon-btn bg-[var(--surface)] text-[var(--text)] hover:bg-red-600 hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Image area */}
        <div className="relative bg-black flex items-center justify-center overflow-hidden" style={{ height: "75vh" }}>
          <div
            className="relative max-w-full max-h-full"
            style={{ transform: `scale(${zoom})`, transition: "transform 0.2s ease-out" }}
          >
            <ProtectedImg
              src={currentItem.image}
              alt={`${currentItem.category} ${currentItem.subcategory || ""}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Navigation buttons */}
          {currentIndex > 0 && (
            <button
              onClick={() => { onNavigate(items[currentIndex - 1].id); setZoom(1); }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 icon-btn-lg bg-black/60 hover:bg-[var(--orange)] text-white transition-all backdrop-blur-sm z-20"
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
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 icon-btn-lg bg-black/60 hover:bg-[var(--orange)] text-white transition-all backdrop-blur-sm z-20"
              title="Next (→)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Info footer */}
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-alt)]">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="chip-soft">
                {currentItem.category}
              </span>
              {currentItem.subcategory && (
                <span className="chip-soft">
                  {currentItem.subcategory}
                </span>
              )}
            </div>
            <div className="text-[var(--text-muted)] hidden sm:block">
              Use arrow keys or swipe to navigate
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
              : `hover:bg-[var(--orange)] hover:text-white hover:border-[var(--orange)] ${reducedMotion ? '' : 'hover:scale-105'}`
            } transition-all`}
          aria-label="Previous page"
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
                  : `border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--orange)] hover:text-white hover:border-[var(--orange)] ${reducedMotion ? '' : 'hover:scale-105'}`
                }`}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
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
              : `hover:bg-[var(--orange)] hover:text-white hover:border-[var(--orange)] ${reducedMotion ? '' : 'hover:scale-105'}`
            } transition-all`}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
};

/* ---------- Loading Indicator ---------- */
const LoadingIndicator = ({ current, total, cached }) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return (
    <div className="fixed bottom-4 right-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl p-4 z-50 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--orange)] border-t-transparent"></div>
        <span className="text-xs font-medium text-[var(--text)]">
          Loading views...
        </span>
      </div>
      <div className="text-xs text-[var(--text-muted)] mb-1">
        {current} / {total} videos {cached > 0 && `(${cached} cached)`}
      </div>
      <div className="w-full bg-[var(--surface-alt)] rounded-full h-2 overflow-hidden">
        <div 
          className="bg-[var(--orange)] h-full transition-all duration-300 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/* ---------- Thumbnails data ---------- */
// ADD YOUR YOUTUBE LINKS HERE!
// Format: { filename: "file.jpg", youtubeUrl: "https://youtube.com/watch?v=VIDEO_ID" }
const YOUTUBE_LINKS = {
  // Example:
  // "Anchit-Valorant-1-Live.jpg": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  // "Anchit-Valorant-2-Live.jpg": "https://youtube.com/watch?v=abc123xyz",
  // Add your links here...
  "Kamzinkzone-Vlog-1-Video.jpg": "https://youtu.be/ZCBB66w13JA",
};

const FILENAMES = [
  // Anchit - Valorant
  "Anchit-Valorant-1-Live.jpg",
  "Anchit-Valorant-2-Live.jpg",
  "Anchit-Valorant-3-Live.jpg",
  "Anchit-Valorant-4-Live.jpg",
  "Anchit-Valorant-5-Video.jpg",
  "Anchit-Valorant-6-Live.jpg",
  "Anchit-Valorant-7-Video.jpg",
  "Anchit-Valorant-8-Video.jpg",
  "Anchit-Valorant-9-Video.jpg",
  "Anchit-Valorant-10-Live.jpg",
  "Anchit-Valorant-11-Live.jpg",

  // BGMI Creator
  "Divya-Bgmi-1-Live.jpg",
  "Payal-Bgmi-1-Live.jpg",

  // Cuttie - BGMI
  "Cutie-Bgmi-1-Live.jpg",

  // Deadlox - Once Human
  "Deadlox-Once Human-1-Video.jpg",
  "Deadlox-Once Human-2-Video.jpg",
  "Deadlox-Once Human-3-Video.jpg",

  // Divya - BGMI
  "Divya-Bgmi-1-Live.jpg",

  // Kamzinkzone - Vlogs
  "Kamzinkzone-Vlog-1-Video.jpg",
  "Kamzinkzone-Vlog-2-Video.jpg",
  "Kamzinkzone-Vlog-3-Video.jpg",
  "Kamzinkzone-Vlog-4-Video.jpg",
  "Kamzinkzone-Vlog-5-Video.jpg",
  "Kamzinkzone-Vlog-6-Video.jpg",
  "Kamzinkzone-Vlog-7-Video.jpg",

  // Kundan - Music & Bhajans
  "Kundan-MusicandBhajan-1-Video.jpg",
  "Kundan-MusicandBhajan-2-Video.jpg",

  // Maggie - Valorant
  "Maggie-Valorant-1-Video.jpg",
  "Maggie-Valorant-2-Video.jpg",
  "Maggie-Valorant-3-Video.jpg",
  "Maggie-Valorant-4-Video.jpg",
  "Maggie-Valorant-5-Video.jpg",
  "Maggie-Valorant-6-Live.jpg",
];

/* ---------- Build items ---------- */
function buildItems() {
  return FILENAMES.map((file, i) => {
    const title = titleFromFile(file);
    const { category, subcategory } = deriveCat(title);
    const youtubeUrl = YOUTUBE_LINKS[file] || null;
    
    return {
      id: `thumb-${i + 1}`,
      image: url(file),
      category,
      subcategory,
      variant: variantFromFile(file),
      filename: file,
      title,
      youtubeUrl,
      views: null, // Will be populated from storage
      deleted: false, // Will be set if video is deleted
      dateAdded: new Date(2024, 0, 1 + i).toISOString(),
    };
  });
}

/* ---------- Main Component ---------- */
export default function Thumbnails() {
  const [items, setItems] = useState([]);
  const [brokenIds, setBrokenIds] = useState(new Set());
  const [isLoadingViews, setIsLoadingViews] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, cached: 0 });
  const cacheRef = useRef(new ViewsCache());
  const CLOUDFLARE_WORKER_URL = "https://video-views-api.shinelstudioofficial.workers.dev/";
  const permanentStorageRef = useRef(new CloudflareViewStorage(CLOUDFLARE_WORKER_URL));

  const [openId, setOpenId] = useState(null);
  const [shareItem, setShareItem] = useState(null);
  const closeModal = useCallback(() => setOpenId(null), []);
  const navigateModal = useCallback((id) => setOpenId(id), []);

  const [searchQuery, setSearchQuery] = useState("");
  const [gridSize, setGridSize] = useState("medium");
  const [sortBy, setSortBy] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(getItemsPerPage(gridSize));
    };

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, [gridSize]);

  // Initialize items and fetch views with permanent storage
  useEffect(() => {
    const initializeItems = async () => {
      const cache = cacheRef.current;
      const permanentStorage = permanentStorageRef.current;
      const all = buildItems();
      
      if (all.length === 0) {
        setItems(FALLBACK);
        return;
      }

      // First, set items with permanent storage (instant display)
      const itemsWithStoredViews = all.map(item => {
        if (item.youtubeUrl) {
          const videoId = extractVideoId(item.youtubeUrl);
          if (videoId) {
            // Check permanent storage first
            const storedData = permanentStorage.get(videoId);
            if (storedData) {
              return { 
                ...item, 
                views: storedData.views,
                deleted: storedData.status === "deleted"
              };
            }
            // Fall back to cache
            const cachedViews = cache.get(videoId);
            if (cachedViews !== null) {
              return { ...item, views: cachedViews };
            }
          }
        }
        return item;
      });
      
      setItems(itemsWithStoredViews);

      // Collect video IDs that need updating
      const videoIdsToUpdate = [];
      all.forEach(item => {
        if (item.youtubeUrl) {
          const videoId = extractVideoId(item.youtubeUrl);
          if (videoId && cache.needsUpdate(videoId)) {
            videoIdsToUpdate.push(videoId);
          }
        }
      });

      // If there are videos to update, fetch them
      if (videoIdsToUpdate.length > 0) {
        setIsLoadingViews(true);
        setLoadingProgress({ current: 0, total: videoIdsToUpdate.length, cached: 0 });
        
        console.log(`Fetching views for ${videoIdsToUpdate.length} videos...`);
        
        const viewsData = await batchFetchViews(
          videoIdsToUpdate, 
          cache,
          permanentStorage,
          (current, total, fromCache) => {
            setLoadingProgress(prev => ({
              current,
              total,
              cached: fromCache ? prev.cached + 1 : prev.cached
            }));
          }
        );

        // Update items with fetched views
        const updatedItems = all.map(item => {
          if (item.youtubeUrl) {
            const videoId = extractVideoId(item.youtubeUrl);
            if (videoId) {
              if (viewsData[videoId]) {
                return { 
                  ...item, 
                  views: viewsData[videoId].views,
                  deleted: viewsData[videoId].deleted || false
                };
              }
              // Use permanent storage if available
              const storedData = permanentStorage.get(videoId);
              if (storedData) {
                return { 
                  ...item, 
                  views: storedData.views,
                  deleted: storedData.status === "deleted"
                };
              }
            }
          }
          return item;
        });

        setItems(updatedItems);
        setIsLoadingViews(false);
        
        console.log('Views fetching complete');
        console.log('Cache stats:', cache.getStats());
        console.log('Permanent storage stats:', permanentStorage.getStats());
      }
    };

    initializeItems();
    
    // Check URL for direct thumbnail link
    const params = new URLSearchParams(window.location.search);
    const thumbId = params.get("thumbnail");
    if (thumbId) {
      setOpenId(thumbId);
    }
  }, []);

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
          x.filename.toLowerCase().includes(query)
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
      // Sort by views, putting items without views at the end
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
    small: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3",
    medium: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
    large: "grid-cols-1 sm:grid-cols-2 gap-8",
  };

  const reducedMotion = prefersReducedMotion();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    scrollToTop();
  };

  // Expose storage management to console for debugging
  useEffect(() => {
    window.viewsCache = cacheRef.current;
    window.permanentStorage = permanentStorageRef.current;
  }, []);

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
          <div className="container mx-auto px-4">
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
                  className="w-full px-4 py-2 pl-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] outline-none ring-focus placeholder:text-[var(--text-muted)]"
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
                className="px-3 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs sm:text-sm outline-none cursor-pointer ring-focus"
              >
                <option value="default">Sort: Default</option>
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="popular">Sort: Most Popular</option>
                <option value="category">Sort: Category</option>
              </select>

              {/* Results count */}
              <span className="chip-soft">
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
          <div className="container mx-auto px-4">
            {paginatedItems.length === 0 ? (
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
                        views={t.views}
                        isDeleted={t.deleted}
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

        {/* Loading indicator */}
        {isLoadingViews && (
          <LoadingIndicator
            current={loadingProgress.current}
            total={loadingProgress.total}
            cached={loadingProgress.cached}
          />
        )}

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