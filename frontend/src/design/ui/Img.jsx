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

  // WebP is opt-in via the explicit `webp` prop — auto-derivation by
  // string substitution is unsafe for Vite-hashed assets (JPG and WebP
  // get DIFFERENT hashes from Vite, so /foo-AAA.jpg has a sibling at
  // /foo-BBB.webp, not /foo-AAA.webp). Chrome doesn't always fall back
  // to the <img> when the matching <source> 404s, so silent failures
  // surface as "image unavailable" placeholders. For Vite-imported
  // assets, also import the .webp explicitly and pass it as `webp`.
  // For files in public/assets/ (no hash), pass `webp` derived from
  // the same path with the .webp extension.
  const webpSrc = webp || null;

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
