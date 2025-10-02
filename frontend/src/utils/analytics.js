// analytics queue helpers
let analyticsQueue = [];
let analyticsTimer = null;

export function flushAnalytics() {
  if (!analyticsQueue.length) return;
  try {
    const batch = analyticsQueue.slice();
    window.dispatchEvent(new CustomEvent("analytics:batch", { detail: { events: batch } }));
    analyticsQueue = [];
  } catch (err) {
    console.warn("Analytics flush failed", err);
  }
}

export function trackEvent(name, details = {}) {
  analyticsQueue.push({
    name,
    details,
    timestamp: Date.now(),
    url: (typeof window !== "undefined" && window.location && window.location.pathname) || "/",
  });
  if (analyticsTimer) clearTimeout(analyticsTimer);
  analyticsTimer = setTimeout(flushAnalytics, 800);
}
