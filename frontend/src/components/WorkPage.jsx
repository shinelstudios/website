import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  Play,
  Image,
  Zap,
  BarChart3,
  Film,
  Layers,
  ExternalLink,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import MetaTags, { BreadcrumbSchema } from "./MetaTags";
import PortfolioItem from "./PortfolioItem";
import GradientWaves from "./animations/GradientWaves";
import StatsCounter from "./StatsCounter";
import LiveStatsCaseStudy from "./LiveStatsCaseStudy";
import WorkSection from "./WorkSection";
import { useGlobalConfig } from "../context/GlobalConfigContext";
import { AUTH_BASE } from "../config/constants";

const ProofSection = React.lazy(() => import("./ProofSection"));
const CaseStudies = React.lazy(() => import("./CaseStudies"));

// ─── helpers ───────────────────────────────────────────────────────────────────
function extractYouTubeId(url = "") {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/\/shorts\/([^/]+)/);
      if (m) return m[1];
    }
  } catch {}
  return null;
}

function normalizeWork(item, type) {
  const isVideo = type === "video";
  const KNOWN_BAD_IDS = ["t-vPWTJUIO4", "R2jcaMDAvOU"];
  const ytId =
    extractYouTubeId(item.mirror_url || item.primaryUrl) ||
    extractYouTubeId(item.creatorUrl) ||
    item.video_id ||
    item.youtubeId ||
    item.videoId ||
    "";
  const useMq = KNOWN_BAD_IDS.includes(ytId);

  return {
    id: item.id || ytId || item.filename,
    title: item.title || item.filename,
    description:
      item.description ||
      (isVideo
        ? `Video Category: ${item.category}`
        : `Thumbnail Project: ${item.category}`),
    category: item.category || "OTHER",
    image: isVideo
      ? ytId
        ? `https://img.youtube.com/vi/${ytId}/${useMq ? "mqdefault" : "hqdefault"}.jpg`
        : "https://placehold.co/600x400/202020/white?text=No+Preview"
      : item.image_url || item.imageUrl || item.image || item.thumb,
    link: isVideo ? "/video-editing" : "/thumbnails",
    kind: isVideo ? "video" : "gfx",
    isShinel: item.is_shinel !== 0 && item.isShinel !== false,
    views: Number(item.youtube_views ?? item.youtubeViews ?? item.views ?? 0),
  };
}

// ─── service navigation cards ─────────────────────────────────────────────────
const SERVICE_CARDS = [
  {
    key: "thumbnails",
    label: "Thumbnails",
    icon: Image,
    path: "/thumbnails",
    color: "from-orange-500/20 to-orange-600/10",
    border: "border-orange-500/30",
    hover: "hover:border-orange-500/60",
    badge: "GFX",
    desc: "High-CTR thumbnail designs",
  },
  {
    key: "video-editing",
    label: "Video Editing",
    icon: Film,
    path: "/video-editing",
    color: "from-blue-500/20 to-blue-600/10",
    border: "border-blue-500/30",
    hover: "hover:border-blue-500/60",
    badge: "LONG-FORM",
    desc: "Retention-focused long-form edits",
  },
  {
    key: "shorts",
    label: "Shorts & Reels",
    icon: Play,
    path: "/shorts",
    color: "from-purple-500/20 to-purple-600/10",
    border: "border-purple-500/30",
    hover: "hover:border-purple-500/60",
    badge: "VERTICAL",
    desc: "Viral short-form content",
  },
  {
    key: "branding",
    label: "Branding",
    icon: Layers,
    path: "/branding",
    color: "from-pink-500/20 to-pink-600/10",
    border: "border-pink-500/30",
    hover: "hover:border-pink-500/60",
    badge: "DESIGN",
    desc: "Channel identity & brand kits",
  },
  {
    key: "growth",
    label: "Growth & SEO",
    icon: BarChart3,
    path: "/services/growth/seo",
    color: "from-green-500/20 to-green-600/10",
    border: "border-green-500/30",
    hover: "hover:border-green-500/60",
    badge: "STRATEGY",
    desc: "Data-driven YouTube growth",
  },
  {
    key: "ai",
    label: "AI Automation",
    icon: Zap,
    path: "/ai-studio",
    color: "from-yellow-500/20 to-yellow-600/10",
    border: "border-yellow-500/30",
    hover: "hover:border-yellow-500/60",
    badge: "AI",
    desc: "AI-enhanced production workflows",
  },
];

const FILTERS = ["ALL", "VIDEO", "GFX"];

// ─── reusable components ───────────────────────────────────────────────────────

function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase border transition-all duration-200 ${
        active
          ? "bg-[var(--orange)] border-[var(--orange)] text-white shadow-lg shadow-[var(--orange)]/20"
          : "bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text)]/20"
      }`}
    >
      {label}
    </button>
  );
}

function ServiceNavCard({ card, index }) {
  const Icon = card.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
    >
      <Link
        to={card.path}
        className={`group relative flex flex-col gap-3 p-5 rounded-2xl border bg-gradient-to-br ${card.color} ${card.border} ${card.hover} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
      >
        {/* badge */}
        <span className="self-start px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase bg-white/10 text-white/70">
          {card.badge}
        </span>

        {/* icon + arrow */}
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Icon size={20} className="text-white" />
          </div>
          <ArrowUpRight
            size={18}
            className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
          />
        </div>

        {/* label + desc */}
        <div>
          <p className="text-sm font-black text-white">{card.label}</p>
          <p className="text-[11px] text-white/50 mt-0.5">{card.desc}</p>
        </div>
      </Link>
    </motion.div>
  );
}

function ProjectCard({ project, index }) {
  const [imgFailed, setImgFailed] = useState(false);
  const isVideo = project.kind === "video";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
    >
      <Link
        to={project.link}
        className="group relative block rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] hover:border-[var(--orange)]/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        {/* thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-[var(--surface)]">
          {project.image && !imgFailed ? (
            <img
              src={project.image}
              alt={project.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
              draggable="false"
              onContextMenu={(e) => e.preventDefault()}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {isVideo ? (
                <Film size={36} className="text-[var(--text-muted)]/30" />
              ) : (
                <Image size={36} className="text-[var(--text-muted)]/30" />
              )}
            </div>
          )}

          {/* kind badge overlay */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase backdrop-blur-md ${
                isVideo
                  ? "bg-blue-600/80 text-white"
                  : "bg-orange-500/80 text-white"
              }`}
            >
              {isVideo ? "VIDEO" : "GFX"}
            </span>
            {project.isShinel && (
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase bg-white/20 backdrop-blur-md text-white">
                ✦ SHINEL
              </span>
            )}
          </div>

          {/* play overlay for videos */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-[var(--orange)]/90 flex items-center justify-center shadow-xl">
                <Play size={20} className="text-white translate-x-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* card body */}
        <div className="p-4">
          <h3 className="text-sm font-bold text-[var(--text)] line-clamp-2 leading-snug mb-1.5">
            {project.title}
          </h3>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[var(--text-muted)] truncate">
              {project.category}
            </span>
            {project.views > 0 && (
              <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                👁️ {(project.views / 1000).toFixed(1)}K
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function WorkPage() {
  const { config } = useGlobalConfig();
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const portfolioRef = useRef(null);

  const WHATSAPP_NUMBER = "918968141585";
  const wa = (msg) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

  useEffect(() => {
    async function loadWork() {
      try {
        const [vRes, tRes, cRes] = await Promise.all([
          fetch(`${AUTH_BASE}/videos`),
          fetch(`${AUTH_BASE}/thumbnails`),
          fetch(`${AUTH_BASE}/clients`),
        ]);
        const vData = await vRes.json();
        const tData = await tRes.json();
        const cData = await cRes.json();

        const registry = cData.clients || [];
        const creatorIds = new Set(
          registry.map((c) => c.youtubeId).filter(Boolean)
        );
        const creatorHandles = new Set(
          registry.map((c) => c.handle?.toLowerCase()).filter(Boolean)
        );

        const vMapped = (vData.videos || []).map((v) => ({
          ...normalizeWork(v, "video"),
          isCreator:
            creatorIds.has(v.youtubeId) ||
            creatorHandles.has(v.attributedTo?.toLowerCase()),
        }));
        const tMapped = (tData.thumbnails || []).map((t) => ({
          ...normalizeWork(t, "gfx"),
          isCreator: creatorHandles.has(t.attributedTo?.toLowerCase()),
        }));

        const combined = [...vMapped, ...tMapped].sort((a, b) => {
          if (a.isShinel && !b.isShinel) return -1;
          if (!a.isShinel && b.isShinel) return 1;
          if (a.isCreator && !b.isCreator) return -1;
          if (!a.isCreator && b.isCreator) return 1;
          return 0;
        });

        setProjects(combined);
      } catch (e) {
        console.error("Failed to load work:", e);
      } finally {
        setLoading(false);
      }
    }
    loadWork();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchFilter =
        activeFilter === "ALL" ||
        (activeFilter === "VIDEO" && p.kind === "video") ||
        (activeFilter === "GFX" && p.kind === "gfx");
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [projects, activeFilter, searchQuery]);

  const projectsByService = useMemo(
    () => ({
      gfx: projects.filter((p) => p.kind === "gfx"),
      editing: projects.filter((p) => p.kind === "video"),
    }),
    [projects]
  );

  const stats = useMemo(() => {
    const workPageConfig = config?.workPageStats;
    if (workPageConfig && !workPageConfig.useCalculated) {
      return {
        projects: workPageConfig.projectsDelivered || 0,
        clients: workPageConfig.happyClients || 0,
        views: workPageConfig.viewsGenerated || 0,
      };
    }
    const totalViews = projects.reduce(
      (sum, p) => sum + (p.views || 0),
      0
    );
    const uniqueClients = new Set(
      projects.map((p) => p.attributedTo).filter(Boolean)
    ).size;
    return {
      projects: projects.length,
      clients: Math.max(uniqueClients, Math.floor(projects.length / 10), 1),
      views: totalViews,
    };
  }, [projects, config]);

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] selection:bg-[var(--orange)]/30">
      <MetaTags
        title="Our Work – Creative Portfolio | Shinel Studios"
        description="Explore high-CTR thumbnails, retention-focused video edits, viral shorts, and growth-optimised content. 500+ projects for top creators."
        keywords="portfolio, video editing, thumbnails, YouTube growth, creative work showcase"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Portfolio", url: "/work" },
        ]}
      />

      {/* ─── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <GradientWaves
          colors={["#E85002", "#FF6B35", "#000000"]}
          opacity={0.3}
          speed="medium"
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-20">
          <div className="absolute top-40 left-0 w-96 h-96 bg-[var(--orange)]/20 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-0 w-80 h-80 bg-[var(--orange)]/10 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--surface-alt)] border border-[var(--border)] text-[10px] font-black tracking-widest uppercase text-[var(--orange)] mb-6"
          >
            <Sparkles size={13} className="animate-pulse" />
            Our Creative Portfolio
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-black mb-5 tracking-tighter leading-[0.88] text-[var(--text)]"
          >
            CREATIVE{" "}
            <span className="text-[var(--orange)]">EXCELLENCE</span>
            <br />
            AT SCALE.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 text-[var(--text-muted)] font-medium"
          >
            We don't just edit videos — we build visual engines that drive
            growth, authority, and engagement for top-tier creators.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-3 gap-6 max-w-lg mx-auto mb-10"
          >
            <StatsCounter
              end={stats.projects}
              suffix="+"
              label="Projects"
              duration={2000}
            />
            <StatsCounter
              end={stats.clients}
              suffix="+"
              label="Clients"
              duration={2000}
            />
            <StatsCounter
              end={
                config?.workPageStats?.useCalculated === false
                  ? stats.views
                  : stats.views / 1_000_000
              }
              decimals={1}
              suffix="M+"
              label="Views"
              duration={2500}
            />
          </motion.div>

          {/* Hero CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <a
              href={wa("I'm impressed with your portfolio! Let's talk about my project.")}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-[var(--orange)] text-white font-black hover:opacity-90 transition-all active:scale-95 text-sm w-full sm:w-auto justify-center"
            >
              START YOUR PROJECT
              <ChevronRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </a>
            <button
              onClick={() =>
                portfolioRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              className="px-7 py-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--text)] font-black hover:bg-[var(--surface)] transition-all active:scale-95 text-sm w-full sm:w-auto"
            >
              EXPLORE PORTFOLIO ↓
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── SERVICE NAVIGATION HUB ───────────────────────────────────── */}
      <section className="py-16 bg-[var(--surface-alt)]">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-black mb-2 text-[var(--text)]">
              Browse by{" "}
              <span className="text-[var(--orange)]">Service</span>
            </h2>
            <p className="text-sm text-[var(--text-muted)] max-w-lg mx-auto">
              Tap any category to explore that specific portfolio — all work is
              fetched live from our production database.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
            {SERVICE_CARDS.map((card, i) => (
              <ServiceNavCard key={card.key} card={card} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── LIVE CASE STUDY ─────────────────────────────────────────────── */}
      <LiveStatsCaseStudy
        videoId="sG93nlZTayY"
        projects={projects}
        fallbackTitle="Dynamic Stats Demo"
      />

      {/* ─── PROOF + CASE STUDIES ────────────────────────────────────────── */}
      <React.Suspense
        fallback={<div className="h-80 animate-pulse bg-[var(--surface-alt)]" />}
      >
        <ProofSection />
      </React.Suspense>

      <React.Suspense
        fallback={<div className="h-80 animate-pulse bg-[var(--surface)]" />}
      >
        <CaseStudies />
      </React.Suspense>

      {/* ─── FEATURED PORTFOLIO GRID ─────────────────────────────────────── */}
      <section
        ref={portfolioRef}
        id="portfolio-grid"
        className="py-20 bg-[var(--surface-alt)]"
      >
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl sm:text-5xl font-black mb-3 text-[var(--text)]">
              Featured <span className="text-[var(--orange)]">Work</span>
            </h2>
            <p className="text-base text-[var(--text-muted)] max-w-xl mx-auto">
              A curated snapshot across all our services. Use the filters or
              visit a dedicated page for the full library.
            </p>
          </motion.div>

          {/* Filters + Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              {FILTERS.map((f) => (
                <FilterPill
                  key={f}
                  label={f}
                  active={activeFilter === f}
                  onClick={() => setActiveFilter(f)}
                />
              ))}
            </div>
            <div className="relative w-full sm:w-56">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                size={16}
              />
              <input
                type="text"
                placeholder="Search projects…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--orange)] transition-colors"
              />
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-video rounded-2xl bg-[var(--surface)] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter + searchQuery}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredProjects.slice(0, 9).map((project, i) => (
                  <ProjectCard key={project.id} project={project} index={i} />
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          {filteredProjects.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-xl text-[var(--text-muted)]">
                No projects found. Try adjusting your filters.
              </p>
            </motion.div>
          )}

          {/* View More row */}
          {!loading && filteredProjects.length > 9 && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/thumbnails"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--orange)]/40 text-[var(--orange)] text-sm font-bold hover:bg-[var(--orange)]/10 transition-colors"
              >
                All Thumbnails <ExternalLink size={14} />
              </Link>
              <Link
                to="/video-editing"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-blue-500/40 text-blue-400 text-sm font-bold hover:bg-blue-500/10 transition-colors"
              >
                All Videos <ExternalLink size={14} />
              </Link>
              <Link
                to="/shorts"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-purple-500/40 text-purple-400 text-sm font-bold hover:bg-purple-500/10 transition-colors"
              >
                All Shorts <ExternalLink size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── GFX SECTION ─────────────────────────────────────────────────── */}
      <div
        id="gfx-section"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 500px" }}
      >
        <WorkSection
          title="GFX / Thumbnails & Branding"
          description="High-CTR visuals that stop the scroll. Brand-consistent, premium, mobile-first designs that drive clicks and build authority."
          projects={projectsByService.gfx}
          gradient="linear-gradient(135deg, rgba(232,80,2,0.26), rgba(255,147,87,0.12))"
          links={[
            { label: "See All Thumbnails →", path: "/thumbnails" },
            { label: "See All Branding →", path: "/branding" },
          ]}
        />
      </div>

      {/* ─── EDITING SECTION ─────────────────────────────────────────────── */}
      <div
        id="editing-section"
        className="bg-[var(--surface-alt)]"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 500px" }}
      >
        <WorkSection
          title="Video Editing / Shorts & Long-form"
          description="Retention-focused edits that keep viewers watching. Hook to payoff — every frame is engineered for engagement and watch time."
          projects={projectsByService.editing}
          gradient="linear-gradient(135deg, rgba(2,132,199,0.20), rgba(2,132,199,0.10))"
          links={[
            { label: "See All Video Editing →", path: "/video-editing" },
            { label: "See All Shorts →", path: "/shorts" },
          ]}
        />
      </div>

      {/* ─── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-[var(--surface)] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute top-0 left-1/4 w-80 h-80 bg-[var(--orange)] rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[var(--orange)] rounded-full blur-[100px]" />
        </div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-5 text-[var(--text)]">
              Ready to Create{" "}
              <span className="text-[var(--orange)]">Something Amazing?</span>
            </h2>
            <p className="text-lg text-[var(--text-muted)] max-w-xl mx-auto mb-8">
              Let's bring your vision to life with our proven creative process.
            </p>

            {/* Quick-navigate links before the CTA */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {[
                { label: "Thumbnails", path: "/thumbnails" },
                { label: "Video Editing", path: "/video-editing" },
                { label: "Shorts & Reels", path: "/shorts" },
                { label: "Branding", path: "/branding" },
              ].map(({ label, path }) => (
                <Link
                  key={path}
                  to={path}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-xs font-bold hover:border-[var(--orange)]/50 hover:text-[var(--orange)] transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>

            <a
              href={wa("I want to start a project with Shinel Studios!")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[var(--orange)] text-white font-black hover:opacity-90 transition-all active:scale-95 text-base"
            >
              GET STARTED TODAY
              <ArrowUpRight size={22} />
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
