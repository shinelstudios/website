// src/components/Shorts.jsx
import React, { useEffect, useMemo, useState } from "react";

/** small tag chip (same styling/behavior as Thumbnails) */
const Tag = ({ children, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-xs px-3 py-1 rounded-full border transition-colors"
    style={{
      color: active ? "#fff" : "var(--orange)",
      background: active ? "var(--orange)" : "color-mix(in oklab, var(--orange) 12%, transparent)",
      borderColor: active ? "var(--orange)" : "color-mix(in oklab, var(--orange) 35%, transparent)",
    }}
  >
    {children}
  </button>
);

/* Demo data (replace with real items if you have them) */
const ALL_ITEMS = Array.from({ length: 18 }).map((_, i) => {
  const categories = ["YOUTUBE SHORTS", "TIKTOK", "REELS", "GAMING", "VLOG", "EDUCATION"];
  return {
    id: i + 1,
    title: `Short ${i + 1}`,
    desc: "Snappy, scroll-stopping short-form edit.",
    category: categories[i % categories.length],
    ratio: i % 3 === 0 ? "9/16" : "1/1", // just to vary placeholders
  };
});

export default function Shorts() {
  const [category, setCategory] = useState("ALL");

  // Categories chip row (same pattern as Thumbnails.jsx)
  const categories = useMemo(
    () => ["ALL", "YOUTUBE SHORTS", "TIKTOK", "REELS", "GAMING", "VLOG", "EDUCATION"],
    []
  );

  const items = useMemo(() => {
    if (category === "ALL") return ALL_ITEMS;
    return ALL_ITEMS.filter((x) => x.category === category);
  }, [category]);

  // keep spacing consistent with fixed header (doesn't render its own header)
  useEffect(() => {
    document.documentElement.style.setProperty("--header-h", "76");
  }, []);

  // decorative dots (same as Thumbnails.jsx)
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
      {/* Hero */}
      <section className="pt-28 pb-10 relative" style={{ background: "var(--hero-bg)" }}>
        <div className="container mx-auto px-4">
          <div className="max-w-5xl">
            <h1
              className="text-4xl md:text-6xl font-extrabold font-['Poppins'] leading-tight"
              style={{ color: "var(--text)" }}
            >
              Shorts Gallery ⚡
            </h1>
            <p className="mt-5 text-lg md:text-xl" style={{ color: "var(--text-muted)" }}>
              Hooky openers, punchy pacing, and platform-native captions—built for Shorts, Reels & TikTok.
            </p>

            {/* Category filter buttons */}
            <div className="mt-6 flex flex-wrap gap-2">
              {categories.map((c) => (
                <Tag key={c} active={c === category} onClick={() => setCategory(c)}>
                  {c}
                </Tag>
              ))}
            </div>
          </div>
        </div>

        {/* decorative dots */}
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
      <section className="py-14" style={{ background: "var(--surface)" }}>
        <div className="container mx-auto px-4">
          {/* In Shorts we typically prefer 9:16 or 1:1 cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((g) => (
              <article
                key={g.id}
                className="rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="relative w-full bg-black/5" style={{ aspectRatio: g.ratio === "1/1" ? "1 / 1" : "9 / 16" }}>
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(135deg, rgba(232,80,2,.20), rgba(232,80,2,.06))" }}
                  />
                  <div
                    className="absolute left-2 top-2 px-2 py-1 rounded-md text-[10px] font-semibold"
                    style={{
                      background: "rgba(0,0,0,.55)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,.15)",
                    }}
                  >
                    {g.category}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm md:text-base font-semibold mb-1 line-clamp-2" style={{ color: "var(--text)" }}>
                    {g.title}
                  </h3>
                  <p className="text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>
                    {g.desc}
                  </p>
                  <div className="mt-3">
                    <button
                      className="px-3 py-1.5 rounded-lg text-white text-xs md:text-sm"
                      style={{ background: "var(--orange)" }}
                    >
                      View
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* CTA Row */}
          <div
            className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl p-5"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3" style={{ color: "var(--text)" }}>
              <span className="inline-block h-5 w-5 rounded-full" style={{ background: "var(--orange)" }} />
              <p className="font-medium">Need a week of Shorts ready to post?</p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://wa.me/918968141585"
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
