/**
 * ClientDeepDive — single scrollable page covering everything we know about
 * one client. Lives at /dashboard/clients/:id (separate from the public
 * /c/:slug pages and from /dashboard/clients which lists all clients).
 *
 * One round trip to /admin/agency/clients/:id/full hydrates:
 *   client row · YT channels · IG accounts · projects (full ladder)
 *   latest 7 days research · RESEO history · competitor history
 *   lifetime finance · agent_log · per-status counts
 *
 * Sections (top-to-bottom):
 *   1. Header card — name, niche, status, links (Drive, IG, YT)
 *   2. Channels strip + IG accounts strip
 *   3. Mini-kanban — projects grouped by status (read-only summary)
 *   4. Finance card — paid + pending + posted count
 *   5. Today's research / latest health score
 *   6. Recent SEO actions
 *   7. Competitor delta (last 7 captures)
 *   8. Activity log
 */
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, FolderOpen, Instagram, Youtube, RefreshCw, IndianRupee, TrendingUp, Activity, Target, Hash, Check, X } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken } from "../../utils/tokenStore";

const STATUS_LABELS = {
  "planned":          { label: "Planned",      color: "bg-neutral-500/10 text-neutral-600" },
  "started":          { label: "Started",      color: "bg-blue-500/10 text-blue-500" },
  "in-progress":      { label: "In Progress",  color: "bg-orange-500/10 text-orange-500" },
  "completed":        { label: "Completed",    color: "bg-yellow-500/10 text-yellow-600" },
  "paid":             { label: "Paid",         color: "bg-emerald-500/10 text-emerald-600" },
  "posted":           { label: "Posted",       color: "bg-green-500/10 text-green-600" },
  "added-to-website": { label: "On Website",   color: "bg-purple-500/10 text-purple-600" },
  "archive":          { label: "Archive",      color: "bg-neutral-200/50 text-neutral-500" },
};

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

const fmtINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (s) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
};
const fmtTs = (s) => {
  if (!s) return "—";
  const ms = typeof s === "number" ? s * 1000 : Date.parse(s);
  try { return new Date(ms).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }
  catch { return "—"; }
};

function Section({ title, icon, children, right, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[var(--surface-elev)] mb-4">
      <header className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-900">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 hover:opacity-70"
        >
          {icon}
          {title}
          <span className="text-[10px] text-neutral-400">{open ? "▾" : "▸"}</span>
        </button>
        {right}
      </header>
      {open && <div className="p-4">{children}</div>}
    </section>
  );
}

export default function ClientDeepDive() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(`/admin/agency/clients/${encodeURIComponent(id)}/full`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return <div className="p-8 text-sm text-neutral-500">Loading client…</div>;
  }
  if (error) {
    return (
      <div className="p-8">
        <Link to="/dashboard/ops" className="text-sm text-[var(--orange)] flex items-center gap-1 mb-3"><ArrowLeft size={14} /> Back to cockpit</Link>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 p-4 text-sm">Failed to load: {error}</div>
      </div>
    );
  }
  if (!data?.client) return null;

  const { client, channels, instagram_accounts, projects, latest_research, recent_seo, competitor_history, agent_log, finance, status_counts } = data;
  const isManaged = client.managed_by_us !== 0;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <Link to="/dashboard/ops" className="text-sm text-[var(--orange)] flex items-center gap-1 hover:underline">
          <ArrowLeft size={14} /> Back to cockpit
        </Link>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-700 disabled:opacity-50 inline-flex items-center gap-1"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[var(--surface-elev)] p-5 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{client.name}</h1>
              {!isManaged && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-200/50 text-neutral-500">tracked-only</span>}
              {client.status && client.status !== "active" && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-700">{client.status}</span>
              )}
            </div>
            <div className="text-xs text-neutral-500">
              {client.niche_tag || "—"}
              {client.secondary_niche_tag ? ` · ${client.secondary_niche_tag}` : ""}
              {client.retainer_tier ? ` · ${client.retainer_tier} tier` : ""}
              {client.subscribers ? ` · ${client.subscribers.toLocaleString("en-IN")} subs` : ""}
            </div>
            {client.onboarded_at && (
              <div className="text-[10px] text-neutral-400 mt-1">Onboarded {fmtDate(client.onboarded_at)}</div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {client.drive_folder_url && (
              <a href={client.drive_folder_url} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 inline-flex items-center gap-1">
                <FolderOpen size={12} /> Drive folder <ExternalLink size={10} />
              </a>
            )}
            {client.instagram_handle && (
              <a href={`https://instagram.com/${String(client.instagram_handle).replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-md bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 inline-flex items-center gap-1">
                <Instagram size={12} /> @{String(client.instagram_handle).replace(/^@/, "")} <ExternalLink size={10} />
              </a>
            )}
            {client.youtube_id && (
              <a href={`https://youtube.com/channel/${client.youtube_id}`} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 inline-flex items-center gap-1">
                <Youtube size={12} /> YouTube <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard icon={<Target size={14} />} label="Projects (active)" value={(projects || []).filter(p => p.status !== "archive").length} />
        <StatCard icon={<TrendingUp size={14} />} label="Posted" value={finance?.posted_count || 0} />
        <StatCard icon={<IndianRupee size={14} />} label="Lifetime paid" value={fmtINR(finance?.paid_total)} />
        <StatCard icon={<Activity size={14} />} label="Pending payouts" value={fmtINR(finance?.pending_total)} />
      </div>

      {/* Discord per-client routing */}
      <DiscordWebhookCard
        clientId={client.id}
        clientName={client.name}
        currentUrl={client.discord_webhook_url || ""}
        onSaved={load}
      />

      {/* Channels + IG */}
      {(() => {
        const ytTotal = channels.reduce((s, ch) => s + (ch.subscribers || 0), 0);
        return (
          <Section title={`YouTube channels · ${(channels || []).length}${ytTotal ? ` · ${fmtINR(ytTotal).replace('₹', '')} subs total` : ""}`} icon={<Youtube size={14} className="text-red-500" />} defaultOpen>
            {(channels || []).length === 0 ? (
              <p className="text-xs text-neutral-500">No channels mapped yet.</p>
            ) : (
              <div className="space-y-2">
                {channels.map((ch) => (
                  <div key={ch.channel_id || ch.id} className="flex items-center justify-between text-xs bg-[var(--surface)] rounded-md px-3 py-2 border border-neutral-100 dark:border-neutral-900">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold flex items-center gap-2 flex-wrap">
                        <a href={`https://youtube.com/channel/${ch.channel_id}`} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--orange)] hover:underline">
                          {ch.handle || ch.channel_id}
                        </a>
                        <span className="text-[9px] text-neutral-500 uppercase tracking-wider px-1 rounded bg-neutral-200/50">{ch.role || "main"}</span>
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {ch.language || "—"}{ch.niche_tag_override ? ` · ${ch.niche_tag_override}` : ""}
                        {ch.video_count ? ` · ${ch.video_count} videos` : ""}
                        {ch.last_synced_at ? ` · synced ${fmtTs(ch.last_synced_at)}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {ch.subscribers != null && (
                        <div className="text-right">
                          <div className="text-sm font-bold tabular-nums">{ch.subscribers.toLocaleString("en-IN")}</div>
                          <div className="text-[9px] uppercase tracking-wider text-red-500">subs</div>
                        </div>
                      )}
                      {ch.studio_url && (
                        <a href={ch.studio_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--orange)] hover:underline inline-flex items-center gap-1">
                          Studio <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        );
      })()}

      {(() => {
        const igTotal = instagram_accounts.reduce((s, ig) => s + (ig.followers || 0), 0);
        const managedCount = instagram_accounts.filter((ig) => ig.managed_by_us).length;
        return (
          <Section title={`Instagram accounts · ${(instagram_accounts || []).length}${igTotal ? ` · ${fmtINR(igTotal).replace('₹', '')} followers total` : ""}${managedCount ? ` · ${managedCount} managed` : ""}`} icon={<Instagram size={14} className="text-pink-500" />} defaultOpen>
            {(instagram_accounts || []).length === 0 ? (
              <p className="text-xs text-neutral-500">No IG accounts mapped yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {instagram_accounts.map((ig) => (
                  <a key={ig.id} href={ig.url || `https://instagram.com/${String(ig.handle).replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between text-xs bg-[var(--surface)] rounded-md px-3 py-2 border border-neutral-100 dark:border-neutral-900 hover:bg-[var(--surface-alt)]">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">@{String(ig.handle).replace(/^@/, "")}</div>
                      <div className="text-[10px] text-neutral-500">{ig.role || "—"}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ig.followers != null && ig.followers > 0 && (
                        <div className="text-right">
                          <div className="text-sm font-bold tabular-nums">{ig.followers.toLocaleString("en-IN")}</div>
                          <div className="text-[9px] uppercase tracking-wider text-pink-500">followers</div>
                        </div>
                      )}
                      {ig.managed_by_us ? (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">managed</span>
                      ) : null}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Section>
        );
      })()}

      {/* Mini kanban */}
      <Section title={`Projects · ${(projects || []).length}`} icon={<Target size={14} className="text-[var(--orange)]" />} defaultOpen>
        {(projects || []).length === 0 ? (
          <p className="text-xs text-neutral-500">No projects yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(STATUS_LABELS).map(([key, def]) => (
                <span key={key} className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${def.color}`}>
                  {def.label} · {status_counts?.[key] || 0}
                </span>
              ))}
            </div>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {projects.slice(0, 50).map((p) => {
                const def = STATUS_LABELS[p.status] || { label: p.status, color: "bg-neutral-100 text-neutral-500" };
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 text-xs bg-[var(--surface)] rounded-md px-3 py-2 border border-neutral-100 dark:border-neutral-900">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{p.title}</div>
                      <div className="text-[10px] text-neutral-500">
                        {p.asset_type || "—"}
                        {p.editor_name ? ` · ${p.editor_name}${p.editor_comp === "salary" ? " (salary)" : ""}` : ""}
                        {p.editor_payment_inr > 0 ? ` · ${fmtINR(p.editor_payment_inr)}` : ""}
                        {p.youtube_video_id ? (
                          <> · <a href={`https://youtu.be/${p.youtube_video_id}`} target="_blank" rel="noopener noreferrer" className="text-[var(--orange)] hover:underline">youtu.be/{p.youtube_video_id.slice(0, 6)}…</a></>
                        ) : ""}
                      </div>
                    </div>
                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${def.color}`}>{def.label}</span>
                  </div>
                );
              })}
              {projects.length > 50 && <div className="text-[10px] text-neutral-500 text-center py-2">+ {projects.length - 50} more</div>}
            </div>
          </>
        )}
      </Section>

      {/* Finance */}
      <Section title="Finance" icon={<IndianRupee size={14} className="text-emerald-500" />} defaultOpen>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <FinCell label="Paid (count)" value={finance?.paid_count || 0} />
          <FinCell label="Paid (total)" value={fmtINR(finance?.paid_total)} accent="text-emerald-600" />
          <FinCell label="Pending payouts" value={fmtINR(finance?.pending_total)} accent="text-yellow-600" />
          <FinCell label="Posted (lifetime)" value={finance?.posted_count || 0} />
        </div>
      </Section>

      {/* Latest research */}
      <Section title={`Daily research · last ${(latest_research || []).length}`} icon={<TrendingUp size={14} className="text-blue-500" />} defaultOpen={false}>
        {(latest_research || []).length === 0 ? (
          <p className="text-xs text-neutral-500">No research entries yet.</p>
        ) : (
          <div className="space-y-2">
            {latest_research.map((r) => (
              <div key={r.id || r.research_date} className="flex items-center justify-between text-xs bg-[var(--surface)] rounded-md px-3 py-2 border border-neutral-100 dark:border-neutral-900">
                <div>
                  <div className="font-semibold">{r.research_date}</div>
                  {r.health_score != null && (
                    <div className="text-[10px] text-neutral-500">Health: {r.health_score}/100</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* RESEO history */}
      <Section title={`SEO actions · last ${(recent_seo || []).length}`} icon={<Activity size={14} className="text-yellow-500" />} defaultOpen={false}>
        {(recent_seo || []).length === 0 ? (
          <p className="text-xs text-neutral-500">No SEO history.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {recent_seo.map((s) => (
              <div key={s.id} className="text-xs bg-[var(--surface)] rounded-md px-3 py-2 border border-neutral-100 dark:border-neutral-900">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.new_title || s.action}</div>
                    <div className="text-[10px] text-neutral-500">{s.asset_type || "—"} · {fmtTs(s.created_at)}{s.applied ? " · applied" : " · queued"}</div>
                  </div>
                  {s.video_id && (
                    <a href={`https://youtu.be/${s.video_id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--orange)] hover:underline whitespace-nowrap">video</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Competitor history */}
      <Section title={`Competitor history · ${(competitor_history || []).length} captures`} icon={<TrendingUp size={14} className="text-purple-500" />} defaultOpen={false}>
        {(competitor_history || []).length === 0 ? (
          <p className="text-xs text-neutral-500">No competitor data yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {competitor_history.slice(0, 20).map((c, idx) => (
              <div key={idx} className="text-xs bg-[var(--surface)] rounded-md px-3 py-2 border border-neutral-100 dark:border-neutral-900 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{c.captured_date}</div>
                  <div className="text-[10px] text-neutral-500">{c.channel_id} · {c.subs ? c.subs.toLocaleString("en-IN") + " subs" : "—"}</div>
                </div>
                {c.overperformers_json && c.overperformers_json !== "[]" && (
                  <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-orange-500/10 text-orange-500">overperformer</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Agent log */}
      <Section title={`Activity log · last ${(agent_log || []).length}`} icon={<Activity size={14} />} defaultOpen={false}>
        {(agent_log || []).length === 0 ? (
          <p className="text-xs text-neutral-500">No log entries.</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto font-mono text-[11px]">
            {agent_log.map((l) => (
              <div key={l.id} className="text-xs bg-[var(--surface)] rounded-md px-3 py-1.5 border border-neutral-100 dark:border-neutral-900">
                <span className={`mr-2 uppercase text-[9px] ${l.level === "warn" ? "text-yellow-500" : l.level === "error" ? "text-red-500" : "text-neutral-400"}`}>{l.level}</span>
                <span className="text-neutral-500">{fmtTs(l.created_at)}</span>{" "}
                <span className="text-neutral-700 dark:text-neutral-300">{l.action}</span>
                {l.message && <div className="text-neutral-500 ml-2 break-words">{l.message}</div>}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// Per-client Discord webhook setter. When set, status-change pings + YT
// upload notifications also fire to this URL (in addition to global feeds).
function DiscordWebhookCard({ clientId, clientName, currentUrl, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(currentUrl);
  const [busy, setBusy] = useState(false);
  React.useEffect(() => { setVal(currentUrl); }, [currentUrl]);

  const save = async (newVal) => {
    setBusy(true);
    try {
      const res = await authedFetch(`/admin/agency/clients/${encodeURIComponent(clientId)}/discord`, {
        method: "POST",
        body: JSON.stringify({ discord_webhook_url: newVal || null }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `API ${res.status}`);
      setEditing(false);
      onSaved?.();
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    if (!currentUrl) { alert("No webhook saved yet — paste and Save first."); return; }
    setBusy(true);
    try {
      const r = await fetch(currentUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: `Shinel · ${clientName}`,
          content: `🔔 Test ping — Shinel Cockpit can reach this channel.`,
        }),
      });
      if (r.ok || r.status === 204) alert("Test ping sent ✓");
      else alert(`Ping failed: ${r.status}`);
    } catch (e) {
      alert("Ping error: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[var(--surface-elev)] p-4 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs">
          <Hash size={13} className="text-indigo-500" />
          <span className="font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">Discord channel</span>
          {currentUrl ? (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 inline-flex items-center gap-1">
              <Check size={10} /> wired
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-200/50 text-neutral-500">not set</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentUrl && !editing && (
            <button onClick={test} disabled={busy} className="text-[10px] px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-[var(--surface-alt)] disabled:opacity-50">🔔 Test</button>
          )}
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-[10px] px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-[var(--surface-alt)]">
              {currentUrl ? "Edit" : "+ Set webhook"}
            </button>
          )}
          {currentUrl && !editing && (
            <button onClick={() => { if (window.confirm("Remove the per-client webhook? Status pings will only go to global #ops-pipeline / #finance.")) save(""); }}
              disabled={busy} className="text-[10px] px-2 py-1 rounded text-red-500 hover:bg-red-500/10 disabled:opacity-50">
              Remove
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <input
            type="url"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="w-full text-xs bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5 font-mono"
          />
          <p className="text-[10px] text-neutral-500">
            In Discord: open the client's channel (e.g. #{clientName.toLowerCase().replace(/\s+/g, "-")}) → ⚙ → Integrations → Webhooks → New Webhook → Copy URL → paste here.
            Status pings (paid/posted/on-website) and YT upload notifications will then also fire to this channel.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setEditing(false); setVal(currentUrl); }} className="text-[10px] px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800">Cancel</button>
            <button onClick={() => save(val)} disabled={busy} className="text-[10px] px-3 py-1 rounded bg-[var(--orange)] text-white font-bold disabled:opacity-50">
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : currentUrl && (
        <div className="mt-2 text-[10px] text-neutral-500 font-mono truncate" title={currentUrl}>
          …/{currentUrl.split("/").slice(-2, -1)[0]}/<span className="opacity-30">…</span>
        </div>
      )}
    </section>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--surface-elev)] p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-neutral-500">{icon} {label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}

function FinCell({ label, value, accent }) {
  return (
    <div className="bg-[var(--surface)] rounded-md px-3 py-2 border border-neutral-100 dark:border-neutral-900">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`font-bold text-base ${accent || ""}`}>{value}</div>
    </div>
  );
}
