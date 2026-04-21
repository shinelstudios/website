/**
 * ThumbnailClickability — "Is my thumbnail clickable?" analyzer.
 *
 * Pure client-side. No worker cost, no quota, no third-party upload.
 * Accepts an image file, runs a handful of quick canvas heuristics, and
 * reports a 0–100 score plus 2–3 concrete fixes.
 *
 * Why this shape (vs the existing ThumbnailPreviewer):
 *   - ThumbnailPreviewer shows mock CTR gauges with hardcoded numbers.
 *     This tool does the real math: downsample, compute luminance stats,
 *     approximate edge density, score per dimension.
 *   - We deliberately avoid face-api.js — that would pull ~1.5MB and a
 *     model file. The "does it have a face?" signal is cheap to fake
 *     with a skin-tone color cluster check.
 *
 * Scoring dimensions (total = 100):
 *   - Resolution       0–15   (target ≥1280×720)
 *   - Aspect ratio     0–10   (target 16:9)
 *   - Contrast         0–25   (Y std-dev — the biggest CTR driver)
 *   - Brightness band  0–15   (avg Y in 80–180, not crushed / blown out)
 *   - Saturation       0–15   (chroma not washed out)
 *   - Edge density     0–20   (Sobel approx on downsampled — proxies
 *                              for text sharpness + composition detail)
 *
 * All work happens on a 256px-max downsample, so analysis runs in a
 * few ms on a mid-range phone. No workers, no lag.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Monitor,
  Smartphone,
  Info,
} from "lucide-react";
import MetaTags, { BreadcrumbSchema } from "../MetaTags";
import { Kicker, Display, Lede, RevealOnScroll } from "../../design";

/* ---------- scoring ---------- */

const IDEAL = {
  width: 1280,
  height: 720,
  aspect: 16 / 9,
  minLumStdDev: 50,     // healthy contrast
  brightMin: 80,
  brightMax: 180,
  minChroma: 50,
  minEdges: 0.08,       // proportion of pixels with significant edge magnitude
};

function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function lerp(a, b, t) { return a + (b - a) * clamp01(t); }

function analyzeImage(imgEl) {
  // Downsample to 256px on the long edge for fast stats.
  const maxDim = 256;
  const w0 = imgEl.naturalWidth || imgEl.width;
  const h0 = imgEl.naturalHeight || imgEl.height;
  const scale = Math.min(1, maxDim / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imgEl, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const px = imgData.data;

  // Single pass: luminance array + accumulators.
  const N = w * h;
  const Y = new Float32Array(N);
  let sumY = 0;
  let sumChroma = 0;
  let skinPixels = 0;
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    // Rec 601 luma — close enough for thumbnail judgement.
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    Y[j] = y;
    sumY += y;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    sumChroma += (maxC - minC); // simple saturation proxy (0–255)
    // Very rough skin-tone cluster: r>95, g>40, b>20, r>g, r>b, |r-g|>15.
    if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
      skinPixels++;
    }
  }
  const avgY = sumY / N;
  const avgChroma = sumChroma / N;

  // Luminance std-dev.
  let sqSum = 0;
  for (let j = 0; j < N; j++) {
    const d = Y[j] - avgY;
    sqSum += d * d;
  }
  const stdY = Math.sqrt(sqSum / N);

  // Sobel magnitude, thresholded.
  let edgeCount = 0;
  let edgeSum = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = Y[i - w - 1], t = Y[i - w], tr = Y[i - w + 1];
      const l = Y[i - 1], r = Y[i + 1];
      const bl = Y[i + w - 1], b = Y[i + w], br = Y[i + w + 1];
      const gx = -tl - 2 * l - bl + tr + 2 * r + br;
      const gy = -tl - 2 * t - tr + bl + 2 * b + br;
      const mag = Math.sqrt(gx * gx + gy * gy);
      edgeSum += mag;
      if (mag > 60) edgeCount++;
    }
  }
  const edgeRatio = edgeCount / N;

  return {
    width: w0,
    height: h0,
    aspect: w0 / h0,
    avgY,
    stdY,
    avgChroma,
    edgeRatio,
    avgEdge: edgeSum / N,
    skinRatio: skinPixels / N,
  };
}

function scoreAnalysis(a) {
  // Per-dimension 0..1 scores.
  const resTarget = Math.max(IDEAL.width, IDEAL.height);
  const resRaw = Math.min(1, Math.min(a.width, a.height) * (16 / 9) / resTarget);
  const resScore = lerp(0.2, 1, resRaw);

  // Aspect ratio — perfect at 16:9, drops off fast past 4:3 or 21:9.
  const aspectDev = Math.abs(a.aspect - IDEAL.aspect) / IDEAL.aspect;
  const aspectScore = clamp01(1 - aspectDev * 1.8);

  // Contrast — 0 at stdY=15, 1 at stdY=65.
  const contrastScore = clamp01((a.stdY - 15) / 50);

  // Brightness band — 1 when inside [80,180], drop off linearly.
  let brightnessScore = 0;
  if (a.avgY >= IDEAL.brightMin && a.avgY <= IDEAL.brightMax) brightnessScore = 1;
  else if (a.avgY < IDEAL.brightMin) brightnessScore = clamp01(a.avgY / IDEAL.brightMin);
  else brightnessScore = clamp01((255 - a.avgY) / (255 - IDEAL.brightMax));

  // Saturation — 0 at chroma=15, 1 at chroma=80.
  const satScore = clamp01((a.avgChroma - 15) / 65);

  // Edge density — 0 at edgeRatio=0.02, 1 at 0.15.
  const edgeScore = clamp01((a.edgeRatio - 0.02) / 0.13);

  // Weighted sum.
  const weights = {
    resolution: 15,
    aspect: 10,
    contrast: 25,
    brightness: 15,
    saturation: 15,
    edges: 20,
  };
  const dims = [
    { key: "resolution", label: "Resolution",  raw: resRaw,        score: resScore,        max: weights.resolution },
    { key: "aspect",     label: "Aspect 16:9", raw: 1 - aspectDev, score: aspectScore,     max: weights.aspect },
    { key: "contrast",   label: "Contrast",    raw: a.stdY,        score: contrastScore,   max: weights.contrast },
    { key: "brightness", label: "Brightness",  raw: a.avgY,        score: brightnessScore, max: weights.brightness },
    { key: "saturation", label: "Color pop",   raw: a.avgChroma,   score: satScore,        max: weights.saturation },
    { key: "edges",      label: "Crisp detail", raw: a.edgeRatio,  score: edgeScore,       max: weights.edges },
  ];
  const total = Math.round(dims.reduce((t, d) => t + d.score * d.max, 0));

  // Fix list — sorted by lowest absolute contribution (what'd move the needle most).
  const suggestions = dims
    .map(d => ({ ...d, lost: (1 - d.score) * d.max }))
    .sort((x, y) => y.lost - x.lost)
    .slice(0, 3)
    .map(d => ({ key: d.key, label: d.label, tip: fixFor(d.key, a, d.score) }));

  return { total, dims, suggestions };
}

function fixFor(key, a, score) {
  if (score >= 0.85) return `Already strong — keep as is.`;
  switch (key) {
    case "resolution":
      return a.width < IDEAL.width
        ? `Render at 1280×720 or larger — yours is ${a.width}×${a.height}. Small thumbnails blur on big screens.`
        : `Aim for 1920×1080 if possible. More pixels = sharper on retina feed.`;
    case "aspect":
      return `Use a 16:9 canvas (1280×720). Yours is ${a.aspect.toFixed(2)}:1 — YouTube will crop or letterbox.`;
    case "contrast":
      return `Boost contrast — push shadows darker and highlights brighter. Thumbnails fight the feed's grey, not each other.`;
    case "brightness":
      if (a.avgY < IDEAL.brightMin) return `Too dark (avg ${Math.round(a.avgY)}/255). Lift shadows or add a subject light.`;
      if (a.avgY > IDEAL.brightMax) return `Too bright (avg ${Math.round(a.avgY)}/255). Hotspots lose detail on OLED screens.`;
      return `Tweak overall exposure.`;
    case "saturation":
      return `Bump saturation on the subject's key colour. Muted palettes get scrolled past.`;
    case "edges":
      return `Add a bolder text element or sharper subject outline. Soft edges read as "low effort" in a busy feed.`;
    default:
      return ``;
  }
}

function scoreBand(total) {
  if (total >= 80) return { label: "Strong click bait-worthy", color: "#22c55e", emoji: "🔥" };
  if (total >= 60) return { label: "Solid — minor tweaks",     color: "#f59e0b", emoji: "⚡" };
  if (total >= 40) return { label: "Needs work",               color: "#f97316", emoji: "🛠️" };
  return              { label: "Rework recommended",           color: "#ef4444", emoji: "⚠️" };
}

/* ---------- component ---------- */

export default function ThumbnailClickability() {
  const [dataUrl, setDataUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  const runAnalysis = useCallback((url) => {
    setBusy(true);
    setErr("");
    const img = new Image();
    img.onload = () => {
      try {
        const a = analyzeImage(img);
        const s = scoreAnalysis(a);
        setResult({ analysis: a, ...s });
      } catch (e) {
        setErr("Couldn't analyse this image. Try a JPG or PNG under 8MB.");
        console.error(e);
      } finally {
        setBusy(false);
      }
    };
    img.onerror = () => {
      setErr("Couldn't load image.");
      setBusy(false);
    };
    img.src = url;
  }, []);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!/image\//.test(file.type)) {
      setErr("Only image files (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr("File too large (max 8MB).");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      setDataUrl(url);
      runAnalysis(url);
    };
    reader.onerror = () => setErr("Couldn't read file.");
    reader.readAsDataURL(file);
  }, [runAnalysis]);

  const onPick = (e) => handleFile(e.target.files?.[0]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  }, [handleFile]);

  const onDragOver = useCallback((e) => { e.preventDefault(); }, []);

  const reset = () => {
    setDataUrl("");
    setFileName("");
    setResult(null);
    setErr("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const band = useMemo(() => result ? scoreBand(result.total) : null, [result]);

  return (
    <main className="min-h-[100svh] bg-[var(--bg)]" style={{ color: "var(--text)" }}>
      <MetaTags
        title="Thumbnail Clickability Analyzer — Shinel Studios"
        description="Free tool: upload your YouTube thumbnail and get a 0-100 clickability score with actionable fixes. 100% client-side, no upload."
        path="/tools/thumbnail-clickability"
      />
      <BreadcrumbSchema
        items={[
          { name: "Tools", url: "/tools" },
          { name: "Thumbnail Clickability", url: "/tools/thumbnail-clickability" },
        ]}
      />

      <section className="pt-24 md:pt-32 pb-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <RevealOnScroll><Kicker>Free creator tool</Kicker></RevealOnScroll>
          <RevealOnScroll delay="80ms">
            <Display as="h1" size="xl">
              Is my thumbnail <span style={{ color: "var(--orange)" }}>clickable?</span>
            </Display>
          </RevealOnScroll>
          <RevealOnScroll delay="160ms">
            <Lede>
              Upload a thumbnail. Get a 0–100 score and the three things to fix first.
              Analysis runs entirely in your browser — nothing uploads, nothing stored.
            </Lede>
          </RevealOnScroll>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4 max-w-5xl">
          {!dataUrl && (
            <label
              htmlFor="thumbnail-file"
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="block rounded-3xl border-2 border-dashed p-10 md:p-16 text-center cursor-pointer hover:bg-[var(--surface-alt)] transition-colors focus-within:ring-2 focus-within:ring-[var(--orange)]"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="mx-auto w-16 h-16 rounded-2xl grid place-items-center mb-4" style={{ background: "var(--orange-soft)", color: "var(--orange)" }}>
                <Upload size={26} />
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-2">Drop a thumbnail or click to upload</h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                JPG, PNG, or WebP · max 8MB · stays on your device
              </p>
              <input
                id="thumbnail-file"
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={onPick}
                className="sr-only"
              />
            </label>
          )}

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

          {dataUrl && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
              {/* LEFT: big preview + score */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                  <img
                    src={dataUrl}
                    alt={fileName || "Your thumbnail"}
                    className="block w-full h-auto"
                    style={{ aspectRatio: result ? `${result.analysis.aspect}` : "16 / 9", objectFit: "cover" }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border hover:bg-[var(--surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--orange)]"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    <RefreshCw size={14} />
                    Try another
                  </button>
                  <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {fileName} · {result?.analysis.width}×{result?.analysis.height}
                  </span>
                </div>

                {/* YouTube mock contexts */}
                {result && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold mb-2" style={{ color: "var(--text-muted)" }}>
                        <Monitor size={12} />
                        YouTube home grid
                      </div>
                      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)", background: "#0f0f0f" }}>
                        <img src={dataUrl} alt="" className="block w-full aspect-video object-cover" />
                        <div className="p-3">
                          <div className="text-[13px] font-bold text-white line-clamp-2">Your thumbnail headline goes here</div>
                          <div className="text-[11px] text-white/60 mt-1">Your Channel · 12K views · 2 hours ago</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold mb-2" style={{ color: "var(--text-muted)" }}>
                        <Smartphone size={12} />
                        Mobile feed
                      </div>
                      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)", background: "#0f0f0f" }}>
                        <img src={dataUrl} alt="" className="block w-full aspect-video object-cover" />
                        <div className="p-2">
                          <div className="text-[11px] font-bold text-white line-clamp-2">Your thumbnail headline goes here</div>
                          <div className="text-[10px] text-white/60 mt-0.5">Your Channel · 12K views</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: score + breakdown + fixes */}
              <div className="lg:col-span-5 space-y-5">
                {busy && (
                  <div className="p-6 rounded-2xl border flex items-center gap-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>Analysing pixels…</span>
                  </div>
                )}

                {result && band && (
                  <>
                    <div className="p-6 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                      <div className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: "var(--text-muted)" }}>
                        Score
                      </div>
                      <div className="flex items-baseline gap-3">
                        <div className="text-6xl font-black" style={{ color: band.color }}>
                          {result.total}
                        </div>
                        <div className="text-xl" aria-hidden="true">{band.emoji}</div>
                      </div>
                      <div className="text-sm font-bold mt-1" style={{ color: band.color }}>
                        {band.label}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                      <div className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: "var(--text-muted)" }}>
                        Breakdown
                      </div>
                      <ul className="space-y-2">
                        {result.dims.map((d) => (
                          <li key={d.key}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>{d.label}</span>
                              <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                                {Math.round(d.score * d.max)}/{d.max}
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

                    <div className="p-4 rounded-xl text-xs flex items-start gap-2" style={{ background: "var(--surface-alt)", color: "var(--text-muted)" }}>
                      <Info size={12} className="mt-0.5 shrink-0" />
                      <span>
                        Heuristic scores, not a YouTube prediction. Contrast and composition drive click decisions more than
                        any single metric — use this as a first pass, then A/B test.
                      </span>
                    </div>
                  </>
                )}

                {!busy && !result && !err && (
                  <div className="p-6 rounded-2xl border flex items-center gap-3 text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
                    <ImageIcon size={16} />
                    Upload a thumbnail to see the score.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
