/**
 * AddSomethingButton — single header button that opens 3 dialogs:
 *   + New client          (full onboarding)
 *   + Add YT channel      (to existing client)
 *   + Add Instagram       (to existing client)
 *
 * Lives in OpsCockpit header. Replaces the missing "how do I add this" UX.
 */
import React, { useState } from "react";
import { Plus, X, Youtube, Instagram, UserPlus } from "lucide-react";
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

function NewClientModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "", niche_tag: "", secondary_niche_tag: "",
    retainer_tier: "", youtube_id: "", instagram_handle: "",
    managed_by_us: true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    if (!form.name.trim()) { setErr("Name required"); return; }
    setBusy(true); setErr(null);
    try {
      const r = await authedFetch("/admin/agency/clients", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          niche_tag: form.niche_tag || null,
          secondary_niche_tag: form.secondary_niche_tag || null,
          retainer_tier: form.retainer_tier || null,
          youtube_id: form.youtube_id || null,
          instagram_handle: form.instagram_handle ? form.instagram_handle.replace(/^@/, "") : null,
          managed_by_us: form.managed_by_us,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `API ${r.status}`);
      onSaved?.(j.id);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold">Onboard new client</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Name *</label>
            <input value={form.name} onChange={update("name")} placeholder="e.g. New Creator Name" className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Niche</label>
              <input value={form.niche_tag} onChange={update("niche_tag")} placeholder="e.g. gaming-bgmi" className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Tier</label>
              <select value={form.retainer_tier} onChange={update("retainer_tier")} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
                <option value="">— pick —</option>
                <option value="starter">starter</option>
                <option value="growth">growth</option>
                <option value="premium">premium</option>
                <option value="internal">internal</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">YouTube channel ID or handle</label>
            <input value={form.youtube_id} onChange={update("youtube_id")} placeholder="UCxxxxxxxxxx or @handle" className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono" />
            <p className="text-[10px] text-neutral-500 mt-1">Optional. Pulse sync will canonicalize @handle → UCxxx automatically.</p>
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Instagram handle</label>
            <input value={form.instagram_handle} onChange={update("instagram_handle")} placeholder="@theirhandle (or just theirhandle)" className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.managed_by_us} onChange={(e) => setForm({ ...form, managed_by_us: e.target.checked })} />
            We manage this client (uncheck for tracked-only)
          </label>
          {err && <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded">{err}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800">Cancel</button>
          <button onClick={save} disabled={busy || !form.name.trim()} className="text-sm px-4 py-2 rounded-lg bg-[var(--orange)] text-white font-bold disabled:opacity-50">
            {busy ? "Onboarding…" : "Onboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddChannelModal({ clients, onClose, onSaved }) {
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [form, setForm] = useState({ channel_id: "", handle: "", role: "secondary", language: "", studio_url: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    if (!clientId || !form.channel_id.trim()) { setErr("Client + channel id required"); return; }
    setBusy(true); setErr(null);
    try {
      const r = await authedFetch(`/admin/agency/clients/${encodeURIComponent(clientId)}/channels`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `API ${r.status}`);
      onSaved?.();
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold flex items-center gap-2"><Youtube size={16} className="text-red-500" /> Add YouTube channel</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Client *</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Channel ID or handle *</label>
            <input value={form.channel_id} onChange={update("channel_id")} placeholder="UCxxxxxx or @newchannel" className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Handle (display)</label>
              <input value={form.handle} onChange={update("handle")} placeholder="@displayhandle" className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Role</label>
              <select value={form.role} onChange={update("role")} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
                <option value="main">main</option>
                <option value="secondary">secondary</option>
                <option value="shorts">shorts</option>
                <option value="clips">clips</option>
                <option value="vlog">vlog</option>
                <option value="music">music</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">YT Studio URL (optional)</label>
            <input value={form.studio_url} onChange={update("studio_url")} placeholder="https://studio.youtube.com/channel/UC..." className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          {err && <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded">{err}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800">Cancel</button>
          <button onClick={save} disabled={busy || !form.channel_id.trim()} className="text-sm px-4 py-2 rounded-lg bg-[var(--orange)] text-white font-bold disabled:opacity-50">
            {busy ? "Adding…" : "Add channel"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddIgModal({ clients, onClose, onSaved }) {
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [form, setForm] = useState({ handle: "", role: "main", managed_by_us: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    if (!clientId || !form.handle.trim()) { setErr("Client + handle required"); return; }
    setBusy(true); setErr(null);
    try {
      const r = await authedFetch(`/admin/agency/instagram`, {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          handle: form.handle.replace(/^@/, ""),
          role: form.role,
          managed_by_us: form.managed_by_us,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `API ${r.status}`);
      onSaved?.();
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold flex items-center gap-2"><Instagram size={16} className="text-pink-500" /> Add Instagram</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Client *</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Handle *</label>
            <input value={form.handle} onChange={update("handle")} placeholder="@thehandle" className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Role</label>
            <select value={form.role} onChange={update("role")} className="w-full bg-[var(--surface)] border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
              <option value="main">main</option>
              <option value="business">business</option>
              <option value="clips">clips</option>
              <option value="personal">personal</option>
              <option value="secondary">secondary</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.managed_by_us} onChange={(e) => setForm({ ...form, managed_by_us: e.target.checked })} />
            We manage this account
          </label>
          {err && <div className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded">{err}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800">Cancel</button>
          <button onClick={save} disabled={busy || !form.handle.trim()} className="text-sm px-4 py-2 rounded-lg bg-[var(--orange)] text-white font-bold disabled:opacity-50">
            {busy ? "Adding…" : "Add IG"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddSomethingButton({ clients = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null); // 'client' | 'channel' | 'ig'
  const pick = (m) => { setModal(m); setOpen(false); };
  const onSaved = () => { setModal(null); onChange?.(); };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-md bg-[var(--orange)] text-white font-bold hover:opacity-90 inline-flex items-center gap-1"
        >
          <Plus size={12} /> Add ▾
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 mt-1 z-20 bg-[var(--surface-elev)] border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg min-w-[200px] overflow-hidden">
              <button onClick={() => pick("client")}  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface-alt)] inline-flex items-center gap-2"><UserPlus size={12} /> New client</button>
              <button onClick={() => pick("channel")} className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface-alt)] inline-flex items-center gap-2"><Youtube size={12} className="text-red-500" /> YT channel to existing</button>
              <button onClick={() => pick("ig")}      className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface-alt)] inline-flex items-center gap-2"><Instagram size={12} className="text-pink-500" /> Instagram to existing</button>
            </div>
          </>
        )}
      </div>

      {modal === "client"  && <NewClientModal onClose={() => setModal(null)} onSaved={onSaved} />}
      {modal === "channel" && <AddChannelModal clients={clients} onClose={() => setModal(null)} onSaved={onSaved} />}
      {modal === "ig"      && <AddIgModal clients={clients} onClose={() => setModal(null)} onSaved={onSaved} />}
    </>
  );
}
