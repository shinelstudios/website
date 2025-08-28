// src/components/ShinelStudiosHomepage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Moon, Menu, X, Play, Image, TrendingUp, FileText, ChevronDown,
  MessageCircle, Users, Eye, Target, Mail, Twitter, Instagram, Linkedin
} from 'lucide-react';

import logoLight from '../assets/logo_light.png';
import logoDark  from '../assets/logo_dark.png';

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
  const [isDark, setIsDark] = useState(true);
  const [openFAQ, setOpenFAQ] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
  }, [isDark]);

  const fadeIn = { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6 } };
  const staggerContainer = { animate: { transition: { staggerChildren: 0.1 } } };
  const float = { animate: { y: [0, -6, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } } };
  const tiltHover = { whileHover: { y: -8, rotateX: 2, rotateY: -2, transition: { type: 'spring', stiffness: 200, damping: 15 } } };

  /* ===================== Header ===================== */
  const Header = ({ isDark, setIsDark }) => {
    const [workOpen, setWorkOpen] = useState(false);
    const workRef = useRef(null);

    const workItems = [
      { name: 'Video Editing', href: '/video-editing' },
      { name: 'GFX',           href: '/gfx' },
      { name: 'Thumbnails',    href: '/thumbnails' },
      { name: 'Shorts',        href: '/shorts' },
    ];

    const closeWorkMenu = () => setWorkOpen(false);

    useEffect(() => {
      const onDocDown = (e) => {
        if (!workOpen) return;
        if (workRef.current && !workRef.current.contains(e.target)) closeWorkMenu();
      };
      const onEsc = (e) => e.key === 'Escape' && closeWorkMenu();
      document.addEventListener('mousedown', onDocDown);
      document.addEventListener('touchstart', onDocDown, { passive: true });
      document.addEventListener('keydown', onEsc);
      return () => {
        document.removeEventListener('mousedown', onDocDown);
        document.removeEventListener('touchstart', onDocDown);
        document.removeEventListener('keydown', onEsc);
      };
    }, [workOpen]);

    return (
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 w-full z-50 backdrop-blur-lg"
        style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--border)' }}
      >
        <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo (large) */}
          <a href="#home" className="flex items-center">
            <div className="h-12 flex items-center overflow-visible">
              <img
                src={isDark ? logoLight : logoDark}
                alt="Shinel Studios"
                className="h-full w-auto object-contain select-none transition-transform"
                style={{ transform: 'scale(2.8)', transformOrigin: 'left center', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(2.9)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(2.8)')}
              />
            </div>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8" style={{ color: 'var(--text)' }}>
            <a href="#home" className="transition-colors hover:text-[var(--orange)]">Home</a>

            {/* Our Work dropdown */}
            <div className="relative" ref={workRef}>
              <motion.button
                whileHover={{ y: -2, color: 'var(--orange)' }}
                onClick={() => setWorkOpen(v => !v)}
                className="inline-flex items-center gap-1"
                aria-expanded={workOpen}
                aria-haspopup="menu"
              >
                Our Work <ChevronDown size={16} className={`transition-transform ${workOpen ? 'rotate-180' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {workOpen && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute left-0 mt-3 w-64 rounded-xl shadow-xl overflow-hidden"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    onMouseLeave={closeWorkMenu}
                  >
                    {workItems.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        className="block w-full px-4 py-3 text-left font-semibold"
                        style={{ color: 'var(--orange)', transition: 'color .15s, background-color .15s' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--orange)';
                          e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--orange)';
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

            <a href="#services" className="transition-colors hover:text-[var(--orange)]">Services</a>
            <a href="#testimonials" className="transition-colors hover:text-[var(--orange)]">Testimonials</a>
            <a href="#contact" className="transition-colors hover:text-[var(--orange)]">Contact</a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg hover:opacity-90"
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color: 'var(--text)' }}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Mobile menu toggle */}
            <button onClick={() => setIsMenuOpen(s => !s)} className="md:hidden p-2" style={{ color: 'var(--text)' }} aria-label="Toggle menu">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden"
              style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
            >
              <div className="px-4 py-4 space-y-2" style={{ color: 'var(--text)' }}>
                <a href="#home" className="block py-2" onClick={() => setIsMenuOpen(false)}>Home</a>

                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {workItems.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.href}
                      className="block w-full px-3 py-3 text-left"
                      style={{ color: 'var(--orange)', fontWeight: 600 }}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </a>
                  ))}
                </div>

                <a href="#services" className="block py-2" onClick={() => setIsMenuOpen(false)}>Services</a>
                <a href="#testimonials" className="block py-2" onClick={() => setIsMenuOpen(false)}>Testimonials</a>
                <a href="#contact" className="block py-2" onClick={() => setIsMenuOpen(false)}>Contact</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    );
  };

  /* ===================== Hero ===================== */
  const HeroSection = () => {
    const starPalette = isDark ? ['#FFFFFF', '#FFEFC7', '#FFD37A'] : ['#B95600', '#FFB84C', '#FFA11E'];
    const stars = Array.from({ length: 32 }).map((_, i) => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3.5,
      size: Math.random() * 10 + 6,
      color: starPalette[Math.floor(Math.random() * starPalette.length)],
      spinDir: Math.random() > 0.5 ? 1 : -1,
    }));

    const LightFlatBg = () => (
      <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 1920 1080" preserveAspectRatio="none">
        <rect x="0" y="0" width="1920" height="1080" fill="#FFD5B0" />
      </svg>
    );

    return (
      <section id="home" className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--hero-bg)' }}>
        {!isDark && <LightFlatBg />}

        <div className="absolute inset-0 pointer-events-none">
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
              transition={{ duration: 2.2 + s.delay, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
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
                  <stop offset="0%"  stopColor="rgba(255,232,188,0.8)" />
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

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="max-w-4xl mx-auto">
            <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-bold mb-6 font-['Poppins']" style={{ color: 'var(--text)' }}>
              Where Ideas <motion.span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(90deg, var(--orange), #ff9357)` }} {...float}>Shine</motion.span>
            </motion.h1>
            <motion.p variants={fadeIn} className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>
              Shinel Studios — where creators & brands craft unforgettable visuals that drive results.
            </motion.p>
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.a href="#services" className="text-white px-8 py-4 rounded-lg font-medium text-lg" style={{ background: 'var(--orange)' }}
                whileHover={{ y: -2, boxShadow: '0 12px 28px rgba(232,80,2,0.35)' }} whileTap={{ scale: 0.98 }}>
                Explore Work
              </motion.a>
              <motion.a href="#contact" className="px-8 py-4 rounded-lg font-medium text-lg border-2"
                style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
                whileHover={{ backgroundColor: 'var(--orange)', color: '#fff', y: -2 }} whileTap={{ scale: 0.98 }}>
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
      { name: 'MRBEAST', role: 'ENTERTAINMENT • PHILANTHROPY', subs: '200M+' },
      { name: 'MKBHD', role: 'TECH • GADGETS', subs: '18M+' },
      { name: 'PEWDIEPIE', role: 'GAMING • COMEDY', subs: '111M+' },
      { name: 'ZACH KING', role: 'MAGIC • SHORTS', subs: '15M+' },
      { name: 'ALI ABDAAL', role: 'PRODUCTIVITY • EDUCATION', subs: '5M+' },
      { name: 'KSI', role: 'GAMING • BOXING • MUSIC', subs: '24M+' },
      { name: 'EMMA CHAMBERLAIN', role: 'LIFESTYLE • FASHION', subs: '12M+' },
      { name: 'NAS DAILY', role: 'TRAVEL • STORIES', subs: '22M+' },
      { name: 'KHABY LAME', role: 'COMEDY • SHORTS', subs: '80M+' },
      { name: 'ALEX HORMOZI', role: 'BUSINESS • ENTREPRENEURSHIP', subs: '1M+' },
    ];
    const loop = useMemo(() => [...creators, ...creators], []);

    return (
      <section style={{ background: 'var(--surface)' }} className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-10 font-['Poppins']" style={{ color: 'var(--text)' }}>
            Creators We Worked with
          </h2>
        </div>

        <div
          className="group overflow-hidden"
          style={{
            marginLeft: 'calc(50% - 50vw)',
            marginRight: 'calc(50% - 50vw)',
            background: 'var(--surface-alt)',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <div className="px-4 md:px-6">
            <div className="marquee" style={{ '--marquee-duration': '36s' }}>
              {loop.map((c, i) => (
                <div
                  key={`${c.name}-${i}`}
                  className="shrink-0 w-[250px] sm:w-[280px] md:w-[320px] h-[340px] md:h-[360px] rounded-[28px] overflow-hidden relative"
                  style={{
                    background:
                      'radial-gradient(80% 80% at 50% 30%, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.88) 70%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.12) 100%)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div className="absolute left-4 top-4 text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full"
                       style={{ background: '#00000099', color: '#fff', border: '1px solid var(--border)' }}>
                    {c.subs} SUBSCRIBERS
                  </div>

                  <div className="absolute left-6 bottom-6 right-6">
                    <div className="text-4xl md:text-5xl font-extrabold leading-tight"
                         style={{ color: '#F5E8DE', textShadow: '0 6px 28px rgba(0,0,0,0.35)' }}>
                      {c.name}
                    </div>
                    <div className="mt-1 text-base md:text-lg font-semibold tracking-widest" style={{ color: 'var(--orange)' }}>
                      {c.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <style>{`
            .marquee{display:flex;gap:24px;width:max-content;animation:scroll linear var(--marquee-duration,36s) infinite;will-change:transform;padding:16px 0;}
            .group:hover .marquee{animation-play-state:paused;}
            @keyframes scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
          `}</style>
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
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 font-['Poppins']" style={{ color: 'var(--text)' }}>Our Services</h2>
            <p className="text-xl max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>
              We offer comprehensive creative solutions to elevate your brand
            </p>
          </motion.div>
          <motion.div variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((s, i) => (
              <motion.div key={i} variants={fadeIn} {...tiltHover} className="p-8 rounded-2xl shadow-lg"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="mb-4" style={{ color: 'var(--orange)' }}>{s.icon}</div>
                <h3 className="text-xl font-bold mb-3 font-['Poppins']" style={{ color: 'var(--text)' }}>{s.title}</h3>
                <p style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    );
  };

  /* ===================== Testimonials WALL ===================== */
  const TestimonialsWall = () => {
    const col1 = [
      { name: 'Rajkumar Maskar', tag: 'YouTuber', text: 'From brand kit to shorts, Shinel handled end-to-end and kept everything on-brand.' },
      { name: 'Sarah Johnson', tag: 'Marketing Director', text: 'Crystal-clear communication and fast turnarounds. Our product launch video crushed it.' },
      { name: 'Mike Chen', tag: 'Content Creator', text: 'Thumbnails + packaging boosted CTR with smooth feedback loops and fast delivery.' },
      { name: 'Aaryan Dev', tag: 'Streamer', text: 'Motion graphics on shorts are 🔥 — watch time went up immediately.' },
    ];
    const col2 = [
      { name: 'Rishav Chatterjee', tag: 'Brand Manager', text: 'Consistency + edits helped us reach millions — huge uplift in engagement.' },
      { name: 'Priya Singh', tag: 'Growth Lead', text: 'They plan content like a marketing team and deliver like a studio.' },
      { name: 'Ishita Rao', tag: 'Creator', text: 'Clean storytelling. They made my long vlog feel like a tight film.' },
      { name: 'Walter Brown', tag: 'Creator', text: 'Thank you @Shinel for the revolution 🙌🏼🙌🏼' },
    ];
    const col3 = [
      { name: 'Emily Rodriguez', tag: 'Brand Manager', text: 'Strategic approach + creative execution. We reached millions of new customers.' },
      { name: 'Alumalla Deepika', tag: 'Community', text: 'They kept the vibe of our brand while pushing fresh ideas.' },
      { name: 'Ritika Mehta', tag: 'Ops', text: 'Calendars, scripts, edit — all managed smoothly.' },
    ];

    const REPS = 4;
    const repeatN = (arr, n) => Array.from({ length: n }, () => arr).flat();

    const Card = ({ item }) => {
      const initials = item.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
      return (
        <li className="rounded-2xl border px-4 py-4 md:px-6 md:py-6"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                 style={{ background: 'var(--orange)' }}>{initials}</div>
            <div>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>{item.name}</div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.tag}</div>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>{item.text}</p>
        </li>
      );
    };

    return (
      <section id="testimonials" className="relative py-24" style={{ background: 'var(--surface-alt)' }}>
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold font-['Poppins']" style={{ color: 'var(--text)' }}>
              What Clients Say
            </h2>
            <p className="text-lg md:text-xl mt-3" style={{ color: 'var(--text-muted)' }}>
              Real feedback from creators and brands we work with
            </p>
          </div>

          <div className="relative pt-20">
            <div className="ss-viewport relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ss-wall group">
                <ul className="ss-col ss-up">{repeatN(col1, REPS).map((it, i) => <Card key={`c1-${i}`} item={it} />)}</ul>
                <ul className="ss-col ss-down">{repeatN(col2, REPS).map((it, i) => <Card key={`c2-${i}`} item={it} />)}</ul>
                <ul className="ss-col ss-up">{repeatN(col3, REPS).map((it, i) => <Card key={`c3-${i}`} item={it} />)}</ul>
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-0 h-10"
                   style={{ background: `linear-gradient(to bottom, ${isDark ? '#0B0B0B' : '#FFF9F6'} 0%, transparent 100%)` }} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6"
                   style={{ background: `linear-gradient(to top, ${isDark ? '#0B0B0B' : '#FFF9F6'} 0%, transparent 100%)` }} />
            </div>
          </div>
        </div>

        <style>{`
          .ss-viewport{
            --wall-h: 680px;
            height: var(--wall-h);
            mask-image: linear-gradient(to bottom, transparent 0, black 40px, black calc(100% - 32px), transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 40px, black calc(100% - 32px), transparent 100%);
          }
          @media(min-width:768px){
            .ss-viewport{ --wall-h: 720px; }
          }

          .ss-wall .ss-col{
            height: 100%;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            padding: 0;
            will-change: transform;
            backface-visibility: hidden;
            transform: translateZ(0);
          }
          .ss-wall .ss-col>li{ width: 100%; }

          .ss-col{ --dur: 34s; }
          .ss-col.ss-up{   animation: colUp var(--dur) linear infinite; }
          .ss-col.ss-down{ animation: colDown var(--dur) linear infinite; }
          .ss-wall.group:hover .ss-col{ animation-play-state: paused; }

          @keyframes colUp   { 0%{transform:translateY(0)}          100%{transform:translateY(-25%)} }
          @keyframes colDown { 0%{transform:translateY(-25%)} 100%{transform:translateY(0)} }
        `}</style>
      </section>
    );
  };

  /* ===================== Stats ===================== */
  const StatsSection = () => {
    const stats = [
      { icon: <Users size={40} />, number: '500+', label: 'Happy Clients' },
      { icon: <Target size={40} />, number: '1000+', label: 'Projects Completed' },
      { icon: <Eye size={40} />, number: '50M+', label: 'Total Reach' },
      { icon: <MessageCircle size={40} />, number: '10M+', label: 'Views Generated' },
    ];
    return (
      <section className="py-20" style={{ background: isDark ? '#000' : '#fff' }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((st, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.7, y: 12 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 180, damping: 18 }}
                className="text-center p-8 backdrop-blur-lg rounded-2xl"
                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', border: '1px solid var(--border)' }}
                whileHover={{ y: -6, boxShadow: '0 10px 24px rgba(0,0,0,0.15)' }}
              >
                <div className="mb-4 flex justify-center" style={{ color: 'var(--orange)' }}>{st.icon}</div>
                <div className="text-4xl font-bold mb-2 font-['Poppins']" style={{ color: 'var(--text)' }}>{st.number}</div>
                <div style={{ color: 'var(--text-muted)' }}>{st.label}</div>
              </motion.div>
            ))}
          </div>
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
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 font-['Poppins']" style={{ color: 'var(--text)' }}>Frequently Asked Questions</h2>
            <p className="text-xl" style={{ color: 'var(--text-muted)' }}>Get answers to common questions about our services</p>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}
                className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <button onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                  className="w-full p-6 text-left flex items-center justify-between"
                  style={{ background: 'var(--surface-alt)', color: 'var(--text)' }}>
                  <span className="font-medium">{f.question}</span>
                  <ChevronDown size={20} className={`transition-transform ${openFAQ === i ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
                </button>
                <AnimatePresence>
                  {openFAQ === i && (
                    <motion.div initial={{ height: 0, opacity: 0, y: i % 2 === 0 ? 16 : -16 }}
                      animate={{ height: 'auto', opacity: 1, y: 0 }}
                      exit={{ height: 0, opacity: 0, y: i % 2 === 0 ? 16 : -16 }} transition={{ duration: 0.35 }}>
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
      </section>
    );
  };

  /* ===================== Contact ===================== */
  const ContactCTA = () => (
    <section id="contact" className="py-20" style={{ backgroundImage: 'linear-gradient(90deg, var(--orange), #ff9357)' }}>
      <div className="container mx-auto px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 font-['Poppins']" style={{ color: '#fff' }}>
            Where Ideas Shine — for Shinel Studios
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Ready to create something amazing? Get in touch and let's start crafting your next success story.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <motion.a
              href="https://wa.me/919988090788"
              target="_blank" rel="noreferrer"
              className="bg-white text-black px-8 py-4 rounded-lg font-medium text-lg"
              whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
            >
              WhatsApp Us
            </motion.a>
            <motion.a href="#contact" className="border-2 border-white text-white px-8 py-4 rounded-lg font-medium text-lg"
              whileHover={{ y: -2, backgroundColor: '#fff', color: '#000' }} whileTap={{ scale: 0.98 }}>
              Contact Us
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );

  /* ===================== Footer (bigger zoomed logo) ===================== */
  const Footer = () => (
    <footer className="py-16" style={{ background: '#000', color: '#fff' }}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={logoLight}
                alt="Shinel Studios"
                className="h-20 w-auto object-contain select-none transition-transform"
                style={{
                  transform: 'scale(1.4)',
                  transformOrigin: 'left center',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.5)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.4)')}
              />
            </div>
            <p className="mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
              We're a creative media agency dedicated to helping creators and brands shine through unforgettable visuals and strategic content.
            </p>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/shinel.studios/?hl=en" target="_blank" rel="noreferrer" aria-label="Instagram">
                <Instagram size={28} className="cursor-pointer" style={{ color: 'rgba(255,255,255,0.8)' }} />
              </a>
              <a href="https://linktr.ee/ShinelStudios" target="_blank" rel="noreferrer" aria-label="Linktree">
                <Twitter size={28} className="cursor-pointer" style={{ color: 'rgba(255,255,255,0.8)' }} />
              </a>
              <a href="https://www.linkedin.com/company/shinel-studios/posts/?feedView=all" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <Linkedin size={28} className="cursor-pointer" style={{ color: 'rgba(255,255,255,0.8)' }} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-6 font-['Poppins']">Quick Links</h3>
            <ul className="space-y-3">
              {['Home','Services','Testimonials','Contact'].map((t) => (
                <li key={t}><a href={`/#${t.toLowerCase()}`} className="transition-colors" style={{ color: 'rgba(255,255,255,0.7)' }}>{t}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-6 font-['Poppins']">Stay Updated</h3>
            <p className="mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>Subscribe to get the latest tips and updates from our team.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
              />
              <button className="px-6 py-3 rounded-lg text-white" style={{ background: 'var(--orange)' }}>
                <Mail size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
          <p>&copy; 2025 Shinel Studios. All rights reserved. Where Ideas Shine.</p>
        </div>
      </div>
    </footer>
  );

  return (
    <div className={`min-h-screen ${isDark ? 'dark' : ''}`}>
      <Header isDark={isDark} setIsDark={setIsDark} />
      <HeroSection />
      <CreatorsWorkedWith />
      <ServicesSection />
      <TestimonialsWall />
      <StatsSection />
      <FAQSection />
      <ContactCTA />
      <Footer />
    </div>
  );
};

export default ShinelStudiosHomepage;
