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
    Lock,
    Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useClientStats } from "../context/ClientStatsContext";

import { AUTH_BASE } from "../config/constants";
import { getAccessToken } from "../utils/tokenStore";
import LeadsFunnel from "./admin/LeadsFunnel";
import ActivityHeatmap from "./admin/ActivityHeatmap";
import { Img } from "../design";

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
    const [showWorkspace, setShowWorkspace] = useState(() => {
        try {
            return localStorage.getItem("workspace_hub_visible") !== "false";
        } catch { return true; }
    });

    const handleHideWorkspace = () => {
        setShowWorkspace(false);
        try {
            localStorage.setItem("workspace_hub_visible", "false");
        } catch { }
    };

    const { stats: allClients, getGrowth, liveMode, setLiveMode } = useClientStats();

    const topMovers = React.useMemo(() => {
        if (!allClients) return [];
        return allClients
            .map(c => ({
                ...c,
                growth: getGrowth(c.youtubeId || c.id, 7)
            }))
            .sort((a, b) => b.growth - a.growth)
            .slice(0, 4);
    }, [allClients, getGrowth]);

    // Auth token for admin requests
    const token = getAccessToken();

    async function loadStats() {
        try {
            setLoading(true);
            const res = await fetch(`${AUTH_BASE}/stats`);
            if (!res.ok) throw new Error(`Stats (${res.status})`);
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
            await fetch(`${AUTH_BASE}/clients/sync?force=true`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
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

            {/* --- MAIN GRID --- */}
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
                                    { label: "Live Sync", icon: Zap, action: () => setLiveMode(!liveMode), active: liveMode },
                                    { label: "Backup DB", icon: Download, action: async () => {
                                        setBusy(true);
                                        try {
                                            const res = await fetch(`${AUTH_BASE}/admin/db-export`, {
                                                headers: { "Authorization": `Bearer ${token}` }
                                            });
                                            if (!res.ok) throw new Error("Export failed");
                                            const blob = await res.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `shinel-db-backup-${new Date().toISOString().split('T')[0]}.json`;
                                            document.body.appendChild(a);
                                            a.click();
                                            window.URL.revokeObjectURL(url);
                                        } catch (e) { console.error(e); }
                                        finally { setBusy(false); }
                                    }},
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
                                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all group disabled:opacity-50 ${act.active ? 'bg-orange-500/10 border-orange-500/50' : 'bg-white/5 border-white/5 hover:border-orange-500/30 hover:bg-orange-500/5'}`}
                                        >
                                            <act.icon size={24} className={`mb-2 transition-colors ${act.busy ? 'animate-spin' : ''} ${act.active ? 'text-orange-500' : 'text-gray-500 group-hover:text-orange-500'}`} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${act.active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>{act.label}</span>
                                            {act.active && (
                                                <div className="mt-1 w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
                                            )}
                                        </button>
                                    )
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Client Health High-Score */}
                    <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <TrendingUp size={20} className="text-green-500" />
                                <h2 className="text-lg font-black uppercase tracking-widest">Client Health</h2>
                            </div>
                            <div className="text-[10px] font-bold text-gray-600 uppercase">Growth (Last 7 Days)</div>
                        </div>

                        {topMovers.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                                {topMovers.map(c => (
                                    <div key={c.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-green-500/30 transition-all">
                                        <div className="flex items-center gap-3">
                                            {c.logo && <Img src={c.logo} className="w-6 h-6 rounded-full" alt="" />}
                                            <span className="text-xs font-bold text-gray-300 truncate max-w-[80px]">{c.title}</span>
                                        </div>
                                        <div className={`flex items-center gap-1 text-[10px] font-black ${c.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {c.growth >= 0 ? '+' : ''}{c.growth.toFixed(1)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-[10px] font-bold text-gray-600 uppercase italic">
                                Awaiting historical data for scoring...
                            </div>
                        )}
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

                    {/* --- PULSE DIAGNOSTICS (Moved inside col-span-2 for layout stability) --- */}
                    <div className="relative z-0">
                        <AnimatePresence>
                            {trace && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-8 rounded-[32px] bg-orange-500/5 border-2 border-orange-500/10 shadow-xl shadow-orange-500/5 overflow-hidden"
                                >
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                                <Activity size={24} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black uppercase tracking-widest text-white">Pulse X-Ray</h2>
                                                <p className="text-xs font-bold text-orange-500 uppercase tracking-tighter">Real-time sync diagnostics</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {keyStatus && (
                                                <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${keyStatus.valid ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                                    <div className={`w-2 h-2 rounded-full ${keyStatus.valid ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                                                    <div className="text-[10px] font-black uppercase tracking-widest">
                                                        API: {keyStatus.present ? (keyStatus.valid ? 'ACTIVE' : 'KEYS_INVALID') : 'OFFLINE'}
                                                        {keyStatus.present && <span className="ml-2 opacity-60">({keyStatus.count} pooled)</span>}
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
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {trace.map((t, i) => (
                                            <div key={i} className={`p-5 rounded-2xl border transition-all ${t.status === 'success' ? 'bg-white/[0.02] border-white/5' : 'bg-red-500/5 border-red-500/20 shadow-lg shadow-red-500/5'}`}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-xs font-black uppercase tracking-widest truncate mr-2 text-white">{t.name}</span>
                                                    <div className={`w-2 h-2 rounded-full ${t.status === 'success' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                                                </div>
                                                <div className="text-[9px] font-black text-gray-500 font-mono mb-4 truncate italic">{t.id}</div>
                                                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Status</span>
                                                    {t.status === 'success' ? (
                                                        <span className="text-[10px] font-black text-green-500">{t.count} VIDS SYNCED</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-red-500 truncate max-w-[120px]" title={t.error}>{t.error || 'Fetch Error'}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck size={16} className="text-orange-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 italic">Manual verification recommended for persistent anomalies.</span>
                                        </div>
                                        <a
                                            href="https://commentpicker.com/youtube-channel-id.php"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-4 py-2 rounded-xl bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/20 transition-all border border-orange-500/20"
                                        >
                                            Verify IDs
                                        </a>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
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

                    <AnimatePresence>
                        {showWorkspace && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="p-8 rounded-[32px] bg-gradient-to-br from-orange-600 to-orange-500 text-white shadow-2xl shadow-orange-900/20 relative overflow-hidden group"
                            >
                                <button
                                    onClick={handleHideWorkspace}
                                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 text-white/50 hover:text-white transition-all z-20"
                                >
                                    <X size={16} />
                                </button>
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute -right-4 -bottom-4 opacity-10">
                                    <Shield size={120} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-xl font-black mb-2 italic">Workspace <br />Deployment Hub</h3>
                                    <p className="text-orange-100 text-xs font-bold opacity-80 mb-6 leading-relaxed">
                                        Monitor real-time system stability and managed creator nodes.
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <div className="px-3 py-2 rounded-xl bg-green-500/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-center border border-green-400/30 flex items-center justify-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                            CORE_SYSTEM_STABLE
                                        </div>
                                        <Link to="/dashboard/audits" className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-widest text-center border border-white/10 transition-all">
                                            View System Logs
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* --- DASHBOARD REFRESH (Phase 2 #6) ---
                LeadsFunnel + ActivityHeatmap rendered as a 2-column row on
                lg, stacked on mobile. Both are self-contained tiles with
                their own loading/error states. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <LeadsFunnel />
                <ActivityHeatmap />
            </div>
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
