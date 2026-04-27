// src/components/hub/MediaHub.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
    Upload, 
    Link as LinkIcon, 
    Grid, 
    List, 
    Archive, 
    Trash2, 
    Search,
    Video as VideoIcon,
    Image as ImageIcon,
    Play,
    CheckCircle2,
    Clock,
    AlertCircle,
    Copy,
    ExternalLink,
    Plus,
    Filter,
    ArrowUpRight,
    BarChart3,
    Layers,
    PieChart,
    ChevronRight,
    Search as SearchIcon,
    Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AUTH_BASE } from "../../config/constants";
import { getAccessToken, authedFetch } from "../../utils/tokenStore";
import { extractYouTubeId } from "../../utils/youtube";
import { formatCompactNumber, resolveMediaUrl } from "../../utils/formatters";

// Management Imports
import { createVideoStorage } from "../cloudflare-video-storage";
import { createThumbnailStorage } from "../cloudflare-thumbnail-storage";
import VideoCard from "../VideoCard";
import VideoForm from "../VideoForm";
import VideoFilters from "../VideoFilters";
import ThumbnailCard from "../ThumbnailCard";
import ThumbnailForm from "../ThumbnailForm";
import ThumbnailFilters from "../ThumbnailFilters";
import { useClientStats } from "../../context/ClientStatsContext";

// ytIdFrom was a legacy local extractor; replaced by canonical extractYouTubeId
// from utils/youtube.js. Keep this alias to minimise call-site churn — remove
// on next refactor pass.
const ytIdFrom = (url) => extractYouTubeId(url) || null;

// Decode the active access token each time (cheap — parses the JWT body only).
// Token lives in tokenStore (memory) after the migration; localStorage.getItem("token")
// is always null post-migration, which is what was making every admin request
// send `Bearer null` and 401.
function parseAccessToken() {
    const t = getAccessToken();
    if (!t) return null;
    try {
        const parts = t.split(".");
        if (parts.length < 2) return null;
        const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/") + "===".slice((parts[1].length + 3) % 4);
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return JSON.parse(new TextDecoder("utf-8").decode(bytes));
    } catch { return null; }
}

export default function MediaHub() {
    const { getProxiedImage } = useClientStats();
    // Current Active Tab
    const [activeTab, setActiveTab] = useState("overview"); // "overview" | "direct" | "videos" | "thumbnails" | "collections"

    // Auth — always read the live access token so a post-mount refresh
    // (e.g. the user logged in after landing on this page, or the silent
    // refresh rotated the token) is reflected in every outbound request.
    const [payload, setPayload] = useState(() => parseAccessToken());
    useEffect(() => {
        const sync = () => setPayload(parseAccessToken());
        window.addEventListener("auth:changed", sync);
        return () => window.removeEventListener("auth:changed", sync);
    }, []);
    const isAdmin = payload?.role?.toLowerCase().includes("admin");
    const userEmail = payload?.email || "";

    // Shared States
    const [busy, setBusy] = useState(false);
    const [busyLabel, setBusyLabel] = useState("");
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [editingItem, setEditingItem] = useState(null);
    const [flashKey, setFlashKey] = useState("");
    const [copyOkId, setCopyOkId] = useState(null);

    // --- Tab 1: Direct Uploads & Archival (R2) ---
    const [urlToArchive, setUrlToArchive] = useState("");
    const [mediaItems, setMediaItems] = useState([]);
    
    // --- Tab 2: Videos (Inventory) ---
    const [videos, setVideos] = useState([]);
    const [videoFilters, setVideoFilters] = useState({ category: "ALL", kind: "ALL" });
    const [videoSort, setVideoSort] = useState({ key: "updated", dir: "desc" });
    const [videoSelectedIds, setVideoSelectedIds] = useState(new Set());
    const [videoForm, setVideoForm] = useState({
        title: "", primaryUrl: "", creatorUrl: "", category: "GAMING", 
        subcategory: "", kind: "LONG", platform: "YOUTUBE", tags: "", 
        isShinel: true, attributedTo: ""
    });
    // Storage factories receive a getter so they always read the freshest token
    // on each request, not a stale closure capture from mount.
    const videoStore = useMemo(() => createVideoStorage(AUTH_BASE, () => getAccessToken()), []);

    // --- Tab 3: Thumbnails (Inventory) ---
    const [thumbnails, setThumbnails] = useState([]);
    const [thumbFilters, setThumbFilters] = useState({ category: "ALL", variant: "ALL", onlyYT: "ALL" });
    const [thumbSort, setThumbSort] = useState({ key: "updated", dir: "desc" });
    const [thumbSelectedIds, setThumbSelectedIds] = useState(new Set());
    const [thumbForm, setThumbForm] = useState({
        filename: "", youtubeUrl: "", category: "GAMING", subcategory: "", 
        variant: "VIDEO", imageUrl: "", isShinel: true, attributedTo: ""
    });
    const [thumbPresets, setThumbPresets] = useState({
        category: [], subcategory: [], variants: ["VIDEO", "LIVE"], filenameTemplates: []
    });
    const [imagePreview, setImagePreview] = useState("");
    const thumbStore = useMemo(() => createThumbnailStorage(AUTH_BASE, () => getAccessToken()), []);

    const resetVideoForm = () => {
        setVideoForm({
            title: "", primaryUrl: "", creatorUrl: "", mirrorUrl: "", category: "GAMING", 
            subcategory: "", kind: "LONG", platform: "YOUTUBE", tags: "", 
            isShinel: true, attributedTo: isAdmin ? "" : userEmail
        });
    };

    const resetThumbForm = () => {
        setThumbForm({
            filename: "", youtubeUrl: "", category: "GAMING", subcategory: "", 
            variant: "VIDEO", imageUrl: "", isShinel: true, attributedTo: isAdmin ? "" : userEmail
        });
        setImagePreview("");
    };

    const handleAddVideo = (kind = 'LONG') => {
        setVideoForm({
            title: "", primaryUrl: "", creatorUrl: "", mirrorUrl: "", category: "GAMING", 
            subcategory: "", kind, platform: "YOUTUBE", tags: "", 
            isShinel: true, attributedTo: isAdmin ? "" : userEmail
        });
        setImagePreview("");
        setEditingItem({ type: 'video' });
    };

    const handleAddThumb = () => {
        resetThumbForm();
        setEditingItem({ type: 'thumbnail' });
    };

    const handleFetchVideoYouTube = async (url) => {
        try {
            setBusy(true);
            setBusyLabel("FETCHING METADATA...");
            const details = await videoStore.fetchYoutube(url);
                setVideoForm(f => {
                    const next = {
                        ...f,
                        title: details.title || f.title,
                        youtubeViews: details.viewCount || f.youtubeViews
                    };
                    return next;
                });
        } catch (e) {
            console.error("Fetch YT error:", e);
        } finally {
            setBusy(false);
            setBusyLabel("");
        }
    };

    const handleFetchThumbYouTube = async (url) => {
        try {
            setBusy(true);
            setBusyLabel("FETCHING METADATA...");
            const details = await thumbStore.fetchYoutube(url);
            if (details && !details.error) {
                setThumbForm(f => ({
                    ...f,
                    youtubeViews: details.viewCount || f.youtubeViews,
                }));
            }
        } catch (e) {
            console.error("Fetch YT error:", e);
        } finally {
            setBusy(false);
            setBusyLabel("");
        }
    };

    // --- Tab 4: Overview & Metrics ---
    const [stats, setStats] = useState({
        totalViews: 0,
        totalItems: 0,
        distribution: {},
        recentGrowth: []
    });

    // --- Tab 5: Collections ---
    const [collections, setCollections] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState(null);

    // --- Fetchers ---
    const fetchDirectMedia = useCallback(async () => {
        setBusy(true);
        setBusyLabel("Loading media library...");
        try {
            const res = await authedFetch(AUTH_BASE, `/api/media/library?search=${encodeURIComponent(search)}`);
            if (!res.ok) throw new Error(`Media library (${res.status})`);
            const data = await res.json();
            setMediaItems(data.items || []);
        } catch (e) {
            console.error(e);
            toast("error", "Failed to load media library");
        } finally {
            setBusy(false);
            setBusyLabel("");
        }
    // Token isn't a dep anymore — getAccessToken() is called per-request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const loadVideos = useCallback(async () => {
        setBusy(true);
        setBusyLabel("Syncing video inventory...");
        try {
            const rows = await videoStore.getAll();
            setVideos(isAdmin ? rows : rows.filter(v => v.attributedTo === userEmail));
        } catch (e) { console.error(e); }
        finally { setBusy(false); setBusyLabel(""); }
    }, [videoStore, isAdmin, userEmail]);

    const loadThumbnails = useCallback(async () => {
        setBusy(true);
        setBusyLabel("Fetching thumbnails...");
        try {
            const rows = await thumbStore.getAll();
            setThumbnails(isAdmin ? rows : rows.filter(t => t.attributedTo === userEmail));
        } catch (e) { console.error(e); }
        finally { setBusy(false); setBusyLabel(""); }
    }, [thumbStore, isAdmin, userEmail]);

    const fetchStats = useCallback(async () => {
        setBusy(true);
        setBusyLabel("Aggregating metrics...");
        try {
            const res = await authedFetch(AUTH_BASE, `/stats`);
            if (!res.ok) throw new Error(`Stats (${res.status})`);
            const data = await res.json();
            if (data.ok) {
                setStats({
                    totalViews: data.counts.reach || 0,
                    totalItems: data.counts.thumbnails + data.counts.videos,
                    distribution: {
                        thumbnails: data.counts.thumbnails,
                        videos: data.counts.videos,
                        creators: data.counts.creators
                    },
                    recentGrowth: [] // Dashboard can expand this later
                });
            }
        } catch (e) { console.error(e); toast("error", "Failed to load stats"); }
        finally { setBusy(false); setBusyLabel(""); }
    }, []);

    const fetchCollections = useCallback(async () => {
        setBusy(true);
        setBusyLabel("Loading collections...");
        try {
            const res = await authedFetch(AUTH_BASE, `/api/collections`);
            if (!res.ok) throw new Error(`Collections (${res.status})`);
            const data = await res.json();
            setCollections(data.collections || []);
        } catch (e) { console.error(e); toast("error", "Failed to load collections"); }
        finally { setBusy(false); setBusyLabel(""); }
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get("tab");
        if (t && ["overview", "direct", "videos", "thumbnails", "collections"].includes(t)) {
            setActiveTab(t);
        }
    }, [window.location.search]);

    useEffect(() => {
        if (activeTab === "overview") fetchStats();
        if (activeTab === "direct") fetchDirectMedia();
        if (activeTab === "videos") loadVideos();
        if (activeTab === "thumbnails") loadThumbnails();
        if (activeTab === "collections") fetchCollections();
    }, [activeTab, fetchDirectMedia, loadVideos, loadThumbnails, fetchStats, fetchCollections]);

    // --- Actions ---
    const toast = (type, message) => {
        window.dispatchEvent(new CustomEvent("notify", { detail: { type, message } }));
    };

    const handleDeleteMedia = async (id) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        setBusy(true);
        setBusyLabel("Deleting from R2...");
        try {
            const res = await authedFetch(AUTH_BASE, `/api/media/delete/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error(`Delete failed (${res.status})`);
            const data = await res.json();
            if (data.ok) {
                toast("success", "Item deleted");
                fetchDirectMedia();
            } else throw new Error(data.error);
        } catch (e) { toast("error", e.message); }
        finally { setBusy(false); setBusyLabel(""); }
    };

    const handleSaveVideo = async () => {
        setBusy(true);
        setBusyLabel(editingItem?.data?.id ? "Updating record..." : "Creating record...");
        try {
            const payload = {
                ...videoForm,
                tags: typeof videoForm.tags === "string" ? videoForm.tags.split(",").map(t => t.trim()).filter(Boolean) : videoForm.tags
            };
            if (editingItem?.data?.id) {
                await videoStore.update(editingItem.data.id, payload);
            } else {
                await videoStore.add(payload);
            }
            toast("success", "Video saved successfully!");
            setEditingItem(null);
            loadVideos();
        } catch (e) { toast("error", e.message); }
        finally { setBusy(false); setBusyLabel(""); }
    };

    const handleSaveThumbnail = async () => {
        setBusy(true);
        setBusyLabel(editingItem?.data?.id ? "Updating asset..." : "Creating asset...");
        try {
            if (editingItem?.data?.id) {
                await thumbStore.update(editingItem.data.id, thumbForm);
            } else {
                await thumbStore.add(thumbForm);
            }
            toast("success", "Thumbnail asset updated!");
            setEditingItem(null);
            loadThumbnails();
        } catch (e) { toast("error", e.message); }
        finally { setBusy(false); setBusyLabel(""); }
    };

    const handleThumbnailImageSelected = async (file) => {
        if (!file) return;
        setBusy(true);
        setBusyLabel("Uploading to storage...");
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await authedFetch(AUTH_BASE, `/api/media/upload`, {
                method: "POST",
                body: formData
            });
            if (!res.ok) throw new Error(`Upload failed (${res.status})`);
            const data = await res.json();
            if (data.ok) {
                // Worker returns a relative path like `/api/media/view/<uuid>.jpg`.
                // Store the relative path in the form (so D1 stays origin-agnostic),
                // but resolve through AUTH_BASE for the <img> preview — otherwise
                // the browser tries to load it from shinelstudios.in and 404s.
                setThumbForm(f => ({ ...f, imageUrl: data.url }));
                setImagePreview(resolveMediaUrl(data.url, AUTH_BASE));
                toast("success", "Image uploaded!");
                fetchDirectMedia();
            } else {
                throw new Error(data.error || "Upload failed");
            }
        } catch (e) { toast("error", e.message); }
        finally { setBusy(false); setBusyLabel(""); }
    };

    const handleRefreshMetrics = async () => {
        setBusy(true);
        setBusyLabel("Refreshing all metrics...");
        try {
            const res = await authedFetch(AUTH_BASE, `/api/media/refresh-metrics`, { method: "POST" });
            if (!res.ok) throw new Error(`Refresh failed (${res.status})`);
            const data = await res.json();
            if (data.ok) {
                toast("success", `Updated ${data.updated} records`);
                fetchDirectMedia();
            } else throw new Error(data.error);
        } catch (e) { toast("error", e.message); }
        finally { setBusy(false); setBusyLabel(""); }
    };

    // formatViews uses the shared formatCompactNumber (utils/formatters.js).
    // Aliased here to keep call-site names unchanged while the inline duplicate
    // is deleted.
    const formatViews = formatCompactNumber;

    const handleArchive = async () => {
        if (!urlToArchive) return;
        setBusy(true);
        setBusyLabel("Archiving media to R2...");
        try {
            const lines = urlToArchive.split("\n").map(l => l.trim()).filter(Boolean);
            if (lines.length > 1) {
                // Batch mode
                const res = await authedFetch(AUTH_BASE, `/api/media/bulk-archive`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ urls: lines, category: "BATCH" })
                });
                if (!res.ok) throw new Error(`Bulk archive failed (${res.status})`);
                const data = await res.json();
                if (data.ok) {
                    const success = data.results.filter(r => r.ok).length;
                    toast("success", `Archived ${success}/${lines.length} items`);
                    setUrlToArchive("");
                    fetchDirectMedia();
                }
            } else {
                // Single mode
                const res = await authedFetch(AUTH_BASE, `/api/media/archive-external`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: urlToArchive })
                });
                if (!res.ok) throw new Error(`Archive failed (${res.status})`);
                if ((await res.json()).ok) {
                    setUrlToArchive("");
                    toast("success", "Media archived to R2 successfully!");
                    fetchDirectMedia();
                }
            }
        } catch (e) { toast("error", e.message); }
        finally { setBusy(false); setBusyLabel(""); }
    };

    const handleBackupData = async () => {
        setBusy(true);
        setBusyLabel("Generating backup...");
        try {
            const res = await authedFetch(AUTH_BASE, `/admin/db-export`);
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shinel-db-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast("success", "Backup downloaded successfully");
        } catch (e) {
            toast("error", e.message);
        } finally {
            setBusy(false);
            setBusyLabel("");
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-gray-100 p-8 pt-24 font-sans selection:bg-orange-500/30">
            {/* Modal Overlay */}
            <AnimatePresence>
                {editingItem && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                            onClick={() => setEditingItem(null)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
                        >
                            {editingItem.type === 'video' ? (
                                <VideoForm 
                                    editingId={editingItem.data?.id}
                                    form={videoForm} setForm={setVideoForm}
                                    onSave={handleSaveVideo}
                                    onCancel={() => setEditingItem(null)}
                                    onFetchYouTube={handleFetchVideoYouTube}
                                    busy={busy}
                                    busyLabel={busyLabel}
                                    user={payload}
                                />
                            ) : editingItem.type === 'thumbnail' ? (
                                <ThumbnailForm 
                                    editingId={editingItem.data?.id}
                                    form={thumbForm} setForm={setThumbForm}
                                    onSave={(e) => { e.preventDefault(); handleSaveThumbnail(); }}
                                    onCancel={() => setEditingItem(null)}
                                    onImageSelected={handleThumbnailImageSelected}
                                    imagePreview={imagePreview}
                                    onFetchYouTube={handleFetchThumbYouTube}
                                    busy={busy}
                                    busyLabel={busyLabel}
                                    presets={thumbPresets}
                                    user={payload}
                                    vErrs={{}}
                                />
                            ) : null}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Global Loader Overlay */}
            {busy && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-black text-white uppercase tracking-[0.3em]">{busyLabel || "Processing..."}</span>
                    </div>
                </div>
            )}

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white mb-2">Media Center</h1>
                        <p className="text-sm text-gray-400 font-medium">Unified management for all platform assets</p>
                    </div>
                <div className="flex items-center gap-3">
                    {activeTab === 'videos' ? (
                        <div className="relative group">
                            <button 
                                onClick={() => handleAddVideo('LONG')}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all shadow-lg shadow-orange-900/20 active:scale-95 z-20"
                            >
                                <Plus size={18} />
                                <span>Add Video</span>
                            </button>
                            <div className="absolute right-0 mt-2 w-48 py-2 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[120]">
                                <button onClick={() => handleAddVideo('LONG')} className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-3">
                                    <VideoIcon size={14} className="text-orange-500" />
                                    Long Video
                                </button>
                                <button onClick={() => handleAddVideo('SHORT')} className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-3">
                                    <Zap size={14} className="text-yellow-500" />
                                    YouTube Short
                                </button>
                                <button onClick={() => handleAddVideo('REEL')} className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-3">
                                    <Play size={14} className="text-pink-500" />
                                    Insta Reel
                                </button>
                            </div>
                        </div>
                    ) : activeTab === 'thumbnails' ? (
                        <button 
                            onClick={handleAddThumb}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all shadow-lg shadow-orange-900/20 active:scale-95"
                        >
                            <Plus size={18} />
                            <span>Add Thumbnail</span>
                        </button>
                    ) : (
                        <div className="relative group">
                            <button 
                                onClick={() => handleAddVideo('LONG')}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all shadow-lg shadow-orange-900/20 active:scale-95 z-20"
                            >
                                <Plus size={18} />
                                <span>Add Asset</span>
                            </button>
                            <div className="absolute right-0 mt-2 w-48 py-2 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[120]">
                                <button onClick={() => handleAddVideo('LONG')} className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-3">
                                    <VideoIcon size={14} className="text-orange-500" />
                                    Video Content
                                </button>
                                <button onClick={() => handleAddThumb()} className="w-full px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-3">
                                    <ImageIcon size={14} className="text-blue-500" />
                                    Thumbnail Asset
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-8 border-b border-white/5">
                {[
                    { id: "overview", label: "Overview", icon: <BarChart3 size={14} /> },
                    { id: "direct", label: "Library", icon: <Grid size={14} /> },
                    { id: "videos", label: "Videos", icon: <VideoIcon size={14} /> },
                    { id: "thumbnails", label: "Thumbnails", icon: <ImageIcon size={14} /> },
                    // PHASE 2 · TODO — Collections tab hidden. Feature is half-built:
                    // schema + /api/collections CRUD exist; UI only has a prompt()-based
                    // "New Collection" and no detail view. Re-enable once Collections
                    // gets a proper detail surface and drag-to-add UX. Tab content at
                    // line ~943 below is kept; just not reachable via the tab bar.
                    // { id: "collections", label: "Collections", icon: <Layers size={14} /> }
                ].map((tab) => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === tab.id ? "text-orange-500" : "text-gray-500 hover:text-gray-300"}`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {activeTab === tab.id && (
                            <motion.div layoutId="media-tab-bar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                        )}
                    </button>
                ))}
            </div>

            {/* Search Bar (Shared) */}
            <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input 
                    type="text" 
                    placeholder={`Search ${activeTab}...`}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-3xl py-5 pl-16 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Tab Views */}
            <div className="min-h-[500px]">
                {/* Advanced Library Filters */}
                {activeTab === "direct" && (
                    <div className="flex flex-wrap items-center gap-4 mb-8 bg-white/[0.02] border border-white/5 p-4 rounded-3xl">
                        <div className="flex items-center gap-2 px-4 py-2 bg-black/20 rounded-xl border border-white/10">
                            <Filter size={14} className="text-gray-500" />
                            <select className="bg-transparent text-xs font-bold text-gray-300 outline-none">
                                <option>All Views</option>
                                <option>&gt; 100k</option>
                                <option>&gt; 1M</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-black/20 rounded-xl border border-white/10">
                            <Clock size={14} className="text-gray-500" />
                            <select className="bg-transparent text-xs font-bold text-gray-300 outline-none">
                                <option>Any Duration</option>
                                <option>Short (&lt; 60s)</option>
                                <option>Long (&gt; 5m)</option>
                            </select>
                        </div>
                        <div className="ml-auto text-xs font-black text-gray-600 uppercase tracking-widest">
                            {mediaItems.length} Total items
                        </div>
                    </div>
                )}
                {activeTab === "overview" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: "Total Reach", value: formatViews(stats.totalViews), icon: <ArrowUpRight className="text-green-500" />, sub: "Across all platforms" },
                                { label: "Media Library", value: stats.totalItems, icon: <Layers className="text-orange-500" />, sub: "Archived & Inventory" },
                                { label: "Active Creators", value: stats.distribution.creators || 0, icon: <Plus className="text-blue-500" />, sub: "Syncing currently" }
                            ].map((s, i) => (
                                <div key={i} className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
                                    <div className="absolute top-0 right-0 p-6 text-white/10 group-hover:text-white/20 transition-colors">
                                        {s.icon}
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">{s.label}</p>
                                    <h2 className="text-4xl font-black text-white mb-1">{s.value}</h2>
                                    <p className="text-xs text-gray-600 font-bold uppercase tracking-widest">{s.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* Middle Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Distribution */}
                            <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/5 flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-white">Media Distribution</h3>
                                    <PieChart size={20} className="text-gray-600" />
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { label: "Thumbnails", val: stats.distribution.thumbnails || 0, color: "bg-orange-500" },
                                        { label: "Videos", val: stats.distribution.videos || 0, color: "bg-blue-500" },
                                        { label: "Archived Content", val: mediaItems.length, color: "bg-green-500" }
                                    ].map((d, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between items-end">
                                                <span className="text-xs font-black uppercase tracking-widest text-gray-400">{d.label}</span>
                                                <span className="text-sm font-black text-white">{d.val}</span>
                                            </div>
                                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(d.val / (stats.totalItems || 1)) * 100}%` }}
                                                    className={`h-full ${d.color}`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Activity Heatmap Mockup / Placeholder */}
                            <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/5 flex flex-col gap-6 relative overflow-hidden">
                                <div className="flex items-center justify-between relative z-10">
                                    <h3 className="text-xl font-black text-white">Engagement Growth</h3>
                                    <BarChart3 size={20} className="text-gray-600" />
                                </div>
                                <div className="flex-grow flex items-end gap-2 relative z-10">
                                    {[40, 70, 45, 90, 65, 80, 55, 100, 75, 90, 60, 85].map((h, i) => (
                                        <motion.div 
                                            key={i}
                                            initial={{ height: 0 }}
                                            animate={{ height: `${h}%` }}
                                            className="flex-grow bg-white/5 hover:bg-orange-500/50 transition-colors rounded-t-lg"
                                        />
                                    ))}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-orange-500/5 to-transparent pointer-events-none" />
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === "direct" && (
                    <div className="space-y-8">
                        {/* Archival Utility */}
                        <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                           <div className="flex flex-col gap-6 relative z-10">
                               <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                       <Archive size={18} />
                                   </div>
                                   <div>
                                       <h3 className="text-lg font-black text-white">Smart Archival</h3>
                                       <p className="text-xs text-gray-500 uppercase tracking-widest font-black">Mirror external content to R2 storage</p>
                                   </div>
                               </div>
                               <div className="flex items-center gap-4">
                                    <textarea 
                                       placeholder="Enter YouTube or Instagram URLs (one per line for batch)..."
                                       className="flex-grow bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 min-h-[100px] resize-none"
                                       value={urlToArchive}
                                       onChange={(e) => setUrlToArchive(e.target.value)}
                                   />
                                   <div className="flex flex-col gap-3 self-end">
                                       <button 
                                           onClick={handleArchive}
                                           disabled={busy || !urlToArchive}
                                           className="px-8 py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all disabled:opacity-30"
                                       >
                                           {busy ? "Processing..." : (urlToArchive.includes("\n") ? "Batch Sync" : "Sync to Cloud")}
                                       </button>
                                       <button 
                                           onClick={handleRefreshMetrics}
                                           disabled={busy}
                                           className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                       >
                                           <Clock size={12} /> Refresh Metrics
                                       </button>
                                   </div>
                               </div>
                           </div>
                        </div>

                        {/* Recent Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {mediaItems.map((item) => (
                                <motion.div 
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="group relative rounded-3xl bg-white/[0.02] border border-white/[0.05] overflow-hidden hover:border-orange-500/30 transition-all p-3"
                                >
                                    <div className="aspect-video relative rounded-2xl overflow-hidden mb-4">
                                        <img 
                                            src={getProxiedImage(item.type === 'video' ? `https://i.ytimg.com/vi/${item.sourceUrl ? ytIdFrom(item.sourceUrl) : (item.r2Key?.split('/')?.pop()?.split('.')[0] || "")}/hqdefault.jpg` : (item.thumbnailUrl || (item.r2Key ? `/api/media/view/${item.r2Key.split('/').pop()}` : 'https://placehold.co/600x400/111/orange?text=Media')))}
                                            alt="" 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                            onError={(e) => { e.target.src = 'https://placehold.co/600x400/111/orange?text=Media'; }}
                                        />
                                        
                                        {/* Overlay Stats */}
                                        {item.type === 'video' && item.viewCount > 0 && (
                                            <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                                                <Play size={10} className="text-orange-500 fill-orange-500" />
                                                <span className="text-[10px] font-black text-white">{formatViews(item.viewCount)}</span>
                                            </div>
                                        )}
                                        {item.duration && (
                                            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10">
                                                <span className="text-[10px] font-black text-white">{item.duration}</span>
                                            </div>
                                        )}

                                        {item.status === 'pending_mirror' && (
                                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                                                <div className="px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center gap-2 animate-pulse">
                                                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Mirroring...</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                            <a 
                                                href={item.mirrorUrl ? `https://youtube.com/watch?v=${item.mirrorUrl}` : (item.sourceUrl || `/api/media/view/${item.r2Key?.split('/')?.pop() || ""}`)} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors"
                                            >
                                                <ExternalLink size={18} />
                                            </a>
                                            <button 
                                                onClick={() => handleDeleteMedia(item.id)}
                                                className="w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <h4 className="text-sm font-bold text-white line-clamp-1 mb-1 px-1" title={item.title}>{item.title}</h4>
                                    <p className="text-[10px] text-gray-500 font-medium px-1 mb-3 truncate">{item.channelTitle || "External Source"}</p>
                                    
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex gap-2">
                                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded">{item.type}</span>
                                            <span className="text-[9px] font-black text-orange-500/70 uppercase tracking-widest bg-orange-500/5 px-1.5 py-0.5 rounded">{item.category}</span>
                                        </div>
                                        <span className="text-[8px] text-gray-700 font-bold uppercase">{new Date(item.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </motion.div>
                            ))}
                            {mediaItems.length === 0 && !busy && (
                                <div className="col-span-full py-20 text-center">
                                    <Archive size={48} className="mx-auto text-gray-800 mb-4" />
                                    <p className="text-gray-500 font-medium">No media found in library</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "videos" && (
                    <div className="space-y-6">
                        <VideoFilters 
                            search={search} setSearch={setSearch}
                            filters={videoFilters} setFilters={setVideoFilters}
                            sort={videoSort} setSort={setVideoSort}
                            totalCount={videos.length}
                            selectedCount={videoSelectedIds.size}
                            onRefreshAll={() => videoStore.refreshAll().then(loadVideos)}
                            onBackupData={handleBackupData}
                            busy={busy}
                            viewMode="grid" setViewMode={() => {}}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {videos
                                .filter(v => v && v.title && v.title.toLowerCase().includes(search.toLowerCase()))
                                .map((v) => (
                                <VideoCard 
                                    key={v.id} 
                                    v={v}
                                    isSelected={videoSelectedIds.has(v.id)}
                                    onToggleSelect={(id) => setVideoSelectedIds(prev => {
                                        const next = new Set(prev);
                                        next.has(id) ? next.delete(id) : next.add(id);
                                        return next;
                                    })}
                                    flashKey={flashKey}
                                    onEdit={() => {
                                        setVideoForm({
                                            ...v,
                                            tags: Array.isArray(v.tags) ? v.tags.join(", ") : v.tags
                                        });
                                        setEditingItem({ type: 'video', data: v });
                                    }}
                                    onDelete={() => videoStore.delete(v.id).then(loadVideos)}
                                    onRefresh={(id) => videoStore.refresh(id).then(loadVideos)}
                                    isAdmin={isAdmin}
                                    busy={busy}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "thumbnails" && (
                    <div className="space-y-6">
                        <ThumbnailFilters 
                            search={search} setSearch={setSearch}
                            filters={thumbFilters} setFilters={setThumbFilters}
                            sort={thumbSort} setSort={setThumbSort}
                            totalCount={thumbnails.length}
                            selectedCount={thumbSelectedIds.size}
                            onBulkDelete={() => thumbStore.bulkDelete([...thumbSelectedIds]).then(() => { setThumbSelectedIds(new Set()); loadThumbnails(); })}
                            onRefreshAll={() => thumbStore.refreshAll().then(loadThumbnails)}
                            busy={busy}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {thumbnails
                                .filter(t => {
                                    if (!t) return false;
                                    const searchLower = search.toLowerCase();
                                    const name = (t.filename || t.title || t.videoId || "").toLowerCase();
                                    return name.includes(searchLower);
                                })
                                .map((t) => (
                                <ThumbnailCard 
                                    key={t.id} 
                                    t={t}
                                    isSelected={thumbSelectedIds.has(t.id)}
                                    onToggleSelect={(id) => setThumbSelectedIds(prev => {
                                        const next = new Set(prev);
                                        next.has(id) ? next.delete(id) : next.add(id);
                                        return next;
                                    })}
                                    flashKey={flashKey}
                                    refreshingId={null}
                                    onEdit={() => {
                                        setThumbForm(t);
                                        setImagePreview(resolveMediaUrl(t.imageUrl, AUTH_BASE));
                                        setEditingItem({ type: 'thumbnail', data: t });
                                    }}
                                    onDelete={() => thumbStore.delete(t.id).then(loadThumbnails)}
                                    // ThumbnailCard now passes (videoId, rowId). refreshOne() hits
                                    // /thumbnails/refresh/<videoId> which updates both inventory tables.
                                    onRefresh={(videoId /* , rowId */) => thumbStore.refreshOne(videoId).then(loadThumbnails)}
                                    onDuplicate={(item) => thumbStore.add({ ...item, id: undefined, filename: `${item.filename} (Copy)` }).then(loadThumbnails)}
                                    onDownload={(url, filename) => {
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = filename || 'thumbnail.jpg';
                                        a.target = '_blank';
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                    }}
                                    onCopyUrl={(url, id) => {
                                        navigator.clipboard.writeText(url);
                                        setCopyOkId(id);
                                        setTimeout(() => setCopyOkId(null), 2000);
                                    }}
                                    copyOkId={copyOkId}
                                />
                            ))}
                            {thumbnails.length === 0 && !busy && (
                                <div className="col-span-full py-20 text-center">
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No thumbnails yet. Add one above.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "collections" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-white">Media Collections</h3>
                            <button 
                                onClick={() => {
                                    const name = prompt("Collection Name:");
                                    if (name) {
                                        fetch(`${AUTH_BASE}/api/collections`, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getAccessToken()}` },
                                            body: JSON.stringify({ name })
                                        }).then(() => fetchCollections());
                                    }
                                }}
                                className="px-4 py-2 rounded-xl bg-orange-500/10 text-orange-500 text-xs font-black uppercase tracking-widest hover:bg-orange-500/20 transition-all flex items-center gap-2"
                            >
                                <Plus size={14} /> New Collection
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {collections.map((c) => (
                                <div 
                                    key={c.id} 
                                    className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5 flex flex-col gap-4 group hover:border-orange-500/30 transition-all cursor-pointer"
                                    onClick={() => setSelectedCollection(c)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                            <Layers size={20} />
                                        </div>
                                        <ChevronRight size={18} className="text-gray-700 group-hover:text-orange-500 transition-colors" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-white">{c.name}</h4>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{c.item_count || 0} Items</p>
                                    </div>
                                </div>
                            ))}
                            {collections.length === 0 && (
                                <div className="col-span-full py-20 text-center rounded-[40px] border-2 border-dashed border-white/5">
                                    <p className="text-gray-600 font-black uppercase tracking-[0.2em] text-xs">No collections found</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
);
}
