// src/hooks/useIntersectionObserver.js
import { useEffect, useState } from "react";

export default function useIntersectionObserver(ref, options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const el = ref?.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsIntersecting(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      {
        root: options.root || null,
        rootMargin: options.rootMargin || "50px",
        threshold: options.threshold ?? 0.1,
      }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, options.root, options.rootMargin, options.threshold]);

  return isIntersecting;
}
