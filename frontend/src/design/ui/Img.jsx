import React, { useState } from "react";

/**
 * Img — every <img> on new pages should use this. Enforces:
 *   - loading="lazy" + decoding="async" (never above-fold without eager override)
 *   - intrinsic width/height (zero CLS)
 *   - optional <picture> with webp preferred
 *   - graceful onError fallback
 *
 * For truly above-the-fold LCP images (hero portrait), pass eager={true}.
 */
export default function Img({
  src,
  webp,
  alt = "",
  width,
  height,
  aspect,
  eager = false,
  fetchPriority,
  className = "",
  style,
  onError,
  ...rest
}) {
  const [failed, setFailed] = useState(false);
  const aspectStyle = aspect ? { aspectRatio: aspect, ...style } : style;

  const handleError = (e) => {
    setFailed(true);
    onError?.(e);
  };

  if (failed) {
    return (
      <div
        aria-label={alt}
        className={`bg-[var(--surface-alt)] hairline grid place-items-center ${className}`}
        style={aspectStyle}
      >
        <span className="text-meta" style={{ color: "var(--text-muted)" }}>image unavailable</span>
      </div>
    );
  }

  const sharedProps = {
    alt,
    width,
    height,
    loading: eager ? "eager" : "lazy",
    decoding: eager ? "sync" : "async",
    fetchpriority: fetchPriority || (eager ? "high" : "auto"),
    onError: handleError,
    className,
    style: aspectStyle,
    ...rest,
  };

  // Auto-derive a sibling .webp for local raster sources. The build step at
  // frontend/scripts/images-to-webp.js emits a .webp next to every JPG/PNG
  // under src/assets and public/assets, so this lookup is always correct
  // for local sources. External URLs (YouTube CDN, placehold.co) are
  // skipped — they don't have a .webp companion.
  const isLocal = typeof src === "string" && (src.startsWith("/") || src.startsWith("./") || !src.includes("://"));
  const autoWebp = isLocal && /\.(jpe?g|png)$/i.test(src || "")
    ? src.replace(/\.(jpe?g|png)$/i, ".webp")
    : null;
  const webpSrc = webp || autoWebp;

  if (webpSrc) {
    return (
      <picture>
        <source type="image/webp" srcSet={webpSrc} />
        <img src={src} {...sharedProps} />
      </picture>
    );
  }

  return <img src={src} {...sharedProps} />;
}
