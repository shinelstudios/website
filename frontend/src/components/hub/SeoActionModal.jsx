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
        className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
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

              {/* Full diff — pulls full description + tags from payload_json
                  when the summary columns only contain the first line / counts.
                  Tries a list of common payload key names so this works across
                  different RESEO workflow versions. */}
              {(() => {
                const p = data?.payload || {};
                // Common variants we've used across workflow versions
                const fullOldTitle = seo.old_title || p.old_title || p.previous?.title;
                const fullNewTitle = seo.new_title || p.new_title || p.proposed?.title || p.title;
                const fullOldDesc =
                  p.old_description || p.previous?.description ||
                  p.old_description_full || seo.old_description_first_line;
                const fullNewDesc =
                  p.new_description || p.proposed?.description ||
                  p.new_description_full || seo.new_description_first_line;
                const oldTagsRaw = p.old_tags ?? p.previous?.tags ?? p.tags_before;
                const newTagsRaw = p.new_tags ?? p.proposed?.tags ?? p.tags ?? p.tags_after;
                const toArr = (t) => Array.isArray(t) ? t : (typeof t === "string" ? t.split(",").map(s => s.trim()).filter(Boolean) : []);
                const oldTags = toArr(oldTagsRaw);
                const newTags = toArr(newTagsRaw);
                return (
                  <div className="space-y-4">
                    <DiffBlock label="Title" oldVal={fullOldTitle} newVal={fullNewTitle} />
                    <DescriptionDiff oldDesc={fullOldDesc} newDesc={fullNewDesc} />
                    <TagsDiff
                      oldTags={oldTags}
                      newTags={newTags}
                      oldCount={seo.old_tags_count}
                      oldChars={seo.old_tags_chars}
                      newCount={seo.new_tags_count}
                      newChars={seo.new_tags_chars}
                    />
                  </div>
                );
              })()}

              {/* Changes summary — the human-readable "what changed and why" */}
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

              {/* Raw payload (debug only) */}
              {data?.payload && Object.keys(data.payload).length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-neutral-500 hover:text-neutral-700">Raw payload (debug)</summary>
                  <pre className="mt-2 p-2 bg-neutral-100 dark:bg-neutral-900 rounded text-[10px] whitespace-pre-wrap font-mono text-neutral-600 max-h-[300px] overflow-y-auto">{JSON.stringify(data.payload, null, 2)}</pre>
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

// Description diff — scrollable old vs new, side-by-side on wide screens,
// stacked on narrow. Lets the founder read the full description before
// dispatching the proposal, not just the first line.
function DescriptionDiff({ oldDesc, newDesc }) {
  if (!oldDesc && !newDesc) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1 flex items-center justify-between">
        <span>Description</span>
        {newDesc && (
          <span className="text-[9px] text-neutral-400 font-normal normal-case tracking-normal">
            {(newDesc || "").length} chars · {(newDesc || "").split("\n").length} lines
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {oldDesc && (
          <div className="rounded-lg border bg-red-50/30 dark:bg-red-950/20 border-red-200/40 dark:border-red-900/40 overflow-hidden">
            <div className="px-2 py-1 bg-red-100/30 dark:bg-red-950/40 text-[9px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">OLD</div>
            <pre className="p-2 text-xs whitespace-pre-wrap font-sans max-h-[260px] overflow-y-auto text-neutral-500 dark:text-neutral-400">
              {oldDesc}
            </pre>
          </div>
        )}
        {newDesc && (
          <div className={`rounded-lg border bg-green-50/30 dark:bg-green-950/20 border-green-200/40 dark:border-green-900/40 overflow-hidden ${oldDesc ? "" : "md:col-span-2"}`}>
            <div className="px-2 py-1 bg-green-100/30 dark:bg-green-950/40 text-[9px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">NEW</div>
            <pre className="p-2 text-xs whitespace-pre-wrap font-sans max-h-[260px] overflow-y-auto">
              {newDesc}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// Tags diff — render each tag as a chip. Tags present in both lists are
// neutral; added tags are green; removed tags are red strike. Click a chip
// to copy it. Shows all tags so the founder doesn't have to guess.
function TagsDiff({ oldTags = [], newTags = [], oldCount, oldChars, newCount, newChars }) {
  const oldSet = new Set(oldTags.map((t) => String(t).toLowerCase()));
  const newSet = new Set(newTags.map((t) => String(t).toLowerCase()));
  const removed = oldTags.filter((t) => !newSet.has(String(t).toLowerCase()));
  const added = newTags.filter((t) => !oldSet.has(String(t).toLowerCase()));
  const kept = newTags.filter((t) => oldSet.has(String(t).toLowerCase()));

  // Fallback when payload didn't include the actual tag arrays — show counts only
  if (!oldTags.length && !newTags.length) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Tags</div>
        <div className="space-y-1.5 text-sm">
          {oldCount != null && (
            <div className="p-2 rounded-lg border bg-red-50/30 dark:bg-red-950/20 border-red-200/40 dark:border-red-900/40 line-through opacity-60">
              <span className="text-[9px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider mr-2">OLD</span>
              {oldCount} tags · {oldChars || 0} chars
            </div>
          )}
          <div className="p-2 rounded-lg border bg-green-50/30 dark:bg-green-950/20 border-green-200/40 dark:border-green-900/40">
            <span className="text-[9px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider mr-2">NEW</span>
            {newCount ?? 0} tags · {newChars ?? 0} chars
          </div>
          <p className="text-[10px] text-neutral-500 italic">Full tag list not stored on this proposal — open the "Raw payload" section below if you need to inspect.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1 flex items-center justify-between">
        <span>Tags ({newTags.length})</span>
        <span className="text-[9px] text-neutral-400 font-normal normal-case tracking-normal">
          {newChars ?? newTags.join(", ").length} / 500 chars
        </span>
      </div>
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-2 space-y-2">
        {added.length > 0 && (
          <div>
            <div className="text-[9px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider mb-1">Added ({added.length})</div>
            <div className="flex flex-wrap gap-1">
              {added.map((t, i) => (
                <button
                  key={`a-${i}`}
                  onClick={() => navigator.clipboard?.writeText(String(t))}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900 transition-colors"
                  title="Click to copy"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>
        )}
        {kept.length > 0 && (
          <div>
            <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Kept ({kept.length})</div>
            <div className="flex flex-wrap gap-1">
              {kept.map((t, i) => (
                <button
                  key={`k-${i}`}
                  onClick={() => navigator.clipboard?.writeText(String(t))}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  title="Click to copy"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
        {removed.length > 0 && (
          <div>
            <div className="text-[9px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider mb-1">Removed ({removed.length})</div>
            <div className="flex flex-wrap gap-1">
              {removed.map((t, i) => (
                <button
                  key={`r-${i}`}
                  onClick={() => navigator.clipboard?.writeText(String(t))}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-100/40 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-300/50 dark:border-red-900/50 line-through opacity-60 hover:opacity-100 transition-opacity"
                  title="Click to copy"
                >
                  − {t}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="pt-1 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => navigator.clipboard?.writeText(newTags.join(", "))}
            className="text-[10px] text-[var(--orange)] hover:underline font-medium"
            title="Copy all new tags as a comma-separated list (paste into YT Studio)"
          >
            📋 Copy all new tags as comma-separated
          </button>
        </div>
      </div>
    </div>
  );
}
