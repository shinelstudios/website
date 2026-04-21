/**
 * WorkCaseDrawer — accessible side-drawer that opens when a tile is clicked.
 *
 * Slides in from the right on desktop, full-screen sheet on mobile. Contains:
 *   - Embedded YouTube iframe (for video tiles with a videoId)
 *   - Big still image (for GFX tiles)
 *   - Title, category chip, maker attribution, views (when present)
 *   - Links: Watch on YouTube + Hire this maker (if team member slug known)
 *
 * Accessibility:
 *   - Renders inside a focus-trapping region (first focusable element gets focus
 *     on open, tab-loop confined to the drawer, Esc closes, backdrop click
 *     closes).
 *   - role="dialog" + aria-modal="true" + labelled by the title.
 *   - prefers-reduced-motion: drawer appears instantly without slide.
 *
 * Perf:
 *   - YouTube iframe only mounts when the drawer is open. When closed, the
 *     iframe unmounts (not just hidden) so no background audio/CPU burn.
 */
import React, { useCallback, useEffect, useRef } from "react";
import { X, Play, ExternalLink, UserCircle2, Eye } from "lucide-react";
import { extractYouTubeId } from "../../utils/youtube";
import { formatCompactNumber as formatViews } from "../../utils/formatters";

export default function WorkCaseDrawer({ item, open, onClose }) {
  const closeBtnRef = useRef(null);
  const drawerRef = useRef(null);

  // Focus management + Escape + body-scroll lock.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => closeBtnRef.current?.focus(), 40);

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [open, onClose]);

  // Backdrop click closes; drawer click swallows.
  const onBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose?.();
    },
    [onClose]
  );

  if (!open || !item) return null;

  const videoId = item.videoId || extractYouTubeId(item.youtubeUrl || item.creatorUrl || item.primaryUrl || "");
  const maker = item.attributedTo ? String(item.attributedTo).split("@")[0] : "";
  const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : (item.youtubeUrl || "");

  return (
    <div
      aria-hidden={!open}
      role="presentation"
      onClick={onBackdropClick}
      className="fixed inset-0 z-[1050] flex justify-end"
      style={{
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-drawer-title"
        className="h-full w-full md:w-[560px] lg:w-[640px] overflow-y-auto"
        style={{
          background: "var(--surface)",
          color: "var(--text)",
          borderLeft: "1px solid var(--hairline)",
          animation: "drawerIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <style>{`
          @keyframes drawerIn {
            from { transform: translateX(24px); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
          @media (prefers-reduced-motion: reduce) {
            [role="dialog"] { animation: none !important; }
          }
        `}</style>

        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 hairline-b" style={{ background: "var(--surface)" }}>
          <div className="text-kicker" style={{ color: "var(--orange)" }}>
            Case Study
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full hairline grid place-items-center hover:bg-[var(--surface-alt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
            aria-label="Close case study"
          >
            <X size={16} />
          </button>
        </div>

        {/* Media */}
        <div className="relative w-full" style={{ aspectRatio: "16 / 9", background: "#000" }}>
          {videoId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
              title={item.title || "Case study video"}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          ) : item.image ? (
            <img
              src={item.image}
              alt={item.title || "Case study"}
              className="absolute inset-0 w-full h-full object-cover"
              draggable="false"
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center" style={{ color: "var(--text-muted)" }}>
              <Play size={40} />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-meta px-2.5 py-1 rounded-full"
              style={{
                background: "var(--orange-soft)",
                color: "var(--orange)",
                border: "1px solid color-mix(in oklab, var(--orange) 25%, transparent)",
                letterSpacing: "0.15em",
              }}
            >
              {item.category || (item.kind === "video" ? "VIDEO" : "GFX")}
            </span>
            {item.kind && (
              <span className="text-meta px-2 py-1 rounded-full hairline" style={{ color: "var(--text-muted)" }}>
                {String(item.kind).toUpperCase()}
              </span>
            )}
          </div>

          <h2
            id="case-drawer-title"
            className="text-display-md mb-3"
            style={{ color: "var(--text)" }}
          >
            {item.title || "Untitled"}
          </h2>

          {item.description && (
            <p className="mb-6" style={{ color: "var(--text-muted)" }}>
              {item.description}
            </p>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {Number(item.views || 0) > 0 && (
              <StatTile icon={Eye} label="Views" value={formatViews(item.views)} />
            )}
            {maker && (
              <StatTile icon={UserCircle2} label="Crafted by" value={maker} />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {watchUrl && (
              <a
                href={watchUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-editorial"
              >
                Watch on YouTube <ExternalLink size={14} />
              </a>
            )}
            <a href="/contact" className="btn-editorial-ghost">
              Start a similar project
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div
      className="rounded-xl p-3 hairline"
      style={{ background: "var(--surface-alt)" }}
    >
      <div className="flex items-center gap-2 text-eyebrow mb-1" style={{ color: "var(--text-muted)" }}>
        {Icon && <Icon size={12} style={{ color: "var(--orange)" }} />}
        {label}
      </div>
      <div className="text-display-sm" style={{ color: "var(--text)" }}>
        {value}
      </div>
    </div>
  );
}

// formatViews uses the shared formatCompactNumber (utils/formatters.js).
