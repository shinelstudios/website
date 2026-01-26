import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  Search,
  Filter,
  LayoutGrid,
  Zap,
  Star
} from "lucide-react";
import { Link } from "react-router-dom";
import MetaTags, { BreadcrumbSchema } from "./MetaTags";
import PortfolioItem from "./PortfolioItem";
import { services } from "../data/servicesConfig";

/* ------------------------------ Portfolio API ------------------------------ */
const AUTH_BASE = import.meta.env.VITE_AUTH_BASE || "";

function normalizeWork(item, type) {
  const isVideo = type === 'video';
  return {
    id: item.id || (isVideo ? item.videoId : item.filename),
    title: item.title || item.filename,
    description: item.description || (isVideo ? `Video Category: ${item.category}` : `Thumbnail Project: ${item.category}`),
    category: item.category || "OTHER",
    image: isVideo
      ? `https://img.youtube.com/vi/${item.videoId}/maxresdefault.jpg`
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
      ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
      : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
      }`}
  >
    {label}
  </motion.button>
);

export default function WorkPage() {
  const reduced = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWork() {
      try {
        const [vRes, tRes] = await Promise.all([
          fetch(`${AUTH_BASE}/videos`),
          fetch(`${AUTH_BASE}/thumbnails`)
        ]);
        const vData = await vRes.json();
        const tData = await tRes.json();

        const vMapped = (vData.videos || []).map(v => normalizeWork(v, 'video'));
        const tMapped = (tData.thumbnails || []).map(t => normalizeWork(t, 'gfx'));

        setProjects([...vMapped, ...tMapped]);
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
      if (!p.isShinel) return false; // Strict public filter
      const matchCat = activeCategory === "ALL" || p.category === activeCategory;
      const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [projects, activeCategory, searchQuery]);

  // WhatsApp config
  const WHATSAPP_NUMBER = "918968141585";
  const wa = (message) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500/30">
      <MetaTags
        title="Portfolio | Shinel Studios - Creative Masterpieces"
        description="Explore our high-end portfolio of YouTube thumbnails, cinematic video edits, and premium channel branding."
        keywords="video editing portfolio, cinematic reels, high-ctr thumbnails, brand identity showcase"
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Portfolio', url: '/work' },
        ]}
      />

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-30">
          <div className="absolute top-40 left-0 w-96 h-96 bg-orange-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs font-black tracking-widest uppercase text-orange-500 mb-8"
          >
            <Sparkles size={14} className="animate-pulse" />
            Selection of our best work
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-black mb-6 tracking-tighter leading-[0.9]"
          >
            CREATIVE <span className="text-orange-500">EXCELLENCE</span><br />
            AT SCALE.
          </motion.h1>

          <motion.div
            initial="hidden"
            animate="visible"
            className="flex flex-wrap justify-center gap-x-2 text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 font-medium"
          >
            {"We don't just edit videos; we build visual engines that drive growth, authority, and engagement for top-tier creators.".split(" ").map((word, i) => (
              <motion.span
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.05 }}
              >
                {word}
              </motion.span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href={wa("I'm impressed with your portfolio! Let's talk about my project.")}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-orange-500 text-white font-black hover:bg-orange-600 transition-all active:scale-95 text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              START YOUR PROJECT
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <button
              onClick={() => document.getElementById('portfolio-grid')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition-all active:scale-95 text-sm sm:text-base w-full sm:w-auto"
            >
              EXPLORE WORK
            </button>
          </motion.div>
        </div>
      </section>

      {/* --- FILTER & SEARCH BAR --- */}
      <section className="sticky top-20 z-40 bg-black/60 backdrop-blur-xl border-y border-white/5 py-4">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar w-full lg:w-auto">
              {CATEGORIES.map(cat => (
                <FilterPill
                  key={cat}
                  label={cat}
                  active={activeCategory === cat}
                  onClick={() => setActiveCategory(cat)}
                />
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full lg:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- PROJECT GRID --- */}
      <main id="portfolio-grid" className="py-20 lg:py-32">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <LayoutGrid size={24} className="text-orange-500" />
              PORTFOLIO PROJECTS
            </h2>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Showing {filteredProjects.length} Items
            </div>
          </div>

          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          >
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-video rounded-[32px] bg-white/5 animate-pulse" />
              ))
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredProjects.map((project, idx) => (
                  <PortfolioItem key={project.id} project={project} index={idx} />
                ))}
              </AnimatePresence>
            )}
          </motion.div>

          {filteredProjects.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-40 text-center"
            >
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/5 border border-white/10 mb-6">
                <Filter size={32} className="text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-400 mb-2">No matches found</h3>
              <p className="text-gray-500">Try adjusting your category or search term.</p>
              <button
                onClick={() => { setActiveCategory("ALL"); setSearchQuery(""); }}
                className="mt-6 text-orange-500 font-black hover:underline"
              >
                Clear all filters
              </button>
            </motion.div>
          )}

          {/* Load More Mockup */}
          <div className="mt-20 text-center">
            <p className="text-gray-500 text-sm font-medium mb-8">Want to see more of our specific niche work?</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <PortfolioQuickLink to="/thumbnails" label="View Thumbnails" />
              <PortfolioQuickLink to="/video-editing" label="Video Editing" />
              <PortfolioQuickLink to="/shorts" label="Shorts / Reels" />
            </div>
          </div>
        </div>
      </main>

      {/* --- CTA FOOTER SECTION --- */}
      <section className="py-20 lg:py-40 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent pointer-events-none" />

        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl sm:text-6xl font-black mb-8 tracking-tighter leading-tight">
              READY TO BE OUR NEXT <br />
              <span className="text-orange-500">CASE STUDY?</span>
            </h2>
            <p className="text-gray-400 text-lg sm:text-xl mb-12 font-medium">
              We only work with a limited number of creators each month to ensure every project gets our studio-grade attention. Secure your spot in our pipeline.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={wa("Hi! I loved the portfolio and want to discuss a project.")}
                target="_blank"
                rel="noopener noreferrer"
                className="px-10 py-5 rounded-2xl bg-white text-black font-black flex items-center gap-3 text-lg"
              >
                BOOK A DISCOVERY CALL
                <ArrowUpRight size={24} />
              </motion.a>

              <div className="flex items-center gap-4 text-gray-500 font-bold uppercase tracking-widest text-xs">
                <div className="flex items-center gap-2">
                  <Star size={16} fill="currentColor" className="text-orange-500" />
                  98% Retention
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                  <Zap size={16} fill="currentColor" className="text-orange-500" />
                  48H Turnaround
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MOBILE MINI DOCK (Floating) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] sm:hidden">
        <motion.a
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          href="#contact"
          className="flex items-center gap-3 px-6 py-3 rounded-full bg-orange-500 text-white font-black text-sm shadow-2xl shadow-orange-500/50"
        >
          GET A QUOTE
          <Zap size={18} />
        </motion.a>
      </div>

      {/* Custom Styles for no-scrollbar */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

function PortfolioQuickLink({ to, label }) {
  return (
    <Link
      to={to}
    >
      <motion.div
        whileHover={{ y: -3 }}
        className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-orange-500 hover:border-orange-500/30 transition-all flex items-center gap-2"
      >
        {label}
        <ArrowUpRight size={14} />
      </motion.div>
    </Link>
  );
}
