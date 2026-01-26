import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Captions,
  ChevronDown,
  Image as ImageIcon,
  Mic2,
  PlayCircle,
  ScrollText,
  Sparkles,
  TrendingUp,
  UserCheck,
  Wand2,
  Users,
  Activity,
} from "lucide-react";

/* ------------------------------ Helpers ------------------------------ */

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    listener();
    media.addEventListener?.("change", listener);
    return () => media.removeEventListener?.("change", listener);
  }, [query]);

  return matches;
}

function useIsInViewport(ref, rootMargin = "120px") {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const obs = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { root: null, threshold: 0.08, rootMargin }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, rootMargin]);

  return isIntersecting;
}

// ultra-light analytics hook (safe no-op)
function emitAnalytics(payload) {
  try {
    window.dispatchEvent(new CustomEvent("ss_analytics", { detail: payload }));
  } catch {
    /* no-op */
  }
}

/* ------------------------------ UI Bits ------------------------------ */

function TierToggle({ value, onChange }) {
  const isGrowing = value === "growing";
  return (
    <div
      className="inline-flex items-center rounded-full border p-1"
      style={{
        borderColor: "var(--border)",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
      role="tablist"
      aria-label="Creator tier"
    >
      <button
        type="button"
        onClick={() => onChange("growing")}
        className="rounded-full px-4 py-2 text-sm font-semibold transition"
        style={{
          background: isGrowing ? "var(--orange)" : "transparent",
          color: isGrowing ? "#000" : "var(--text)",
        }}
        role="tab"
        aria-selected={isGrowing}
      >
        10k–100k
      </button>
      <button
        type="button"
        onClick={() => onChange("serious")}
        className="rounded-full px-4 py-2 text-sm font-semibold transition"
        style={{
          background: !isGrowing ? "var(--orange)" : "transparent",
          color: !isGrowing ? "#000" : "var(--text)",
        }}
        role="tab"
        aria-selected={!isGrowing}
      >
        100k–1M
      </button>
    </div>
  );
}

function FeatureChip({ icon: Icon, label }) {
  return (
    <div
      className="ss-chip inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
      style={{
        color: "var(--text)",
        borderColor: "var(--border)",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <span
        className="inline-flex items-center justify-center rounded-full"
        style={{
          width: 30,
          height: 30,
          background: "rgba(232,80,2,0.12)",
          border: "1px solid rgba(232,80,2,0.25)",
        }}
      >
        <Icon size={16} style={{ color: "var(--orange)" }} />
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}

function StatCard({ icon: Icon, value, label }) {
  return (
    <div
      className="ss-stat rounded-2xl border p-4"
      style={{
        borderColor: "var(--border)",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center rounded-xl"
          style={{
            width: 44,
            height: 44,
            background: "rgba(232,80,2,0.12)",
            border: "1px solid rgba(232,80,2,0.25)",
          }}
        >
          <Icon size={18} style={{ color: "var(--orange)" }} />
        </span>

        <div className="min-w-0">
          <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {value}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

// Cinematic “editing timeline” (CPU-friendly): 100% CSS, 1 moving playhead, subtle clip glow.
const TIMELINE_PRESETS = {
  growth: {
    rulerLabels: ["00:00", "00:12", "00:24", "00:36"],
    tracks: [
      {
        type: "video",
        lane: "V1",
        clips: [
          { left: 6, width: 34, hot: true, title: "A-Roll" },
          { left: 44, width: 18, title: "Cut" },
          { left: 66, width: 26, title: "Beat" },
        ],
      },
      {
        type: "video",
        lane: "V2",
        clips: [
          { left: 12, width: 20, title: "B-Roll" },
          { left: 36, width: 12, title: "Overlay" },
          { left: 56, width: 30, hot: true, title: "Motion" },
        ],
      },
      {
        type: "audio",
        lane: "A1",
        wave: true,
        clips: [{ left: 4, width: 92, title: "VO + SFX" }],
      },
    ],
  },
  packaging: {
    rulerLabels: ["Hook", "Title", "Thumb", "Test"],
    tracks: [
      {
        type: "video",
        lane: "V1",
        clips: [
          { left: 4, width: 28, hot: true, title: "Hook" },
          { left: 34, width: 22, title: "Title" },
          { left: 60, width: 34, hot: true, title: "Thumb" },
        ],
      },
      {
        type: "video",
        lane: "V2",
        clips: [
          { left: 10, width: 18, title: "Alt" },
          { left: 40, width: 16, hot: true, title: "A/B" },
          { left: 76, width: 18, title: "Pick" },
        ],
      },
      {
        type: "audio",
        lane: "A1",
        wave: true,
        clips: [{ left: 6, width: 88, title: "Clicks" }],
      },
    ],
  },
  retention: {
    rulerLabels: ["00:00", "00:10", "00:20", "00:30"],
    tracks: [
      {
        type: "video",
        lane: "V1",
        clips: [
          { left: 6, width: 24, title: "Intro" },
          { left: 34, width: 18, hot: true, title: "Pattern" },
          { left: 56, width: 36, title: "Story" },
        ],
      },
      {
        type: "video",
        lane: "V2",
        clips: [
          { left: 14, width: 16, title: "Text" },
          { left: 52, width: 18, title: "Cut" },
          { left: 72, width: 20, hot: true, title: "SFX" },
        ],
      },
      {
        type: "audio",
        lane: "A1",
        wave: true,
        clips: [{ left: 8, width: 84, title: "Music Bed" }],
      },
    ],
  },
  distribution: {
    rulerLabels: ["Captions", "Cutdowns", "Chapters", "Upload"],
    tracks: [
      {
        type: "video",
        lane: "V1",
        clips: [
          { left: 8, width: 22, hot: true, title: "Subs" },
          { left: 34, width: 20, title: "Shorts" },
          { left: 58, width: 30, title: "Chapters" },
        ],
      },
      {
        type: "video",
        lane: "V2",
        clips: [
          { left: 14, width: 14, title: "QC" },
          { left: 40, width: 14, title: "Export" },
          { left: 62, width: 18, hot: true, title: "Upload" },
        ],
      },
      {
        type: "audio",
        lane: "A1",
        wave: true,
        clips: [{ left: 10, width: 80, title: "Metadata" }],
      },
    ],
  },
};

function VideoTimeline({ preset = "growth", className = "" }) {
  const cfg = TIMELINE_PRESETS[preset] || TIMELINE_PRESETS.growth;

  return (
    <div className={`ss-tl ${className}`} aria-hidden="true">
      <div className="ss-tlHud" />

      {/* Time ruler (NLE-style) */}
      <div className="ss-tlRuler">
        <div className="ss-tlRulerBar" />
        <div className="ss-tlLabels">
          {cfg.rulerLabels.map((t, idx) => {
            const left = (idx / (cfg.rulerLabels.length - 1 || 1)) * 100;
            return (
              <span key={t} className="ss-tlLabel" style={{ left: `${left}%` }}>
                {t}
              </span>
            );
          })}
        </div>
      </div>

      {/* Tracks */}
      <div className="ss-tlTracks">
        {cfg.tracks.map((track, i) => {
          const isAudio = track?.type === "audio";
          const laneLabel = track?.lane || (isAudio ? "A1" : i === 0 ? "V1" : "V2");

          return (
            <div
              key={`lane-${i}`}
              className={`ss-tlTrack ${isAudio ? "ss-tlTrackAudio" : "ss-tlTrackVideo"}`}
            >
              <div className="ss-tlLane" aria-hidden="true">
                {laneLabel}
              </div>

              <div className="ss-tlTrackInner">
                {isAudio ? (
                  <div className="ss-wave" aria-hidden="true">
                    <span className="ss-waveFill" />
                    <span className="ss-waveCuts" />
                  </div>
                ) : (
                  (track?.clips || []).map((clip, idx) => (
                    <div
                      key={`${track?.lane || i}-${idx}`}
                      className={`ss-clip ${clip.hot ? "ss-clipHot" : ""}`}
                      style={{ left: `${clip.left}%`, width: `${clip.width}%` }}
                    >
                      <span className="ss-clipHandle ss-clipHandleL" />
                      <span className="ss-clipHandle ss-clipHandleR" />
                      <span className="ss-clipTitle">{clip.title || (clip.hot ? "KEY" : "CLIP")}</span>
                      {/* Diagonal stripes + tiny "cuts" to feel like an NLE timeline */}
                      <span className="ss-clipStripe" />
                      <span className="ss-clipCuts" aria-hidden="true" />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Playhead */}
      <div className="ss-playheadWrap">
        <span className="ss-playhead" />
        <span className="ss-playheadGlow" />
        <span className="ss-playheadTop" />
      </div>
    </div>
  );
}

function PreviewCard({ title, badge, subtitle, points, icon: Icon }) {
  const preset = useMemo(() => {
    const t = (title || "").toLowerCase();
    if (t.includes("packaging")) return "packaging";
    if (t.includes("retention")) return "retention";
    if (t.includes("distribution")) return "distribution";
    return "growth";
  }, [title]);

  return (
    <div className="ss-card rounded-2xl border p-5">
      <div className="ss-cardHud" aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex items-center justify-center rounded-xl"
            style={{
              width: 46,
              height: 46,
              background: "rgba(232,80,2,0.12)",
              border: "1px solid rgba(232,80,2,0.25)",
            }}
          >
            <Icon size={18} style={{ color: "var(--orange)" }} />
          </span>

          <div className="min-w-0">
            <div className="font-semibold text-base" style={{ color: "var(--text)" }}>
              {title}
            </div>
            <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {subtitle}
            </div>
          </div>
        </div>

        {badge ? (
          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold border"
            style={{
              color: "var(--text)",
              borderColor: "var(--border)",
              background: "rgba(0,0,0,0.45)",
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <VideoTimeline preset={preset} className="mt-4" />

      <ul className="mt-4 grid gap-2.5">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-muted)" }}>
            <span
              className="mt-[7px] inline-block rounded-full"
              style={{
                width: 7,
                height: 7,
                background: "var(--orange)",
                boxShadow: "0 0 0 5px rgba(232,80,2,0.10)",
              }}
            />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------ Main Component ------------------------------ */

export default function HeroSection({ isDark, onAudit, workTargetId = "work" }) {
  // Brand palette ONLY
  const brand = {
    orange: "#E85002",
    black: "#000000",
    darkGray: "#333333",
    gray: "#646464",
    lightGray: "#A7A7A7",
    white: "#F9F9F9",
    red1: "#C10B01",
    orange2: "#F16001",
    orange3: "#DC3A0B",
  };

  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isCoarsePointer = useMediaQuery("(pointer: coarse)");

  const sectionRef = useRef(null);
  const isVisible = useIsInViewport(sectionRef);

  const [tier, setTier] = useState("growing");

  // Use springs for smooth, CPU-friendly parallax
  const springConfig = { damping: 25, stiffness: 150, mass: 0.5 };

  const springX = useSpring(0, springConfig);
  const springY = useSpring(0, springConfig);

  useEffect(() => {
    if (prefersReducedMotion || isCoarsePointer) return;
    if (!isVisible) return;

    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;
      springX.set(x * 20);
      springY.set(y * 15);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [prefersReducedMotion, isCoarsePointer, isVisible, springX, springY]);

  const content = useMemo(() => {
    const growing = tier === "growing";
    return {
      headline: "We Engineer YouTube Growth",
      accent: "CTR + Retention + Consistency",
      subheadline:
        "Premium AI-accelerated editing, packaging, and strategy — polished by human editors — built for creators who want measurable growth, not cheap edits.",
      qualifier: growing
        ? "Built for Growing creators (10k–100k) — creators ready to invest in packaging + retention."
        : "Built for Serious creators (100k–1M) — teams who want reliable systems, speed, and predictable growth.",
    };
  }, [tier]);

  const featureChips = useMemo(
    () => [
      { label: "CTR-first Thumbnails", icon: ImageIcon },
      { label: "Auto Captions + Transcripts", icon: Captions },
      { label: "Hook & Script Drafts", icon: ScrollText },
      { label: "Voice Pickups (opt-in)", icon: Mic2 },
      { label: "Consent-first Face Features", icon: UserCheck },
      { label: "Style-matched Transitions", icon: Wand2 },
    ],
    []
  );

  const previewCards = useMemo(
    () => [
      {
        title: "Growth System Preview",
        badge: "AI-first • human-polished",
        subtitle: "what you get every week (simple + measurable)",
        icon: Sparkles,
        points: [
          "Packaging aligned to your hook (title + thumb)",
          "Retention tightening + dead-air removal",
          "Shorts-ready exports + upload checklist",
        ],
      },
      {
        title: "Packaging Sprint",
        badge: "AI-first • human-polished",
        subtitle: "A/B-ready when needed.",
        icon: TrendingUp,
        points: ["2–3 concepts per video", "CTR target + hypothesis", "Rapid iteration loop"],
      },
      {
        title: "Retention Edit",
        badge: "AI-first • human-polished",
        subtitle: "Pacing + clean storytelling beats.",
        icon: PlayCircle,
        points: ["First 30s tightened", "Dead-air removed", "Chapters + cues"],
      },
      {
        title: "Distribution Assets",
        badge: "AI-first • human-polished",
        subtitle: "Everything shipped with your video.",
        icon: Users,
        points: ["Auto captions + transcript", "Shorts-ready exports", "Upload checklist"],
      },
    ],
    []
  );

  const handleAudit = useCallback(() => {
    emitAnalytics({ ev: "cta_click_audit", src: "hero", tier });
    if (onAudit) onAudit();
  }, [onAudit, tier]);

  const handleSeeWork = useCallback(
    (e) => {
      e.preventDefault();
      emitAnalytics({ ev: "see_work", src: "hero", tier });
      const el = document.getElementById(workTargetId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [tier, workTargetId]
  );

  // Stars: low DOM count, paused when not visible
  const sparkleStars = useMemo(() => {
    if (prefersReducedMotion) return [];
    if (typeof window === "undefined") return [];

    const w = window.innerWidth || 1200;
    const base = w < 420 ? 10 : w < 768 ? 14 : 18;

    return Array.from({ length: base }).map((_, i) => {
      const top = 8 + ((i * 17 + 11) % 84);
      const left = 6 + ((i * 29 + 7) % 90);
      const size = 6 + ((i * 3) % 7);
      const delay = (i * 0.29) % 2.8;
      const drift = (i % 2 ? 1 : -1) * (10 + (i % 4) * 3);
      const spd = 2.4 + ((i % 5) * 0.35);
      const opacity = 0.30 + ((i % 4) * 0.12);
      return { top, left, size, delay, drift, spd, opacity };
    });
  }, [prefersReducedMotion]);

  // Motion (light)
  const container = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: "easeOut", staggerChildren: prefersReducedMotion ? 0 : 0.06 },
    },
  };
  const item = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
  };

  return (
    <section
      id="home"
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{
        ["--orange"]: brand.orange,
        ["--text"]: brand.white,
        ["--text-muted"]: "rgba(249,249,249,0.72)",
        ["--border"]: "rgba(249,249,249,0.10)",
        ["--surface"]: "rgba(0,0,0,0.60)",
        ["--surface2"]: "rgba(0,0,0,0.40)",
        background: `
          radial-gradient(1200px 650px at 18% 20%, rgba(232,80,2,0.10), transparent 60%),
          radial-gradient(900px 520px at 84% 40%, rgba(193,11,1,0.07), transparent 58%),
          radial-gradient(900px 520px at 50% 105%, rgba(232,80,2,0.06), transparent 62%),
          #000
        `,
      }}
      aria-label="Shinel Studios Hero"
    >
      {/* Cinematic lens bloom + glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true" data-animate={isVisible ? "1" : "0"}>
        <div className="ss-lensBloom" />
        <div className="ss-lensStreak" />
        <div className="ss-hudNoise" />
      </div>

      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.055]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(249,249,249,0.65) 1px, transparent 1px), linear-gradient(90deg, rgba(249,249,249,0.65) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 0%, transparent 72%)",
        }}
      />

      {/* Stars */}
      {!prefersReducedMotion && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <motion.div
            className="absolute inset-0"
            style={{
              x: springX,
              y: springY,
            }}
          >
            {sparkleStars.map((s, idx) => (
              <span
                key={idx}
                className="ss-sparkle"
                style={{
                  top: `${s.top}%`,
                  left: `${s.left}%`,
                  ["--s"]: `${s.size}px`,
                  ["--delay"]: `${s.delay}s`,
                  ["--drift"]: `${s.drift}px`,
                  ["--spd"]: `${s.spd}s`,
                  opacity: s.opacity,
                }}
                data-animate={isVisible ? "1" : "0"}
              />
            ))}
          </motion.div>
        </div>
      )}

      {/* HUD frame overlay */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="ss-hudFrame" data-animate={isVisible ? "1" : "0"} />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-[1] container mx-auto px-4"
        variants={container}
        initial="hidden"
        animate="visible"
        style={{
          paddingTop: "clamp(74px, 9vw, 138px)",
          paddingBottom: "clamp(40px, 7vw, 92px)",
          minHeight: "100svh",
        }}
      >
        {/* Top status pill */}
        <motion.div
          variants={item}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 border"
          style={{
            borderColor: "var(--border)",
            background: "rgba(0,0,0,0.58)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
          }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="ss-ping absolute inline-flex h-full w-full rounded-full" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "var(--orange)" }} />
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Now accepting new projects
          </span>
        </motion.div>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          {/* Left column */}
          <div className="min-w-0">
            {/* Social proof bar */}
            <motion.div
              variants={item}
              className="inline-flex items-center gap-3 rounded-full px-4 py-2 border"
              style={{
                borderColor: "var(--border)",
                background: "rgba(0,0,0,0.56)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                <BadgeCheck size={16} style={{ color: "var(--orange)" }} />
                Proven Results
              </span>
              <span style={{ width: 1, height: 18, background: "rgba(249,249,249,0.10)" }} />
              <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                <Users size={16} style={{ color: "var(--orange)" }} />
                9+ Creators
              </span>
              <span style={{ width: 1, height: 18, background: "rgba(249,249,249,0.10)" }} />
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <TrendingUp size={16} style={{ color: "var(--orange)" }} />
                <span style={{ color: "var(--orange)" }}>288.7K+</span>
                <span style={{ color: "var(--text-muted)" }}>Combined Reach</span>
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={item}
              className="mt-6 font-extrabold tracking-tight"
              style={{
                color: "var(--text)",
                lineHeight: 1.03,
                letterSpacing: "-0.03em",
                fontSize: "clamp(2.2rem, 6.2vw, 4.6rem)",
                maxWidth: "22ch",
                textWrap: "balance",
              }}
            >
              <span className="block">{content.headline}</span>
              <span
                className="block mt-2 ss-accent"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${brand.orange} 0%, ${brand.orange2} 55%, ${brand.orange3} 100%)`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                — {content.accent}
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={item}
              className="mt-5"
              style={{
                color: "var(--text-muted)",
                fontSize: "clamp(1.02rem, 2.0vw, 1.2rem)",
                lineHeight: 1.7,
                maxWidth: "62ch",
              }}
            >
              {content.subheadline}
            </motion.p>

            {/* Tier toggle */}
            <motion.div variants={item} className="mt-6 flex items-center gap-3 flex-wrap">
              <TierToggle value={tier} onChange={setTier} />
              <span
                className="rounded-full px-4 py-2 border text-sm"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  background: "rgba(0,0,0,0.56)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                }}
              >
                {content.qualifier}
              </span>
            </motion.div>

            {/* CTAs */}
            <motion.div variants={item} className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
              <button
                type="button"
                onClick={handleAudit}
                className="ss-cta-primary ss-btn-pulse w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 font-bold"
                aria-label="Book a Free Growth Audit"
              >
                Book a Free Growth Audit
                <ArrowRight size={18} />
                <span className="ss-cta-shine" aria-hidden="true" />
              </button>

              <a
                href={`#${workTargetId}`}
                onClick={handleSeeWork}
                className="ss-cta-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 font-bold border"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  background: "rgba(0,0,0,0.56)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                }}
                aria-label="See Work"
              >
                See Work <ChevronDown size={18} />
              </a>
            </motion.div>

            {/* Policy note */}
            <motion.p variants={item} className="mt-4 text-xs" style={{ color: "rgba(249,249,249,0.62)" }}>
              Face/voice features are offered only with creator consent and platform-policy compliance. We keep brand
              safety + channel integrity first.
            </motion.p>

            {/* Features: mobile swipe / desktop wrap (NO desktop scroll) */}
            <motion.div variants={item} className="mt-6">
              <div className="ss-featureWrap" aria-label="Features">
                {featureChips.map((c) => (
                  <FeatureChip key={c.label} icon={c.icon} label={c.label} />
                ))}
              </div>
              <div className="mt-2 text-xs ss-swipeHint" style={{ color: "rgba(249,249,249,0.55)" }}>
                Tip: swipe on mobile to see all features.
              </div>
            </motion.div>

            {/* Stats: grid (no scroll) */}
            <motion.div variants={item} className="mt-6 grid gap-3 md:grid-cols-3">
              <StatCard icon={TrendingUp} value="Rated 4.7/5" label="Client satisfaction" />
              <StatCard icon={Users} value="20+ active clients" label="Across niches" />
              <StatCard icon={PlayCircle} value="7M+ views driven" label="For clients" />
            </motion.div>
          </div>

          {/* Right column */}
          <motion.div variants={item} className="min-w-0">
            {/* Desktop grid */}
            <div className="hidden lg:grid gap-4">
              <PreviewCard {...previewCards[0]} />
              <PreviewCard {...previewCards[1]} />
              <PreviewCard {...previewCards[2]} />
            </div>

            {/* Mobile swipe cards */}
            <div className="lg:hidden">
              <div className="text-xs mb-2" style={{ color: "rgba(249,249,249,0.55)" }}>
                Swipe cards → to preview the system.
              </div>

              <div className="ss-cards" aria-label="System preview cards">
                {previewCards.map((c) => (
                  <div key={c.title} className="ss-cardSnap">
                    <PreviewCard {...c} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ------------------------------ Local CSS ------------------------------ */}
      <style>{`
        /* ---------- Premium cinematic bloom + HUD ---------- */
        .ss-lensBloom{
          position:absolute; inset:-30%;
          background:
            radial-gradient(700px 500px at 22% 22%, rgba(232,80,2,0.18), transparent 62%),
            radial-gradient(520px 420px at 76% 34%, rgba(193,11,1,0.10), transparent 60%),
            radial-gradient(640px 520px at 55% 85%, rgba(232,80,2,0.10), transparent 62%);
          filter: blur(34px);
          opacity: .82;
          transform: translateZ(0);
          animation: ss-bloom 12s ease-in-out infinite;
        }
        .ss-lensStreak{
          position:absolute; inset:-10%;
          background: linear-gradient(115deg, rgba(249,249,249,0) 40%, rgba(249,249,249,0.06) 50%, rgba(249,249,249,0) 60%);
          filter: blur(10px);
          opacity:.9;
          transform: translate3d(-12%, -6%, 0) rotate(-6deg);
          animation: ss-streak 9.5s ease-in-out infinite;
        }
        .ss-hudNoise{
          position:absolute; inset:0;
          background: repeating-linear-gradient(to bottom, rgba(249,249,249,0.00), rgba(249,249,249,0.00) 10px, rgba(249,249,249,0.025) 11px);
          opacity: .06;
          mask-image: radial-gradient(ellipse 70% 55% at 50% 42%, black 0%, transparent 74%);
          animation: ss-scan 6.8s linear infinite;
        }
        @keyframes ss-bloom{
          0%,100% { transform: translate3d(0,0,0) scale(1); opacity:.78; }
          50% { transform: translate3d(0,-10px,0) scale(1.03); opacity:.88; }
        }
        @keyframes ss-streak{
          0%,100% { transform: translate3d(-12%, -6%, 0) rotate(-6deg); opacity:.55; }
          50% { transform: translate3d(12%, 6%, 0) rotate(-6deg); opacity:.95; }
        }
        @keyframes ss-scan{
          0% { background-position: 0 0; }
          100% { background-position: 0 70px; }
        }
        [data-animate="0"] .ss-lensBloom,
        [data-animate="0"] .ss-lensStreak,
        [data-animate="0"] .ss-hudNoise{
          animation:none !important;
          opacity:.30;
        }

        .ss-hudFrame{
          position:absolute; inset:18px;
          border: 1px solid rgba(249,249,249,0.06);
          border-radius: 24px;
          mask-image: radial-gradient(ellipse 75% 55% at 50% 42%, black 0%, transparent 72%);
        }
        .ss-hudFrame:before,
        .ss-hudFrame:after{
          content:"";
          position:absolute;
          inset:12px;
          border-radius: 18px;
          border: 1px solid rgba(232,80,2,0.08);
          box-shadow: 0 0 0 1px rgba(232,80,2,0.04) inset;
          opacity:.8;
        }
        .ss-hudFrame:after{
          inset:12px;
          border-style:dashed;
          border-width:1px;
          border-color: rgba(232,80,2,0.10);
          animation: ss-hudDash 12s linear infinite;
          opacity:.55;
        }
        @keyframes ss-hudDash{
          0% { filter: drop-shadow(0 0 0 rgba(232,80,2,0)); }
          100% { filter: drop-shadow(0 0 0 rgba(232,80,2,0)); }
        }
        [data-animate="0"].ss-hudFrame:after{ animation:none !important; opacity:.25; }

        /* ---------- CTA ---------- */
        .ss-cta-primary{
          position:relative;
          background: linear-gradient(135deg, ${brand.orange} 0%, ${brand.orange2} 55%, ${brand.orange3} 100%);
          color:#000;
          box-shadow: 0 18px 70px rgba(232,80,2,0.22);
          overflow:hidden;
          transform: translateZ(0);
        }
        .ss-cta-primary:active{ transform: translateY(1px); }
        .ss-cta-primary:hover{ filter: brightness(1.03); }
        .ss-cta-shine{
          position:absolute;
          inset:-30%;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.28) 45%, rgba(255,255,255,0) 80%);
          transform: translateX(-60%) rotate(12deg);
          filter: blur(10px);
          opacity:.95;
          animation: ss-shine 3.2s ease-in-out 1.1s infinite;
          pointer-events:none;
        }
        @keyframes ss-shine{
          0%{ transform: translateX(-60%) rotate(12deg); opacity:0; }
          12%{ opacity:1; }
          60%{ opacity:1; }
          100%{ transform: translateX(60%) rotate(12deg); opacity:0; }
        }
        .ss-cta-secondary:hover{
          border-color: rgba(232,80,2,0.35) !important;
          box-shadow: 0 18px 60px rgba(0,0,0,0.25);
          transform: translateY(-1px);
          transition: transform 180ms ease;
        }

        /* ---------- Features: Mobile swipe, Desktop wrap ---------- */
        .ss-featureWrap{
          display:flex;
          gap:10px;
          overflow-x:auto;
          padding-bottom:6px;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x proximity;
          scrollbar-width:none;
          mask-image: linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%);
        }
        .ss-featureWrap::-webkit-scrollbar{ display:none; }
        .ss-chip{ scroll-snap-align:start; }

        /* Desktop: wrap, NO scroll */
        @media (min-width: 768px){
          .ss-featureWrap{
            overflow: visible;
            flex-wrap: wrap;
            mask-image: none;
          }
          .ss-swipeHint{ display:none; }
        }

        /* ---------- Cards: Mobile swipe only ---------- */
        .ss-cards{
          display:grid;
          grid-auto-flow: column;
          grid-auto-columns: 88%;
          gap: 14px;
          overflow-x:auto;
          padding-bottom: 6px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width:none;
          mask-image: linear-gradient(90deg, transparent 0%, black 9%, black 91%, transparent 100%);
        }
        .ss-cards::-webkit-scrollbar{ display:none; }
        .ss-cardSnap{ scroll-snap-align: start; }

        /* Desktop: no horizontal scroll — show the system cards as a clean 3-up grid */
        @media (min-width: 1024px){
          .ss-cards{
            grid-auto-flow: initial;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            overflow: visible;
            scroll-snap-type: none;
            mask-image: none;
          }
          .ss-cardSnap{ scroll-snap-align: none; }
        }

        /* ---------- Preview card premium HUD + timeline vibe ---------- */
        .ss-card{
          position:relative;
          border-color: rgba(249,249,249,0.10);
          background: rgba(0,0,0,0.58);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 18px 60px rgba(0,0,0,0.22);
          transform: translateZ(0);
          transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
        }
        .ss-card:hover{
          transform: translateY(-2px);
          border-color: rgba(232,80,2,0.22);
          box-shadow: 0 26px 80px rgba(0,0,0,0.28);
        }
        .ss-cardHud{
          position:absolute;
          inset:12px;
          border-radius: 18px;
          border: 1px solid rgba(232,80,2,0.08);
          pointer-events:none;
        }
        .ss-cardHud:before,
        .ss-cardHud:after{
          content:"";
          position:absolute;
          inset:-1px;
          border-radius: 18px;
          pointer-events:none;
        }
        .ss-cardHud:before{
          border: 1px dashed rgba(232,80,2,0.16);
          opacity:.35;
          animation: ss-outline 10s linear infinite;
        }
        .ss-cardHud:after{
          background: radial-gradient(240px 160px at 20% 10%, rgba(232,80,2,0.14), transparent 60%);
          filter: blur(14px);
          opacity:.65;
        }
        @keyframes ss-outline{
          0% { opacity:.26; }
          50% { opacity:.45; }
          100% { opacity:.26; }
        }

        /* ---------- Cinematic video-editing timeline ---------- */
        .ss-tl{
          position:relative;
          border-radius: 16px;
          padding: 10px 10px 12px;
          border: 1px solid rgba(249,249,249,0.10);
          background:
            linear-gradient(180deg, rgba(0,0,0,0.40), rgba(0,0,0,0.20));
          overflow:hidden;
          transform: translateZ(0);
        }
        .ss-tl:before{
          content:"";
          position:absolute;
          inset: 0;
          background: radial-gradient(280px 180px at 20% 0%, rgba(232,80,2,0.10), transparent 62%);
          pointer-events:none;
        }

        .ss-tlRuler{
          position:relative;
          height: 22px;
          border-radius: 14px;
          border: 1px solid rgba(249,249,249,0.10);
          background: rgba(0,0,0,0.22);
          overflow:hidden;
        }
        .ss-tlRulerBar{
          position:absolute;
          inset: 0;
          background:
            /* main ticks */
            repeating-linear-gradient(90deg,
              rgba(249,249,249,0.18) 0 1px,
              transparent 1px 10px),
            /* major ticks */
            repeating-linear-gradient(90deg,
              rgba(249,249,249,0.30) 0 1px,
              transparent 1px 40px),
            linear-gradient(180deg, rgba(249,249,249,0.07), rgba(0,0,0,0));
          opacity: .65;
          pointer-events:none;
        }
        .ss-tlLabel{
          position:absolute;
          top: 2px;
          font-size: 10.5px;
          letter-spacing: 0.02em;
          color: rgba(249,249,249,0.62);
          transform: translateX(-50%);
          user-select:none;
          white-space:nowrap;
        }

        .ss-tlTracks{
          position:relative;
          margin-top: 10px;
          display:grid;
          gap: 8px;
        }

        .ss-tlTrack{
          position:relative;
          border-radius: 14px;
          border: 1px solid rgba(249,249,249,0.10);
          background: rgba(0,0,0,0.22);
          overflow:hidden;
        }

        .ss-tlTrackVideo{ height: 26px; }
        .ss-tlTrackAudio{ height: 22px; }

        .ss-tlTrack:before{
          /* NLE grid + scanlines */
          content:"";
          position:absolute;
          inset:0;
          background:
            repeating-linear-gradient(90deg, rgba(249,249,249,0.05) 0 1px, transparent 1px 22px),
            repeating-linear-gradient(180deg, rgba(249,249,249,0.04) 0 1px, transparent 1px 6px);
          opacity:.55;
          pointer-events:none;
        }

        .ss-tlLane{
          position:absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 18px;
          border-radius: 10px;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size: 10px;
          letter-spacing: 0.06em;
          color: rgba(249,249,249,0.60);
          border: 1px solid rgba(249,249,249,0.10);
          background: rgba(0,0,0,0.35);
          user-select:none;
        }

        .ss-tlTrackInner{
          position:relative;
          height: 100%;
          margin-left: 44px; /* lane gutter */
          margin-right: 8px;
        }

        .ss-clip{
          position:absolute;
          top: 4px;
          height: calc(100% - 8px);
          border-radius: 12px;
          border: 1px solid rgba(249,249,249,0.14);
          background:
            linear-gradient(180deg, rgba(249,249,249,0.08), rgba(249,249,249,0.02));
          box-shadow: 0 12px 26px rgba(0,0,0,0.20);
          overflow:hidden;
          transform: translateZ(0);
        }

        /* top "clip header" bar */
        .ss-clip:before{
          content:"";
          position:absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 8px;
          background: linear-gradient(90deg, rgba(232,80,2,0.32), rgba(232,80,2,0.06));
          opacity: .55;
        }

        /* diagonal stripes (subtle motion-graphics vibe) */
        .ss-clipStripe{
          position:absolute;
          inset: 0;
          background: repeating-linear-gradient(135deg, rgba(249,249,249,0.08) 0 6px, transparent 6px 12px);
          opacity: .18;
          mask-image: linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%);
          pointer-events:none;
        }

        .ss-clipTitle{
          position:absolute;
          left: 10px;
          top: 9px;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: rgba(249,249,249,0.70);
          text-transform: uppercase;
          user-select:none;
        }

        .ss-clipHot{
          border-color: rgba(232,80,2,0.28);
          background:
            linear-gradient(180deg, rgba(232,80,2,0.22), rgba(232,80,2,0.08));
          box-shadow: 0 14px 28px rgba(0,0,0,0.22), 0 0 0 1px rgba(232,80,2,0.10) inset;
          animation: ss-clipPulse 3.8s ease-in-out infinite;
        }
        @keyframes ss-clipPulse{
          0%, 100%{ box-shadow: 0 14px 28px rgba(0,0,0,0.22), 0 0 0 1px rgba(232,80,2,0.10) inset; }
          50%{ box-shadow: 0 16px 32px rgba(0,0,0,0.26), 0 0 18px rgba(232,80,2,0.12), 0 0 0 1px rgba(232,80,2,0.14) inset; }
        }

        .ss-wave{
          position:absolute;
          inset: 4px;
          border-radius: 12px;
          background:
            /* waveform blocks */
            repeating-linear-gradient(90deg, rgba(232,80,2,0.72) 0 2px, transparent 2px 7px),
            linear-gradient(180deg, rgba(232,80,2,0.12), rgba(0,0,0,0));
          opacity: .28;
          filter: blur(0.15px);
          pointer-events:none;
          mask-image: linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%);
        }

        /* tiny shimmer on waveform (very light) */
        .ss-wave:after{
          content:"";
          position:absolute;
          inset:0;
          background: linear-gradient(90deg, transparent 0%, rgba(249,249,249,0.16) 50%, transparent 100%);
          transform: translateX(-120%);
          animation: ss-waveSweep 4.6s ease-in-out infinite;
          opacity:.55;
        }
        @keyframes ss-waveSweep{
          0%{ transform: translateX(-120%); }
          60%{ transform: translateX(120%); }
          100%{ transform: translateX(120%); }
        }

        .ss-playheadWrap{
          position:absolute;
          inset: 0;
          pointer-events:none;
        }
        .ss-playhead{
          position:absolute;
          left: 18%;
          top: 26px;
          bottom: 10px;
          width: 2px;
          background: rgba(232,80,2,0.96);
          box-shadow: 0 0 18px rgba(232,80,2,0.35);
          transform: translateZ(0);
          will-change: transform;
          animation: ss-tlPlay 6.6s ease-in-out infinite;
        }
        .ss-playheadGlow{
          position:absolute;
          left: 18%;
          top: 26px;
          bottom: 10px;
          width: 24px;
          transform: translateX(-11px);
          background: radial-gradient(circle, rgba(232,80,2,0.22), rgba(232,80,2,0));
          filter: blur(2px);
          opacity:.7;
          animation: ss-tlPlay 6.6s ease-in-out infinite;
        }
        .ss-playheadTop{
          position:absolute;
          left: 18%;
          top: 18px;
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 10px solid rgba(232,80,2,0.92);
          transform: translateX(-6px);
          filter: drop-shadow(0 0 10px rgba(232,80,2,0.25));
          animation: ss-tlPlay 6.6s ease-in-out infinite;
        }
        @keyframes ss-tlPlay{
          0%   { transform: translateX(0); opacity:.55; }
          55%  { transform: translateX(320%); opacity:1; }
          100% { transform: translateX(0); opacity:.55; }
        }

        /* Pause heavy loops when hero not visible */
        [data-animate="0"] .ss-playhead,
        [data-animate="0"] .ss-playheadGlow,
        [data-animate="0"] .ss-playheadTop,
        [data-animate="0"] .ss-clipHot,
        [data-animate="0"] .ss-wave:after,
        [data-animate="0"] .ss-cardHud:before{
          animation:none !important;
          opacity:.25;
        }

        @media (prefers-reduced-motion: reduce){
          .ss-playhead,
          .ss-playheadGlow,
          .ss-playheadTop,
          .ss-clipHot,
          .ss-wave:after,
          .ss-cardHud:before{
            animation:none !important;
          }
        }

        /* ---------- Sparkles ---------- */
        .ss-sparkle{
          position:absolute;
          width: var(--s);
          height: var(--s);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(249,249,249,0.92), rgba(232,80,2,0.22) 55%, rgba(232,80,2,0) 70%);
          box-shadow: 0 0 22px rgba(232,80,2,0.12);
          transform: translateZ(0);
          animation: ss-drift var(--spd) ease-in-out var(--delay) infinite;
        }
        .ss-sparkle[data-animate="0"]{ animation:none !important; opacity:.18; }
        @keyframes ss-drift{
          0%,100%{ transform: translate3d(0,0,0); opacity:.55; }
          50%{ transform: translate3d(var(--drift), -10px, 0); opacity:.9; }
        }

        /* Ping dot */
        .ss-ping{
          background: ${brand.orange};
          opacity: 0.35;
          border-radius: 999px;
          animation: ss-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
        }
        @keyframes ss-ping{
          0%{ transform: scale(1); opacity: 0.55; }
          80%{ transform: scale(2.2); opacity: 0; }
          100%{ transform: scale(2.2); opacity: 0; }
        }

        .ss-btn-pulse {
          animation: ss-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes ss-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.02); }
        }

        /* Reduced motion: kill looping animations */
        @media (prefers-reduced-motion: reduce){
          .ss-lensBloom, .ss-lensStreak, .ss-hudNoise, .ss-sparkle, .ss-cta-shine, .ss-playhead, .ss-cardHud:before, .ss-btn-pulse {
            animation: none !important;
          }
          .ss-card:hover{ transform:none; }
        }
      `}</style>
    </section>
  );
}
