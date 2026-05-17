import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
// [NEW] Imported new icons for social proof
import { CheckCircle2, Users, TrendingUp, Youtube, Instagram } from "lucide-react";
import { LazyImage } from "./ProgressiveImage";
import { useClientStats } from "../context/ClientStatsContext";
import { useGlobalConfig } from "../context/GlobalConfigContext";
import { AUTH_BASE } from "../config/constants";

/**
 * Reusable, responsive, auto-scrolling marquee for "Creators Worked With".
 */

// Helper to find asset URL from a glob map
function findAssetByBase(base, globMap) {
  const needle = base.toLowerCase();
  for (const path in globMap) {
    const file = path.split("/").pop().toLowerCase();
    const noExt = file.replace(/\.(png|jpg|jpeg|webp|svg)$/, "");
    if (noExt === needle || noExt.startsWith(needle)) return globMap[path];
  }
  return null;
}

// Format subscriber count
function formatSubs(n) {
  if (n == null) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}K`;
  return String(n);
}

// Deterministic color from a string — used to give the avatar fallback
// (when no real image is available) a distinct gradient per channel, so
// Kamz's 3 separate channels don't all render as the same dark "K" tile.
function colorFromString(str) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
  const hue = Math.abs(hash) % 360;
  return { from: `hsl(${hue} 65% 22%)`, to: `hsl(${(hue + 35) % 360} 70% 38%)` };
}

// Round-robin interleave: given a flat list sorted by reach, reorder so two
// cards from the same client are never adjacent. Big channels still float
// near the front; small ones still trail; but a multi-channel creator like
// Kamz won't dominate a 4-card visual stretch anymore.
function interleaveByClient(items) {
  if (!items || items.length < 2) return items;
  const buckets = new Map();
  for (const it of items) {
    const k = `${it.client_id ?? "x"}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(it);
  }
  // Each bucket is already in reach-DESC order (input is pre-sorted).
  const queues = Array.from(buckets.values());
  // Order client-queues by their best-reach card so high-reach clients lead.
  queues.sort((a, b) => {
    const av = Math.max(...a.map((x) => x.subscribers || x.followers || 0));
    const bv = Math.max(...b.map((x) => x.subscribers || x.followers || 0));
    return bv - av;
  });
  const out = [];
  let drained = 0;
  while (drained < items.length) {
    for (const q of queues) {
      if (q.length) { out.push(q.shift()); drained++; }
    }
  }
  return out;
}

// Creator badge — avatar + name + tiny platform glyph + count (when known).
//
// Per founder feedback (May 2026):
//  - Drop the category pill — visual clutter, not relevant to visitors.
//  - Keep sub/follower count BUT only when we actually have a real number
//    (fetched from YouTube API or manually entered). A literal "0" reads as
//    a dead channel, so we hide the count entirely if subs/followers is 0
//    or null. Card still appears (the founder wants every client surface
//    visible regardless of whether we manage it) — just without the count.
const CreatorBadge = React.memo(({ creator, isHovered }) => {
  const [imageError, setImageError] = useState(false);
  const isYT = creator.platform === "youtube" || creator.subs != null;
  const isIG = creator.platform === "instagram" || creator.igFollowers != null;
  const PlatformIcon = isIG ? Instagram : isYT ? Youtube : null;
  const hasYtCount = creator.subs != null && creator.subs > 0;
  const hasIgCount = creator.igFollowers != null && creator.igFollowers > 0;
  const hasAnyCount = hasYtCount || hasIgCount;

  // Per-channel deterministic gradient so when no real avatar is available,
  // Kamz's @inkboymusik card visually differs from @kamzinkzonetattoosacademy.
  // Color is derived from the channel handle when present, else the name.
  const fallbackKey = creator.handle || creator.name || "";
  const fallback = useMemo(() => colorFromString(fallbackKey), [fallbackKey]);
  const fallbackStyle = {
    background: `linear-gradient(135deg, ${fallback.from} 0%, ${fallback.to} 100%)`,
  };
  // Take initials from the handle if it exists (more distinctive), else
  // first two letters of the name.
  const initials = useMemo(() => {
    const src = (creator.handle || creator.name || "C").replace(/^@/, "").replace(/[^a-zA-Z]/g, "");
    return (src.slice(0, 2) || "C").toUpperCase();
  }, [creator.handle, creator.name]);

  return (
    <>
      <span
        className="cw-avatar flex items-center justify-center text-sm font-extrabold text-white"
        style={!creator.url || imageError ? fallbackStyle : undefined}
      >
        {creator.url && !imageError ? (
          <LazyImage
            src={creator.url}
            alt={`${creator.name} logo`}
            width="48"
            height="48"
            className="w-full h-full object-cover"
            style={{ filter: isHovered ? "grayscale(0)" : undefined }}
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="relative z-10 tracking-tight">{initials}</span>
        )}
        <span className="cw-ring" style={{ borderColor: isHovered ? creator.color : "transparent" }} />
        {/* Small platform glyph in the bottom-right corner of the avatar */}
        {PlatformIcon && (
          <span className="cw-badge" aria-label={isIG ? "Instagram" : "YouTube"}>
            <PlatformIcon size={10} color="white" strokeWidth={2.5} />
          </span>
        )}
      </span>

      <span className="inline-flex flex-col gap-0.5 min-w-0">
        <span className="cw-title truncate">{creator.name}</span>
        {hasAnyCount && (
          <span className="cw-meta inline-flex items-center gap-1">
            {hasYtCount && (
              <>
                <Youtube size={10} className="text-red-500" />
                {formatSubs(creator.subs)}
              </>
            )}
            {hasIgCount && (
              <>
                <Instagram size={10} className="text-pink-500" />
                {formatSubs(creator.igFollowers)}
              </>
            )}
          </span>
        )}
      </span>
    </>
  );
});

// [NEW] Animation variants for staggered header
const headerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for more professional feel
    },
  },
};

const CreatorsWorkedWithMarquee = ({
  isDark,
  creators: creatorsProp,
  speedPps = 60,
  gap = 1.0,
  forceMotion = false,
  direction = 'left',
}) => {
  const { stats, totalSubscribers, totalInstagramFollowers, loading, getProxiedImage } = useClientStats();
  const { config } = useGlobalConfig();
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mediaQuery.matches);

    const handler = () => setPrefersReduced(mediaQuery.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // State
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  // Default to TRUE: the keyframes use `-50%` (not a JS-measured pixel value),
  // so animation works without prior measurement. Defaulting to false caused a
  // race where the initial render fell through to the `cw-static` class (which
  // has `flex-wrap: wrap`) and stacked Segment A + Segment B vertically into
  // two visible duplicate rows. updateMarqueeMetrics keeps this true once it
  // confirms refs are attached; it never needs to flip it false.
  const [shouldAnimate, setShouldAnimate] = useState(true);

  // Refs
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const segmentRef = useRef(null);

  // Animation state
  const [animationDuration, setAnimationDuration] = useState('30s');
  const [animationDistance, setAnimationDistance] = useState('0px');

  // Memoized handlers
  const handleMouseEnter = useCallback((key) => {
    setHoveredKey(key);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredKey(null);
  }, []);

  // Fetch the canonical "every channel + every IG account" list from the
  // worker. Each YT channel of a multi-channel client gets its own card,
  // each IG account gets its own card. Single source of truth — same
  // numbers shown here are also what the public/stats endpoint aggregates.
  const [allCreators, setAllCreators] = useState([]);
  const [creatorsLoading, setCreatorsLoading] = useState(true);
  // Public canonical stats (active_clients, total_yt_subscribers,
  // total_ig_followers, total_reach). Refreshed periodically + on focus so
  // the homepage badge bar reflects real-time numbers from D1.
  const [publicStats, setPublicStats] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`${AUTH_BASE}/admin/agency/public/creators`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((j) => { if (!cancelled) setAllCreators(j.creators || []); })
      .catch(() => { /* keep empty; falls back to legacy stats below */ })
      .finally(() => { if (!cancelled) setCreatorsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Canonical public stats — auto-refresh every 90s + on window focus, so
  // the badge bar shows live numbers without page reload.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${AUTH_BASE}/admin/agency/public/stats`);
        if (!r.ok || cancelled) return;
        const j = await r.json();
        if (!cancelled) setPublicStats(j);
      } catch {}
    };
    load();
    const interval = setInterval(load, 90_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener("focus", onFocus); };
  }, []);

  // Determine the final list of creators.
  // Per founder ask (May 2026): show EVERY active client's YT channels + IG
  // accounts regardless of whether we manage that surface, and regardless of
  // whether we have synced subscriber/follower numbers. A client we don't
  // do social-work for is still a client — they belong on the page.
  const finalCreators = useMemo(() => {
    if (creatorsProp && creatorsProp.length) return creatorsProp;

    // PRIMARY: use the per-channel list from worker (each YT and IG separately).
    if (allCreators.length > 0) {
      // Step 1: build the mapped + filtered list (name required)
      const mapped = allCreators
        .filter((c) => !!c.name)
        .map((c) => ({
          name: c.name,
          key: c.type === "youtube"
            ? `yt-${c.channel_id || c.client_id}-${(c.handle || "").toLowerCase()}`
            : `ig-${(c.handle || "").toLowerCase()}-${c.client_id}`,
          client_id: c.client_id,
          platform: c.type,
          // Real avatar from D1 (YT API logo or laptop-scraped IG profile pic).
          // Use the proxy so YT/IG CDN images don't get blocked.
          url: c.avatar_url ? getProxiedImage(c.avatar_url) : null,
          subs: c.type === "youtube" ? (c.subscribers || 0) : null,
          igFollowers: c.type === "instagram" ? (c.followers || 0) : null,
          subscribers: c.type === "youtube" ? (c.subscribers || 0) : 0,
          followers: c.type === "instagram" ? (c.followers || 0) : 0,
          handle: c.handle,
          link: c.url,
          color: "var(--orange)",
        }));

      // Step 2: belt-and-suspenders frontend dedup by key (in case backend
      // returns dupes from any future migration error).
      const seen = new Set();
      const unique = [];
      for (const m of mapped) {
        if (seen.has(m.key)) continue;
        seen.add(m.key);
        unique.push(m);
      }

      // Step 3: sort by reach DESC so highest-impact channels lead.
      unique.sort((a, b) => (b.subscribers + b.followers) - (a.subscribers + a.followers));

      // Step 4: round-robin interleave by client so Kamz's 3 channels are
      // spaced out across the strip rather than appearing back-to-back.
      return interleaveByClient(unique);
    }

    // FALLBACK: legacy useClientStats path — one card per surface we know
    // about, never gated on counts so unmanaged accounts still appear.
    if (loading || creatorsLoading) return [];
    return stats.flatMap(client => {
      const items = [];
      const primaryId = client.youtubeId || client.id;
      // Always emit a YT card if we have any YT identifier
      if (client.youtubeId || client.subscribers != null) {
        items.push({
          name: client.title, key: `${primaryId}-yt`, url: client.logo,
          platform: "youtube",
          subs: client.subscribers || 0, igFollowers: null,
          color: "var(--orange)",
        });
      }
      // Always emit an IG card if we have any IG identifier
      if (client.instagramHandle || client.instagramFollowers != null) {
        items.push({
          name: client.title, key: `${client.instagramHandle || primaryId}-ig`,
          url: client.instagramLogo || client.logo,
          platform: "instagram",
          subs: null, igFollowers: client.instagramFollowers || 0,
          color: "var(--orange)",
        });
      }
      return items;
    });
  }, [creatorsProp, allCreators, stats, loading, creatorsLoading]);

  // Canonical numbers — prefer the live public stats endpoint (refreshed
  // every 90s + on focus). Fall back to the legacy useClientStats data on
  // initial load to avoid a flash of stale or empty UI.
  const ytReach = useMemo(() => {
    if (publicStats?.total_yt_subscribers != null) return publicStats.total_yt_subscribers;
    return totalSubscribers || 0;
  }, [publicStats, totalSubscribers]);

  const igReach = useMemo(() => {
    if (publicStats?.total_ig_followers != null) return publicStats.total_ig_followers;
    return totalInstagramFollowers || 0;
  }, [publicStats, totalInstagramFollowers]);

  // Combined reach — primary headline number. Matches the cockpit Total Reach
  // tile exactly (same SUM(client_channels.subscribers) + SUM(instagram_accounts.followers)).
  const totalReach = useMemo(() => {
    if (publicStats?.total_reach != null) return publicStats.total_reach;
    return (ytReach || 0) + (igReach || 0);
  }, [publicStats, ytReach, igReach]);

  // Actual creator count = managed active clients (NOT cards — Kamz with 3
  // channels + 1 IG would otherwise inflate this to 4).
  const creatorCount = useMemo(() => {
    if (publicStats?.active_clients != null) return publicStats.active_clients;
    return stats?.length || 0;
  }, [publicStats, stats]);

  // Channel + IG counts for the breakdown line — count EVERY active surface
  // we know about (managed or not), matching what the marquee renders.
  const ytChannels = useMemo(() => allCreators.filter((c) => c.type === "youtube").length, [allCreators]);
  const igAccounts = useMemo(() => allCreators.filter((c) => c.type === "instagram").length, [allCreators]);

  const fmt = useCallback((n) => {
    if (n == null) return null;
    if (typeof n === 'string') return n; // Allow direct string strings from admin
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}K`;
    return `${n}`;
  }, []);

  const gapRem = Math.max(0.25, Number(gap));

  // Measure segment width AND container width
  useEffect(() => {
    const gapPx = { current: 0 };

    const updateMarqueeMetrics = () => {
      const seg = segmentRef.current;
      const cont = containerRef.current;
      if (!seg || !cont || typeof window === 'undefined') return;

      const segmentWidth = seg.scrollWidth;
      // Always animate when we have content. The original `segmentWidth >
      // containerWidth` overflow check was meant as a graceful fallback,
      // but it left the strip looking static whenever the visible roster
      // fit in the viewport — which is most of the time on desktop, and
      // visually reads as "broken auto-scroll". The seamless 2-segment
      // loop (Segment A + cloned Segment B) works even when one segment
      // is narrower than the container; users just see a small inter-
      // segment gap during the cycle. Reduced-motion users still get
      // the static centered layout via the `showStatic` branch below.
      setShouldAnimate(true);

      gapPx.current = parseFloat(getComputedStyle(document.documentElement).fontSize) * gapRem;

      const totalDistance = segmentWidth + gapPx.current;
      const pxPerSec = Math.max(20, Number(speedPps) || 60);
      const durationSec = totalDistance / pxPerSec;

      setAnimationDuration(`${durationSec.toFixed(3)}s`);
      setAnimationDistance(`${totalDistance.toFixed(2)}px`);
      // [FIX] Pre-calculate negative distance for iOS Safari to avoid calc() in keyframes
      if (cont) {
        cont.style.setProperty("--neg-animation-distance", `-${totalDistance.toFixed(2)}px`);
      }
    };

    const rafId = requestAnimationFrame(updateMarqueeMetrics);
    
    let ro;
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      ro = new ResizeObserver(updateMarqueeMetrics);
      if (segmentRef.current) ro.observe(segmentRef.current);
      if (containerRef.current) ro.observe(containerRef.current);
    }

    window.addEventListener('resize', updateMarqueeMetrics);

    return () => {
      cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateMarqueeMetrics);
    }
  }, [speedPps, gapRem]);

  // Pause when scrolled out of view
  useEffect(() => {
    if (!trackRef.current || typeof window === 'undefined' || !("IntersectionObserver" in window)) {
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.01 }
    );
    io.observe(trackRef.current);
    return () => io.disconnect();
  }, []);

  if (!finalCreators || finalCreators.length === 0) return null;


  // Determine animation states
  const showStatic = prefersReduced && !forceMotion;
  const enableAnimation = !showStatic && shouldAnimate;
  const animationIsPaused = isPaused || !isVisible;

  const animateDir = direction === 'right' ? 'ltr' : 'rtl'; // Direction logic for class

  return (
    <section
      className="relative py-20 overflow-hidden"
      style={{ background: "var(--surface)" }}
      aria-labelledby="marquee-heading"
    >
      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        {/* [MODIFIED] Header with stagger animation */}
        <motion.div
          className="text-center mb-10"
          initial={showStatic ? {} : "hidden"}
          whileInView={showStatic ? {} : "visible"}
          variants={headerVariants}
          viewport={{ once: true }}
        >
          {/* Stat bar — single source of truth, live-updating every 90s + on focus.
              Layout: 3 equal-weight pills.
                ① Creators (active managed clients)
                ② Total Reach (YT subs + IG followers — combined, matches cockpit)
                ③ Live Activity (channels + IG accounts breakdown)
              The combined Total Reach is the hero number; the breakdown stays
              available as a small subline so visitors can verify the math. */}
          <motion.div
            className="inline-flex flex-wrap justify-center items-stretch gap-2 sm:gap-3 p-2 rounded-2xl mb-8"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)"
            }}
            variants={itemVariant}
          >
            {/* Pill 1 — Creators */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02]">
              <div className="w-10 h-10 rounded-lg bg-[var(--orange)]/10 flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-[var(--orange)]" />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-2xl font-black leading-none text-white tracking-tight">
                  {creatorCount}<span className="text-[var(--orange)]">+</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 leading-none mt-1">
                  Active creators
                </span>
              </div>
            </div>

            {/* Pill 2 — Total reach (the hero) */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-br from-[var(--orange)]/10 to-pink-500/5 border border-[var(--orange)]/20">
              <div className="w-10 h-10 rounded-lg bg-[var(--orange)] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--orange)]/30">
                <TrendingUp size={18} className="text-white" />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-2xl font-black leading-none text-[var(--orange)] tracking-tight">
                  {fmt(totalReach)}<span className="text-white">+</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-300 leading-none mt-1">
                  Total reach
                </span>
                <span className="text-[9px] text-neutral-500 leading-none mt-1.5 font-medium">
                  <Youtube size={9} className="inline -mt-px text-red-500" /> {fmt(ytReach)}
                  <span className="mx-1 text-neutral-700">·</span>
                  <Instagram size={9} className="inline -mt-px text-pink-500" /> {fmt(igReach)}
                </span>
              </div>
            </div>

            {/* Pill 3 — Live activity (channels + IG handles) */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02]">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 relative">
                <CheckCircle2 size={18} className="text-emerald-500" />
                {/* Live dot — confirms numbers are fresh */}
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-2xl font-black leading-none text-white tracking-tight">
                  {(ytChannels || 0) + (igAccounts || 0)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 leading-none mt-1">
                  Live channels
                </span>
                <span className="text-[9px] text-neutral-500 leading-none mt-1.5 font-medium">
                  {ytChannels} YT · {igAccounts} IG
                </span>
              </div>
            </div>
          </motion.div>

          <motion.h2
            id="marquee-heading"
            className="text-4xl md:text-5xl lg:text-7xl font-black italic uppercase tracking-tighter mb-4 py-6 leading-tight"
            style={{ color: "var(--text)" }}
            variants={itemVariant}
          >
            The <span className="text-[var(--orange)]">Visual Engine.</span>
          </motion.h2>
          <motion.p
            className="text-base md:text-lg max-w-2xl mx-auto font-medium"
            style={{ color: "var(--text-muted)" }}
            variants={itemVariant}
          >
            We craft visuals that stop the scroll, build authority, and
            transform viewers into loyal communities.
          </motion.p>
        </motion.div>

        {/* [NEW] Marquee container wrapped in motion.div for fade-in */}
        <motion.div
          initial={showStatic ? {} : { opacity: 0, y: 20 }}
          whileInView={showStatic ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div
            ref={containerRef}
            className="relative select-none"
            role="region"
            aria-roledescription="carousel"
            aria-label="Scrolling creator logos"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            onTouchCancel={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
            style={{
              position: "relative",
              overflow: "hidden",
              /* Removed mask-image/WebkitMaskImage as it's buggy in Safari with translate3d */
            }}
          >
            {/* fade masks - Permanent fix for iOS Safari marquee visibility */}
            <div
              className="marquee-mask-left"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "8vw",
                minWidth: "16px",
                maxWidth: "64px",
                background: "linear-gradient(to right, var(--surface) 0%, transparent 100%)",
                zIndex: 10,
                pointerEvents: "none",
                transform: "translate3d(0,0,0)",
              }}
              aria-hidden="true"
            />
            <div
              className="marquee-mask-right"
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: "8vw",
                minWidth: "16px",
                maxWidth: "64px",
                background: "linear-gradient(to left, var(--surface) 0%, transparent 100%)",
                zIndex: 10,
                pointerEvents: "none",
                transform: "translate3d(0,0,0)",
              }}
              aria-hidden="true"
            />

            {/* Track (2x segments for seamless loop) */}
            <div
              ref={trackRef}
              className={`cw-track ${enableAnimation ? "cw-animated" : "cw-static"
                } ${animationIsPaused ? "paused" : ""} ${animateDir === 'ltr' ? 'direction-ltr' : 'direction-rtl'
                }`}
              style={{
                "--gap-rem": `${gapRem}`,
                "--animation-duration": animationDuration,
                "WebkitAnimationDuration": animationDuration,
                "--animation-distance": animationDistance,
                "WebkitAnimationName": animateDir === 'ltr' ? 'cw-marquee-ltr' : 'cw-marquee-rtl',
                "animationName": animateDir === 'ltr' ? 'cw-marquee-ltr' : 'cw-marquee-rtl',
                "WebkitAnimationTimingFunction": "linear",
                "animationTimingFunction": "linear",
                "WebkitAnimationIterationCount": "infinite",
                "animationIterationCount": "infinite",
                "WebkitAnimationPlayState": animationIsPaused ? "paused" : "running",
                "animationPlayState": animationIsPaused ? "paused" : "running",
                /* Permanent GPU Hardware Acceleration */
                WebkitPerspective: "1000px",
                perspective: "1000px",
                WebkitTransformStyle: "preserve-3d",
                transformStyle: "preserve-3d",
              }}
            >
              {/* Segment A (measured) */}
              <ul
                ref={segmentRef}
                className="cw-segment"
              >
                {finalCreators.map((creator) => {
                  const key = `${creator.key}-a`;
                  const isHovered = hoveredKey === key;
                  return (
                    <motion.li
                      key={key}
                      className="cw-item"
                      onMouseEnter={() => handleMouseEnter(key)}
                      onMouseLeave={handleMouseLeave}
                      whileHover={!showStatic ? { background: "var(--surface-alt)" } : {}}
                      transition={{ duration: 0.2 }}
                      style={{
                        background: isHovered ? "var(--surface-alt)" : "rgba(0,0,0,0)",
                        border: `1px solid ${isHovered ? "var(--border)" : "transparent"}`,
                        willChange: "transform",
                      }}
                    >
                      <div className="cw-item-inner" role="presentation">
                        <CreatorBadge creator={creator} isHovered={isHovered} />
                      </div>
                    </motion.li>
                  );
                })}
              </ul>

              {/* Segment B (clone) — only when the animated track is active.
                  Required for the -50% keyframe loop to wrap seamlessly.
                  Belt-and-suspenders: gating on `enableAnimation` (not just
                  `!showStatic`) guarantees we never render two static copies
                  if a race condition keeps the track in `cw-static` mode. */}
              {enableAnimation && (
                <ul
                  className="cw-segment"
                  aria-hidden="true" // Clone is decorative
                >
                  {finalCreators.map((creator) => {
                    const key = `${creator.key}-b`;
                    const isHovered = hoveredKey === key;
                    return (
                      <motion.li
                        key={key}
                        className="cw-item"
                        onMouseEnter={() => handleMouseEnter(key)}
                        onMouseLeave={handleMouseLeave}
                        whileHover={!showStatic ? { background: "var(--surface-alt)" } : {}}
                        transition={{ duration: 0.2 }}
                        style={{
                          background: isHovered ? "var(--surface-alt)" : "rgba(0,0,0,0)",
                          border: `1px solid ${isHovered ? "var(--border)" : "transparent"}`,
                          willChange: "transform",
                        }}
                      >
                        <div className="cw-item-inner" role="presentation">
                          <CreatorBadge creator={creator} isHovered={isHovered} />
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </motion.div>

        {enableAnimation && (
          <motion.p
            className="text-center mt-6 text-xs"
            style={{ color: "var(--text-muted)" }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.6 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }} // Delay to appear after marquee
          >
            Hover / touch / focus to pause
          </motion.p>
        )}
      </div>

      {/* Scoped styles */}
      <style>{`
        .cw-track {
          display: flex;
          align-items: center;
          width: max-content;
          will-change: transform;
          /* GPU Acceleration Forces */
          transform: translate3d(0, 0, 0);
          -webkit-transform: translate3d(0, 0, 0);
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          perspective: 1000px;
          -webkit-perspective: 1000px;
          /* Force Subpixel Rendering */
          -webkit-font-smoothing: antialiased;
        }
        
        .cw-track.cw-animated.direction-rtl {
          animation: cw-marquee-rtl var(--animation-duration) linear infinite;
          -webkit-animation: cw-marquee-rtl var(--animation-duration) linear infinite;
        }

        .cw-track.cw-animated.direction-ltr {
          animation: cw-marquee-ltr var(--animation-duration) linear infinite;
          -webkit-animation: cw-marquee-ltr var(--animation-duration) linear infinite;
        }

        .cw-track.cw-animated.paused {
          animation-play-state: paused !important;
          -webkit-animation-play-state: paused !important;
        }

        .cw-track.cw-static {
            justify-content: center;
            flex-wrap: wrap;
            width: 100%;
        }
        
        .cw-track > .cw-segment:not(:first-child) {
          margin-left: calc(var(--gap-rem) * 1rem);
        }

        .cw-segment {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          padding: 1rem 0;
          flex-shrink: 0;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        
        .cw-track.cw-static .cw-segment {
           white-space: normal;
           gap: calc(var(--gap-rem) * 0.5rem) calc(var(--gap-rem) * 1rem);
           display: flex;
           flex-wrap: wrap;
           justify-content: center;
        }

        .cw-track:not(.cw-static) .cw-segment > .cw-item:not(:first-child) {
          margin-left: calc(var(--gap-rem) * 1rem);
        }

        .cw-item {
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d;
          display: block;
          border-radius: 20px;
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          outline: 2px solid transparent;
          outline-offset: 2px;
          will-change: transform, background-color;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .cw-item:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .cw-item:focus-within {
          outline-color: var(--orange);
          background: rgba(255, 255, 255, 0.08);
        }

        .cw-item-inner {
          cursor: default;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 1rem 0.625rem 0.625rem;
          min-width: max-content;
          text-decoration: none;
          color: inherit;
          border-radius: inherit;
          outline: none;
        }

        .cw-avatar {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 14px;
          overflow: hidden;
          flex-shrink: 0;
          background: #111;
          box-shadow: 0 6px 18px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04);
        }
        .cw-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: all 0.3s ease;
          filter: grayscale(0.2);
        }
        .cw-item:hover img {
          filter: grayscale(0);
        }

        .cw-ring {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          border: 2px solid transparent;
          pointer-events: none;
          transition: border 300ms ease;
        }
        .cw-badge {
          position: absolute;
          bottom: -3px;
          right: -3px;
          width: 16px;
          height: 16px;
          border-radius: 5px;
          background: var(--orange);
          border: 2px solid #000;
          display: grid;
          place-items: center;
          z-index: 2;
        }

        .cw-title {
          color: var(--text);
          font-weight: 800;
          font-size: 1.05rem;
          line-height: 1.2;
          letter-spacing: -0.01em;
          max-width: 240px;
        }
        .cw-meta {
          color: var(--text-muted);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          line-height: 1;
        }

        /* RTL Direction — uses -50% which works WITHOUT JS measurement because
           the track contains 2 identical segments. Translating -50% moves
           exactly one segment-width left, then loops seamlessly. Previously
           we used var(--neg-animation-distance) set by JS, which left the
           strip static whenever the measurement was 0/NaN/late (hydration,
           empty data, font-loading, iOS Safari, etc). */
        @keyframes cw-marquee-rtl {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
        @-webkit-keyframes cw-marquee-rtl {
          from { -webkit-transform: translate3d(0, 0, 0); }
          to   { -webkit-transform: translate3d(-50%, 0, 0); }
        }

        /* LTR Direction */
        @keyframes cw-marquee-ltr {
          from { transform: translate3d(-50%, 0, 0); }
          to   { transform: translate3d(0, 0, 0); }
        }
        @-webkit-keyframes cw-marquee-ltr {
          from { -webkit-transform: translate3d(-50%, 0, 0); }
          to   { -webkit-transform: translate3d(0, 0, 0); }
        }

      `}</style>
    </section>
  );
};

export default CreatorsWorkedWithMarquee;