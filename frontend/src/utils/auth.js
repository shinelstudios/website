import { AUTH_BASE } from "../config/constants";
import { getAccessToken, setAccessToken, clearAccessToken } from "./tokenStore";

export { getAccessToken, setAccessToken, clearAccessToken };

// TextDecoder-based base64url → string (replaces deprecated escape/unescape).
export function parseJwt(token) {
  try {
    const [, payload] = (token || "").split(".");
    if (!payload) return null;
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder("utf-8").decode(bytes));
  } catch {
    return null;
  }
}

export function getAuth() {
  const token = getAccessToken();
  const payload = token ? parseJwt(token) : null;

  const expSec = payload?.exp || null;
  const nowSec = Math.floor(Date.now() / 1000);
  const secsLeft = expSec ? Math.max(0, expSec - nowSec) : null;
  const daysLeft = secsLeft != null ? Math.floor(secsLeft / 86400) : null;

  const email = payload?.email || localStorage.getItem("userEmail") || null;
  const role = payload?.role || localStorage.getItem("role") || null;
  const firstName = payload?.firstName || localStorage.getItem("firstName") || null;
  const lastName = payload?.lastName || localStorage.getItem("lastName") || null;

  return {
    isAuthed: Boolean(token && payload && (!payload.exp || payload.exp > nowSec)),
    token,
    email,
    role,
    firstName,
    lastName,
    exp: expSec,
    daysLeft,
  };
}

export function setAuth({ token, email, role, firstName, lastName }) {
  if (token) setAccessToken(token);
  // Profile display fields only — NOT the token. Keeps SiteHeader/avatars working
  // on initial load before silent refresh completes.
  if (email) localStorage.setItem("userEmail", email);
  if (role) localStorage.setItem("role", role);
  if (firstName) localStorage.setItem("firstName", firstName);
  if (lastName) localStorage.setItem("lastName", lastName);
  try { window.dispatchEvent(new Event("auth:changed")); } catch { /* */ }
}

export function clearAuth() {
  clearAccessToken();
  // Legacy + canonical keys.
  const keys = [
    "token", "refreshToken", "refresh",
    "userEmail", "role", "firstName", "lastName", "rememberMe",
    "userRole", "userFirst", "userLast", "userFirstName", "userLastName", "userEmailAddress",
  ];
  for (const k of keys) {
    try { localStorage.removeItem(k); } catch { /* */ }
  }
  try { window.dispatchEvent(new Event("auth:changed")); } catch { /* */ }
}

// Silent refresh using the httpOnly ss_refresh cookie. Safe to call on mount even
// when logged out: a 401 simply means "stay logged out".
export async function refreshSession() {
  try {
    const res = await fetch(`${AUTH_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return { ok: false, status: res.status };
    const data = await res.json();
    if (data && data.token) setAccessToken(data.token);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e?.message || "Refresh failed" };
  }
}
