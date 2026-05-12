/**
 * EditorPortfolioPanel — embedded inside /editor/me so editors can:
 *   - Set their slug + public profile (bio, avatar, socials, color)
 *   - Toggle public_enabled to publish their profile at /editor/:slug
 *   - Add / edit / delete / reorder portfolio items (thumbnails, videos, shorts)
 *
 * Mirrors the Shinel public showcase but for personal work. Two visibility
 * scopes: "shinel" (work done at Shinel — already attributable to Shinel
 * clients) vs "personal" (their own outside clients). Both render on the
 * editor's public page; only Shinel work is also linkable from
 * shinelstudios.in's own portfolio.
 */
import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, Star, ExternalLink, Eye, EyeOff, Copy, Loader, X } from "lucide-react";
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

// =====================================================================
// ProfileEditor — set slug, bio, avatar, cover, color, socials, publish flag
// =====================================================================
function ProfileEditor({ editor, onChanged }) {
  const [draft, setDraft] = useState({
    slug: editor?.slug || "",
    bio: editor?.bio || "",
    avatar_url: editor?.avatar_url || "",
    cover_url: editor?.cover_url || "",
    portfolio_color: editor?.portfolio_color || "#E85002",
    public_enabled: !!editor?.public_enabled,
    socials: (() => { try { return JSON.parse(editor?.socials_json || "{}"); } catch { return {}; } })(),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  const setSocial = (k, v) => setDraft((d) => ({ ...d, socials: { ...d.socials, [k]: v } }));

  const save = async () => {
    setBusy(true); setError(null);
    try {
      const r = await authedFetch("/editor/me/profile", {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Save failed"); return; }
      setSavedAt(new Date());
      onChanged?.();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const publicUrl = draft.slug ? `${window.location.origin}/editor/${draft.slug}` : null;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-[var(--surface-elev)] space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider">Public profile</h3>
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={draft.public_enabled}
            onChange={(e) => setDraft({ ...draft, public_enabled: e.target.checked })}
            className="rounded"
          />
          <span className="font-semibold">{draft.public_enabled ? "Published" : "Hidden"}</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs">
          <span className="block text-neutral-500 uppercase tracking-wider mb-1 font-bold">URL slug</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-500">/editor/</span>
            <input
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })}
              placeholder="your-name"
              className="flex-1 px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm font-mono"
            />
          </div>
          {publicUrl && (
            <button
              onClick={() => { navigator.clipboard?.writeText(publicUrl); }}
              className="mt-1 text-[10px] text-[var(--orange)] hover:underline inline-flex items-center gap-1"
            >
              <Copy size={10} /> Copy public URL
            </button>
          )}
        </label>
        <label className="text-xs">
          <span className="block text-neutral-500 uppercase tracking-wider mb-1 font-bold">Avatar URL</span>
          <input
            value={draft.avatar_url}
            onChange={(e) => setDraft({ ...draft, avatar_url: e.target.value })}
            placeholder="https://..."
            className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
          />
        </label>
        <label className="text-xs md:col-span-2">
          <span className="block text-neutral-500 uppercase tracking-wider mb-1 font-bold">Bio</span>
          <textarea
            rows={3}
            value={draft.bio}
            onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            placeholder="A line or two about you and your work..."
            className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="block text-neutral-500 uppercase tracking-wider mb-1 font-bold">Cover image URL</span>
          <input
            value={draft.cover_url}
            onChange={(e) => setDraft({ ...draft, cover_url: e.target.value })}
            placeholder="https://..."
            className="w-full px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="block text-neutral-500 uppercase tracking-wider mb-1 font-bold">Accent color</span>
          <input
            type="color"
            value={draft.portfolio_color}
            onChange={(e) => setDraft({ ...draft, portfolio_color: e.target.value })}
            className="w-full h-9 rounded border border-neutral-300 dark:border-neutral-700"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {["instagram", "youtube", "twitter", "behance"].map((s) => (
          <input
            key={s}
            value={draft.socials[s] || ""}
            onChange={(e) => setSocial(s, e.target.value)}
            placeholder={`${s} URL or handle`}
            className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
          />
        ))}
      </div>

      {error && <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">{error}</div>}

      <div className="flex items-center justify-end gap-2">
        {savedAt && <span className="text-[10px] text-emerald-600">Saved ✓ {savedAt.toLocaleTimeString()}</span>}
        <button onClick={save} disabled={busy} className="px-4 py-1.5 rounded bg-[var(--orange)] text-white text-xs font-bold disabled:opacity-50">
          {busy ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// PortfolioItemModal — add / edit a single portfolio item
// =====================================================================
function PortfolioItemModal({ item, onClose, onSaved }) {
  const isEdit = !!item?.id;
  const [draft, setDraft] = useState({
    title: item?.title || "",
    description: item?.description || "",
    asset_type: item?.asset_type || "video",
    source: item?.source || "personal",
    client_attribution: item?.client_attribution || "",
    thumbnail_url: item?.thumbnail_url || "",
    video_url: item?.video_url || "",
    embed_youtube_id: item?.embed_youtube_id || "",
    tags: item?.tags || "",
    featured: !!item?.featured,
    public_enabled: item?.public_enabled !== 0,
    sort_order: item?.sort_order || 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    if (!draft.title.trim()) { setError("Title required"); return; }
    setBusy(true); setError(null);
    try {
      const r = await authedFetch(
        isEdit ? `/editor/me/portfolio/${item.id}` : "/editor/me/portfolio",
        { method: isEdit ? "PATCH" : "POST", body: JSON.stringify(draft) }
      );
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Save failed"); return; }
      onSaved?.();
      onClose();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface-elev)] rounded-xl border border-neutral-200 dark:border-neutral-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[var(--surface-elev)] border-b border-neutral-200 dark:border-neutral-800 px-5 py-3 flex justify-between items-center">
          <h3 className="text-lg font-bold">{isEdit ? "Edit item" : "Add to portfolio"}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">Title *</label>
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder='e.g. "Night Market Reveal Edit for Gamify With Anchit"'
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Type</span>
              <select
                value={draft.asset_type}
                onChange={(e) => setDraft({ ...draft, asset_type: e.target.value })}
                className="w-full px-2 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
              >
                <option value="video">Long-form video</option>
                <option value="short">YT Short</option>
                <option value="reel">Instagram Reel</option>
                <option value="thumbnail">Thumbnail design</option>
              </select>
            </label>
            <label className="text-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Work source</span>
              <select
                value={draft.source}
                onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                className="w-full px-2 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
              >
                <option value="shinel">Shinel Studios work</option>
                <option value="personal">Personal / outside client</option>
              </select>
            </label>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">Client attribution (optional)</label>
            <input
              value={draft.client_attribution}
              onChange={(e) => setDraft({ ...draft, client_attribution: e.target.value })}
              placeholder='e.g. "AiSH is Live" or "Personal client — Tech Reviewer"'
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">Video / link URL</label>
            <input
              value={draft.video_url}
              onChange={(e) => setDraft({ ...draft, video_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=... (auto-extracts video ID)"
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">Thumbnail URL</label>
            <input
              value={draft.thumbnail_url}
              onChange={(e) => setDraft({ ...draft, thumbnail_url: e.target.value })}
              placeholder="https://... (used for grid + cards)"
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
            />
            {draft.thumbnail_url && (
              <img src={draft.thumbnail_url} alt="preview" className="mt-2 max-h-32 rounded border border-neutral-300 dark:border-neutral-700" />
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">Description (optional)</label>
            <textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Tags</span>
              <input
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                placeholder="gaming, valorant, esports"
                className="w-full px-2 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Sort order</span>
              <input
                type="number"
                value={draft.sort_order}
                onChange={(e) => setDraft({ ...draft, sort_order: parseInt(e.target.value || 0, 10) })}
                className="w-full px-2 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
              />
            </label>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} />
              Featured (pin top)
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={draft.public_enabled} onChange={(e) => setDraft({ ...draft, public_enabled: e.target.checked })} />
              Visible publicly
            </label>
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">{error}</div>}
        </div>
        <div className="sticky bottom-0 bg-[var(--surface-elev)] border-t border-neutral-200 dark:border-neutral-800 px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm">Cancel</button>
          <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg bg-[var(--orange)] text-white text-sm font-bold disabled:opacity-50">
            {busy ? "Saving…" : (isEdit ? "Save changes" : "Add to portfolio")}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// EditorPortfolioPanel — main component
// =====================================================================
export default function EditorPortfolioPanel({ editor }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await authedFetch("/editor/me/portfolio");
      if (!r.ok) { setError((await r.json())?.error || "Load failed"); return; }
      const j = await r.json();
      setItems(j.items || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteItem = async (id) => {
    if (!window.confirm("Delete this portfolio item?")) return;
    try {
      await authedFetch(`/editor/me/portfolio/${id}`, { method: "DELETE" });
      await load();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="space-y-4">
      <ProfileEditor editor={editor} onChanged={() => {}} />

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-[var(--surface-elev)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider">My portfolio ({items.length})</h3>
          <button
            onClick={() => setEditingItem({})}
            className="text-xs px-3 py-1.5 rounded bg-[var(--orange)] text-white font-bold inline-flex items-center gap-1"
          >
            <Plus size={12} /> Add item
          </button>
        </div>

        {loading && <div className="text-sm text-neutral-500 text-center py-6">Loading…</div>}
        {error && <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">{error}</div>}

        {!loading && items.length === 0 && (
          <div className="text-center py-8 text-neutral-500 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
            <div className="text-3xl mb-2">🎬</div>
            <div className="text-sm">No portfolio items yet.</div>
            <div className="text-xs mt-1">Click "Add item" to upload your first piece.</div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((it) => (
            <div key={it.id} className="relative rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-[var(--surface)] hover:shadow-md transition-shadow group">
              {it.thumbnail_url ? (
                <img src={it.thumbnail_url} alt={it.title} className="w-full aspect-video object-cover" />
              ) : it.embed_youtube_id ? (
                <img src={`https://i.ytimg.com/vi/${it.embed_youtube_id}/mqdefault.jpg`} alt={it.title} className="w-full aspect-video object-cover" />
              ) : (
                <div className="w-full aspect-video bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 text-3xl">
                  {it.asset_type === "thumbnail" ? "🖼" : it.asset_type === "short" || it.asset_type === "reel" ? "📱" : "🎬"}
                </div>
              )}
              <div className="absolute top-1.5 left-1.5 flex gap-1">
                {it.featured ? (
                  <span className="px-1.5 py-0.5 rounded bg-yellow-500 text-white text-[9px] font-bold uppercase tracking-wider"><Star size={9} className="inline -mt-0.5" /> Featured</span>
                ) : null}
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  it.source === "shinel" ? "bg-[var(--orange)] text-white" : "bg-neutral-700 text-white"
                }`}>
                  {it.source}
                </span>
                {!it.public_enabled && (
                  <span className="px-1.5 py-0.5 rounded bg-neutral-500 text-white text-[9px] font-bold"><EyeOff size={9} className="inline -mt-0.5" /> Hidden</span>
                )}
              </div>
              <div className="p-2">
                <div className="text-xs font-semibold truncate" title={it.title}>{it.title}</div>
                {it.client_attribution && (
                  <div className="text-[10px] text-neutral-500 truncate">{it.client_attribution}</div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {it.video_url && (
                  <a href={it.video_url} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-white text-black text-[10px] font-bold inline-flex items-center gap-1">
                    <ExternalLink size={10} /> Open
                  </a>
                )}
                <button onClick={() => setEditingItem(it)} className="px-2 py-1 rounded bg-white text-black text-[10px] font-bold inline-flex items-center gap-1">
                  <Edit2 size={10} /> Edit
                </button>
                <button onClick={() => deleteItem(it.id)} className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-bold inline-flex items-center gap-1">
                  <Trash2 size={10} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingItem && (
        <PortfolioItemModal
          item={editingItem.id ? editingItem : null}
          onClose={() => setEditingItem(null)}
          onSaved={() => { setEditingItem(null); load(); }}
        />
      )}
    </div>
  );
}
