// src/components/Shorts.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";

/* Small tag chip for category filtering */
const Tag = ({ children, active, onClick }) => (
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

/* Demo data (replace with actual content later) */
const ALL_ITEMS = Array.from({ length: 18 }).map((_, i) => {
  const categories = ["YOUTUBE SHORTS", "TIKTOK", "REELS", "GAMING", "VLOG", "EDUCATION"];
  return {
    id: String(i + 1),
    title: `Short ${i + 1}`,
    desc: "Snappy, scroll-stopping short-form edit.",
    category: categories[i % categories.length],
    ratio: i % 3 === 0 ? "9/16" : "1/1",
    // placeholder art
    thumb: `https://picsum.photos/seed/short_${i + 1}/${i % 3 === 0 ? "540/960" : "640/640"}`
  };
});

export default function Shorts() {
  const [category, setCategory] = useState("ALL");
  const [openId, setOpenId] = useState(null);
  const listRef = useRef(null);

  // categories for filter bar
  const categories = useMemo(
    () => ["ALL", "YOUTUBE SHORTS", "TIKTOK", "REELS", "GAMING", "VLOG", "EDUCATION"],
    []
  );

  // filtered results
  const items = useMemo(() => {
    if (category === "ALL") return ALL_ITEMS;
    return ALL_ITEMS.filter((x) => x.category === category);
  }, [category]);

  // currently open item
  const current = useMemo(() => items.find((x) => x.id === openId)
    || ALL_ITEMS.find((x) => x.id === openId)
    || null, [items, openId]);

  // dynamically adjust for header height
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

  // subtle background dots
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

  /* ---------------- Modal + hash routing ---------------- */

  // open helper: push hash and emit the global action (handled app-wide)
  const openById = useCallback((id, push = true) => {
    if (!id) return;
    if (push && location.hash !== `#/shorts/${id}`) {
      history.pushState({}, "", `#/shorts/${id}`);
    }
    // fire the global event so any listener (including this page) reacts
    window.dispatchEvent(new CustomEvent("open:short", { detail: { id } }));
  }, []);

  const closeModal = useCallback(() => {
    setOpenId(null);
    if (/^#\/shorts\/\w+/.test(location.hash)) {
      history.pushState({}, "", location.pathname + location.search);
    }
  }, []);

  // Listen to the generic hash router event
  useEffect(() => {
    const onOpen = (e) => setOpenId(e.detail.id);
    window.addEventListener("open:short", onOpen);
    return () => window.removeEventListener("open:short", onOpen);
  }, []);

  // Deep link on load & back/forward safety net
  useEffect(() => {
    const match = location.hash.match(/^#\/shorts\/(\w+)/);
    if (match) setOpenId(match[1]);
    const onPop = () => {
      const m = location.hash.match(/^#\/shorts\/(\w+)/);
      setOpenId(m ? m[1] : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // make whole card clickable via delegation
  const onGridClick = useCallback((e) => {
    const a = e.target.closest('a[href^="#/shorts/"]');
    if (!a) return;
    e.preventDefault(); // prevent accidental navigation
    const m = a.getAttribute("href").match(/^#\/shorts\/(\w+)/);
    if (m) openById(m[1]);
  }, [openById]);

  // horizontal scroll helpers (if you later switch to a rail)
  const scrollByCards = useCallback((dir = 1) => {
    const el = listRef.current;
    if (!el) return;
    const card = el.querySelector("article");
    const w = (card?.getBoundingClientRect().width || 240) + 16;
    el.scrollBy({ left: dir * w * 3, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-28 pb-10 relative overflow-hidden" style={{ background: "var(--hero-bg)" }}>
        <div className="container mx-auto px-4 text-center sm:text-left">
          <div className="max-w-5xl mx-auto">
            <h1
              className="text-3xl sm:text-4xl md:text-6xl font-extrabold font-['Poppins'] leading-tight"
              style={{ color: "var(--text)" }}
            >
              Shorts <span style={{ color: "var(--orange)" }}>Gallery ⚡</span>
            </h1>
            <p
              className="mt-4 text-base sm:text-lg md:text-xl max-w-3xl mx-auto sm:mx-0"
              style={{ color: "var(--text-muted)" }}
            >
              Hooky openers, punchy pacing, and platform-native captions — built
              for Shorts, Reels & TikTok.
            </p>

            {/* Category filter */}
            <div className="mt-6 flex flex-wrap justify-center sm:justify-start gap-2 px-2 sm:px-0">
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

      {/* Shorts Grid */}
      <section className="py-12 sm:py-14" style={{ background: "var(--surface)" }}>
        <div className="container mx-auto px-3 sm:px-4">
          <div
            ref={listRef}
            onClick={onGridClick}
            className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {items.map((g) => (
              <article
                key={g.id}
                className="group rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all relative"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                {/* Make whole card clickable via a full-cover anchor */}
                <a
                  href={`#/shorts/${g.id}`}
                  className="absolute inset-0 z-[1]"
                  aria-label={`Open ${g.title}`}
                />

                <div
                  className="relative w-full bg-black/5"
                  style={{ aspectRatio: g.ratio === "1/1" ? "1 / 1" : "9 / 16" }}
                >
                  <img
                    src={g.thumb}
                    alt={g.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
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

                <div className="p-3 sm:p-4 relative z-[2]">
                  <h3 className="text-sm md:text-base font-semibold mb-1 line-clamp-2" style={{ color: "var(--text)" }}>
                    {g.title}
                  </h3>
                  <p className="text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>
                    {g.desc}
                  </p>
                  <div className="mt-3">
                    <a
                      href={`#/shorts/${g.id}`}
                      className="inline-block px-3 py-1.5 rounded-lg text-white text-xs md:text-sm"
                      style={{ background: "var(--orange)" }}
                    >
                      View
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* CTA Section */}
          <div
            className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl p-5 sm:p-6"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left" style={{ color: "var(--text)" }}>
              <span className="inline-block h-5 w-5 rounded-full" style={{ background: "var(--orange)" }} />
              <p className="font-medium">Need a week of Shorts ready to post?</p>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-end gap-3">
              <a
                href="https://wa.me/918968141585"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg text-white text-sm sm:text-base"
                style={{ background: "var(--orange)" }}
              >
                WhatsApp Us
              </a>
              <a
                href="/#services"
                className="px-4 py-2 rounded-lg text-sm sm:text-base"
                style={{ border: "1px solid var(--border)", color: "var(--text)" }}
              >
                See Services
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Modal */}
      {openId && (
        <div
          className="fixed inset-0 z-50 bg-black/60 p-6 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="relative w-[min(420px,92vw)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            <button
              onClick={closeModal}
              className="icon-btn absolute right-3 top-3 border border-[var(--border)] bg-[var(--surface-alt)]"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="relative">
              <div
                className="grid place-items-center bg-black text-white font-bold text-lg"
                style={{ aspectRatio: "9 / 16" }}
              >
                {current ? (
                  <img
                    src={current.thumb}
                    alt={current.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : null}
                <span className="relative z-[1] mix-blend-difference">Playing short {openId}</span>
              </div>
              <div className="p-3">
                <div className="font-semibold" style={{ color: "var(--text)" }}>
                  {current?.title || `Short ${openId}`}
                </div>
                <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {current?.category || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
