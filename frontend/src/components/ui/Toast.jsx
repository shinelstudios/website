/**
 * Toast — minimal global toast system, replaces alert() / confirm() everywhere.
 *
 * Usage:
 *   import { toast } from "./ui/Toast";
 *   toast.success("Saved ✓");
 *   toast.error("Server error");
 *   toast.info("Working…");
 *   toast.warn("Stale data");
 *   const ok = await toast.confirm("Delete this todo?");
 *
 * No provider needed — the singleton ToastHost mounts once at the App root.
 */
import React, { useEffect, useState } from "react";

const listeners = new Set();
let _id = 0;
const KIND_ICONS = {
  success: "✓",
  error: "✕",
  info: "·",
  warn: "⚠",
};
const KIND_COLORS = {
  success: "bg-emerald-500 border-emerald-600 text-white",
  error:   "bg-red-500 border-red-600 text-white",
  info:    "bg-neutral-800 border-neutral-700 text-white",
  warn:    "bg-yellow-500 border-yellow-600 text-black",
};

function push(kind, message, opts = {}) {
  const id = ++_id;
  const t = { id, kind, message, ts: Date.now(), duration: opts.duration ?? (kind === "error" ? 7000 : 4000) };
  for (const fn of listeners) fn({ type: "add", toast: t });
  return id;
}
function dismiss(id) {
  for (const fn of listeners) fn({ type: "dismiss", id });
}

export const toast = {
  success: (msg, opts) => push("success", msg, opts),
  error:   (msg, opts) => push("error", msg, opts),
  info:    (msg, opts) => push("info", msg, opts),
  warn:    (msg, opts) => push("warn", msg, opts),
  // Promise-based confirm replacement — returns true / false
  confirm: (message, opts = {}) => new Promise((resolve) => {
    const id = ++_id;
    const t = {
      id, kind: "confirm", message,
      okLabel: opts.okLabel || "Confirm",
      cancelLabel: opts.cancelLabel || "Cancel",
      destructive: !!opts.destructive,
      resolve,
    };
    for (const fn of listeners) fn({ type: "add", toast: t });
  }),
  dismiss,
};

export function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (evt) => {
      if (evt.type === "add") setToasts((t) => [...t, evt.toast]);
      if (evt.type === "dismiss") setToasts((t) => t.filter((x) => x.id !== evt.id));
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  useEffect(() => {
    // Auto-dismiss non-confirm toasts
    const timers = toasts
      .filter((t) => t.kind !== "confirm")
      .map((t) => setTimeout(() => {
        setToasts((cur) => cur.filter((x) => x.id !== t.id));
      }, t.duration));
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  // Escape key dismisses confirms as cancel
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        const c = toasts.find((t) => t.kind === "confirm");
        if (c) {
          c.resolve(false);
          setToasts((cur) => cur.filter((x) => x.id !== c.id));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toasts]);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" || t.kind === "confirm" ? "alert" : "status"}
          className={`pointer-events-auto rounded-lg border shadow-2xl px-4 py-3 text-sm flex items-start gap-3 animate-in slide-in-from-right-4 fade-in duration-200 ${KIND_COLORS[t.kind] || KIND_COLORS.info}`}
        >
          {t.kind !== "confirm" && (
            <span className="text-base leading-none font-bold flex-shrink-0">{KIND_ICONS[t.kind] || "·"}</span>
          )}
          <div className="flex-1 min-w-0">
            <div className="whitespace-pre-wrap break-words">{t.message}</div>
            {t.kind === "confirm" && (
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  onClick={() => { t.resolve(false); setToasts((cur) => cur.filter((x) => x.id !== t.id)); }}
                  className="px-3 py-1 rounded bg-neutral-700 text-white text-xs font-bold hover:bg-neutral-600"
                >
                  {t.cancelLabel}
                </button>
                <button
                  onClick={() => { t.resolve(true); setToasts((cur) => cur.filter((x) => x.id !== t.id)); }}
                  className={`px-3 py-1 rounded text-xs font-bold ${t.destructive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-[var(--orange)] hover:opacity-90 text-white"}`}
                  autoFocus
                >
                  {t.okLabel}
                </button>
              </div>
            )}
          </div>
          {t.kind !== "confirm" && (
            <button
              onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}
              className="opacity-60 hover:opacity-100 ml-2"
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default ToastHost;
