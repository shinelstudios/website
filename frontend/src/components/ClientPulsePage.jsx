import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MetaTags from "./MetaTags";
import {
    Radio,
    Play,
    Clock,
    ExternalLink,
    AlertCircle,
    Zap,
    TrendingUp,
    Youtube,
    RefreshCw
} from "lucide-react";
import { CLIENT_PULSE_CONFIG, AUTH_BASE } from "../config/constants";
import PremiumPlayer from "./PremiumPlayer";

/**
 * ClientPulsePage Component
 * A real-time activity feed showcasing client live streams and new uploads (YouTube Only).
 * Now uses the dynamic registry from the Shinel API.
 */
const ClientPulsePage = () => {
    const [activities, setActivities] = useState([]);
    const [channelMeta, setChannelMeta] = useState({}); // id -> { title, logo }
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState(Date.now());
    const [error, setError] = useState(null);
    const [quotaExceeded, setQuotaExceeded] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastChecked, setLastChecked] = useState(Date.now());
    const [isAdmin, setIsAdmin] = useState(false);

    // Check for admin role
    useEffect(() => {
        const checkAdmin = () => {
            const role = localStorage.getItem("role") || "";
            setIsAdmin(role.toLowerCase().includes("admin"));
        };
        checkAdmin();
        window.addEventListener("auth:changed", checkAdmin);
        return () => window.removeEventListener("auth:changed", checkAdmin);
    }, []);

    // Filter relevant activities (Strict 24 hours)
    const activeFeeds = useMemo(() => {
        const now = Date.now();
        const windowSize = 24 * 60 * 60 * 1000; // Strict 24 hours
        return activities
            .filter(a => (now - Number(a.timestamp || 0)) < windowSize)
            .sort((a, b) => {
                // Priority: LIVE > Newest
                if (a.isLive && !b.isLive) return -1;
                if (!a.isLive && b.isLive) return 1;
                return b.timestamp - a.timestamp;
            });
    }, [activities]);

    const fetchPulse = useCallback(async (isBackground = false) => {
        if (isBackground) setIsRefreshing(true);
        else setLoading(true);

        setError(null);

        try {
            // Fetch Pulse Feed from Backend (Quota Protected)
            const res = await fetch(`${AUTH_BASE}/clients/pulse`);
            if (!res.ok) throw new Error("Backend synchronization failure");

            const data = await res.json();

            setActivities(data.activities || []);
            setChannelMeta(data.meta || {});
            setLastSync(data.ts || Date.now());
            setQuotaExceeded(!!data.quotaExceeded);
            setLastChecked(Date.now());

            // Also load reg for stats if needed ONLY on full load
            if (!isBackground) {
                const cRes = await fetch(`${AUTH_BASE}/clients`);
                if (cRes.ok) {
                    const cData = await cRes.json();
                    setClients(cData.clients || []);
                }
            }

        } catch (err) {
            setError("Pulse sync failed. Backend may be unavailable.");
            console.error("Pulse fetch failed:", err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchPulse();

        // 💡 30 MINUTE BACKGROUND POLLING with recursive timeout for robustness
        let timer;
        const poll = () => {
            timer = setTimeout(async () => {
                await fetchPulse(true);
                poll();
            }, 30 * 60 * 1000);
        };

        poll();
        return () => clearTimeout(timer);
    }, [fetchPulse]);

    return (
        <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] selection:bg-[var(--orange)]/30">
            <MetaTags
                title="Client Pulse | Shinel Studios Live"
                description="Real-time YouTube activity feed for our partner creators. New uploads and live streams from the last 24h."
            />

            {/* --- HERO --- */}
            <section className="relative pt-32 pb-16 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-black uppercase tracking-widest text-orange-500 mb-6"
                    >
                        <Radio size={14} className="animate-pulse" />
                        Live Pulse Monitor
                    </motion.div>

                    <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter leading-[0.9]">
                        REAL-TIME <br />
                        <span className="text-orange-500 italic">PULSE.</span>
                    </h1>

                    <p className="text-[var(--text-muted)] max-w-xl mx-auto text-lg mb-8 leading-relaxed">
                        The heartbeat of our partner creators. Live streams and fresh uploads from across our client network, synced every 30 minutes.
                    </p>

                    <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">
                        <div className="flex items-center gap-2">
                            <Clock size={12} />
                            24H Activity Window
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FEED --- */}
            <main className="container mx-auto px-6 pb-32">
                <div className="flex items-center justify-between mb-8 border-b border-[var(--border)] pb-4">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-2">
                        <Zap size={16} className="text-orange-500 fill-orange-500" />
                        Activity Feed
                    </h2>
                    <div className="flex items-center gap-6">
                        {isRefreshing && (
                            <div className="flex items-center gap-2 text-[10px] font-black text-orange-500 uppercase tracking-widest animate-pulse">
                                <Zap size={12} className="fill-orange-500" />
                                Refreshing...
                            </div>
                        )}
                        <div className="flex items-center gap-4">
                            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase flex flex-col items-end gap-1">
                                <span className="opacity-60">Synced: {new Date(lastSync).toLocaleTimeString()}</span>
                                <span>Checked: {new Date(lastChecked).toLocaleTimeString()}</span>
                            </div>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={() => fetchPulse(true)}
                                disabled={isRefreshing || loading}
                                className="p-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--text-muted)] hover:text-orange-500 hover:border-orange-500/50 transition-all disabled:opacity-50"
                                title="Check for updates (Admin Only)"
                            >
                                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                            </button>
                        )}
                    </div>
                </div>

                {
                    quotaExceeded && (
                        <div className="mb-10 p-6 rounded-3xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center gap-4">
                            <Zap size={24} className="animate-pulse" />
                            <div>
                                <div className="font-bold">YouTube API Quota Exceeded</div>
                                <div className="text-xs opacity-80">The studio has reached its daily sync limit. Feed may be stale until reset (UTC midnight).</div>
                            </div>
                        </div>
                    )
                }

                {
                    error && (
                        <div className="mb-10 p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-4">
                            <AlertCircle size={24} />
                            <span className="font-bold">{error}</span>
                        </div>
                    )
                }

                {
                    activeFeeds.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <AnimatePresence mode="popLayout">
                                {activeFeeds.map((activity, idx) => (
                                    <ActivityCard
                                        key={activity.id}
                                        activity={activity}
                                        index={idx}
                                        meta={channelMeta[activity.channelId]}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : !loading && clients.length === 0 ? (
                        <div className="py-32 text-center border-2 border-dashed border-[var(--border)] rounded-[40px]">
                            <Youtube size={64} className="mx-auto text-[var(--text-muted)]/20 mb-6" />
                            <h3 className="text-2xl font-bold text-[var(--text-muted)] mb-2">Registry is empty</h3>
                            <p className="text-[var(--text-muted)]/80 max-w-xs mx-auto mb-8">You haven't added any client channels to the registry yet.</p>
                            <Link to="/admin/clients" className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-orange-500/50 text-orange-500 font-bold uppercase text-[10px] hover:bg-orange-500 hover:text-white transition-all">
                                Add Clients via Dashboard
                            </Link>
                        </div>
                    ) : !loading && (
                        <div className="py-32 text-center border-2 border-dashed border-[var(--border)] rounded-[40px]">
                            <Youtube size={64} className="mx-auto text-[var(--text-muted)]/20 mb-6" />
                            <h3 className="text-2xl font-bold text-[var(--text-muted)] mb-2">Silence in the pulse</h3>
                            <p className="text-[var(--text-muted)]/80 max-w-xs mx-auto">No client uploads or live streams detected in the last 24 hours for {clients.length} registered channels.</p>
                        </div>
                    )
                }

                {
                    loading && activeFeeds.length === 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="aspect-video rounded-[32px] bg-[var(--surface-alt)] animate-pulse" />
                            ))}
                        </div>
                    )
                }
            </main >
        </div >
    );
};

const ActivityCard = ({ activity, index, meta }) => {
    const isLive = activity.isLive;
    const [isHovered, setIsHovered] = useState(false);
    const videoId = useMemo(() => {
        if (!activity.url) return null;
        try {
            const url = new URL(activity.url);
            if (url.hostname.includes("youtube.com")) return url.searchParams.get("v");
            if (url.hostname === "youtu.be") return url.pathname.substring(1);
        } catch (e) { return null; }
        return null;
    }, [activity.url]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative group rounded-[32px] overflow-hidden bg-[var(--surface-alt)]/50 border transition-all duration-700 hover:bg-[var(--surface-alt)] ${isLive ? "border-red-600/50 shadow-[0_0_40px_rgba(220,38,38,0.15)]" : "border-[var(--border)]"
                }`}
        >
            {/* THUMBNAIL / PREVIEW */}
            <div className="aspect-video relative overflow-hidden bg-[var(--surface-alt)]">
                <AnimatePresence>
                    {!isHovered || !videoId ? (
                        <motion.img
                            key="thumb"
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            src={activity.thumbnail}
                            alt={activity.title}
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                            loading="lazy"
                        />
                    ) : (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-0 overflow-hidden"
                        >
                            <PremiumPlayer
                                videoId={videoId}
                                thumbnail={activity.thumbnail}
                                autoplay={true}
                                className="w-full h-full"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Overlay Badges */}
                <div className="absolute top-4 left-4 flex gap-2 z-10">
                    {isLive && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-widest animate-pulse shadow-2xl">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            Live Now
                        </div>
                    )}
                    <div className="px-3 py-1.5 rounded-full bg-[var(--surface)]/60 backdrop-blur-xl text-[var(--text)] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-[var(--border)]"
                        style={{ WebkitBackdropFilter: "blur(32px)" }}>
                        {activity.type === 'VIDEO' ? <Play size={10} fill="currentColor" /> : <Radio size={10} />}
                        {activity.type}
                    </div>
                </div>

            </div>

            {/* CONTENT */}
            <div className="p-7">
                <div className="flex items-center gap-3 mb-5">
                    {/* Channel Logo */}
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] flex-shrink-0">
                        {meta?.logo ? (
                            <img src={meta.logo} alt={activity.clientName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-orange-500 uppercase">
                                {activity.clientName.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <div className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                            {activity.clientName}
                        </div>
                        <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                            {new Date(activity.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    {isLive && (
                        <div className="ml-auto">
                            <TrendingUp size={14} className="text-red-500" />
                        </div>
                    )}
                </div>

                <h4 className="text-lg md:text-xl font-bold leading-tight mb-8 group-hover:text-orange-400 transition-colors line-clamp-2 min-h-[3.5rem]">
                    {activity.title}
                </h4>

                <a
                    href={activity.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] hover:bg-[var(--orange)] hover:text-white hover:border-[var(--orange)] hover:shadow-[0_10px_25px_rgba(232,80,2,0.3)] transition-all duration-500 text-[10px] font-black uppercase tracking-[0.2em]"
                >
                    Watch on YouTube
                    <ExternalLink size={14} />
                </a>
            </div>
        </motion.div>
    );
};

export default ClientPulsePage;
