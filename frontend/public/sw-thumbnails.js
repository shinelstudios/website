/* SW: ultra-fast /thumbnails (and /stats) + image cache
   Place in /public/sw-thumbnails.js (or Vite "public")
*/

const VERSION = "v3";
const CACHE_API = `thumbs-api-${VERSION}`;
const CACHE_IMG = `thumbs-img-${VERSION}`;

// Cache these API endpoints (exact path match)
const API_PATHS = ["/thumbnails", "/stats"];

// Image extensions to cache
const IMG_EXT = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"];

// Simple LRU budget for images (best-effort cap)
const IMG_BUDGET = 300;

/* ---------- install: prefetch API & activate immediately ---------- */
self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_API);
      // Prefetch without credentials so it’s cacheable at edge/CDN too
      await cache.addAll(
        API_PATHS.map((p) => new Request(p, { method: "GET", credentials: "omit" }))
      );
    })()
  );
  self.skipWaiting();
});

/* ---------- activate: claim + purge old caches ---------- */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keep = new Set([CACHE_API, CACHE_IMG]);
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (!keep.has(k) ? caches.delete(k) : null)));
      await self.clients.claim();
    })()
  );
});

/* ---------- helpers ---------- */
const isApiPath = (pathname) => API_PATHS.includes(pathname);
const isImagePath = (pathname) =>
  IMG_EXT.some((ext) => pathname.toLowerCase().endsWith(ext));

// best-effort LRU trim for images
async function trimImageCache() {
  const cache = await caches.open(CACHE_IMG);
  const reqs = await cache.keys();
  if (reqs.length <= IMG_BUDGET) return;
  // delete oldest first (Cache API keeps insertion order)
  const toDelete = reqs.length - IMG_BUDGET;
  for (let i = 0; i < toDelete; i++) {
    await cache.delete(reqs[i]);
  }
}

/* ---------- fetch: stale-while-revalidate for API & images ---------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const { pathname } = url;

  const wantsApi = isApiPath(pathname);
  const wantsImg = isImagePath(pathname);

  if (!wantsApi && !wantsImg) return;

  // Domain exclusion: Don't cache signed/short-lived CDN URLs (Instagram/Facebook)
  // These often have CORS issues or expire, leading to ERR_FAILED in SW.
  const host = url.hostname.toLowerCase();
  if (host.includes("fbcdn.net") || host.includes("instagram.com")) {
    return; // Bypass Service Worker for these
  }

  event.respondWith(
    (async () => {
      const cacheName = wantsApi ? CACHE_API : CACHE_IMG;
      const cache = await caches.open(cacheName);

      const cacheKey = new Request(url.toString(), {
        method: "GET",
        credentials: "omit",
        headers: req.headers,
      });

      const cached = await cache.match(cacheKey);

      try {
        const res = await fetch(req);
        const ok = res.ok || (wantsImg && res.type === "opaque");
        if (ok) {
          const clone = res.clone();
          await cache.put(cacheKey, clone);
          if (wantsImg) trimImageCache();
        }
        return res;
      } catch (err) {
        // Fallback to cache ONLY if we have a match
        if (cached) return cached;
        // If NO cache and network failed, we MUST return a Response or bypass respondWith.
        // However, we are already inside respondWith. Let's return a simple failure response
        // so the browser knows the network failed properly.
        return new Response("Network error", { status: 408, headers: { 'Content-Type': 'text/plain' } });
      }
    })()
  );
});
