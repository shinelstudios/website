/**
 * SeoRequestModal — manual on-demand SEO generator.
 *
 * Founder pastes a YouTube URL / video ID, picks the client, optionally pastes
 * a transcript (skips the laptop fetch step), and clicks Generate. Worker
 * queues either:
 *   - transcribe_video (laptop fetches transcript + generates SEO), OR
 *   - seo_generate_only (laptop just generates from the pasted transcript)
 *
 * Then the modal polls /admin/agency/seo/request/:videoId every 5 sec to show
 * the pipeline status until the proposal is ready.
 */
import React, { useEffect, useState, useCallback } from "react";
import { X, Zap, Loader, Check, AlertCircle, ExternalLink, Sparkles } from "lucide-react";
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

function extractVideoId(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  const m = s.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,15})/);
  if (m) return m[1];
  // Already an ID
  if (/^[a-zA-Z0-9_-]{6,15}$/.test(s)) return s;
  return s; // let backend validate
}

const STEP_LABELS = {
  pending: { label: "Queued", icon: "⏳", color: "text-neutral-500" },
  fetching_transcript: { label: "Fetching transcript on laptop", icon: "📝", color: "text-blue-600" },
  transcript_failed: { label: "Transcript fetch failed", icon: "⚠", color: "text-red-600" },
  generating_seo: { label: "Generating SEO via Cowork Claude", icon: "🤖", color: "text-purple-600" },
  generation_failed: { label: "Generation failed", icon: "⚠", color: "text-red-600" },
  proposal_ready: { label: "Proposal ready — review in Pending SEO", icon: "✅", color: "text-emerald-600" },
  applied_to_youtube: { label: "Applied to YouTube", icon: "🎉", color: "text-emerald-600" },
};

export default function SeoRequestModal({ clients = [], defaultClientId, onClose, onProposalReady }) {
  const [videoInput, setVideoInput] = useState("");
  const [clientId, setClientId] = useState(defaultClientId || "");
  const [assetType, setAssetType] = useState("video");
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [request, setRequest] = useState(null); // { video_id, task_id, step }
  const [polledState, setPolledState] = useState(null);

  const videoId = extractVideoId(videoInput);

  const submit = async () => {
    setError(null);
    if (!videoId) { setError("Enter a YouTube URL or video ID"); return; }
    if (!clientId) { setError("Pick a client"); return; }
    setBusy(true);
    try {
      const body = {
        video_id: videoId,
        client_id: clientId,
        asset_type: assetType,
        title: title || null,
      };
      if (transcript.trim().length > 50) body.transcript = transcript.trim();
      const r = await authedFetch("/admin/agency/seo/request", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || `API ${r.status}`); return; }
      setRequest(j);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  // Poll for status once a request is queued
  useEffect(() => {
    if (!request?.video_id) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await authedFetch(`/admin/agency/seo/request/${request.video_id}`);
        if (!r.ok || cancelled) return;
        const j = await r.json();
        setPolledState(j);
        if (j.step === "proposal_ready" && onProposalReady) onProposalReady(j.seo_history_id);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 5_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [request?.video_id, onProposalReady]);

  const currentStep = polledState?.step || request?.step || "pending";
  const stepMeta = STEP_LABELS[currentStep] || STEP_LABELS.pending;
  const isDone = currentStep === "proposal_ready" || currentStep === "applied_to_youtube";

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface-elev)] border-b border-neutral-200 dark:border-neutral-800 px-5 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--orange)]" />
            <h3 className="text-lg font-bold">Generate SEO for a video</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-3">
          {!request ? (
            <>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Point at any video, short, or stream. The laptop fetches the transcript, Cowork Claude generates a personalized SEO proposal using the client's niche, top performers, applied patterns, and competitor signals. Proposal lands in the Pending SEO queue for your review.
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Video URL or ID *</label>
                <input
                  autoFocus
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or just abcd1234"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm font-mono"
                />
                {videoId && videoId !== videoInput && (
                  <div className="text-[10px] text-emerald-600 mt-1">✓ extracted ID: <code>{videoId}</code></div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Client *</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
                  >
                    <option value="">— pick a client —</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Format</label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
                  >
                    <option value="video">Long-form video</option>
                    <option value="short">YT Short / Reel</option>
                    <option value="stream">Livestream / VOD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Current title (optional — helps the LLM)</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="If you know the current/working title, paste it here"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
                />
              </div>

              <details className="border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  ▸ Already have a transcript? (skips the laptop fetch step — faster)
                </summary>
                <div className="px-3 pb-3">
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={6}
                    placeholder="Paste the full transcript here. If empty, the laptop will fetch it from youtubetotranscript.com on its next poll."
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-xs font-mono"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    {transcript ? `${transcript.length} chars · ${transcript.split(/\s+/).filter(Boolean).length} words` : "Empty — laptop will fetch on next poll (~5–20 min)"}
                  </p>
                </div>
              </details>

              {error && (
                <div className="text-xs text-red-600 bg-red-500/10 border border-red-500/30 p-2 rounded flex items-center gap-2">
                  <AlertCircle size={12} /> {error}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Status view after request submitted */}
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--surface)] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">{stepMeta.icon}</div>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${stepMeta.color}`}>{stepMeta.label}</div>
                    <div className="text-[10px] text-neutral-500 font-mono">video: {request.video_id}</div>
                  </div>
                  {!isDone && currentStep !== "transcript_failed" && currentStep !== "generation_failed" && (
                    <Loader size={16} className="animate-spin text-[var(--orange)]" />
                  )}
                </div>

                {/* Progress timeline */}
                <ol className="space-y-1.5 text-xs">
                  <li className={`flex items-center gap-2 ${["fetching_transcript", "generating_seo", "proposal_ready", "applied_to_youtube"].includes(currentStep) ? "text-emerald-600" : ""}`}>
                    <span>{polledState?.transcript_status === "done" ? "✅" : currentStep === "fetching_transcript" ? "⏳" : "○"}</span>
                    Transcript {polledState?.transcript_text ? `(${polledState.transcript_text.length} chars)` : ""}
                  </li>
                  <li className={`flex items-center gap-2 ${["proposal_ready", "applied_to_youtube"].includes(currentStep) ? "text-emerald-600" : ""}`}>
                    <span>{polledState?.seo_status === "generated" ? "✅" : currentStep === "generating_seo" ? "⏳" : "○"}</span>
                    SEO proposal generation
                  </li>
                  <li className={`flex items-center gap-2 ${currentStep === "applied_to_youtube" ? "text-emerald-600" : ""}`}>
                    <span>{polledState?.seo_applied === 1 ? "✅" : "○"}</span>
                    Applied to YouTube (you trigger this from the Pending SEO modal)
                  </li>
                </ol>

                {polledState?.seo_history_id && (
                  <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                    <button
                      onClick={() => { onProposalReady?.(polledState.seo_history_id); onClose(); }}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--orange)] text-white font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <Sparkles size={14} /> Open proposal in cockpit
                    </button>
                  </div>
                )}

                {(currentStep === "transcript_failed" || currentStep === "generation_failed") && polledState?.notes && (
                  <div className="mt-3 text-[10px] text-red-600 bg-red-500/5 p-2 rounded">
                    {polledState.notes}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <a
                    href={`https://youtube.com/watch?v=${request.video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-neutral-500 hover:text-[var(--orange)] inline-flex items-center gap-1"
                  >
                    <ExternalLink size={10} /> Watch
                  </a>
                  <a
                    href={`https://studio.youtube.com/video/${request.video_id}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-neutral-500 hover:text-[var(--orange)] inline-flex items-center gap-1"
                  >
                    <ExternalLink size={10} /> Studio
                  </a>
                </div>
              </div>

              <p className="text-[10px] text-neutral-500 text-center">
                You can close this modal — the pipeline keeps running. Proposal appears in the Pending SEO queue when ready.
              </p>
            </>
          )}
        </div>

        {!request && (
          <div className="sticky bottom-0 bg-[var(--surface-elev)] border-t border-neutral-200 dark:border-neutral-800 px-5 py-3 flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm">Cancel</button>
            <button
              onClick={submit}
              disabled={busy || !videoId || !clientId}
              className="px-4 py-2 rounded-lg bg-[var(--orange)] text-white font-bold text-sm disabled:opacity-50 inline-flex items-center gap-2"
            >
              {busy ? <Loader size={14} className="animate-spin" /> : <Zap size={14} />}
              {transcript ? "Generate SEO now" : "Queue laptop to generate"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
