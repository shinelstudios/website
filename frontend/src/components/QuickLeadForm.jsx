// src/components/QuickLeadForm.jsx
import React from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Detect compact (mobile-ish) screens safely (SSR-friendly) */
function useCompact() {
  const [compact, setCompact] = React.useState(false);
  React.useEffect(() => {
    const mm = [
      window.matchMedia?.("(max-width: 640px)"),
      window.matchMedia?.("(pointer: coarse)"),
    ].filter(Boolean);

    const compute = () =>
      mm.some((m) => (m?.matches ? true : false));

    setCompact(compute());
    mm.forEach((m) => m?.addEventListener?.("change", () => setCompact(compute())));
    return () => mm.forEach((m) => m?.removeEventListener?.("change", () => setCompact(compute())));
  }, []);
  return compact;
}

const QuickLeadForm = () => {
  const isCompact = useCompact();

  const [name, setName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [website, setWebsite] = React.useState(""); // honeypot
  const [selected, setSelected] = React.useState([]);
  const [contactMethod, setContactMethod] = React.useState("email");
  const formRef = React.useRef(null);
  const startedAt = React.useRef(Date.now());

  const interests = React.useMemo(
    () => ["Video Editing", "Thumbnails", "Shorts", "GFX", "Strategy"],
    []
  );

  const inputStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || "").trim());
  const clean = (v) => (v || "").replace(/\s+/g, " ").trim();
  const valid = clean(name).length >= 2 && isEmail(email);

  const showToast = (type, text) => {
    setToast({ type, text });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2600);
  };

  const toggleChip = (label) =>
    setSelected((prev) => {
      const on = prev.includes(label);
      try {
        window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "lead_interest_toggle", label, on: !on } }));
      } catch { }
      return on ? prev.filter((x) => x !== label) : [...prev, label];
    });

  // UTM capture
  const getUTM = () => {
    try { return JSON.parse(localStorage.getItem("utm") || "{}"); } catch { return {}; }
  };

  const draftLines = () => {
    const utm = getUTM();
    const lines = [
      `Name: ${clean(name)}`,
      `Handle/URL: ${clean(handle)}`,
      `Email: ${clean(email)}`,
      selected.length ? `Interests: ${selected.join(", ")}` : null,
      msg ? `Note: ${clean(msg)}` : null,
      Object.keys(utm).length ? `UTM: ${Object.entries(utm).map(([k, v]) => `${k}=${v}`).join("&")}` : null,
      "",
      "Hi Shinel Studios, I'd like a quick quote and a content audit.",
    ].filter(Boolean);
    return lines;
  };

  const makeMailto = () => {
    const to = "hello@shinelstudios.in";
    const subject = `Quick Quote Request — ${clean(name) || "Creator"}`;
    const body = draftLines().join("\n");
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const whatsappURL = () => {
    const base = "https://wa.me/918968141585";
    const lines = draftLines();
    const text = `Hi Shinel Studios!\n${lines.join("\n")}`;
    return `${base}?text=${encodeURIComponent(text)}`;
  };

  // Restore autosave
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("ss_lead");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s?.name) setName(s.name);
      if (s?.handle) setHandle(s.handle);
      if (s?.email) setEmail(s.email);
      if (Array.isArray(s?.selected)) setSelected(s.selected);
      if (typeof s?.msg === "string") setMsg(s.msg);
      if (s?.contactMethod) setContactMethod(s.contactMethod);
    } catch { }
  }, []);

  // Autosave
  React.useEffect(() => {
    const payload = { name, handle, email, selected, msg, contactMethod };
    try { localStorage.setItem("ss_lead", JSON.stringify(payload)); } catch { }
  }, [name, handle, email, selected, msg, contactMethod]);

  // Listen for festival offer claims
  React.useEffect(() => {
    const onPrefill = (e) => {
      const { code } = e.detail || {};
      if (code) {
        setMsg(prev => {
          const offerLine = `Offer Claimed: ${code}`;
          if (prev.includes(offerLine)) return prev;
          return `${offerLine}\n${prev}`.trim();
        });
        showToast("success", `Offer ${code} applied!`);
      }
    };
    window.addEventListener("ss:prefillOffer", onPrefill);
    return () => window.removeEventListener("ss:prefillOffer", onPrefill);
  }, []);

  // Hide sticky mobile CTA while typing
  React.useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    const onFocusIn = () => window.dispatchEvent(new Event("ss:hideMobileCTA"));
    const onFocusOut = () => window.dispatchEvent(new Event("ss:showMobileCTA"));
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);
    return () => {
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    const elapsed = Date.now() - startedAt.current;
    if (website || elapsed < 1500) {
      return showToast("error", "Something went wrong. Please try again.");
    }

    if (!valid) {
      if (!name.trim()) return showToast("error", "Please enter your name.");
      if (!isEmail(email)) return showToast("error", "Please enter a valid email.");
    }

    setSending(true);
    try {
      if (contactMethod === "whatsapp") {
        const href = whatsappURL();
        setTimeout(() => {
          window.open(href, "_blank", "noreferrer");
          setSending(false);
          showToast("success", "Opening WhatsApp…");
          try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "lead_submit", method: "whatsapp" } })); } catch { }
        }, 120);
      } else {
        const href = makeMailto();
        const openedViaMailto = () => {
          setTimeout(async () => {
            if (!document.hasFocus() && navigator.clipboard) return;
            try {
              await navigator.clipboard.writeText(draftLines().join("\n"));
              showToast("success", "Copied message to clipboard — paste in your email app.");
            } catch { }
          }, 900);
        };
        setTimeout(() => {
          window.location.href = href;
          openedViaMailto();
          setSending(false);
          showToast("success", "Opening your email app…");
          try { window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "lead_submit", method: "email" } })); } catch { }
        }, 120);
      }
    } catch {
      setSending(false);
      showToast("error", "Could not open your app. Try the other button below.");
    }
  };

  /** ---------- Layout variants ---------- **/
  const containerClasses = isCompact
    ? "container mx-auto px-4 max-w-[94vw]"
    : "container mx-auto px-4 sm:px-6 lg:px-8 max-w-[90vw] md:max-w-2xl lg:max-w-3xl";

  const gridClasses = isCompact
    ? "grid grid-cols-1 gap-3"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";

  const inputClasses = isCompact
    ? "w-full h-12 rounded-2xl px-4 outline-none text-base"
    : "w-full h-12 rounded-2xl px-4 outline-none text-sm sm:text-base";

  const ctaWrapClasses = isCompact
    ? "flex flex-col gap-2 pt-1"
    : "flex flex-col sm:flex-row gap-3 pt-1";

  const headingSize = isCompact ? "text-2xl" : "text-3xl md:text-4xl";
  const subHeadingSize = isCompact ? "text-sm" : "text-base md:text-lg";

  return (
    <section
      id="leadform-section"
      className={isCompact ? "py-8" : "py-14"}
      style={{ background: "var(--surface-alt)" }}
      aria-labelledby="leadform-heading"
    >
      <div className={`${containerClasses} relative`} ref={formRef}>
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute left-1/2 -top-4 -translate-x-1/2 z-10 px-4 py-2 rounded-lg text-sm text-white"
              style={{
                background:
                  toast.type === "success"
                    ? "linear-gradient(90deg,#16a34a,#22c55e)"
                    : "linear-gradient(90deg,#e11d48,#f97316)",
                boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
              }}
              role="status"
              aria-live="polite"
            >
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Heading */}
        <div className={isCompact ? "text-center mb-6" : "text-center mb-8"}>
          <h3
            id="leadform-heading"
            className={`${headingSize} font-bold font-['Poppins']`}
            style={{ color: "var(--text)" }}
          >
            Get a Quick Quote
          </h3>
          <p className={`mt-2 ${subHeadingSize}`} style={{ color: "var(--text-muted)" }}>
            Tell us where you post — we'll reply within 24 hours.
          </p>
          <div
            className={`mt-3 flex items-center justify-center gap-2 ${isCompact ? "text-[11px]" : "text-xs"} flex-wrap`}
            style={{ color: "var(--text-muted)" }}
          >
            <span className="px-2 py-1 rounded-full border" style={{ borderColor: "var(--border)" }}>
              No spam
            </span>
            <span className="px-2 py-1 rounded-full border" style={{ borderColor: "var(--border)" }}>
              Consent-first AI
            </span>
            <span className="px-2 py-1 rounded-full border" style={{ borderColor: "var(--border)" }}>
              Reply in 24h
            </span>
          </div>
        </div>

        {/* Honeypot */}
        <label className="sr-only" htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
          aria-hidden="true"
        />

        {/* Form */}
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {/* Top row */}
          <div className={gridClasses}>
            <div>
              <label htmlFor="lead-name" className="block text-sm mb-1" style={{ color: "var(--text)" }}>
                Your Name *
              </label>
              <input
                id="lead-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClasses}
                style={inputStyle}
                placeholder="Alex from Daily Vlogs"
                autoComplete="name"
                aria-invalid={clean(name).length < 2}
              />
            </div>

            <div>
              <label htmlFor="lead-handle" className="block text-sm mb-1" style={{ color: "var(--text)" }}>
                @handle or channel URL
              </label>
              <input
                id="lead-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className={inputClasses}
                style={inputStyle}
                placeholder="@gaminglegend or youtube.com/yourchannel"
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="lead-email" className="block text-sm mb-1" style={{ color: "var(--text)" }}>
                Email *
              </label>
              <input
                id="lead-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
                style={inputStyle}
                placeholder="creator@email.com"
                autoComplete="email"
                aria-invalid={!isEmail(email)}
                aria-describedby="email-hint"
              />
              <div id="email-hint" className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                We'll only use this to reply to your quote.
              </div>
            </div>
          </div>

          {/* Preferred contact */}
          <fieldset className="mt-1">
            <legend className="text-sm mb-2" style={{ color: "var(--text)" }}>
              How should we contact you?
            </legend>
            <div className="flex gap-3">
              {[
                { k: "email", label: "Email" },
                { k: "whatsapp", label: "WhatsApp" },
              ].map((opt) => (
                <label key={opt.k} className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
                  <input
                    type="radio"
                    name="contactMethod"
                    value={opt.k}
                    checked={contactMethod === opt.k}
                    onChange={() => setContactMethod(opt.k)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Interest chips */}
          <div>
            <div className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
              What are you most interested in?
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.map((t) => {
                const on = selected.includes(t);
                return (
                  <motion.button
                    key={t}
                    type="button"
                    onClick={() => toggleChip(t)}
                    className="px-3 py-2 rounded-full text-sm border transition-all select-none"
                    style={{
                      borderColor: on ? "var(--orange)" : "var(--border)",
                      color: on ? "var(--orange)" : "var(--text)",
                      background: on ? "rgba(232,80,2,0.10)" : "transparent",
                    }}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    aria-pressed={on}
                  >
                    {t}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="lead-note" className="block text-sm mb-1" style={{ color: "var(--text)" }}>
              Anything specific you want us to know? (optional)
            </label>
            <div className="relative">
              <textarea
                id="lead-note"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={isCompact ? 5 : 6}
                maxLength={400}
                className="w-full rounded-2xl px-4 py-3 resize-y outline-none"
                style={inputStyle}
                placeholder="Share goals: grow Shorts, boost CTR, redesign thumbnails, or streamline your edit pipeline…"
              />
              <div className="absolute right-3 bottom-2 text-xs" style={{ color: "var(--text-muted)" }} aria-hidden="true">
                {(msg || "").length}/400
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className={ctaWrapClasses}>
            <motion.button
              type="submit"
              disabled={!valid || sending}
              className={`rounded-xl py-3 font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed ${isCompact ? "" : "flex-1"}`}
              style={{
                background: "linear-gradient(90deg, var(--orange), #ff9357)",
                boxShadow: "0 4px 12px rgba(232,80,2,0.25)",
              }}
              whileHover={!sending ? { y: -2, boxShadow: "0 10px 24px rgba(232,80,2,0.35)" } : {}}
              whileTap={!sending ? { scale: 0.98 } : {}}
              aria-live="polite"
            >
              {sending ? (contactMethod === "whatsapp" ? "Opening WhatsApp…" : "Opening mail…") : "Send & Get Quote"}
            </motion.button>

            <motion.a
              href={whatsappURL()}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center justify-center rounded-xl py-3 font-semibold ${isCompact ? "" : "flex-1"}`}
              style={{
                border: "2px solid var(--orange)",
                color: "var(--orange)",
                background: "rgba(232,80,2,0.05)",
              }}
              whileHover={{ y: -2, background: "rgba(232,80,2,0.1)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                try {
                  window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "cta_click_whatsapp", src: "leadform" } }));
                } catch { }
              }}
            >
              Message on WhatsApp
            </motion.a>
          </div>

          <p className={`mt-2 ${isCompact ? "text-[11px] text-center" : "text-xs text-center md:text-left"}`} style={{ color: "var(--text-muted)" }}>
            By contacting us, you agree to receive a one-time reply on your email or WhatsApp. We don't send newsletters from this form.
          </p>
        </form>
      </div>
    </section>
  );
};

export default QuickLeadForm;
