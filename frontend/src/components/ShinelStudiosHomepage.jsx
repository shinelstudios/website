// src/components/ShinelStudiosHomepage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Moon, Menu, X, Play, Image, TrendingUp, FileText, ChevronDown,
  MessageCircle, Users, Eye, Target, Mail, Twitter, Instagram, Linkedin
} from 'lucide-react';

import logoLight from '../assets/logo_light.png';
import logoDark  from '../assets/logo_dark.png';

// helper: Indian currency formatting
const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// 🎬 Animation Variants
const animations = {
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  },
  fadeDown: {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
  },
  staggerParent: {
    visible: { transition: { staggerChildren: 0.15 } }
  },
  float: {
    animate: { y: [0, -6, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } }
  },
};

const BRAND = {
  orange: '#E85002',
  orangeLight: '#FFB48A',
  light: {
    text: '#0D0D0D',
    textMuted: 'rgba(13,13,13,0.7)',
    surface: '#FFFFFF',
    surfaceAlt: '#FFF9F6',
    border: 'rgba(0,0,0,0.10)',
    headerBg: 'rgba(255,255,255,0.85)',
    heroBg: 'linear-gradient(180deg,#FFF6F2 0%,#FFE7DC 50%,#FFD7C4 100%)'
  },
  dark: {
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.7)',
    surface: '#0F0F0F',
    surfaceAlt: '#0B0B0B',
    border: 'rgba(255,255,255,0.12)',
    headerBg: 'rgba(0,0,0,0.75)',
    heroBg: 'linear-gradient(180deg,#000000 0%,#0E0E0E 50%,#1A1A1A 100%)'
  }
};


const ShinelStudiosHomepage = () => {
  const reduceMotion = typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [isDark, setIsDark] = useState(true);
  const [openFAQ, setOpenFAQ] = useState(null);
  const [showCalendly, setShowCalendly] = useState(false);

  // 4a) Load theme + UTM once on mount
useEffect(() => {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') setIsDark(saved === 'dark');

  const params = new URLSearchParams(window.location.search);
  const fields = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
  const utm = fields.reduce((o,k)=>{ const v=params.get(k); if(v) o[k]=v; return o; },{});
  if (Object.keys(utm).length) localStorage.setItem("utm", JSON.stringify(utm));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// 4b) Apply theme whenever isDark changes (and persist it)
useEffect(() => {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);

  const t = isDark ? BRAND.dark : BRAND.light;
  root.style.setProperty('--text', t.text);
  root.style.setProperty('--text-muted', t.textMuted);
  root.style.setProperty('--surface', t.surface);
  root.style.setProperty('--surface-alt', t.surfaceAlt);
  root.style.setProperty('--border', t.border);
  root.style.setProperty('--header-bg', t.headerBg);
  root.style.setProperty('--hero-bg', t.heroBg);
  root.style.setProperty('--orange', BRAND.orange);

  const favicon = document.getElementById('favicon');
  if (favicon) {
    favicon.href = isDark ? '/favicon-dark-32x32.png' : '/favicon-light-32x32.png';
  }

  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}, [isDark]);

  const fadeIn = { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6 } };
  const staggerContainer = { animate: { transition: { staggerChildren: 0.1 } } };
  const float = { animate: { y: [0, -6, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } } };
  const tiltHover = { whileHover: { y: -8, rotateX: 2, rotateY: -2, transition: { type: 'spring', stiffness: 200, damping: 15 } } };

/* ===================== Header (bigger logo + active link + smart height var) ===================== */
const Header = ({ isDark, setIsDark }) => {
  const [workOpen, setWorkOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState("Home"); // tracks section in view

  const workRef = useRef(null);
  const sections = ["Home", "Services", "Testimonials", "Contact"];

  const workItems = [
    { name: "Video Editing", href: "/video-editing" },
    { name: "GFX", href: "/gfx" },
    { name: "Thumbnails", href: "/thumbnails" },
    { name: "Shorts", href: "/shorts" },
  ];

  const closeWorkMenu = () => setWorkOpen(false);

  // Close dropdown on outside / esc
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

  // Shrink on scroll + progress + expose header height via CSS var (--header-h)
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const doc = document.documentElement;
      const h = doc.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? Math.min(100, (y / h) * 100) : 0);

      // keep QuickQuoteBar perfectly tucked under header
      const headerH = y > 8 ? 72 : 96; // tweak here if you want thinner/thicker
      document.documentElement.style.setProperty("--header-h", `${headerH}px`);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active link indicator via IntersectionObserver
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = visible.target.id || "";
          const match = sections.find((s) => s.toLowerCase() === id);
          if (match) setActive(match);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.toLowerCase());
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const NavLink = ({ label }) => {
    const isActive = active === label;
    return (
      <motion.a
        href={`#${label.toLowerCase()}`}
        className={`relative text-[15px] lg:text-base px-1 ${isActive ? "font-semibold" : ""}`}
        style={{ color: isActive ? "var(--orange)" : "var(--text)" }}
        onHoverStart={() => setHovered(label)}
        onHoverEnd={() => setHovered(null)}
        whileHover={{ color: "var(--orange)" }}
        transition={{ duration: 0.2 }}
      >
        {label}
        {(hovered === label || isActive) && (
          <motion.span
            layoutId="nav-underline"
            className="absolute left-0 -bottom-1 h-[2px] w-full"
            style={{
              background: "linear-gradient(90deg, var(--orange) 0%, #ff9357 100%)",
              borderRadius: 999,
            }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
          />
        )}
      </motion.a>
    );
  };

  return (
    <motion.header
      variants={animations.fadeDown}
      initial="hidden"
      animate="visible"
      className="fixed top-0 w-full z-50"
      style={{
        background: "var(--header-bg)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: scrolled ? "0 6px 18px rgba(0,0,0,0.16)" : "none",
        transition: "box-shadow .25s ease",
      }}
    >
      {/* ultra-thin progress line */}
      <div
        className="absolute left-0 top-0 h-[1.5px]"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, var(--orange), #ff9357)",
        }}
      />

      <nav
        className="container mx-auto px-4 flex items-center justify-between"
        style={{
          paddingTop: scrolled ? "6px" : "10px",
          paddingBottom: scrolled ? "6px" : "10px",
          transition: "padding .2s ease",
        }}
      >
        {/* Brand */}
        <a href="#home" className="flex items-center select-none">
          <motion.img
            src={isDark ? logoLight : logoDark}
            alt="Shinel Studios"
            className="w-auto object-contain block origin-left"
            /* Larger visual read, still shrinks on scroll */
            style={{
              height: scrolled ? 72 : 96,
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))",
            }}
            initial={{ opacity: 0, y: -6, scale: 1.08 }}
            animate={{ opacity: 1, y: 0, scale: scrolled ? 1.0 : 1.12 }}
            whileHover={{ scale: 1.16, rotate: -0.4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            decoding="async"
          />
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {sections.filter(s => s !== "Home").reduce((arr, s, i) => {
            // put Home first
            if (i === 0) arr.unshift(<NavLink key="Home" label="Home" />);
            arr.push(<NavLink key={s} label={s} />);
            return arr;
          }, [])}

          {/* Our Work dropdown */}
          <div className="relative" ref={workRef}>
            <motion.button
              className="inline-flex items-center gap-1 text-[15px] lg:text-base"
              style={{ color: "var(--text)" }}
              onClick={() => setWorkOpen((v) => !v)}
              onMouseEnter={() => setHovered("Our Work")}
              onMouseLeave={() => setHovered(null)}
              whileHover={{ y: -2, color: "var(--orange)" }}
              aria-expanded={workOpen}
              aria-haspopup="menu"
            >
              Our Work
              <ChevronDown size={16} className={`transition-transform ${workOpen ? "rotate-180" : ""}`} />
            </motion.button>

            {hovered === "Our Work" && (
              <motion.span
                layoutId="nav-underline"
                className="absolute left-0 -bottom-1 h-[2px] w-full"
                style={{
                  background: "linear-gradient(90deg, var(--orange) 0%, #ff9357 100%)",
                  borderRadius: 999,
                }}
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}

            <AnimatePresence>
              {workOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute left-0 mt-3 w-64 rounded-xl shadow-xl overflow-hidden"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {workItems.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="block w-full px-4 py-3 text-left font-semibold"
                      style={{ color: "var(--orange)", transition: "color .15s, background-color .15s" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--orange)";
                        e.currentTarget.style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--orange)";
                      }}
                      onClick={closeWorkMenu}
                    >
                      {item.name}
                    </a>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* CTA (desktop) */}
          <motion.button
          onClick={() => setShowCalendly(true)}
          className="hidden md:inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
          whileHover={{ y: -2, boxShadow: "0 10px 24px rgba(232,80,2,0.35)" }}
          whileTap={{ scale: 0.98 }}
          >
            Book Free Audit
            </motion.button>

          {/* Theme toggle */}
          <motion.button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg"
            style={{
              background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
              color: "var(--text)",
            }}
            aria-label="Toggle theme"
            whileTap={{ rotate: 180, scale: 0.9 }}
            transition={{ duration: 0.4 }}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>

          {/* Mobile menu toggle */}
          <button
          onClick={() => setIsMenuOpen((s) => !s)}
          className="md:hidden p-2"
          style={{ color: "var(--text)" }}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden"
            style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
          >
            <div className="px-4 py-4 space-y-2" style={{ color: "var(--text)" }}>
              <a href="#home" className="block py-2" onClick={() => setIsMenuOpen(false)}>Home</a>

              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {workItems.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.href}
                    className="block w-full px-3 py-3 text-left"
                    style={{ color: "var(--orange)", fontWeight: 600 }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </a>
                ))}
              </div>

              {["Services", "Testimonials", "Contact"].map((label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase()}`}
                  className="block py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {label}
                </a>
              ))}

              <a
                href="#contact"
                className="mt-2 inline-flex rounded-full px-4 py-3 text-sm font-semibold text-white"
                style={{ background: "linear-gradient(90deg, var(--orange), #ff9357)" }}
                onClick={() => setIsMenuOpen(false)}
              >
                Get a Quote
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

/* ===================== Calendly Modal ===================== */
const CalendlyModal = ({open, onClose}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] rounded-2xl w-full max-w-3xl overflow-hidden border" style={{borderColor:'var(--border)'}}>
        <div className="flex items-center justify-between px-4 py-3" style={{color:'var(--text)'}}>
          <b>Free 15-min Content Audit</b>
          <button onClick={onClose} className="text-sm opacity-75 hover:opacity-100">Close</button>
        </div>
        <div className="h-[70vh]">
          <iframe
            title="Book a call"
            src="https://calendly.com/YOUR-CALENDLY-SLUG/15min?hide_event_type_details=1&hide_gdpr_banner=1"
            className="w-full h-full"
            style={{border:0}}
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
};

/* ===================== Trust Bar ===================== */
const TrustBar = () => (
  <div
    className="w-full border-b"
    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
  >
    <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-4 text-xs md:text-sm">
      <div className="flex items-center gap-2" style={{ color: 'var(--text)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z" stroke="currentColor"/>
        </svg>
        Rated <b className="mx-1">4.9/5</b> by creators
      </div>
      <span className="hidden md:inline" style={{ color: 'var(--text-muted)' }}>•</span>
      <div className="hidden md:flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
        <span>Trusted by 20+ active clients</span>
        <span>•</span>
        <span>19M+ views generated</span>
      </div>
    </div>
  </div>
);

/* ===================== Quick Quote Bar ===================== */
const QuickQuoteBar = ({ onBook }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setShow(h > 0 && y / h > 0.2);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <motion.div
      initial={{ y: -48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -48, opacity: 0 }}
      className="hidden md:block fixed left-0 right-0 z-40"
      style={{ top: "calc(var(--header-h, 92px) + 6px)" }}
    >
      <div className="container mx-auto px-4">
        <div
          className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-lg"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 10px 24px rgba(0,0,0,0.15)',
          }}
        >
          <span className="text-sm md:text-base" style={{ color: 'var(--text)' }}>
            🚀 Get a <b>free content audit</b> in 24 hours.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onBook}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(90deg, var(--orange), #ff9357)' }}
            >
              Book Call
            </button>
            <a
              href="https://wa.me/918968141585?text=Hi%20Shinel%20Studios!%20Can%20I%20get%20a%20quick%20audit%20of%20my%20channel%20please%3F"
              target="_blank" rel="noreferrer"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(90deg, var(--orange), #ff9357)' }}
            >
              Get Free Audit
            </a>
            <a
              href="#contact"
              className="rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ border: '2px solid var(--orange)', color: 'var(--orange)' }}
            >
              Get Quote
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ===================== Hero ===================== */
const HeroSection = () => {
  const starPalette = isDark ? ['#FFFFFF', '#FFEFC7', '#FFD37A'] : ['#B95600', '#FFB84C', '#FFA11E'];
  const stars = useMemo(() => (
  reduceMotion ? [] : Array.from({ length: 32 }).map((_, i) => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 3.5,
    size: Math.random() * 10 + 6,
    color: starPalette[Math.floor(Math.random() * starPalette.length)],
    spinDir: Math.random() > 0.5 ? 1 : -1,
  }))
), [reduceMotion, isDark]);

  const LightFlatBg = () => (
    <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 1920 1080" preserveAspectRatio="none">
      <rect x="0" y="0" width="1920" height="1080" fill="#FFD5B0" />
    </svg>
  );

  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--hero-bg)' }}
    >
      {!isDark && <LightFlatBg />}

      {/* Animated Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {stars.map((s, i) => (
          <motion.svg
            key={i}
            viewBox="0 0 24 24"
            width={s.size}
            height={s.size}
            className="absolute"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              filter: isDark
                ? 'drop-shadow(0 0 6px rgba(255,255,255,0.75)) drop-shadow(0 0 12px rgba(232,80,2,0.15))'
                : 'drop-shadow(0 0 6px rgba(232,80,2,0.28)) drop-shadow(0 1px 1px rgba(0,0,0,0.10))',
              mixBlendMode: 'normal',
            }}
            initial={{ scale: 0.85, opacity: isDark ? 0.6 : 0.7, rotate: 0 }}
            animate={{
              scale: [0.85, 1.35, 0.85],
              opacity: [isDark ? 0.4 : 0.55, 1, isDark ? 0.4 : 0.55],
              rotate: [0, s.spinDir * 180, s.spinDir * 360],
            }}
            transition={ reduceMotion ? { duration: 0.01 } : { duration: 2.2 + s.delay, repeat: Infinity, ease: 'easeInOut', delay: s.delay } }
          >
            {!isDark && <circle cx="12" cy="10" r="7" fill="url(#halo)" opacity="0.35" />}
            <polygon
              points="12,0 14,8 22,10 14,12 12,20 10,12 2,10 10,8"
              fill={s.color}
              stroke={isDark ? 'rgba(255,255,255,0.55)' : 'rgba(120,55,0,0.6)'}
              strokeWidth="0.6"
            />
            <circle cx="12" cy="10" r="1.2" fill={isDark ? '#FFFFFF' : '#FFFAF0'} />
            <defs>
              <radialGradient id="halo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,232,188,0.8)" />
                <stop offset="60%" stopColor="rgba(255,204,128,0.35)" />
                <stop offset="100%" stopColor="rgba(255,204,128,0)" />
              </radialGradient>
            </defs>
          </motion.svg>
        ))}
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'radial-gradient(700px 420px at 50% 40%, rgba(0,0,0,0.06), rgba(0,0,0,0.03) 45%, transparent 70%)'
              : 'radial-gradient(900px 540px at 50% 40%, rgba(0,0,0,0.05), rgba(0,0,0,0.02) 45%, transparent 72%)',
          }}
        />
      </div>

      {/* Hero Content */}
      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div
          variants={animations.staggerParent}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto"
        >
          <motion.h1
            variants={animations.fadeUp}
            className="text-5xl md:text-7xl font-bold mb-6 font-['Poppins']"
            style={{ color: 'var(--text)' }}
          >
            Where Ideas{" "}
            <motion.span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: `linear-gradient(90deg, var(--orange), #ff9357)` }}
              {...animations.float}
            >
              Shine
            </motion.span>
          </motion.h1>

          <motion.p
            variants={animations.fadeUp}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto"
            style={{ color: 'var(--text-muted)' }}
          >
            Shinel Studios — Helping creators grow with Editing • Thumbnails • Shorts • GFX
          </motion.p>

          <motion.div
            variants={animations.fadeUp}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.a
              href="#services"
              className="text-white px-8 py-4 rounded-lg font-medium text-lg"
              style={{ background: 'var(--orange)' }}
              whileHover={{ y: -2, boxShadow: '0 12px 28px rgba(232,80,2,0.35)' }}
              whileTap={{ scale: 0.98 }}
            >
              Explore Work
            </motion.a>
            <motion.a
              href="#contact"
              className="px-8 py-4 rounded-lg font-medium text-lg border-2"
              style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
              whileHover={{ backgroundColor: 'var(--orange)', color: '#fff', y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              Start a Project
            </motion.a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

/* ===================== Creators Worked With ===================== */
const CreatorsWorkedWith = () => {
  const creators = [
    { name: 'Kamz Inkzone', subs: '171K' },
    { name: 'Deadlox Gaming', subs: '7K' },
    { name: 'Kundan Parashar', subs: '7K' },
    { name: 'Aish is Live', subs: '13K' },
    { name: 'Gamer Mummy', subs: '14.7K' },
    { name: 'Gamify Anchit', subs: '1.5K' },
    { name: 'Maggie Live', subs: '22K' },
    { name: 'Crown Ankit', subs: '3K' },
    { name: 'Manav Maggie Sukhija', subs: '50K' },
  ];

  return (
    <section style={{ background: 'var(--surface)' }} className="py-20">
      <div className="container mx-auto px-4">
        <motion.h2
          variants={animations.fadeDown}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-bold text-center mb-12 font-['Poppins']"
          style={{ color: 'var(--text)' }}
        >
          Creators We Worked With
        </motion.h2>

        {/* ✅ Overflow hidden wrapper to stop white gap */}
        <div className="overflow-hidden">
          <motion.div
            className="flex gap-6"
            animate={reduceMotion ? {} : { x: ["0%", "-50%"] }}
            transition={reduceMotion ? {} : { repeat: Infinity, duration: 40, ease: "linear" }}
          >
            {[...creators, ...creators].map((c, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.08, y: -8 }}
                className="min-w-[240px] sm:min-w-[280px] md:min-w-[320px] rounded-2xl overflow-hidden relative p-6"
                style={{
                  background: 'linear-gradient(135deg, var(--surface), var(--surface-alt))',
                  border: '1px solid var(--border)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                }}
              >
                <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full"
                     style={{ background: 'var(--orange)', color: '#fff' }}>
                  {c.subs}
                </div>
                <h3 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{c.name}</h3>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>YouTube Creator</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

  /* ===================== Services ===================== */
const ServicesSection = () => {
  const services = [
    { icon: <Play size={40} />, title: 'Video Editing', desc: 'Professional video editing and post-production services' },
    { icon: <Image size={40} />, title: 'Thumbnail Design', desc: 'Eye-catching thumbnails that boost click-through rates' },
    { icon: <TrendingUp size={40} />, title: 'SEO & Marketing', desc: 'Strategic marketing to grow your online presence' },
    { icon: <FileText size={40} />, title: 'Content Strategy', desc: 'Comprehensive content planning and strategy' }
  ];

  return (
    <section id="services" className="py-20" style={{ background: 'var(--surface-alt)' }}>
      <div className="container mx-auto px-4">
        
        {/* Section Heading */}
        <motion.div
          variants={animations.fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 font-['Poppins']" style={{ color: 'var(--text)' }}>
            Our Services
          </h2>
          <p className="text-xl max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>
            We offer comprehensive creative solutions to elevate your brand
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={animations.staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {services.map((s, i) => (
            <motion.div
              key={i}
              variants={animations.scaleIn}
              {...tiltHover}
              className="p-8 rounded-2xl shadow-lg"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="mb-4" style={{ color: 'var(--orange)' }}>{s.icon}</div>
              <h3 className="text-xl font-bold mb-3 font-['Poppins']" style={{ color: 'var(--text)' }}>
                {s.title}
              </h3>
              <p style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const BeforeAfter = ({before, after, label="Thumbnail Revamp", beforeAlt="Before", afterAlt="After"}) => {
  const [v,setV]=useState(50);
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative rounded-xl overflow-hidden border" style={{borderColor:'var(--border)'}}>
        <img src={after} alt={afterAlt} className="w-full block" loading="lazy" decoding="async" />
        <img src={before} alt={beforeAlt} className="w-full block absolute inset-0" style={{clipPath:`inset(0 ${100-v}% 0 0)`}} loading="lazy" decoding="async" />
      </div>
      <input type="range" min="0" max="100" value={v} onChange={e=>setV(+e.target.value)} className="w-full mt-3" />
      <div className="text-center text-sm mt-1" style={{color:'var(--text-muted)'}}>{label}: drag to compare</div>
    </div>
  );
};

const ProofSection = () => (
  <section className="py-16" style={{background:'var(--surface-alt)'}}>
    <div className="container mx-auto px-4 text-center">
      <h2 className="text-3xl md:text-4xl font-bold font-['Poppins'] mb-8" style={{color:'var(--text)'}}>Packaging That Lifts CTR</h2>
      <BeforeAfter before="/assets/sample_before.jpg" after="/assets/sample_after.jpg" />
    </div>
  </section>
);

/* ===================== Case Studies ===================== */
const CaseStudies = () => {
  const items = [
    { brand:'Kamz Inkzone', result:'+62% CTR', detail:'+41% avg view duration in 6 weeks', thumb:'', link:'#' },
    { brand:'Gamer Mummy',  result:'+48% retention', detail:'Shorts pipeline + packaging', thumb:'', link:'#' },
    { brand:'Aish is Live', result:'2.1x revenue', detail:'Clips → shorts → offers', thumb:'', link:'#' },
  ];
  return (
    <section className="py-20" style={{background:'var(--surface)'}}>
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-10 font-['Poppins']" style={{color:'var(--text)'}}>Recent Wins</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it,i)=>(
            <motion.a key={i} href={it.link} whileHover={{y:-6}} className="rounded-2xl p-6 border"
              style={{background:'var(--surface-alt)', borderColor:'var(--border)'}}>
              <div className="text-sm mb-2" style={{color:'var(--text-muted)'}}>Client</div>
              <div className="text-xl font-semibold" style={{color:'var(--text)'}}>{it.brand}</div>
              <div className="mt-4 text-3xl font-bold" style={{color:'var(--orange)'}}>{it.result}</div>
              <div className="mt-2" style={{color:'var(--text-muted)'}}>{it.detail}</div>
              <div className="mt-4 text-sm underline" style={{color:'var(--text)'}}>View breakdown →</div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ===================== Process Section ===================== */
const ProcessSection = () => {
  const steps = [
    { n: 1, title: "Discovery Call (15–20 min)", desc: "Goals, niche, roadblocks, assets. Quick audit if needed." },
    { n: 2, title: "Pilot Sprint (7–10 days)", desc: "2–3 edited videos + thumbnails/shorts to prove ROI fast." },
    { n: 3, title: "Scale & Systemize", desc: "Monthly calendar, brand kit, iteration loop for retention/CTR." },
  ];
  return (
    <section className="py-20" style={{ background: 'var(--surface)' }}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold font-['Poppins']" style={{ color: 'var(--text)' }}>
            How We Work
          </h2>
          <p className="text-lg mt-3" style={{ color: 'var(--text-muted)' }}>
            A simple path to results (no fluff, just outcomes).
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map(s => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="p-6 rounded-2xl"
              style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold mb-4"
                style={{ background: 'var(--orange)', color: '#fff' }}
              >
                {s.n}
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>{s.title}</h3>
              <p style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ===================== Testimonials WALL ===================== */
const TestimonialsWall = () => {
  const testimonials = [
    { name: 'Kamz Inkzone', tag: 'YouTuber', text: 'Our brand videos got a professional uplift, engagement went crazy!' },
    { name: 'Deadlox Gaming', tag: 'Gamer', text: 'Editing & thumbnails gave me better CTR & retention 🔥' },
    { name: 'Kundan Parashar', tag: 'Devotional Creator', text: 'They handled devotional content with respect & quality 🙏' },
    { name: 'Aish is Live', tag: 'Streamer', text: 'Livestream clips turned into viral shorts 🚀' },
    { name: 'Gamer Mummy', tag: 'Gaming Creator', text: 'Editing consistency + branding helped scale fast.' },
    { name: 'Gamify Anchit', tag: 'Gamer', text: 'Loved the creative storytelling & editing finesse.' },
    { name: 'Maggie Live', tag: 'Lifestyle Creator', text: 'Packaging & thumbnails boosted CTR instantly.' },
    { name: 'Crown Ankit', tag: 'Gaming Creator', text: 'The edits really brought out my personality 💯' },
    { name: 'Manav Maggie Sukhija', tag: 'YouTuber', text: 'High quality, fast turnaround, professional team.' },
  ];

  // Shuffle once & split into 3 columns
  const shuffled = useMemo(() => [...testimonials].sort(() => Math.random() - 0.5), []);
  const colSize = Math.ceil(shuffled.length / 3);
  const col1 = shuffled.slice(0, colSize);
  const col2 = shuffled.slice(colSize, colSize * 2);
  const col3 = shuffled.slice(colSize * 2);

  const Card = ({ item, i }) => {
    const initials = item.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    return (
      <motion.li
        key={i}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: i * 0.1 }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.05, boxShadow: '0 12px 30px rgba(0,0,0,0.18)' }}
          className="p-6 rounded-2xl border backdrop-blur-sm"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
              style={{ background: 'var(--orange)' }}
            >
              {initials}
            </div>
            <div>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>{item.name}</div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.tag}</div>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>{item.text}</p>
        </motion.div>
      </motion.li>
    );
  };

  return (
    <section id="testimonials" className="relative py-24" style={{ background: 'var(--surface-alt)' }}>
      <div className="container mx-auto px-4 relative">
        {/* Heading */}
        <motion.div
          variants={animations.fadeDown}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-['Poppins']" style={{ color: 'var(--text)' }}>
            What Clients Say
          </h2>
          <p className="text-lg md:text-xl mt-3" style={{ color: 'var(--text-muted)' }}>
            Real feedback from creators and brands we work with
          </p>
        </motion.div>

        {/* Wall */}
        <div className="relative pt-12">
          <div className="ss-viewport relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ss-wall group">
              <ul className="ss-col ss-up slow">{[...col1, ...col1].map((it, i) => <Card key={`c1-${i}`} item={it} i={i} />)}</ul>
              <ul className="ss-col ss-down medium">{[...col2, ...col2].map((it, i) => <Card key={`c2-${i}`} item={it} i={i} />)}</ul>
              <ul className="ss-col ss-up fast">{[...col3, ...col3].map((it, i) => <Card key={`c3-${i}`} item={it} i={i} />)}</ul>
            </div>

            {/* Gradient edges */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-12"
              style={{ background: `linear-gradient(to bottom, ${isDark ? '#0B0B0B' : '#FFF9F6'} 0%, transparent 100%)` }} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
              style={{ background: `linear-gradient(to top, ${isDark ? '#0B0B0B' : '#FFF9F6'} 0%, transparent 100%)` }} />
          </div>
        </div>
      </div>

      <style>{`
      @media (prefers-reduced-motion: reduce) {
      .ss-col.slow,
      .ss-col.medium,
      .ss-col.fast {
      animation: none !important;
      }
      }

        .ss-viewport {
          height: 600px;
          overflow: hidden;
          mask-image: linear-gradient(to bottom, transparent 0, black 40px, black calc(100% - 40px), transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 40px, black calc(100% - 40px), transparent 100%);
        }
        .ss-wall .ss-col {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          animation-iteration-count: infinite;
        }
        .ss-wall .ss-col > li { width: 100%; }

        /* Speeds */
        .ss-col.slow   { animation: colUp 40s linear infinite; }
        .ss-col.medium { animation: colDown 32s linear infinite; }
        .ss-col.fast   { animation: colUp 26s linear infinite; }

        .ss-wall.group:hover .ss-col { animation-play-state: paused; }

        @keyframes colUp   { 0% {transform:translateY(0)} 100% {transform:translateY(-50%)} }
        @keyframes colDown { 0% {transform:translateY(-50%)} 100% {transform:translateY(0)} }
      `}
      </style>
    </section>
  );
};


 /* ===================== Stats ===================== */
const StatsSection = () => {
  const stats = [
    { icon:<Users size={40}/>, number:'20+',    label:'Active Clients' },
    { icon:<Eye size={40}/>,   number:'+38%',   label:'Avg CTR lift (30 days)' },
    { icon:<Target size={40}/>,number:'+27%',   label:'Avg watch time lift' },
    { icon:<MessageCircle size={40}/>, number:'<2h', label:'Avg response time' },
  ];

  return (
    <section className="py-20" style={{ background: isDark ? '#000' : '#fff' }}>
      <div className="container mx-auto px-4">
        <motion.div
          variants={animations.staggerParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {stats.map((st, i) => (
            <motion.div
              key={i}
              variants={animations.fadeUp}
              className="text-center p-8 backdrop-blur-lg rounded-2xl"
              style={{
                background: isDark
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(0,0,0,0.03)',
                border: '1px solid var(--border)',
              }}
              whileHover={{
                y: -6,
                boxShadow: '0 10px 24px rgba(0,0,0,0.15)',
              }}
            >
              <div
                className="mb-4 flex justify-center"
                style={{ color: 'var(--orange)' }}
              >
                {st.icon}
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="text-4xl font-bold mb-2 font-['Poppins']"
                style={{ color: 'var(--text)' }}
              >
                {st.number}
              </motion.div>
              <div style={{ color: 'var(--text-muted)' }}>{st.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};


  /* ===================== FAQ ===================== */
  const FAQSection = () => {
  const faqs = [
    { question: 'What services does Shinel Studios offer?', answer: 'We specialize in video editing, thumbnail design, SEO & marketing, and comprehensive content strategy to help creators and brands shine online.' },
    { question: 'How long does a typical project take?', answer: 'Simple thumbnails can be delivered within 24–48 hours, while comprehensive video projects may take 1–2 weeks depending on scope.' },
    { question: 'Do you work with small creators or just big brands?', answer: 'We work with creators and brands of all sizes and tailor services to your needs and budget.' },
    { question: "What's included in content strategy?", answer: 'Market research, competitor analysis, content planning, posting schedules, and performance optimization recommendations.' },
    { question: 'How do you ensure quality?', answer: 'Multi-stage QA with client reviews and revisions until you’re fully satisfied.' },
  ];
  return (
    <section className="py-20" style={{ background: 'var(--surface)' }}>
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
        variants={animations.fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 font-['Poppins']" style={{ color: 'var(--text)' }}>
            Frequently Asked Questions
          </h2>
          <p className="text-xl" style={{ color: 'var(--text-muted)' }}>
            Get answers to common questions about our services
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((f, i) => (
            <motion.div
            key={i}
            variants={animations.fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
            >
              <button
                onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                className="w-full p-6 text-left flex items-center justify-between"
                style={{ background: 'var(--surface-alt)', color: 'var(--text)' }}
              >
                <span className="font-medium">{f.question}</span>
                <ChevronDown
                  size={20}
                  className={`transition-transform ${openFAQ === i ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--text-muted)' }}
                />
              </button>
              <AnimatePresence>
                {openFAQ === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, y: i % 2 === 0 ? 16 : -16 }}
                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: i % 2 === 0 ? 16 : -16 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="p-6" style={{ background: 'var(--surface)' }}>
                      <p style={{ color: 'var(--text-muted)' }}>{f.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>

      {/* WhatsApp CTA */}
      <div className="text-center mt-12">
        <a
          href="https://wa.me/918968141585?text=Hi%20Shinel%20Studios!%20I%20want%20to%20grow%20my%20channel."
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 px-8 py-4 bg-[var(--orange)] text-white rounded-full font-semibold shadow-md hover:shadow-lg hover:scale-[1.03] transition-all w-fit mx-auto"
        >
          <MessageCircle size={22} className="text-white" />
          Still have questions? Chat with us on <span className="font-bold">WhatsApp</span>
        </a>
      </div>
    </section>
  );
};

/* ===================== Pricing (3 packs + neon glow + custom button) ===================== */
const Pricing = () => {
  const tiers = [
    {
      name: "Starter",
      priceInr: 3999,
      bullet: [
        "1 thumbnail",
        "1 video edit (up to 8 min)",
        "Basic SEO setup",
      ],
      cta: "Request Starter",
    },
    {
      name: "Shorts Pack",
      priceInr: 6000,
      featured: true,
      bullet: [
        "30 shorts",
        "Optimized for YT Shorts feed",
        "Hook-first scripting support",
      ],
      cta: "Book Shorts Pack",
    },
    {
      name: "Creator Essentials",
      priceInr: 9999, // standard India-friendly monthly starter for creators
      bullet: [
        "Thumbnails + edits combo",
        "Light brand kit & packaging",
        "Monthly growth check-in",
      ],
      cta: "Book Essentials",
    },
  ];

  return (
    <section className="py-20" style={{ background: "var(--surface)" }}>
      <div className="container mx-auto px-4">
        <h2
          className="text-4xl md:text-5xl font-bold text-center mb-10 font-['Poppins']"
          style={{ color: "var(--text)" }}
        >
          Simple Packages
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className={`group relative rounded-2xl p-6 border overflow-hidden ${
                t.featured ? "ring-2 ring-[var(--orange)]/35" : ""
              }`}
              style={{
                background: "var(--surface-alt)",
                borderColor: "var(--border)",
                boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
              }}
            >
              {/* animated neon backlight */}
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-10 -z-10 opacity-0 group-hover:opacity-100 blur-2xl"
                style={{
                  background:
                    "radial-gradient(600px 200px at 50% -20%, rgba(232,80,2,0.18), transparent 60%), radial-gradient(400px 240px at 80% 120%, rgba(255,147,87,0.18), transparent 70%)",
                }}
                animate={{ opacity: [0.08, 0.16, 0.1, 0.16, 0.08] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* glossy sweep line */}
              <motion.span
                aria-hidden="true"
                className="absolute -top-10 -left-20 h-[200%] w-20 rotate-12 opacity-0 group-hover:opacity-25"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                }}
                animate={{ x: ["-20%", "140%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />

              <div
                className="text-sm mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                {t.featured ? "Most Popular" : "\u00A0"}
              </div>

              <div
                className="text-xl font-semibold"
                style={{ color: "var(--text)" }}
              >
                {t.name}
              </div>

              <div
                className="text-4xl font-bold mt-2"
                style={{ color: "var(--text)" }}
              >
                {formatINR(t.priceInr)}
              </div>

              <ul className="mt-4 space-y-2" style={{ color: "var(--text)" }}>
                {t.bullet.map((b, bi) => (
                  <li key={bi}>• {b}</li>
                ))}
              </ul>

              <button
                onClick={() => setShowCalendly(true)}
                className="w-full mt-6 rounded-xl py-3 font-semibold text-white"
                style={{
                  background:
                    "linear-gradient(90deg, var(--orange), #ff9357)",
                  boxShadow:
                    "0 10px 24px rgba(232,80,2,0.35)",
                }}
                aria-label={t.cta}
              >
                {t.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Custom quote button under the three cards */}
        <div className="text-center mt-8">
          <button
            onClick={() => setShowCalendly(true)}
            className="inline-flex items-center rounded-full px-6 py-3 font-semibold text-white"
            style={{
              background:
                "linear-gradient(90deg, var(--orange), #ff9357)",
              boxShadow: "0 10px 24px rgba(232,80,2,0.35)",
            }}
          >
            Need something else? Get a Custom Quote
          </button>
          <div
            className="mt-2 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            GST not applicable
          </div>
        </div>
      </div>
    </section>
  );
};

/* ===================== Quick Lead Form ===================== */
const QuickLeadForm = () => {
  const [name, setName]   = useState('');
  const [handle, setHandle] = useState(''); // channel/IG handle
  const [email, setEmail] = useState('');

  const mailto = `mailto:hello@shinelstudiosofficial.com?subject=Quick%20Quote%20Request%20-%20${encodeURIComponent(name)}&body=${encodeURIComponent(
    `Name: ${name}\nHandle: ${handle}\nEmail: ${email}\n\nHi Shinel Studios, I'd like a quick quote and a content audit.`
  )}`;

  return (
    <section className="py-16" style={{ background: 'var(--surface-alt)' }}>
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-8">
          <h3 className="text-3xl md:text-4xl font-bold font-['Poppins']" style={{ color: 'var(--text)' }}>
            Get a Quick Quote
          </h3>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
            Tell us where you post — we’ll reply within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={name} onChange={e=>setName(e.target.value)}
            placeholder="Your Name"
            className="px-4 py-3 rounded-xl"
            style={{ background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)' }}
          />
          <input
            value={handle} onChange={e=>setHandle(e.target.value)}
            placeholder="@handle or channel URL"
            className="px-4 py-3 rounded-xl"
            style={{ background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)' }}
          />
          <input
            value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="Email"
            className="px-4 py-3 rounded-xl"
            style={{ background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)' }}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <a
            href={mailto}
            className="flex-1 text-center rounded-xl py-3 font-semibold text-white"
            style={{ background:'linear-gradient(90deg, var(--orange), #ff9357)' }}
          >
            Send & Get Quote
          </a>
          <a
            href="https://wa.me/918968141585?text=Hi%20Shinel%20Studios!%20Here's%20my%20handle:%20"
            target="_blank" rel="noreferrer"
            className="flex-1 text-center rounded-xl py-3 font-semibold"
            style={{ border:'2px solid var(--orange)', color:'var(--orange)' }}
          >
            Message on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
};

/* ===================== Contact ===================== */
const ContactCTA = () => (
  <section
    id="contact"
    className="w-full py-20"
    style={{ backgroundImage: 'linear-gradient(90deg, var(--orange), #ff9357)' }}
  >
    <div className="max-w-7xl mx-auto px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto"
      >
        <h2
          className="text-4xl md:text-6xl font-bold mb-6 font-['Poppins']"
          style={{ color: '#fff' }}
        >
          Let’s Build Something Amazing Together
        </h2>
        <p
          className="text-xl mb-8 max-w-2xl mx-auto"
          style={{ color: 'rgba(255,255,255,0.9)' }}
        >
          Ready to take your content to the next level? Reach out and let’s start crafting your success story.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <motion.a
            href="https://wa.me/918968141585?text=Hi%20Shinel%20Studios!%20I%20want%20to%20grow%20my%20channel.%20Can%20we%20talk?"
            target="_blank"
            rel="noreferrer"
            className="bg-white text-black px-8 py-4 rounded-lg font-medium text-lg"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            WhatsApp Us
          </motion.a>
          <motion.a
            href="mailto:hello@shinelstudiosofficial.com"
            className="px-8 py-4 rounded-lg font-medium text-lg border-2 border-white text-white"
            whileHover={{ y: -2, backgroundColor: '#fff', color: '#000' }}
          >
            Email Us
          </motion.a>
        </div>
      </motion.div>
    </div>
  </section>
);

/* ===================== Sticky Mobile CTA ===================== */
const StickyMobileCTA = () => (
  <div className="md:hidden fixed bottom-3 left-0 right-0 z-40 px-3">
    <div
      className="flex gap-2 rounded-2xl p-2 shadow-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <a
        href="https://wa.me/918968141585?text=Hi%20Shinel%20Studios!%20I%20want%20to%20grow%20my%20channel."
        target="_blank" rel="noreferrer"
        className="flex-1 text-center rounded-xl py-3 font-semibold text-white"
        style={{ background: 'linear-gradient(90deg, var(--orange), #ff9357)' }}
      >
        WhatsApp
      </a>
      <a
        href="#contact"
        className="flex-1 text-center rounded-xl py-3 font-semibold"
        style={{ border: '2px solid var(--orange)', color: 'var(--orange)' }}
      >
        Get Quote
      </a>
    </div>
  </div>
);

/* ===================== Footer (bigger zoomed logo + animations) ===================== */
const Footer = () => (
  <motion.footer
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    variants={animations.staggerParent}
    className="py-16"
    style={{ background: '#000', color: '#fff' }}
  >
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        
        {/* Column 1 - Logo + Socials */}
        <motion.div variants={animations.fadeUp}>
          <div className="flex items-center gap-3 mb-4">
            <motion.img
              src={logoLight}
              alt="Shinel Studios"
              className="h-20 w-auto object-contain select-none"
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1.4, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              whileHover={{ scale: 1.5 }}
              style={{
                transformOrigin: 'left center',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))',
              }}
            />
          </div>
          <p className="mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
            We're a creative media agency dedicated to helping creators and brands shine through unforgettable visuals and strategic content.
          </p>
          <div className="flex gap-4">
            {[
              { icon: <Instagram size={28} />, href: "https://www.instagram.com/shinel.studios/?hl=en", label: "Instagram" },
              { icon: <Twitter size={28} />,   href: "https://linktr.ee/ShinelStudios",               label: "Linktree"  },
              { icon: <Linkedin size={28} />,  href: "https://www.linkedin.com/company/shinel-studios/posts/?feedView=all", label: "LinkedIn" }
            ].map((s, i) => (
            <motion.a
            key={i}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            whileHover={{ scale: 1.2, y: -2 }}
            whileTap={{ scale: 0.95 }}
            style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              {s.icon}
              </motion.a>
            ))}
          </div>
        </motion.div>

        {/* Column 2 - Links */}
        <motion.div variants={animations.fadeUp}>
          <h3 className="text-xl font-bold mb-6 font-['Poppins']">Quick Links</h3>
          <ul className="space-y-3">
            {['Home','Services','Testimonials','Contact'].map((t) => (
              <li key={t}>
                <a
                  href={`#${t.toLowerCase()}`}
                  className="transition-colors hover:text-[var(--orange)]"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  {t}
                </a>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Column 3 - Newsletter */}
        <motion.div variants={animations.fadeUp}>
          <h3 className="text-xl font-bold mb-6 font-['Poppins']">Stay Updated</h3>
          <p className="mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Subscribe to get the latest tips and updates from our team.
          </p>
          <div className="flex gap-2">
            <motion.input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            />
            <motion.button
              className="px-6 py-3 rounded-lg text-white"
              style={{ background: 'var(--orange)' }}
              whileHover={{ scale: 1.05, boxShadow: '0px 8px 18px rgba(232,80,2,0.4)' }}
              whileTap={{ scale: 0.95 }}
            >
              <Mail size={20} />
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Footer Bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mt-12 pt-8 text-center"
        style={{ borderTop: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
      >
        <p>© 2025 Shinel Studios™ — Where Ideas Shine. All rights reserved.</p>
      </motion.div>
    </div>
  </motion.footer>
);

const SeoSchema = () => {
  useEffect(() => {
    const ld = [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Shinel Studios",
        "url": "https://shinelstudiosofficial.com",
        "logo": "https://shinelstudiosofficial.com/logo_light.png",
        "sameAs": [
          "https://www.instagram.com/shinel.studios/",
          "https://www.linkedin.com/company/shinel-studios/"
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "YouTube Editing & Packaging",
        "provider": { "@type": "Organization", "name": "Shinel Studios" },
        "areaServed": "IN",
        "offers": [
          {
            "@type": "Offer",
            "name": "Starter",
            "priceCurrency": "INR",
            "price": "3999",
            "availability": "https://schema.org/InStock"
          },
          {
            "@type": "Offer",
            "name": "Shorts Pack",
            "priceCurrency": "INR",
            "price": "6000",
            "availability": "https://schema.org/InStock"
          }
        ],
        "url": "https://shinelstudiosofficial.com/#services"
      }
    ];
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.text = JSON.stringify(ld);
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);
  return null;
};

/* ===================== App Wrapper ===================== */
return (
  <div className={`min-h-screen ${isDark ? 'dark' : ''} overflow-x-hidden`}>
    <Header isDark={isDark} setIsDark={setIsDark} />
    <TrustBar />
    <QuickQuoteBar onBook={() => setShowCalendly(true)} />
    <HeroSection />
    <CreatorsWorkedWith />
    <ServicesSection />
    <CaseStudies />
    <ProofSection />
    <ProcessSection />
    <TestimonialsWall />
    <StatsSection />
    <FAQSection />
    <Pricing />
    <QuickLeadForm />
    <ContactCTA />
    <Footer />
    <StickyMobileCTA />
    <SeoSchema />
    <CalendlyModal open={showCalendly} onClose={() => setShowCalendly(false)} />
  </div>
);
};

export default ShinelStudiosHomepage;