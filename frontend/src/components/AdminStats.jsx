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

import { AUTH_BASE } from "../config/constants";

export default function AdminStats() {
    const [stats, setStats] = useState({
        creators: 0,
        videos: 0,
        thumbnails: 0,
        reach: 0
    });
    const [loading, setLoading] = useState(true);
    const [lastPulse, setLastPulse] = useState(null);
    const [trace, setTrace] = useState(null);
    const [keyStatus, setKeyStatus] = useState(null);
    const [quotaHealth, setQuotaHealth] = useState([]);
    const [busy, setBusy] = useState(false);

    // Auth token for admin requests
    const token = localStorage.getItem("token");

    async function loadStats() {
        try {
            setLoading(true);
            const res = await fetch(`${AUTH_BASE}/stats`);
            const data = await res.json();
            if (data.counts) setStats(data.counts);

            // Check pulse health
            const pRes = await fetch(`${AUTH_BASE}/clients/pulse?debug=1`);
            if (pRes.ok) {
                const pData = await pRes.json();
                setLastPulse(pData.ts);
                if (pData.debug) {
                    setTrace(pData.debug.trace);
                    setKeyStatus({
                        present: pData.debug.keyPresent,
                        count: pData.debug.keyCount || 1,
                        valid: pData.debug.keyValid
                    });
                }
            }

            // Check API Quota Health (Admin only)
            if (token) {
                const qRes = await fetch(`${AUTH_BASE}/admin/yt-quota`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (qRes.ok) {
                    const qData = await qRes.json();
                    setQuotaHealth(qData.keys || []);
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

    const triggerPulseRefresh = async () => {
        if (busy) return;
        setBusy(true);
        try {
            // Call the sync endpoint
            await fetch("https://shinel-auth.shinelstudioofficial.workers.dev/clients/sync?force=true");
            // Reload stats after a short delay
            setTimeout(loadStats, 2000);
        } catch (e) {
            console.error(e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-10">
            {/* --- HERO STATS --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 rounded-[24px] bg-[var(--surface-alt)] border border-[var(--border)] relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                            <Users size={18} />
                        </div>
                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Active Clients</span>
                    </div>
                    <div className="text-3xl font-black text-[var(--text)] group-hover:scale-105 transition-transform origin-left">
                        {loading ? "-" : stats.creators || 0}
                    </div>
                </div>

                <div className="p-6 rounded-[24px] bg-[var(--surface-alt)] border border-[var(--border)] relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <Video size={18} />
                        </div>
                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Videos Managed</span>
                    </div>
                    <div className="text-3xl font-black text-[var(--text)] group-hover:scale-105 transition-transform origin-left">
                        {loading ? "-" : stats.videos || 0}
                    </div>
                </div>

                <div className="p-6 rounded-[24px] bg-[var(--surface-alt)] border border-[var(--border)] relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                            <ImageIcon size={18} />
                        </div>
                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Thumbnails</span>
                    </div>
                    <div className="text-3xl font-black text-[var(--text)] group-hover:scale-105 transition-transform origin-left">
                        {loading ? "-" : stats.thumbnails || 0}
                    </div>
                </div>

                <div className="p-6 rounded-[24px] bg-[var(--surface-alt)] border border-[var(--border)] relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                            <TrendingUp size={18} />
                        </div>
                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Reach</span>
                    </div>
                    <div className="text-3xl font-black text-[var(--text)] group-hover:scale-105 transition-transform origin-left">
                        {loading ? "-" : stats.reach || "10M+"}
                    </div>
                </div>
            </div>


            {/* --- ACTIVITY TEASER & SYSTEM HEALTH --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 p-8 rounded-[32px] bg-white/[0.02] border border-white/10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Zap size={20} className="text-orange-500" />
                            <h2 className="text-lg font-black uppercase tracking-widest">System Matrix</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            {lastPulse && (
                                <div className="text-[10px] font-bold text-gray-600 uppercase">
                                    Last Sync: {new Date(lastPulse).toLocaleTimeString()}
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
                        <HealthLine
                            label="Worker Core"
                            status="Operational"
                            color="text-green-500"
                        />
                        <HealthLine
                            label="Pulse Cache"
                            status={lastPulse ? "Hit (Warm)" : "Miss (Cold)"}
                            color={lastPulse ? "text-green-500" : "text-yellow-500"}
                        />

                        {/* Dynamic Quota Status */}
                        {quotaHealth.length > 0 ? (
                            quotaHealth.map((k, i) => (
                                <HealthLine
                                    key={i}
                                    label={`API Key ${i + 1} (${k.masked})`}
                                    status={k.status === 'ACTIVE' ? "Healthy" : "EXHAUSTED"}
                                    color={k.status === 'ACTIVE' ? "text-green-500" : "text-red-500"}
                                />
                            ))
                        ) : (
                            <HealthLine label="API Pool" status="Initializing..." color="text-gray-500" />
                        )}
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
                                        API Status: {keyStatus.present ? (keyStatus.valid ? 'Active' : 'Invalid Signature') : 'Missing'}
                                        {keyStatus.present && <span className="ml-2 opacity-60">({keyStatus.count} {keyStatus.count === 1 ? 'Key' : 'Keys'} Pooled)</span>}
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

function HealthLine({ label, status, color = "text-green-500" }) {
    // Extract base color name (e.g. "green-500") if possible for the dot bg, 
    // or just default to green/red based on text class mapping or simple parsing.
    // Simpler: Just map text color to bg color roughly or use dynamic classes if tailwind safelist permits.
    // For safety, let's just use the text color class provided and a generic dot or derived dot.

    // Quick derive of dot color from text-X-500
    const dotColor = color.replace("text-", "bg-");

    return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="text-sm font-bold text-gray-400">{label}</span>
            <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${dotColor} shadow-sm`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{status}</span>
            </div>
        </div>
    );
}
