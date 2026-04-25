// src/components/AIStudioPage.jsx
//
// AI Studio entry surface for any logged-in role. The previous version
// computed "Session: X days" from the access-token `exp` claim and rendered
// "0 days" for the 30-minute access tokens we mint — meaningless to the
// user. The "Show Debug Info" disclosure also dumped the raw bearer token
// into the DOM for any role to copy. Both removed.
//
// What this page now shows:
//   - Top banner: who's logged in (name + role) + Refresh + Logout.
//   - Body: short welcome blurb. Sessions stay active in the background
//     via the silent /auth/refresh path; users don't need a countdown.
import React, { useEffect, useState } from "react";
import { LogOut, RefreshCcw, ShieldCheck } from "lucide-react";

import { AUTH_BASE } from "../config/constants";
import { getAccessToken, setAccessToken, refreshOnce } from "../utils/tokenStore";
import AdminSessions from "./AdminSessions";

// ---- tiny JWT decoder (no verification) ----
function parseJwt(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function AIStudioPage() {
  const [token, setToken] = useState(() => getAccessToken());
  const [payload, setPayload] = useState(() => (token ? parseJwt(token) : null));
  const [refreshing, setRefreshing] = useState(false);

  const email = payload?.email || "Unknown";
  const role = (payload?.role || "").toLowerCase();
  const firstName = payload?.firstName || "";
  const lastName = payload?.lastName || "";
  const displayName = firstName ? `${firstName} ${lastName}`.trim() : email;
  const displayRole = role
    ? role.split(",").map((r) => r.trim()).filter(Boolean).join(" · ")
    : "member";

  // Sync local state with global auth changes
  useEffect(() => {
    const onAuth = () => {
      const t = getAccessToken();
      setToken(t);
      setPayload(t ? parseJwt(t) : null);
    };
    window.addEventListener("auth:changed", onAuth);
    return () => window.removeEventListener("auth:changed", onAuth);
  }, []);

  // Logout clears all keys consistently
  const handleLogout = () => {
    try {
      ["token", "refresh", "userEmail", "role", "firstName", "lastName", "rememberMe"].forEach((k) =>
        localStorage.removeItem(k)
      );
    } catch { }
    window.dispatchEvent(new Event("auth:changed"));
    window.location.href = "/"; // go Home
  };

  // Manual token refresh.
  // Reads the refresh token from the httpOnly ss_refresh cookie via the
  // shared refreshOnce() singleton in tokenStore.
  async function refreshNow() {
    setRefreshing(true);
    try {
      const newToken = await refreshOnce(AUTH_BASE);
      if (!newToken) {
        try {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?next=${next}`;
        } catch { window.location.href = "/login"; }
        return;
      }
      setAccessToken(newToken);
      setToken(newToken);
      setPayload(parseJwt(newToken));
      window.dispatchEvent(new Event("auth:changed"));
    } catch (e) {
      console.error("AIStudioPage refreshNow failed:", e);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#0F0F0F] text-white px-4 py-10">
      {/* Top Banner — identity + actions, no countdown. */}
      <div
        className="w-full max-w-3xl mb-8 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap"
        style={{ background: "linear-gradient(90deg,#E85002,#ff9357)" }}
      >
        <div className="min-w-0">
          <p className="font-medium text-white/90 text-xs uppercase tracking-widest">Logged in as</p>
          <p className="text-lg font-bold truncate">{displayName}</p>
          <div className="text-xs opacity-90 inline-flex items-center gap-1.5">
            <ShieldCheck size={12} />
            <span className="capitalize">{displayRole}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={refreshNow}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
            style={{ background: "rgba(0,0,0,.25)", color: "#fff" }}
            title="Refresh session now"
          >
            <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm focus-visible:ring-2 focus-visible:ring-white/60"
            style={{ background: "rgba(0,0,0,.25)", color: "#fff" }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Studio Content */}
      <h1 className="text-3xl font-bold mb-3">🎬 Shinel Studios AI Studio</h1>
      <p className="mb-6 text-white/80 text-center max-w-xl">
        Welcome to the AI Studio. Your tools unlock based on your role.
        Sessions stay active in the background — no need to log in again
        between visits.
      </p>

      {/* Active sessions — per-device list with revoke buttons. */}
      <div className="w-full max-w-3xl mt-6">
        <AdminSessions />
      </div>
    </div>
  );
}
