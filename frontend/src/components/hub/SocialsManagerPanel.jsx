/**
 * SocialsManagerPanel — single-pane glass for every client's socials.
 *
 *   Row per client (active first), with:
 *     - status pill (active / paused / inactive) — click to cycle
 *     - YouTube channels: each shows handle + sub count + a "managed" toggle
 *     - Instagram accounts: each shows handle + follower count + a "managed" toggle
 *
 * Rules the backend enforces (so the UI just has to render the truth):
 *   - Pulse fan-out runs only when client.status='active' AND social.managed_by_us=1.
 *   - Reach / marquee / homepage stats still aggregate every client regardless,
 *     because their historical work counts toward total reach.
 *
 * No drag-drop, no modals — every state mutation is a single click PATCH.
 */

import { useEffect, useMemo, useState } from "react";
import { Globe2, Youtube, Instagram, RefreshCw, Check, X as XIcon, Pencil } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken } from "../../utils/tokenStore";
import EditClientModal from "./EditClientModal";

// Local authedFetch matches the (path, opts) pattern every other panel uses.
// The tokenStore export uses (apiBase, path, init) which trips the panels up.
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

const STATUS_OPTIONS = ["active", "paused", "inactive"];
const STATUS_TONE = {
  active:   "bg-green-500/15 text-green-700 dark:text-green-300",
  paused:   "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  inactive: "bg-neutral-500/15 text-neutral-500 dark:text-neutral-400",
};

function fmtCount(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export default function SocialsManagerPanel() {
  const [data, setData] = useState({ clients: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | active | inactive
  const [busy, setBusy] = useState({});
  const [editing, setEditing] = useState(null); // client object when modal open

  async function load() {
    setLoading(true);
    try {
      const res = await authedFetch(`/admin/agency/socials`);
      const j = await res.json();
      if (res.ok) { setData(j); return j; }
      return null;
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function patchClientStatus(client, nextStatus) {
    setBusy((b) => ({ ...b, [`c-${client.id}`]: true }));
    try {
      const res = await authedFetch(`/admin/agency/clients/${client.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(`Failed: ${j.error || res.status}`); }
      await load();
    } finally { setBusy((b) => { const n = { ...b }; delete n[`c-${client.id}`]; return n; }); }
  }

  async function patchChannelManaged(ch, val) {
    setBusy((b) => ({ ...b, [`ch-${ch.id}`]: true }));
    try {
      const res = await authedFetch(`/admin/agency/channels/${ch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managed_by_us: val ? 1 : 0 }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(`Failed: ${j.error || res.status}`); }
      await load();
    } finally { setBusy((b) => { const n = { ...b }; delete n[`ch-${ch.id}`]; return n; }); }
  }

  async function patchIgManaged(ig, val) {
    setBusy((b) => ({ ...b, [`ig-${ig.id}`]: true }));
    try {
      const res = await authedFetch(`/admin/agency/instagram/${ig.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managed_by_us: val ? 1 : 0 }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(`Failed: ${j.error || res.status}`); }
      await load();
    } finally { setBusy((b) => { const n = { ...b }; delete n[`ig-${ig.id}`]; return n; }); }
  }

  // Hide deleted clients (status='old') from the Socials Manager entirely —
  // they're soft-deleted under the hood but the founder shouldn't see them.
  // Restore happens via /admin/agency/socials/reconcile if ever needed.
  const visibleClients = useMemo(
    () => data.clients.filter((c) => c.status !== "old"),
    [data.clients]
  );
  const filtered = useMemo(() => {
    if (filter === "all")    return visibleClients;
    if (filter === "active") return visibleClients.filter((c) => c.status === "active");
    if (filter === "paused") return visibleClients.filter((c) => c.status === "paused" || c.status === "inactive");
    return visibleClients;
  }, [visibleClients, filter]);

  const totalActive = visibleClients.filter((c) => c.status === "active").length;
  const totalPaused = visibleClients.filter((c) => c.status === "paused" || c.status === "inactive").length;

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-[var(--surface-elev)] space-y-4">
      <header className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-900">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          <Globe2 size={15} className="text-[var(--orange)]" />
          Socials Manager
          {data.totals?.clients != null && (
            <span className="text-xs text-neutral-500 font-normal">
              · {data.totals.clients} clients · {data.totals.managed_channels}/{data.totals.channels} YT · {data.totals.managed_instagram}/{data.totals.instagram} IG managed
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs rounded border border-neutral-300 dark:border-neutral-700 px-2 py-1 bg-[var(--surface-alt)]"
          >
            <option value="all">All ({visibleClients.length})</option>
            <option value="active">Active ({totalActive})</option>
            <option value="paused">Paused / Inactive ({totalPaused})</option>
          </select>
          <button
            onClick={async () => {
              if (!confirm("Reconcile every client's legacy youtube_id / instagram_handle with the canonical multi-row tables? Safe to re-run any time.")) return;
              try {
                const r = await authedFetch(`/admin/agency/socials/reconcile`, { method: "POST" });
                const j = await r.json().catch(() => ({}));
                if (!r.ok) { alert(`Failed: ${j.error || r.status}`); return; }
                const sample = (j.diffs || []).slice(0, 8).map((d) => `${d.name}: ${JSON.stringify(d.after)}`).join("\n");
                alert(`Scanned ${j.scanned}. Updated ${j.updated}.\n\n${sample || "(no drift — everything already in sync)"}`);
                load();
              } catch (e) { alert("Network error: " + e.message); }
            }}
            className="text-xs px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-[var(--surface-alt)]"
            title="Resync clients.youtube_id + clients.instagram_handle with the canonical client_channels + instagram_accounts tables"
          >
            Reconcile
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-[var(--surface-alt)] flex items-center gap-1"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-neutral-500 py-6 text-center">Loading socials…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral-500 py-6 text-center">No clients match the filter.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => (
            <li key={c.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 bg-[var(--surface-alt)]">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => setEditing(c)}
                    className="text-sm font-bold truncate hover:text-[var(--orange)] hover:underline flex items-center gap-1.5 text-left"
                    title="Open the full editor — add/remove channels, edit handles, change roles"
                  >
                    {c.name}
                    <Pencil size={11} className="opacity-50 group-hover:opacity-100 shrink-0" />
                  </button>
                  <select
                    value={c.status || "inactive"}
                    onChange={(e) => patchClientStatus(c, e.target.value)}
                    disabled={busy[`c-${c.id}`]}
                    className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border-0 ${STATUS_TONE[c.status] || STATUS_TONE.inactive}`}
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="text-[10px] text-neutral-500">
                  {c.channels.length} YT · {c.instagram.length} IG
                </div>
              </div>

              {/* YouTube channels */}
              {c.channels.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {c.channels.map((ch) => (
                    <li key={ch.id} className="flex items-center gap-2 text-xs">
                      <Youtube size={12} className="text-red-500 shrink-0" />
                      <span className="font-mono text-[12px] truncate flex-1 text-neutral-800 dark:text-neutral-200">
                        {ch.handle ? `@${ch.handle.replace(/^@/, "")}` : ch.channel_id}
                        <span className="text-neutral-600 dark:text-neutral-400 ml-1.5 font-sans uppercase text-[10px] font-bold tracking-wider">{ch.role}</span>
                        <span className="text-neutral-600 dark:text-neutral-400 ml-1.5 font-sans text-[11px]">· {fmtCount(ch.subscribers)} subs</span>
                      </span>
                      <ManagedToggle
                        value={!!ch.managed_by_us}
                        onChange={(v) => patchChannelManaged(ch, v)}
                        disabled={busy[`ch-${ch.id}`]}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {/* Instagram accounts */}
              {c.instagram.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {c.instagram.map((ig) => (
                    <li key={ig.id} className="flex items-center gap-2 text-xs">
                      <Instagram size={12} className="text-pink-500 shrink-0" />
                      <span className="font-mono text-[12px] truncate flex-1 text-neutral-800 dark:text-neutral-200">
                        @{(ig.handle || "").replace(/^@/, "")}
                        <span className="text-neutral-600 dark:text-neutral-400 ml-1.5 font-sans uppercase text-[10px] font-bold tracking-wider">{ig.role}</span>
                        <span className="text-neutral-600 dark:text-neutral-400 ml-1.5 font-sans text-[11px]">· {fmtCount(ig.follower_count)} followers</span>
                      </span>
                      <ManagedToggle
                        value={!!ig.managed_by_us}
                        onChange={(v) => patchIgManaged(ig, v)}
                        disabled={busy[`ig-${ig.id}`]}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {c.channels.length === 0 && c.instagram.length === 0 && (
                <p className="text-xs text-neutral-500 italic mt-1">No socials linked yet.</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <footer className="text-[11px] text-neutral-500 pt-2 border-t border-neutral-100 dark:border-neutral-900">
        <strong>Pulse:</strong> only fans out to clients with <code>status='active'</code> AND socials with <code>managed_by_us=1</code>.
        <br />
        <strong>Reach &amp; marquee:</strong> aggregate every client regardless of status, so historical work still shows on the homepage.
        <br />
        <strong>Tip:</strong> click any client name to open the full editor — add/remove channels + IG accounts, change roles, edit handles.
      </footer>

      {editing && (
        <EditClientModal
          client={editing}
          onClose={() => setEditing(null)}
          onChange={async () => {
            const fresh = await load();
            if (fresh?.clients) {
              const updated = fresh.clients.find((x) => x.id === editing.id);
              if (updated) setEditing(updated);
            }
          }}
        />
      )}
    </section>
  );
}

function ManagedToggle({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1 transition border ${
        value
          ? "bg-green-500/25 text-green-700 dark:text-green-300 border-green-500/40 hover:bg-green-500/35"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
      }`}
      title={value ? "Active for Pulse — we monitor this social" : "Tracked only — counts toward reach but Pulse won't sync uploads"}
    >
      {value ? <Check size={10} /> : <XIcon size={10} />}
      {value ? "we manage" : "tracked only"}
    </button>
  );
}
