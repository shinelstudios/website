/**
 * CommandPalette.jsx
 * 
 * About: Keyboard-driven navigation and search tool (Ctrl+K).
 * Features: Fuzzy search for pages and tools, Quick actions, Dark/Light mode toggle.
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAccessToken } from "../../utils/tokenStore";
import {
    Search,
    Home,
    Activity,
    Briefcase,
    FileText,
    Cpu,
    LayoutDashboard,
    Users,
    Video,
    Image as ImageIcon,
    Settings,
    ArrowRight,
    MousePointer2,
    Command
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useClientStats } from "../../context/ClientStatsContext";
import { AUTH_BASE } from "../../config/constants";
import { createVideoStorage } from "../cloudflare-video-storage";

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const [videos, setVideos] = useState([]);
    const navigate = useNavigate();
    const { stats: creators } = useClientStats();

    // Role lives in the JWT payload — localStorage was the legacy key,
    // never written post-tokenStore migration so this used to read null
    // (admin and editor surfaces never appeared in the palette).
    const role = (() => {
        try {
            const tok = getAccessToken();
            if (!tok) return "";
            const [, p] = tok.split(".");
            if (!p) return "";
            const json = atob(p.replace(/-/g, "+").replace(/_/g, "/"));
            return String((JSON.parse(json) || {}).role || "").toLowerCase();
        } catch { return ""; }
    })();
    const isAdmin = role.includes("admin");
    const isEditor = role.includes("editor");

    useEffect(() => {
        if (isOpen && (isAdmin || isEditor)) {
            const store = createVideoStorage(AUTH_BASE, () => getAccessToken());
            store.getAll().then(setVideos).catch(console.error);
        }
    }, [isOpen, isAdmin, isEditor]);

    const commands = useMemo(() => {
        const base = [
            { icon: Home, label: "Home", path: "/", category: "Pages" },
            { icon: Activity, label: "Pulse", path: "/live", category: "Pages" },
            { icon: Briefcase, label: "Work Portfolio", path: "/work", category: "Pages" },
            { icon: Cpu, label: "AI Studio", path: "/studio", category: "Tools" },
            { icon: ImageIcon, label: "Thumbnail Previewer", path: "/tools/thumbnail-previewer", category: "Tools" },
            // { icon: Video, label: "SRT/Caption Tool", path: "/tools/srt", category: "Tools" },
        ];

        if (isAdmin) {
            base.push(
                // Cockpit shortcuts
                { icon: Activity, label: "Ops Cockpit", path: "/dashboard/ops", category: "Cockpit", sublabel: "Live agency cockpit" },
                { icon: Briefcase, label: "Projects", path: "/dashboard/projects", category: "Cockpit", sublabel: "Pipeline · kanban + list" },
                { icon: Activity, label: "Cockpit: My Todos", path: "/dashboard/ops?tab=todos", category: "Cockpit", sublabel: "Private list + Discord pings" },
                { icon: Activity, label: "✨ Generate SEO for a video", path: "/dashboard/ops?seo-request=1", category: "Cockpit", sublabel: "Point at any video → Cowork Claude proposes" },
                { icon: Activity, label: "Cockpit: Pipeline tab", path: "/dashboard/ops?tab=pipeline", category: "Cockpit" },
                { icon: Activity, label: "Cockpit: Finance tab", path: "/dashboard/ops?tab=finance", category: "Cockpit" },
                { icon: Activity, label: "Cockpit: Team tab",    path: "/dashboard/ops?tab=team", category: "Cockpit" },
                { icon: Activity, label: "Cockpit: Automation tab", path: "/dashboard/ops?tab=automation", category: "Cockpit" },
                { icon: Users, label: "Editor self-view (me)",   path: "/editor/me", category: "Cockpit" },

                // Quick actions — these run a worker call instead of navigating
                { icon: Activity, label: "▶ Force-sync YouTube",  action: "sync_yt",       category: "Actions", sublabel: "Bypass 15-min cooldown" },
                { icon: Activity, label: "🔔 Test Discord webhook", action: "test_webhook", category: "Actions", sublabel: "Ping #alerts" },
                { icon: Activity, label: "📊 Run weekly digest now", action: "run_digest",  category: "Actions", sublabel: "Force the Sunday recap" },
                { icon: Activity, label: "👥 Run editor summary now", action: "run_editor_summary", category: "Actions" },
                { icon: Activity, label: "🌐 Auto-promote → website", action: "auto_promote", category: "Actions" },

                // Legacy admin pages
                { icon: LayoutDashboard, label: "Management Hub", path: "/dashboard", category: "Admin" },
                { icon: Users, label: "Clients Manager", path: "/dashboard/clients", category: "Admin" },
                { icon: FileText, label: "Leads & Requests", path: "/dashboard/leads", category: "Admin" },
                { icon: Video, label: "Videos Database", path: "/dashboard/videos", category: "Admin" },
                { icon: ImageIcon, label: "Thumbnails Database", path: "/dashboard/thumbnails", category: "Admin" },
                { icon: Settings, label: "System Settings", path: "/dashboard/settings", category: "Admin" }
            );
        }

        return base;
    }, [isAdmin]);

    const filtered = useMemo(() => {
        let results = [...commands];

        // Add Creators
        if (creators && creators.length > 0) {
            results = [
                ...results,
                ...creators.map(c => ({
                    icon: Users,
                    label: c.title || c.name,
                    path: `/live?channel=${c.youtubeId || c.id}`,
                    category: "Creators",
                    sublabel: `${(c.subscribers || 0).toLocaleString()} Subs`
                }))
            ];
        }

        // Add Videos
        if (videos && videos.length > 0) {
            results = [
                ...results,
                ...videos.map(v => ({
                    icon: Video,
                    label: v.title,
                    path: `/dashboard/videos?id=${v.id}`,
                    category: "Videos",
                    sublabel: v.category
                }))
            ];
        }

        if (!search) return results.slice(0, 20); // Limit initial view

        return results.filter(c =>
            c.label.toLowerCase().includes(search.toLowerCase()) ||
            c.category.toLowerCase().includes(search.toLowerCase()) ||
            (c.sublabel && c.sublabel.toLowerCase().includes(search.toLowerCase()))
        ).slice(0, 30);
    }, [commands, search, creators, videos]);

    const handleOpen = useCallback(() => setIsOpen(true), []);
    const handleClose = useCallback(() => {
        setIsOpen(false);
        setSearch("");
        setActiveIndex(0);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === "Escape") handleClose();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleClose]);

    const runAction = useCallback(async (actionKey) => {
        const tok = getAccessToken();
        const post = async (path, body) => {
            const r = await fetch(`${AUTH_BASE}${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
                credentials: "include",
                body: body ? JSON.stringify(body) : undefined,
            });
            return r.json().catch(() => ({}));
        };
        try {
            switch (actionKey) {
                case "sync_yt": {
                    if (!window.confirm("Force-run YouTube sync now? Bypasses cooldown.")) return;
                    const j = await post(`/clients/sync?force=1`);
                    alert(j?.synced != null ? `Sync ✓ ${j.synced} creators` : `Result: ${JSON.stringify(j)}`);
                    break;
                }
                case "test_webhook": {
                    const j = await post(`/admin/agency/discord/test`, { channel: "default" });
                    alert(j?.result?.ok ? "Discord ping ✓" : `Result: ${JSON.stringify(j)}`);
                    break;
                }
                case "run_digest": {
                    if (!window.confirm("Force-run weekly digest now?")) return;
                    const j = await post(`/admin/agency/weekly-digest/run`, { force: true });
                    alert(j?.totals ? `Digest sent ✓ ${j.totals.posted_count} shipped, ₹${(j.totals.paid_total||0).toLocaleString("en-IN")} paid` : `Result: ${JSON.stringify(j)}`);
                    break;
                }
                case "run_editor_summary": {
                    if (!window.confirm("Force-run per-editor summary now?")) return;
                    const j = await post(`/admin/agency/editor-summary/run`, { force: true });
                    alert(j?.counts ? `Editor summary sent ✓ ${j.counts.salaried} salaried · ${j.counts.freelance} freelance` : `Result: ${JSON.stringify(j)}`);
                    break;
                }
                case "auto_promote": {
                    const j = await post(`/admin/agency/projects/auto-promote-website`, {});
                    alert(j?.promoted != null ? `Auto-promoted ${j.promoted} of ${j.candidates} candidates.` : `Result: ${JSON.stringify(j)}`);
                    break;
                }
            }
        } catch (e) { alert("Action error: " + e.message); }
    }, []);

    const onSelect = useCallback((item) => {
        if (item.action) {
            handleClose();
            runAction(item.action);
            return;
        }
        navigate(item.path);
        handleClose();
    }, [navigate, handleClose, runAction]);

    const handleNav = (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % filtered.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + filtered.length) % filtered.length);
        } else if (e.key === "Enter") {
            if (filtered[activeIndex]) onSelect(filtered[activeIndex]);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-[15vh] px-4 sm:px-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Palette Container */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: -20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: -20 }}
                        className="relative w-full max-w-xl bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        {/* Search Bar */}
                        <div className="flex items-center px-4 py-4 border-b border-white/5 bg-white/5">
                            <Search size={20} className="text-white/40 mr-3" />
                            <input
                                autoFocus
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setActiveIndex(0);
                                }}
                                onKeyDown={handleNav}
                                placeholder="Search pages, tools, or creators..."
                                className="w-full bg-transparent border-none outline-none text-white text-lg placeholder-white/20 font-sans"
                            />
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-md ml-4 shrink-0">
                                <span className="text-[10px] text-white/40 font-mono">ESC</span>
                            </div>
                        </div>

                        {/* Results List */}
                        <div className="max-h-[400px] overflow-y-auto py-2 custom-scrollbar">
                            {filtered.length > 0 ? (
                                <div className="space-y-1">
                                    {Object.entries(
                                        filtered.reduce((acc, curr) => {
                                            if (!acc[curr.category]) acc[curr.category] = [];
                                            acc[curr.category].push(curr);
                                            return acc;
                                        }, {})
                                    ).map(([category, items]) => (
                                        <div key={category}>
                                            <div className="px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                                                {category}
                                            </div>
                                            {items.map((item) => {
                                                const globalIdx = filtered.indexOf(item);
                                                const isActive = activeIndex === globalIdx;
                                                return (
                                                    <div
                                                        key={item.path}
                                                        onClick={() => onSelect(item)}
                                                        onMouseEnter={() => setActiveIndex(globalIdx)}
                                                        className={`px-3 mx-2 py-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${isActive ? "bg-orange-500/10 border-orange-500/20" : "hover:bg-white/5 border-transparent"
                                                            } border`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-2 rounded-lg ${isActive ? "bg-orange-500 text-white" : "bg-white/5 text-white/40"}`}>
                                                                <item.icon size={18} />
                                                            </div>
                                                            <div>
                                                                <div className={`text-sm font-bold ${isActive ? "text-white" : "text-white/70"}`}>
                                                                    {item.label}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-[10px] text-white/30 font-mono">
                                                                        {item.path}
                                                                    </div>
                                                                    {item.sublabel && (
                                                                        <div className="text-[10px] text-orange-500/50 font-black uppercase tracking-widest">
                                                                            • {item.sublabel}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {isActive && (
                                                            <motion.div
                                                                initial={{ x: -10, opacity: 0 }}
                                                                animate={{ x: 0, opacity: 1 }}
                                                                className="flex items-center gap-2 text-orange-500 text-[10px] font-black uppercase tracking-widest"
                                                            >
                                                                Jump To <ArrowRight size={14} />
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center">
                                    <div className="inline-flex p-4 rounded-full bg-white/5 text-white/20 mb-3">
                                        <Search size={32} />
                                    </div>
                                    <p className="text-white/40 font-mono text-xs">No entries found for "{search}"</p>
                                </div>
                            )}
                        </div>

                        {/* Footer / Shortcuts */}
                        <div className="px-4 py-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-[10px] text-white/20 font-mono uppercase tracking-widest">
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1.5 underline underline-offset-4 decoration-white/10">
                                    <ArrowRight size={10} className="rotate-90" /> Navigate
                                </span>
                                <span className="flex items-center gap-1.5 underline underline-offset-4 decoration-white/10">
                                    <MousePointer2 size={10} /> Select
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Command size={10} /> + K to toggle
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
