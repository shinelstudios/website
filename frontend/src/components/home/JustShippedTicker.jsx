/**
 * JustShippedTicker — compact rotating strip showing the latest delivered
 * videos pulled from /api/just-shipped. Auto-rotates every ~8s with a
 * subtle fade. Hides if no items.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { AUTH_BASE } from "../../config/constants";
import { useReducedMotion } from "../../design";

function timeAgo(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const days = Math.floor(ms / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export default function JustShippedTicker() {
  const reduce = useReducedMotion();
  const [items, setItems] = React.useState([]);
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`${AUTH_BASE}/api/just-shipped`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const next = Array.isArray(d?.items) ? d.items.filter((x) => x?.title) : [];
        setItems(next);
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (reduce || items.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 8000);
    return () => clearInterval(t);
  }, [items.length, reduce]);

  if (items.length === 0) return null;
  const item = items[idx % items.length];
  const href = item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : "/work";

  return (
    <div
      className="border-t border-b"
      style={{ borderColor: "var(--hairline)", background: "var(--surface-alt)" }}
      role="region"
      aria-label="Recently shipped projects"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 md:py-3">
        <div className="flex items-center gap-3 min-h-[28px]">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] shrink-0"
            style={{ color: "var(--orange)" }}
          >
            <Sparkles size={12} aria-hidden="true" />
            Just shipped
          </span>
          <span className="opacity-30" aria-hidden="true">·</span>
          <AnimatePresence mode="wait">
            <motion.a
              key={item.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={reduce ? {} : { opacity: 1, y: 0 }}
              exit={reduce ? {} : { opacity: 0, y: -4 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="flex-1 min-w-0 inline-flex items-center gap-2 text-xs md:text-sm font-bold truncate hover:opacity-100"
              style={{ color: "var(--text)", opacity: 0.85 }}
            >
              <span className="truncate">"{item.title}"</span>
              {item.category ? (
                <span
                  className="hidden md:inline shrink-0 text-[10px] font-black uppercase tracking-widest opacity-50"
                  style={{ color: "var(--text-muted)" }}
                >
                  · {item.category}
                </span>
              ) : null}
              <span
                className="shrink-0 text-[10px] font-mono opacity-60"
                style={{ color: "var(--text-muted)" }}
              >
                {timeAgo(item.deliveredAt)}
              </span>
              <ArrowUpRight size={12} className="shrink-0 opacity-60" aria-hidden="true" />
            </motion.a>
          </AnimatePresence>
          {items.length > 1 && (
            <span
              className="hidden md:inline text-[10px] font-mono opacity-40 shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              {idx + 1}/{items.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
