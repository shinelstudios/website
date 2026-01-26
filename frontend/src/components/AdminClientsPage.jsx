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
    Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE || "";

export default function AdminClientsPage() {
    const [clients, setClients] = useState([]);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [search, setSearch] = useState("");

    const [form, setForm] = useState({
        name: "",
        youtubeId: "",
        handle: ""
    });

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        name: "",
        youtubeId: "",
        handle: ""
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

        setBusy(true);
        setErr("");
        try {
            const res = await fetch(`${AUTH_BASE}/clients`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Failed to create client");
            setForm({ name: "", youtubeId: "", handle: "" });
            await loadClients();
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
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    function startEdit(client) {
        setEditingId(client.id);
        setEditForm({
            name: client.name,
            youtubeId: client.youtubeId,
            handle: client.handle || ""
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setErr("");
    }

    async function saveEdit(e) {
        e.preventDefault();
        if (!editForm.name || !editForm.youtubeId) return setErr("Name and YouTube ID required");

        setBusy(true);
        setErr("");
        try {
            const res = await fetch(`${AUTH_BASE}/clients/${encodeURIComponent(editingId)}`, {
                method: "PUT",
                headers: authHeaders,
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Update failed");
            setEditingId(null);
            await loadClients();
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    }

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return clients.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.youtubeId.toLowerCase().includes(q)
        );
    }, [clients, search]);

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
                                        YouTube Channel ID
                                        <a href="https://commentpicker.com/youtube-channel-id.php" target="_blank" rel="noreferrer" className="text-orange-500 hover:text-white transition-colors">Find ID</a>
                                    </label>
                                    <div className="relative">
                                        <Youtube size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${form.youtubeId && !form.youtubeId.startsWith('UC') ? 'text-red-500' : 'text-gray-700'}`} />
                                        <input
                                            required
                                            value={form.youtubeId}
                                            onChange={e => setForm({ ...form, youtubeId: e.target.value })}
                                            placeholder="UC..."
                                            className={`w-full pl-11 pr-4 py-3 bg-black border ${form.youtubeId && !form.youtubeId.startsWith('UC') ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-orange-500'} rounded-xl text-sm outline-none transition-all placeholder:text-gray-700`}
                                        />
                                    </div>
                                    {form.youtubeId && !form.youtubeId.startsWith('UC') && (
                                        <p className="text-[10px] text-red-500 font-bold ml-1 animate-pulse">
                                            Must start with "UC" (Channel ID, not handle)
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Handle (Optional)</label>
                                    <input
                                        value={form.handle}
                                        onChange={e => setForm({ ...form, handle: e.target.value })}
                                        placeholder="@creator"
                                        className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-sm focus:border-orange-500 outline-none transition-all placeholder:text-gray-700"
                                    />
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
                            {filtered.map((client) => (
                                <motion.div
                                    layout
                                    key={client.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`p-6 rounded-[24px] bg-white/[0.02] border ${editingId === client.id ? 'border-orange-500/50 bg-orange-500/[0.03]' : 'border-white/5'} flex flex-col md:flex-row md:items-center hover:bg-white/[0.04] transition-all group gap-6 md:gap-4 shadow-lg shadow-black/20`}
                                >
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
                                            <div className="flex items-end gap-2">
                                                <div className="flex-grow space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Handle</label>
                                                    <input
                                                        value={editForm.handle}
                                                        onChange={e => setEditForm({ ...editForm, handle: e.target.value })}
                                                        placeholder="@optional"
                                                        className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-sm focus:border-orange-500 outline-none"
                                                    />
                                                </div>
                                                <div className="flex gap-2 py-0.5">
                                                    <button type="submit" disabled={busy} className="h-[46px] w-[46px] flex items-center justify-center bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl hover:bg-green-500 hover:text-white transition-all">
                                                        {busy ? <RefreshCw size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                                                    </button>
                                                    <button type="button" onClick={cancelEdit} className="h-[46px] w-[46px] flex items-center justify-center bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all">
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-4 flex-grow">
                                                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0 shadow-lg shadow-orange-500/5">
                                                    <Youtube size={28} />
                                                </div>

                                                <div className="min-w-0">
                                                    <h3 className="text-xl font-bold group-hover:text-orange-500 transition-colors truncate">
                                                        {client.name}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">
                                                        <span className={`flex items-center gap-1 ${!client.youtubeId?.startsWith('UC') ? 'text-red-500' : ''}`}>
                                                            ID: <code className={`px-1.5 py-0.5 rounded ${!client.youtubeId?.startsWith('UC') ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-gray-400'}`}>{client.youtubeId}</code>
                                                        </span>
                                                        {client.handle && (
                                                            <span className="flex items-center gap-1">
                                                                Handle: <span className="text-gray-400">{client.handle}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 justify-end">
                                                <button
                                                    onClick={() => startEdit(client)}
                                                    className="h-12 w-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl hover:text-orange-500 hover:border-orange-500/30 transition-all"
                                                    title="Edit"
                                                >
                                                    <Search size={20} className="rotate-90" />
                                                </button>
                                                <a
                                                    href={`https://youtube.com/channel/${client.youtubeId}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="h-12 w-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl hover:text-orange-500 hover:border-orange-500/30 transition-all"
                                                    title="Visit Channel"
                                                >
                                                    <ExternalLink size={20} />
                                                </a>
                                                <button
                                                    onClick={() => deleteClient(client.id, client.name)}
                                                    className="h-12 w-12 flex items-center justify-center bg-red-500/5 border border-red-500/10 text-red-500/50 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filtered.length === 0 && !busy && (
                            <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-white/[0.02] flex items-center justify-center mb-6">
                                    <AlertCircle size={32} className="text-gray-700" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-500">No creators found</h3>
                                <p className="text-gray-700 text-sm mt-2 max-w-xs mx-auto">Start by adding your first client to the registry using the form.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
