import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/** Tiny email validator */
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim());

/**
 * ExitIntentModal
 * Props:
 *  - pdfUrl: string (required)  -> e.g. "/lead/thumbnail-checklist.pdf"
 *  - onSubmit?: (email) => Promise<void> | void   (optional custom handler)
 *  - cooldownDays?: number (default 7)
 *  - armAfterMs?: number (default 15000)  // wait before arming exit listener
 */
export default function ExitIntentModal({
  pdfUrl,
  onSubmit,
  cooldownDays = 7,
  armAfterMs = 15000,
}) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false); // success state
  const emailRef = useRef(null);

  // LS keys
  const LS_KEY_LAST = "ei:lastSeen";
  const LS_KEY_OPT  = "ei:optedOut"; // set when user dismisses or after success

  const desktop = useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024; // desktop-only
  }, []);

  // Respect cooldown + wait before arming
  useEffect(() => {
    if (!desktop) return;

    const now = Date.now();
    try {
      const last = Number(localStorage.getItem(LS_KEY_LAST) || 0);
      const optedOut = localStorage.getItem(LS_KEY_OPT) === "1";
      const cool = cooldownDays * 24 * 60 * 60 * 1000;
      if (optedOut || (last && now - last < cool)) return; // suppress
    } catch {}

    const t = setTimeout(() => setArmed(true), armAfterMs);
    return () => clearTimeout(t);
  }, [desktop, cooldownDays, armAfterMs]);

  // Don’t open while other overlays are active (Calendly or lead form)
  useEffect(() => {
    if (!armed) return;

    let blocked = false;
    const setBlocked = (v) => (blocked = v);
    const calOpen = () => setBlocked(true);
    const calClose = () => setBlocked(false);
    const leadVis = (e) => setBlocked(Boolean(e?.detail?.visible));

    window.addEventListener("calendly:open", calOpen);
    window.addEventListener("calendly:close", calClose);
    document.addEventListener("leadform:visible", leadVis);

    const onOut = (e) => {
      if (blocked || open) return;
      // Robust "leaving to tab bar" detection
      const toTopEdge = (e.clientY <= 0) || (e.relatedTarget === null && e.clientY < 10);
      if (toTopEdge) openModal();
    };
    document.addEventListener("mouseout", onOut);

    return () => {
      window.removeEventListener("calendly:open", calOpen);
      window.removeEventListener("calendly:close", calClose);
      document.removeEventListener("leadform:visible", leadVis);
      document.removeEventListener("mouseout", onOut);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, open]);

  // Close on Esc (also opts out)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const openModal = () => {
    setOpen(true);
    try { localStorage.setItem(LS_KEY_LAST, String(Date.now())); } catch {}
    setTimeout(() => emailRef.current?.focus(), 50);
  };

  // >>> opt-out on ANY close by default <<<
  const close = (optOut = true) => {
    setOpen(false);
    try {
      if (optOut) localStorage.setItem(LS_KEY_OPT, "1");
    } catch {}
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    setError("");
    const val = String(email || "").trim();
    if (!isEmail(val)) {
      setError("Please enter a valid email.");
      return;
    }

    setBusy(true);
    try {
      if (onSubmit) {
        await onSubmit(val);
      } else {
        // Default: POST to optional endpoint, else mailto
        const endpoint = import.meta?.env?.VITE_LEAD_ENDPOINT;
        if (endpoint) {
          await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: val, source: "exit-intent", asset: "thumbnail-checklist" }),
          });
        } else {
          const to = "hello@shinelstudiosofficial.com";
          const subject = "Send me the Thumbnail Checklist (PDF)";
          const body = `Email: ${val}\nSource: Exit-intent modal\nPlease send the PDF.`;
          window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
        }
      }
      setDone(true);
      try { localStorage.setItem(LS_KEY_OPT, "1"); } catch {}
    } catch {
      setError("Could not submit right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!desktop) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Get the thumbnail checklist"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(e) => { if (e.currentTarget === e.target) close(); }}
        >
          <motion.div
            className="w-full max-w-xl rounded-2xl overflow-hidden border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            initial={{ y: 18, opacity: 0, scale: .98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: .98 }}
            transition={{ duration: .2 }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <b style={{ color: "var(--text)" }}>Grab the thumbnail checklist (PDF)</b>
              <button
                onClick={() => close()}  // X closes & opts out
                className="p-1 rounded hover:bg-black/5"
                aria-label="Close"
                style={{ color: "var(--text)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 md:p-5">
              {!done ? (
                <>
                  <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                    12-point thumbnail QA to lift clarity & curiosity. We’ll send the PDF to your inbox.
                  </p>

                  <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
                    <input
                      ref={emailRef}
                      type="email"
                      required
                      inputMode="email"
                      placeholder="you@channel.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 h-[46px] rounded-xl px-3 outline-none"
                      style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                    <motion.button
                      type="submit"
                      disabled={busy}
                      className="h-[46px] px-5 rounded-xl font-semibold text-white disabled:opacity-70"
                      style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {busy ? "Sending…" : "Email me the PDF"}
                    </motion.button>
                  </form>

                  {error ? (
                    <div className="mt-2 text-sm" style={{ color: "#ef4444" }}>{error}</div>
                  ) : null}

                  <div className="mt-3 text-xs flex items-center justify-between" style={{ color: "var(--text-muted)" }}>
                    <span>No spam. 1-click unsubscribe.</span>
                    <button
                      type="button"
                      onClick={() => close(true)}  // “No thanks” opts out
                      className="underline opacity-80 hover:opacity-100"
                      style={{ color: "var(--text-muted)" }}
                    >
                      No thanks
                    </button>
                  </div>
                </>
              ) : (
                <SuccessState pdfUrl={pdfUrl} onClose={() => close(true)} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SuccessState({ pdfUrl, onClose }) {
  return (
    <div>
      <div className="text-base font-semibold" style={{ color: "var(--text)" }}>
        Check your inbox — and grab it here too:
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl py-3 text-center font-semibold text-white"
          style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
        >
          Download the PDF
        </a>
        <button
          className="rounded-xl py-3 font-semibold"
          onClick={onClose}          // Close & opt out
          style={{ color: "var(--text)", border: "1px solid var(--border)", background: "var(--surface-alt)" }}
        >
          Close
        </button>
      </div>
      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        Tip: Save it to your drive. We’ll also send occasional thumbnail tips (you can unsubscribe anytime).
      </p>
    </div>
  );
}
