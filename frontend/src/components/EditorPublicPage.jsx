/**
 * EditorPublicPage — public page at /editor/:slug
 *
 * Shows an editor's profile + portfolio. Public read-only — no auth required.
 * If the editor's public_enabled=0 or slug doesn't exist, shows 404.
 */
import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Instagram, Youtube, Twitter, ExternalLink, ArrowLeft, Star } from "lucide-react";
import { AUTH_BASE } from "../config/constants";

export default function EditorPublicPage() {
  const { slug } = useParams();
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all | shinel | personal
  const [typeFilter, setTypeFilter] = useState("all"); // all | video | short | reel | thumbnail

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`${AUTH_BASE}/editor/public/${encodeURIComponent(slug)}`).then((r) => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`${AUTH_BASE}/editor/public/${encodeURIComponent(slug)}/portfolio`).then((r) => r.ok ? r.json() : { items: [] }),
    ])
      .then(([profileData, portfolioData]) => {
        if (cancelled) return;
        setProfile(profileData.editor);
        setItems(portfolioData.items || []);
      })
      .catch((e) => { if (!cancelled) setError(typeof e === "number" ? `Profile not found (${e})` : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const filtered = useMemo(() => {
    return items.filter((it) =>
      (filter === "all" || it.source === filter) &&
      (typeFilter === "all" || it.asset_type === typeFilter)
    );
  }, [items, filter, typeFilter]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">Loading…</div>;
  if (error || !profile) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-3">
      <div className="text-2xl font-bold">Profile not found</div>
      <div className="text-sm text-neutral-500">{error || `No editor with slug "${slug}"`}</div>
      <Link to="/" className="text-[var(--orange)] hover:underline text-sm">← Back to Shinel Studios</Link>
    </div>
  );

  const color = profile.portfolio_color || "#E85002";
  const socials = profile.socials || {};

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text)]">
      {/* Hero */}
      <div className="relative" style={{ background: `linear-gradient(180deg, ${color}11 0%, transparent 100%)` }}>
        {profile.cover_url && (
          <div className="h-48 md:h-64 w-full overflow-hidden">
            <img src={profile.cover_url} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover opacity-50" />
          </div>
        )}
        <div className="container mx-auto px-4 max-w-5xl py-8">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-[var(--orange)] mb-6">
            <ArrowLeft size={12} /> Back to Shinel Studios
          </Link>
          <div className="flex items-start gap-5">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-24 h-24 rounded-2xl object-cover border-4" style={{ borderColor: color }} />
            ) : (
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-black" style={{ background: color }}>
                {profile.name?.charAt(0) || "E"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Editor at Shinel Studios</div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color }}>{profile.name}</h1>
              {profile.role && <div className="text-sm text-neutral-500 capitalize">{profile.role}</div>}
              {profile.bio && <p className="text-sm md:text-base text-neutral-700 dark:text-neutral-300 mt-3 max-w-2xl">{profile.bio}</p>}
              <div className="flex gap-2 mt-3 flex-wrap">
                {socials.instagram && (
                  <a href={socials.instagram.startsWith("http") ? socials.instagram : `https://instagram.com/${socials.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-xs font-semibold hover:bg-pink-100 hover:text-pink-700 dark:hover:bg-pink-950 transition-colors">
                    <Instagram size={12} /> Instagram
                  </a>
                )}
                {socials.youtube && (
                  <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-xs font-semibold hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950 transition-colors">
                    <Youtube size={12} /> YouTube
                  </a>
                )}
                {socials.twitter && (
                  <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-xs font-semibold hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-950 transition-colors">
                    <Twitter size={12} /> Twitter
                  </a>
                )}
                {socials.behance && (
                  <a href={socials.behance} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-xs font-semibold hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-950 transition-colors">
                    <ExternalLink size={12} /> Behance
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters + grid */}
      <div className="container mx-auto px-4 max-w-5xl py-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="text-xs text-neutral-500">
            <strong className="text-base text-neutral-900 dark:text-neutral-100">{filtered.length}</strong> {filtered.length === 1 ? "piece" : "pieces"}
          </div>
          <div className="flex gap-1 text-xs flex-wrap">
            {["all", "shinel", "personal"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  filter === f ? "text-white font-bold" : "bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300"
                }`}
                style={filter === f ? { background: color } : {}}
              >
                {f === "all" ? "All" : f === "shinel" ? "Shinel work" : "Personal"}
              </button>
            ))}
            <div className="w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />
            {["all", "video", "short", "reel", "thumbnail"].map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  typeFilter === f ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold" : "bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {f === "all" ? "All types" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
            <div className="text-4xl mb-2">🎬</div>
            <div>No items match these filters.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((it) => (
              <a
                key={it.id}
                href={it.video_url || (it.embed_youtube_id ? `https://youtube.com/watch?v=${it.embed_youtube_id}` : "#")}
                target={it.video_url || it.embed_youtube_id ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="group rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-[var(--surface-elev)] hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                <div className="relative aspect-video bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                  {it.thumbnail_url ? (
                    <img src={it.thumbnail_url} alt={it.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : it.embed_youtube_id ? (
                    <img src={`https://i.ytimg.com/vi/${it.embed_youtube_id}/maxresdefault.jpg`} alt={it.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" onError={(e) => { e.target.src = `https://i.ytimg.com/vi/${it.embed_youtube_id}/mqdefault.jpg`; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">
                      {it.asset_type === "thumbnail" ? "🖼" : it.asset_type === "short" || it.asset_type === "reel" ? "📱" : "🎬"}
                    </div>
                  )}
                  {it.featured && (
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-yellow-500 text-white text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                      <Star size={10} /> Featured
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-white" style={{ background: it.source === "shinel" ? color : "rgba(0,0,0,0.7)" }}>
                    {it.source === "shinel" ? "Shinel" : "Personal"}
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">{it.asset_type}</div>
                  <div className="font-bold text-sm mt-0.5 line-clamp-2">{it.title}</div>
                  {it.client_attribution && (
                    <div className="text-xs text-neutral-500 mt-1">{it.client_attribution}</div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="text-center mt-12 pb-8 text-xs text-neutral-500">
          Editor at <Link to="/" className="text-[var(--orange)] hover:underline font-bold">Shinel Studios</Link>
        </div>
      </div>
    </div>
  );
}
