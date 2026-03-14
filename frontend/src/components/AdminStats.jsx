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
    TrendingUp,
    ShieldCheck,
    Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

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
            // Call the sync endpoint
            await fetch(`${AUTH_BASE}/clients/sync?force=true`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            // Reload stats after a short delay
            setTimeout(loadStats, 2000);
        } catch (e) {
            console.error(e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-10 selection:bg-orange-500/30">
            {/* --- HERO STATS --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                    { label: "Active Clients", value: stats.creators, icon: Users, color: "orange" },
                    { label: "Videos Managed", value: stats.videos, icon: Video, color: "blue" },
                    { label: "Thumbnails", value: stats.thumbnails, icon: ImageIcon, color: "purple" },
                    { label: "Total Reach", value: stats.reach, icon: TrendingUp, color: "green" },
                ].map((s, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-6 rounded-[24px] bg-[var(--surface-alt)] border border-[var(--border)] relative overflow-hidden group hover:border-orange-500/30 transition-all"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg bg-${s.color}-500/10 text-${s.color}-500`}>
                                <s.icon size={18} />
                            </div>
                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{s.label}</span>
                        </div>
                        <div className="text-3xl font-black text-[var(--text)] group-hover:scale-105 transition-transform origin-left">
                            {loading ? <div className="h-8 w-16 bg-white/5 animate-pulse rounded" /> : s.value || 0}
                        </div>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <s.icon size={64} className={`text-${s.color}-500`} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* --- QUICK ACTIONS (CONTROL CENTER) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Control Center */}
                    <div className="p-8 rounded-[32px] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-20">
                            <Zap size={120} className="text-orange-500/10" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-widest text-white">Control Center</h2>
                                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-tighter">Proactive Administrative Node</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: "Sync Pulse", icon: Activity, action: triggerPulseRefresh, busy: busy },
                                    { label: "Registry", icon: Users, path: "/dashboard/clients" },
                                    { label: "CRM", icon: Shield, path: "/dashboard/leads" },
                                    { label: "Refresh Hub", icon: BarChart3, action: loadStats },
                                ].map((act, i) => (
                                    act.path ? (
                                        <Link
                                            key={i}
                                            to={act.path}
                                            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group"
                                        >
                                            <act.icon size={24} className="text-gray-500 group-hover:text-orange-500 mb-2 transition-colors" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white">{act.label}</span>
                                        </Link>
                                    ) : (
                                        <button
                                            key={i}
                                            onClick={act.action}
                                            disabled={act.busy}
                                            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group disabled:opacity-50"
                                        >
                                            <act.icon size={24} className={`text-gray-500 group-hover:text-orange-500 mb-2 transition-colors ${act.busy ? 'animate-spin' : ''}`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white">{act.label}</span>
                                        </button>
                                    )
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* System Health Registry */}
                    <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <Activity size={20} className="text-orange-500" />
                                <h2 className="text-lg font-black uppercase tracking-widest">Health Registry</h2>
                            </div>
                            {lastPulse && (
                                <div className="text-[10px] font-bold text-gray-600 uppercase">
                                    Last Sync Checked: {new Date(lastPulse).toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                {/* --- ACTIVITY FEED (SIDEBAR) --- */}
                <div className="space-y-6">
                    <div className="p-6 rounded-[32px] bg-[var(--surface-alt)] border border-[var(--border)] overflow-hidden h-full">
                        <div className="flex items-center gap-3 mb-6">
                            <BarChart3 size={18} className="text-blue-500" />
                            <h3 className="text-xs font-black uppercase tracking-widest">Recent Activity</h3>
                        </div>
                        <div className="space-y-4">
                            {!lastPulse && !trace ? (
                                <div className="text-center py-10 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                    No recent logs found
                                </div>
                            ) : (
                                <>
                                    {lastPulse && (
                                        <ActivityItem
                                            title="Pulse Sync Synchronized"
                                            time={new Date(lastPulse).toLocaleTimeString()}
                                            type="sync"
                                        />
                                    )}
                                    {trace && trace.slice(0, 5).map((t, i) => (
                                        <ActivityItem
                                            key={i}
                                            title={`Sync: ${t.name}`}
                                            time={t.status === 'success' ? `${t.count} videos` : 'Error'}
                                            type={t.status === 'success' ? 'success' : 'error'}
                                        />
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="p-8 rounded-[32px] bg-orange-600 text-white shadow-2xl shadow-orange-900/20 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <h3 className="text-xl font-black mb-2">Workspace <br />System V2.4</h3>
                            <p className="text-orange-100 text-sm font-bold opacity-80 mb-6 leading-relaxed italic">"Simplicity is the soul of efficient management."</p>
                            <div className="p-3 rounded-xl bg-white/20 text-xs font-black uppercase tracking-widest text-center border border-white/10">
                                SHINEL_CORE_STABLE
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- PULSE DIAGNOSTICS (Moved out for visibility) --- */}
            <AnimatePresence>
                {trace && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-8 rounded-[32px] bg-orange-500/5 border-2 border-orange-500/20 shadow-2xl shadow-orange-500/10 backdrop-blur-sm"
                    >
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
                                        API: {keyStatus.present ? (keyStatus.valid ? 'ACTIVE' : 'KEYS_INVALID') : 'OFFLINE'}
                                        {keyStatus.present && <span className="ml-2 opacity-60">({keyStatus.count} Keys Pooled)</span>}
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={() => setTrace(null)}
                                className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {trace.map((t, i) => (
                                <div key={i} className={`p-4 rounded-2xl border ${t.status === 'success' ? 'bg-black/20 border-white/10' : 'bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-black uppercase tracking-wider truncate mr-2">{t.name}</span>
                                        <div className={`w-2 h-2 rounded-full ${t.status === 'success' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                                    </div>
                                    <div className="text-[9px] font-bold text-gray-500 font-mono mb-2 truncate">{t.id}</div>
                                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Sync Result</span>
                                        {t.status === 'success' ? (
                                            <span className="text-[10px] font-black text-green-500">{t.count} Vids</span>
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
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Manual verification recommended for entries showing persistent red status.</span>
                            </div>
                            <a href="https://commentpicker.com/youtube-channel-id.php" target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:underline">Verify IDs</a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ActivityItem({ title, time, type }) {
    const iconMap = {
        sync: { icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10" },
        success: { icon: Shield, color: "text-green-500", bg: "bg-green-500/10" },
        error: { icon: X, color: "text-red-500", bg: "bg-red-500/10" },
    };
    const { icon: Icon, color, bg } = iconMap[type] || iconMap.sync;

    return (
        <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/5 transition-all">
            <div className={`p-2 rounded-xl ${bg} ${color}`}>
                <Icon size={14} />
            </div>
            <div className="flex-grow min-w-0">
                <div className="text-[11px] font-bold text-gray-300 truncate tracking-wide">{title}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-0.5">{time}</div>
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
