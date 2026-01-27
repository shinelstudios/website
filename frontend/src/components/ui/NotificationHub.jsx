import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Trash2, CheckCircle, AlertCircle, Info, Clock } from "lucide-react";

const MAX_HISTORY = 50;
const LS_KEY = "shinel_notifications_history";

export default function NotificationHub({ isOpen, onClose }) {
    const [history, setHistory] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setHistory(parsed);
                setUnreadCount(parsed.filter(n => !n.read).length);
            } catch (e) {
                console.error("Failed to parse notifications history", e);
            }
        }
    }, []);

    // Listen for new notifications
    useEffect(() => {
        const handler = (e) => {
            const { message, type = "info" } = e.detail || {};
            const newNotif = {
                id: Date.now() + Math.random(),
                message,
                type,
                timestamp: Date.now(),
                read: false
            };

            setHistory(prev => {
                const updated = [newNotif, ...prev].slice(0, MAX_HISTORY);
                localStorage.setItem(LS_KEY, JSON.stringify(updated));
                return updated;
            });

            if (!isOpen) {
                setUnreadCount(prev => prev + 1);
            }
            // Signal a refresh to other components (like SiteHeader)
            window.dispatchEvent(new Event("notif-refresh"));
        };

        window.addEventListener("notify", handler);
        return () => window.removeEventListener("notify", handler);
    }, [isOpen]);

    // Mark as read when opened
    useEffect(() => {
        if (isOpen && unreadCount > 0) {
            setHistory(prev => {
                const updated = prev.map(n => ({ ...n, read: true }));
                localStorage.setItem(LS_KEY, JSON.stringify(updated));
                return updated;
            });
            setUnreadCount(0);
            window.dispatchEvent(new Event("notif-refresh"));
        }
    }, [isOpen, unreadCount]);

    const clearAll = () => {
        if (!confirm("Clear all notification history?")) return;
        setHistory([]);
        localStorage.removeItem(LS_KEY);
        window.dispatchEvent(new Event("notif-refresh"));
    };

    const timeAgo = (ts) => {
        const seconds = Math.floor((Date.now() - ts) / 1000);
        if (seconds < 60) return "Just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return new Date(ts).toLocaleDateString();
    };

    const getIcon = (type) => {
        switch (type) {
            case "success": return <CheckCircle size={16} className="text-[var(--orange)]" />;
            case "error": return <AlertCircle size={16} className="text-[#C10801]" />;
            case "warning": return <AlertCircle size={16} className="text-[#F16001]" />;
            default: return <Bell size={16} className="text-[var(--brand-light-gray)]" />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-[#0a0a0a] border-l border-white/5 z-[9999] flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-white/5 text-white/70">
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Notifications</h2>
                                    <p className="text-xs text-white/40">Your recent activity history</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {history.length > 0 && (
                                    <button
                                        onClick={clearAll}
                                        className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-[#C10801] transition-all"
                                        title="Clear all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {history.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none">
                                    <Bell size={48} className="mb-4" />
                                    <p className="text-sm font-medium">No notifications yet</p>
                                </div>
                            ) : (
                                history.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`group p-4 rounded-2xl border transition-all hover:bg-white/[0.02] ${n.read ? "border-white/5" : "border-[var(--orange)]/20 bg-[var(--orange)]/[0.02]"
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white/90 leading-tight mb-2">
                                                    {n.message}
                                                </p>
                                                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-white/30 group-hover:text-white/50 transition-colors">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {timeAgo(n.timestamp)}
                                                    </span>
                                                    {!n.read && (
                                                        <span className="text-[var(--orange)] flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--orange)] animate-pulse" />
                                                            New
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
