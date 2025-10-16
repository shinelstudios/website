// frontend/src/components/Thumbnails.jsx
import React, { useMemo, useState, useEffect } from "react";

/* ---------- fallback demo data (used when no data file is present) ---------- */
const FALLBACK = [
  {
    id: 1,
    title: "Sample Gaming Thumbnail",
    desc: "High-CTR thumbnail designed for gaming creators.",
    category: "GAMING",
    image: "https://placehold.co/600x400?text=Gaming+Thumbnail",
    tags: ["Gaming", "YouTube"],
  },
  {
    id: 2,
    title: "Lifestyle Vlog Preview",
    desc: "Clean and vibrant lifestyle thumbnail example.",
    category: "VLOG",
    image: "https://placehold.co/600x400?text=Vlog+Thumbnail",
    tags: ["Vlog", "Travel"],
  },
];

/* ---------- helpers ---------- */
const norm = (s = "") => String(s).toLowerCase();

/** Infer a category dynamically if not provided */
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

  if (/\blive|stream\b/.test(z)) return "LIVE";
  if (/\bgaming|bgmi|valorant|pubg\b/.test(z)) return "GAMING";
  if (/\bvlog\b/.test(z)) return "VLOG";
  if (/\bdoc(umentary)?\b/.test(z)) return "DOCUMENTARY";
  if (/\bedu(cation|tutorial|guide)\b/.test(z)) return "EDUCATION";
  if (/\btech|review|unboxing\b/.test(z)) return "TECH";
  if (/\bclient|brand\b/.test(z)) return "CLIENT WORK";
  return "OTHER";
};

/* ---------- small UI atoms ---------- */
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

/* ---------- Thumbnail Card ---------- */
const ThumbCard = ({ t }) => (
  <article
    className="rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all"
    style={{ background: "var(--surface)", borderColor: "var(--border)" }}
  >
    <div className="relative w-full aspect-[16/10] bg-black/5">
      {t.image ? (
        <img
          src={t.image}
          alt={t.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            // hide broken image gracefully
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
          No Image
        </div>
      )}

      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, rgba(232,80,2,.18), rgba(232,80,2,.04))",
        }}
      />

      <div
        className="absolute left-3 top-3 px-2 py-1 rounded-md text-[11px] font-semibold"
        style={{
          background: "rgba(0,0,0,.55)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,.15)",
        }}
      >
        {t.category}
      </div>
    </div>

    <div className="p-4 sm:p-5">
      <h3
        className="text-base sm:text-lg font-semibold mb-1 line-clamp-2"
        style={{ color: "var(--text)" }}
      >
        {t.title}
      </h3>
      <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
        {t.desc}
      </p>

      {t.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {t.tags.map((x, i) => (
            <Tag key={i}>{x}</Tag>
          ))}
        </div>
      )}
    </div>
  </article>
);

/* ---------- Main Page ---------- */
export default function Thumbnails() {
  const [rawData, setRawData] = useState(null);

  // Load data at runtime (no build-time import):
  // 1) Try JSON at /data/thumbnailProjects.json (optional)
  // 2) Try global window.__THUMBNAIL_PROJECTS__ (optional)
  // 3) Fallback demo array
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // 1) JSON file (optional)
      try {
        const res = await fetch("/data/thumbnailProjects.json", { cache: "no-store" });
        if (res.ok) {
          const arr = await res.json();
          if (!cancelled) {
            setRawData(Array.isArray(arr) ? arr : []);
            return;
          }
        }
      } catch {}

      // 2) Global variable (optional)
      try {
        const globalArr = window.__THUMBNAIL_PROJECTS__;
        if (!cancelled && Array.isArray(globalArr)) {
          setRawData(globalArr);
          return;
        }
      } catch {}

      // 3) Fallback
      if (!cancelled) setRawData(FALLBACK);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Normalize & infer categories when data is available
  const items = useMemo(() => {
    const src = Array.isArray(rawData) ? rawData : [];
    return src.map((it, idx) => {
      const cat = inferCategory(it);
      return {
        id: it.id ?? idx + 1,
        title: it.title || `Thumbnail ${idx + 1}`,
        desc: it.desc || it.subtitle || "Eye-catching, brand-true thumbnail.",
        image: it.image || it.src || "",
        category: cat,
        tags: Array.isArray(it.tags) ? it.tags : [],
      };
    });
  }, [rawData]);

  const categories = useMemo(() => {
    const base = [
      "ALL",
      "LIVE",
      "GAMING",
      "VLOG",
      "DOCUMENTARY",
      "EDUCATION",
      "TECH",
      "CLIENT WORK",
      "OTHER",
    ];
    const set = new Set(base);
    items.forEach((p) => set.add((p.category || "OTHER").toUpperCase()));
    return ["ALL", ...Array.from(set).filter((c) => c !== "ALL")];
  }, [items]);

  const [selected, setSelected] = useState("ALL");

  const filtered = useMemo(() => {
    if (selected === "ALL") return items;
    return items.filter((x) => (x.category || "OTHER").toUpperCase() === selected);
  }, [items, selected]);

  // Fix for header overlap
  useEffect(() => {
    const header = document.querySelector("header");
    const updateHeight = () => {
      if (header) {
        const h = Math.round(header.getBoundingClientRect().height);
        document.documentElement.style.setProperty("--header-h", `${h}px`);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // decorative dots
  const dots = useMemo(
    () =>
      Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 6 + Math.random() * 10,
        opacity: 0.15 + Math.random() * 0.25,
      })),
    []
  );

  return (
    <div className="min-h-screen">
      <title>Thumbnails | Shinel Studios</title>
      <meta
        name="description"
        content="High-CTR thumbnails designed for clicks and retention — crafted to match your brand."
      />

      {/* Hero Section */}
      <section className="pt-28 pb-10 relative text-center" style={{ background: "var(--hero-bg)" }}>
        <div className="container mx-auto px-4">
          <h1
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold font-['Poppins']"
            style={{ color: "var(--text)" }}
          >
            Thumbnail <span style={{ color: "var(--orange)" }}>Gallery</span>
          </h1>
          <p
            className="mt-4 text-base sm:text-lg md:text-xl max-w-3xl mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            Designed for clicks, optimized for retention — crafted to match your brand.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2 px-2 sm:px-0">
            {categories.map((c) => (
              <FilterChip key={c} active={c === selected} onClick={() => setSelected(c)}>
                {c}
              </FilterChip>
            ))}
          </div>
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

      {/* Grid Section */}
      <section className="py-12 sm:py-14" style={{ background: "var(--surface)" }}>
        <div className="container mx-auto px-3 sm:px-4">
          {!rawData ? (
            <p className="text-center text-sm sm:text-base" style={{ color: "var(--text-muted)" }}>
              Loading…
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm sm:text-base" style={{ color: "var(--text-muted)" }}>
              No thumbnails available yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {filtered.map((t) => (
                <ThumbCard key={t.id} t={t} />
              ))}
            </div>
          )}

          {/* CTA Row */}
          <div
            className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl p-5"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3" style={{ color: "var(--text)" }}>
              <span className="inline-block h-5 w-5 rounded-full" style={{ background: "var(--orange)" }} />
              <p className="font-medium">Need a thumbnail sprint for your next launch?</p>
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
    </div>
  );
}
