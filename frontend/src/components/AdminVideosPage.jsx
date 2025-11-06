// src/components/AdminVideosPage.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  AlertCircle,
  Info,
  Search,
  Filter,
  Check,
  X,
} from "lucide-react";
import { createVideoStorage } from "./cloudflare-video-storage";

const AUTH_BASE =
  import.meta.env.VITE_AUTH_BASE ||
  "https://shinel-auth.your-account.workers.dev";
const LS_TOKEN_KEY = "token";
const LS_FORM_DRAFT_KEY = "admin-videos-form-draft";

const TIMEOUTS = {
  read: 70000,
  save: 70000,
  singleRefresh: 70000,
  bulkRefresh: 180000,
};

const DEFAULT_FORM = {
  title: "",
  primaryUrl: "", // plays on site (embedded)
  creatorUrl: "", // same video uploaded by creator
  category: "GAMING",
  subcategory: "",
  kind: "LONG", // LONG | SHORT | REEL | BRIEF etc
  tags: "",
};

/* ---------------- utils ---------------- */
const getToken = () => localStorage.getItem(LS_TOKEN_KEY) || "";

function extractYouTubeId(url = "") {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/\/shorts\/([^/]+)/);
      if (m) return m[1];
    }
  } catch {} // non-URL strings ignored
  return null;
}

function normalizeRow(r) {
  // Resolve a usable videoId
  const videoId =
    r.videoId ||
    r.youtubeId ||
    extractYouTubeId(r.primaryUrl) ||
    extractYouTubeId(r.creatorUrl) ||
    null;

  // Normalize view fields
  const views = Number(r.youtubeViews ?? r.viewCount ?? r.views ?? 0);

  return {
    ...r,
    id: r.id || videoId || crypto.randomUUID(),
    videoId,
    views,
    lastViewUpdate: r.lastViewUpdate ?? r.updated ?? r.lastUpdated ?? null,
    kind: r.kind || "LONG",
    category: r.category || "OTHER",
    subcategory: r.subcategory || "",
    tags: Array.isArray(r.tags) ? r.tags : r.tags ? String(r.tags).split(",").map((s)=>s.trim()).filter(Boolean) : [],
  };
}

/* ---------------- storage facade ---------------- */
const store = new (class {
  constructor() {
    this._impl = createVideoStorage(AUTH_BASE, () =>
      localStorage.getItem(LS_TOKEN_KEY)
    );
  }
  testConnection = async () => {
    try {
      const s = await this._impl.getStats();
      return Boolean(s);
    } catch {
      return false;
    }
  };
  list = async () => this._impl.getAll();
  add = async (row, opts) => this._impl.add(row, opts);
  update = async (id, row, opts) => this._impl.update(id, row, opts);
  remove = async (id, opts) => this._impl.delete(id, opts);
  refreshOne = async (videoId, opts) => this._impl.refresh(videoId, opts);
  refreshAll = async (opts) => this._impl.refreshAll(opts);
})();

/* ---------------- component ---------------- */
export default function AdminVideosPage() {
  const [videos, setVideos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [err, setErr] = useState("");
  const [errDetails, setErrDetails] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category: "ALL", kind: "ALL" });
  const [sort, setSort] = useState({ field: "lastUpdated", dir: "desc" });
  const [form, setForm] = useState(DEFAULT_FORM);
  const [isPending, startTransition] = useTransition();

  const surfaceError = (msg, details) => {
    setErr(msg || "Something went wrong.");
    setErrDetails(details ? String(details) : "");
  };
  const clearError = () => {
    setErr("");
    setErrDetails("");
  };

  const loadVideos = useCallback(async () => {
    setBusy(true);
    setBusyLabel("Loading videos");
    try {
      const list = await store.list();
      const normalized = (Array.isArray(list) ? list : []).map(normalizeRow);
      setVideos(normalized);
    } catch (e) {
      surfaceError(e.message || "Failed to load videos", e);
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }, []);

  const loadStats = useCallback(async () => {
    /* reserved for future stats */
  }, []);

  // connection check + initial load
  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        surfaceError("Missing token - Please login to access this page", {
          hint: `Set "${LS_TOKEN_KEY}" in localStorage or ensure your login flow stores it.`,
        });
        return;
      }
      try {
        setBusy(true);
        setBusyLabel("Checking connection.");
        const ok = await store.testConnection();
        if (!ok) {
          surfaceError(`Cannot reach Worker at ${AUTH_BASE}`, {
            hint: "Verify VITE_AUTH_BASE, CORS, and that /stats endpoint returns 200.",
          });
          return;
        }
      } catch (e) {
        surfaceError(`Connection check failed`, e?.message || e);
        return;
      } finally {
        setBusy(false);
        setBusyLabel("");
      }
      await Promise.all([loadVideos(), loadStats()]);
    })();
  }, [loadVideos, loadStats]);

  // persist form draft
  useEffect(() => {
    try {
      localStorage.setItem(LS_FORM_DRAFT_KEY, JSON.stringify({ ...form }));
    } catch {}
  }, [form]);

  // derived + filters
  const filtered = useMemo(() => {
    let rows = [...videos];
    const q = search.trim().toLowerCase();
    if (q)
      rows = rows.filter((v) =>
        [
          v.title,
          v.category,
          v.subcategory,
          v.kind,
          v.videoId,
          v.primaryUrl,
          v.creatorUrl,
        ]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q))
      );
    if (filters.category !== "ALL")
      rows = rows.filter((v) => v.category === filters.category);
    if (filters.kind !== "ALL")
      rows = rows.filter((v) => (v.kind || "LONG") === filters.kind);

    rows.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      switch (sort.field) {
        case "title":
          return dir * String(a.title || "").localeCompare(b.title || "");
        case "views":
          return dir * (Number(a.views || 0) - Number(b.views || 0));
        case "lastUpdated":
        default:
          return (
            dir *
            ((new Date(a.lastViewUpdate || 0)).valueOf() -
              (new Date(b.lastViewUpdate || 0)).valueOf())
          );
      }
    });
    return rows;
  }, [videos, search, filters, sort]);

  // actions
  const startNew = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
  };

  const editRow = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title || "",
      primaryUrl: row.primaryUrl || row.youtubeUrl || "",
      creatorUrl: row.creatorUrl || "",
      category: row.category || "OTHER",
      subcategory: row.subcategory || "",
      kind: row.kind || "LONG",
      tags: Array.isArray(row.tags)
        ? row.tags.join(", ")
        : row.tags || "",
    });
  };

  const saveForm = async () => {
    setBusy(true);
    setBusyLabel(editingId ? "Updating" : "Saving");
    try {
      const payload = {
        title: form.title,
        primaryUrl: form.primaryUrl,
        creatorUrl: form.creatorUrl,
        category: form.category,
        subcategory: form.subcategory,
        kind: form.kind,
        tags: form.tags
          ? String(form.tags)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      };
      if (editingId) {
        await store.update(editingId, payload, { onProgress: () => {} });
      } else {
        await store.add(payload, { onProgress: () => {} });
      }
      await loadVideos();
      setEditingId(null);
    } catch (e) {
      surfaceError(e.message || "Save failed", e);
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  const deleteRow = async (id) => {
    if (!confirm("Delete this video?")) return;
    setBusy(true);
    setBusyLabel("Deleting");
    try {
      await store.remove(id, { onProgress: () => {} });
      await loadVideos();
    } catch (e) {
      surfaceError(e.message || "Delete failed", e);
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  const refreshViews = async (videoIdMaybe) => {
    // Prefer a real videoId; if not present, extract from the row
    const row = videos.find(
      (v) => v.videoId === videoIdMaybe || v.id === videoIdMaybe
    );
    const videoId =
      row?.videoId ||
      extractYouTubeId(row?.primaryUrl) ||
      extractYouTubeId(row?.creatorUrl);
    if (!videoId) {
      surfaceError("Cannot refresh views: missing YouTube video ID.");
      return;
    }
    setBusy(true);
    setBusyLabel("Refreshing views");
    try {
      await store.refreshOne(videoId, { onProgress: () => {} });
      await loadVideos();
    } catch (e) {
      surfaceError(e.message || "Refresh failed", e);
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  const refreshAllViews = async () => {
    if (
      !confirm("Refresh all eligible videos' view counts now?")
    )
      return;
    setBusy(true);
    setBusyLabel("Refreshing all views");
    try {
      await store.refreshAll({ onProgress: () => {} });
      await loadVideos();
    } catch (e) {
      surfaceError(e.message || "Bulk refresh failed", e);
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  return (
    <div className="min-h-[60vh]">
      {/* Error banner */}
      {err && (
        <div
          className="mb-4 rounded-lg p-3 text-sm flex items-start gap-3"
          style={{
            background: "rgba(255,59,48,0.08)",
            border: "1px solid rgba(255,59,48,0.3)",
          }}
        >
          <AlertCircle size={18} className="mt-0.5" style={{ color: "#ff3b30" }} />
          <div className="flex-1">
            <div className="font-medium" style={{ color: "#b91c1c" }}>
              {err}
            </div>
            {errDetails && (
              <pre
                className="mt-1 p-2 rounded text-xs overflow-auto"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              >
                {errDetails}
              </pre>
            )}
          </div>
          <button
            onClick={clearError}
            className="px-2 py-1 text-xs rounded border"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Info banner */}
      <div
        className="mb-4 rounded-lg p-3 text-sm flex items-start gap-2"
        style={{
          background: "rgba(232,80,2,0.1)",
          color: "var(--text)",
          border: "1px solid rgba(232,80,2,0.2)",
        }}
      >
        <Info
          size={16}
          style={{ color: "var(--orange)", marginTop: "2px", flexShrink: 0 }}
        />
        <div>
          <strong>View Count System:</strong> Counts are cached and
          refreshed via the “Refresh” actions. Deleted videos keep last
          known counts.
        </div>
      </div>

      {/* Header & toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text)" }}>
          Admin · Videos Manager
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={refreshAllViews}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white"
            style={{
              background: "linear-gradient(90deg, var(--orange), #ff9357)",
            }}
          >
            <RefreshCw size={16} /> Refresh Views
          </button>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            <Plus size={16} /> New
          </button>
        </div>
      </div>

      {/* Editor + List */}
      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        {/* Editor */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="font-semibold mb-3" style={{ color: "var(--text)" }}>
            {editingId ? "Edit Video" : "Add Video"}
          </div>
          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Title
              </span>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="px-3 py-2 rounded border"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  background: "transparent",
                }}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Primary YouTube URL (plays on site)
              </span>
              <input
                value={form.primaryUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, primaryUrl: e.target.value }))
                }
                className="px-3 py-2 rounded border"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  background: "transparent",
                }}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Creator’s YouTube URL (same video)
              </span>
              <input
                value={form.creatorUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, creatorUrl: e.target.value }))
                }
                className="px-3 py-2 rounded border"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  background: "transparent",
                }}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Category
                </span>
                <input
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="px-3 py-2 rounded border"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text)",
                    background: "transparent",
                  }}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Subcategory
                </span>
                <input
                  value={form.subcategory}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subcategory: e.target.value }))
                  }
                  className="px-3 py-2 rounded border"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text)",
                    background: "transparent",
                  }}
                />
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Kind
              </span>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kind: e.target.value }))
                }
                className="px-3 py-2 rounded border"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  background: "transparent",
                }}
              >
                <option>LONG</option>
                <option>SHORT</option>
                <option>REEL</option>
                <option>BRIEF</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Tags (comma separated)
              </span>
              <input
                value={form.tags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value }))
                }
                className="px-3 py-2 rounded border"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  background: "transparent",
                }}
              />
            </label>

            <div className="flex gap-2">
              <button
                onClick={saveForm}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white"
                style={{
                  background:
                    "linear-gradient(90deg, var(--orange), #ff9357)",
                }}
              >
                <Check size={16} /> {editingId ? "Update" : "Save"}
              </button>
              {editingId && (
                <button
                  onClick={() => setEditingId(null)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <X size={16} /> Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* List */}
        <div
          className="rounded-xl border"
          style={{ borderColor: "var(--border)", overflow: "hidden" }}
        >
          <div
            className="p-3 flex flex-wrap gap-2 items-center"
            style={{ background: "var(--surface)" }}
          >
            <div className="flex items-center gap-2 flex-1">
              <Search size={16} style={{ color: "var(--text-muted)" }} />
              <input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-2 py-1 rounded border w-full"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  background: "transparent",
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} style={{ color: "var(--text-muted)" }} />
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, category: e.target.value }))
                }
                className="px-2 py-1 rounded border"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  background: "transparent",
                }}
              >
                <option>ALL</option>
                <option>GAMING</option>
                <option>VLOG</option>
                <option>OTHER</option>
              </select>
              <select
                value={filters.kind}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, kind: e.target.value }))
                }
                className="px-2 py-1 rounded border"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  background: "transparent",
                }}
              >
                <option>ALL</option>
                <option>LONG</option>
                <option>SHORT</option>
                <option>REEL</option>
                <option>BRIEF</option>
              </select>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Kind</th>
                <th className="text-left p-3">Video ID</th>
                <th className="text-left p-3">Views</th>
                <th className="text-left p-3">Updated</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="p-3">
                    <div className="font-medium">{v.title || "(untitled)"}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {v.primaryUrl ? (
                        <>
                          <a href={v.primaryUrl} target="_blank" rel="noreferrer">Primary</a>
                          {v.creatorUrl ? " • " : ""}
                        </>
                      ) : null}
                      {v.creatorUrl && (
                        <a href={v.creatorUrl} target="_blank" rel="noreferrer">Creator</a>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    {v.category}
                    {v.subcategory ? ` / ${v.subcategory}` : ""}
                  </td>
                  <td className="p-3">{v.kind || "LONG"}</td>
                  <td className="p-3">{v.videoId || "-"}</td>
                  <td
                    className="p-3"
                    title={
                      v.lastViewUpdate
                        ? `Updated ${new Date(v.lastViewUpdate).toLocaleString()}`
                        : ""
                    }
                  >
                    {Number(v.views || 0).toLocaleString()}
                  </td>
                  <td className="p-3">
                    {v.lastViewUpdate
                      ? new Date(v.lastViewUpdate).toLocaleString()
                      : "-"}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => editRow(v)}
                        className="px-2 py-1 rounded border"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => refreshViews(v.videoId || v.id)}
                        className="px-2 py-1 rounded border"
                        title="Refresh views for this video"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={() => deleteRow(v.id)}
                        className="px-2 py-1 rounded border"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    className="p-6 text-center text-sm"
                    colSpan={7}
                    style={{ color: "var(--text-muted)" }}
                  >
                    No videos yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
