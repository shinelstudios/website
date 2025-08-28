// src/components/GFX.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Sun, Moon, Menu, X, ChevronDown, Sparkles, Mail,
  Instagram, Linkedin, Twitter
} from "lucide-react";
import logoLight from "../assets/logo_light.png";
import logoDark from "../assets/logo_dark.png";

const BRAND = {
  orange: "#E85002",
  light: {
    text: "#0D0D0D",
    textMuted: "rgba(13,13,13,0.7)",
    surface: "#FFFFFF",
    surfaceAlt: "#FFF9F6",
    border: "rgba(0,0,0,0.10)",
    headerBg: "rgba(255,255,255,0.85)",
    heroBg: "linear-gradient(180deg,#FFF6F2 0%,#FFE7DC 50%,#FFD7C4 100%)",
  },
  dark: {
    text: "#FFFFFF",
    textMuted: "rgba(255,255,255,0.7)",
    surface: "#0F0F0F",
    surfaceAlt: "#0B0B0B",
    border: "rgba(255,255,255,0.12)",
    headerBg: "rgba(0,0,0,0.75)",
    heroBg: "linear-gradient(180deg,#000000 0%,#0E0E0E 50%,#1A1A1A 100%)",
  },
};

/* ===================== Header ===================== */
const Header = ({ isDark, setIsDark }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);
  const workRef = useRef(null);

  const workItems = [
    { name: "Video Editing", href: "/video-editing" },
    { name: "GFX", href: "/gfx" },
    { name: "Thumbnails", href: "/thumbnails" },
    { name: "Shorts", href: "/shorts" },
  ];

  const closeWorkMenu = () => setWorkOpen(false);

  useEffect(() => {
    const onDocDown = (e) => {
      if (!workOpen) return;
      if (workRef.current && !workRef.current.contains(e.target)) closeWorkMenu();
    };
    const onEsc = (e) => e.key === "Escape" && closeWorkMenu();
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown, { passive: true });
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [workOpen]);

  return (
    <header
      className="fixed top-0 w-full z-50 backdrop-blur-lg"
      style={{ background: "var(--header-bg)", borderBottom: "1px solid var(--border)" }}
    >
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo (large) */}
        <a href="/" className="flex items-center">
          <div className="h-12 flex items-center overflow-visible">
            <img
              src={isDark ? logoLight : logoDark}
              alt="Shinel Studios"
              className="h-full w-auto object-contain select-none transition-transform"
              style={{ transform: "scale(2.8)", transformOrigin: "left center", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(2.9)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(2.8)")}
            />
          </div>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8" style={{ color: "var(--text)" }}>
          <a href="/" className="hover:text-[var(--orange)] transition-colors">Home</a>

          {/* Our Work dropdown */}
          <div className="relative" ref={workRef}>
            <button
              onClick={() => setWorkOpen((v) => !v)}
              className="inline-flex items-center gap-1 hover:text-[var(--orange)] transition-colors"
              aria-expanded={workOpen}
              aria-haspopup="menu"
            >
              Our Work <ChevronDown size={16} className={`transition-transform ${workOpen ? "rotate-180" : ""}`} />
            </button>

            {workOpen && (
              <div
                role="menu"
                className="absolute left-0 mt-3 w-64 rounded-xl shadow-xl overflow-hidden"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                onMouseLeave={closeWorkMenu}
              >
                {workItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="block w-full px-4 py-3 text-left font-semibold"
                    style={{ color: "var(--orange)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--orange)"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--orange)"; }}
                    onClick={closeWorkMenu}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            )}
          </div>

          <a href="/#services" className="hover:text-[var(--orange)] transition-colors">Services</a>
          <a href="/#testimonials" className="hover:text-[var(--orange)] transition-colors">Testimonials</a>
          <a href="/#contact" className="hover:text-[var(--orange)] transition-colors">Contact</a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDark((v) => !v)}
            className="p-2 rounded-lg hover:opacity-90"
            style={{ background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", color: "var(--text)" }}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            onClick={() => setIsMenuOpen((s) => !s)}
            className="md:hidden p-2"
            style={{ color: "var(--text)" }}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
          <div className="px-4 py-4 space-y-2" style={{ color: "var(--text)" }}>
            <a href="/" className="block py-2" onClick={() => setIsMenuOpen(false)}>Home</a>

            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {workItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="block w-full px-3 py-3 text-left"
                  style={{ color: "var(--orange)", fontWeight: 600 }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
            </div>

            <a href="/#services" className="block py-2" onClick={() => setIsMenuOpen(false)}>Services</a>
            <a href="/#testimonials" className="block py-2" onClick={() => setIsMenuOpen(false)}>Testimonials</a>
            <a href="/#contact" className="block py-2" onClick={() => setIsMenuOpen(false)}>Contact</a>
          </div>
        </div>
      )}
    </header>
  );
};

/* ===================== Footer ===================== */
const Footer = () => (
  <footer className="py-16" style={{ background: "#000", color: "#fff" }}>
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img
              src={logoLight}
              alt="Shinel Studios"
              className="h-20 w-auto object-contain transition-transform duration-300 hover:scale-105"
            />
          </div>
          <p className="mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>
            We're a creative media agency dedicated to helping creators and brands shine through unforgettable visuals and strategic content.
          </p>
          <div className="flex gap-4">
            <a href="https://www.instagram.com/shinel.studios/?hl=en" target="_blank" rel="noreferrer" aria-label="Instagram">
              <Instagram size={24} className="cursor-pointer" style={{ color: "rgba(255,255,255,0.8)" }} />
            </a>
            <a href="https://linktr.ee/ShinelStudios" target="_blank" rel="noreferrer" aria-label="Linktree">
              <Twitter size={24} className="cursor-pointer" style={{ color: "rgba(255,255,255,0.8)" }} />
            </a>
            <a href="https://www.linkedin.com/company/shinel-studios/posts/?feedView=all" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <Linkedin size={24} className="cursor-pointer" style={{ color: "rgba(255,255,255,0.8)" }} />
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-6 font-['Poppins']">Quick Links</h3>
          <ul className="space-y-3">
            {["Home", "Services", "Testimonials", "Contact"].map((t) => (
              <li key={t}>
                <a href={`/#${t.toLowerCase()}`} className="transition-colors" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {t}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-6 font-['Poppins']">Stay Updated</h3>
          <p className="mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
            Subscribe to get the latest tips and updates from our team.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg focus:outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}
            />
            <button className="px-6 py-3 rounded-lg text-white" style={{ background: "var(--orange)" }}>
              <Mail size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-8 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
        <p>&copy; 2025 Shinel Studios. All rights reserved. Where Ideas Shine.</p>
      </div>
    </div>
  </footer>
);

/* ===================== Page Content ===================== */
const gfxItems = Array.from({ length: 9 }).map((_, i) => ({
  id: i + 1,
  title: `Project ${i + 1}`,
  desc: "Short description of the project.",
  tag: ["Thumbnail", "Poster", "Brand Kit", "Logo", "Banner"][i % 5],
  img: `https://picsum.photos/seed/gfx-${i + 1}/960/600`,
}));

const Tag = ({ children }) => (
  <span
    className="text-xs px-3 py-1 rounded-full"
    style={{
      color: "var(--orange)",
      background: "color-mix(in oklab, var(--orange) 12%, transparent)",
      border: "1px solid color-mix(in oklab, var(--orange) 35%, transparent)",
    }}
  >
    {children}
  </span>
);

export default function GFX() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    const t = isDark ? BRAND.dark : BRAND.light;
    root.classList.toggle("dark", isDark);
    root.style.setProperty("--text", t.text);
    root.style.setProperty("--text-muted", t.textMuted);
    root.style.setProperty("--surface", t.surface);
    root.style.setProperty("--surface-alt", t.surfaceAlt);
    root.style.setProperty("--border", t.border);
    root.style.setProperty("--header-bg", t.headerBg);
    root.style.setProperty("--hero-bg", t.heroBg);
    root.style.setProperty("--orange", BRAND.orange);
  }, [isDark]);

  const decorativeDots = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 6 + Math.random() * 10,
        opacity: 0.15 + Math.random() * 0.25,
      })),
    []
  );

  return (
    <div className={`min-h-screen ${isDark ? "dark" : ""}`}>
      <Header isDark={isDark} setIsDark={setIsDark} />

      {/* Hero */}
      <section className="pt-28 pb-10 relative" style={{ background: "var(--hero-bg)" }}>
        <div className="container mx-auto px-4">
          <div className="max-w-5xl">
            <h1 className="text-4xl md:text-6xl font-extrabold font-['Poppins'] leading-tight" style={{ color: "var(--text)" }}>
              Graphic Design Showcase 🎨
            </h1>
            <p className="mt-5 text-lg md:text-xl" style={{ color: "var(--text-muted)" }}>
              Our best GFX designs — thumbnails, posters, brand kits and more.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {["Thumbnail", "Poster", "Brand Kit", "Logo", "Banner"].map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          </div>
        </div>

        {/* brand dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {decorativeDots.map((d) => (
            <span
              key={d.id}
              className="absolute rounded-full"
              style={{
                left: d.left,
                top: d.top,
                width: d.size,
                height: d.size,
                background: "var(--orange)",
                opacity: d.opacity,
                filter: "blur(0.5px)",
              }}
            />
          ))}
        </div>
      </section>

      {/* Grid with images & hover effects */}
      <section className="py-14" style={{ background: "var(--surface)" }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gfxItems.map((g) => (
              <article
                key={g.id}
                className="group rounded-2xl overflow-hidden border shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                {/* Image block */}
                <figure className="relative w-full aspect-[16/10] overflow-hidden">
                  <img
                    src={g.img}
                    alt={`${g.title} preview`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0"
                       style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.55) 100%)" }} />
                  <div className="absolute left-3 top-3 px-2 py-1 rounded-md text-xs font-semibold"
                       style={{ background: "rgba(0,0,0,.55)", color: "#fff", border: "1px solid rgba(255,255,255,.15)" }}>
                    {g.tag}
                  </div>
                </figure>

                {/* Text & CTAs */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text)" }}>{g.title}</h3>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{g.desc}</p>

                  <div className="mt-4 flex items-center gap-3">
                    <a
                      href={g.img}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg text-white text-sm transition-transform active:scale-95"
                      style={{ background: "var(--orange)" }}
                    >
                      View
                    </a>
                    <button
                      className="px-3 py-1.5 rounded-lg text-sm transition-transform active:scale-95"
                      style={{ border: "1px solid var(--border)", color: "var(--text)" }}
                      onClick={() => navigator.clipboard?.writeText(g.img)}
                      aria-label="Copy image link"
                    >
                      Share
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* CTA Row */}
          <div
            className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl p-5"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3" style={{ color: "var(--text)" }}>
              <Sparkles size={20} style={{ color: "var(--orange)" }} />
              <p className="font-medium">Need a custom GFX pack?</p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://wa.me/919988090788"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg text-white"
                style={{ background: "var(--orange)" }}
              >
                WhatsApp Us
              </a>
              <a
                href="/#services"
                className="px-4 py-2 rounded-lg"
                style={{ border: "1px solid var(--border)", color: "var(--text)" }}
              >
                See Services
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
