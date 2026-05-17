/**
 * EditClientModal — one-stop editor for a client's full social roster.
 *
 * Opens from SocialsManagerPanel. Lets the founder:
 *   - change status (active / paused / inactive)
 *   - toggle managed_by_us per channel + per IG account
 *   - edit handle / role on any social row inline
 *   - add a new YT channel
 *   - add a new IG account
 *   - remove (soft-delete) any channel or IG account
 *
 * Every change is a single PATCH/POST/DELETE — no "save all" button.
 * The modal refetches /admin/agency/socials after each mutation so the
 * view stays consistent with the DB.
 */

import { useState } from "react";
import { X, Plus, Trash2, Youtube, Instagram, Check, Star, Sparkles } from "lucide-react";
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

const ROLE_OPTIONS = ["main", "secondary", "personal", "brand", "tracked"];
// Status pills inside the editor. 'old' (archived) is reachable via the
// Archive button at the bottom of the modal — putting it here would let
// a misclick instantly hide a client, so we surface it only on the pill
// when the client is ALREADY archived (so the founder can un-archive).
const STATUS_OPTIONS = ["active", "paused", "inactive"];

export default function EditClientModal({ client, onClose, onChange }) {
  const [busy, setBusy] = useState({});
  const [newYt, setNewYt] = useState({ channel_id: "", handle: "", role: "secondary" });
  const [newIg, setNewIg] = useState({ handle: "", role: "secondary", managed_by_us: true });
  const [err, setErr] = useState("");

  if (!client) return null;

  async function call(url, init, key) {
    setBusy((b) => ({ ...b, [key]: true })); setErr("");
    try {
      const res = await authedFetch(url, init);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error || `HTTP ${res.status}`); return false; }
      onChange?.();
      return j;
    } catch (e) { setErr(String(e.message || e)); return false; }
    finally { setBusy((b) => { const n = { ...b }; delete n[key]; return n; }); }
  }

  function patchStatus(s) {
    return call(
      `/admin/agency/clients/${client.id}/status`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s }) },
      `status`
    );
  }
  // Best-effort reconcile after mutations that could change "the main social"
  // (role change to/from 'main', delete, etc). Fire-and-forget so we never
  // block the UI on it.
  const reconcileSoon = () => {
    authedFetch(`/admin/agency/socials/reconcile`, { method: "POST" }).catch(() => {});
  };
  async function patchChannel(ch, body) {
    const r = await call(`/admin/agency/channels/${ch.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }, `ch-${ch.id}`);
    if (r && (body.role !== undefined || body.active !== undefined)) reconcileSoon();
    return r;
  }
  async function patchIg(ig, body) {
    const r = await call(`/admin/agency/instagram/${ig.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }, `ig-${ig.id}`);
    if (r && (body.role !== undefined || body.active !== undefined)) reconcileSoon();
    return r;
  }
  async function removeChannel(ch) {
    if (!confirm(`Remove channel @${ch.handle || ch.channel_id}? (Soft-delete — can be undone in D1.)`)) return;
    const r = await call(`/admin/agency/clients/${client.id}/channels/${ch.id}`, { method: "DELETE" }, `ch-${ch.id}`);
    if (r) reconcileSoon();
  }
  async function removeIg(ig) {
    if (!confirm(`Remove @${ig.handle}? (Soft-delete — sets active=0.)`)) return;
    await patchIg(ig, { active: 0 });
  }
  async function archiveClient() {
    const confirmText = prompt(
      `Archive "${client.name}"?\n\n` +
      `This hides them from every surface — Pulse, marquee, reach, cockpit Clients panel, /creators page. ` +
      `Their channels, IG accounts, projects, and history all stay in D1 so the data is preserved and can be restored.\n\n` +
      `Type DELETE to confirm:`
    );
    if (confirmText !== "DELETE") return;
    const r = await call(
      `/admin/agency/clients/${client.id}`,
      { method: "DELETE" },
      "archive"
    );
    if (r) {
      onClose();
    }
  }
  async function addChannel() {
    if (!newYt.channel_id.trim()) { setErr("YouTube channel ID or @handle required"); return; }
    // Accept full URL or just ID/handle — strip the URL prefix
    let chId = newYt.channel_id.trim();
    const m = chId.match(/youtube\.com\/(?:channel\/(UC[\w-]+)|@?([\w.-]+))/i);
    if (m) chId = m[1] || ("@" + m[2]);
    const handle = newYt.handle.replace(/^@/, "");
    const ok = await call(
      `/admin/agency/clients/${client.id}/channels`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: chId, handle: handle || null, role: newYt.role }) },
      `add-yt`
    );
    if (ok) {
      setNewYt({ channel_id: "", handle: "", role: "secondary" });
      // Auto-reconcile so clients.youtube_id picks up the new main if applicable.
      // Fire-and-forget — failure is non-fatal.
      authedFetch(`/admin/agency/socials/reconcile`, { method: "POST" }).catch(() => {});
    }
  }
  async function addIg() {
    if (!newIg.handle.trim()) { setErr("Instagram handle required"); return; }
    const cleanHandle = newIg.handle.replace(/^@/, "").trim();
    const ok = await call(
      `/admin/agency/instagram`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: client.id,
          handle: cleanHandle,
          url: `https://instagram.com/${cleanHandle}`,
          role: newIg.role,
          managed_by_us: newIg.managed_by_us ? 1 : 0,
        }) },
      `add-ig`
    );
    if (ok) {
      setNewIg({ handle: "", role: "secondary", managed_by_us: true });
      // Same: reconcile so clients.instagram_handle picks up the new main if applicable.
      authedFetch(`/admin/agency/socials/reconcile`, { method: "POST" }).catch(() => {});
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-[var(--surface-elev)] border border-neutral-200 dark:border-neutral-800 rounded-xl max-w-2xl w-full my-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">Edit Client</div>
            <h2 className="text-lg font-bold">{client.name}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--surface-alt)]"><X size={18} /></button>
        </header>

        {err && <p className="mx-5 mt-3 text-xs text-red-500 bg-red-500/10 rounded px-3 py-2">{err}</p>}

        <div className="p-5 space-y-5">
          {/* Status */}
          <section>
            <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-2">Status</div>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => patchStatus(s)}
                  disabled={busy.status}
                  className={`text-xs px-3 py-1.5 rounded font-bold uppercase tracking-wider ${
                    client.status === s
                      ? "bg-[var(--orange)] text-white"
                      : "bg-[var(--surface-alt)] hover:bg-[var(--surface)]"
                  }`}
                >
                  {client.status === s && <Check size={11} className="inline mr-1" />}
                  {s}
                </button>
              ))}
              {client.status === "old" && (
                <button
                  onClick={() => patchStatus("active")}
                  disabled={busy.status}
                  className="text-xs px-3 py-1.5 rounded font-bold uppercase tracking-wider bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/50 hover:bg-amber-500/50"
                  title="This client is currently archived. Click to un-archive (flip status back to active)."
                >
                  📦 archived — click to restore
                </button>
              )}
            </div>
          </section>

          {/* Public profile — controls what appears on /creators + the homepage hero */}
          <section>
            <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-2 flex items-center gap-1">
              <Sparkles size={11} className="text-[var(--orange)]" /> Public profile (homepage + /c/&lt;slug&gt;)
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-neutral-500 uppercase tracking-wider font-bold">Display name</label>
                <input
                  type="text"
                  defaultValue={client.display_name || ""}
                  placeholder={`(blank = use "${client.name}")`}
                  maxLength={60}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (client.display_name || "")) {
                      call(`/admin/agency/clients/${client.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ display_name: v || null }),
                      }, "display_name");
                    }
                  }}
                  className="w-full text-sm px-3 py-2 rounded bg-[var(--surface-alt)] border border-neutral-200 dark:border-neutral-700 focus:border-[var(--orange)] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-500 uppercase tracking-wider font-bold">Tagline · one-liner under name on cards</label>
                <input
                  type="text"
                  defaultValue={client.tagline || ""}
                  placeholder="e.g. India's top tattoo storyteller"
                  maxLength={80}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (client.tagline || "")) {
                      call(`/admin/agency/clients/${client.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ tagline: v }),
                      }, "tagline");
                    }
                  }}
                  className="w-full text-sm px-3 py-2 rounded bg-[var(--surface-alt)] border border-neutral-200 dark:border-neutral-700 focus:border-[var(--orange)] outline-none"
                />
                <p className="text-[10px] text-neutral-500 mt-1">Max 80 chars. Shown under the name on /creators cards and the homepage hero.</p>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked={!!client.public_enabled}
                    onChange={(e) => call(`/admin/agency/clients/${client.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ public_enabled: e.target.checked ? 1 : 0 }),
                    }, "public_enabled")}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider">Show on /creators</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked={!!client.featured}
                    onChange={(e) => call(`/admin/agency/clients/${client.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ featured: e.target.checked ? 1 : 0 }),
                    }, "featured")}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Star size={11} className="text-amber-500" /> Featured (pin to top of homepage)
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* YouTube channels */}
          <section>
            <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-2 flex items-center gap-1">
              <Youtube size={12} className="text-red-500" /> YouTube channels ({client.channels.length})
            </div>
            <ul className="space-y-2 mb-3">
              {client.channels.map((ch) => (
                <li key={ch.id} className="flex items-center gap-2 rounded-md border border-neutral-200 dark:border-neutral-800 px-2 py-1.5 bg-[var(--surface-alt)]">
                  <Youtube size={12} className="text-red-500 shrink-0" />
                  <input
                    type="text"
                    defaultValue={ch.handle || ""}
                    placeholder="@handle"
                    onBlur={(e) => { if (e.target.value !== (ch.handle || "")) patchChannel(ch, { handle: e.target.value }); }}
                    className="flex-1 min-w-0 text-xs px-2 py-1 rounded bg-[var(--surface)] border border-transparent focus:border-neutral-400 outline-none font-mono"
                  />
                  <select
                    defaultValue={ch.role || "secondary"}
                    onChange={(e) => patchChannel(ch, { role: e.target.value })}
                    className="text-xs px-1.5 py-1 rounded bg-[var(--surface)]"
                  >
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-neutral-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      defaultChecked={!!ch.managed_by_us}
                      onChange={(e) => patchChannel(ch, { managed_by_us: e.target.checked ? 1 : 0 })}
                      className="cursor-pointer"
                    />
                    managed
                  </label>
                  <button
                    onClick={() => removeChannel(ch)}
                    disabled={busy[`ch-${ch.id}`]}
                    className="text-red-500 hover:bg-red-500/10 p-1 rounded"
                    title="Remove channel"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
              {client.channels.length === 0 && (
                <li className="text-xs text-neutral-500 italic">No YouTube channels linked yet.</li>
              )}
            </ul>
            {/* Add YT */}
            <div className="rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 p-2 flex gap-2 flex-wrap items-center">
              <input
                type="text"
                placeholder="UCxxx, @handle, or full youtube.com URL"
                value={newYt.channel_id}
                onChange={(e) => setNewYt({ ...newYt, channel_id: e.target.value })}
                className="flex-1 min-w-[200px] text-xs px-2 py-1 rounded bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800"
              />
              <input
                type="text"
                placeholder="display handle (optional)"
                value={newYt.handle}
                onChange={(e) => setNewYt({ ...newYt, handle: e.target.value })}
                className="w-32 text-xs px-2 py-1 rounded bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 font-mono"
              />
              <select
                value={newYt.role}
                onChange={(e) => setNewYt({ ...newYt, role: e.target.value })}
                className="text-xs px-1.5 py-1 rounded bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800"
              >
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button
                onClick={addChannel}
                disabled={busy["add-yt"]}
                className="text-xs px-3 py-1 rounded bg-[var(--orange)] text-white font-bold hover:opacity-90 flex items-center gap-1"
              >
                <Plus size={11} /> Add
              </button>
            </div>
          </section>

          {/* Instagram accounts */}
          <section>
            <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 mb-2 flex items-center gap-1">
              <Instagram size={12} className="text-pink-500" /> Instagram accounts ({client.instagram.length})
            </div>
            <ul className="space-y-2 mb-3">
              {client.instagram.map((ig) => (
                <li key={ig.id} className="flex items-center gap-2 rounded-md border border-neutral-200 dark:border-neutral-800 px-2 py-1.5 bg-[var(--surface-alt)]">
                  <Instagram size={12} className="text-pink-500 shrink-0" />
                  <input
                    type="text"
                    defaultValue={ig.handle || ""}
                    placeholder="@handle"
                    onBlur={(e) => { if (e.target.value !== (ig.handle || "")) patchIg(ig, { handle: e.target.value.replace(/^@/, "") }); }}
                    className="flex-1 min-w-0 text-xs px-2 py-1 rounded bg-[var(--surface)] border border-transparent focus:border-neutral-400 outline-none font-mono"
                  />
                  <select
                    defaultValue={ig.role || "secondary"}
                    onChange={(e) => patchIg(ig, { role: e.target.value })}
                    className="text-xs px-1.5 py-1 rounded bg-[var(--surface)]"
                  >
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-neutral-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      defaultChecked={!!ig.managed_by_us}
                      onChange={(e) => patchIg(ig, { managed_by_us: e.target.checked ? 1 : 0 })}
                      className="cursor-pointer"
                    />
                    managed
                  </label>
                  <button
                    onClick={() => removeIg(ig)}
                    disabled={busy[`ig-${ig.id}`]}
                    className="text-red-500 hover:bg-red-500/10 p-1 rounded"
                    title="Remove account"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
              {client.instagram.length === 0 && (
                <li className="text-xs text-neutral-500 italic">No Instagram accounts linked yet.</li>
              )}
            </ul>
            {/* Add IG */}
            <div className="rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 p-2 flex gap-2 flex-wrap items-center">
              <input
                type="text"
                placeholder="@handle (no @ needed)"
                value={newIg.handle}
                onChange={(e) => setNewIg({ ...newIg, handle: e.target.value })}
                className="flex-1 min-w-[200px] text-xs px-2 py-1 rounded bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 font-mono"
              />
              <select
                value={newIg.role}
                onChange={(e) => setNewIg({ ...newIg, role: e.target.value })}
                className="text-xs px-1.5 py-1 rounded bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800"
              >
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <label className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-neutral-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIg.managed_by_us}
                  onChange={(e) => setNewIg({ ...newIg, managed_by_us: e.target.checked })}
                />
                managed
              </label>
              <button
                onClick={addIg}
                disabled={busy["add-ig"]}
                className="text-xs px-3 py-1 rounded bg-[var(--orange)] text-white font-bold hover:opacity-90 flex items-center gap-1"
              >
                <Plus size={11} /> Add
              </button>
            </div>
          </section>
        </div>

        <footer className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={archiveClient}
            disabled={busy.archive}
            className="text-xs px-3 py-1.5 rounded border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-bold flex items-center gap-1"
            title="Archive — hides client from every surface but keeps the row in D1"
          >
            <Trash2 size={11} /> Archive client
          </button>
          <div className="flex items-center gap-2">
            <span>Every change saves immediately.</span>
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded bg-[var(--surface-alt)] hover:bg-[var(--surface)] font-bold">
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
