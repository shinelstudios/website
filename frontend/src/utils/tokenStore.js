/**
 * tokenStore — in-memory access token. Not persisted to localStorage.
 *
 * Rationale: storing the access JWT in localStorage makes it XSS-exfiltratable.
 * This module keeps the token in a closure so any script running in the page
 * must know the module reference to read it. The httpOnly `ss_refresh` cookie
 * is the only persistent piece; on page load, App.jsx silently calls
 * /auth/refresh to rehydrate this store.
 *
 * Subscribers are notified on every change so contexts can react (e.g. stats
 * refresh when the user logs in / out in another tab via `auth:changed`).
 */

let _accessToken = null;
const _listeners = new Set();

export function getAccessToken() {
  return _accessToken || "";
}

export function setAccessToken(token) {
  _accessToken = token || null;
  for (const cb of _listeners) {
    try { cb(_accessToken); } catch { /* ignore listener errors */ }
  }
  // Cross-tab logout signal still fires for legacy subscribers.
  try { window.dispatchEvent(new Event("auth:changed")); } catch { /* non-DOM env */ }
}

export function clearAccessToken() {
  setAccessToken(null);
}

export function subscribe(cb) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}
