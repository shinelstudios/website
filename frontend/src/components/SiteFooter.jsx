// src/components/SiteFooter.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, Mail, MessageCircle } from "lucide-react";
import logoLight from "../assets/logo_light.png";

/** tiny event tracker (safe no-op if listener absent) */
const track = (ev, detail = {}) => {
  try {
    window.dispatchEvent(new CustomEvent("analytics", { detail: { ev, ...detail } }));
  } catch {}
};

const SiteFooter = ({ compact = false, reserveForSticky = true }) => {
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <img
                src={logoLight}
                alt="Shinel Studios"
                className="h-12 w-auto object-contain"
                style={{ filter: "drop-shadow(0 2px 8px rgba(232,80,2,.25))" }}
              />
            </div>
            <p className="mb-2" style={linkMuted}>
              We help creators & brands shine through unforgettable visuals and smart strategy.
            </p>
            <p className="mb-6 font-medium" style={{ color: "var(--footer-text, #fff)", opacity: 0.9 }}>
              <em>Where Ideas Shine</em>
            </p>

            <div className="flex gap-4" aria-label="Social links">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  title={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("cta_click_social", { src: "footer", label })}
                >
                  <Icon size={22} style={linkMuted} className="transition-opacity hover:opacity-100 opacity-70" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <nav aria-label="Footer">
            <h3 className="text-lg font-bold mb-5">Quick Links</h3>
            <ul className="space-y-3">
              {[
                { t: "Home", href: "/#home" },
                { t: "Services", href: "/#services" },
                { t: "Testimonials", href: "/#testimonials" },
                { t: "Contact", href: "/#contact" },
              ].map(({ t, href }) => (
                <li key={t}>
                  <a href={href} className="hover:underline" style={linkMuted}>
                    {t}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Updates */}
          <div>
            <h3 className="text-lg font-bold mb-5">Stay Updated</h3>
            <p className="mb-4" style={linkMuted}>
              Get the latest tips and updates from our team.
            </p>

            <form className="flex gap-2" onSubmit={onSubscribe} noValidate>
              <label className="sr-only" htmlFor="newsletter-email">
                Email
              </label>
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
                aria-describedby="newsletter-help"
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
        </div>

        {/* Legal bar: center copyright, right-aligned Privacy/Terms */}
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

            {/* right-corner legal links (stack centered on mobile) */}
            <nav aria-label="Legal" className="flex justify-center md:justify-end items-center gap-6">
              <Link
                to="/privacy"
                className="hover:underline"
                style={linkMuted}
                onClick={() => track("cta_click_legal", { page: "privacy" })}
              >
                Privacy
              </Link>
              <span aria-hidden style={{ opacity: 0.5 }}>
                •
              </span>
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

          {/* Optional compact contact chips for conversion (mobile friendly) */}
          <div className="mt-6 flex items-center justify-center gap-3 md:gap-4">
            <a
              href="https://wa.me/918968141585?text=Hi%20Shinel%20Studios!%20I%20want%20to%20grow%20my%20channel.%20Can%20we%20talk?"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("cta_click_whatsapp", { src: "footer" })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{
                background: "linear-gradient(90deg, var(--orange), #ff9357)",
                color: "#fff",
              }}
              aria-label="Chat on WhatsApp"
            >
              <MessageCircle size={16} />
              <span>WhatsApp</span>
            </a>
            <a
              href="mailto:hello@shinelstudiosofficial.com"
              onClick={() => track("cta_click_email", { src: "footer" })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ border: "1.5px solid var(--orange)", color: "var(--orange)" }}
              aria-label="Email us"
            >
              <Mail size={16} />
              <span>Email</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
