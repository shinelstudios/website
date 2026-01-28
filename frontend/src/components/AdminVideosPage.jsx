// src/components/AdminVideosPage.jsx
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
  Video as VideoIcon,
} from "lucide-react";
import { createVideoStorage } from "./cloudflare-video-storage";
import { VIDEO_CATEGORIES, VIDEO_KINDS } from "../utils/constants";
import { runWithConcurrency } from "../utils/helpers";
import { LoadingOverlay } from "./AdminUIComponents";

// Sub-components
import VideoCard from "./VideoCard";
import VideoForm from "./VideoForm";
import VideoFilters from "./VideoFilters";

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE?.replace(/\/+$/, "") || "https://shinel-auth.shinelstudioofficial.workers.dev";
const LS_TOKEN_KEY = "token";

const DEFAULT_FORM = {
  title: "",
  primaryUrl: "",
  creatorUrl: "",
  category: "GAMING",
  subcategory: "",
  kind: "LONG",
  tags: "",
  isShinel: true,
  attributedTo: "",
};

const store = createVideoStorage(AUTH_BASE, () => localStorage.getItem(LS_TOKEN_KEY));

function toast(type, message) {
  window.dispatchEvent(
    new CustomEvent("notify", { detail: { type: type === "error" ? "error" : "success", message: String(message || "") } })
  );
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [err, setErr] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [refreshingId, setRefreshingId] = useState(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState("grid");

  // Auth & Roles
  const token = localStorage.getItem("token") || "";
  const payload = useMemo(() => {
    try {
      const parts = token.split(".");
      if (parts.length < 2) return null;
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/") + "===".slice((parts[1].length + 3) % 4);
      return JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch { return null; }
  }, [token]);

  const userEmail = payload?.email || localStorage.getItem("userEmail") || "";
  const rawRole = (payload?.role || localStorage.getItem("role") || "client").toLowerCase();
  const userRoles = useMemo(() => rawRole.split(",").map(r => r.trim()).filter(Boolean), [rawRole]);
  const isAdmin = userRoles.includes("admin");
  const isEditor = userRoles.includes("editor");

  // Search & Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({ category: "ALL", kind: "ALL" });
  const [sort, setSort] = useState({ key: "updated", dir: "desc" });
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [form, setForm] = useState(DEFAULT_FORM);

  // ---------- Data Loaders ----------
  const loadVideos = useCallback(async () => {
    setBusy(true);
    setBusyLabel("Syncing video inventory...");
    try {
      const rows = await store.getAll();
      const filtered = isAdmin ? (rows || []) : (rows || []).filter(v => v.attributedTo === userEmail);
      startTransition(() => setVideos(filtered));
    } catch (e) {
      setErr(e.message || "Failed to load videos");
      toast("error", "Failed to load videos");
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // ---------- Actions ----------
  const handleSave = async () => {
    setBusy(true);
    setBusyLabel(editingId ? "Updating record..." : "Creating record...");
    try {
      const payload = {
        ...form,
        tags: typeof form.tags === "string" ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : form.tags
      };

      const out = editingId ? await store.update(editingId, payload) : await store.add(payload);
      const saved = out.video || out.data || out;

      await loadVideos();
      setFlashKey(String(saved?.id || ""));
      setTimeout(() => setFlashKey(""), 3000);
      toast("success", editingId ? "Updated video" : "Created video");

      setForm(DEFAULT_FORM);
      setEditingId(null);
    } catch (e) {
      setErr(e.message || "Failed to save video");
      toast("error", "Save failed");
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  const handleDelete = async (id, video) => {
    if (!isAdmin && video?.isShinel) {
      toast("error", "Only Admin can delete Shinel Studios assets.");
      return;
    }
    if (!confirm("Are you sure? This is permanent.")) return;
    setBusy(true);
    try {
      await store.delete(id);
      await loadVideos();
      toast("success", "Video removed");
    } catch (e) {
      toast("error", "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length || !confirm(`Delete ${ids.length} selected videos?`)) return;

    setBusy(true);
    setBusyLabel(`Batch deleting ${ids.length} items...`);
    try {
      await store.bulkDelete(ids);
      setSelectedIds(new Set());
      await loadVideos();
      toast("success", `Bulk removal complete`);
    } catch (e) {
      toast("error", "Bulk delete failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async (videoId) => {
    if (!videoId) return;
    setRefreshingId(videoId);
    try {
      await store.refresh(videoId);
      await loadVideos();
      toast("success", "Views updated");
    } catch (e) { toast("error", "Refresh failed"); }
    finally { setRefreshingId(null); }
  };

  const handleRefreshAll = async () => {
    setRefreshingAll(true);
    try {
      await store.refreshAll();
      await loadVideos();
      toast("success", "Global refresh queued");
    } catch (e) { toast("error", "Sync failed"); }
    finally { setRefreshingAll(false); }
  };

  // ---------- Filters & Search ----------
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filteredItems = useMemo(() => {
    let list = [...videos];
    if (debouncedSearch) {
      list = list.filter(v =>
        v.title?.toLowerCase().includes(debouncedSearch) ||
        v.category?.toLowerCase().includes(debouncedSearch) ||
        v.attributedTo?.toLowerCase().includes(debouncedSearch)
      );
    }
    if (filters.category !== "ALL") list = list.filter(v => v.category === filters.category);
    if (filters.kind !== "ALL") list = list.filter(v => v.kind === filters.kind);

    list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "views") return dir * ((a.youtubeViews || 0) - (b.youtubeViews || 0));
      if (sort.key === "title") return dir * a.title.localeCompare(b.title);
      return dir * ((a.lastUpdated || a.dateAdded || 0) - (b.lastUpdated || b.dateAdded || 0));
    });
    return list;
  }, [videos, debouncedSearch, filters, sort]);

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-black">
      <LoadingOverlay show={busy} label={busyLabel} />

      <div className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 items-start">

          {/* Main Content Area */}
          <div className="space-y-6 order-2 lg:order-1">
            <VideoFilters
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
              totalCount={videos.length}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />

            <div className={viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              : "flex flex-col gap-3"
            }>
              {filteredItems.map(v => (
                <VideoCard
                  key={v.id || v.videoId}
                  v={v}
                  onEdit={(item) => {
                    setEditingId(item.id || item.videoId);
                    setForm({
                      ...item,
                      tags: Array.isArray(item.tags) ? item.tags.join(", ") : item.tags || "",
                      isVisibleOnPersonal: item.isVisibleOnPersonal !== false
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onDelete={() => handleDelete(v.id || v.videoId, v)}
                  onRefresh={() => handleRefresh(v.id || v.videoId)}
                  busy={refreshingId === (v.id || v.videoId)}
                  isSelected={selectedIds.has(v.id)}
                  viewMode={viewMode}
                  onToggleSelect={(id) => {
                    const next = new Set(selectedIds);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    setSelectedIds(next);
                  }}
                  flashKey={flashKey}
                />
              ))}

              {filteredItems.length === 0 && !busy && (
                <div className="p-20 rounded-3xl border border-dashed border-white/5 bg-white/[0.01] flex flex-col items-center text-center col-span-full">
                  <div className="p-4 rounded-full bg-white/5 mb-4 text-gray-700">
                    <VideoIcon size={32} />
                  </div>
                  <h3 className="font-bold text-gray-500">No matching videos</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mt-2">Check filters or adjust search terms</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Form */}
          <div className="order-1 lg:order-2">
            <VideoForm
              editingId={editingId}
              form={form}
              setForm={setForm}
              onSave={handleSave}
              onCancel={() => {
                setEditingId(null);
                setForm(DEFAULT_FORM);
              }}
              busy={busy}
              busyLabel={busyLabel}
              user={{ email: userEmail, roles: userRoles, isAdmin, isEditor }}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
