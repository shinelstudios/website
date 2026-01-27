// src/components/AdminThumbnailsPage.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  useCallback,
} from "react";
import {
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  LayoutGrid,
  List,
} from "lucide-react";
import { createThumbnailStorage } from "./cloudflare-thumbnail-storage";
import { THUMBNAIL_VARIANTS, VIDEO_CATEGORIES } from "../utils/constants";
import { formatBytes, timeAgo, runWithConcurrency } from "../utils/helpers";
import { LoadingOverlay } from "./AdminUIComponents";

// Sub-components
import ThumbnailCard from "./ThumbnailCard";
import ThumbnailForm from "./ThumbnailForm";
import ThumbnailFilters from "./ThumbnailFilters";

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE?.replace(/\/+$/, "") || "https://shinel-auth.shinelstudioofficial.workers.dev";
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || "";
const LS_TOKEN_KEY = "token";
const LS_FORM_DRAFT_KEY = "admin-thumbs-form-draft";
const LS_PRESETS_KEY = "thumbs-presets";
const LS_IMPORT_CHECKPOINT = "thumbs-import-checkpoint";
const IMPORT_CHUNK_SIZE = 50;

const DEFAULT_FORM = {
  filename: "",
  youtubeUrl: "",
  category: "GAMING",
  subcategory: "",
  variant: "VIDEO",
  imageUrl: "",
  isShinel: true,
  attributedTo: "",
};

const store = createThumbnailStorage(AUTH_BASE, () => localStorage.getItem(LS_TOKEN_KEY));

function toast(type, message) {
  window.dispatchEvent(
    new CustomEvent("notify", { detail: { type: type === "error" ? "error" : "success", message: String(message || "") } })
  );
}

export default function AdminThumbnailsPage() {
  const [thumbnails, setThumbnails] = useState([]);
  const [stats, setStats] = useState(null);
  const [op, setOp] = useState(null); // { kind, pct, note }
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [err, setErr] = useState("");
  const [errDetails, setErrDetails] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [refreshingId, setRefreshingId] = useState(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [flashKey, setFlashKey] = useState("");
  const [vErrs, setVErrs] = useState({});
  const [viewMode, setViewMode] = useState("grid"); // grid | list

  // Search & Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({ category: "ALL", variant: "ALL", onlyYT: "ALL" });
  const [sort, setSort] = useState({ key: "updated", dir: "desc" });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [copyOkId, setCopyOkId] = useState(null);

  const lastRetryRef = useRef({ fn: null, args: [] });

  const [form, setForm] = useState(() => {
    try {
      const draft = localStorage.getItem(LS_FORM_DRAFT_KEY);
      return draft ? { ...DEFAULT_FORM, ...JSON.parse(draft) } : { ...DEFAULT_FORM };
    } catch { return { ...DEFAULT_FORM }; }
  });

  const [presets, setPresets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_PRESETS_KEY)) || {
        category: [], subcategory: [], variants: ["VIDEO", "LIVE"], filenameTemplates: []
      };
    } catch { return { category: [], subcategory: [], variants: ["VIDEO", "LIVE"], filenameTemplates: [] }; }
  });

  // ---------- Data Loaders ----------
  const loadThumbnails = useCallback(async () => {
    setBusy(true);
    setBusyLabel("Fetching library...");
    try {
      const rows = await store.getAll();
      startTransition(() => setThumbnails(rows || []));
    } catch (e) {
      surfaceError(e.message || "Error loading thumbnails", e, loadThumbnails);
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await store.getStats();
      setStats(data || null);
    } catch (e) { console.error("Stats failed", e); }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(LS_TOKEN_KEY);
    if (!token) {
      surfaceError("Unauthorized. Please login again.");
      return;
    }
    loadThumbnails();
    loadStats();
  }, [loadThumbnails, loadStats]);

  // ---------- Actions ----------
  const surfaceError = (msg, details = "", retryFn = null, retryArgs = []) => {
    setErr(msg);
    setErrDetails(typeof details === "string" ? details : JSON.stringify(details));
    lastRetryRef.current = { fn: retryFn, args: retryArgs };
    toast("error", msg);
  };

  const clearError = () => { setErr(""); setErrDetails(""); };

  const handleSave = async (e) => {
    e?.preventDefault();
    clearError();
    const payload = { ...form };

    // Simple validation
    const errs = {};
    if (!payload.filename.trim()) errs.filename = "Name required";
    if (!payload.imageUrl) errs.imageUrl = "Asset required";
    if (Object.keys(errs).length) { setVErrs(errs); return; }

    setBusy(true);
    setBusyLabel(editingId ? "Updating..." : "Creating...");
    setOp({ kind: editingId ? "update" : "create", pct: 10, note: "Saving data" });

    try {
      const out = editingId ? await store.update(editingId, payload) : await store.add(payload);
      const saved = out.data;

      setOp({ kind: "create", pct: 80, note: "Refreshing" });
      await Promise.all([loadThumbnails(), loadStats()]);

      setFlashKey(String(saved?.id || ""));
      setTimeout(() => setFlashKey(""), 3000);
      toast("success", editingId ? "Updated asset" : "Created asset");

      // Update presets
      const nextPresets = { ...presets };
      const pushUnique = (arr, v) => {
        if (!v) return;
        const idx = arr.indexOf(v);
        if (idx >= 0) arr.splice(idx, 1);
        arr.unshift(v);
        if (arr.length > 20) arr.length = 20;
      };
      pushUnique(nextPresets.filenameTemplates, payload.filename);
      pushUnique(nextPresets.category, payload.category);
      pushUnique(nextPresets.subcategory, payload.subcategory);
      setPresets(nextPresets);
      localStorage.setItem(LS_PRESETS_KEY, JSON.stringify(nextPresets));

      // Reset form
      setForm(DEFAULT_FORM);
      setImagePreview("");
      setEditingId(null);
      localStorage.removeItem(LS_FORM_DRAFT_KEY);
    } catch (e) {
      surfaceError(e.message || "Failed to save", e);
    } finally {
      setBusy(false);
      setBusyLabel("");
      setOp(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Permanently delete "${name}"?`)) return;
    setBusy(true);
    setOp({ kind: "delete", pct: 50, note: "Removing asset" });
    try {
      await store.delete(id);
      await Promise.all([loadThumbnails(), loadStats()]);
      toast("success", "Deleted");
    } catch (e) {
      surfaceError(e.message || "Delete failed", e);
    } finally {
      setBusy(false);
      setOp(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length || !confirm(`Delete ${ids.length} selected items?`)) return;

    setBusy(true);
    setBusyLabel(`Deleting ${ids.length} items...`);
    setOp({ kind: "bulk-delete", pct: 0, note: "Starting" });

    try {
      await store.bulkDelete(ids);
      setSelectedIds(new Set());
      await Promise.all([loadThumbnails(), loadStats()]);
      toast("success", `Removed ${ids.length} items`);
    } catch (e) {
      surfaceError(e.message || "Bulk delete failed", e);
    } finally {
      setBusy(false);
      setOp(null);
    }
  };

  const handleRefreshOne = async (url, id) => {
    if (!url) return;
    setRefreshingId(id);
    try {
      const videoId = url.split("v=")[1]?.split("&")[0] || url.split("/").pop();
      await store.refreshOne(videoId);
      await loadThumbnails();
      toast("success", "Refreshed view count");
    } catch (e) { toast("error", "Refresh failed"); }
    finally { setRefreshingId(null); }
  };

  const handleRefreshAll = async () => {
    if (!confirm("Refresh counts for all videos older than 7 days?")) return;
    setRefreshingAll(true);
    try {
      await store.refreshAll();
      await loadThumbnails();
      toast("success", "Bulk refresh queued");
    } catch (e) { toast("error", "Bulk refresh failed"); }
    finally { setRefreshingAll(false); }
  };

  const handleImageSelected = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      setForm(f => ({ ...f, imageUrl: e.target.result })); // Storing base64 for now, backend handles it
    };
    reader.readAsDataURL(file);
  };

  const handleFetchYouTube = async (url) => {
    if (!url) return;
    setBusy(true);
    setBusyLabel("Fetching YT Metadata...");
    try {
      const res = await fetch(`${AUTH_BASE}/thumbnails/fetch-youtube`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem(LS_TOKEN_KEY)}`
        },
        body: JSON.stringify({ youtubeUrl: url, apiKey: YOUTUBE_API_KEY })
      });
      const data = await res.json();
      if (data.details) {
        setForm(f => ({
          ...f,
          filename: f.filename || data.details.title,
          category: f.category || "GAMING"
        }));
        toast("success", "Found: " + data.details.title);
      }
    } catch (e) { console.error(e); }
    finally { setBusy(false); }
  };

  const downloadImage = async (url, name) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.png`;
      a.click();
      toast("success", "Downloading...");
    } catch (e) { toast("error", "Download failed"); }
  };

  // ---------- Filters & Search ----------
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filteredItems = useMemo(() => {
    let list = [...thumbnails];
    if (debouncedSearch) {
      list = list.filter(t =>
        t.filename?.toLowerCase().includes(debouncedSearch) ||
        t.category?.toLowerCase().includes(debouncedSearch) ||
        t.subcategory?.toLowerCase().includes(debouncedSearch)
      );
    }
    if (filters.category !== "ALL") list = list.filter(t => t.category === filters.category);
    if (filters.variant !== "ALL") list = list.filter(t => t.variant === filters.variant);

    list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "views") return dir * ((a.youtubeViews || 0) - (b.youtubeViews || 0));
      if (sort.key === "filename") return dir * a.filename.localeCompare(b.filename);
      return dir * ((a.updated || a.dateAdded || 0) - (b.updated || b.dateAdded || 0));
    });
    return list;
  }, [thumbnails, debouncedSearch, filters, sort]);

  // ---------- Render ----------
  return (
    <div className="min-h-screen pb-20 bg-black">
      <LoadingOverlay show={busy} label={busyLabel} />

      {/* Progress Bar */}
      {op && (
        <div className="fixed top-20 left-0 right-0 z-[110] h-1 bg-white/5">
          <div
            className="h-full bg-orange-500 transition-all duration-300"
            style={{ width: `${op.pct}%` }}
          />
        </div>
      )}

      <div className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 items-start">

          {/* Main Content Area */}
          <div className="space-y-8 order-2 lg:order-1">
            <ThumbnailFilters
              search={search}
              setSearch={setSearch}
              filters={filters}
              setFilters={setFilters}
              sort={sort}
              setSort={setSort}
              selectedCount={selectedIds.size}
              onBulkDelete={handleBulkDelete}
              onRefreshAll={handleRefreshAll}
              busy={refreshingAll}
              totalCount={thumbnails.length}
            />

            {/* View Mode Toggle */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                Showing {filteredItems.length} Assets
              </p>
              <div className="flex p-1 rounded-xl bg-white/5 border border-white/10">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500 hover:text-white'}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all ${viewMode === "list" ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500 hover:text-white'}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {/* Grid/List Display */}
            <div className={viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
              : "flex flex-col gap-4"
            }>
              {filteredItems.map(t => (
                <ThumbnailCard
                  key={t.id}
                  t={t}
                  isSelected={selectedIds.has(t.id)}
                  onToggleSelect={(id) => {
                    const next = new Set(selectedIds);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    setSelectedIds(next);
                  }}
                  onEdit={(item) => {
                    setEditingId(item.id);
                    setForm(item);
                    setImagePreview(item.imageUrl);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onDuplicate={(item) => {
                    setForm({ ...item, id: undefined, filename: item.filename + " (Copy)" });
                    setImagePreview(item.imageUrl);
                    setEditingId(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onDelete={handleDelete}
                  onDownload={downloadImage}
                  onRefresh={handleRefreshOne}
                  refreshingId={refreshingId}
                  copyOkId={copyOkId}
                  onCopyUrl={(url, id) => {
                    navigator.clipboard.writeText(url);
                    setCopyOkId(id);
                    setTimeout(() => setCopyOkId(null), 1500);
                    toast("success", "URL Copied");
                  }}
                  flashKey={flashKey}
                />
              ))}
              {filteredItems.length === 0 && !busy && (
                <div className="col-span-full py-20 rounded-3xl border border-dashed border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center">
                  <div className="p-4 rounded-full bg-white/5 mb-4">
                    <LayoutGrid size={32} className="text-gray-700" />
                  </div>
                  <h3 className="font-bold text-gray-500">No assets found</h3>
                  <p className="text-xs text-gray-600 mt-1 uppercase tracking-widest font-black">Try adjusting your filters or search</p>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Sidebar Form */}
          <div className="order-1 lg:order-2">
            <ThumbnailForm
              editingId={editingId}
              form={form}
              setForm={setForm}
              onSave={handleSave}
              onCancel={() => { setEditingId(null); setForm(DEFAULT_FORM); setImagePreview(""); }}
              onImageSelected={handleImageSelected}
              onFetchYouTube={handleFetchYouTube}
              imagePreview={imagePreview}
              busy={busy}
              busyLabel={busyLabel}
              vErrs={vErrs}
              presets={presets}
            />

            {/* Quick Stats Widget */}
            {stats && (
              <div className="mt-8 p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Storage Insights</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-white leading-none">{stats.count || 0}</p>
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-tighter mt-1">Total Assets</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-none">{formatBytes(stats.size || 0)}</p>
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-tighter mt-1">Storage Used</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Error Floating Banner */}
      {err && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] max-w-md w-full px-4 animate-in slide-in-from-bottom-5">
          <div className="p-4 rounded-2xl bg-red-500 text-white shadow-2xl flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Operation Failed</p>
              <p className="text-xs opacity-90 truncate">{err}</p>
            </div>
            <button onClick={clearError} className="p-1 hover:bg-black/10 rounded-lg">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
