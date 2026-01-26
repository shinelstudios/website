// src/components/AdminStats.jsx
import React, { useEffect, useState } from "react";
import {
    BarChart3,
    Video,
    ImageIcon,
    Users,
    Zap,
    Activity,
    ChevronDown,
    X,
    Shield,
    TrendingUp
} from "lucide-react";

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE || "";

export default function AdminStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [lastPulse, setLastPulse] = useState(null);
    const [trace, setTrace] = useState(null);
    const [keyStatus, setKeyStatus] = useState(null);
    const [showTrace, setShowTrace] = useState(false);

    const token = localStorage.getItem("token") || "";

    async function loadStats() {
        try {
            const res = await fetch(`${AUTH_BASE}/stats`);
            const data = await res.json();
            setStats(data.counts);

            // Also check pulse health
            const pRes = await fetch(`${AUTH_BASE}/clients/pulse?debug=1`);
            if (pRes.ok) {
                const pData = await pRes.json();
                setLastPulse(pData.ts);
                if (pData.debug) {
                    setTrace(pData.debug.trace);
                    setKeyStatus({
                        present: pData.debug.keyPresent,
                        length: pData.debug.keyLength,
                        valid: pData.debug.keyValid
                    });
                }
            }
        } catch (e) {
            console.error("Failed to load stats", e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadStats();
    }, []);

    async function triggerPulseRefresh() {
        if (!confirm("Force YouTube API sync for all clients? This uses API quota.")) return;
        setBusy(true);
        setTrace(null);
        try {
            const res = await fetch(`${AUTH_BASE}/clients/pulse/refresh?debug=1`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Refresh failed");

            setLastPulse(data.ts);
            if (data.debug?.trace) {
                setTrace(data.debug.trace);
                setKeyStatus({
                    present: data.debug.keyPresent,
                    length: data.debug.keyLength,
                    valid: data.debug.keyValid
                });
                setShowTrace(true);
            }
            alert("Pulse synchronized successfully!");
        } catch (e) {
            alert(e.message);
        } finally {
            setBusy(false);
        }
    }

    const cards = [
        { label: "Studio Videos", value: stats?.videos || 0, icon: Video, color: "text-orange-500", bg: "bg-orange-500/10" },
        { label: "Thumbnail Lab", value: stats?.thumbnails || 0, icon: ImageIcon, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Active Clients", value: stats?.clients || 0, icon: Activity, color: "text-green-500", bg: "bg-green-500/10" },
        { label: "Team Members", value: "TBD", icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
    ];

    return (
        <div className="space-y-10">
            {/* --- HERO --- */}
            <div className="relative p-10 rounded-[40px] bg-white/[0.02] border border-white/5 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                <div className="relative z-10">
                    <h1 className="text-4xl font-black tracking-tighter mb-2">Welcome to the <span className="text-orange-500 italic">Hub.</span></h1>
                    <p className="text-gray-500 font-medium max-w-lg">Monitor studio performance, manage creator registries, and optimize your delivery pipeline from one central core.</p>
                </div>
            </div>

            {/* --- STATS GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <div key={i} className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group">
                            <div className={`p-3 rounded-2xl ${card.bg} ${card.color} w-fit mb-4 group-hover:scale-110 transition-transform`}>
                                <Icon size={24} />
                            </div>
                            <div className="text-3xl font-black tracking-tight mb-1">
                                {loading ? "..." : card.value}
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-600">{card.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* --- ACTIVITY TEASER --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 p-8 rounded-[32px] bg-white/[0.02] border border-white/10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Zap size={20} className="text-orange-500" />
                            <h2 className="text-lg font-black uppercase tracking-widest">System Health</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            {lastPulse && (
                                <div className="text-[10px] font-bold text-gray-600 uppercase">
                                    Pulse Synced: {new Date(lastPulse).toLocaleTimeString()}
                                </div>
                            )}
                            <button
                                onClick={triggerPulseRefresh}
                                disabled={busy}
                                className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
                                title="Force YouTube Sync"
                            >
                                <Activity size={18} className={busy ? "animate-pulse" : ""} />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <HealthLine label="Worker Status" status="Operational" />
                        <HealthLine label="Pulse Cache" status={lastPulse ? "Warm" : "Cold"} />
                        <HealthLine label="KV Persistence" status="Synched" />
                    </div>
                </div>

                {/* --- PULSE DIAGNOSTICS (Moved out for visibility) --- */}
                {trace && (
                    <div className="lg:col-span-3 p-8 rounded-[32px] bg-orange-500/5 border-2 border-orange-500/20 shadow-2xl shadow-orange-500/10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-widest">Pulse X-Ray</h2>
                                    <p className="text-[10px] font-bold text-orange-500/60 uppercase tracking-tighter">Real-time sync diagnostics</p>
                                </div>
                            </div>
                            {keyStatus && (
                                <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${keyStatus.valid ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                    <div className={`w-2 h-2 rounded-full ${keyStatus.valid ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                                    <div className="text-[10px] font-black uppercase tracking-widest">
                                        API Key: {keyStatus.present ? (keyStatus.valid ? 'Active' : 'Invalid Signature') : 'Missing'}
                                        {keyStatus.present && <span className="ml-2 opacity-60">({keyStatus.length} chars)</span>}
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={() => setTrace(null)}
                                className="p-2 text-gray-500 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {trace.map((t, i) => (
                                <div key={i} className={`p-4 rounded-2xl border ${t.status === 'success' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-black uppercase tracking-wider truncate mr-2">{t.name}</span>
                                        <div className={`w-2 h-2 rounded-full ${t.status === 'success' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                                    </div>
                                    <div className="text-[9px] font-bold text-gray-500 font-mono mb-2 truncate">{t.id}</div>
                                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Result</span>
                                        {t.status === 'success' ? (
                                            <span className="text-[10px] font-black text-green-500">{t.count} Videos Found</span>
                                        ) : (
                                            <span className="text-[10px] font-black text-red-500 truncate max-w-[120px]" title={t.error}>{t.error || 'Fetch Error'}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Shield size={14} className="text-orange-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">If errors persist, re-verify your UC IDs or API Key.</span>
                            </div>
                            <a href="https://commentpicker.com/youtube-channel-id.php" target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:underline">ID Finder</a>
                        </div>
                    </div>
                )}

                <div className="p-8 rounded-[32px] bg-orange-600 text-white shadow-2xl shadow-orange-900/20 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        <h3 className="text-xl font-black mb-2">New Update <br />v2.4 Ecosystem</h3>
                        <p className="text-orange-100 text-sm font-bold opacity-80 mb-6 leading-relaxed">Unified dashboard and role-based access are now live. Manage with confidence.</p>
                        <div className="p-3 rounded-xl bg-white/20 text-xs font-black uppercase tracking-widest text-center">
                            shinel_stable_v2
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HealthLine({ label, status }) {
    return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="text-sm font-bold text-gray-400">{label}</span>
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-green-500">{status}</span>
            </div>
        </div>
    );
}
