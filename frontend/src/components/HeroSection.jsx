/* ===================== Imports ===================== */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { track } from "../lib/helpers"; // Assuming helpers are in src/lib/helpers.js

/* ===================== Hero Section (Enhanced) ===================== */
const HeroSection = ({ isDark, onAudit }) => {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleAudit = () => {
    try {
      window.dispatchEvent(
        new CustomEvent("analytics", { detail: { ev: "cta_click_audit", src: "hero" } })
      );
    } catch (e) {}
    if (onAudit) onAudit();
  };

  const handleSeeWork = (e) => {
    e.preventDefault();
    try {
      window.dispatchEvent(new CustomEvent("analytics", { detail: { ev: "see_work", src: "hero" } }));
    } catch (err) {}
    const el = document.querySelector("#work");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const fieldRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (reduceMotion) return;
    let ticking = false;
    const handleMouse = (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setMousePos({
            x: e.clientX / window.innerWidth,
            y: e.clientY / window.innerHeight,
          });
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("mousemove", handleMouse, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [reduceMotion]);

  const starLayers = useMemo(() => {
    if (reduceMotion) return [];
    const w = typeof window !== "undefined" ? window.innerWidth : 1280;
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;

    if (w < 340) return [];
    
    const layers = [];
    const layerConfigs = [
      { count: w < 640 ? 6 : w < 1024 ? 8 : 12, depth: 0.3, size: [6, 9], speed: [3, 4] },
      { count: w < 640 ? 8 : w < 1024 ? 12 : 16, depth: 0.6, size: [8, 12], speed: [2.2, 3.2] },
      { count: w < 640 ? 4 : w < 1024 ? 6 : 10, depth: 1, size: [10, 14], speed: [1.8, 2.8] },
    ];

    layerConfigs.forEach((config, layerIdx) => {
      const count = Math.round(config.count / (dpr > 1.5 ? 1.3 : 1));
      const stars = [];
      
      for (let i = 0; i < count; i++) {
        stars.push({
          top: `${5 + ((i * 17 + layerIdx * 31) % 85)}%`,
          left: `${3 + ((i * 23 + layerIdx * 41) % 94)}%`,
          size: config.size[0] + ((i * 3) % (config.size[1] - config.size[0])),
          delay: (i * 0.45 + layerIdx * 0.8) % 3,
          drift: (i % 2 ? 1 : -1) * (8 + (layerIdx * 2)),
          speed: config.speed[0] + ((i % 5) * (config.speed[1] - config.speed[0]) / 5),
          opacity: 0.5 + ((i % 4) * 0.15),
          depth: config.depth,
        });
      }
      layers.push({ stars, depth: config.depth });
    });
    
    return layers;
  }, [reduceMotion]);

  useEffect(() => {
    if (!fieldRef.current || !("IntersectionObserver" in window)) return;
    const root = fieldRef.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        root.setAttribute("data-animate", entry.isIntersecting ? "1" : "0");
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: [0, 0.2] }
    );
    const section = root.closest("section");
    if (section) io.observe(section);
    return () => io.disconnect();
  }, []);

  const chips = [
    { text: "AI Thumbnails", icon: "🎨", color: "#ff6b6b" },
    { text: "Auto Transcriptions", icon: "📝", color: "#4ecdc4" },
    { text: "Script Drafts", icon: "✍️", color: "#45b7d1" },
    { text: "Voice Generation", icon: "🎙️", color: "#f7b731" },
    { text: "Face Swap (Consent)", icon: "🔄", color: "#5f27cd" },
    { text: "Style Transitions", icon: "✨", color: "#ff9ff3" },
  ];

  return (
    <section
      id="home"
      className="relative overflow-hidden"
      style={{
        padding: "clamp(80px, 9vw, 140px) 0 clamp(50px, 7vw, 100px)",
        background: "var(--hero-bg)",
        contentVisibility: "auto",
        containIntrinsicSize: "900px",
      }}
      aria-label="Shinel Studios introduction"
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: "radial-gradient(ellipse 90% 60% at 30% -10%, color-mix(in oklab, var(--orange) 30%, transparent) 0%, transparent 50%), radial-gradient(ellipse 80% 50% at 70% 110%, color-mix(in oklab, #ff9357 25%, transparent) 0%, transparent 50%)",
          animation: isVisible && !reduceMotion ? 'ss-mesh-morph 12s ease-in-out infinite' : 'none',
          filter: 'blur(60px)',
        }}
        aria-hidden="true"
      />

      {!reduceMotion && (
        <div
          ref={fieldRef}
          className="ss-field pointer-events-none absolute inset-0 z-0"
          data-animate="1"
          aria-hidden="true"
        >
          {starLayers.map((layer, layerIdx) => (
            <div
              key={layerIdx}
              className="absolute inset-0"
              style={{
                transform: `translate3d(${(mousePos.x - 0.5) * layer.depth * 30}px, ${(mousePos.y - 0.5) * layer.depth * 30}px, 0)`,
                transition: 'transform 0.3s ease-out',
              }}
            >
              {layer.stars.map((s, i) => (
                <span
                  key={i}
                  className="ss-sparkle"
                  style={{
                    top: s.top,
                    left: s.left,
                    '--s': `${s.size}px`,
                    '--delay': `${s.delay}s`,
                    '--drift': `${s.drift}px`,
                    '--spd': `${s.speed}s`,
                    opacity: s.opacity,
                    zIndex: Math.floor(s.depth * 10),
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {!reduceMotion && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="ss-shape"
            style={{
              position: 'absolute',
              top: '12%',
              left: '8%',
              width: 'clamp(150px, 22vw, 320px)',
              height: 'clamp(150px, 22vw, 320px)',
              background: 'radial-gradient(circle, color-mix(in oklab, var(--orange) 15%, transparent), transparent 65%)',
              filter: 'blur(50px)',
              borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
              animation: isVisible ? 'ss-morph 18s ease-in-out infinite, ss-float-alt 14s ease-in-out infinite' : 'none',
              willChange: 'transform, border-radius',
            }}
          />
          <div
            className="ss-shape"
            style={{
              position: 'absolute',
              bottom: '8%',
              right: '10%',
              width: 'clamp(120px, 20vw, 280px)',
              height: 'clamp(120px, 20vw, 280px)',
              background: 'radial-gradient(circle, color-mix(in oklab, #ff9357 12%, transparent), transparent 65%)',
              filter: 'blur(55px)',
              borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
              animation: isVisible ? 'ss-morph 20s ease-in-out infinite 3s, ss-float-alt 16s ease-in-out infinite 2s' : 'none',
              willChange: 'transform, border-radius',
            }}
          />
        </div>
      )}

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(var(--text) 1px, transparent 1px), linear-gradient(90deg, var(--text) 1px, transparent 1px)",
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <motion.div
        className="container mx-auto px-4 relative z-[1]"
        initial={reduceMotion ? {} : { opacity: 0 }}
        animate={reduceMotion ? {} : { opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
          style={{
            background: "color-mix(in oklab, var(--surface) 85%, transparent)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: '0 4px 16px rgba(232,80,2,0.1)',
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          whileHover={reduceMotion ? {} : { scale: 1.03, y: -2 }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--orange)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--orange)]"></span>
          </span>
          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
            Now accepting new projects
          </span>
        </motion.div>

        <motion.h1
          className="font-bold tracking-tight hero-title"
          style={{
            fontFamily: 'Poppins, sans-serif',
            color: "var(--text)",
            lineHeight: 1.05,
            letterSpacing: "-.02em",
            fontSize: "clamp(2.2rem, 7vw, 4.8rem)",
            maxWidth: "26ch",
            textWrap: "balance",
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 25 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span
            className="inline-block gradient-text relative"
            style={{
              backgroundImage: "linear-gradient(135deg, var(--orange) 0%, #ffb36f 45%, #ff9357 100%)",
              backgroundSize: '200% auto',
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: !reduceMotion ? 'ss-gradient-flow 8s ease infinite' : 'none',
            }}
          >
            AI-first
          </span>{" "}
          packaging that boosts CTR.{" "}
          <span className="block md:inline">
            Smart edits that{" "}
            <span className="relative inline-block">
              keep people watching
              <svg
                className="absolute -bottom-1 left-0 w-full"
                height="8"
                viewBox="0 0 200 8"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 6c20-4 40-4 60 0s40 4 60 0 40-4 60 0"
                  stroke="var(--orange)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.5"
                  style={{
                    strokeDasharray: 400,
                    strokeDashoffset: 400,
                    animation: !reduceMotion ? 'ss-draw 1.5s ease-out 0.8s forwards' : 'none',
                  }}
                />
              </svg>
            </span>
          </span>
        </motion.h1>

        <motion.p
          className="mt-4 sm:mt-5"
          style={{
            color: "var(--text-muted)",
            fontSize: "clamp(1.05rem, 2.3vw, 1.3rem)",
            maxWidth: "54ch",
            lineHeight: 1.65,
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Thumbnails, transitions, face-safe swaps, transcripts, script drafts, and voice
          pickups — accelerated by AI, finished by editors.
        </motion.p>

        <motion.div
          className="mt-5 sm:mt-6 flex flex-wrap items-center gap-2.5"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          aria-label="AI capabilities"
        >
          {chips.map((chip, idx) => (
            <motion.span
              key={chip.text}
              className="chip-enhanced group text-xs md:text-sm px-3.5 py-2 rounded-full flex items-center gap-2 cursor-default"
              style={{
                color: "var(--text)",
                border: "1px solid var(--border)",
                background: "color-mix(in oklab, var(--surface) 92%, transparent)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              }}
              initial={reduceMotion ? {} : { opacity: 0, scale: 0.9 }}
              animate={reduceMotion ? {} : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 + idx * 0.05 }}
              whileHover={
                reduceMotion
                  ? {}
                  : {
                      y: -3,
                      scale: 1.03,
                      boxShadow: `0 6px 20px ${chip.color}25`,
                      borderColor: `${chip.color}40`,
                    }
              }
            >
              <span
                className="chip-icon-wrapper"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: `color-mix(in oklab, ${chip.color} 15%, transparent)`,
                  fontSize: '0.85em',
                }}
              >
                {chip.icon}
              </span>
              {chip.text}
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          className="mt-6 sm:mt-7 rounded-2xl proof-card"
          style={{
            background: "color-mix(in oklab, var(--surface) 96%, transparent)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          }}
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          whileHover={reduceMotion ? {} : { y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
          aria-label="Social proof"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 px-5 py-4">
            <div className="flex items-center justify-start sm:justify-center gap-2.5 text-sm" style={{ color: "var(--text)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z" fill="var(--orange)" stroke="var(--orange)" strokeWidth="1"/>
              </svg>
              Rated <strong className="ml-0.5">4.7/5</strong>
            </div>
            <div className="flex items-center justify-start sm:justify-center gap-2.5 text-sm" style={{ color: "var(--text)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M20 21v-2a4 4 0 0 0-3-3.87M12 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm6-1a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <strong>20+ active clients</strong>
            </div>
            <div className="flex items-center justify-start sm:justify-center gap-2.5 text-sm" style={{ color: "var(--text)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <strong>7M+ views</strong>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="mt-7 sm:mt-8 flex flex-col sm:flex-row sm:items-center gap-3"
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <motion.button
            onClick={handleAudit}
            className="cta-primary group relative overflow-hidden w-full sm:w-auto rounded-full px-7 py-3.5 text-white font-semibold text-[15px]"
            style={{
              background: "linear-gradient(135deg, var(--orange) 0%, #ff9357 50%, #ffb36f 100%)",
              backgroundSize: '200% 200%',
              boxShadow: "0 12px 32px rgba(232,80,2,.38), inset 0 0 0 1px rgba(255,255,255,.15)",
              animation: !reduceMotion && isVisible ? 'ss-gradient-move 5s ease infinite' : 'none',
            }}
            whileHover={reduceMotion ? {} : { y: -4, scale: 1.02 }}
            whileTap={reduceMotion ? {} : { scale: 0.97 }}
          >
            <span className="relative flex items-center justify-center gap-2">
              Get Free AI Audit
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </motion.button>

          <motion.a
            href="#work"
            onClick={handleSeeWork}
            className="cta-secondary group w-full sm:w-auto rounded-full px-7 py-3.5 font-semibold text-[15px] text-center flex items-center justify-center gap-2"
            style={{
              color: "var(--text)",
              border: "1.5px solid var(--border)",
              background: "var(--surface-alt)",
              boxShadow: "0 4px 14px rgba(0,0,0,.06)",
            }}
            whileHover={reduceMotion ? {} : { y: -4, scale: 1.02, borderColor: 'var(--orange)' }}
            whileTap={reduceMotion ? {} : { scale: 0.97 }}
          >
            See Work
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.a>
        </motion.div>

        <motion.p
          className="mt-4 text-xs flex items-start gap-2"
          style={{ color: "var(--text-muted)", opacity: 0.95 }}
          initial={reduceMotion ? {} : { opacity: 0 }}
          animate={reduceMotion ? {} : { opacity: 0.95 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 flex-shrink-0">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Face-swap & voice generation are offered only with creator consent and platform-policy compliance.</span>
        </motion.p>
      </motion.div>

      <style>{`
        .hero-title { text-wrap: balance; }
        .ss-field[data-animate="0"] .ss-sparkle { animation-play-state: paused !important; }
        .ss-sparkle {
          position: absolute;
          width: var(--s, 12px);
          height: var(--s, 12px);
          transform: translate3d(0,0,0);
          border-radius: 9999px;
          will-change: transform, opacity;
          background: radial-gradient(circle, var(--orange), rgba(232,80,2,0.3));
          box-shadow: 0 0 12px rgba(232,80,2,0.7);
          animation: ss-twinkle var(--spd,2.6s) ease-in-out infinite var(--delay,0s), ss-drift 9s ease-in-out infinite alternate var(--delay,0s);
        }
        .chip-enhanced { transition: all 0.25s ease; }
        .chip-icon-wrapper { transition: all 0.3s ease; }
        .chip-enhanced:hover .chip-icon-wrapper { transform: scale(1.15) rotate(5deg); }
        .proof-card, .cta-primary, .cta-secondary { transition: all 0.25s ease; }
        
        /* [ACTION REQUIRED] 
          Move these keyframes to your global CSS file (e.g., index.css) 
          to prevent them from being duplicated and to ensure they work.
        */
        @keyframes ss-twinkle {
          0% { opacity: 0; transform: translate3d(0,0,0) scale(.85); }
          20% { opacity: 1; }
          50% { transform: translate3d(var(--drift,8px), -6px, 0) scale(1.05); }
          80% { opacity: .9; }
          100% { opacity: 0; transform: translate3d(0,0,0) scale(.85); }
        }
        @keyframes ss-drift {
          0% { filter: drop-shadow(0 0 4px rgba(232,80,2,0.3)); }
          100% { filter: drop-shadow(0 4px 16px rgba(232,80,2,0.6)); }
        }
        @keyframes ss-morph {
          0%, 100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
          25% { border-radius: 60% 40% 50% 50% / 50% 60% 40% 60%; }
          50% { border-radius: 50% 50% 30% 70% / 60% 40% 60% 40%; }
          75% { border-radius: 70% 30% 40% 60% / 50% 50% 70% 30%; }
        }
        @keyframes ss-float-alt {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(25px, -25px, 0) scale(1.08); }
          66% { transform: translate3d(-20px, 20px, 0) scale(0.92); }
        }
        @keyframes ss-mesh-morph {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.1); }
        }
        @keyframes ss-gradient-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes ss-gradient-move {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes ss-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;