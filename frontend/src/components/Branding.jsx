import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import MetaTags, { BreadcrumbSchema } from "./MetaTags";

// Shared animation helpers (mirrors WorkPage.jsx for consistency)
const mkFade = (reduced, delay = 0) => ({
  initial: { opacity: 0, y: reduced ? 0 : 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }
});

const mkViewFade = (reduced, delay = 0) => ({
  initial: { opacity: 0, y: reduced ? 0 : 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-10%" },
  transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }
});

/* ---------- fallback demo (used if no external data present) ---------- */
const FALLBACK = [
  {
    id: "l1",
    title: "Esports Logo — Nova Wolves",
    desc: "Bold crest-style logo optimized for avatars and stickers.",
    category: "LOGO",
    image: "https://placehold.co/1200x1200?text=Esports+Logo",
    tags: ["Logo", "Esports", "Mascot"],
    ratio: "1/1",
  },
  {
    id: "b1",
    title: "YouTube Channel Banner — TravelDaily",
    desc: "Clean banner with smart safe-area composition.",
    category: "BANNER",
    image: "https://placehold.co/2048x1152?text=YouTube+Banner",
    tags: ["Banner", "YouTube", "Travel"],
    ratio: "16/9",
  },
  {
    id: "o1",
    title: "Stream Overlay Pack — JustChatting",
    desc: "Alerts, lower-thirds, webcam frames, BRB and offline screens.",
    category: "OVERLAY",
    image: "https://placehold.co/1920x1080?text=Overlay+Pack",
    tags: ["Overlay", "Twitch", "Pack"],
    ratio: "16/9",
  },
];

/* ---------- helpers ---------- */
const inferCategory = (item = {}) => {
  if (item.category) return String(item.category).toUpperCase();
  const z = [
    item.title,
    item.subtitle,
    item.platform,
    item.creator,
    ...(Array.isArray(item.tags) ? item.tags : []),
  ]
    .join(" | ")
    .toLowerCase();

  if (/\blogo|brandmark|wordmark|mascot|avatar\b/.test(z)) return "LOGO";
  if (/\bbanner|cover|header\b/.test(z)) return "BANNER";
  if (/\boverlay|alerts|lower-?thirds|stinger|offline\b/.test(z)) return "OVERLAY";
  if (/\bpack|bundle|kit\b/.test(z)) return "PACKAGE";
  return "OTHER";
};

const ratioStyle = (r) => {
  if (!r) return { aspectRatio: "16 / 9" };
  if (r.includes("/")) {
    const [w, h] = r.split("/").map(Number);
    if (w && h) return { aspectRatio: `${w} / ${h}` };
  }
  return { aspectRatio: "16 / 9" };
};

/* ---------- tiny UI atoms ---------- */
const FilterChip = ({ children, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-xs sm:text-sm px-3 py-1 rounded-full border transition-colors whitespace-nowrap"
    style={{
      color: active ? "#fff" : "var(--orange)",
      background: active
        ? "var(--orange)"
        : "color-mix(in oklab, var(--orange) 12%, transparent)",
      borderColor: active
        ? "var(--orange)"
        : "color-mix(in oklab, var(--orange) 35%, transparent)",
    }}
  >
    {children}
  </button>
);

const Tag = ({ children }) => (
  <span
    className="text-[10px] sm:text-xs px-2 py-1 rounded-full"
    style={{
      color: "var(--orange)",
      background: "color-mix(in oklab, var(--orange) 12%, transparent)",
      border: "1px solid color-mix(in oklab, var(--orange) 35%, transparent)",
    }}
  >
    {children}
  </span>
);

/* ---------- Skeleton ---------- */
const SkeletonCard = () => (
  <div
    className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] animate-pulse"
  >
    <div className="w-full aspect-[16/9] bg-[var(--text-muted)]/10" />
    <div className="p-4 sm:p-5 space-y-3">
      <div className="flex gap-2">
        <div className="h-5 bg-[var(--text-muted)]/10 rounded w-16"></div>
      </div>
      <div className="h-6 bg-[var(--text-muted)]/10 rounded w-3/4"></div>
      <div className="h-4 bg-[var(--text-muted)]/10 rounded w-full"></div>
      <div className="pt-2">
        <div className="h-9 bg-[var(--text-muted)]/10 rounded w-20"></div>
      </div>
    </div>
  </div>
);

/* ---------- Card (full-card anchor + modal via hash) ---------- */
const BrandCard = ({ item, reduced }) => (
  <motion.article
    {...mkViewFade(reduced)}
    className="group rounded-2xl overflow-hidden border shadow-sm hover:shadow-2xl transition-all relative"
    style={{ background: "var(--surface)", borderColor: "var(--border)" }}
  >
    <a
      href={`#/branding/${item.id}`}
      className="absolute inset-0 z-[1]"
      aria-label={`Open ${item.title}`}
    />

    <div className="relative w-full bg-black/5" style={ratioStyle(item.ratio)}>
      {item.image ? (
        <img
          src={item.image}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          loading="lazy"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-sm text-gray-400">
          No Image
        </div>
      )}

      {/* Glassy Category Badge */}
      <div
        className="absolute left-3 top-3 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg"
        style={{
          background: "rgba(0,0,0,.6)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,.15)",
        }}
      >
        {item.category}
      </div>
      
      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
         <span className="text-white text-xs font-bold flex items-center gap-2">
            View Project <span className="text-[var(--orange)]">→</span>
         </span>
      </div>
    </div>

    <div className="p-4 sm:p-5 relative z-[2]">
      <h3 className="text-base sm:text-lg font-bold mb-1 line-clamp-1 group-hover:text-[var(--orange)] transition-colors" style={{ color: "var(--text)" }}>
        {item.title}
      </h3>
      <p className="text-sm mb-3 line-clamp-2" style={{ color: "var(--text-muted)" }}>
        {item.desc}
      </p>
      {item.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.tags.map((t, i) => (
            <Tag key={i}>{t}</Tag>
          ))}
        </div>
      )}
    </div>
  </motion.article>
);

/* ---------- Page ---------- */
export default function Branding() {
  const reduced = useReducedMotion();
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load data (optional JSON / global) then fallback
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/data/brandingProjects.json", { cache: "no-store" });
        if (res.ok) {
          const arr = await res.json();
          if (!cancelled) { setRaw(Array.isArray(arr) ? arr : []); return; }
        }
      } catch { }
      try {
        const g = window.__BRANDING_PROJECTS__;
        if (!cancelled && Array.isArray(g)) { setRaw(g); return; }
      } catch { }
      if (!cancelled) setRaw(FALLBACK);
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Normalize
  const items = useMemo(() => {
    const src = Array.isArray(raw) ? raw : [];
    return src.map((it, i) => ({
      id: String(it.id ?? i + 1),
      title: it.title || `Brand Asset ${i + 1}`,
      desc: it.desc || it.subtitle || "Crafted for clarity and recognizability across platforms.",
      image: it.image || it.src || "",
      category: inferCategory(it),
      tags: Array.isArray(it.tags) ? it.tags : [],
      ratio: it.ratio || (inferCategory(it) === "LOGO" ? "1/1" : "16/9"),
    }));
  }, [raw]);

  // Filters
  const categories = useMemo(() => {
    const base = ["ALL", "LOGO", "BANNER", "OVERLAY", "PACKAGE", "OTHER"];
    const set = new Set(base);
    items.forEach((p) => set.add((p.category || "OTHER").toUpperCase()));
    return ["ALL", ...Array.from(set).filter((c) => c !== "ALL")];
  }, [items]);

  const [selected, setSelected] = useState("ALL");
  const filtered = useMemo(
    () => (selected === "ALL" ? items : items.filter((x) => (x.category || "OTHER").toUpperCase() === selected)),
    [items, selected]
  );

  // header offset
  useEffect(() => {
    const header = document.querySelector("header");
    const update = () => {
      if (header) {
        const h = Math.round(header.getBoundingClientRect().height);
        document.documentElement.style.setProperty("--header-h", `${h}px`);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // decorative dots
  const dots = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 6 + Math.random() * 10,
        opacity: 0.15 + Math.random() * 0.25,
      })),
    []
  );

  /* --------------- Modal + hash routing (generic) --------------- */
  const [openId, setOpenId] = useState(null);

  const openById = useCallback((id, push = true) => {
    if (!id) return;
    if (push && location.hash !== `#/branding/${id}`) {
      history.pushState({}, "", `#/branding/${id}`);
    }
    window.dispatchEvent(new CustomEvent("open:branding", { detail: { id } }));
  }, []);

  const closeModal = useCallback(() => {
    setOpenId(null);
    if (/^#\/branding\/\w+/.test(location.hash)) {
      history.pushState({}, "", location.pathname + location.search);
    }
  }, []);

  // global action listener
  useEffect(() => {
    const onOpen = (e) => setOpenId(e.detail.id);
    window.addEventListener("open:branding", onOpen);
    return () => window.removeEventListener("open:branding", onOpen);
  }, []);

  // deep link + back/forward
  useEffect(() => {
    const m = location.hash.match(/^#\/branding\/(\w+)/);
    if (m) setOpenId(m[1]);
    const onPop = () => {
      const mm = location.hash.match(/^#\/branding\/(\w+)/);
      setOpenId(mm ? mm[1] : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // delegate clicks anywhere in grid
  const gridRef = useRef(null);
  const onGridClick = useCallback(
    (e) => {
      const a = e.target.closest('a[href^="#/branding/"]');
      if (!a) return;
      e.preventDefault();
      const m = a.getAttribute("href").match(/^#\/branding\/(\w+)/);
      if (m) openById(m[1]);
    },
    [openById]
  );

  const current = useMemo(
    () => items.find((x) => String(x.id) === String(openId)) || null,
    [items, openId]
  );

  return (
    <div className="min-h-screen">
      <MetaTags
        title="Logo & Branding Design | Shinel Studios - Visual Identity for Creators"
        description="Premium logos, channel banners, and stream overlays. Build a cohesive visual brand that scales across all platforms."
        keywords="branding design, esports logo, youtube banner, twitch overlay, creator identity"
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Work', url: '/work' },
          { name: 'Branding', url: '/branding' },
        ]}
      />

      {/* Hero */}
      <section className="pt-32 pb-12 relative text-center overflow-hidden" style={{ background: "var(--hero-bg)" }}>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div {...mkFade(reduced)} className="inline-block px-3 py-1 rounded-full bg-[var(--orange)]/10 border border-[var(--orange)]/30 text-[var(--orange)] text-[10px] font-black uppercase tracking-widest mb-4">
             Cohesive Visual Identity
          </motion.div>
          <motion.h1
            {...mkFade(reduced, 0.1)}
            className="text-4xl sm:text-6xl md:text-7xl font-black font-['Poppins'] tracking-tight"
            style={{ color: "var(--text)" }}
          >
            Premium Brand <span className="text-white p-1 px-3 bg-[var(--orange)] rounded-xl">Kits</span>
          </motion.h1>
          <motion.p
            {...mkFade(reduced, 0.2)}
            className="mt-6 text-base sm:text-xl max-w-2xl mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            We build high-impact brand identities for creators and businesses that scale from avatars to billboards.
          </motion.p>

          <motion.div {...mkFade(reduced, 0.3)} className="mt-10 flex flex-wrap justify-center gap-3">
            {categories.map((c) => (
              <FilterChip key={c} active={c === selected} onClick={() => setSelected(c)}>
                {c}
              </FilterChip>
            ))}
          </motion.div>
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {dots.map((d) => (
            <span
              key={d.id}
              className="absolute rounded-full"
              style={{
                left: d.left,
                top: d.top,
                width: d.size,
                height: d.size,
                background: "var(--orange)",
                opacity: d.opacity,
                filter: "blur(0.5px)",
              }}
            />
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="py-16 sm:py-20" style={{ background: "var(--surface)" }}>
        <div className="container mx-auto px-3 sm:px-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
               {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface-alt)]/50">
               <p className="font-bold text-[var(--text-muted)]">No projects found in this category.</p>
            </div>
          ) : (
            <div
              ref={gridRef}
              onClick={onGridClick}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
              style={{
                contentVisibility: 'auto',
                containIntrinsicSize: '0 800px'
              }}
            >
              {filtered.map((it) => (
                <BrandCard key={it.id} item={it} reduced={reduced} />
              ))}
            </div>
          )}

          {/* CTA */}
          <div
            className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl p-5"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3" style={{ color: "var(--text)" }}>
              <span className="inline-block h-5 w-5 rounded-full" style={{ background: "var(--orange)" }} />
              <p className="font-medium">Want a unified brand kit in under a week?</p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://wa.me/919988090788"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg text-white"
                style={{ background: "var(--orange)" }}
              >
                WhatsApp Us
              </a>
              <a
                href="/#services"
                className="px-4 py-2 rounded-lg"
                style={{ border: "1px solid var(--border)", color: "var(--text)" }}
              >
                See Services
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Modal (image preview) */}
      {openId && current && (
        <div
          className="fixed inset-0 z-50 bg-black/60 p-6 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="relative w-[min(1100px,96vw)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] overflow-hidden">
            <button
              onClick={closeModal}
              className="icon-btn absolute right-3 top-3 border border-[var(--border)] bg-[var(--surface-alt)] z-10"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="w-full bg-black/5" style={ratioStyle(current.ratio)}>
              {current.image ? (
                <img
                  src={current.image}
                  alt={current.title}
                  className="w-full h-full object-contain bg-black"
                  loading="eager"
                />
              ) : (
                <div className="grid place-items-center w-full h-full text-sm" style={{ color: "var(--text-muted)" }}>
                  No image
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5">
              <h3 className="text-base sm:text-lg font-semibold mb-1" style={{ color: "var(--text)" }}>
                {current.title}
              </h3>
              <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                {current.category}
              </p>
              {current.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {current.tags.map((t, i) => (
                    <Tag key={i}>{t}</Tag>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
