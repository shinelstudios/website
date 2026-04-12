import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
    LayoutDashboard,
    Folder,
    MessageSquare,
    Settings,
    LogOut,
    CheckCircle,
    Clock,
    AlertCircle,
    FileText,
    Video,
    Image as ImageIcon,
    ArrowRight,
    TrendingUp,
    Play
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import DriveEmbed from "./DriveEmbed";

const StatusBadge = ({ status }) => {
    const styles = {
        "active": "bg-blue-500/10 text-blue-500 border-blue-500/20",
        "in-review": "bg-orange-500/10 text-[var(--orange)] border-orange-500/20",
        "completed": "bg-green-500/10 text-green-500 border-green-500/20",
        "paused": "bg-gray-500/10 text-gray-400 border-gray-500/20"
    };

    const labels = {
        "active": "In Production",
        "in-review": "Needs Review",
        "completed": "Completed",
        "paused": "Paused"
    };

    return (
        <span className={`px-2 py-1 rounded-md text-xs font-bold border ${styles[status] || styles['paused']} uppercase tracking-wider flex items-center gap-1.5`}>
            {status === 'completed' && <CheckCircle size={10} />}
            {status === 'in-review' && <AlertCircle size={10} />}
            {status === 'active' && <Clock size={10} />}
            {labels[status]}
        </span>
    );
};

import { getProjectsForUser } from "../../data/clientRegistry";
import { AUTH_BASE, CLIENT_REGISTRY } from "../../config/constants";

export default function ClientDashboard() {
    const [user, setUser] = useState({
        name: localStorage.getItem("firstName") || localStorage.getItem("userFirstName") || "Client",
        email: localStorage.getItem("email") || localStorage.getItem("userEmail") || "",
        role: localStorage.getItem("role") || ""
    });

    // Fetch projects based on user identity
    const projects = getProjectsForUser(user.email, user.role);

    const [activeTab, setActiveTab] = useState("overview");
    const [pulseData, setPulseData] = useState({ activities: [], loading: true });
    const [syncedStats, setSyncedStats] = useState(null);
    const navigate = useNavigate();

    const creatorMapping = useMemo(() => {
        return CLIENT_REGISTRY.find(c => c.creatorEmail?.toLowerCase() === user.email?.toLowerCase());
    }, [user.email]);

    useEffect(() => {
        async function fetchPulse() {
            try {
                // Fetch pulse
                const res = await fetch(`${AUTH_BASE}/clients/pulse`);
                if (res.ok) {
                    const data = await res.json();
                    const filtered = creatorMapping
                        ? (data.activities || []).filter(a => a.channelId === creatorMapping.youtubeId)
                        : [];
                    setPulseData({ activities: filtered, loading: false });
                }

                // Fetch real stats for exact sub/view counts
                const sRes = await fetch(`${AUTH_BASE}/clients/stats`);
                if (sRes.ok) {
                    const sData = await sRes.json();
                    if (creatorMapping) {
                        const mine = (sData.stats || []).find(s => s.id === creatorMapping.youtubeId);
                        if (mine) {
                            // PRIORITY FIX: If API is rounded and registry is more precise
                            if (mine.subscribers > 0 && mine.subscribers % 1000 === 0 && creatorMapping.subscribers > 0 && Math.abs(mine.subscribers - creatorMapping.subscribers) < 1000) {
                                mine.subscribers = creatorMapping.subscribers;
                            }
                            setSyncedStats(mine);
                        }
                    }
                }
            } catch (err) {
                console.error("Dashboard fetch error", err);
                setPulseData(prev => ({ ...prev, loading: false }));
            }
        }
        fetchPulse();
    }, [creatorMapping]);


    // ... (rest of code) ...

    return (
        <div className="font-sans">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name} 👋</h1>
                    <p className="text-[var(--text-muted)]">Here is what's happening with your projects today.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--text-muted)]">Need help?</span>
                    <button className="px-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm font-bold hover:bg-[var(--surface-2)] transition-colors">
                        Contact Manager
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mb-8 border-b border-[var(--border)] pb-1">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex items-center gap-2 px-4 py-3 rounded-t-xl border-b-2 transition-all font-medium text-sm ${activeTab === "overview"
                        ? "border-[var(--orange)] text-[var(--orange)] bg-[var(--orange)]/5"
                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)]"
                        }`}
                >
                    <LayoutDashboard size={16} /> Overview
                </button>
                <button
                    onClick={() => setActiveTab("files")}
                    className={`flex items-center gap-2 px-4 py-3 rounded-t-xl border-b-2 transition-all font-medium text-sm ${activeTab === "files"
                        ? "border-blue-500 text-blue-500 bg-blue-500/5"
                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)]"
                        }`}
                >
                    <Folder size={16} /> Assets & Drive
                </button>
                <button
                    onClick={() => setActiveTab("performance")}
                    className={`flex items-center gap-2 px-4 py-3 rounded-t-xl border-b-2 transition-all font-medium text-sm ${activeTab === "performance"
                        ? "border-green-500 text-green-500 bg-green-500/5"
                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)]"
                        }`}
                >
                    <TrendingUp size={16} /> YouTube Pulse
                </button>
                <button
                    className="flex items-center gap-2 px-4 py-3 rounded-t-xl border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] transition-all font-medium text-sm"
                >
                    <MessageSquare size={16} /> Messages
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                {/* Active Projects */}
                {activeTab === "overview" && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Video size={20} className="text-[var(--orange)]" />
                                Active Projects
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project) => (
                                <motion.div
                                    key={project.id}
                                    whileHover={{ y: -5 }}
                                    className="group bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden hover:shadow-xl transition-all hover:border-[var(--text-muted)]/30"
                                >
                                    <div className="h-40 bg-[var(--surface-alt)] relative overflow-hidden">
                                        <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
                                        <div className="absolute top-3 right-3">
                                            <StatusBadge status={project.status} />
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">{project.type}</p>
                                                <h3 className="font-bold text-lg leading-tight">{project.title}</h3>
                                            </div>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!confirm("Notify team about updates to this project?")) return;
                                                    try {
                                                        const token = localStorage.getItem("token");
                                                        const res = await fetch(`${AUTH_BASE}/notify`, {
                                                            method: "POST",
                                                            headers: {
                                                                "content-type": "application/json",
                                                                "authorization": `Bearer ${token}`
                                                            },
                                                            body: JSON.stringify({
                                                                type: "upload",
                                                                message: `Client has updated project: ${project.title}`
                                                            })
                                                        });
                                                        if (res.ok) alert("Team notified! 🔔");
                                                        else alert("Failed to notify. Dev note: Is DISCORD_WEBHOOK_URL set?");
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Error sending notification");
                                                    }
                                                }}
                                                className="p-1.5 rounded-full hover:bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[#5865F2] transition-colors"
                                                title="Notify Team of Updates"
                                            >
                                                <MessageSquare size={16} />
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-[var(--border)]">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                                    <Clock size={12} /> Updated {project.lastUpdated}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                {/* Assets Link */}
                                                <button
                                                    onClick={() => window.open(project.driveLink, '_blank')}
                                                    className="px-3 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={!project.driveLink}
                                                >
                                                    <Folder size={14} className="text-blue-400" /> Assets
                                                </button>

                                                {/* Finals Link */}
                                                <button
                                                    onClick={() => window.open(project.finalsLink, '_blank')}
                                                    className="px-3 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={!project.finalsLink}
                                                >
                                                    <CheckCircle size={14} className="text-green-400" /> Finals
                                                </button>
                                            </div>

                                            {/* Financials / Status Sheet */}
                                            <button
                                                onClick={() => window.open(project.billingSheet, '_blank')}
                                                className="w-full px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-500 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!project.billingSheet}
                                            >
                                                <FileText size={14} /> Financials & Status
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* YouTube Performance Section */}
                {activeTab === "performance" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-8"
                    >
                        <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 border border-green-500/20 rounded-3xl p-8 relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                                    <TrendingUp className="text-green-500" />
                                    YouTube Performance
                                </h2>
                                <p className="text-[var(--text-muted)] text-sm mb-6 uppercase tracking-widest font-bold">Live Activity Monitoring (Last 24h)</p>

                                {!creatorMapping ? (
                                    <div className="p-6 bg-black/20 rounded-2xl border border-white/5 text-center">
                                        <p className="text-sm text-[var(--text-muted)]">No YouTube channel linked to this account. Contact your manager to enable Pulse tracking.</p>
                                    </div>
                                ) : pulseData.loading ? (
                                    <div className="flex gap-4">
                                        {[1, 2].map(i => <div key={i} className="flex-1 h-32 bg-white/5 animate-pulse rounded-2xl" />)}
                                    </div>
                                ) : pulseData.activities.length === 0 ? (
                                    <div className="p-12 text-center bg-black/20 rounded-3xl border border-white/5">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Play size={32} className="text-white/20" />
                                        </div>
                                        <h3 className="font-bold mb-1">No recent uploads detected</h3>
                                        <p className="text-xs text-[var(--text-muted)]">Upload a video to see real-time performance tracking here.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {pulseData.activities.map(act => (
                                            <div key={act.id} className="group bg-black/40 border border-white/10 rounded-2xl overflow-hidden hover:border-green-500/30 transition-all flex h-28">
                                                <div className="w-40 shrink-0 relative">
                                                    <img src={act.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Play size={24} className="text-white" />
                                                    </div>
                                                </div>
                                                <div className="p-4 flex flex-col justify-center">
                                                    <h4 className="font-bold text-sm mb-1 line-clamp-2">{act.title}</h4>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-mono text-green-500 uppercase font-black">Live Tracker</span>
                                                        <span className="text-[10px] font-mono text-white/30 uppercase">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Decorative background circle */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
                        </div>

                        {/* Quick Stats Grid */}
                        {creatorMapping && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    {
                                        label: 'Subscribers',
                                        val: (syncedStats?.subscribers ?? creatorMapping.subscribers).toLocaleString(),
                                        color: 'text-blue-500'
                                    },
                                    {
                                        label: 'Total Views',
                                        val: (syncedStats?.viewCount ?? 0).toLocaleString(),
                                        color: 'text-orange-500'
                                    },
                                    { label: 'Status', val: 'Connected', color: 'text-green-500' },
                                    { label: 'Uptime', val: '99.9%', color: 'text-emerald-500' }
                                ].map((s, i) => (
                                    <div key={i} className="bg-[var(--surface-alt)] border border-[var(--border)] p-4 rounded-2xl">
                                        <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1">{s.label}</p>
                                        <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
