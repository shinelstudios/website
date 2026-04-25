/**
 * AdminSessions — list of devices currently signed in to this account.
 *
 * Reads from the worker's `/auth/sessions` endpoint (which the new
 * per-device tracking populates on /auth/login + rotates on
 * /auth/refresh). User can revoke any session except the current one
 * via `/auth/sessions/revoke`.
 *
 * Drop into any authed surface — no role gating; users only ever see
 * their own list.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Monitor, Smartphone, RefreshCw, LogOut, CheckCircle2, AlertCircle } from "lucide-react";
import { AUTH_BASE } from "../config/constants";
import { authedFetch } from "../utils/tokenStore";

function timeAgo(ts) {
  if (!ts) return "—";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function deviceIcon(label) {
  const l = String(label || "").toLowerCase();
  if (l.includes("iphone") || l.includes("android")) return Smartphone;
  return Monitor;
}

export default function AdminSessions({ className = "" }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [revoking, setRevoking] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await authedFetch(AUTH_BASE, "/auth/sessions");
      if (!res.ok) throw new Error(`Sessions (${res.status})`);
      const data = await res.json().catch(() => ({}));
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (e) {
      setErr(e.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revoke = useCallback(async (jti) => {
    if (!jti) return;
    if (!confirm("Sign this device out?")) return;
    setRevoking(jti);
    try {
      const res = await authedFetch(AUTH_BASE, "/auth/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jti }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Revoke failed (${res.status})`);
      await load();
    } catch (e) {
      setErr(e.message || "Revoke failed");
    } finally {
      setRevoking(null);
    }
  }, [load]);

  return (
    <div
      className={`rounded-2xl border p-5 md:p-6 ${className}`}
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base md:text-lg font-black" style={{ color: "var(--text)" }}>
            Active sessions
          </h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Each device that's signed into this account. Revoke any to sign that device out.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Refresh sessions"
          className="p-2 rounded-lg border hover:bg-[var(--surface-alt)] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {err && (
        <div
          className="mb-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2"
          style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}
          role="alert"
        >
          <AlertCircle size={14} /> {err}
        </div>
      )}

      {loading && sessions.length === 0 ? (
        <div className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
          No tracked sessions yet. Log out and back in to see this device here.
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const Icon = deviceIcon(s.label);
            return (
              <li
                key={s.jti}
                className="flex items-center justify-between gap-3 p-3 rounded-xl"
                style={{
                  background: s.current ? "color-mix(in oklab, var(--orange) 8%, transparent)" : "var(--surface-alt)",
                  border: `1px solid ${s.current ? "color-mix(in oklab, var(--orange) 30%, transparent)" : "var(--border)"}`,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 shrink-0 rounded-lg grid place-items-center"
                    style={{ background: "var(--surface)", color: "var(--text)" }}
                    aria-hidden="true"
                  >
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
                        {s.label || "Unknown device"}
                      </span>
                      {s.current && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{ background: "var(--orange)", color: "#fff" }}
                        >
                          <CheckCircle2 size={10} /> This device
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Last seen {timeAgo(s.lastSeenAt)} · signed in {timeAgo(s.createdAt)}
                    </div>
                  </div>
                </div>
                {!s.current && (
                  <button
                    type="button"
                    onClick={() => revoke(s.jti)}
                    disabled={revoking === s.jti}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border hover:bg-[var(--surface)] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                    style={{ borderColor: "var(--border)", color: "#ef4444" }}
                    aria-label={`Sign out ${s.label}`}
                  >
                    <LogOut size={12} />
                    {revoking === s.jti ? "Signing out…" : "Sign out"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[10px] mt-4" style={{ color: "var(--text-muted)" }}>
        Up to {sessions.length || "—"} of 10 tracked devices. Oldest is dropped first when full.
      </p>
    </div>
  );
}
