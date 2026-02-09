// src/components/AdminClientsPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    Plus,
    Trash2,
    ExternalLink,
    RefreshCw,
    Youtube,
    Instagram,
    ShieldCheck,
    AlertCircle,
    UserPlus,
    Search,
    X,
    CheckSquare,
    Square,
    TrendingUp,
    TrendingDown,
    Edit3,
    Users,
    RotateCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useClientStats } from "../context/ClientStatsContext";
import { Input, SelectWithPresets, LoadingOverlay } from "./AdminUIComponents";
import Skeleton from "./Skeleton";
import Sparkline from "./Sparkline";
import { AUTH_BASE } from "../config/constants";

export default function AdminClientsPage() {
    const { refreshStats, refreshSync, getProxiedImage } = useClientStats();
    const [clients, setClients] = useState([]);
    const [busy, setBusy] = useState(false);
    const [refreshingId, setRefreshingId] = useState(null);
    const [err, setErr] = useState("");
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [syncErrors, setSyncErrors] = useState([]);
    const [syncReport, setSyncReport] = useState(null);

    const [form, setForm] = useState({
        name: "",
        youtubeId: "",
        handle: "",
        instagramHandle: "",
        category: "Vlogger",
        status: "active",
        subscribers: "",
        instagramFollowers: "",
        instagramLogo: ""
    });

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        name: "",
        youtubeId: "",
        handle: "",
        instagramHandle: "",
        category: "",
        status: "",
        subscribers: "",
        instagramFollowers: "",
        instagramLogo: ""
    });

    const [token, setToken] = useState(() => localStorage.getItem("token") || "");
    const payload = useMemo(() => {
        try {
            const parts = token.split(".");
            if (parts.length < 2) return null;
            const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/") + "===".slice((parts[1].length + 3) % 4);
            return JSON.parse(decodeURIComponent(escape(atob(b64))));
        } catch { return null; }
    }, [token]);

    const rawRole = (payload?.role || localStorage.getItem("role") || "client").toLowerCase();
    const userRoles = useMemo(() => rawRole.split(",").map(r => r.trim()).filter(Boolean), [rawRole]);
    const isAdmin = userRoles.includes("admin");
    const firstName = payload?.firstName || localStorage.getItem("firstName") || "Team";

    const authHeaders = useMemo(() => ({
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`
    }), [token]);

    useEffect(() => {
        const onAuth = () => {
            const newToken = localStorage.getItem("token") || "";
            if (newToken !== token) setToken(newToken);
        };
        window.addEventListener("auth:changed", onAuth);
        return () => window.removeEventListener("auth:changed", onAuth);
    }, [token]);

    const { stats: globalStats, getHistory, getGrowth, fetchSyncErrors } = useClientStats();

    const loadClients = useCallback(async () => {
        setBusy(true);
        setErr("");
        try {
            const [clientData, errors] = await Promise.all([
                fetch(`${AUTH_BASE}/clients`, { headers: authHeaders }).then(r => r.json()),
                fetchSyncErrors()
            ]);
            setClients(clientData.clients || []);
            setSyncErrors(errors || []);
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }, [authHeaders, fetchSyncErrors]);

    useEffect(() => {
        loadClients();
    }, [loadClients]);

    async function createClient(e) {
        e.preventDefault();
        if (!form.name || (!form.youtubeId && !form.instagramHandle)) return setErr("Name and at least one platform ID (YouTube or Instagram) required");
        const payload = {
            name: form.name,
            youtubeId: form.youtubeId,
            handle: form.handle,
            instagramHandle: form.instagramHandle,
            category: form.category,
            status: form.status,
            subscribers: form.subscribers ? Number(form.subscribers) : 0,
            instagramFollowers: form.instagramFollowers ? Number(form.instagramFollowers) : 0,
            instagramLogo: form.instagramLogo
        };

        setBusy(true);
        setErr("");
        try {
            const res = await fetch(`${AUTH_BASE}/clients`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to create client");
            setForm({ name: "", youtubeId: "", handle: "", instagramHandle: "", category: "Vlogger", status: "active", subscribers: "" });
            await loadClients();
            await refreshSync();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function deleteClient(id, name) {
        if (!confirm(`Remove ${name} from Pulse?`)) return;
        setBusy(true);
        try {
            const res = await fetch(`${AUTH_BASE}/clients/${encodeURIComponent(id)}`, {
                method: "DELETE",
                headers: authHeaders
            });
            if (!res.ok) throw new Error("Delete failed");
            await loadClients();
            await refreshSync();
            setSelectedIds(prev => prev.filter(p => p !== id));
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function deleteBulk() {
        if (!selectedIds.length) return;
        if (!confirm(`Remove ${selectedIds.length} creators from Pulse?`)) return;
        setBusy(true);
        try {
            const res = await fetch(`${AUTH_BASE}/clients/bulk`, {
                method: "DELETE",
                headers: authHeaders,
                body: JSON.stringify({ ids: selectedIds })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Bulk delete failed");
            await loadClients();
            await refreshSync();
            setSelectedIds([]);
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    async function refreshSingleClient(clientId, force = false) {
        setRefreshingId(clientId);
        try {
            const result = await refreshSync(force); // Pass force flag
            if (result.errors?.length > 0) {
                const myErr = result.errors.find(e => e.id === clientId);
                if (myErr) setErr(`Sync error for ${myErr.name}: ${myErr.error}`);
            }
            await loadClients();
        } catch (e) {
            console.error(e);
            if (e.status === 429) {
                if (!force) {
                    setErr("Sync cooldown active. Shift+Click the refresh button to force sync immediately.");
                } else {
                    setErr("Sync limit reached even with force. Please wait.");
                }
            } else {
                setErr(e.message || "Sync failed");
            }
        } finally {
            setRefreshingId(null);
        }
    }

    async function refreshAllClients() {
        setBusy(true);
        setSyncReport(null);
        try {
            const result = await refreshSync();
            setSyncReport(result);
            await loadClients();
        } catch (e) {
            if (e.status === 429) {
                setErr("Too many sync requests. Please wait a few minutes before trying again.");
            } else {
                setErr(e.message);
            }
        } finally {
            setBusy(false);
        }
    }

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map(c => c.id));
        }
    };

    function startEdit(client) {
        setEditingId(client.id);
        setEditForm({
            name: client.name || "",
            youtubeId: client.youtubeId || "",
            handle: client.handle || "",
            instagramHandle: client.instagramHandle || client.instagram_handle || "",
            category: client.category || "",
            status: client.status || "active",
            subscribers: client.subscribers || "",
            instagramFollowers: client.instagramFollowers || client.instagram_followers || "",
            instagramLogo: client.instagramLogo || client.instagram_logo || ""
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setErr("");
    }

    async function saveEdit(e) {
        e.preventDefault();
        if (!editForm.name || (!editForm.youtubeId && !editForm.instagramHandle)) return setErr("Name and at least one platform ID (YouTube or Instagram) required");

        const payload = {
            name: editForm.name,
            youtubeId: editForm.youtubeId,
            handle: editForm.handle,
            instagramHandle: editForm.instagramHandle,
            category: editForm.category,
            status: editForm.status,
            subscribers: editForm.subscribers ? Number(editForm.subscribers) : 0,
            instagramFollowers: editForm.instagramFollowers ? Number(editForm.instagramFollowers) : 0,
            instagramLogo: editForm.instagramLogo
        };

        setBusy(true);
        setErr("");
        try {
            const res = await fetch(`${AUTH_BASE}/clients/${encodeURIComponent(editingId)}`, {
                method: "PUT",
                headers: authHeaders,
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Update failed");
            setEditingId(null);
            await loadClients();
            refreshStats();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }


    const enrichedClients = useMemo(() => {
        return clients.map(client => {
            const h = (client.handle || "").toLowerCase();
            const hAt = h.startsWith('@') ? h : `@${h}`;

            const y = (client.youtubeId || "").toLowerCase();
            const yAt = y.startsWith('@') ? y : `@${y}`;

            const n = (client.name || "").toLowerCase();

            // More flexible matching
            const s = globalStats.find(s => {
                const sId = (s.id || "").toLowerCase();
                const sh = (s.handle || "").toLowerCase();
                const shAt = (sh && !sh.startsWith('@')) ? `@${sh}` : sh;
                const sTitle = (s.title || "").toLowerCase();

                // Match by channel ID
                if (y && y.startsWith('uc') && sId === y) return true;

                // Match by handle
                if (yAt && yAt.length > 1 && (sh === yAt || shAt === yAt)) return true;
                if (hAt && hAt.length > 1 && (sh === hAt || shAt === hAt)) return true;

                // Match by name (exact or contains)
                if (n && (sTitle === n || sTitle.includes(n) || n.includes(sTitle))) return true;

                return false;
            }) || {};

            const syncErr = syncErrors.find(e => e.id === client.id);

            const growth = getGrowth(s.id || client.youtubeId);
            const history = getHistory(s.id || client.youtubeId);

            // Manual values from client registry
            const manualIGFollowers = Number(client.instagramFollowers || client.instagram_followers || 0);
            const manualYTSubs = Number(client.subscribers || 0);

            return {
                ...client,
                logo: client.instagramLogo || client.instagram_logo || s.logo || client.logo,
                subscribers: (manualYTSubs > 0) ? manualYTSubs : (s.subscribers || 0),
                viewCount: s.viewCount || s.views || 0,
                displayTitle: s.title || client.name,
                instagramFollowers: (manualIGFollowers > 0) ? manualIGFollowers : (s.instagramFollowers || 0),
                instagramHandle: s.instagramHandle || client.instagramHandle || client.instagram_handle,
                growth,
                history,
                matched: !!(s.id || s.instagramHandle || manualIGFollowers > 0 || manualYTSubs > 0),
                syncError: syncErr?.error || null,
                hasYT: !!(client.youtubeId || manualYTSubs > 0),
                hasIG: !!(client.instagramHandle || client.instagram_handle || manualIGFollowers > 0)
            };
        });
    }, [clients, globalStats, getHistory, getGrowth]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return enrichedClients.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.youtubeId.toLowerCase().includes(q) ||
            (c.instagramHandle && c.instagramHandle.toLowerCase().includes(q)) ||
            (c.category && c.category.toLowerCase().includes(q)) ||
            (c.status && c.status.toLowerCase().includes(q))
        );
    }, [enrichedClients, search]);

    const STATUS_OPTIONS = [
        { value: "active", label: "Active" },
        { value: "old", label: "Old / Legacy" }
    ];

    const CATEGORIES = [
        { value: "Vlogger", label: "Vlogger" },
        { value: "Streamer", label: "Streamer" },
        { value: "Gamer", label: "Gamer" },
        { value: "Music Artist", label: "Music Artist" },
        { value: "Tech", label: "Tech" },
        { value: "Lifestyle", label: "Lifestyle" },
        { value: "Education", label: "Education" },
        { value: "Other", label: "Other" }
    ];

    return (
        <section className="min-h-screen pt-24 pb-32 bg-[var(--surface)] text-[var(--text)]">
            <LoadingOverlay show={busy && clients.length > 0} label="Processing..." />

            <div className="container mx-auto px-6 max-w-7xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30">
                                <ShieldCheck size={20} className="text-orange-500" />
                            </div>
                            <div>
                                <span className="block text-[9px] font-black uppercase tracking-[0.3em] text-orange-500 mb-0.5">
                                    Admin Control
                                </span>
                                <h1 className="text-3xl md:text-4xl font-black tracking-tighter leading-none">
                                    Pulse <span className="text-orange-500 italic">Registry.</span>
                                </h1>
                            </div>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] font-medium ml-1">
                            Manage your creator network
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 pr-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-xs focus:border-orange-500/50 outline-none transition-all w-full md:w-56"
                            />
                        </div>
                        <button
                            onClick={refreshAllClients}
                            disabled={busy}
                            className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 border border-orange-500/30 rounded-lg transition-all disabled:opacity-50 text-xs font-bold"
                            title="Refresh All Stats"
                        >
                            <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
                            <span className="hidden sm:inline">Refresh All</span>
                        </button>
                        <button
                            onClick={loadClients}
                            disabled={busy}
                            className="p-2 bg-white/[0.03] border border-white/10 rounded-lg hover:bg-white/[0.06] hover:border-orange-500/30 transition-all disabled:opacity-50"
                            title="Reload List"
                        >
                            <RotateCw size={14} className={busy ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {err && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-between text-xs font-bold"
                    >
                        <div className="flex items-center gap-3">
                            <AlertCircle size={16} />
                            {err}
                        </div>
                        <button onClick={() => setErr("")} className="hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    </motion.div>
                )}

                {syncReport && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 shadow-2xl overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 p-4">
                            <button onClick={() => setSyncReport(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <X size={16} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                            <div className={`p-3 rounded-2xl ${syncReport.errors?.length === 0 ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                <RefreshCw size={24} className={busy ? "animate-spin" : ""} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black">Sync Complete.</h2>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                                    {syncReport.synced} / {syncReport.total} Creators updated successfully
                                </p>
                            </div>
                        </div>

                        {syncReport.errors?.length > 0 ? (
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                <div className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                    <AlertCircle size={12} />
                                    Diagnostic Issues ({syncReport.errors.length})
                                </div>
                                {syncReport.errors.map((error, i) => (
                                    <div key={i} className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 font-bold text-xs shrink-0">
                                                {error.name?.[0] || "?"}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white">{error.name}</div>
                                                <div className="text-[10px] text-red-400 font-medium">{error.error}</div>
                                            </div>
                                        </div>
                                        <div className="text-[9px] font-mono text-gray-600 bg-black/20 px-2 py-1 rounded">
                                            {error.id?.slice(-8)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 text-green-500 text-xs font-bold flex items-center gap-3">
                                <ShieldCheck size={16} />
                                All creators are perfectly synced with YouTube.
                            </div>
                        )}
                    </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Create Client Form */}
                    <div className="lg:col-span-1">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 backdrop-blur-xl sticky top-28 shadow-xl shadow-black/10">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
                                    <UserPlus size={18} />
                                </div>
                                <h2 className="text-base font-black uppercase tracking-wider">Add Client</h2>
                            </div>

                            <form onSubmit={createClient} className="space-y-4">
                                <Input
                                    label="Creator Name"
                                    value={form.name}
                                    onChange={(v) => setForm({ ...form, name: v })}
                                    placeholder="e.g. Gamer Mummy"
                                />

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                                            YouTube ID or Handle
                                        </label>
                                        <a
                                            href="https://commentpicker.com/youtube-channel-id.php"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[9px] font-bold text-orange-500 hover:text-orange-400 transition-colors uppercase tracking-wider"
                                        >
                                            Find ID
                                        </a>
                                    </div>
                                    <div className="relative">
                                        <Youtube
                                            size={14}
                                            className={`absolute left-3 top-1/2 -translate-y-1/2 ${form.youtubeId && !form.youtubeId.startsWith('UC') && !form.youtubeId.startsWith('@')
                                                ? 'text-orange-500'
                                                : 'text-gray-600'
                                                }`}
                                        />
                                        <input
                                            value={form.youtubeId}
                                            onChange={e => setForm({ ...form, youtubeId: e.target.value })}
                                            placeholder="UC... or @handle"
                                            className={`w-full pl-9 pr-3 py-2.5 bg-white/[0.03] border ${form.youtubeId && !form.youtubeId.startsWith('UC') && !form.youtubeId.startsWith('@')
                                                ? 'border-orange-500/50'
                                                : 'border-white/10 focus:border-orange-500/50'
                                                } rounded-xl text-sm outline-none transition-all placeholder:text-gray-700`}
                                        />
                                    </div>
                                    <p className="text-[8px] text-gray-600 font-medium ml-1">
                                        Accepts channel IDs (UC...) or handles (@username)
                                    </p>
                                </div>

                                <Input
                                    label="Handle (Youtube)"
                                    value={form.handle}
                                    onChange={(v) => setForm({ ...form, handle: v })}
                                    placeholder="@creator"
                                />

                                <Input
                                    label="Instagram Handle"
                                    value={form.instagramHandle}
                                    onChange={(v) => setForm({ ...form, instagramHandle: v })}
                                    placeholder="@shinel.studios"
                                />

                                <div className="grid grid-cols-2 gap-3">
                                    <SelectWithPresets
                                        label="Category"
                                        value={form.category}
                                        onChange={(v) => setForm({ ...form, category: v })}
                                        options={CATEGORIES}
                                    />
                                    <SelectWithPresets
                                        label="Status"
                                        value={form.status}
                                        onChange={(v) => setForm({ ...form, status: v })}
                                        options={STATUS_OPTIONS}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        label="Manual IG Followers"
                                        value={form.instagramFollowers}
                                        onChange={(v) => setForm({ ...form, instagramFollowers: v })}
                                        placeholder="e.g. 50000"
                                        type="number"
                                    />
                                    <Input
                                        label="Manual IG Logo URL"
                                        value={form.instagramLogo}
                                        onChange={(v) => setForm({ ...form, instagramLogo: v })}
                                        placeholder="https://..."
                                    />
                                </div>

                                <Input
                                    label="Precise YT Subscribers (Manual)"
                                    value={form.subscribers}
                                    onChange={(v) => setForm({ ...form, subscribers: v })}
                                    placeholder="e.g. 173445"
                                    type="number"
                                />

                                <button
                                    disabled={busy}
                                    type="submit"
                                    className="w-full py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-orange-900/20 hover:shadow-xl hover:shadow-orange-900/30 hover:scale-[1.02] text-xs"
                                >
                                    {busy ? "Registering..." : "Add to Pulse"}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Clients List */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Stats Summary */}
                        {filtered.length > 0 && (
                            <div className="grid grid-cols-3 gap-3 mb-1">
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Users size={12} className="text-orange-500" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Creators</span>
                                    </div>
                                    <div className="text-2xl font-black">{filtered.length}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <TrendingUp size={12} className="text-green-500" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Reach</span>
                                    </div>
                                    <div className="text-2xl font-black">
                                        {(filtered.reduce((sum, c) => sum + (c.subscribers || 0), 0) + filtered.reduce((sum, c) => sum + (c.instagram_followers || c.instagramFollowers || 0), 0)).toLocaleString()}
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <CheckSquare size={12} className="text-blue-500" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Selected</span>
                                    </div>
                                    <div className="text-2xl font-black">{selectedIds.length}</div>
                                </div>
                            </div>
                        )}

                        <AnimatePresence mode="popLayout">
                            {busy && clients.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4">
                                        <Skeleton width="56px" height="56px" circle className="shrink-0" />
                                        <div className="flex-grow space-y-3">
                                            <Skeleton width="60%" height="20px" />
                                            <Skeleton width="40%" height="16px" />
                                        </div>
                                    </div>
                                ))
                            ) : filtered.map((client) => (
                                <motion.div
                                    layout
                                    key={client.id}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className={`p-5 rounded-2xl border transition-all duration-300 relative group ${editingId === client.id
                                        ? 'bg-orange-500/[0.05] border-orange-500/40 shadow-lg shadow-orange-500/10'
                                        : selectedIds.includes(client.id)
                                            ? 'bg-orange-500/[0.02] border-orange-500/20'
                                            : !client.matched
                                                ? 'bg-yellow-500/[0.02] border-yellow-500/20'
                                                : 'bg-gradient-to-br from-white/[0.04] to-white/[0.02] border-white/5 hover:border-white/10 hover:shadow-lg hover:shadow-black/5'
                                        }`}
                                >
                                    {/* Selection Checkbox */}
                                    {!editingId && (
                                        <button
                                            onClick={() => toggleSelect(client.id)}
                                            className="absolute top-5 right-5 h-6 w-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-orange-500/50 hover:bg-orange-500/10 transition-all z-10 shrink-0"
                                        >
                                            {selectedIds.includes(client.id) ? (
                                                <CheckSquare size={14} className="text-orange-500" />
                                            ) : (
                                                <Square size={14} className="text-gray-600" />
                                            )}
                                        </button>
                                    )}

                                    {editingId === client.id ? (
                                        <form onSubmit={saveEdit} className="w-full space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Input
                                                    label="Name"
                                                    value={editForm.name}
                                                    onChange={(v) => setEditForm({ ...editForm, name: v })}
                                                />
                                                <Input
                                                    label="YouTube ID"
                                                    value={editForm.youtubeId}
                                                    onChange={(v) => setEditForm({ ...editForm, youtubeId: v })}
                                                    error={editForm.youtubeId && !editForm.youtubeId.startsWith('UC') && !editForm.youtubeId.startsWith('@') ? "Invalid ID format" : ""}
                                                />
                                                <Input
                                                    label="Handle (Youtube)"
                                                    value={editForm.handle}
                                                    onChange={(v) => setEditForm({ ...editForm, handle: v })}
                                                    placeholder="@optional"
                                                />
                                                <Input
                                                    label="Instagram Handle"
                                                    value={editForm.instagramHandle}
                                                    onChange={(v) => setEditForm({ ...editForm, instagramHandle: v })}
                                                    placeholder="@optional"
                                                />
                                                <SelectWithPresets
                                                    label="Category"
                                                    value={editForm.category}
                                                    onChange={(v) => setEditForm({ ...editForm, category: v })}
                                                    options={CATEGORIES}
                                                />
                                                <SelectWithPresets
                                                    label="Status"
                                                    value={editForm.status}
                                                    onChange={(v) => setEditForm({ ...editForm, status: v })}
                                                    options={STATUS_OPTIONS}
                                                />
                                                <Input
                                                    label="Precise YT Subscribers (Manual)"
                                                    value={editForm.subscribers}
                                                    onChange={(v) => setEditForm({ ...editForm, subscribers: v })}
                                                    type="number"
                                                />
                                                <Input
                                                    label="Manual IG Followers"
                                                    value={editForm.instagramFollowers}
                                                    onChange={(v) => setEditForm({ ...editForm, instagramFollowers: v })}
                                                    type="number"
                                                />
                                                <Input
                                                    label="Manual IG Logo URL"
                                                    value={editForm.instagramLogo}
                                                    onChange={(v) => setEditForm({ ...editForm, instagramLogo: v })}
                                                    placeholder="https://..."
                                                />
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    type="submit"
                                                    disabled={busy}
                                                    className="flex-grow h-10 flex items-center justify-center gap-2 bg-orange-600 text-white rounded-xl hover:bg-orange-500 font-black uppercase tracking-widest transition-all text-xs disabled:opacity-50"
                                                >
                                                    {busy ? <RefreshCw size={16} className="animate-spin" /> : "Save"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={cancelEdit}
                                                    className="h-10 w-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="flex flex-col lg:flex-row gap-4 pr-8">
                                            {/* Logo & Info */}
                                            <div className="flex items-start gap-4 flex-grow min-w-0">
                                                {client.logo ? (
                                                    <img
                                                        src={getProxiedImage(client.logo)}
                                                        alt={client.name}
                                                        className="w-14 h-14 rounded-xl object-cover border border-white/10 shadow-md shrink-0"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div
                                                    className={`w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 ${client.logo ? 'hidden' : 'flex'} items-center justify-center text-orange-500 shrink-0 shadow-md`}
                                                >
                                                    <Youtube size={28} />
                                                </div>

                                                <div className="flex-grow min-w-0 pt-0.5">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h3 className="text-lg font-black group-hover:text-orange-400 transition-colors truncate">
                                                            {client.name}
                                                        </h3>
                                                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500/20 to-orange-600/10 border border-orange-500/30 text-[9px] font-black text-orange-500 uppercase tracking-wider whitespace-nowrap">
                                                            {client.category || "CREATOR"}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${client.status === 'old'
                                                            ? 'bg-gray-500/20 border-gray-500/30 text-gray-400'
                                                            : 'bg-green-500/20 border-green-500/30 text-green-500'
                                                            }`}>
                                                            {client.status === 'old' ? 'Old Client' : 'Active'}
                                                        </span>
                                                        {!client.matched && (
                                                            <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-[9px] font-black text-yellow-500 uppercase tracking-wider whitespace-nowrap">
                                                                No Data
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                                                        <span className={`flex items-center gap-1 ${(!client.youtubeId?.startsWith('UC') && !client.youtubeId?.startsWith('@')) || client.syncError ? 'text-orange-500' : ''}`}>
                                                            <Youtube size={10} />
                                                            <code className={`px-1.5 py-0.5 rounded text-[8px] ${(!client.youtubeId?.startsWith('UC') && !client.youtubeId?.startsWith('@')) || client.syncError ? 'bg-orange-500/10 text-orange-400' : 'bg-white/5 text-gray-400'}`}>
                                                                {client.youtubeId}
                                                            </code>
                                                        </span>
                                                        {client.instagramHandle && (
                                                            <span className="flex items-center gap-1">
                                                                <Instagram size={10} className="text-pink-500" />
                                                                <code className="px-1.5 py-0.5 rounded text-[8px] bg-white/5 text-gray-400">
                                                                    {client.instagramHandle}
                                                                </code>
                                                            </span>
                                                        )}
                                                        {client.syncError && (
                                                            <span className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                                                                <AlertCircle size={10} />
                                                                {client.syncError}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Metrics & Actions - Side by Side on Desktop */}
                                            <div className="flex items-center gap-4 shrink-0 flex-wrap lg:flex-nowrap">
                                                {/* Sparkline */}
                                                {client.history && client.history.length > 1 && (
                                                    <div className="hidden xl:block opacity-50 hover:opacity-100 transition-opacity">
                                                        <Sparkline
                                                            data={client.history}
                                                            width={80}
                                                            height={32}
                                                            color={client.growth >= 0 ? "#22c55e" : "#ef4444"}
                                                        />
                                                    </div>
                                                )}

                                                {/* Subscriber Count - EXACT NUMBERS */}
                                                <div className="text-right min-w-[120px] flex flex-col gap-2">
                                                    {client.hasYT && (
                                                        <div>
                                                            <div className="text-xl font-black text-white tabular-nums leading-none">
                                                                {(client.subscribers || 0).toLocaleString()}
                                                            </div>
                                                            <div className="text-[8px] font-black uppercase tracking-widest text-gray-500 mt-1">
                                                                Subscribers
                                                            </div>
                                                        </div>
                                                    )}

                                                    {client.hasIG && (
                                                        <div className="flex flex-col items-end animate-in fade-in slide-in-from-right-2 duration-500">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="text-sm font-black text-pink-500 tabular-nums leading-none">
                                                                    {(client.instagramFollowers || 0).toLocaleString()}
                                                                </div>
                                                                <Instagram size={12} className="text-pink-500" />
                                                            </div>
                                                            <div className="text-[7px] font-black uppercase tracking-[0.1em] text-gray-600 mt-0.5">
                                                                IG Followers
                                                            </div>
                                                        </div>
                                                    )}

                                                    {client.hasYT && (
                                                        <div>
                                                            <div className="text-sm font-black text-orange-500 tabular-nums leading-none">
                                                                {(client.viewCount || 0).toLocaleString()}
                                                            </div>
                                                            <div className="text-[7px] font-black uppercase tracking-[0.1em] text-gray-600 mt-0.5">
                                                                Total Views
                                                            </div>
                                                        </div>
                                                    )}

                                                    {client.hasYT && (
                                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider w-fit ml-auto ${(client.growth || 0) >= 0
                                                            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                            }`}>
                                                            {(client.growth || 0) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                            {Math.abs(client.growth || 0).toFixed(1)}%
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions - HORIZONTAL on Desktop, Vertical on Mobile */}
                                                <div className="flex lg:flex-row flex-row gap-2 border-l border-white/5 pl-4">
                                                    <button
                                                        onClick={(e) => refreshSingleClient(client.id, e.shiftKey)}
                                                        disabled={refreshingId === client.id}
                                                        className="h-9 w-9 flex items-center justify-center bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg hover:bg-green-500/20 hover:border-green-500/30 transition-all disabled:opacity-50"
                                                        title="Refresh Stats (Shift+Click to Force)"
                                                    >
                                                        <RefreshCw size={14} className={refreshingId === client.id ? "animate-spin" : ""} />
                                                    </button>
                                                    <button
                                                        onClick={() => startEdit(client)}
                                                        className="h-9 w-9 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg hover:text-orange-500 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <a
                                                        href={`https://youtube.com/channel/${client.youtubeId}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="h-9 w-9 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg hover:text-orange-500 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all"
                                                        title="Visit Channel"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </a>
                                                    <button
                                                        onClick={() => deleteClient(client.id, client.name)}
                                                        className="h-9 w-9 flex items-center justify-center bg-red-500/5 border border-red-500/10 text-red-500/60 rounded-lg hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filtered.length === 0 && !busy && (
                            <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/[0.05] to-white/[0.02] flex items-center justify-center mb-5">
                                    <AlertCircle size={32} className="text-gray-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-500 mb-2">No creators found</h3>
                                <p className="text-gray-600 text-xs max-w-xs mx-auto">
                                    {search ? "Try adjusting your search query" : "Start by adding your first client"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div >

            {/* Bulk Actions Sticky Bar */}
            < AnimatePresence >
                {
                    selectedIds.length > 0 && (
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-2xl"
                        >
                            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-orange-500/40 rounded-2xl p-4 shadow-[0_20px_60px_-15px_rgba(232,80,2,0.6)] flex items-center justify-between gap-4 backdrop-blur-xl">
                                <div className="flex items-center gap-3 pl-2">
                                    <div className="p-2 rounded-xl bg-orange-500/20 text-orange-500 border border-orange-500/30">
                                        <CheckSquare size={18} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-black">{selectedIds.length} Selected</div>
                                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Bulk Actions</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedIds([])}
                                        className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={deleteBulk}
                                        disabled={busy}
                                        className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-red-900/30"
                                    >
                                        <Trash2 size={14} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </section >
    );
}
