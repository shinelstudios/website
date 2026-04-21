/**
 * webVitals.js — anonymous Core Web Vitals beacon.
 *
 * Subscribes to the standard web-vitals metrics (LCP, CLS, INP, FCP, TTFB)
 * on first paint, accumulates the values into a single payload, and POSTs
 * it to the worker when the page unloads or the tab goes hidden.
 *
 * Why this shape:
 *   - web-vitals v5 fires each metric once when it stabilises. We collect
 *     them all rather than sending a beacon per metric (saves a KV write
 *     per pageview).
 *   - We flush on visibilitychange→hidden AND pagehide because Safari
 *     doesn't fire pagehide reliably and mobile browsers tend to just
 *     visibility-hide when switching apps.
 *   - navigator.sendBeacon is used so the POST survives page unload.
 *     `fetch(..., { keepalive: true })` is the fallback when sendBeacon
 *     isn't available.
 *   - No cookies, no user id, no PII — just path + anonymous numbers.
 *
 * Call `startWebVitals(apiBase)` ONCE at app mount. It no-ops for crawlers,
 * for users with DNT set, and for localhost (so dev pages don't pollute
 * production data).
 */

const DISABLED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

let started = false;

export function startWebVitals(apiBase) {
  if (started) return;
  started = true;

  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (DISABLED_HOSTS.has(window.location.hostname)) return;
    // Respect Do-Not-Track even though the beacon is anonymous.
    if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
    // Skip obvious bots — web-vitals doesn't mean anything for them.
    if (/bot|crawler|spider|prerender|Headless/i.test(navigator.userAgent || "")) return;
  } catch { return; }

  const payload = {
    path: window.location.pathname,
    m: {},
    conn: (navigator.connection && navigator.connection.effectiveType) || "",
    dpr: window.devicePixelRatio || 1,
  };

  // Lazy-load so web-vitals doesn't block first paint.
  import("web-vitals").then(({ onLCP, onCLS, onINP, onFCP, onTTFB }) => {
    const take = (key) => ({ value }) => { payload.m[key] = value; };
    try { onLCP(take("lcp")); } catch { /* ignore */ }
    try { onCLS(take("cls")); } catch { /* ignore */ }
    try { onINP(take("inp")); } catch { /* ignore */ }
    try { onFCP(take("fcp")); } catch { /* ignore */ }
    try { onTTFB(take("ttfb")); } catch { /* ignore */ }
  }).catch(() => { /* web-vitals failed to load — no telemetry, no crash. */ });

  let sent = false;
  const flush = () => {
    if (sent) return;
    // Need at least one metric captured, else there's nothing to report.
    if (!Object.keys(payload.m).length) return;
    sent = true;
    const url = `${apiBase}/api/metrics/pageview`;
    const body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch { /* never let a beacon crash the page */ }
  };

  // Fire on visibility-hidden (mobile app switch, tab switch) and pagehide
  // (real nav / unload). Both can fire; `sent` guards against double posts.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}
