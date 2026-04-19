// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { AUTH_BASE } from "../config/constants";
import { parseJwt } from "../utils/auth";
import { getAccessToken, setAccessToken, clearAccessToken } from "../utils/tokenStore";
const API_BASE = AUTH_BASE;

// Silent refresh via the httpOnly ss_refresh cookie. New token lands in tokenStore
// (memory) — never persisted to localStorage.
async function tryRefresh() {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Refresh failed");
    const data = await res.json().catch(() => ({}));
    if (!data?.token) throw new Error("No token in response");
    setAccessToken(data.token);
    if (data.role) localStorage.setItem("role", data.role);
    return data.token;
  } catch (err) {
    console.warn("Token refresh failed:", err);
    clearAccessToken();
    localStorage.removeItem("role");
    return null;
  }
}

export default function ProtectedRoute({ children, roles }) {
  const loc = useLocation();
  const [status, setStatus] = React.useState("checking");

  React.useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      let token = getAccessToken();
      const payload = token ? parseJwt(token) : null;
      const now = Math.floor(Date.now() / 1000);
      const expired = !payload || (payload.exp && payload.exp <= now);

      if (expired) {
        token = await tryRefresh();
      }

      if (!token) {
        if (!cancelled) setStatus("redirect");
        return;
      }

      const rawRole = (parseJwt(token)?.role || localStorage.getItem("role") || "").toLowerCase();
      const userRoles = rawRole.split(",").map(r => r.trim()).filter(Boolean);

      if (
        roles &&
        roles.length > 0 &&
        !roles.some((r) => userRoles.includes(r.toLowerCase()))
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
