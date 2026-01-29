import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import MetaTags, { BreadcrumbSchema } from "./MetaTags";

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

/* ---------- Card (full-card anchor + modal via hash) ---------- */
const BrandCard = ({ item }) => (
  <article
    className="group rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all relative"
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
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-sm text-gray-400">
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
        {item.category}
      </div>
    </div>

    <div className="p-4 sm:p-5 relative z-[2]">
      <h3 className="text-base sm:text-lg font-semibold mb-1 line-clamp-2" style={{ color: "var(--text)" }}>
        {item.title}
      </h3>
      <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
        {item.desc}
      </p>
      {item.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.tags.map((t, i) => (
            <Tag key={i}>{t}</Tag>
          ))}
        </div>
      )}
      <div className="mt-4">
        <a
          href={`#/branding/${item.id}`}
          className="inline-block px-3 py-1.5 rounded-lg text-white text-xs sm:text-sm"
          style={{ background: "var(--orange)" }}
        >
          View
        </a>
      </div>
    </div>
  </article>
);

/* ---------- Page ---------- */
export default function Branding() {
  const [raw, setRaw] = useState(null);

  // Load data (optional JSON / global) then fallback
  useEffect(() => {
    let cancelled = false;
    (async () => {
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
    })();
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
      <section className="pt-28 pb-10 relative text-center" style={{ background: "var(--hero-bg)" }}>
        <div className="container mx-auto px-4">
          <h1
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold font-['Poppins']"
            style={{ color: "var(--text)" }}
          >
            Logo / Banner / <span style={{ color: "var(--orange)" }}>Overlays</span> (3-in-1)
          </h1>
          <p
            className="mt-4 text-base sm:text-lg md:text-xl max-w-3xl mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            Cohesive brand kits that scale from avatars to stream scenes and YouTube channel art.
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

      {/* Grid */}
      <section className="py-12 sm:py-14" style={{ background: "var(--surface)" }}>
        <div className="container mx-auto px-3 sm:px-4">
          {!raw ? (
            <p className="text-center text-sm sm:text-base" style={{ color: "var(--text-muted)" }}>
              Loading…
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm sm:text-base" style={{ color: "var(--text-muted)" }}>
              No brand assets yet.
            </p>
          ) : (
            <div
              ref={gridRef}
              onClick={onGridClick}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
              style={{
                contentVisibility: 'auto',
                containIntrinsicSize: '0 800px'
              }}
            >
              {filtered.map((it) => (
                <BrandCard key={it.id} item={it} />
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
