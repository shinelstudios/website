import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, Bell } from "lucide-react";

/**
 * Global Toaster Component
 * Listens for "notify" window events.
 * dispatch example: window.dispatchEvent(new CustomEvent("notify", { detail: { message: "Saved!", type: "success" } }))
 */
export default function Toaster() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handler = (e) => {
            const { message, type = "info", duration = 4000 } = e.detail || {};
            const id = Date.now() + Math.random();
            setToasts((prev) => [...prev, { id, message, type, duration }]);
        };

        window.addEventListener("notify", handler);
        return () => window.removeEventListener("notify", handler);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <div
            className="fixed inset-x-0 bottom-6 md:bottom-auto md:top-24 md:right-6 z-[9999] flex flex-col items-center md:items-end gap-3 pointer-events-none px-4"
        >
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function ToastItem({ toast, onRemove }) {
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, toast.duration);
        return () => clearTimeout(timer);
    }, [toast, onRemove, isPaused]);

    const variants = {
        initial: { opacity: 0, y: 20, scale: 0.9, filter: "blur(4px)" },
        animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 0.9, filter: "blur(4px)", transition: { duration: 0.2 } },
    };

    const getIcon = () => {
        switch (toast.type) {
            case "success": return <CheckCircle size={18} className="text-[var(--orange)]" />;
            case "error": return <AlertCircle size={18} className="text-[#C10801]" />;
            case "warning": return <AlertCircle size={18} className="text-[#F16001]" />;
            default: return <Bell size={18} className="text-[var(--brand-light-gray)]" />;
        }
    };

    const getGlow = () => {
        switch (toast.type) {
            case "success": return "rgba(232, 80, 2, 0.15)";
            case "error": return "rgba(193, 8, 1, 0.15)";
            case "warning": return "rgba(241, 96, 1, 0.15)";
            default: return "rgba(167, 167, 167, 0.15)";
        }
    };

    return (
        <motion.div
            layout
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 300 }}
            dragElastic={{ left: 0.05, right: 0.6 }}
            onDragEnd={(_, info) => {
                if (info.offset.x > 150) onRemove(toast.id);
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="pointer-events-auto relative overflow-hidden flex items-center gap-3 p-3.5 pr-10 rounded-2xl border w-full max-w-[360px]"
            style={{
                background: "rgba(10, 10, 10, 0.85)",
                backdropFilter: "blur(16px)",
                borderColor: "rgba(255,255,255,0.08)",
                boxShadow: `0 12px 40px -12px ${getGlow()}`,
            }}
        >
            <div className="shrink-0">{getIcon()}</div>
            <div className="flex-1 text-[13px] font-semibold text-white/90 leading-tight">
                {toast.message}
            </div>

            <button
                onClick={() => onRemove(toast.id)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/5 text-white/30 hover:text-white/70 transition-all"
            >
                <X size={14} />
            </button>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5">
                <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: isPaused ? undefined : "0%" }}
                    transition={{ duration: toast.duration / 1000, ease: "linear" }}
                    className="h-full"
                    style={{
                        background: toast.type === "success" ? "var(--orange)" :
                            toast.type === "error" ? "#C10801" :
                                toast.type === "warning" ? "#F16001" : "var(--brand-light-gray)"
                    }}
                />
            </div>
        </motion.div>
    );
}
