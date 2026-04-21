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

// Shared animation helpers — CPU-friendly: opacity + Y only, no scale blur etc.
const mkFade = (reduced, delay = 0) => ({
  initial: reduced ? {} : { opacity: 0, y: 18 },
  animate: reduced ? {} : { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: "easeOut", delay },
});

const mkViewFade = (reduced, delay = 0) => ({
  initial: reduced ? {} : { opacity: 0, y: 18 },
  whileInView: reduced ? {} : { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.45, ease: "easeOut", delay },
});
import { Link } from "react-router-dom";
import MetaTags, { BreadcrumbSchema } from "./MetaTags";
import PortfolioItem from "./PortfolioItem";
import GradientWaves from "./animations/GradientWaves";
import StatsCounter from "./StatsCounter";
import LiveStatsCaseStudy from "./LiveStatsCaseStudy";
import WorkSection from "./WorkSection";
import { useGlobalConfig } from "../context/GlobalConfigContext";
import { AUTH_BASE } from "../config/constants";
import { resolveMediaUrl } from "../utils/formatters";
import {
  Section,
  Kicker,
  Eyebrow,
  Display,
  Lede,
  RevealOnScroll,
  HairlineCard,
  NumberTickIn,
  GrainOverlay,
} from "../design";
import WorkReelTile from "./work/WorkReelTile";
import WorkCaseDrawer from "./work/WorkCaseDrawer";
import WorkFilters from "./work/WorkFilters";

const ProofSection = React.lazy(() => import("./ProofSection"));
// PHASE 2 · TODO — replace this static CaseStudies component with a dynamic
// /case-studies system backed by D1. New table case_studies (slug PK, cover,
// brief, role_list, tools, metrics_json, gallery_json, body_md, published,
// attributed_slugs_json). Admin editor mirrors AdminBlogEditor.jsx; new public
// routes /case-studies and /case-studies/:slug. Each team/:slug profile
// should surface the case studies they contributed to.
// See CLAUDE.md "Phase 2 roadmap" #2.
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
      // Absolute-ify /api/media/view/* paths so they hit the worker, not Pages.
      : resolveMediaUrl(item.image_url || item.imageUrl || item.image || item.thumb, AUTH_BASE),
    link: isVideo ? "/video-editing" : "/thumbnails",
    kind: isVideo ? "video" : "gfx",
    isShinel: item.is_shinel !== 0 && item.isShinel !== false,
    views: Number(item.youtube_views ?? item.youtubeViews ?? item.views ?? 0),
  };
}

// ─── service navigation cards ─────────────────────────────────────────────────
// Every card must route to a real, public, working page. No protected routes,
// no dynamic category placeholders. The order is editorial, not alphabetical:
// most-requested services first (Video + Thumbnails), then the rest.
const SERVICE_CARDS = [
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
    key: "graphic-design",
    label: "Graphic Design",
    icon: Sparkles,
    path: "/graphic-design",
    color: "from-yellow-500/20 to-yellow-600/10",
    border: "border-yellow-500/30",
    hover: "hover:border-yellow-500/60",
    badge: "PRINT + SOCIAL",
    desc: "Logos, posts, banners, flex, cards",
  },
  {
    key: "seo",
    label: "SEO Tool",
    icon: BarChart3,
    path: "/tools/seo",
    color: "from-green-500/20 to-green-600/10",
    border: "border-green-500/30",
    hover: "hover:border-green-500/60",
    badge: "STRATEGY",
    desc: "Titles, description, tags generator",
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

function ServiceNavCard({ card, index, reduced }) {
  const Icon = card.icon;
  return (
    <motion.div
      className="h-full"
      {...mkViewFade(reduced, index * 0.06)}
    >
      <Link
        to={card.path}
        className={`group relative flex flex-col justify-between gap-4 p-5 rounded-2xl border h-full bg-gradient-to-br ${card.color} ${card.border} ${card.hover} transition-colors duration-200`}
        style={{ willChange: "auto" }}
      >
        {/* top: badge */}
        <span className="self-start px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase bg-white/10 text-white/70">
          {card.badge}
        </span>

        {/* middle: icon row */}
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <Icon size={20} className="text-white" />
          </div>
          <ArrowUpRight
            size={18}
            className="text-white/40 group-hover:text-white transition-colors"
          />
        </div>

        {/* bottom: label + desc */}
        <div className="mt-auto">
          <p className="text-sm font-black text-white leading-tight">{card.label}</p>
          <p className="text-[11px] text-white/50 mt-1 leading-snug">{card.desc}</p>
        </div>
      </Link>
    </motion.div>
  );
}

function ProjectCard({ project, index, reduced }) {
  const [imgFailed, setImgFailed] = useState(false);
  const isVideo = project.kind === "video";

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 16 }}
      animate={reduced ? {} : { opacity: 1, y: 0 }}
      exit={reduced ? {} : { opacity: 0 }}
      transition={{ duration: 0.3, delay: reduced ? 0 : index * 0.04 }}
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
  const reduced = useReducedMotion();
  const { config } = useGlobalConfig();
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const portfolioRef = useRef(null);

  // Immersive work-reel state (redesign v2):
  //   - kindFilter: ALL / VIDEO / GFX
  //   - categoryFilter: ALL / <derived list from projects>
  //   - selectedCase: item currently shown in the side-drawer, null = closed
  const [kindFilter, setKindFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedCase, setSelectedCase] = useState(null);

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

  // Reel derivations — unique categories, filtered list. kindFilter maps
  // VIDEO\u2192kind:"video", GFX\u2192kind:"gfx".
  const reelCategories = useMemo(() => {
    const set = new Set();
    projects.forEach((p) => {
      const c = (p.category || "").trim().toUpperCase();
      if (c && c !== "OTHER") set.add(c);
    });
    const top = [...set].slice(0, 8); // cap to keep the chip row manageable
    return ["ALL", ...top, "OTHER"];
  }, [projects]);

  const reelItems = useMemo(() => {
    return projects.filter((p) => {
      const matchKind =
        kindFilter === "ALL" ||
        (kindFilter === "VIDEO" && p.kind === "video") ||
        (kindFilter === "GFX" && p.kind === "gfx");
      const cat = (p.category || "").toUpperCase() || "OTHER";
      const matchCat = categoryFilter === "ALL" || cat === categoryFilter;
      return matchKind && matchCat;
    });
  }, [projects, kindFilter, categoryFilter]);

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

  // For the compact views stat: prefer raw views if config says so, else millions-rounded.
  const viewsValue = config?.workPageStats?.useCalculated === false
    ? stats.views
    : Math.round((stats.views / 1_000_000) * 10) / 10;
  const viewsSuffix = config?.workPageStats?.useCalculated === false ? "+" : "M+";

  return (
    <div className="min-h-svh bg-[var(--surface)] text-[var(--text)] selection:bg-[var(--orange)]/30 relative">
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

      <GrainOverlay />

      {/* ─── HERO (editorial v2) ──────────────────────────────────────── */}
      <Section size="lg" className="pt-24 md:pt-32 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-25">
          <GradientWaves colors={["#E85002", "#FF6B35", "#000000"]} opacity={0.3} speed="medium" />
        </div>

        <div className="relative z-10 grid md:grid-cols-[1.4fr_1fr] gap-10 md:gap-16 items-end">
          <div>
            <RevealOnScroll>
              <Kicker className="mb-6">The Work</Kicker>
            </RevealOnScroll>
            <RevealOnScroll delay="80ms">
              <Display as="h1" size="xl" className="mb-6">
                Creative excellence, <span style={{ color: "var(--orange)" }}>at scale.</span>
              </Display>
            </RevealOnScroll>
            <RevealOnScroll delay="160ms">
              <Lede className="mb-8">
                High-CTR thumbnails, retention-focused long-form, viral shorts, and
                full brand systems. Every piece below is real client work, fetched
                live from our production inventory — no stock, no mock-ups.
              </Lede>
            </RevealOnScroll>
            <RevealOnScroll delay="240ms">
              <div className="flex flex-wrap gap-3">
                <a
                  href={wa("I'm impressed with your portfolio! Let's talk about my project.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-editorial"
                >
                  Start a project <ChevronRight size={14} />
                </a>
                <button
                  type="button"
                  onClick={() => portfolioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="btn-editorial-ghost"
                >
                  Explore below <span aria-hidden>↓</span>
                </button>
              </div>
            </RevealOnScroll>
          </div>

          <RevealOnScroll delay="240ms">
            <HairlineCard className="p-6 md:p-8">
              <Eyebrow className="mb-4">In numbers</Eyebrow>
              <div className="space-y-4">
                <StatRow label="Projects" value={<NumberTickIn to={stats.projects} suffix="+" />} />
                <StatRow label="Clients" value={<NumberTickIn to={stats.clients} suffix="+" />} />
                <StatRow
                  label="Views delivered"
                  value={
                    <span className="text-mono-num">
                      <NumberTickIn to={viewsValue} suffix={viewsSuffix} />
                    </span>
                  }
                />
                <StatRow label="Reply time" value="under 24 h" />
              </div>
            </HairlineCard>
          </RevealOnScroll>
        </div>
      </Section>

      {/* ─── IMMERSIVE WORK REEL (redesign v2) ────────────────────────────
          Replaces the old Featured Portfolio Grid + service-nav hub as the
          first-content section. Filter chips + masonry of real client work;
          clicking a tile opens a side-drawer case study with the full
          embedded video + metadata. Mobile = single column, still tappable. */}
      <Section size="lg" tone="alt" hairlineTop id="reel">
        <div ref={portfolioRef} className="mb-10">
          <RevealOnScroll>
            <Eyebrow className="mb-3">The Reel</Eyebrow>
          </RevealOnScroll>
          <RevealOnScroll delay="80ms">
            <Display size="md" className="mb-2">
              Cuts that moved <span style={{ color: "var(--orange)" }}>channels.</span>
            </Display>
          </RevealOnScroll>
          <RevealOnScroll delay="160ms">
            <p className="text-sm max-w-xl" style={{ color: "var(--text-muted)" }}>
              Every tile is a real client piece. Tap one for the full embed,
              the numbers, and the maker who shipped it.
            </p>
          </RevealOnScroll>
        </div>

        <div className="mb-8">
          <WorkFilters
            kind={kindFilter}
            setKind={setKindFilter}
            category={categoryFilter}
            setCategory={setCategoryFilter}
            categories={reelCategories}
            total={reelItems.length}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{ aspectRatio: "16/9", background: "var(--surface)" }}
              />
            ))}
          </div>
        ) : reelItems.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center hairline"
            style={{ background: "var(--surface)", color: "var(--text-muted)" }}
          >
            No pieces match that filter. Try ALL / ALL.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {reelItems.slice(0, 18).map((p, i) => (
              <WorkReelTile
                key={p.id || i}
                item={p}
                index={i}
                onOpen={(it) => setSelectedCase(it)}
              />
            ))}
          </div>
        )}

        {reelItems.length > 18 && (
          <div className="mt-8 text-center">
            <Link
              to="/thumbnails"
              className="btn-editorial-ghost inline-flex"
            >
              Browse all {reelItems.length} pieces <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
      </Section>

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

      {/* The old "FEATURED PORTFOLIO GRID" block was replaced by the
          IMMERSIVE WORK REEL above (same data + filters + masonry, plus the
          case-study side-drawer). portfolioRef now lives on the reel wrapper
          so the hero "Explore below" CTA still scrolls to the right place. */}

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

      {/* ─── EXPLORE BY SERVICE (moved down from former position 2) ────── */}
      <Section size="lg" tone="surface" hairlineTop>
        <div className="mb-8">
          <RevealOnScroll>
            <Eyebrow className="mb-3">Explore by service</Eyebrow>
          </RevealOnScroll>
          <RevealOnScroll delay="80ms">
            <Display size="md" className="mb-2">
              Need a specific service? Jump straight in.
            </Display>
          </RevealOnScroll>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-stretch">
          {SERVICE_CARDS.map((card, i) => (
            <ServiceNavCard key={card.key} card={card} index={i} reduced={!!reduced} />
          ))}
        </div>
      </Section>

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

      {/* Case-study drawer — single instance, renders above everything when
          a tile is clicked. Unmounts the YouTube iframe on close so no
          background audio/CPU burn. */}
      <WorkCaseDrawer
        item={selectedCase}
        open={!!selectedCase}
        onClose={() => setSelectedCase(null)}
      />
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between hairline-b pb-3 last:border-b-0 last:pb-0">
      <span className="text-eyebrow">{label}</span>
      <span className="text-display-sm">{value}</span>
    </div>
  );
}
