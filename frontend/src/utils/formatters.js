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
 *
 * Callers: Thumbnails.jsx, WorkPage.jsx, PortfolioPage.jsx, MediaHub.jsx,
 * MyProfilePage.jsx — any surface rendering inventory_thumbnails.image_url
 * or media_library.r2_key-derived URLs.
 */
export function resolveMediaUrl(raw, apiBase) {
  if (!raw || typeof raw !== "string") return raw;
  if (raw.startsWith("/api/") && apiBase) return `${apiBase}${raw}`;
  return raw;
}
