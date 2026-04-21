/**
 * SpecialtyCard — one of the 3 AI-specialty tiles on the Work page,
 * and re-used inside the related-specialties band on sub-pages.
 *
 * Each card takes its palette from the specialty config. Cover image
 * falls back to the specialty's placeholder SVG which is shipped in
 * `public/assets/specialties/<slug>/placeholder.svg`.
 */
import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function SpecialtyCard({ specialty }) {
  if (!specialty) return null;
  const { slug, path, title, tagline, palette, services = [] } = specialty;
  const cover = `/assets/specialties/${slug}/placeholder.svg`;

  return (
    <Link
      to={path}
      className="group relative flex flex-col rounded-2xl md:rounded-3xl overflow-hidden hairline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--orange)]"
      style={{
        background: `linear-gradient(145deg, ${palette.accentSoft}, var(--surface))`,
        border: `1px solid ${palette.accentSoft}`,
      }}
      aria-label={`Explore ${title}`}
    >
      {/* Cover */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "16 / 9", background: "#0a0a0a" }}
      >
        <img
          src={cover}
          alt=""
          loading="lazy"
          decoding="async"
          className="block w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(120% 80% at 50% 100%, ${palette.glow}, transparent 70%)`,
          }}
        />
        {/* accent badge */}
        <span
          className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-[0.25em] px-2.5 py-1 rounded-full"
          style={{ background: palette.accent, color: "#0a0a0a" }}
        >
          Specialty
        </span>
      </div>

      {/* Body */}
      <div className="p-5 md:p-6 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3
            className="text-xl md:text-2xl font-black leading-tight"
            style={{ color: "var(--text)" }}
          >
            {title}
          </h3>
          <ArrowUpRight
            size={18}
            className="shrink-0 mt-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            style={{ color: palette.accent }}
          />
        </div>
        <p className="text-sm md:text-base" style={{ color: "var(--text-muted)" }}>
          {tagline}
        </p>
        {services.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 mt-1">
            {services.slice(0, 4).map((s) => (
              <li
                key={s}
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  color: palette.accent,
                  background: palette.accentSoft,
                  border: `1px solid ${palette.accentSoft}`,
                }}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
        <span
          className="mt-auto inline-flex items-center gap-1 text-sm font-black uppercase tracking-[0.18em]"
          style={{ color: palette.accent }}
        >
          See the work
          <ArrowUpRight size={14} />
        </span>
      </div>
    </Link>
  );
}
