// src/components/AIStudioPage.jsx
import React, { useEffect, useState } from "react";
import { LogOut, ChevronDown, ChevronUp, RefreshCcw, Timer } from "lucide-react";

import { AUTH_BASE } from "../config/constants";
import { getAccessToken, setAccessToken, refreshOnce } from "../utils/tokenStore";

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

const daysLeftFromExp = (payload) => {
  if (!payload?.exp) return null;
  const ms = payload.exp * 1000 - Date.now();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

export default function AIStudioPage() {
  const [token, setToken] = useState(() => getAccessToken());
  const [payload, setPayload] = useState(() => (token ? parseJwt(token) : null));
  const [showDebug, setShowDebug] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const email = payload?.email || localStorage.getItem("userEmail") || "Unknown";
  const role = (payload?.role || localStorage.getItem("role") || "").toLowerCase();
  const firstName = payload?.firstName || localStorage.getItem("firstName") || "";
  const lastName = payload?.lastName || localStorage.getItem("lastName") || "";

  const daysLeft = daysLeftFromExp(payload);

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
  // shared refreshOnce() singleton in tokenStore. The old implementation
  // read from localStorage.getItem("refresh") which never had a value after
  // we migrated refresh tokens to httpOnly cookies — so every click fired
  // a "No refresh token available" alert. Silent non-modal banner now.
  async function refreshNow() {
    setRefreshing(true);
    try {
      const newToken = await refreshOnce(AUTH_BASE);
      if (!newToken) {
        // Cookie missing / expired — send them to /login.
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
      {/* Top Banner */}
      <div
        className="w-full max-w-3xl mb-8 p-4 rounded-xl flex items-center justify-between"
        style={{ background: "linear-gradient(90deg,#E85002,#ff9357)" }}
      >
        <div>
          <p className="font-medium text-white">Logged in as</p>
          <p className="text-lg font-semibold">
            {firstName ? `${firstName} ${lastName}` : email}
          </p>
          <div className="text-xs opacity-90">
            <span className="capitalize">{role || "member"}</span>
            {Number.isFinite(daysLeft) && (
              <span>
                {" "}
                • Session:{" "}
                {role === "admin"
                  ? `${daysLeft} days (auto-refresh on)`
                  : `${daysLeft} days left`}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshNow}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm"
            style={{ background: "rgba(0,0,0,.25)", color: "#fff" }}
            title="Refresh session now"
          >
            <RefreshCcw size={16} /> {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm"
            style={{ background: "rgba(0,0,0,.25)", color: "#fff" }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Studio Content */}
      <h1 className="text-3xl font-bold mb-3">🎬 Shinel Studios AI Studio</h1>
      <p className="mb-6 text-white/80 text-center max-w-xl">
        Welcome to the AI Studio. Your tools unlock based on your role. Admins also
        get a perpetual session via safe background refresh.
      </p>

      {/* Session status card */}
      <div
        className="w-full max-w-2xl mb-8 rounded-xl p-4 border"
        style={{ background: "#121212", borderColor: "#262626" }}
      >
        <div className="flex items-center gap-2 text-white/90 mb-2">
          <Timer size={16} />
          <b>Session</b>
        </div>
        {Number.isFinite(daysLeft) ? (
          <div className="text-sm text-white/80">
            {role === "admin" ? (
              <>
                Your admin session auto-refreshes in the background. Current token
                shows <b>{daysLeft}</b> days left.
              </>
            ) : (
              <>
                Your session expires in <b>{daysLeft}</b> day(s). You can refresh
                anytime with the button above.
              </>
            )}
          </div>
        ) : (
          <div className="text-sm text-white/70">
            No expiry data found in token.
          </div>
        )}
      </div>

      {/* Debug Token Section */}
      <div className="w-full max-w-2xl">
        <button
          onClick={() => setShowDebug((v) => !v)}
          className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
        >
          {showDebug ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showDebug ? "Hide Debug Info" : "Show Debug Info"}
        </button>

        {showDebug && (
          <div className="mt-3 p-4 rounded-lg bg-gray-900 border border-gray-700 text-sm overflow-x-auto">
            <p className="mb-2 text-white/70">Access Token:</p>
            <code className="block break-all">{token}</code>
            <p className="mt-3 mb-1 text-white/70">Decoded Payload:</p>
            <pre className="bg-black/40 p-2 rounded text-xs">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
