// src/utils/auth.js
export const AUTH_BASE = import.meta.env.VITE_AUTH_BASE?.replace(/\/$/, "") || "";

export function parseJwt(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export function getAuth() {
  const token = localStorage.getItem("token") || "";
  const refresh = localStorage.getItem("refreshToken") || "";
  const payload = token ? parseJwt(token) : null;

  const expSec = payload?.exp || null;
  const nowSec = Math.floor(Date.now() / 1000);
  const secsLeft = expSec ? Math.max(0, expSec - nowSec) : null;
  const daysLeft = secsLeft != null ? Math.floor(secsLeft / 86400) : null;

  const email = payload?.email || localStorage.getItem("userEmail") || null;
  const role = payload?.role || null;
  const firstName = payload?.firstName || null;
  const lastName = payload?.lastName || null;

  return {
    isAuthed: Boolean(token && payload && (!payload.exp || payload.exp > nowSec)),
    token,
    refresh,
    email,
    role,
    firstName,
    lastName,
    exp: expSec,
    daysLeft,
  };
}

export function setAuth({ token, refresh, email }) {
  if (token) localStorage.setItem("token", token);
  if (refresh) localStorage.setItem("refreshToken", refresh);
  if (email) localStorage.setItem("userEmail", email);
  window.dispatchEvent(new Event("auth:changed"));
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userEmail");
  window.dispatchEvent(new Event("auth:changed"));
}

export async function refreshSession() {
  try {
    const refresh = localStorage.getItem("refreshToken");
    if (!refresh) throw new Error("No refresh token");
    const res = await fetch(`${AUTH_BASE}/auth/refresh`, {
      method: "POST",
      headers: { authorization: `Bearer ${refresh}` },
    });
    if (!res.ok) throw new Error("Refresh failed");
    const data = await res.json();
    setAuth({ token: data.token, refresh: data.refresh });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e?.message || "Refresh failed" };
  }
}
