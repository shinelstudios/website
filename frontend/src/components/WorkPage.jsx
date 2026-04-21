import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import MetaTags, { BreadcrumbSchema } from "./MetaTags";
import { useGlobalConfig } from "../context/GlobalConfigContext";
import { AUTH_BASE } from "../config/constants";
import { resolveMediaUrl } from "../utils/formatters";
import { extractYouTubeId } from "../utils/youtube";
import {
  Section,
  Eyebrow,
  Display,
  RevealOnScroll,
  GrainOverlay,
} from "../design";
import WorkReelTile from "./work/WorkReelTile";
import WorkCaseDrawer from "./work/WorkCaseDrawer";
import WorkFilters from "./work/WorkFilters";
import SignalReelHero from "./work/SignalReelHero";
import ServicesMatrix from "./work/ServicesMatrix";
import SpecialtiesBand from "./work/SpecialtiesBand";
import WorkProcess from "./work/WorkProcess";
import WorkTestimonials from "./work/WorkTestimonials";
import WorkFAQ from "./work/WorkFAQ";
import MobileCtaBar from "./work/MobileCtaBar";

// ─── helpers ───────────────────────────────────────────────────────────────────
// Canonical extractYouTubeId lives in utils/youtube.js (imported above).

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

// ─── main page ────────────────────────────────────────────────────────────────
export default function WorkPage() {
  const { config } = useGlobalConfig();
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

  // Counters displayed inside the hero (KineticCounters).
  const counters = [
    { value: stats.projects, suffix: "+", label: "Projects shipped" },
    { value: viewsValue, suffix: viewsSuffix, label: "Views driven" },
    { value: stats.clients, suffix: "+", label: "Creators served" },
    { value: 3, prefix: "< ", suffix: "h", label: "Avg reply time" },
  ];

  const whatsappHref = wa("Hi Shinel — I just browsed your work and want to start a project.");

  return (
    <div className="min-h-svh bg-[var(--surface)] text-[var(--text)] selection:bg-[var(--orange)]/30 relative">
      <MetaTags
        title="The Work — Portfolio, Specialties & Services | Shinel Studios"
        description="Shinel Studios ships the full creative stack — video editing, GFX, SEO, AI-assisted music, tattoo, and graphics. Real client work, scale-proof numbers, one link to share."
        keywords="portfolio, video editing, thumbnails, AI music videos, tattoo content, AI graphics, YouTube growth"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Work", url: "/work" },
        ]}
      />

      <GrainOverlay />

      {/* 1. Signal Reel hero — kinetic mosaic + cycling verb headline. */}
      <SignalReelHero
        projects={projects}
        counters={counters}
        whatsappHref={whatsappHref}
      />

      {/* 2. Services matrix — GFX / Video Editing / Channel+SEO + AI ribbon. */}
      <ServicesMatrix projects={projects} />

      {/* 3. Specialties band — the three AI lanes we push hardest. */}
      <SpecialtiesBand />

      {/* 4. Immersive reel — the live masonry of real client work. */}
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

      {/* 5. Process — four steps. */}
      <WorkProcess />

      {/* 6. Testimonials band (pulls from KV testimonials). */}
      <WorkTestimonials />

      {/* 7. FAQ — objection-crushers. */}
      <WorkFAQ />

      {/* 8. Final CTA band. */}
      <section
        className="py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(90deg, var(--orange), #F16001)" }}
      >
        <div className="container mx-auto px-6 relative z-10 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-5">
              Ready to ship the next one?
            </h2>
            <p className="text-base md:text-lg font-semibold opacity-90 max-w-2xl mx-auto mb-8">
              One link — the whole creative stack. Tell us the brief, we'll
              reply inside 3 hours with a sample or a quote.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {[
                { label: "AI Music Videos", path: "/work/ai-music" },
                { label: "Tattoo Content", path: "/work/ai-tattoo" },
                { label: "AI Graphics", path: "/work/ai-gfx" },
                { label: "Thumbnails", path: "/thumbnails" },
                { label: "Video Editing", path: "/video-editing" },
              ].map(({ label, path }) => (
                <Link
                  key={path}
                  to={path}
                  className="px-4 py-2 rounded-xl border border-white/30 text-white text-xs font-bold hover:bg-white/10 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#0a0a0a] text-white font-black hover:opacity-90 transition-opacity text-base md:text-lg focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              Start a project
              <ArrowUpRight size={20} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Mobile sticky CTA — appears on scroll past hero. */}
      <MobileCtaBar whatsappHref={whatsappHref} />

      {/* Case-study drawer — single instance, mounted above everything. */}
      <WorkCaseDrawer
        item={selectedCase}
        open={!!selectedCase}
        onClose={() => setSelectedCase(null)}
      />
    </div>
  );
}

