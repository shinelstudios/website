/**
 * ChannelAudit — "60-second channel audit" tool.
 *
 * Input: YouTube channel handle or UC… id.
 * Calls the worker's /api/channel-audit (quota-aware, rate-limited per IP)
 * and returns last-20-video rollup. Frontend runs the scoring locally so
 * we keep worker work minimal and the heuristic can iterate without a
 * worker redeploy.
 *
 * Scored dimensions (weighted to 100):
 *   - Upload cadence   25   · median gap between uploads (target ≤5 days)
 *   - Title length     15   · p50 title length (sweet spot 40–70 chars)
 *   - View consistency 20   · median/mean ratio (stable vs feast-famine)
 *   - Thumbnail variety 20  · filename-hash uniqueness proxy
 *   - Engagement       20   · likes/views ratio
 *
 * Output: score, per-dim breakdown, top-3 fixes, video table with
 * views/likes/age/duration.
 */
import React, { useCallback, useMemo, useState } from "react";
import {
  Youtube,
  Search as SearchIcon,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Clock,
  Eye,
  ThumbsUp,
} from "lucide-react";
import MetaTags, { BreadcrumbSchema } from "../MetaTags";
import { Kicker, Display, Lede, RevealOnScroll } from "../../design";
import { AUTH_BASE } from "../../config/constants";
import { formatCompactNumber } from "../../utils/formatters";

/* ---------- helpers ---------- */

function parseIso8601Duration(iso) {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = Number(m[1] || 0);
  const mn = Number(m[2] || 0);
  const s = Number(m[3] || 0);
  return h * 3600 + mn * 60 + s;
}

function fmtDuration(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function daysAgo(iso) {
  if (!iso) return null;
  const d = Date.now() - new Date(iso).getTime();
  return Math.floor(d / 86_400_000);
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((t, v) => t + v, 0) / arr.length;
}

function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function lerp(a, b, t) { return a + (b - a) * clamp01(t); }

/* ---------- scoring ---------- */

function scoreAudit({ channel, videos }) {
  const titleLens = videos.map(v => (v.title || "").length);
  const views = videos.map(v => Number(v.views) || 0);
  const likes = videos.map(v => Number(v.likes) || 0);

  // Upload cadence — median gap between adjacent uploads in days.
  const publishDates = videos
    .map(v => v.publishedAt ? new Date(v.publishedAt).getTime() : null)
    .filter(Boolean)
    .sort((a, b) => b - a);
  const gaps = [];
  for (let i = 1; i < publishDates.length; i++) {
    gaps.push((publishDates[i - 1] - publishDates[i]) / 86_400_000);
  }
  const medGapDays = median(gaps);
  // 1.0 if ≤5 days, decays to 0 at 21+.
  const cadenceScore = clamp01(1 - (Math.max(0, medGapDays - 5) / 16));

  // Title length — p50 in [40, 70] is ideal.
  const medTitle = median(titleLens);
  let titleScore = 0;
  if (medTitle >= 40 && medTitle <= 70) titleScore = 1;
  else if (medTitle < 40) titleScore = clamp01(medTitle / 40);
  else titleScore = clamp01((100 - medTitle) / 30);

  // View consistency — median/mean ratio closer to 1 = more consistent.
  const viewMean = mean(views);
  const viewMed = median(views);
  const consistencyRaw = viewMean > 0 ? Math.min(1, viewMed / viewMean) : 0;
  const consistencyScore = lerp(0, 1, consistencyRaw);

  // Thumbnail variety — count distinct thumbnail URLs (a cheap proxy for
  // unique-looking thumbs; a template-heavy channel reuses the same URL
  // pattern domains less, but same artwork shows as identical URL segments).
  const thumbKeys = videos.map(v => (v.thumbnail || "").split("/").pop()).filter(Boolean);
  const uniq = new Set(thumbKeys).size;
  const thumbScore = clamp01(uniq / Math.max(1, thumbKeys.length));

  // Engagement — likes / views ratio. Healthy YT channels are 2–5%.
  const engRatios = videos
    .filter(v => Number(v.views) > 0)
    .map(v => Number(v.likes) / Number(v.views));
  const engMed = median(engRatios);
  const engScore = clamp01(engMed / 0.03); // 3% → 1.0, above caps

  const weights = {
    cadence: 25,
    title: 15,
    consistency: 20,
    thumb: 20,
    engagement: 20,
  };
  const dims = [
    { key: "cadence",     label: "Upload cadence",  raw: medGapDays,            score: cadenceScore,     max: weights.cadence,
      valueLabel: medGapDays ? `${medGapDays.toFixed(1)} days median gap` : "Too few uploads" },
    { key: "title",       label: "Title length",    raw: medTitle,              score: titleScore,       max: weights.title,
      valueLabel: medTitle ? `${Math.round(medTitle)} chars median` : "—" },
    { key: "consistency", label: "View consistency", raw: consistencyRaw,       score: consistencyScore, max: weights.consistency,
      valueLabel: viewMean > 0 ? `${Math.round(consistencyRaw * 100)}% median/mean` : "—" },
    { key: "thumb",       label: "Thumbnail variety", raw: uniq,                score: thumbScore,       max: weights.thumb,
      valueLabel: thumbKeys.length ? `${uniq}/${thumbKeys.length} unique` : "—" },
    { key: "engagement",  label: "Like-to-view",    raw: engMed,                score: engScore,         max: weights.engagement,
      valueLabel: engRatios.length ? `${(engMed * 100).toFixed(2)}%` : "—" },
  ];
  const total = Math.round(dims.reduce((t, d) => t + d.score * d.max, 0));

  const suggestions = dims
    .map(d => ({ ...d, lost: (1 - d.score) * d.max }))
    .sort((x, y) => y.lost - x.lost)
    .slice(0, 3)
    .map(d => ({ key: d.key, label: d.label, tip: fixFor(d) }));

  return { total, dims, suggestions };
}

function fixFor(dim) {
  if (dim.score >= 0.85) return "Already strong — don't break what works.";
  switch (dim.key) {
    case "cadence":
      return dim.raw > 5
        ? `You're posting every ${dim.raw.toFixed(0)} days. Aim for ≤5 days between uploads — YouTube's algorithm rewards consistency more than volume.`
        : "Upload frequency is healthy. Hold this rhythm.";
    case "title":
      if (dim.raw < 40) return `Titles average ${Math.round(dim.raw)} chars — too short to signal specifics. Try 45–65: specific promise + emotional hook.`;
      return `Titles average ${Math.round(dim.raw)} chars — truncated in mobile search. Trim to ≤70.`;
    case "consistency":
      return "Big variance between hits and flops. Identify what worked in the top video and template thumbnails + hooks from it.";
    case "thumb":
      return "Thumbnail templates feel repetitive. Break the pattern on every 3rd video — new color, new expression, new frame.";
    case "engagement":
      return "Low like-to-view suggests weak hooks or off-target audience. Add explicit asks at the 60-second mark and rework the opening.";
    default:
      return "";
  }
}

function scoreBand(total) {
  if (total >= 80) return { label: "Strong fundamentals", color: "#22c55e", emoji: "🚀" };
  if (total >= 60) return { label: "Solid — a few levers",  color: "#f59e0b", emoji: "📈" };
  if (total >= 40) return { label: "Needs work",             color: "#f97316", emoji: "🛠️" };
  return              { label: "Major rework recommended",  color: "#ef4444", emoji: "⚠️" };
}

/* ---------- component ---------- */

function normaliseHandle(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  // Accept full URLs and pull the handle/id out.
  try {
    if (raw.startsWith("http")) {
      const u = new URL(raw);
      // /@handle or /channel/UCxxx
      const parts = u.pathname.split("/").filter(Boolean);
      for (const p of parts) {
        if (p.startsWith("@")) return p;
        if (p.startsWith("UC") && p.length >= 20) return p;
      }
    }
  } catch { /* ignore */ }
  if (raw.startsWith("@") || raw.startsWith("UC")) return raw;
  return `@${raw}`;
}

export default function ChannelAudit() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  const run = useCallback(async (e) => {
    e?.preventDefault?.();
    const handle = normaliseHandle(input);
    if (!handle) return setErr("Enter a YouTube handle like @MrBeast or a channel URL.");
    setBusy(true);
    setErr("");
    setData(null);
    try {
      const res = await fetch(`${AUTH_BASE}/api/channel-audit?handle=${encodeURIComponent(handle)}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Audit failed (${res.status})`);
      setData(body);
    } catch (e2) {
      setErr(e2.message || "Couldn't audit this channel.");
    } finally {
      setBusy(false);
    }
  }, [input]);

  const result = useMemo(() => {
    if (!data || !Array.isArray(data.videos) || data.videos.length === 0) return null;
    return scoreAudit(data);
  }, [data]);

  const band = result ? scoreBand(result.total) : null;

  return (
    <main className="min-h-[100svh] bg-[var(--bg)]" style={{ color: "var(--text)" }}>
      <MetaTags
        title="Channel Audit in 60 seconds — Shinel Studios"
        description="Paste any YouTube channel URL. Get upload cadence, title length, view consistency, thumbnail variety, and engagement scored in 60 seconds — with 3 concrete fixes."
        path="/tools/channel-audit"
      />
      <BreadcrumbSchema
        items={[
          { name: "Tools", url: "/tools" },
          { name: "Channel Audit", url: "/tools/channel-audit" },
        ]}
      />

      <section className="pt-24 md:pt-32 pb-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <RevealOnScroll><Kicker>Free creator tool</Kicker></RevealOnScroll>
          <RevealOnScroll delay="80ms">
            <Display as="h1" size="xl">
              Channel audit <span style={{ color: "var(--orange)" }}>in 60 seconds.</span>
            </Display>
          </RevealOnScroll>
          <RevealOnScroll delay="160ms">
            <Lede>
              Paste a YouTube URL. We analyse the last 20 uploads — cadence, titles, views,
              thumbnails, engagement — and hand back a 0–100 score plus the top 3 things to fix.
            </Lede>
          </RevealOnScroll>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <form
            onSubmit={run}
            className="flex flex-col md:flex-row gap-3 p-2 rounded-2xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 flex-1 px-3">
              <Youtube size={18} style={{ color: "var(--orange)" }} />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="@MrBeast   ·   youtube.com/@channel   ·   UCxxxxxxxx"
                className="w-full bg-transparent outline-none text-sm py-3 focus-visible:ring-0"
                style={{ color: "var(--text)" }}
                aria-label="YouTube channel URL or handle"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
              style={{ background: "var(--orange)", color: "#fff" }}
            >
              {busy ? <RefreshCw size={14} className="animate-spin" /> : <SearchIcon size={14} />}
              {busy ? "Auditing…" : "Run audit"}
            </button>
          </form>

          {err && (
            <div
              className="mt-4 px-4 py-3 rounded-xl border text-sm flex items-center gap-2"
              style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
              role="alert"
            >
              <AlertCircle size={14} />
              {err}
            </div>
          )}

          {data && result && band && (
            <div className="mt-8 space-y-6">
              {/* Channel header */}
              <div className="flex items-center gap-4 p-5 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                {data.channel.logo ? (
                  <img src={data.channel.logo} alt="" className="w-14 h-14 rounded-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-14 h-14 rounded-full grid place-items-center text-white font-black" style={{ background: "var(--orange)" }} aria-hidden="true">
                    {(data.channel.title || "?").slice(0, 1)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-black truncate" style={{ color: "var(--text)" }}>
                    {data.channel.title}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {data.channel.handle || ""} · {formatCompactNumber(data.channel.subscribers)} subs · {formatCompactNumber(data.channel.videoCount)} videos
                  </div>
                </div>
                {data.channel.handle && (
                  <a
                    href={`https://www.youtube.com/${data.channel.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[var(--orange)] focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded"
                  >
                    Visit <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {/* Score + breakdown + fixes */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-5">
                  <div className="p-6 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: "var(--text-muted)" }}>
                      Score
                    </div>
                    <div className="flex items-baseline gap-3">
                      <div className="text-6xl font-black" style={{ color: band.color }}>{result.total}</div>
                      <div className="text-xl" aria-hidden="true">{band.emoji}</div>
                    </div>
                    <div className="text-sm font-bold mt-1" style={{ color: band.color }}>{band.label}</div>
                  </div>

                  <div className="p-5 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--orange)" }}>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold mb-3" style={{ color: "var(--orange)" }}>
                      <Sparkles size={12} />
                      Top fixes
                    </div>
                    <ol className="space-y-3">
                      {result.suggestions.map((s, i) => (
                        <li key={s.key} className="flex gap-3">
                          <div
                            className="w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs font-black"
                            style={{ background: "var(--orange)", color: "#fff" }}
                            aria-hidden="true"
                          >
                            {i + 1}
                          </div>
                          <div>
                            <div className="text-sm font-bold" style={{ color: "var(--text)" }}>{s.label}</div>
                            <div className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{s.tip}</div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="p-5 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <div className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: "var(--text-muted)" }}>
                      Breakdown
                    </div>
                    <ul className="space-y-3">
                      {result.dims.map((d) => (
                        <li key={d.key}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>{d.label}</span>
                            <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                              {d.valueLabel} · {Math.round(d.score * d.max)}/{d.max}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-alt)" }}>
                            <div
                              className="h-full"
                              style={{
                                width: `${Math.round(d.score * 100)}%`,
                                background: d.score >= 0.8 ? "#22c55e" : d.score >= 0.5 ? "#f59e0b" : "#ef4444",
                              }}
                              aria-hidden="true"
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Videos table */}
              <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="px-5 py-4 flex items-center gap-2 text-xs uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                  <TrendingUp size={12} />
                  Last {data.videos.length} uploads
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ color: "var(--text-muted)" }}>
                        <th className="text-left font-bold uppercase tracking-widest text-[10px] px-5 py-2">Title</th>
                        <th className="text-right font-bold uppercase tracking-widest text-[10px] px-3 py-2"><Eye size={11} className="inline" /> Views</th>
                        <th className="text-right font-bold uppercase tracking-widest text-[10px] px-3 py-2"><ThumbsUp size={11} className="inline" /> Likes</th>
                        <th className="text-right font-bold uppercase tracking-widest text-[10px] px-3 py-2"><Clock size={11} className="inline" /> Length</th>
                        <th className="text-right font-bold uppercase tracking-widest text-[10px] px-3 py-2">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.videos.map((v) => (
                        <tr key={v.id} style={{ borderTop: "1px solid var(--border)" }}>
                          <td className="px-5 py-3 max-w-sm">
                            <a
                              href={`https://www.youtube.com/watch?v=${v.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm truncate hover:text-[var(--orange)] focus-visible:ring-2 focus-visible:ring-[var(--orange)] rounded block"
                              style={{ color: "var(--text)" }}
                              title={v.title}
                            >
                              {v.title}
                            </a>
                          </td>
                          <td className="px-3 py-3 text-right font-mono" style={{ color: "var(--text)" }}>{formatCompactNumber(v.views)}</td>
                          <td className="px-3 py-3 text-right font-mono" style={{ color: "var(--text-muted)" }}>{formatCompactNumber(v.likes)}</td>
                          <td className="px-3 py-3 text-right font-mono" style={{ color: "var(--text-muted)" }}>{fmtDuration(parseIso8601Duration(v.duration))}</td>
                          <td className="px-3 py-3 text-right font-mono" style={{ color: "var(--text-muted)" }}>{daysAgo(v.publishedAt)}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Scoring is heuristic — use it as a compass, not a verdict. Quota-limited to 5 audits per 15 minutes per IP.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
