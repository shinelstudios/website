/**
 * EditorialAuditForm — homepage free-audit lead capture.
 *
 * Visitor types their channel URL, then picks WhatsApp or Email. Both
 * buttons open a pre-filled message in the visitor's WhatsApp app or
 * default email client. No backend write — the conversation starts in
 * the channel the visitor prefers, and we reply in 24h.
 *
 * Why no POST to /leads: the user declined Resend / R2 / dedicated
 * email infra (per auto-memory). Mailto + wa.me deep links work
 * everywhere with zero infra dependency.
 */
import React, { useState } from "react";
import { Mail, MessageCircle, Youtube } from "lucide-react";
import { Kicker, Display, RevealOnScroll, MagneticButton } from "../../design";
import { CONTACT } from "../../config/constants";

const track = (ev, detail = {}) => {
  try {
    window.dispatchEvent(new CustomEvent("analytics", { detail: { ev, ...detail } }));
  } catch { /* analytics is best-effort */ }
};

const SUBJECT = "Free audit request";

function buildEmailLink(channel) {
  const body = channel
    ? `Hi Shinel Studios,\n\nPlease send me a free audit for my channel:\n${channel}\n\nThanks!`
    : `Hi Shinel Studios,\n\nI'd like a free audit. I'll share my channel URL in reply.\n\nThanks!`;
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(body)}`;
}

function buildWhatsappLink(channel) {
  const text = channel
    ? `Hi Shinel Studios! I'd like a free audit. My channel: ${channel}`
    : `Hi Shinel Studios! I'd like a free audit.`;
  return `${CONTACT.whatsappUrl}?text=${encodeURIComponent(text)}`;
}

export default function EditorialAuditForm() {
  const [channel, setChannel] = useState("");
  const trimmed = channel.trim();

  return (
    <section
      className="relative py-20 md:py-28 overflow-hidden"
      style={{
        background:
          "radial-gradient(900px 400px at 80% 20%, rgba(232,80,2,0.10), transparent 60%), #0A0A0A",
      }}
      aria-labelledby="audit-headline"
    >
      <div className="container mx-auto px-4 max-w-4xl">
        <RevealOnScroll>
          <Kicker>Reply in 24h</Kicker>
        </RevealOnScroll>

        <RevealOnScroll delay="80ms">
          <Display
            as="h2"
            size="xl"
            id="audit-headline"
            className="mt-3"
            style={{ color: "#fff" }}
          >
            Send us your{" "}
            <span style={{ color: "var(--orange)", fontStyle: "italic" }}>
              last upload.
            </span>
          </Display>
        </RevealOnScroll>

        <RevealOnScroll delay="160ms">
          <p
            className="mt-4 max-w-xl text-base md:text-lg leading-relaxed"
            style={{ color: "rgba(255,255,255,0.72)" }}
          >
            Drop your channel URL — we'll reply with three retention notes, a
            thumbnail concept, and a rough edit estimate. Free, no pitch.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay="240ms">
          <div
            className="mt-8 max-w-2xl rounded-2xl p-5 md:p-6"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <label
              htmlFor="audit-channel"
              className="block text-[11px] font-black uppercase tracking-[0.18em] mb-2"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Channel URL
            </label>
            <div className="relative">
              <Youtube
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--orange)", opacity: 0.85 }}
                aria-hidden="true"
              />
              <input
                id="audit-channel"
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck="false"
                placeholder="youtube.com/@yourhandle"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--orange)] transition-all"
                style={{
                  background: "rgba(0,0,0,0.40)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "#fff",
                }}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MagneticButton strength={5} block>
                <a
                  href={buildWhatsappLink(trimmed)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    track("cta_click_audit", { via: "whatsapp", channel: trimmed })
                  }
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs text-white transition-transform hover:-translate-y-0.5 active:translate-y-0"
                  style={{
                    background: "linear-gradient(135deg, #25D366, #128C7E)",
                    boxShadow: "0 4px 18px rgba(18,140,126,0.35)",
                  }}
                >
                  <MessageCircle size={16} aria-hidden="true" />
                  WhatsApp us
                </a>
              </MagneticButton>
              <MagneticButton strength={5} block>
                <a
                  href={buildEmailLink(trimmed)}
                  onClick={() =>
                    track("cta_click_audit", { via: "email", channel: trimmed })
                  }
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-xs text-white transition-transform hover:-translate-y-0.5 active:translate-y-0"
                  style={{
                    background: "linear-gradient(135deg, var(--orange), #ff9357)",
                    boxShadow: "0 4px 18px rgba(232,80,2,0.35)",
                  }}
                >
                  <Mail size={16} aria-hidden="true" />
                  Email us
                </a>
              </MagneticButton>
            </div>

            <p
              className="mt-4 text-[11px] flex items-center gap-2 flex-wrap"
              style={{ color: "rgba(255,255,255,0.50)" }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--orange)" }}
                aria-hidden="true"
              />
              Free · Reply in 24h · No spam · Project files on request
            </p>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
