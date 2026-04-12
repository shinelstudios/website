// src/lib/hashActions.js
/**
 * Minimal hash-action router:
 * - Intercepts clicks on <a href="#/..."> anywhere in the app
 * - pushState + dispatch handler based on pattern
 * - Handles back/forward + page-load deep links
 *
 * Usage in App.jsx:
 *   import { startHashActionRouter } from './lib/hashActions';
 *   startHashActionRouter();
 *
 * Usage in feature:
 *   import { registerHashAction } from './lib/hashActions';
 *   registerHashAction(/^#\/shorts\/(\w+)$/, ([, id]) => openShort(id));
 */

const routes = [];

/** Register a pattern + handler */
export function registerHashAction(pattern, handler) {
  routes.push({ pattern, handler });
}

/** Try to match current location.hash and run a handler */
export function routeHash() {
  const h = window.location.hash || '';
  for (const { pattern, handler } of routes) {
    const m = h.match(pattern);
    if (m) {
      handler(m);
      return true;
    }
  }
  return false;
}

/** Start global listeners (call once in App bootstrap) */
export function startHashActionRouter() {
  // 1) Global click delegation for anchors with href="#/..."
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest('a[href^="#/"]');
      if (!a) return;
      // Let modifier clicks behave normally (new tab, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;

      e.preventDefault();
      const targetHash = a.getAttribute('href');
      if (window.location.hash !== targetHash) {
        history.pushState({}, '', targetHash);
      }
      // Route to a handler (if any)
      routeHash();
    },
    true // capture early to beat other handlers
  );

  // 2) Back/forward
  window.addEventListener('popstate', () => routeHash());

  // 3) Deep-link on load
  window.addEventListener('load', () => routeHash());
}
