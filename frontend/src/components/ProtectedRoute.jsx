// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { AUTH_BASE } from "../config/constants";
import { parseJwt } from "../utils/auth";
import { getAccessToken, refreshOnce } from "../utils/tokenStore";
const API_BASE = AUTH_BASE;

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
        // refreshOnce() is deduped across callers (App.jsx + every ProtectedRoute
        // mount under StrictMode) so we never issue overlapping /auth/refresh
        // requests — refresh-token rotation would make the second one 401.
        token = await refreshOnce(API_BASE);
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
