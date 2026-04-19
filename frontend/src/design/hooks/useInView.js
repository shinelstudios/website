import { useEffect, useRef, useState } from "react";

/**
 * useInView — lightweight IntersectionObserver wrapper.
 * Unlike framer-motion's useInView, this one is zero-dep and plays nicely
 * with decorative .reveal CSS transitions that don't need motion components.
 *
 * Usage:
 *   const [ref, inView] = useInView();
 *   <div ref={ref} className={inView ? "reveal reveal-in" : "reveal"}>
 */
export function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const { once = true, threshold = 0.1, rootMargin = "0px 0px -80px 0px" } = options;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    io.observe(node);
    return () => io.disconnect();
  }, [options.once, options.threshold, options.rootMargin]);

  return [ref, inView];
}
