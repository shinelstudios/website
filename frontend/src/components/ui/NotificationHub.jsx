/**
 * NotificationHub — right-side drawer that shows the activity log of
 * persisted user actions (logout, profile save, user create, etc.).
 *
 * Listens to the dedicated `"activity"` window event. Transient UI toasts
 * (`"notify"`) are owned by Toaster and intentionally NOT persisted here —
 * they would otherwise spam the log with "Uploading…" / "Saved" duplicates.
 *
 * Behaviours:
 *   - Body-scroll locked while open (no double-scrollbar).
 *   - Esc key closes; close button auto-focuses on open.
 *   - Adjacent identical entries within 10s are deduped at write time.
 *   - History capped at 50 entries; oldest dropped first.
 *   - Backwards-compat: if any old localStorage entries exist they still
 *     render — we just stop appending from the noisy "notify" channel.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Trash2, CheckCircle, AlertCircle, Clock } from "lucide-react";

const MAX_HISTORY = 50;
const DEDUP_WINDOW_MS = 10_000;
const LS_KEY = "shinel_notifications_history";

function loadHistory() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries));
  } catch { /* quota — ignore */ }
}

export default function NotificationHub({ isOpen, onClose }) {
  const [history, setHistory] = useState(loadHistory);
  const [unreadCount, setUnreadCount] = useState(() => loadHistory().filter((n) => !n.read).length);
  const closeBtnRef = useRef(null);

  // Listen for new activity entries. Drops a write if the previous entry
  // has the same type+message inside the dedup window.
  useEffect(() => {
    const handler = (e) => {
      const { message, type = "info" } = e.detail || {};
      if (!message) return;
      const now = Date.now();
      const newNotif = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        message: String(message),
        type,
        timestamp: now,
        read: false,
      };

      setHistory((prev) => {
        const last = prev[0];
        if (
          last &&
          last.type === newNotif.type &&
          last.message === newNotif.message &&
          now - last.timestamp < DEDUP_WINDOW_MS
        ) {
          // Adjacent duplicate inside the window — skip.
          return prev;
        }
        const updated = [newNotif, ...prev].slice(0, MAX_HISTORY);
        saveHistory(updated);
        return updated;
      });

      if (!isOpen) setUnreadCount((n) => n + 1);
      window.dispatchEvent(new Event("notif-refresh"));
    };

    window.addEventListener("activity", handler);
    return () => window.removeEventListener("activity", handler);
  }, [isOpen]);

  // Mark all as read when drawer opens.
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      setHistory((prev) => {
        const updated = prev.map((n) => ({ ...n, read: true }));
        saveHistory(updated);
        return updated;
      });
      setUnreadCount(0);
      window.dispatchEvent(new Event("notif-refresh"));
    }
  }, [isOpen, unreadCount]);

  // Body-scroll lock + ESC + focus management while open. Mirrors the
  // pattern WorkCaseDrawer uses so behaviour is consistent across drawers.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => closeBtnRef.current?.focus(), 40);
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      clearTimeout(focusTimer);
    };
  }, [isOpen, onClose]);

  const clearAll = useCallback(() => {
    if (!confirm("Clear all activity history?")) return;
    setHistory([]);
    saveHistory([]);
    window.dispatchEvent(new Event("notif-refresh"));
  }, []);

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
      case "error":   return <AlertCircle size={16} className="text-[#C10801]" />;
      case "warning": return <AlertCircle size={16} className="text-[#F16001]" />;
      default:        return <Bell size={16} className="text-[var(--brand-light-gray)]" />;
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
            aria-hidden="true"
          />

          {/* Sidebar */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-hub-title"
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
                  <h2 id="notif-hub-title" className="text-lg font-bold text-white">Activity log</h2>
                  <p className="text-xs text-white/40">Recent admin actions in this browser</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-[#C10801] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                    title="Clear all"
                    aria-label="Clear all activity history"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  ref={closeBtnRef}
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                  aria-label="Close activity log"
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
                  <p className="text-sm font-medium">No activity yet</p>
                </div>
              ) : (
                history.map((n) => (
                  <div
                    key={n.id}
                    className={`group p-4 rounded-2xl border transition-colors hover:bg-white/[0.02] ${
                      n.read ? "border-white/5" : "border-[var(--orange)]/20 bg-[var(--orange)]/[0.02]"
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
