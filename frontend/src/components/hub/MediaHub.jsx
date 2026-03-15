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
    ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AUTH_BASE } from "../../config/constants";

// Management Imports
import { createVideoStorage } from "../cloudflare-video-storage";
import { createThumbnailStorage } from "../cloudflare-thumbnail-storage";
import VideoCard from "../VideoCard";
import VideoForm from "../VideoForm";
import VideoFilters from "../VideoFilters";
import ThumbnailCard from "../ThumbnailCard";
import ThumbnailForm from "../ThumbnailForm";
import ThumbnailFilters from "../ThumbnailFilters";

const LS_TOKEN_KEY = "token";

export default function MediaHub() {
    // Current Active Tab
    const [activeTab, setActiveTab] = useState("direct"); // "direct" | "videos" | "thumbnails"
    
    // Auth
    const token = localStorage.getItem(LS_TOKEN_KEY);
    const [payload] = useState(() => {
        try {
            const parts = token.split(".");
            if (parts.length < 2) return null;
            const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/") + "===".slice((parts[1].length + 3) % 4);
            return JSON.parse(decodeURIComponent(escape(atob(b64))));
        } catch { return null; }
    });
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
    const videoStore = useMemo(() => createVideoStorage(AUTH_BASE, () => token), [token]);

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
    const thumbStore = useMemo(() => createThumbnailStorage(AUTH_BASE, () => token), [token]);

    // --- Fetchers ---
    const fetchDirectMedia = async () => {
        try {
            const res = await fetch(`${AUTH_BASE}/clients/pulse`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            setMediaItems(data.activities || []);
        } catch (e) { console.error(e); }
    };

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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get("tab");
        if (t && ["direct", "videos", "thumbnails"].includes(t)) {
            setActiveTab(t);
        }
    }, [window.location.search]);

    useEffect(() => {
        fetchDirectMedia();
        loadVideos();
        loadThumbnails();
    }, [loadVideos, loadThumbnails]);

    // --- Actions ---
    const toast = (type, message) => {
        window.dispatchEvent(new CustomEvent("notify", { detail: { type, message } }));
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
            const res = await fetch(`${AUTH_BASE}/api/thumbnails/upload`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (data.ok) {
                setThumbForm(f => ({ ...f, imageUrl: data.url }));
                setImagePreview(data.url);
                toast("success", "Image uploaded!");
            } else {
                throw new Error(data.error || "Upload failed");
            }
        } catch (e) { toast("error", e.message); }
        finally { setBusy(false); setBusyLabel(""); }
    };

    const handleArchive = async () => {
        if (!urlToArchive) return;
        setBusy(true);
        setBusyLabel("Archiving media to R2...");
        try {
            const res = await fetch(`${AUTH_BASE}/api/media/archive-external`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ url: urlToArchive })
            });
            if ((await res.json()).ok) {
                setUrlToArchive("");
                toast("success", "Media archived to R2 successfully!");
                fetchDirectMedia();
            }
        } catch (e) { toast("error", e.message); }
        finally { setBusy(false); setBusyLabel(""); }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white mb-2">Media Center</h1>
                    <p className="text-sm text-gray-400 font-medium">Unified management for all platform assets</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setEditingItem({})}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all shadow-lg shadow-orange-900/20 active:scale-95"
                    >
                        <Plus size={18} />
                        <span>Add Asset</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-8 border-b border-white/5">
                {[
                    { id: "direct", label: "Direct & Archived", icon: <Grid size={14} /> },
                    { id: "videos", label: "Video Manager", icon: <VideoIcon size={14} /> },
                    { id: "thumbnails", label: "Thumbnail Manager", icon: <ImageIcon size={14} /> }
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
                                   <input 
                                       type="text" 
                                       placeholder="Enter YouTube or Instagram URL..."
                                       className="flex-grow bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                       value={urlToArchive}
                                       onChange={(e) => setUrlToArchive(e.target.value)}
                                   />
                                   <button 
                                       onClick={handleArchive}
                                       disabled={busy || !urlToArchive}
                                       className="px-8 py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-black"
                                   >
                                       {busy ? "Processing..." : "Sync to Cloud"}
                                   </button>
                               </div>
                           </div>
                        </div>

                        {/* Recent Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {mediaItems.map((item, idx) => (
                                <motion.div 
                                    key={item.id + idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="group relative rounded-3xl bg-white/[0.02] border border-white/[0.05] overflow-hidden hover:border-orange-500/30 transition-all p-3"
                                >
                                    <div className="aspect-video relative rounded-2xl overflow-hidden mb-4">
                                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Play className="text-white fill-white" size={32} />
                                        </div>
                                    </div>
                                    <h4 className="text-sm font-bold text-white line-clamp-1 mb-1 px-1">{item.title}</h4>
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{item.type}</span>
                                        <ExternalLink size={12} className="text-gray-700 group-hover:text-orange-500 transition-colors" />
                                    </div>
                                </motion.div>
                            ))}
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
                            busy={busy}
                            viewMode="grid" setViewMode={() => {}}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {videos
                                .filter(v => v.title.toLowerCase().includes(search.toLowerCase()))
                                .map((v) => (
                                <VideoCard 
                                    key={v.id} 
                                    v={v} 
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
                            onRefreshAll={() => thumbStore.refreshAll().then(loadThumbnails)}
                            busy={busy}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {thumbnails
                                .filter(t => t.filename.toLowerCase().includes(search.toLowerCase()))
                                .map((t) => (
                                <ThumbnailCard 
                                    key={t.id} 
                                    t={t} 
                                    onEdit={() => {
                                        setThumbForm(t);
                                        setImagePreview(t.imageUrl);
                                        setEditingItem({ type: 'thumbnail', data: t });
                                    }}
                                    onDelete={() => thumbStore.delete(t.id).then(loadThumbnails)}
                                    onRefresh={(url, id) => thumbStore.refresh(id).then(loadThumbnails)}
                                    onCopyUrl={(url, id) => {
                                        navigator.clipboard.writeText(url);
                                        setCopyOkId(id);
                                        setTimeout(() => setCopyOkId(null), 2000);
                                    }}
                                    copyOkId={copyOkId}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Overlays */}
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
                            {(editingItem.type === 'video' || (activeTab === 'videos' && !editingItem.type)) ? (
                                <VideoForm 
                                    editingId={editingItem.data?.id}
                                    form={videoForm} setForm={setVideoForm}
                                    onSave={handleSaveVideo}
                                    onCancel={() => setEditingItem(null)}
                                    busy={busy}
                                    user={payload}
                                />
                            ) : (
                                <ThumbnailForm 
                                    editingId={editingItem.data?.id}
                                    form={thumbForm} setForm={setThumbForm}
                                    onSave={(e) => { e.preventDefault(); handleSaveThumbnail(); }}
                                    onCancel={() => setEditingItem(null)}
                                    onImageSelected={handleThumbnailImageSelected}
                                    imagePreview={imagePreview}
                                    onFetchYouTube={(url) => thumbStore.fetchYoutube(url).then(res => setThumbForm(f => ({ ...f, youtubeViews: res.views })))}
                                    busy={busy}
                                    presets={thumbPresets}
                                    user={payload}
                                />
                            )}
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
        </div>
    );
}
