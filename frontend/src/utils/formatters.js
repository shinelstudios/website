/**
 * formatters.js — small display helpers reused across admin + marketing pages.
 *
 * Keep these pure and zero-dep. Anything that needs config or context goes
 * elsewhere.
 */

/**
 * formatCompactNumber — turns a raw integer into a short display string.
 *
 *   0          → "0"
 *   847        → "847"
 *   1_240      → "1.2K"
 *   15_400     → "15.4K"
 *   2_700_000  → "2.7M"
 *   1_200_000_000 → "1.2B"
 *
 * Uses 1 decimal for K/M/B unless the value is a round number, in which case
 * no decimal is shown. Never returns "NaN…" or "undefined" — bad input
 * returns "0". This is the single source of truth for our number display
 * so any page that shows "views", "subs", "reach" should call it.
 */
export function formatCompactNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "0";

  const abs = Math.abs(n);
  let scaled, suffix;
  if (abs >= 1_000_000_000) {
    scaled = n / 1_000_000_000;
    suffix = "B";
  } else if (abs >= 1_000_000) {
    scaled = n / 1_000_000;
    suffix = "M";
  } else if (abs >= 1_000) {
    scaled = n / 1_000;
    suffix = "K";
  } else {
    return Math.round(n).toLocaleString("en-IN");
  }

  // Drop the decimal when it's effectively a round number.
  const shown =
    Math.round(scaled * 10) === Math.round(scaled) * 10
      ? String(Math.round(scaled))
      : scaled.toFixed(1);
  return `${shown}${suffix}`;
}

/**
 * formatViewsLocale — full view count with locale-aware separators.
 * Returns null (not "0") when the count is falsy so callers can skip
 * rendering the chip entirely. Use formatCompactNumber for "2.4M" style.
 */
export function formatViewsLocale(count) {
  if (!count || Number(count) === 0) return null;
  return Number(count).toLocaleString();
}

/**
 * formatPercent — safe percent display. null/NaN/undefined → "—" so the UI
 * never shows a garbage value. Rounded to 1 decimal.
 */
export function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

/**
 * resolveMediaUrl — normalise stored media URLs before feeding them to <img>.
 *
 * The worker serves uploaded media at `/api/media/view/<uuid>.<ext>`, but
 * stores the URL in D1 as a relative path. When the frontend renders on
 * `shinelstudios.in`, a relative `/api/...` hits Cloudflare Pages (404),
 * not the worker. This helper prepends the worker origin when the URL is
 * a relative `/api/...` path. External URLs (YouTube, CDN) pass through.
 */
export function resolveMediaUrl(raw, apiBase) {
  if (!raw || typeof raw !== "string") return raw;
  if (raw.startsWith("/api/") && apiBase) return `${apiBase}${raw}`;
  return raw;
}

/**
 * resolveThumbnailImage — smart thumbnail URL picker for inventory rows.
 *
 * Prefers the YouTube thumbnail CDN when we have a video_id, because it's
 * free, instant, and always available. Falls back to the R2-stored
 * image_url only when there's no video_id (for pure graphic pieces without
 * a companion video).
 *
 * This is a pragmatic workaround for the "R2 not bound" problem — the
 * worker's /api/media/view/* endpoint 404s without the binding, so any
 * row that relies on it appears broken. Rows with a video_id sidestep
 * that path entirely.
 *
 * Known-bad YouTube ids that return placeholder thumbnails fall through
 * to mqdefault (which is always available) instead of maxresdefault.
 */
const KNOWN_BAD_YT_IDS = new Set(["t-vPWTJUIO4", "R2jcaMDAvOU"]);

export function resolveThumbnailImage(row, apiBase) {
  if (!row) return "";
  const videoId = row.video_id || row.videoId || row.youtubeId || "";
  if (videoId && typeof videoId === "string") {
    const quality = KNOWN_BAD_YT_IDS.has(videoId) ? "mqdefault" : "hqdefault";
    return `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/${quality}.jpg`;
  }
  const raw = row.image_url || row.imageUrl || row.image || row.thumb || "";
  return resolveMediaUrl(raw, apiBase);
}
