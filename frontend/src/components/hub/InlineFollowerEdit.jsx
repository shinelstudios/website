/**
 * InlineFollowerEdit — click a 0 follower count to type it in directly.
 *
 * Used in the Clients panel so the founder can type IG counts without opening
 * any modal. Bypasses the scraper. Auto-saves on Enter or blur.
 *
 * Used per IG handle on a client — picks the first/main IG handle from the
 * client's accounts. If a client has multiple IG handles, use the IG
 * Diagnostic modal for per-handle entry.
 */
import React, { useState, useEffect } from "react";
import { Check, Loader, Edit2 } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken } from "../../utils/tokenStore";
import { toast } from "../ui/Toast";

function authedFetch(path, opts = {}) {
  const token = getAccessToken();
  return fetch(`${AUTH_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    credentials: "include",
  });
}

function parseShortNum(s) {
  if (!s) return null;
  const cleaned = String(s).trim().toLowerCase().replace(/,/g, "");
  const m = cleaned.match(/^([\d.]+)\s*([kmb]?)$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const suffix = m[2];
  const mult = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : suffix === "b" ? 1_000_000_000 : 1;
  return Math.round(n * mult);
}

function fmtNum(n) {
  if (!n) return "0";
  return n.toLocaleString("en-IN");
}

export default function InlineFollowerEdit({
  clientId,
  handle,                  // pre-resolved IG handle (no @) OR null to fetch
  currentFollowers = 0,
  platform = "ig",         // "ig" | "yt" — drives endpoint + visual
  onSaved,
}) {
  const [editing, setEditing] = useState(false);
  const [resolvedHandle, setResolvedHandle] = useState(handle || null);
  const [value, setValue] = useState(currentFollowers > 0 ? String(currentFollowers) : "");
  const [busy, setBusy] = useState(false);

  // For YT we don't have a direct manual-entry endpoint yet, so for now
  // only IG inline-edit is wired. YT click opens a toast suggesting Cmd+K.
  const isIg = platform === "ig";

  // Resolve a handle from the client's IG accounts if none was passed in
  useEffect(() => {
    if (handle) { setResolvedHandle(handle); return; }
    if (!isIg) return;
    if (!editing) return;
    let cancelled = false;
    authedFetch(`/admin/agency/instagram?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        if (cancelled) return;
        const main = (j?.accounts || []).find((a) => a.role === "main") || (j?.accounts || [])[0];
        if (main) setResolvedHandle(String(main.handle).replace(/^@/, ""));
        else toast.error("This client has no IG handles configured. Add one via the '+ IG' button first.");
      })
      .catch(() => toast.error("Couldn't fetch handle"));
    return () => { cancelled = true; };
  }, [clientId, handle, isIg, editing]);

  const save = async () => {
    const n = parseShortNum(value);
    if (n == null) { toast.error("Enter a number (you can use 12.5K, 1.2M, etc.)"); return; }
    if (!isIg) { toast.info("YT counts auto-sync from the YouTube API. Use the cockpit's force-sync if needed."); return; }
    if (!resolvedHandle) { toast.error("No handle resolved yet"); return; }

    setBusy(true);
    try {
      const r = await authedFetch("/admin/agency/ig/manual-entry", {
        method: "POST",
        body: JSON.stringify({ client_id: clientId, handle: resolvedHandle, followers: n }),
      });
      const j = await r.json();
      if (!r.ok) { toast.error(j.error || "Save failed"); return; }
      toast.success(`Saved @${resolvedHandle}: ${fmtNum(n)} followers`);
      setEditing(false);
      onSaved?.(n);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!isIg) {
    return (
      <span
        onClick={(e) => { e.stopPropagation(); toast.info("YT counts auto-sync. Force-sync from the cockpit Actions menu if needed."); }}
        className="cursor-help"
      >
        {fmtNum(currentFollowers)}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className={`inline-flex items-center gap-1 group/inline hover:bg-pink-500/10 px-1 rounded transition-colors ${
          currentFollowers === 0 ? "text-pink-500" : ""
        }`}
        title="Click to type the follower count manually"
      >
        <span className="tabular-nums">{fmtNum(currentFollowers)}</span>
        <Edit2 size={9} className="opacity-0 group-hover/inline:opacity-60 flex-shrink-0" />
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={() => { if (value && parseShortNum(value)) save(); else setEditing(false); }}
        placeholder="e.g. 12.5K"
        className="w-20 px-1.5 py-0.5 rounded border border-pink-500/40 bg-white dark:bg-neutral-950 text-xs tabular-nums focus:outline-none focus:border-pink-500"
      />
      <button
        onClick={save}
        disabled={busy}
        className="p-1 rounded bg-pink-500 text-white disabled:opacity-50"
        title="Save (or press Enter)"
      >
        {busy ? <Loader size={9} className="animate-spin" /> : <Check size={9} />}
      </button>
    </div>
  );
}
