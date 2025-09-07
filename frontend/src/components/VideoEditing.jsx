// src/components/VideoEditing.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sun, Moon, Menu, X, ChevronDown, Play, Mail, Instagram, Linkedin, Twitter } from "lucide-react";

import logoLight from "../assets/logo_light.png";
import logoDark from "../assets/logo_dark.png";
import gamingVideos from "../data/gamingVideos.js"; // temporary dataset for examples
// ✂️ removed: import { Helmet } from "react-helmet-async";

/* ===================== Brand tokens ===================== */
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

/* ===================== Header (matches other pages) ===================== */
const Header = ({ isDark, setIsDark }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);

  const workItems = [
    { name: "Video Editing", href: "/video-editing" },
    { name: "GFX", href: "/gfx" },
    { name: "Thumbnails", href: "/thumbnails" },
    { name: "Shorts", href: "/shorts" },
  ];

  return (
    <header
      className="fixed top-0 w-full z-50 backdrop-blur-lg"
      style={{ background: "var(--header-bg)", borderBottom: "1px solid var(--border)" }}
    >
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo (large) */}
        <Link to="/" className="flex items-center">
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
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8" style={{ color: "var(--text)" }}>
          <Link to="/" className="hover:text-[var(--orange)] transition-colors">Home</Link>

          {/* Our Work dropdown (4 links) */}
          <div className="relative">
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
                onMouseLeave={() => setWorkOpen(false)}
              >
                {workItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="block w-full px-4 py-3 text-left font-semibold"
                    style={{ color: "var(--orange)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--orange)";
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--orange)";
                    }}
                    onClick={() => setWorkOpen(false)}
                  >
                    {item.name}
                  </Link>
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

          {/* Mobile menu toggle */}
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
            <Link to="/" className="block py-2" onClick={() => setIsMenuOpen(false)}>Home</Link>

            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {workItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block w-full px-3 py-3 text-left"
                  style={{ color: "var(--orange)", fontWeight: 600 }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
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

/* ===================== Footer (bigger logo like homepage) ===================== */
const Footer = () => (
  <footer className="py-16" style={{ background: "#000", color: "#fff" }}>
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img
              src={logoLight}
              alt="Shinel Studios"
              className="h-20 w-auto object-contain select-none transition-transform"
              style={{ transform: "scale(1.4)", transformOrigin: "left center", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))" }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.5)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.4)")}
            />
          </div>
          <p className="mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>
            We’re a creative media agency dedicated to helping creators and brands shine through unforgettable visuals and strategic content.
          </p>
          <div className="flex gap-4">
            <a href="https://www.instagram.com/shinel.studios/?hl=en" target="_blank" rel="noreferrer" aria-label="Instagram">
              <Instagram size={28} className="cursor-pointer" style={{ color: "rgba(255,255,255,0.8)" }} />
            </a>
            <a href="https://linktr.ee/ShinelStudios" target="_blank" rel="noreferrer" aria-label="Linktree">
              <Twitter size={28} className="cursor-pointer" style={{ color: "rgba(255,255,255,0.8)" }} />
            </a>
            <a href="https://www.linkedin.com/company/shinel-studios/posts/?feedView=all" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <Linkedin size={28} className="cursor-pointer" style={{ color: "rgba(255,255,255,0.8)" }} />
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
          <p className="mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>Subscribe to get the latest tips and updates from our team.</p>
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

/* ===================== Helpers ===================== */
const ytThumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

const YouTubeSmartPlayer = ({ youtubeId, title, thumb }) => {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  const src = thumb || ytThumb(youtubeId);

  return (
    <button
      type="button"
      className="group relative w-full h-full overflow-hidden"
      onClick={() => setPlaying(true)}
      aria-label={`Play ${title}`}
    >
      <img
        src={src}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent opacity-90" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/90 backdrop-blur-md shadow-lg transition-all group-hover:shadow-xl">
          <Play size={18} className="text-black" />
          <span className="text-sm font-semibold text-black">Play</span>
        </div>
      </div>
    </button>
  );
};

const Tag = ({ children }) => (
  <span
    className="text-xs px-2 py-1 rounded-full"
    style={{
      color: "var(--orange)",
      background: "color-mix(in oklab, var(--orange) 12%, transparent)",
      border: "1px solid color-mix(in oklab, var(--orange) 35%, transparent)",
    }}
  >
    {children}
  </span>
);

const VideoCard = ({ v }) => (
  <article
    className="rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all"
    style={{ background: "var(--surface)", borderColor: "var(--border)" }}
  >
    <div className="relative w-full aspect-video bg-black">
      {v.type === "youtube" ? (
        <YouTubeSmartPlayer youtubeId={v.youtubeId} title={v.title} thumb={v.thumb} />
      ) : (
        <video className="w-full h-full" src={v.src} poster={v.thumb} controls preload="metadata" />
      )}
    </div>

    <div className="p-4">
      <h3 className="text-lg font-semibold mb-1 line-clamp-2" style={{ color: "var(--text)" }}>
        {v.title}
      </h3>
      <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
        {v.creator} • {v.duration}
      </p>

      {v.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {v.tags.map((t, i) => (
            <Tag key={i}>{t}</Tag>
          ))}
        </div>
      )}
    </div>
  </article>
);

/* ===================== Page ===================== */
export default function VideoEditing() {
  const [isDark, setIsDark] = useState(true);

  // Sync CSS variables with theme
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

  const allTags = useMemo(() => {
    const s = new Set();
    gamingVideos.forEach((v) => v.tags?.forEach((t) => s.add(t)));
    return Array.from(s);
  }, []);

  return (
    <>
      {/* React 19 native metadata hoisted into <head> */}
      <title>Video Editing Services | Shinel Studios</title>
      <meta
        name="description"
        content="High-impact edits, cinematic montages, trailers and shorts crafted for creators & brands. Optimized for YouTube, TikTok & Reels."
      />
      <meta property="og:title" content="Video Editing Services | Shinel Studios" />
      <meta
        property="og:description"
        content="High-impact edits, cinematic montages, trailers and shorts crafted for creators & brands."
      />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://shinelstudios.in/video-editing" />

      <div className={`min-h-screen ${isDark ? "dark" : ""}`}>
        <Header isDark={isDark} setIsDark={setIsDark} />

        {/* Hero */}
        <section className="pt-28 pb-10 text-center" style={{ background: "var(--hero-bg)" }}>
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-extrabold font-['Poppins']" style={{ color: "var(--text)" }}>
              Video <span style={{ color: "var(--orange)" }}>Editing</span>
            </h1>
            <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto" style={{ color: "var(--text-muted)" }}>
              High-impact edits, cinematic montages, trailers and shorts crafted for creators & brands. Optimized for
              YouTube, TikTok & Reels.
            </p>

            {allTags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {allTags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Grid */}
        <section className="py-14" style={{ background: "var(--surface)" }}>
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gamingVideos.map((v) => (
                <VideoCard key={v.id} v={v} />
              ))}
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
