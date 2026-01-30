import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  Search,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Link } from "react-router-dom";
import MetaTags, { BreadcrumbSchema } from "./MetaTags";
import PortfolioItem from "./PortfolioItem";
import { services } from "../data/servicesConfig";
import GradientWaves from "./animations/GradientWaves";
import StatsCounter from "./StatsCounter";
import LiveStatsCaseStudy from "./LiveStatsCaseStudy";
import ServiceCard from "./ServiceCard";
import WorkSection from "./WorkSection";
import { useGlobalConfig } from "../context/GlobalConfigContext";
import { AUTH_BASE } from "../config/constants";

function normalizeWork(item, type) {
  const isVideo = type === 'video';
  const KNOWN_BAD_IDS = ["t-vPWTJUIO4", "R2jcaMDAvOU"];
  const useMq = KNOWN_BAD_IDS.includes(item.videoId);

  return {
    id: item.id || (isVideo ? item.videoId : item.filename),
    title: item.title || item.filename,
    description: item.description || (isVideo ? `Video Category: ${item.category}` : `Thumbnail Project: ${item.category}`),
    category: item.category || "OTHER",
    image: isVideo
      ? `https://img.youtube.com/vi/${item.videoId}/${useMq ? 'mqdefault' : 'maxresdefault'}.jpg`
      : item.imageUrl,
    link: isVideo ? "/video-editing" : "/thumbnails",
    kind: isVideo ? "video" : "gfx",
    isShinel: item.isShinel !== false
  };
}

const CATEGORIES = ["ALL", ...services.map(s => s.title.toUpperCase())];

/* ------------------------------ Components ------------------------------ */

const FilterPill = ({ label, active, onClick }) => (
  <motion.button
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`px-6 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase border transition-all duration-300 ${active
      ? "bg-[var(--orange)] border-[var(--orange)] text-white shadow-lg shadow-[var(--orange)]/20"
      : "bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text)]/20"
      }`}
  >
    {label}
  </motion.button>
);

export default function WorkPage() {
  const reduced = useReducedMotion();
  const { config } = useGlobalConfig();
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Refs for scroll navigation
  const servicesRef = useRef(null);
  const featuredRef = useRef(null);

  useEffect(() => {
    async function loadWork() {
      try {
        const [vRes, tRes, cRes] = await Promise.all([
          fetch(`${AUTH_BASE}/videos`),
          fetch(`${AUTH_BASE}/thumbnails`),
          fetch(`${AUTH_BASE}/clients`)
        ]);
        const vData = await vRes.json();
        const tData = await tRes.json();
        const cData = await cRes.json();

        const registry = cData.clients || [];
        setClients(registry);

        const creatorIds = new Set(registry.map(c => c.youtubeId).filter(Boolean));
        const creatorHandles = new Set(registry.map(c => c.handle?.toLowerCase()).filter(Boolean));

        const vMapped = (vData.videos || []).map(v => ({
          ...normalizeWork(v, 'video'),
          isCreator: creatorIds.has(v.youtubeId) || creatorHandles.has(v.attributedTo?.toLowerCase())
        }));
        const tMapped = (tData.thumbnails || []).map(t => ({
          ...normalizeWork(t, 'gfx'),
          isCreator: creatorHandles.has(t.attributedTo?.toLowerCase())
        }));

        const combined = [...vMapped, ...tMapped].sort((a, b) => {
          // Priority 1: Shinel flagship
          if (a.isShinel && !b.isShinel) return -1;
          if (!a.isShinel && b.isShinel) return 1;

          // Priority 2: Partner Creators
          if (a.isCreator && !b.isCreator) return -1;
          if (!a.isCreator && b.isCreator) return 1;

          // Priority 3: Natural order (ID/Date)
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
    return projects.filter(p => {
      const matchCat = activeCategory === "ALL" || p.category === activeCategory;
      const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [projects, activeCategory, searchQuery]);

  // Group projects by service type
  const projectsByService = useMemo(() => {
    const groups = {
      gfx: projects.filter(p => p.kind === "gfx" || p.category.includes("THUMBNAIL")),
      editing: projects.filter(p => p.kind === "video" || p.category.includes("VIDEO")),
      growth: projects.filter(p => p.category.includes("GROWTH")),
    };
    return groups;
  }, [projects]);

  // Calculate real stats from projects
  const stats = useMemo(() => {
    // Check if manual stats are enabled in global config
    const workPageConfig = config?.workPageStats;
    if (workPageConfig && !workPageConfig.useCalculated) {
      // Use manual stats from admin settings
      return {
        projects: workPageConfig.projectsDelivered || 0,
        clients: workPageConfig.happyClients || 0,
        views: workPageConfig.viewsGenerated || 0, // Already in millions
      };
    }

    // Otherwise calculate from project data
    const totalProjects = projects.length;

    // Count unique clients based on attributedTo field
    const uniqueClients = new Set(
      projects.map(p => p.attributedTo).filter(Boolean)
    ).size;
    const estimatedClients = uniqueClients > 0
      ? uniqueClients
      : Math.max(Math.floor(totalProjects / 10), 1);

    // Calculate total views from actual youtubeViews data
    const totalViews = projects.reduce((sum, p) => {
      return sum + (p.youtubeViews || 0);
    }, 0);

    return {
      projects: totalProjects,
      clients: estimatedClients,
      views: totalViews,
    };
  }, [projects, config]);

  // WhatsApp config
  const WHATSAPP_NUMBER = "918968141585";
  const wa = (message) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] selection:bg-[var(--orange)]/30">
      <MetaTags
        title="Our Work - Creative Portfolio | Shinel Studios"
        description="Explore our portfolio of high-CTR thumbnails, retention-focused video editing, and growth-optimized content. 500+ projects delivered for top creators."
        keywords="portfolio, video editing, thumbnails, YouTube growth, creative work showcase"
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Portfolio', url: '/work' },
        ]}
      />

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <GradientWaves
          colors={['#E85002', '#FF6B35', '#000000']}
          opacity={0.35}
          speed="medium"
        />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-20">
          <div className="absolute top-40 left-0 w-96 h-96 bg-[var(--orange)]/20 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-0 w-96 h-96 bg-[var(--orange)]/10 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--surface-alt)] border border-[var(--border)] text-[10px] sm:text-xs font-black tracking-widest uppercase text-[var(--orange)] mb-8"
          >
            <Sparkles size={14} className="animate-pulse" />
            Our Creative Portfolio
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-black mb-6 tracking-tighter leading-[0.9] text-[var(--text)]"
          >
            CREATIVE <span className="text-[var(--orange)]">EXCELLENCE</span><br />
            AT SCALE.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl max-w-3xl mx-auto mb-12 text-[var(--text-muted)] font-medium"
          >
            We don't just edit videos; we build visual engines that drive growth, authority, and engagement for top-tier creators.
          </motion.p>

          {/* Stats Counter */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12"
          >
            <StatsCounter end={stats.projects} suffix="+" label="Projects Delivered" duration={2000} />
            <StatsCounter end={stats.clients} suffix="+" label="Happy Clients" duration={2000} />
            <StatsCounter
              end={config?.workPageStats?.useCalculated === false ? stats.views : stats.views / 1000000}
              decimals={1}
              suffix="M+"
              label="Views Generated"
              duration={2500}
            />
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href={wa("I'm impressed with your portfolio! Let's talk about my project.")}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-[var(--orange)] text-white font-black hover:opacity-90 transition-all active:scale-95 text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              START YOUR PROJECT
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <button
              onClick={() => scrollToSection(featuredRef)}
              className="px-8 py-4 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--text)] font-black hover:bg-[var(--surface)] transition-all active:scale-95 text-sm sm:text-base w-full sm:w-auto"
            >
              EXPLORE WORK
            </button>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-16"
          >
            <motion.button
              onClick={() => scrollToSection(servicesRef)}
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[var(--text-muted)] hover:text-[var(--orange)] transition-colors"
            >
              <ChevronDown size={32} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* --- LIVE CASE STUDY (sG93nlZTayY) --- */}
      <LiveStatsCaseStudy
        videoId="sG93nlZTayY"
        projects={projects}
        fallbackTitle="Dynamic Stats Demo"
      />

      {/* --- SERVICES OVERVIEW SECTION --- */}
      <section
        ref={servicesRef}
        className="py-20 relative overflow-hidden"
        style={{
          contentVisibility: 'auto',
          containIntrinsicSize: '0 500px'
        }}
      >
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4 text-[var(--text)]">
              What We <span className="text-[var(--orange)]">Create</span>
            </h2>
            <p className="text-lg sm:text-xl text-[var(--text-muted)] max-w-2xl mx-auto">
              Explore our services and see the work that drives results
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {services.map((service, index) => (
              <ServiceCard
                key={service.key}
                service={service}
                index={index}
                onClick={() => {
                  const sectionId = `${service.key}-section`;
                  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* --- FEATURED WORK SECTION --- */}
      <section
        ref={featuredRef}
        id="portfolio-grid"
        className="py-20 bg-[var(--surface-alt)]"
        style={{
          contentVisibility: 'auto',
          containIntrinsicSize: '0 800px'
        }}
      >
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4 text-[var(--text)]">
              Featured <span className="text-[var(--orange)]">Work</span>
            </h2>
            <p className="text-lg sm:text-xl text-[var(--text-muted)] max-w-2xl mx-auto mb-8">
              Our best projects across all services
            </p>
          </motion.div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            {CATEGORIES.map(cat => (
              <FilterPill
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>

          {/* Search Bar */}
          <motion.div
            className="max-w-md mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--orange)] transition-colors"
              />
            </div>
          </motion.div>

          {/* Projects Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-video rounded-xl bg-[var(--surface)] animate-pulse" />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory + searchQuery}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredProjects.slice(0, 9).map((project, i) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <PortfolioItem project={project} index={i} />
                  </motion.div>
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
              <p className="text-xl text-[var(--text-muted)]">No projects found. Try adjusting your filters.</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* --- GFX WORK SECTION --- */}
      <div
        id="gfx-section"
        style={{
          contentVisibility: 'auto',
          containIntrinsicSize: '0 600px'
        }}
      >
        <WorkSection
          title="GFX / Thumbnails & Branding"
          description="High-CTR visuals that stop the scroll. Brand-consistent, premium, mobile-first designs that drive clicks and build authority."
          projects={projectsByService.gfx}
          gradient="linear-gradient(135deg, rgba(232,80,2,0.26), rgba(255,147,87,0.12))"
          links={[
            { label: "See All Thumbnails", path: "/thumbnails" },
            { label: "See All Branding", path: "/branding" },
          ]}
        />
      </div>

      {/* --- EDITING WORK SECTION --- */}
      <div
        id="editing-section"
        className="bg-[var(--surface-alt)]"
        style={{
          contentVisibility: 'auto',
          containIntrinsicSize: '0 600px'
        }}
      >
        <WorkSection
          title="Video Editing / Shorts & Long-form"
          description="Retention-focused edits that keep viewers watching. From hook to payoff, every frame is optimized for engagement and watch time."
          projects={projectsByService.editing}
          gradient="linear-gradient(135deg, rgba(2,132,199,0.20), rgba(2,132,199,0.10))"
          links={[
            { label: "See All Video Editing", path: "/video-editing" },
            { label: "See All Shorts", path: "/shorts" },
          ]}
        />
      </div>

      {/* --- GROWTH WORK SECTION --- */}
      <div
        id="growth-section"
        style={{
          contentVisibility: 'auto',
          containIntrinsicSize: '0 400px'
        }}
      >
        <WorkSection
          title="Growth / SEO & Optimization"
          description="Packaging and SEO that improves clicks and watch time. Data-driven strategies that turn views into subscribers."
          projects={projectsByService.growth}
          gradient="linear-gradient(135deg, rgba(34,197,94,0.16), rgba(34,197,94,0.08))"
          links={[
            { label: "Learn About Our SEO Services", path: "/services/growth/seo" },
          ]}
        />
      </div>

      {/* --- FINAL CTA SECTION --- */}
      <section className="py-20 bg-[var(--surface-alt)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--orange)] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--orange)] rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 text-[var(--text)]">
              Ready to Create <span className="text-[var(--orange)]">Something Amazing?</span>
            </h2>
            <p className="text-lg sm:text-xl text-[var(--text-muted)] max-w-2xl mx-auto mb-8">
              Let's bring your vision to life with our proven creative process
            </p>
            <a
              href={wa("I want to start a project with Shinel Studios!")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[var(--orange)] text-white font-black hover:opacity-90 transition-all active:scale-95 text-base sm:text-lg"
            >
              GET STARTED TODAY
              <ArrowUpRight size={24} />
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
