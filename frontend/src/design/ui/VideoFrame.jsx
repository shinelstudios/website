import React, { useEffect, useRef, useState } from "react";
import { useDeviceCapabilities } from "../hooks/useDeviceCapabilities";

/**
 * VideoFrame — safe autoplay video that:
 *   - waits until the element is in view before loading
 *   - falls back to poster on saveData / slow networks
 *   - uses muted + playsInline for iOS autoplay
 *   - reserves aspect-ratio to avoid CLS
 *
 * Props:
 *   src     — mp4 URL (required)
 *   poster  — static image shown before/instead of video (required)
 *   aspect  — "16/9" | "4/5" | "1/1" | "9/16" (default "16/9")
 *   loop    — default true
 *   autoPlay — default true; ignored on low-power devices
 *   objectFit — "cover" | "contain" (default cover)
 */
export default function VideoFrame({
  src,
  poster,
  aspect = "16/9",
  loop = true,
  autoPlay = true,
  objectFit = "cover",
  className = "",
  children,
}) {
  const { isLowPower, isLowBattery, saveData, isMobile } = useDeviceCapabilities();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  // Never autoplay video on weak devices or slow networks — poster-only fallback.
  const allowAutoPlay = autoPlay && !isLowPower && !isLowBattery && !saveData;
  // On mobile, above-the-fold hero videos are heavy; hold off unless explicitly wanted.
  const mobileDowngrade = isMobile && !allowAutoPlay;

  useEffect(() => {
    if (!allowAutoPlay) return;
    const node = containerRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [allowAutoPlay]);

  // Pause when offscreen to save CPU.
  useEffect(() => {
    if (!videoRef.current || !loaded) return;
    const node = videoRef.current;

    if (typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) node.play?.().catch(() => {});
        else node.pause?.();
      },
      { threshold: 0.1 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [loaded]);

  // Pause when tab is hidden.
  useEffect(() => {
    if (!videoRef.current) return;
    const onVis = () => {
      if (!videoRef.current) return;
      if (document.hidden) videoRef.current.pause?.();
      else videoRef.current.play?.().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const aspectStyle = { aspectRatio: aspect };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={aspectStyle}
    >
      {/* Poster always rendered — zero CLS, instant LCP */}
      {poster && (
        <img
          src={poster}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit,
            opacity: loaded && allowAutoPlay ? 0 : 1,
            transition: "opacity 0.4s ease",
          }}
        />
      )}

      {shouldLoad && !mobileDowngrade && (
        <video
          ref={videoRef}
          src={src}
          autoPlay={allowAutoPlay}
          muted
          loop={loop}
          playsInline
          preload="metadata"
          aria-hidden="true"
          onLoadedData={() => setLoaded(true)}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit }}
        />
      )}

      {children}
    </div>
  );
}
