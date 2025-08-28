// src/components/SiteFooter.jsx
import React, { useState } from "react";
import { Facebook, Twitter, Instagram, Linkedin, Mail } from "lucide-react";
import logoLight from "../assets/logo_light.png";

/**
 * Reusable footer that matches the site's brand variables.
 * Use <SiteFooter compact /> on auth pages for tighter spacing.
 */
const SiteFooter = ({ compact = false }) => {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const onSubscribe = (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setMsg(ok ? "Thanks for subscribing ✨" : "Please enter a valid email");
    if (ok) setEmail("");
  };

  const linkStyle = { color: "rgba(255,255,255,0.7)" };

  return (
    <footer style={{ background: "#000", color: "var(--text, #fff)" }}>
      {/* thin glowing accent line */}
      <div
        aria-hidden
        className="w-full"
        style={{
          height: 2,
          background:
            "linear-gradient(90deg, transparent, var(--orange, #E85002), transparent)",
          opacity: 0.9,
        }}
      />

      <div className={`container mx-auto px-4 ${compact ? "pt-10" : "pt-16"} ${compact ? "pb-10" : "pb-16"}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={logoLight}
                alt="Shinel Studios"
                className="h-12 w-auto object-contain"
                style={{ filter: "drop-shadow(0 2px 8px rgba(232,80,2,.25))" }}
              />
            </div>
            <p className="mb-6" style={linkStyle}>
              We help creators & brands shine through unforgettable visuals and
              smart strategy.
            </p>

            <div className="flex gap-4">
              <a href="#" aria-label="Facebook" title="Facebook">
                <Facebook size={22} style={linkStyle} className="transition-opacity hover:opacity-100 opacity-70" />
              </a>
              <a href="#" aria-label="Twitter" title="Twitter / X">
                <Twitter size={22} style={linkStyle} className="transition-opacity hover:opacity-100 opacity-70" />
              </a>
              <a href="#" aria-label="Instagram" title="Instagram">
                <Instagram size={22} style={linkStyle} className="transition-opacity hover:opacity-100 opacity-70" />
              </a>
              <a href="#" aria-label="LinkedIn" title="LinkedIn">
                <Linkedin size={22} style={linkStyle} className="transition-opacity hover:opacity-100 opacity-70" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-5">Quick Links</h3>
            <ul className="space-y-3">
              {["Home", "Services", "Testimonials", "Contact"].map((t) => (
                <li key={t}>
                  <a
                    href={`/#${t.toLowerCase()}`}
                    className="hover:underline"
                    style={linkStyle}
                  >
                    {t}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Updates */}
          <div>
            <h3 className="text-lg font-bold mb-5">Stay Updated</h3>
            <p className="mb-4" style={linkStyle}>
              Get the latest tips and updates from our team.
            </p>

            <form className="flex gap-2" onSubmit={onSubscribe}>
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
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                }}
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-lg text-white"
                style={{ background: "var(--orange, #E85002)" }}
                aria-label="Subscribe"
                title="Subscribe"
              >
                <Mail size={18} />
              </button>
            </form>

            {!!msg && (
              <div
                className="mt-2 text-sm"
                style={{ color: "rgba(255,255,255,0.75)" }}
                role="status"
              >
                {msg}
              </div>
            )}
          </div>
        </div>

        <div
          className="mt-10 pt-6 text-center"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <p>&copy; {new Date().getFullYear()} Shinel Studios. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
