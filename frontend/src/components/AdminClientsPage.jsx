// src/components/AdminClientsPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    Plus,
    Trash2,
    ExternalLink,
    RefreshCw,
    Youtube,
    ShieldCheck,
    AlertCircle,
    UserPlus,
    Search,
    X,
    CheckSquare,
    Square,
    Inbox,
    TrendingUp,
    TrendingDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useClientStats } from "../context/ClientStatsContext";
import Skeleton from "./Skeleton";
import Sparkline from "./Sparkline";

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE || "";

export default function AdminClientsPage() {
    const { refreshStats } = useClientStats();
    const [clients, setClients] = useState([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);

    const [form, setForm] = useState({
        name: "",
        youtubeId: "",
        handle: "",
        category: "Vlogger"
    });

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        name: "",
        youtubeId: "",
        handle: "",
        category: ""
    });

    const token = useMemo(() => localStorage.getItem("token") || "", []);
    const authHeaders = useMemo(() => ({
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`
    }), [token]);

    const loadClients = useCallback(async () => {
        setBusy(true);
        setErr("");
        try {
            const res = await fetch(`${AUTH_BASE}/clients`, { headers: authHeaders });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to load clients");
            setClients(data.clients || []);
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }, [authHeaders]);

    useEffect(() => {
        loadClients();
    }, [loadClients]);

    async function createClient(e) {
        e.preventDefault();
        if (!form.name || !form.youtubeId) return setErr("Name and YouTube ID required");

        const payload = {
            name: form.name.trim(),
            youtubeId: form.youtubeId.trim(),
            handle: form.handle.trim(),
            category: form.category
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
            setForm({ name: "", youtubeId: "", handle: "", category: "Vlogger" });
            await loadClients();
            refreshStats(); // Update global context immediately
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
            refreshStats(); // Update global context immediately
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
            refreshStats();
            setSelectedIds([]);
        } catch (e) {
            setErr(e.message);
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
            name: client.name,
            youtubeId: client.youtubeId,
            handle: client.handle || "",
            category: client.category || "Vlogger"
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setErr("");
    }

    async function saveEdit(e) {
        e.preventDefault();
        if (!editForm.name || !editForm.youtubeId) return setErr("Name and YouTube ID required");

        const payload = {
            name: editForm.name.trim(),
            youtubeId: editForm.youtubeId.trim(),
            handle: editForm.handle.trim(),
            category: editForm.category
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
            refreshStats(); // Update global context immediately
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    const { stats: globalStats, getHistory, getGrowth } = useClientStats();

    const enrichedClients = useMemo(() => {
        return clients.map(client => {
            const h = (client.handle || "").toLowerCase();
            const hAt = h.startsWith('@') ? h : `@${h}`;

            const y = (client.youtubeId || "").toLowerCase();
            const yAt = y.startsWith('@') ? y : `@${y}`;

            const n = (client.name || "").toLowerCase();

            const s = globalStats.find(s => {
                const sId = (s.id || "");
                const sh = (s.handle || "").toLowerCase();
                const shAt = (sh && !sh.startsWith('@')) ? `@${sh}` : sh;
                const sTitle = (s.title || "").toLowerCase();

                // 1. Match by ID (Must be UC... and non-empty)
                if (y && y.toLowerCase().startsWith('uc') && sId === y) return true;

                // 2. Match by Handle (Must be non-empty and not just "@")
                if (yAt && yAt.length > 1 && (sh === yAt || shAt === yAt)) return true;
                if (hAt && hAt.length > 1 && (sh === hAt || shAt === hAt)) return true;

                // 3. Match by Title (Exact fallback)
                if (n && sTitle === n) return true;

                return false;
            }) || {};

            const growth = getGrowth(s.id || client.youtubeId);
            const history = getHistory(s.id || client.youtubeId);

            return {
                ...client,
                logo: s.logo || client.logo,
                subscribers: s.subscribers || 0,
                displayTitle: s.title || client.name,
                growth,
                history
            };
        });
    }, [clients, globalStats, getHistory, getGrowth]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return enrichedClients.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.youtubeId.toLowerCase().includes(q) ||
            (c.category && c.category.toLowerCase().includes(q))
        );
    }, [enrichedClients, search]);

    const CATEGORIES = ["Vlogger", "Streamer", "Gamer", "Music Artist", "Tech", "Lifestyle", "Education", "Other"];

    return (
        <section className="min-h-screen pt-24 pb-32 bg-black text-white">
            <div className="container mx-auto px-6 max-w-6xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                <ShieldCheck size={20} className="text-orange-500" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
                                Admin Control
                            </span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter">
                            Pulse <span className="text-orange-500">Registry.</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search clients..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm focus:border-orange-500/50 outline-none transition-all w-full md:w-64"
                            />
                        </div>
                        <button
                            onClick={loadClients}
                            disabled={busy}
                            className="p-2.5 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] transition-all"
                        >
                            <RefreshCw size={18} className={busy ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {err && (
                    <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3 text-sm font-bold">
                        <AlertCircle size={18} />
                        {err}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Create Client Form */}
                    <div className="lg:col-span-1">
                        <div className="p-6 md:p-8 rounded-[32px] bg-white/[0.03] border border-white/10 sticky top-28">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
                                    <UserPlus size={20} />
                                </div>
                                <h2 className="text-lg font-black uppercase tracking-widest">Add Client</h2>
                            </div>

                            <form onSubmit={createClient} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Creator Name</label>
                                    <input
                                        required
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="e.g. Gamer Mummy"
                                        className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-sm focus:border-orange-500 outline-none transition-all placeholder:text-gray-700"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1 flex justify-between">
                                        YouTube ID or Handle
                                        <div className="flex gap-2">
                                            <span className="text-gray-700">@handle ok</span>
                                            <a href="https://commentpicker.com/youtube-channel-id.php" target="_blank" rel="noreferrer" className="text-orange-500 hover:text-white transition-colors">Find ID</a>
                                        </div>
                                    </label>
                                    <div className="relative">
                                        <Youtube size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${form.youtubeId && !form.youtubeId.startsWith('UC') ? 'text-red-500' : 'text-gray-700'}`} />
                                        <input
                                            required
                                            value={form.youtubeId}
                                            onChange={e => setForm({ ...form, youtubeId: e.target.value })}
                                            placeholder="UC... or @handle"
                                            className={`w-full pl-11 pr-4 py-3 bg-black border ${form.youtubeId && !form.youtubeId.startsWith('UC') && !form.youtubeId.startsWith('@') && !form.youtubeId.includes('youtube.com') ? 'border-orange-500/50' : 'border-white/10 focus:border-orange-500'} rounded-xl text-sm outline-none transition-all placeholder:text-gray-700`}
                                        />
                                    </div>
                                    <p className="text-[9px] text-gray-600 font-medium ml-1">
                                        Pasting a full URL will automatically extract the ID or Handle.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Handle (Optional)</label>
                                        <input
                                            value={form.handle}
                                            onChange={e => setForm({ ...form, handle: e.target.value })}
                                            placeholder="@creator"
                                            className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-sm focus:border-orange-500 outline-none transition-all placeholder:text-gray-700"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Category</label>
                                        <select
                                            value={form.category}
                                            onChange={e => setForm({ ...form, category: e.target.value })}
                                            className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-sm focus:border-orange-500 outline-none transition-all"
                                        >
                                            {CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    disabled={busy}
                                    type="submit"
                                    className="w-full py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-orange-900/10 mt-2"
                                >
                                    {busy ? "Registering..." : "Add to Pulse"}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Clients List */}
                    <div className="lg:col-span-2 space-y-4">
                        <AnimatePresence mode="popLayout">
                            {busy && clients.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 flex gap-6">
                                        <Skeleton width="56px" height="56px" circle className="shrink-0" />
                                        <div className="flex-grow space-y-3">
                                            <Skeleton width="60%" height="24px" />
                                            <Skeleton width="40%" height="16px" />
                                        </div>
                                    </div>
                                ))
                            ) : filtered.map((client) => (
                                <motion.div
                                    layout
                                    key={client.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`p-6 rounded-[24px] bg-white/[0.02] border ${editingId === client.id ? 'border-orange-500/50 bg-orange-500/[0.03]' : selectedIds.includes(client.id) ? 'border-orange-500/30 bg-orange-500/[0.01]' : 'border-white/5'} flex flex-col md:flex-row md:items-center hover:bg-white/[0.04] transition-all group gap-6 md:gap-4 shadow-lg shadow-black/20 relative`}
                                >
                                    {/* Selection Checkbox */}
                                    {!editingId && (
                                        <button
                                            onClick={() => toggleSelect(client.id)}
                                            className="absolute top-6 left-6 md:static h-6 w-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-orange-500/50 transition-all z-10 shrink-0"
                                        >
                                            {selectedIds.includes(client.id) ? (
                                                <CheckSquare size={14} className="text-orange-500" />
                                            ) : (
                                                <Square size={14} className="text-gray-700" />
                                            )}
                                        </button>
                                    )}

                                    {editingId === client.id ? (
                                        <form onSubmit={saveEdit} className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Name</label>
                                                <input
                                                    autoFocus
                                                    value={editForm.name}
                                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                    className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-sm focus:border-orange-500 outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1 flex justify-between">
                                                    YouTube ID
                                                    {editForm.youtubeId && !editForm.youtubeId.startsWith('UC') && <span className="text-red-500">Invalid</span>}
                                                </label>
                                                <input
                                                    value={editForm.youtubeId}
                                                    onChange={e => setEditForm({ ...editForm, youtubeId: e.target.value })}
                                                    className={`w-full px-4 py-3 bg-black border ${editForm.youtubeId && !editForm.youtubeId.startsWith('UC') ? 'border-red-500' : 'border-white/10'} rounded-xl text-sm focus:border-orange-500 outline-none`}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Handle</label>
                                                    <input
                                                        value={editForm.handle}
                                                        onChange={e => setEditForm({ ...editForm, handle: e.target.value })}
                                                        placeholder="@optional"
                                                        className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-sm focus:border-orange-500 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Category</label>
                                                    <select
                                                        value={editForm.category}
                                                        onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                                        className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-sm focus:border-orange-500 outline-none"
                                                    >
                                                        {CATEGORIES.map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex items-end gap-2 mt-4">
                                                <div className="flex gap-2 w-full">
                                                    <button type="submit" disabled={busy} className="flex-grow h-[46px] flex items-center justify-center bg-orange-600 text-white rounded-xl hover:bg-orange-500 font-black uppercase tracking-widest transition-all">
                                                        {busy ? <RefreshCw size={20} className="animate-spin" /> : "Save Changes"}
                                                    </button>
                                                    <button type="button" onClick={cancelEdit} className="h-[46px] w-[46px] flex items-center justify-center bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all">
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-4 flex-grow min-w-0">
                                                {client.logo ? (
                                                    <img
                                                        src={client.logo}
                                                        alt={client.name}
                                                        className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-lg shadow-orange-500/5 shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0 shadow-lg shadow-orange-500/5">
                                                        <Youtube size={28} />
                                                    </div>
                                                )}

                                                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 flex-grow ml-0 md:ml-4">
                                                    <div className="min-w-0 flex-grow pl-2 md:pl-0">
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="text-xl font-bold group-hover:text-orange-500 transition-colors truncate">
                                                                {client.name}
                                                            </h3>
                                                            <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[9px] font-black text-orange-500 uppercase tracking-widest whitespace-nowrap">
                                                                {client.category || "CREATOR"}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">
                                                            <span className={`flex items-center gap-1 min-w-0 ${!client.youtubeId?.startsWith('UC') ? 'text-red-500' : ''}`}>
                                                                ID: <code className={`px-1.5 py-0.5 rounded truncate max-w-[120px] md:max-w-none ${!client.youtubeId?.startsWith('UC') ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-gray-400'}`}>{client.youtubeId}</code>
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Sparkline & Stats */}
                                                    <div className="flex items-center gap-4 shrink-0 justify-start md:justify-end">
                                                        {client.history && client.history.length > 1 && (
                                                            <div className="hidden md:block opacity-50 hover:opacity-100 transition-opacity">
                                                                <Sparkline
                                                                    data={client.history}
                                                                    width={100}
                                                                    height={32}
                                                                    color={client.growth >= 0 ? "#22c55e" : "#ef4444"}
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="text-right min-w-[100px]">
                                                            <div className="text-lg font-black text-white tabular-nums">
                                                                {(client.subscribers || 0).toLocaleString()}
                                                            </div>
                                                            <div className={`text-[9px] font-bold uppercase tracking-widest flex items-center justify-end gap-1 ${(client.growth || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                                {(client.growth || 0) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                                {Math.abs(client.growth || 0).toFixed(1)}% (7d)
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 justify-end self-end md:self-center border-l border-white/5 pl-4 ml-2">
                                                <button
                                                    onClick={() => startEdit(client)}
                                                    className="h-10 w-10 md:h-11 md:w-11 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl hover:text-orange-500 hover:border-orange-500/30 transition-all"
                                                    title="Edit"
                                                >
                                                    <Search size={18} className="rotate-90 md:size-[18px]" />
                                                </button>
                                                <a
                                                    href={`https://youtube.com/channel/${client.youtubeId}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="h-10 w-10 md:h-11 md:w-11 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl hover:text-orange-500 hover:border-orange-500/30 transition-all"
                                                    title="Visit Channel"
                                                >
                                                    <ExternalLink size={18} className="md:size-[18px]" />
                                                </a>
                                                <button
                                                    onClick={() => deleteClient(client.id, client.name)}
                                                    className="h-10 w-10 md:h-11 md:w-11 flex items-center justify-center bg-red-500/5 border border-red-500/10 text-red-500/50 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} className="md:size-[18px]" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {
                            filtered.length === 0 && !busy && (
                                <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 rounded-full bg-white/[0.02] flex items-center justify-center mb-6">
                                        <AlertCircle size={32} className="text-gray-700" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-500">No creators found</h3>
                                    <p className="text-gray-700 text-sm mt-2 max-w-xs mx-auto">Start by adding your first client to the registry using the form.</p>
                                </div>
                            )
                        }
                    </div>
                </div>
            </div>

            {/* Bulk Actions Sticky Bar */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-2xl"
                    >
                        <div className="bg-[#111] border border-orange-500/30 rounded-[28px] p-4 shadow-[0_20px_60px_-15px_rgba(232,80,2,0.5)] flex items-center justify-between gap-4 backdrop-blur-xl">
                            <div className="flex items-center gap-4 pl-4">
                                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                                    <CheckSquare size={20} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold">{selectedIds.length} Selected</div>
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Registry Actions</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="px-5 py-3 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={deleteBulk}
                                    disabled={busy}
                                    className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all"
                                >
                                    <Trash2 size={16} />
                                    Delete Selected
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
