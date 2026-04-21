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

// Singleton in-flight /auth/refresh. Any caller (App.jsx's mount hook,
// ProtectedRoute's expiry check, admin pages' 401-retry) awaits the same Promise
// so concurrent callers never race. Critical because refresh-token rotation
// revokes the old jti on first success — a racing second call would 401.
let _pending = null;
export function refreshOnce(apiBase) {
  if (_pending) return _pending;
  _pending = (async () => {
    try {
      const res = await fetch(`${apiBase}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      if (data && data.token) setAccessToken(data.token);
      return data && data.token ? data.token : null;
    } catch {
      return null;
    } finally {
      // Release the dedup slot after a beat so a *future* refresh (e.g. when the
      // access token genuinely expires mid-session) still works.
      setTimeout(() => { _pending = null; }, 1000);
    }
  })();
  return _pending;
}

/**
 * authedFetch(apiBase, path, init) — authenticated fetch with one automatic
 * refresh + retry on 401. Recommended for all admin surfaces that need a
 * Bearer token.
 *
 *   const res = await authedFetch(AUTH_BASE, "/admin/users");
 *   if (!res.ok) { ... }
 *
 * Behaviour:
 *   - Attaches `Authorization: Bearer ${getAccessToken()}` to the request.
 *   - If the response is 401, calls refreshOnce(apiBase). If refresh succeeds,
 *     retries the request ONCE with the fresh token.
 *   - If refresh fails (cookie missing / expired), returns the 401 so the
 *     caller can redirect to /login or surface a banner.
 *   - For non-401 responses (2xx, 4xx, 5xx), returns them unchanged — no magic.
 *   - Merges headers carefully so callers can still set Content-Type, etc.
 *
 * New admin code should prefer this over raw fetch + manual token handling.
 * Existing pages can migrate incrementally.
 */
export async function authedFetch(apiBase, path, init = {}) {
  const url = path.startsWith("http") ? path : `${apiBase}${path}`;
  const buildInit = () => {
    const headers = new Headers(init.headers || {});
    const t = getAccessToken();
    if (t) headers.set("Authorization", `Bearer ${t}`);
    return { ...init, headers };
  };

  let res = await fetch(url, buildInit());
  if (res.status === 401) {
    const fresh = await refreshOnce(apiBase);
    if (fresh) {
      res = await fetch(url, buildInit());
    }
    // If refresh returned null, fall through with the original 401 — caller
    // decides whether to redirect or show a banner.
  }
  return res;
}
