import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const navigate = useNavigate();

    const role = localStorage.getItem("role") || "";
    const isAdmin = role.includes("admin");

    const commands = useMemo(() => {
        const base = [
            { icon: Home, label: "Home", path: "/", category: "Pages" },
            { icon: Activity, label: "Pulse", path: "/live", category: "Pages" },
            { icon: Briefcase, label: "Work Portfolio", path: "/work", category: "Pages" },
            { icon: Cpu, label: "AI Studio", path: "/studio", category: "Tools" },
            { icon: ImageIcon, label: "Thumbnail Previewer", path: "/tools/thumbnail-previewer", category: "Tools" },
            { icon: Video, label: "SRT/Caption Tool", path: "/tools/srt", category: "Tools" },
        ];

        if (isAdmin) {
            base.push(
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
        if (!search) return commands;
        return commands.filter(c =>
            c.label.toLowerCase().includes(search.toLowerCase()) ||
            c.category.toLowerCase().includes(search.toLowerCase())
        );
    }, [commands, search]);

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

    const onSelect = useCallback((item) => {
        navigate(item.path);
        handleClose();
    }, [navigate, handleClose]);

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
                                                                <div className="text-[10px] text-white/30 font-mono">
                                                                    {item.path}
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
