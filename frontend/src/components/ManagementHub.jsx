// src/components/ManagementHub.jsx
import React, { useState, useMemo, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    Youtube,
    Video,
    ImageIcon,
    LayoutDashboard,
    ChevronRight,
    Menu,
    X,
    ShieldCheck,
    Zap,
    ArrowLeft,
    Lightbulb,
    Brain,
    Search,
    Languages,
    Settings as SettingsIcon
} from "lucide-react";

/* ---------------- helpers: safe base64url + jwt ---------------- */
function base64UrlDecode(str) {
    try {
        if (!str) return "";
        const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
        return decodeURIComponent(escape(atob(b64)));
    } catch { return ""; }
}
function parseJwt(token) {
    try {
        const parts = String(token || "").split(".");
        if (parts.length < 2) return null;
        return JSON.parse(base64UrlDecode(parts[1]));
    } catch { return null; }
}

export default function ManagementHub() {
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Auth & Role
    const token = localStorage.getItem("token") || "";
    const payload = useMemo(() => parseJwt(token), [token]);
    const role = (payload?.role || localStorage.getItem("role") || "client").toLowerCase();
    const firstName = payload?.firstName || localStorage.getItem("firstName") || "Team";

    const tabs = [
        {
            id: 'stats',
            label: 'Dashboard',
            path: '/dashboard',
            icon: LayoutDashboard,
            roles: ['admin', 'editor', 'artist']
        },
        {
            id: 'users',
            label: 'User Registry',
            path: '/dashboard/users',
            icon: Users,
            roles: ['admin']
        },
        {
            id: 'clients',
            label: 'Pulse Registry',
            path: '/dashboard/clients',
            icon: Youtube,
            roles: ['admin']
        },
        {
            id: 'videos',
            label: 'Video Manager',
            path: '/dashboard/videos',
            icon: Video,
            roles: ['admin', 'editor']
        },
        {
            id: 'thumbnails',
            label: 'Thumbnail Manager',
            path: '/dashboard/thumbnails',
            icon: ImageIcon,
            roles: ['admin', 'artist']
        },
        {
            id: 'settings',
            label: 'Global Settings',
            path: '/dashboard/settings',
            icon: SettingsIcon,
            roles: ['admin']
        },
    ];

    /* ---------------- tools matrix (role-gated) ---------------- */
    const toolsCatalog = [
        {
            name: "Local SRT Builder",
            path: "/tools/srt",
            icon: Languages,
            roles: ["admin", "editor"],
            description: "Paste transcript lines -> export .srt",
        },
        {
            name: "YouTube Captions Fetcher",
            path: "/tools/youtube-captions",
            icon: Video,
            roles: ["admin", "editor", "client"],
            description: "Fetch manual + auto captions",
        },
        {
            name: "SEO Tool",
            path: "/tools/seo",
            icon: Search,
            roles: ["admin", "editor", "client"],
            description: "Optimize content for maximum discoverability",
        },
        {
            name: "Viral Thumbnail Ideation",
            path: "/tools/thumbnail-ideation",
            icon: Lightbulb,
            roles: ["admin", "editor", "client"],
            description: "AI-powered thumbnail concepts",
        },
        {
            name: "Custom AIs",
            path: "/tools/custom-ais",
            icon: Brain,
            roles: ["admin"],
            description: "Configure specialized AI workflows",
        },
    ];

    const activeTabs = tabs.filter(t => t.roles.includes(role));
    const currentTab = activeTabs.find(t => t.path === location.pathname) || activeTabs[0];

    // Redirect if unauthorized for current path
    useEffect(() => {
        const matchingTab = tabs.find(t => t.path === location.pathname);
        if (matchingTab && !matchingTab.roles.includes(role)) {
            navigate('/dashboard');
        }
    }, [location.pathname, role, navigate, tabs]);

    return (
        <div className="min-h-screen bg-black text-white flex pt-20">
            {/* --- MOBILE TOGGLE --- */}
            <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 z-[100] p-4 rounded-full bg-orange-600 text-white shadow-2xl shadow-orange-900/40"
            >
                <Menu size={24} />
            </button>

            {/* --- SIDEBAR --- */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-[#0a0a0a] border-r border-white/5 transition-transform duration-300 lg:sticky lg:top-20 lg:h-[calc(100vh-80px)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}>
                <div className="flex flex-col h-full p-6">
                    {/* Sidebar Header */}
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <ShieldCheck size={20} className="text-orange-500" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-widest text-orange-500">Workspace</h2>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Shinel Studios</p>
                            </div>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-gray-500">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Nav Items */}
                    <nav className="flex-grow space-y-1.5">
                        {activeTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = location.pathname === tab.path;
                            return (
                                <Link
                                    key={tab.id}
                                    to={tab.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group
                                        ${isActive
                                            ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 font-black"
                                            : "text-gray-400 hover:bg-white/[0.03] hover:text-white"
                                        }
                                    `}
                                >
                                    <Icon size={18} className={isActive ? "text-white" : "text-gray-600 group-hover:text-orange-500"} />
                                    <span className="text-sm tracking-wide">{tab.label}</span>
                                    {isActive && <motion.div layoutId="pill" className="ml-auto w-1 h-4 bg-white rounded-full" />}
                                </Link>
                            );
                        })}

                        {/* Quick Actions (Tools) */}
                        <div className="mt-8 mb-2 px-4 text-[10px] font-black uppercase tracking-widest text-gray-600">
                            Quick Actions
                        </div>
                        {toolsCatalog.filter(t => t.roles.includes(role)).map((tool) => {
                            const Icon = tool.icon;
                            const isActive = location.pathname === tool.path;
                            return (
                                <Link
                                    key={tool.name}
                                    to={tool.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                                        ${isActive
                                            ? "bg-white/10 text-white font-bold"
                                            : "text-gray-500 hover:text-white hover:bg-white/5"
                                        }
                                    `}
                                >
                                    <Icon size={16} className={isActive ? "text-orange-500" : "text-gray-600 group-hover:text-orange-500 transition-colors"} />
                                    <div className="min-w-0">
                                        <div className="text-xs truncate">{tool.name}</div>
                                    </div>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="mt-auto pt-6 border-t border-white/5">
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-black text-xs">
                                {firstName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold truncate">{firstName}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">{role}</p>
                            </div>
                        </div>
                        <Link to="/work" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-orange-500 transition-colors px-2">
                            <ArrowLeft size={12} /> Exit to Site
                        </Link>
                    </div>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-grow">
                <div className="container mx-auto px-6 py-8">
                    {/* Breadcrumb Context */}
                    <div className="flex items-center gap-2 mb-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
                        <span>Management</span>
                        <ChevronRight size={10} />
                        <span className="text-orange-500">{currentTab?.label || "Workspace"}</span>
                    </div>

                    <Outlet />
                </div>
            </main>

            {/* Overlay for mobile sidebar */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
