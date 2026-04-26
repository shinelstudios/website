import React from "react";
import { HairlineCard } from "../../../design";
import { AUTH_BASE } from "../../../config/constants";
import { Youtube } from "lucide-react";

function timeAgo(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function Render({ client, config }) {
  const [video, setVideo] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    let cancelled = false;
    if (!client.slug) { setLoading(false); return; }
    fetch(`${AUTH_BASE}/api/c/${encodeURIComponent(client.slug)}/youtube/latest`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) { setVideo(d?.video || null); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [client.slug]);

  if (loading) {
    return (
      <HairlineCard className="p-5">
        <div className="aspect-video rounded-lg animate-pulse" style={{ background: "var(--surface)" }} />
      </HairlineCard>
    );
  }
  if (!video) {
    if (!client.youtubeId) {
      return (
        <HairlineCard className="p-5 text-sm" style={{ color: "var(--text-muted)" }}>
          Add a YouTube channel to your profile to show your latest video.
        </HairlineCard>
      );
    }
    return null;
  }
  return (
    <HairlineCard className="overflow-hidden">
      <a
        href={`https://www.youtube.com/watch?v=${video.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div className="relative aspect-video bg-black overflow-hidden">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 rounded-full grid place-items-center" style={{ background: "rgba(232,80,2,0.95)" }}>
              <Youtube size={28} className="text-white" />
            </div>
          </div>
        </div>
        <div className="p-4 md:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--orange)" }}>
            Latest upload · {timeAgo(video.publishedAt)}
          </p>
          <h3 className="mt-1 text-base md:text-lg font-bold leading-snug line-clamp-2" style={{ color: "var(--text)" }}>
            {video.title}
          </h3>
        </div>
      </a>
    </HairlineCard>
  );
}

function Editor({ config, onChange }) {
  return (
    <div className="text-sm" style={{ color: "var(--text-muted)" }}>
      <p>Pulls automatically from the YouTube channel attached to your client profile.</p>
      <p className="mt-2">No fields to configure — make sure your channel ID is set on the main fields.</p>
    </div>
  );
}

export default { Render, Editor };
