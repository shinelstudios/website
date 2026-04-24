/**
 * notify.js — two channels for user-facing feedback.
 *
 * Until now everything fired the `"notify"` window event, which both
 * Toaster (transient 4s toasts) AND NotificationHub (persistent activity
 * log) listened to. The activity log filled with "Uploading…" /
 * "Saving…" noise within minutes.
 *
 * Now:
 *   - `toast(type, message)` — transient only. Toaster shows + auto-dismisses.
 *     Use for ephemeral feedback the user doesn't need to see again.
 *   - `toastAndLog(type, message)` — both. Use for events worth keeping
 *     in the activity log (logout, profile save, user creation, etc).
 *
 * Direct `window.dispatchEvent(new CustomEvent("notify", ...))` calls
 * still work — but consider migrating to these helpers so intent is clear.
 */

export function toast(type, message) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("notify", {
        detail: { type: type || "info", message: String(message || "") },
      })
    );
  } catch { /* SSR / non-DOM env */ }
}

export function toastAndLog(type, message) {
  if (typeof window === "undefined") return;
  try {
    const detail = { type: type || "info", message: String(message || "") };
    window.dispatchEvent(new CustomEvent("notify", { detail }));
    window.dispatchEvent(new CustomEvent("activity", { detail }));
  } catch { /* SSR / non-DOM env */ }
}
