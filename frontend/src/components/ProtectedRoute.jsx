// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const API_BASE = import.meta.env.VITE_AUTH_BASE?.replace(/\/+$/, "") || "";

// --- Safe JWT decode ---
function parseJwt(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

// --- Refresh token logic (cookie-based) ---
async function tryRefresh() {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include", // <-- send ss_refresh cookie
    });

    if (!res.ok) throw new Error("Refresh failed");

    const data = await res.json().catch(() => ({}));
    if (!data?.token) throw new Error("No token in response");

    // Save new token and role
    localStorage.setItem("token", data.token);
    if (data.role) localStorage.setItem("role", data.role);

    window.dispatchEvent(new Event("auth:changed"));
    return data.token;
  } catch (err) {
    console.warn("Token refresh failed:", err);
    ["token", "role"].forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event("auth:changed"));
    return null;
  }
}

// --- Protected Route Component ---
export default function ProtectedRoute({ children, roles }) {
  const loc = useLocation();
  const [status, setStatus] = React.useState("checking"); // checking | ok | redirect

  React.useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      const token = localStorage.getItem("token");
      const payload = token ? parseJwt(token) : null;
      const now = Math.floor(Date.now() / 1000);
      const expired = !payload || (payload.exp && payload.exp <= now);

      let t = token;

      // Refresh if expired
      if (expired) {
        t = await tryRefresh();
      }

      // If no valid token after refresh → redirect
      if (!t) {
        if (!cancelled) setStatus("redirect");
        return;
      }

      // --- Role-based access check ---
      const role =
        (parseJwt(t)?.role || localStorage.getItem("role") || "").toLowerCase();

      if (
        roles &&
        roles.length > 0 &&
        !roles.map((r) => r.toLowerCase()).includes(role)
      ) {
        if (!cancelled) setStatus("redirect");
        return;
      }

      if (!cancelled) setStatus("ok");
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [loc.pathname, roles]);

  if (status === "checking") return null;

  if (status === "redirect")
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(loc.pathname)}`}
        replace
      />
    );

  return children;
}
