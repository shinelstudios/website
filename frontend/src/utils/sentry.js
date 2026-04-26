/**
 * sentry.js — error reporting init for the frontend.
 *
 * Free-tier guardrails baked in:
 *   - tracesSampleRate: 0.05 (5% of pageviews send a transaction; ~150/mo
 *     at expected traffic — well under the 10k/mo perf-event quota).
 *   - Replay disabled entirely (Replay events are the fastest way to burn
 *     the free tier).
 *   - beforeSend filter drops localhost, DNT users, bots, and noisy
 *     extension errors so we don't pay for false positives.
 *   - Rate-limited at 30 events/min (per browser tab) via a tiny in-memory
 *     counter — runaway loops can't spam our 5k/mo cap.
 *
 * The DSN is intentionally hardcoded. Sentry DSNs are write-only public
 * credentials by design — anyone with one can send events but can't read
 * data. Hardcoding sidesteps Cloudflare Pages env-var setup entirely.
 *
 * Init only fires in production builds (`import.meta.env.PROD`); dev
 * mode never reports.
 */
import * as Sentry from "@sentry/react";

// Frontend project DSN — public, safe to commit.
const DSN = "https://28d4e851a51d5396b94a4f451e995387@o4511286896951296.ingest.de.sentry.io/4511286918053968";

const DISABLED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

// Patterns we never want in Sentry (spammy, not actionable).
const IGNORE_ERRORS = [
  // ResizeObserver loop benign: https://stackoverflow.com/q/49384120
  /ResizeObserver loop/i,
  // Common adblock / privacy ext noise
  /chrome-extension:\/\//i,
  /safari-extension:\/\//i,
  /moz-extension:\/\//i,
  // Network blips that look scary but aren't bugs
  /Failed to fetch/i,
  /NetworkError when attempting to fetch resource/i,
  /Load failed/i,
  // YouTube iframe noise we can't fix from our side
  /www\.youtube\.com/i,
];

// Tab-local burst limit — caps a runaway loop at 30 events/min so a single
// bad release can't drain the 5k/mo Sentry quota in 30 seconds.
let burst = { count: 0, windowStart: 0 };
function isOverBurstLimit() {
  const now = Date.now();
  if (now - burst.windowStart > 60_000) {
    burst = { count: 0, windowStart: now };
  }
  burst.count++;
  return burst.count > 30;
}

function shouldDrop() {
  try {
    if (typeof window === "undefined") return true;
    if (DISABLED_HOSTS.has(window.location.hostname)) return true;
    if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return true;
    if (/bot|crawler|spider|prerender|Headless|ShinelPlaywright/i.test(navigator.userAgent || "")) return true;
  } catch { return true; }
  return false;
}

let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (!import.meta.env.PROD) return; // never report from dev
  if (shouldDrop()) return;

  try {
    Sentry.init({
      dsn: DSN,
      environment: "production",
      release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
      // Performance — keep tiny so we don't blow the perf-event quota.
      tracesSampleRate: 0.05,
      // Replay — off entirely. The free tier (50/mo) is too small to
      // be useful for diagnosis and the SDK adds ~50KB.
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      // Drop noise via inbound filter rather than per-event beforeSend
      // where we can — Sentry never decodes these on the wire.
      ignoreErrors: IGNORE_ERRORS,
      // Final filter for anything that slipped through.
      beforeSend(event, hint) {
        if (shouldDrop()) return null;
        if (isOverBurstLimit()) return null;
        // Strip request cookies if any made it in (defence in depth —
        // we don't set any cookies on Sentry traces, but hostile libs
        // might).
        if (event.request?.cookies) delete event.request.cookies;
        return event;
      },
      // Tag the event with the route for easy filtering in the Sentry UI.
      initialScope: {
        tags: {
          surface: "frontend",
        },
      },
    });
    initialized = true;
  } catch (e) {
    // Sentry init must never crash the app.
    console.warn("Sentry init failed:", e?.message || e);
  }
}

// Re-export the ErrorBoundary so callers can `import { ErrorBoundary } from "./utils/sentry"`.
export const SentryErrorBoundary = Sentry.ErrorBoundary;
