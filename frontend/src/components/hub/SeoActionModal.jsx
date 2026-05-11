/**
 * SeoActionModal — open by clicking a pending SEO row in the cockpit.
 *
 * Shows the full diff (old → new title/description/tags) and exposes 4 actions:
 *   1. ▶ Send to laptop        → enqueue a `yt_video_reseo` task + WebSocket push
 *   2. ✓ Mark as applied       → set applied=1 (when you applied it elsewhere)
 *   3. ↗ Open in YT Studio     → external link to the video edit page
 *   4. ✕ Dismiss               → set applied=2 ("skip this proposal")
 *
 * The modal fetches `/admin/agency/seo/:id` on open for the full row + the
 * computed studio_url, then calls one of three POST endpoints depending on
 * which action the user picks.
 */
import React, { useEffect, useState } from "react";
import { X, Zap, Check, ExternalLink, Trash2, Loader, AlertCircle, Youtube, Video } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken } from "../../utils/tokenStore";

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

export default function SeoActionModal({ seoId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // "dispatch" | "apply" | "dismiss"
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [dismissReason, setDismissReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    authedFetch(`/admin/agency/seo/${seoId}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((j) => { if (!cancelled) setData(j); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [seoId]);

  const act = async (sub, body = {}) => {
    setBusy(sub);
    try {
      const r = await authedFetch(`/admin/agency/seo/${seoId}/${sub}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error || `Action failed: ${sub}`); return; }
      onChanged?.();
      onClose();
    } catch (e) { alert("Error: " + e.message); }
    finally { setBusy(null); }
  };

  const seo = data?.seo;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface-elev)] border-b border-neutral-200 dark:border-neutral-800 px-5 py-4 flex justify-between items-start z-10">
          <div className="min-w-0">
            <div className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">SEO Proposal #{seoId}</div>
            <h2 className="text-lg font-bold mt-1 truncate" title={seo?.new_title}>
              {loading ? "Loading…" : (seo?.new_title || "(no title)")}
            </h2>
            {seo && (
              <div className="text-xs text-neutral-500 mt-1 flex flex-wrap items-center gap-2">
                <span>{data.client?.name || seo.client_id}</span>
                <span>·</span>
                <span className="font-mono">{seo.asset_type}</span>
                <span>·</span>
                <span className="font-mono">{seo.action}</span>
                {seo.video_id && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-neutral-400">{seo.video_id}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 ml-3 flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {loading && (
            <div className="text-center py-6 text-sm text-neutral-500 flex items-center justify-center gap-2">
              <Loader size={14} className="animate-spin" /> Loading proposal…
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle size={14} /> Failed to load: {error}
            </div>
          )}

          {seo && (
            <>
              {/* Status banner if already actioned */}
              {seo.applied === 1 && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 p-3 rounded-lg text-sm flex items-center gap-2">
                  <Check size={14} /> Already applied{seo.applied_at ? ` on ${new Date(seo.applied_at).toLocaleString()}` : ""}
                  {seo.applied_method && <span className="text-xs text-neutral-500">· via {seo.applied_method}</span>}
                </div>
              )}
              {seo.applied === 2 && (
                <div className="bg-neutral-500/10 border border-neutral-500/30 text-neutral-600 p-3 rounded-lg text-sm">
                  This proposal was dismissed{seo.applied_at ? ` on ${new Date(seo.applied_at).toLocaleString()}` : ""}.
                </div>
              )}

              {/* Diff: old vs new */}
              <div className="space-y-3">
                <DiffBlock
                  label="Title"
                  oldVal={seo.old_title}
                  newVal={seo.new_title}
                />
                <DiffBlock
                  label="Description (first line)"
                  oldVal={seo.old_description_first_line}
                  newVal={seo.new_description_first_line}
                  multiline
                />
                <DiffBlock
                  label="Tags"
                  oldVal={seo.old_tags_count != null ? `${seo.old_tags_count} tags · ${seo.old_tags_chars || 0} chars` : null}
                  newVal={seo.new_tags_count != null ? `${seo.new_tags_count} tags · ${seo.new_tags_chars || 0} chars` : null}
                />
              </div>

              {/* Changes summary if available */}
              {seo.changes_summary && (
                <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">What changes</div>
                  <div className="text-xs whitespace-pre-wrap">{seo.changes_summary}</div>
                </div>
              )}

              {/* Notes if any */}
              {seo.notes && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-neutral-500 hover:text-neutral-700">History / notes</summary>
                  <pre className="mt-2 p-2 bg-neutral-100 dark:bg-neutral-900 rounded text-[10px] whitespace-pre-wrap font-mono text-neutral-600">{seo.notes}</pre>
                </details>
              )}

              {/* Payload preview */}
              {data?.payload && Object.keys(data.payload).length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-neutral-500 hover:text-neutral-700">Raw payload</summary>
                  <pre className="mt-2 p-2 bg-neutral-100 dark:bg-neutral-900 rounded text-[10px] whitespace-pre-wrap font-mono text-neutral-600">{JSON.stringify(data.payload, null, 2)}</pre>
                </details>
              )}
            </>
          )}
        </div>

        {/* Actions bar */}
        {seo && seo.applied !== 1 && seo.applied !== 2 && (
          <div className="sticky bottom-0 bg-[var(--surface-elev)] border-t border-neutral-200 dark:border-neutral-800 px-5 py-3">
            {!confirmDismiss ? (
              <div className="flex flex-wrap gap-2 items-center justify-end">
                {data.watch_url && (
                  <a
                    href={data.watch_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5"
                    title="View the video on YouTube (watch page)"
                  >
                    <Video size={12} /> Watch
                  </a>
                )}
                {data.studio_url && (
                  <a
                    href={data.studio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1.5"
                    title="Edit on YouTube Studio (you can apply this manually here)"
                  >
                    <ExternalLink size={12} /> Studio
                  </a>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => setConfirmDismiss(true)}
                  disabled={busy != null}
                  className="text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 size={12} /> Dismiss
                </button>
                <button
                  onClick={() => act("mark-applied", { method: "manual" })}
                  disabled={busy != null}
                  className="text-xs px-3 py-2 rounded-lg border border-green-500 text-green-700 dark:text-green-400 hover:bg-green-500 hover:text-white flex items-center gap-1.5 disabled:opacity-50"
                  title="If you applied this in Studio yourself, mark it done"
                >
                  {busy === "mark-applied" ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
                  Mark applied
                </button>
                <button
                  onClick={() => act("dispatch")}
                  disabled={busy != null || !seo.video_id}
                  className="text-xs px-4 py-2 rounded-lg bg-[var(--orange)] text-white font-bold hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50 shadow-lg"
                  title={!seo.video_id ? "No video_id — can't auto-apply" : "Queue this RESEO on the always-on laptop"}
                >
                  {busy === "dispatch" ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
                  Send to laptop
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Why are you dismissing this?</div>
                <input
                  autoFocus
                  placeholder="e.g. video already deleted, not worth re-optimizing, wrong proposal…"
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setConfirmDismiss(false); setDismissReason(""); }}
                    className="text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => act("dismiss", { reason: dismissReason })}
                    disabled={busy != null}
                    className="text-xs px-3 py-2 rounded-lg bg-red-600 text-white font-bold disabled:opacity-50"
                  >
                    {busy === "dismiss" ? "Dismissing…" : "Confirm dismiss"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Diff display — old crossed-out, new highlighted.
function DiffBlock({ label, oldVal, newVal, multiline = false }) {
  const same = (oldVal || "") === (newVal || "");
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">{label}</div>
      <div className="space-y-1.5">
        {oldVal != null && oldVal !== "" && (
          <div className={`p-2 rounded-lg border bg-red-50/30 dark:bg-red-950/20 border-red-200/40 dark:border-red-900/40 ${multiline ? "text-xs" : "text-sm"}`}>
            <span className="text-[9px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider mr-2">OLD</span>
            <span className={`${same ? "" : "line-through opacity-60"}`}>{oldVal}</span>
          </div>
        )}
        <div className={`p-2 rounded-lg border bg-green-50/30 dark:bg-green-950/20 border-green-200/40 dark:border-green-900/40 ${multiline ? "text-xs" : "text-sm font-medium"}`}>
          <span className="text-[9px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider mr-2">NEW</span>
          <span>{newVal || "(unchanged)"}</span>
        </div>
      </div>
    </div>
  );
}
