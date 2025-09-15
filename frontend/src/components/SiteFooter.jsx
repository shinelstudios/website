// src/components/SiteFooter.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, Mail, MessageCircle } from "lucide-react";
import logoLight from "../assets/logo_light.png";

/** tiny event tracker (safe no-op if listener absent) */
const track = (ev, detail = {}) => {
  try {
    window.dispatchEvent(new CustomEvent("analytics", { detail: { ev, ...detail } }));
  } catch {}
};

/**
 * Footer rules (to avoid repetition on homepage):
 * - On "/" we hide the long “Quick Links” & Newsletter block (since homepage already has: services, FAQ, lead form, CTA)
 * - On other routes we show full footer.
 * - We reserve bottom padding on mobile if a sticky CTA exists.
 */
const SiteFooter = ({
  forceCompact = false,
  reserveForSticky = true,
}) => {
  const location = useLocation?.() || { pathname: (typeof window !== "undefined" && window.location.pathname) || "/" };
  const onHome = location.pathname === "/";
  const compact = forceCompact || onHome;

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect small screens (to reserve space for sticky CTA)
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Reserve ~64px when sticky CTA might overlap (mobile only)
  const reservedPad =
    reserveForSticky && isMobile ? "calc(64px + env(safe-area-inset-bottom, 0px))" : "0px";

  const linkMuted = { color: "var(--footer-muted, rgba(255,255,255,0.7))" };

  const SOCIALS = [
    { label: "Instagram", href: "https://www.instagram.com/shinel.studios/", Icon: Instagram },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/shinel-studios/", Icon: Linkedin },
    { label: "Facebook", href: "https://www.facebook.com/", Icon: Facebook },
    { label: "Twitter / X", href: "https://twitter.com/", Icon: Twitter },
  ];

  const onSubscribe = async (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((email || "").trim());
    if (!ok) {
      setMsg("Please enter a valid email.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      track("cta_click_subscribe", { src: "footer", email });
      const endpoint = import.meta?.env?.VITE_NEWSLETTER_ENDPOINT;
      if (endpoint) {
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source: "footer" }),
        });
      } else {
        const to = "hello@shinelstudiosofficial.com";
        const subject = "Newsletter Subscribe";
        const body = `Please subscribe me to updates.\nEmail: ${email}\nSource: footer`;
        window.open(
          `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
          "_blank",
          "noopener,noreferrer"
        );
      }
      setMsg("Thanks for subscribing ✨");
      setEmail("");
    } catch {
      setMsg("Could not subscribe right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <footer
      id="site-footer"
      role="contentinfo"
      style={{
        background: "var(--footer-bg, #000)",
        color: "var(--footer-text, #fff)",
        paddingBottom: reservedPad, // keep footer content clear of any sticky bar
      }}
    >
      {/* thin glowing accent line */}
      <div
        aria-hidden
        className="w-full"
        style={{
          height: 2,
          background: "linear-gradient(90deg, transparent, var(--orange, #E85002), transparent)",
          opacity: 0.9,
        }}
      />

      <div className={`container mx-auto px-4 ${compact ? "pt-10 pb-10" : "pt-16 pb-16"}`}>
        <div
          className={
            compact
              ? "grid grid-cols-1 md:grid-cols-[1.2fr_.8fr] gap-10"
              : "grid grid-cols-1 md:grid-cols-[1.2fr_.8fr_1fr] gap-12"
          }
        >
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <img
                src={logoLight}
                alt="Shinel Studios"
                className="h-12 w-auto object-contain"
                style={{ filter: "drop-shadow(0 2px 8px rgba(232,80,2,.25))" }}
              />
              <span className="text-sm font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(232,80,2,.18)", color: "#fff", border: "1px solid rgba(255,255,255,.2)" }}>
                AI-first
              </span>
            </div>
            <p className="mb-2" style={linkMuted}>
              We help creators & brands shine through unforgettable visuals and smart strategy.
            </p>
            <p className="mb-6 font-medium" style={{ color: "var(--footer-text, #fff)", opacity: 0.9 }}>
              <em>Where Ideas Shine</em>
            </p>

            {/* Socials */}
            <div className="flex gap-4">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  title={label}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => track("cta_click_social", { src: "footer", label })}
                >
                  <Icon size={22} style={linkMuted} className="transition-opacity hover:opacity-100 opacity-70" />
                </a>
              ))}
            </div>

            {/* Compact: simple contact row */}
            {compact && (
              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                <a
                  href="mailto:hello@shinelstudiosofficial.com"
                  className="underline hover:opacity-100 opacity-80"
                  onClick={() => track("cta_click_contact", { via: "email", place: "footer_compact" })}
                >
                  hello@shinelstudiosofficial.com
                </a>
                <span aria-hidden className="opacity-50">•</span>
                <a
                  href="https://wa.me/918838179165"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline hover:opacity-100 opacity-80"
                  onClick={() => track("cta_click_contact", { via: "whatsapp", place: "footer_compact" })}
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              </div>
            )}
          </div>

          {/* Quick Links (hidden on home to avoid repetition) */}
          {!compact && (
            <nav aria-label="Footer">
              <h3 className="text-lg font-bold mb-5">Quick Links</h3>
              <ul className="space-y-3">
                {[
                  { t: "Home", href: "/#home" },
                  { t: "Services", href: "/#services" },
                  { t: "Our Work", href: "/#work" },
                  { t: "Contact", href: "/#contact" },
                  { t: "Video Editing", href: "/video-editing" },
                  { t: "GFX", href: "/gfx" },
                  { t: "Thumbnails", href: "/thumbnails" },
                  { t: "Shorts", href: "/shorts" },
                ].map((l) => (
                  <li key={l.t}>
                    <Link
                      to={l.href}
                      className="hover:underline"
                      style={linkMuted}
                      onClick={() => track("cta_click_footer_link", { label: l.t })}
                    >
                      {l.t}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Newsletter (hidden on home to prevent duplication) */}
          {!compact && (
            <div>
              <h3 className="text-lg font-bold mb-5">Stay in the loop</h3>
              <p className="mb-3" style={linkMuted}>
                Fresh ideas, thumbnail tests, tools & case studies. 1–2× / month.
              </p>

              <form className="flex gap-2" onSubmit={onSubscribe} noValidate>
                <label className="sr-only" htmlFor="newsletter-email">Email</label>
                <input
                  id="newsletter-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-lg focus:outline-none"
                  style={{
                    background: "var(--footer-input-bg, rgba(255,255,255,0.06))",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "var(--footer-text, #fff)",
                  }}
                  autoComplete="email"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-3 rounded-lg text-white disabled:opacity-70"
                  style={{ background: "var(--orange, #E85002)" }}
                  aria-label="Subscribe"
                  title="Subscribe"
                >
                  <Mail size={18} />
                </button>
              </form>

              <div
                id="newsletter-help"
                className="mt-2 text-sm"
                style={{ color: "rgba(255,255,255,0.75)" }}
                role="status"
                aria-live="polite"
              >
                {msg || "No spam. Unsubscribe anytime."}
              </div>
            </div>
          )}
        </div>

        {/* Legal bar */}
        <div
          className="mt-10 pt-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-y-2">
            {/* left spacer (desktop) */}
            <div className="hidden md:block" />

            {/* centered copyright */}
            <p className="text-center">
              &copy; {new Date().getFullYear()} Shinel Studios™ · All rights reserved · Where Ideas Shine
            </p>

            {/* right-corner legal links */}
            <nav aria-label="Legal" className="flex justify-center md:justify-end items-center gap-6">
              <Link
                to="/privacy"
                className="hover:underline"
                style={linkMuted}
                onClick={() => track("cta_click_legal", { page: "privacy" })}
              >
                Privacy
              </Link>
              <span aria-hidden style={{ opacity: 0.5 }}>•</span>
              <Link
                to="/terms"
                className="hover:underline"
                style={linkMuted}
                onClick={() => track("cta_click_legal", { page: "terms" })}
              >
                Terms
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
