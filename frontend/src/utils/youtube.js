/**
 * YouTube URL/id helpers — canonical module.
 *
 * Until now every component that touched a YouTube URL re-declared its own
 * extractor. Each copy drifted (some handled /shorts, some missed it; some
 * returned "", some null). This module is the single source of truth —
 * import it instead of writing a ninth copy.
 */

/**
 * Extract the 11-char YouTube video id from any YouTube URL shape we've seen
 * pasted into admin forms: watch, youtu.be, shorts, live, embed. Returns ""
 * (not null) when no id is found, so callers can chain without null checks.
 */
export function extractYouTubeId(input = "") {
  if (!input) return "";
  const url = String(input).trim();
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.slice(1).split("/")[0] || "";
    }
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtube-nocookie.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/\/(?:shorts|live|embed)\/([^/?]+)/);
      if (m) return m[1];
    }
  } catch { /* ignore — not a valid URL */ }
  return "";
}

/**
 * YouTube CDN thumbnail for an id. `size` accepts a standard YT variant:
 *   default (120x90), mqdefault (320x180), hqdefault (480x360),
 *   sddefault (640x480), maxresdefault (1280x720).
 * Falls back to hqdefault, which is guaranteed present for every video.
 */
export function thumbnailFromId(id, size = "hqdefault") {
  if (!id) return "";
  const allowed = new Set(["default", "mqdefault", "hqdefault", "sddefault", "maxresdefault"]);
  const variant = allowed.has(size) ? size : "hqdefault";
  return `https://i.ytimg.com/vi/${id}/${variant}.jpg`;
}

/**
 * Convenience: given an arbitrary URL, return a thumbnail src or "".
 */
export function thumbnailFromUrl(url, size = "hqdefault") {
  const id = extractYouTubeId(url);
  return id ? thumbnailFromId(id, size) : "";
}
