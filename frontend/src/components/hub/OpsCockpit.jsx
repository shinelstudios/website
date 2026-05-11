/**
 * OpsCockpit — /dashboard/ops
 *
 * Live cockpit for the Shinel agency platform. Polls
 * /admin/agency/ops/snapshot every 30 seconds; one round trip per refresh.
 *
 * Surfaces:
 *  - per-client tiles (subs, niche, retainer)
 *  - pending RESEO queue
 *  - active news spikes (BGMI 4.4, BMPS 2026, etc.)
 *  - competitor overperformers (videos > 2× recent median)
 *  - today's research files (one per client)
 *  - recent agent activity log
 *  - kanban project counts by status
 *
 * Auth: rendered inside the existing /dashboard ProtectedRoute (TEAM_ROLES).
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Activity,
  Users,
  Calendar,
  Zap,
  Eye,
  CheckCircle2,
  Clock,
  Target,
  Flame,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken } from "../../utils/tokenStore";
import PipelineKanban from "./PipelineKanban";
import TeamPanel from "./TeamPanel";
import FinancePanel from "./FinancePanel";
import LaptopQueuePanel from "./LaptopQueuePanel";
import ScheduledTasksPanel from "./ScheduledTasksPanel";
import AddSomethingButton from "./AddSomethingButton";

// ---- helpers ---------------------------------------------------------------
const fmtNum = (n) => {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
};
const fmtTime = (isoStr) => {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
};
const fmtRelative = (isoStr) => {
  if (!isoStr) return "—";
  const ms = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ---- subcomponents ---------------------------------------------------------

// Consolidated Actions dropdown — combines all the manual-fire buttons.
// Previously 5 buttons cluttered the header; now they're tucked behind one.
function ActionsMenu({ onAfterAction }) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(null);

  const run = async (label, work) => {
    setBusy(label);
    try { await work(); }
    catch (e) { alert(`${label}: ${e.message}`); }
    finally { setBusy(null); setOpen(false); onAfterAction?.(); }
  };

  const post = async (path, body) => {
    const token = getAccessToken();
    const r = await fetch(`${AUTH_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={!!busy}
        className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-[var(--surface-alt)] disabled:opacity-50 inline-flex items-center gap-1"
        title="Manual actions"
      >
        ⋯ Actions ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-[var(--surface-elev)] border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg min-w-[240px] overflow-hidden text-xs">
            <button
              className="w-full text-left px-3 py-2 hover:bg-[var(--surface-alt)] inline-flex items-center gap-2"
              onClick={() => run("Sync YT", async () => {
                if (!window.confirm("Force-run YT sync? Bypasses cooldown.")) return;
                const { json } = await post(`/clients/sync?force=1`);
                alert(json?.synced != null ? `Sync ✓ Synced ${json.synced} creators.` : `Result: ${JSON.stringify(json)}`);
              })}
            >▶ <span>Sync YT now</span></button>
            <button
              className="w-full text-left px-3 py-2 hover:bg-[var(--surface-alt)] inline-flex items-center gap-2"
              onClick={() => run("Test webhook", async () => {
                const { json } = await post(`/admin/agency/discord/test`, { channel: "default" });
                alert(json?.result?.ok ? "Discord ping ✓" : `Result: ${JSON.stringify(json)}`);
              })}
            >🔔 <span>Test Discord webhook</span></button>
            <button
              className="w-full text-left px-3 py-2 hover:bg-[var(--surface-alt)] inline-flex items-center gap-2"
              onClick={() => run("Run digest", async () => {
                if (!window.confirm("Force-run weekly digest now? Resets 6.5-day timer.")) return;
                const { json } = await post(`/admin/agency/weekly-digest/run`, { force: true });
                alert(json?.totals ? `Digest sent ✓\n${json.totals.posted_count} shipped · ₹${(json.totals.paid_total||0).toLocaleString("en-IN")} paid` : `Result: ${JSON.stringify(json)}`);
              })}
            >📊 <span>Run weekly digest</span></button>
            <button
              className="w-full text-left px-3 py-2 hover:bg-[var(--surface-alt)] inline-flex items-center gap-2"
              onClick={() => run("Editor summary", async () => {
                if (!window.confirm("Force-run per-editor summary now?")) return;
                const { json } = await post(`/admin/agency/editor-summary/run`, { force: true });
                alert(json?.counts ? `Editor summary sent ✓\n${json.counts.salaried} salaried · ${json.counts.freelance} freelance` : `Result: ${JSON.stringify(json)}`);
              })}
            >👥 <span>Run editor summary</span></button>
            <div className="border-t border-neutral-100 dark:border-neutral-900 my-1" />
            <button
              className="w-full text-left px-3 py-2 hover:bg-[var(--surface-alt)] inline-flex items-center gap-2"
              onClick={() => run("Auto-promote", async () => {
                const { json } = await post(`/admin/agency/projects/auto-promote-website`, {});
                alert(json?.promoted != null ? `Auto-promoted ${json.promoted} of ${json.candidates} candidates.` : `Result: ${JSON.stringify(json)}`);
              })}
            >🌐 <span>Auto-promote → website</span></button>
            <button
              className="w-full text-left px-3 py-2 hover:bg-[var(--surface-alt)] inline-flex items-center gap-2"
              onClick={() => run("Pulse diag", async () => {
                const token = getAccessToken();
                const r = await fetch(`${AUTH_BASE}/admin/agency/diag/pulse`, {
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                  credentials: "include",
                });
                const j = await r.json();
                alert(`Pulse total: ${j.pulse_total} · keys: ${j.yt_api_keys_configured} · clients with YT: ${j.clients_with_youtube_id}`);
              })}
            >🩺 <span>Pulse diagnostics</span></button>
          </div>
        </>
      )}
    </div>
  );
}

// Compact quick-action banner — surfaces today's "to do" items derived from data.
function QuickActionsBanner({ snapshot }) {
  if (!snapshot) return null;
  const pendingSeo = (snapshot.pending_seo || []).length;
  const spikes = (snapshot.active_spikes || []).length;
  const overperformers = (snapshot.competitor_overperformers || []).length;
  const researchPending = (snapshot.clients || []).length - (snapshot.today_research || []).length;
  const projectCount = Object.values(snapshot.projects_by_status || {}).reduce((a, b) => a + b, 0);
  const items = [];
  if (pendingSeo > 0)     items.push({ label: `${pendingSeo} SEO pending`,                color: "bg-yellow-500/10 text-yellow-600",  href: null });
  if (spikes > 0)         items.push({ label: `${spikes} active spike${spikes>1?"s":""}`, color: "bg-red-500/10 text-red-500 animate-pulse", href: null });
  if (overperformers > 0) items.push({ label: `${overperformers} competitor overperformer${overperformers>1?"s":""}`, color: "bg-orange-500/10 text-orange-500", href: null });
  if (researchPending > 0 && researchPending !== (snapshot.clients||[]).length) items.push({ label: `${researchPending} research pending`, color: "bg-blue-500/10 text-blue-500", href: null });
  if (items.length === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--surface-elev)]">
      <span className="text-[10px] uppercase tracking-wider text-neutral-500">Needs attention:</span>
      {items.map((it, i) => (
        <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${it.color}`}>
          {it.label}
        </span>
      ))}
    </div>
  );
}

// Tab navigation for cockpit sections.
const COCKPIT_TABS = [
  { key: "overview",   label: "Overview" },
  { key: "pipeline",   label: "Pipeline" },
  { key: "finance",    label: "Finance" },
  { key: "team",       label: "Team" },
  { key: "automation", label: "Automation" },
];
function CockpitTabs({ active, onChange }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto -mx-1 px-1 border-b border-neutral-200 dark:border-neutral-800">
      {COCKPIT_TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 md:px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
            active === t.key
              ? "border-[var(--orange)] text-[var(--orange)]"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Test webhook dropdown — pings each configured Discord channel.
function DiscordTestButton() {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const send = async (channel) => {
    setBusy(true);
    try {
      const token = getAccessToken();
      const r = await fetch(`${AUTH_BASE}/admin/agency/discord/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
        body: JSON.stringify({ channel }),
      });
      const j = await r.json();
      if (j?.result?.ok) alert(`Discord test sent to ${channel} channel ✓`);
      else if (j?.result?.skipped) {
        const setupCmd = channel === "ops"
          ? "npx wrangler secret put DISCORD_OPS_WEBHOOK_URL"
          : channel === "finance"
          ? "npx wrangler secret put DISCORD_FINANCE_WEBHOOK_URL"
          : "npx wrangler secret put DISCORD_WEBHOOK_URL";
        alert(`No webhook for "${channel}" channel.\n\nSet one with:\n${setupCmd}\n\nOr it falls back to the default webhook.`);
      } else alert("Discord test failed: " + JSON.stringify(j));
    } catch (e) { alert("Discord test error: " + e.message); }
    finally { setBusy(false); setOpen(false); }
  };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-[var(--surface-alt)] disabled:opacity-50"
        title="Send a test ping to a Discord webhook"
      >
        🔔 Test webhook ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-[var(--surface-elev)] border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg min-w-[180px] overflow-hidden">
            <button onClick={() => send("default")} className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface-alt)]">🔔 Default (catch-all)</button>
            <button onClick={() => send("ops")}     className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface-alt)]">🎬 Ops (posted, on-website)</button>
            <button onClick={() => send("finance")} className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface-alt)]">💰 Finance (paid, payouts)</button>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, accent = "neutral" }) {
  const accentClasses = {
    neutral: "border-neutral-200 dark:border-neutral-800",
    orange: "border-[var(--orange)]/30",
    danger: "border-red-500/30",
    success: "border-green-500/30",
  };
  return (
    <div className={`rounded-xl border-2 ${accentClasses[accent]} p-4 bg-[var(--surface-elev)]`}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-500 mb-2">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, action }) {
  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-[var(--surface-elev)]">
      <header className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-900">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          {Icon && <Icon size={15} className="text-[var(--orange)]" />}
          {title}
        </h3>
        {action}
      </header>
      <div>{children}</div>
    </section>
  );
}

// ---- main component --------------------------------------------------------
export default function OpsCockpit() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(() => {
    // URL ?tab=... takes precedence (Cmd+K deep links), then localStorage, then default
    try {
      const urlTab = new URLSearchParams(window.location.search).get("tab");
      if (urlTab && COCKPIT_TABS.some(t => t.key === urlTab)) return urlTab;
      return localStorage.getItem("shinel_cockpit_tab") || "overview";
    } catch { return "overview"; }
  });
  // Persist tab selection across page reloads
  useEffect(() => {
    try { localStorage.setItem("shinel_cockpit_tab", tab); } catch {}
  }, [tab]);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [busyClientId, setBusyClientId] = useState(null);
  const [igModalClient, setIgModalClient] = useState(null);
  const [driveModalClient, setDriveModalClient] = useState(null);

  const fetchSnapshot = useCallback(async () => {
    try {
      const token = getAccessToken();
      const qs = showInactive ? "?show_inactive=true" : "";
      const res = await fetch(`${AUTH_BASE}/admin/agency/ops/snapshot${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (res.status === 401) {
        setError("Not authorized — log in as a team member.");
        return;
      }
      if (!res.ok) {
        setError(`API ${res.status}: ${await res.text()}`);
        return;
      }
      const json = await res.json();
      setData(json);
      setError(null);
      setLastRefresh(new Date().toISOString());
    } catch (e) {
      setError(e?.message || "fetch failed");
    } finally {
      setLoading(false);
    }
  }, [showInactive]); // refetch whenever Active-only/All toggle flips

  // Initial fetch + 30s poll
  useEffect(() => {
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 30_000);
    return () => clearInterval(interval);
  }, [fetchSnapshot]);

  // Mark a client active/inactive/paused — admin-only action visible per row
  const setClientStatus = useCallback(async (clientId, newStatus) => {
    setBusyClientId(clientId);
    try {
      const token = getAccessToken();
      const res = await fetch(`${AUTH_BASE}/admin/agency/clients/${encodeURIComponent(clientId)}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      await fetchSnapshot();
    } catch (e) {
      console.error("setClientStatus failed:", e);
    } finally {
      setBusyClientId(null);
    }
  }, [fetchSnapshot]);

  if (loading && !data) {
    return (
      <div className="p-6 text-neutral-500">
        <RefreshCw className="animate-spin inline mr-2" size={16} />
        Loading ops cockpit…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="rounded-xl border-2 border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 text-red-500 font-bold mb-1">
            <AlertCircle size={16} /> Couldn't load snapshot
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">{error}</div>
          <button onClick={fetchSnapshot} className="btn-editorial-ghost mt-3 text-sm">
            <RefreshCw size={14} className="inline mr-1" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const d = data || {};
  const clients = d.clients || [];
  const pendingSeo = d.pending_seo || [];
  const recentSeo = d.recent_seo || [];
  const spikes = d.active_spikes || [];
  const overperformers = d.competitor_overperformers || [];
  const todayResearch = d.today_research || [];
  const agentLog = d.recent_agent_log || [];
  const projectStatus = d.projects_by_status || {};

  return (
    <div className="p-4 md:p-6 max-w-[1500px] mx-auto">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-kicker text-[var(--orange)]">Live ops</div>
          <h1 className="text-display-md font-bold mt-1">
            Cockpit <span style={{ color: "var(--orange)" }}>·</span> all clients
          </h1>
          <div className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
            <span>Auto-refresh every 30s</span>
            {lastRefresh && (
              <>
                <span>·</span>
                <span>last: {fmtTime(lastRefresh)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
            <span className="text-neutral-500">Show:</span>
            <button
              onClick={() => setShowInactive(false)}
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                !showInactive
                  ? "bg-[var(--orange)] text-white"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Active only{d.client_counts?.active ? ` (${d.client_counts.active})` : ""}
            </button>
            <button
              onClick={() => setShowInactive(true)}
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                showInactive
                  ? "bg-[var(--orange)] text-white"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              All ({Object.values(d.client_counts || {}).reduce((a, b) => a + b, 0) || "?"})
            </button>
          </div>
          <button onClick={fetchSnapshot} className="btn-editorial-ghost text-sm">
            <RefreshCw size={14} className={`inline mr-1 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            to="/dashboard/projects"
            className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-[var(--surface-alt)] inline-flex items-center gap-1"
            title="Open the full Projects page"
          >
            <Target size={12} /> <span className="hidden sm:inline">Projects</span>
          </Link>
          <ActionsMenu onAfterAction={fetchSnapshot} />
          <AddSomethingButton clients={clients} onChange={fetchSnapshot} />
        </div>
      </header>

      <QuickActionsBanner snapshot={d} />
      <CockpitTabs active={tab} onChange={setTab} />

      {/* Stat tiles row — overview tab only; other tabs go straight to their panel */}
      {tab !== "overview" && (
        <div className="mb-4 text-xs text-neutral-500">
          Showing: <strong className="text-neutral-700 dark:text-neutral-300">{COCKPIT_TABS.find(t => t.key === tab)?.label}</strong>
          {" · "}<button onClick={() => setTab("overview")} className="text-[var(--orange)] hover:underline">back to Overview</button>
        </div>
      )}

      {/* Top stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatTile icon={Users} label="Clients" value={clients.length} sub="Active fleet" />
        <StatTile
          icon={TrendingUp}
          label="Total reach"
          value={fmtNum(d.total_reach || 0)}
          sub="YT subs + IG followers"
          accent={d.total_reach > 0 ? "success" : "neutral"}
        />
        <StatTile icon={Eye} label="Videos" value={d.video_count ?? 0} sub="In media library" />
        <StatTile icon={Activity} label="Thumbnails" value={d.thumbnail_count ?? 0} sub="Designed" />
        <StatTile
          icon={Clock}
          label="Pending SEO"
          value={pendingSeo.length}
          sub={pendingSeo.length > 0 ? "Awaiting writeback" : "All applied"}
          accent={pendingSeo.length > 0 ? "orange" : "success"}
        />
        <StatTile
          icon={Flame}
          label="Active spikes"
          value={spikes.length}
          sub="Patch days · tournaments"
          accent={spikes.length > 0 ? "orange" : "neutral"}
        />
        <StatTile
          icon={TrendingUp}
          label="Overperformers"
          value={overperformers.length}
          sub="Competitor videos > 2× median"
          accent={overperformers.length > 0 ? "orange" : "neutral"}
        />
        <StatTile
          icon={CheckCircle2}
          label="Today's research"
          value={`${todayResearch.length}/${clients.length}`}
          sub="Per-client daily files"
          accent={todayResearch.length === clients.length ? "success" : "orange"}
        />
      </div>

      {/* Two-column body — Overview tab shows clients/SEO/spikes/research grid.
          Other tabs hide it and just render their dedicated panel below. */}
      <div className={tab === "overview" ? "grid grid-cols-1 lg:grid-cols-2 gap-5" : "hidden"}>
        {/* LEFT — clients + pending SEO */}
        <div className="space-y-5">
          <SectionCard title="Clients" icon={Users}>
            <div className="space-y-2">
              {clients.map((c) => {
                const status = (c.status || "active").toLowerCase();
                const isInactive = status === "inactive";
                const isPaused = status === "paused";
                const isTrackedOnly = c.managed_by_us === 0; // Vib n Ric, Deadlox
                return (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 transition group ${
                      isInactive
                        ? "border-neutral-300 dark:border-neutral-700 opacity-60 hover:opacity-100"
                        : isPaused
                        ? "border-yellow-500/30 bg-yellow-500/5"
                        : isTrackedOnly
                        ? "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10"
                        : "border-neutral-100 dark:border-neutral-900 hover:bg-[var(--surface-alt)]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/dashboard/clients/${encodeURIComponent(c.id)}`}
                          className="truncate hover:text-[var(--orange)] hover:underline"
                          title="Open per-client deep-dive page"
                        >
                          {c.name}
                        </Link>
                        {isInactive && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Inactive</span>
                        )}
                        {isPaused && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600 uppercase tracking-wider">Paused</span>
                        )}
                        {isTrackedOnly && !isInactive && !isPaused && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 uppercase tracking-wider"
                            title="Tracked only — we monitor but don't publish on their behalf"
                          >
                            Tracked
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 flex items-center gap-1.5 flex-wrap">
                        <span>{c.niche_tag || "—"}</span>
                        {c.retainer_tier && c.retainer_tier !== "TBD" && c.retainer_tier !== "internal" && <span>· {c.retainer_tier}</span>}
                        {c.retainer_tier === "internal" && <span>· internal</span>}
                        {c.yt_channel_count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-bold">
                            {c.yt_channel_count} YT
                          </span>
                        )}
                        {c.ig_account_count > 0 && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-500 font-bold"
                            title={`${c.ig_managed_count} of ${c.ig_account_count} managed by us`}
                          >
                            {c.ig_account_count} IG{c.ig_managed_count > 0 && c.ig_managed_count < c.ig_account_count ? ` (${c.ig_managed_count} managed)` : ""}
                          </span>
                        )}
                        {!c.yt_channel_count && c.ig_account_count > 0 && (
                          <span className="text-[10px] uppercase tracking-wider">· IG-only</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* YT + IG counts shown separately. Falls back to single 'subs'
                          field for legacy rows that don't have aggregated totals. */}
                      <div className="text-right">
                        {(c.yt_subs_total > 0 || c.yt_channel_count > 0) && (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-mono-num text-sm font-semibold">{fmtNum(c.yt_subs_total || c.subscribers || 0)}</span>
                            <span className="text-[9px] uppercase tracking-wider px-1 rounded bg-red-500/10 text-red-500">YT</span>
                          </div>
                        )}
                        {(c.ig_followers_total > 0 || c.ig_account_count > 0) && (
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            <span className="text-mono-num text-sm font-semibold">{fmtNum(c.ig_followers_total || 0)}</span>
                            <span className="text-[9px] uppercase tracking-wider px-1 rounded bg-pink-500/10 text-pink-500">IG</span>
                          </div>
                        )}
                        {(!c.yt_subs_total && !c.subscribers && !c.ig_followers_total && !c.ig_account_count) && (
                          <>
                            <div className="text-mono-num text-sm font-semibold">—</div>
                            <div className="text-[10px] uppercase tracking-wider text-neutral-500">no socials</div>
                          </>
                        )}
                      </div>
                      {/* Drive shortcut — visible if folder set; click goes to folder */}
                      {c.drive_folder_url && (
                        <a
                          href={c.drive_folder_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 font-bold hover:bg-blue-500/25 mr-2"
                          title={`Open Drive folder: ${c.drive_folder_url}`}
                        >
                          📁 Drive
                        </a>
                      )}
                      {/* Hover actions: status toggle + add IG + drive */}
                      <div className="opacity-0 group-hover:opacity-100 transition flex flex-col gap-0.5">
                        <button
                          onClick={() => setIgModalClient(c)}
                          className="text-[10px] px-1.5 py-0.5 rounded text-pink-500 hover:bg-pink-500/10"
                          title="Add Instagram handle"
                        >
                          + IG
                        </button>
                        <button
                          onClick={() => setDriveModalClient(c)}
                          className="text-[10px] px-1.5 py-0.5 rounded text-blue-500 hover:bg-blue-500/10"
                          title={c.drive_folder_url ? "Change Drive folder" : "Set Drive folder"}
                        >
                          {c.drive_folder_url ? "Drive" : "+ Drive"}
                        </button>
                        {!isInactive ? (
                          <button
                            onClick={() => setClientStatus(c.id, "inactive")}
                            disabled={busyClientId === c.id}
                            className="text-[10px] px-1.5 py-0.5 rounded text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-50"
                            title="Mark inactive — won't appear in default cockpit view"
                          >
                            Inactive
                          </button>
                        ) : (
                          <button
                            onClick={() => setClientStatus(c.id, "active")}
                            disabled={busyClientId === c.id}
                            className="text-[10px] px-1.5 py-0.5 rounded text-green-600 hover:bg-green-500/10 disabled:opacity-50"
                            title="Mark active — restore to fleet"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {clients.length === 0 && (
                <div className="text-sm text-neutral-500 py-4 text-center">
                  {showInactive ? "No clients in DB." : "No active clients. Toggle 'All' above to see archived ones."}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Pending SEO Queue"
            icon={Clock}
            action={
              pendingSeo.length > 0 ? (
                <span className="text-xs text-[var(--orange)] font-bold">{pendingSeo.length} awaiting</span>
              ) : null
            }
          >
            {pendingSeo.length === 0 ? (
              <div className="text-sm text-neutral-500 py-4 text-center flex items-center justify-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" />
                All RESEO actions applied
              </div>
            ) : (
              <ul className="space-y-2">
                {pendingSeo.slice(0, 8).map((s) => (
                  <li key={s.id} className="text-xs border-l-2 border-[var(--orange)] pl-3 py-1">
                    <div className="font-semibold truncate" title={s.new_title}>
                      {s.new_title || "(no title)"}
                    </div>
                    <div className="text-neutral-500 mt-0.5">
                      {s.client_id} · {s.asset_type} · {s.action} · {fmtRelative(s.created_at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Recently Applied SEO" icon={CheckCircle2}>
            {recentSeo.length === 0 ? (
              <div className="text-sm text-neutral-500 py-4 text-center">No applied actions yet.</div>
            ) : (
              <ul className="space-y-2">
                {recentSeo.slice(0, 6).map((s) => (
                  <li key={s.id} className="text-xs border-l-2 border-green-500 pl-3 py-1">
                    <div className="font-semibold truncate">{s.new_title || "(batch)"}</div>
                    <div className="text-neutral-500 mt-0.5">
                      {s.client_id} · {s.asset_type} · ✓ applied {fmtRelative(s.applied_at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* RIGHT — spikes + overperformers + research + agent log */}
        <div className="space-y-5">
          <SectionCard
            title="Active News Spikes"
            icon={Flame}
            action={
              spikes.length > 0 ? (
                <span className="text-xs text-[var(--orange)] font-bold">{spikes.length} active</span>
              ) : null
            }
          >
            {spikes.length === 0 ? (
              <div className="text-sm text-neutral-500 py-4 text-center">No active spikes.</div>
            ) : (
              <ul className="space-y-2">
                {spikes.map((s) => (
                  <li key={s.id} className="text-xs border-l-2 border-red-500 pl-3 py-1">
                    <div className="font-semibold flex items-center gap-2">
                      <span>{s.title}</span>
                      {s.spike_score && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-bold">
                          {s.spike_score}/12
                        </span>
                      )}
                    </div>
                    <div className="text-neutral-500 mt-0.5">
                      {s.niche_tag} · until {s.trend_window_end || "—"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Competitor Overperformers"
            icon={TrendingUp}
            action={
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">today's snapshot</span>
            }
          >
            {overperformers.length === 0 ? (
              <div className="text-sm text-neutral-500 py-4 text-center">
                No competitor videos {">"}2× recent median today.
              </div>
            ) : (
              <ul className="space-y-2">
                {overperformers.slice(0, 6).map((o, i) => {
                  const items = o.overperformers || [];
                  return (
                    <li key={i} className="text-xs border-l-2 border-blue-500 pl-3 py-1">
                      <div className="font-semibold">
                        {o.client_id} · {fmtNum(o.subs)} subs
                      </div>
                      {items.slice(0, 2).map((vid, j) => (
                        <div key={j} className="text-neutral-500 mt-0.5 truncate">
                          {vid.ratio}× · {vid.title}
                        </div>
                      ))}
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Today's Research" icon={Calendar}>
            <div className="grid grid-cols-2 gap-2">
              {clients.map((c) => {
                const hasResearch = todayResearch.some((r) => r.client_id === c.id);
                return (
                  <div
                    key={c.id}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      hasResearch
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-neutral-200 dark:border-neutral-800"
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      {hasResearch ? (
                        <CheckCircle2 size={12} className="text-green-500" />
                      ) : (
                        <Clock size={12} className="text-neutral-400" />
                      )}
                      <span className="truncate">{c.name}</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">
                      {hasResearch ? "Generated" : "Pending"}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Overview-only: pipeline preview lives inside the right column. */}
          {tab === "overview" && (
            <PipelineKanban
              clients={clients}
              projectStatus={projectStatus}
              onChange={fetchSnapshot}
            />
          )}

          {/* Inline collapsed status counts (compact) */}
          {tab === "overview" && Object.keys(projectStatus).length > 0 && (
            <SectionCard title="Status counts" icon={Target}>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {["planned", "started", "in-progress", "completed", "paid", "posted", "added-to-website", "archive"].map(
                  (status) => {
                    const n = projectStatus[status] || 0;
                    if (n === 0) return null;
                    return (
                      <div key={status} className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-2 py-2 text-center">
                        <div className="text-lg font-bold tabular-nums">{n}</div>
                        <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                          {status}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Recent Agent Activity" icon={Activity}>
            {agentLog.length === 0 ? (
              <div className="text-sm text-neutral-500 py-4 text-center">No activity logged yet.</div>
            ) : (
              <ul className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {agentLog.slice(0, 30).map((entry) => (
                  <li
                    key={entry.id}
                    className={`text-[11px] flex gap-2 py-1 border-b border-neutral-100 dark:border-neutral-900 last:border-0 ${
                      entry.level === "error"
                        ? "text-red-500"
                        : entry.level === "warn"
                        ? "text-[var(--orange)]"
                        : "text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    <span className="text-neutral-400 tabular-nums w-12 shrink-0">
                      {fmtTime(entry.created_at)}
                    </span>
                    <span className="font-mono text-[10px] uppercase shrink-0 w-20 truncate">
                      {entry.action}
                    </span>
                    <span className="truncate">{entry.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Tab-gated full-width panels — render BELOW the overview grid */}
      {tab === "pipeline" && (
        <PipelineKanban clients={clients} projectStatus={projectStatus} onChange={fetchSnapshot} />
      )}
      {tab === "finance" && <FinancePanel />}
      {tab === "team" && <TeamPanel onChange={fetchSnapshot} />}
      {tab === "automation" && (
        <div className="space-y-5">
          <ScheduledTasksPanel clients={clients} />
          <LaptopQueuePanel clients={clients} />
        </div>
      )}

      {/* Footer note */}
      <footer className="mt-6 text-xs text-neutral-500 text-center">
        Data from <code className="bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 rounded">/admin/agency/ops/snapshot</code>
        {" · "}
        Polls every 30 seconds
        {" · "}
        See <Link to="/dashboard" className="text-[var(--orange)] hover:underline">main dashboard</Link>
      </footer>

      {/* Add IG modal */}
      {igModalClient && (
        <AddIgModal
          client={igModalClient}
          onClose={() => setIgModalClient(null)}
          onSaved={() => { setIgModalClient(null); fetchSnapshot(); }}
        />
      )}
      {/* Set Drive folder modal */}
      {driveModalClient && (
        <SetDriveModal
          client={driveModalClient}
          onClose={() => setDriveModalClient(null)}
          onSaved={() => { setDriveModalClient(null); fetchSnapshot(); }}
        />
      )}
    </div>
  );
}

// ----- SetDriveModal: pin a Google Drive folder URL to a client. -------------
function SetDriveModal({ client, onClose, onSaved }) {
  const [url, setUrl] = React.useState(client.drive_folder_url || "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${AUTH_BASE}/admin/agency/clients/${encodeURIComponent(client.id)}/drive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ drive_folder_url: url.trim() || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `API ${res.status}`);
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">{client.name}</div>
            <h3 className="text-lg font-bold mt-1">📁 Drive folder</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Drive folder URL</label>
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="https://drive.google.com/drive/folders/abc123..."
              className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono"
            />
            <p className="text-[10px] text-neutral-500 mt-1">
              Paste the share-link URL of this client's main Drive folder. Cockpit will show a 📁 Drive button to jump there. Leave blank to remove.
            </p>
          </div>
          {error && <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800">Cancel</button>
          <button onClick={save} disabled={busy} className="text-sm px-4 py-2 rounded-lg bg-blue-500 text-white font-bold disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- AddIgModal: tiny modal to add an IG handle to a client. ---------------
function AddIgModal({ client, onClose, onSaved }) {
  const [handle, setHandle] = React.useState("");
  const [managed, setManaged] = React.useState(false);
  const [role, setRole] = React.useState("main");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);

  const save = async () => {
    if (!handle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${AUTH_BASE}/admin/agency/instagram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          client_id: client.id,
          handle: handle.trim(),
          role,
          managed_by_us: managed,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `API ${res.status}`);
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">{client.name}</div>
            <h3 className="text-lg font-bold mt-1">Add Instagram</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Handle</label>
            <input
              autoFocus
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="@username or username"
              className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
                <option value="main">main</option>
                <option value="secondary">secondary</option>
                <option value="reels-only">reels-only</option>
                <option value="fan-page">fan-page</option>
                <option value="business">business</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={managed}
                  onChange={(e) => setManaged(e.target.checked)}
                  className="rounded"
                />
                <span>We manage it</span>
              </label>
            </div>
          </div>
          {error && (
            <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded">{error}</div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800">Cancel</button>
          <button onClick={save} disabled={busy || !handle.trim()} className="text-sm px-4 py-2 rounded-lg bg-pink-500 text-white font-bold disabled:opacity-50">
            {busy ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
