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

  if (webp) {
    return (
      <picture>
        <source type="image/webp" srcSet={webp} />
        <img src={src} {...sharedProps} />
      </picture>
    );
  }

  return <img src={src} {...sharedProps} />;
}
