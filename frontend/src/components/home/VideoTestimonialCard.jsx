/**
 * VideoTestimonialCard — testimonial with a YouTube video thumbnail/play.
 * Click → opens the video on YouTube. Avoids embedding iframes inline
 * (heavy on initial render) but conveys it's a real video testimonial.
 */
import React from "react";
import { Play, Quote } from "lucide-react";
import { HairlineCard } from "../../design";

export default function VideoTestimonialCard({ testimonial }) {
  const t = testimonial;
  const href = t.videoId ? `https://www.youtube.com/watch?v=${t.videoId}` : "#";
  const thumb = t.thumbnail || (t.videoId ? `https://img.youtube.com/vi/${t.videoId}/hqdefault.jpg` : "");

  return (
    <HairlineCard className="overflow-hidden p-0 group h-full flex flex-col">
      <a href={href} target="_blank" rel="noopener noreferrer" className="block relative aspect-video bg-black overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={t.creator}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            className="w-14 h-14 rounded-full grid place-items-center"
            style={{ background: "rgba(232,80,2,0.95)" }}
          >
            <Play size={22} className="text-white fill-white" aria-hidden="true" />
          </div>
        </div>
      </a>
      <div className="p-5 md:p-6 flex-1 flex flex-col">
        <Quote size={16} className="mb-3" style={{ color: "var(--orange)", opacity: 0.7 }} aria-hidden="true" />
        <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: "var(--text)" }}>
          {t.quote}
        </p>
        <div>
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text)" }}>
            {t.creator}
          </p>
          {t.handle ? (
            <p className="text-[10px] font-mono opacity-60" style={{ color: "var(--text-muted)" }}>
              {t.handle}
            </p>
          ) : null}
        </div>
      </div>
    </HairlineCard>
  );
}
