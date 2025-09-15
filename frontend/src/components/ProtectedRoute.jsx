import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const API_BASE = import.meta.env.VITE_AUTH_BASE?.replace(/\/+$/, "") || "";

// tiny, safe decode
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

async function tryRefresh() {
  const refresh = localStorage.getItem("refresh");
  if (!refresh) return null;
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { authorization: `Bearer ${refresh}` },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  if (!data?.token) return null;

  try {
    localStorage.setItem("token", data.token);
    if (data.refresh) localStorage.setItem("refresh", data.refresh);
    if (data.role) localStorage.setItem("userRole", data.role);
  } catch {}
  window.dispatchEvent(new Event("auth:changed"));
  return data.token;
}

export default function ProtectedRoute({ children, roles }) {
  const loc = useLocation();
  const [status, setStatus] = React.useState("checking"); // checking | ok | redirect

  React.useEffect(() => {
    let cancelled = false;

    async function check() {
      const token = localStorage.getItem("token");
      const payload = token ? parseJwt(token) : null;
      const now = Math.floor(Date.now() / 1000);
      const expired = !payload || (payload.exp && payload.exp <= now);

      let t = token;

      if (expired) {
        t = await tryRefresh();
      }

      if (!t) {
        if (!cancelled) setStatus("redirect");
        return;
      }

      // role check
      const role = (parseJwt(t)?.role || localStorage.getItem("userRole") || "").toLowerCase();
      if (roles && roles.length > 0 && !roles.map((r) => r.toLowerCase()).includes(role)) {
        if (!cancelled) setStatus("redirect");
        return;
      }

      if (!cancelled) setStatus("ok");
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [loc.pathname, roles]);

  if (status === "checking") return null;
  if (status === "redirect") return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return children;
}
