import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  Sparkles, Layers, BadgeCheck, Wallet, Clock, Users, TrendingUp, Award,
  Shield, ChevronDown, CheckCircle, Percent, Tag, Gift, Timer
} from "lucide-react";
import SpotlightSweep from "./animations/SpotlightSweep";

/* ---------------- Local images (BGMI only) ---------------- */
import bgmiBase from "@/assets/bgmi-thumbnail-base.jpg";
import bgmiCreator1 from "@/assets/bgmi-thumbnail-creator1.jpg";
import bgmiCreator2 from "@/assets/bgmi-thumbnail-creator2.jpg";
import bgmiBase2 from "@/assets/bgmi-thumbnail-base2.jpg";
import bgmiCreator3 from "@/assets/bgmi-thumbnail-creator3.jpg";
import bgmiCreator4 from "@/assets/bgmi-thumbnail-creator4.jpg";

/* ======================================================================
    Device detection hook
    ====================================================================== */
function useDeviceType() {
  const [device, setDevice] = useState({
    isMobile: false,
    isTablet: false,
    isLaptop: false,
    isDesktop: true,
  });

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setDevice({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isLaptop: width >= 1024 && width < 1440,
        isDesktop: width >= 1440
      });
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  return device;
}

/* ======================================================================
    Enhanced SEO with JSON-LD
    ====================================================================== */
function useEnhancedSEO() {
  useEffect(() => {
    const title = "Live Stream Thumbnail Templates | Fast, Consistent & Affordable";
    const desc =
      "Get 5–15 gaming livestream thumbnails/month from a single high-CTR template. Swap your photo & name in 3–4 hours. From ₹120 express or ₹500/mo subscription.";
    const url =
      typeof window !== "undefined"
        ? window.location.origin + "/live-templates"
        : "https://shinelstudios.in/live-templates";
    const canonicalUrl = url.split("?")[0].split("#")[0];

    document.title = title + " — Shinel Studios";

    const setMeta = (selector, attr, value) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement(selector.startsWith("meta") ? "meta" : "link");
        if (selector.startsWith("meta[name")) {
          el.setAttribute("name", attr);
        } else if (selector.startsWith("meta[property")) {
          el.setAttribute("property", attr);
        } else {
          el.setAttribute("rel", attr);
        }
        document.head.appendChild(el);
      }
      if (selector.startsWith("meta")) {
        el.setAttribute("content", value);
      } else {
        el.setAttribute("href", value);
      }
    };

    setMeta('meta[name="description"]', "description", desc);
    setMeta('link[rel="canonical"]', "canonical", canonicalUrl);
    setMeta('meta[name="robots"]', "robots", "index, follow, max-snippet:-1, max-image-preview:large");
    setMeta('meta[name="keywords"]', "keywords", "gaming thumbnails, live stream graphics, YouTube thumbnails, BGMI thumbnails, gaming design, stream branding");

    const og = (p, v) => {
      let el = document.querySelector(`meta[property="${p}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", p);
        document.head.appendChild(el);
      }
      el.setAttribute("content", v);
    };
    og("og:title", title + " — Shinel Studios");
    og("og:description", desc);
    og("og:url", canonicalUrl);
    og("og:type", "website");
    og("og:image", "https://shinelstudios.in/og-live-templates.png");
    og("og:image:width", "1200");
    og("og:image:height", "630");
    og("og:locale", "en_IN");

    setMeta('meta[name="twitter:card"]', "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "twitter:title", title + " — Shinel Studios");
    setMeta('meta[name="twitter:description"]', "twitter:description", desc);
    setMeta('meta[name="twitter:image"]', "twitter:image", "https://shinelstudios.in/og-live-templates.png");

    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": canonicalUrl,
          url: canonicalUrl,
          name: title,
          description: desc,
          inLanguage: "en-IN",
          isPartOf: {
            "@type": "WebSite",
            "@id": "https://shinelstudios.in/#website",
            url: "https://shinelstudios.in",
            name: "Shinel Studios"
          }
        },
        {
          "@type": "Service",
          name: "Live Stream Thumbnail Templates",
          provider: {
            "@type": "Organization",
            name: "Shinel Studios",
            url: "https://shinelstudios.in",
            logo: "https://shinelstudios.in/logo.png"
          },
          serviceType: "Graphic Design",
          areaServed: "IN",
          availableChannel: { "@type": "ServiceChannel", serviceUrl: canonicalUrl },
          offers: [
            {
              "@type": "Offer",
              name: "Express Thumbnail",
              price: "120",
              priceCurrency: "INR",
              description: "1 thumbnail delivered in 3-4 hours"
            },
            {
              "@type": "Offer",
              name: "Starter Plan",
              price: "500",
              priceCurrency: "INR",
              description: "5 thumbnails per month",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: "500",
                priceCurrency: "INR",
                billingDuration: "P1M"
              }
            },
            {
              "@type": "Offer",
              name: "Pro Plan",
              price: "900",
              priceCurrency: "INR",
              description: "10 thumbnails per month - Most Popular",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: "900",
                priceCurrency: "INR",
                billingDuration: "P1M"
              }
            },
            {
              "@type": "Offer",
              name: "Studio Plan",
              price: "1300",
              priceCurrency: "INR",
              description: "15 thumbnails per month with weekly check-ins",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: "1300",
                priceCurrency: "INR",
                billingDuration: "P1M"
              }
            }
          ]
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How does the template system work?",
              acceptedAnswer: { "@type": "Answer", text: "We create one high-converting base template design..." }
            },
            {
              "@type": "Question",
              name: "What's the turnaround time?",
              acceptedAnswer: { "@type": "Answer", text: "Express orders are delivered in 3-4 hours..." }
            },
            {
              "@type": "Question",
              name: "Can I use these templates for different games?",
              acceptedAnswer: { "@type": "Answer", text: "Each template is designed for a specific game..." }
            },
            {
              "@type": "Question",
              name: "What if I need revisions?",
              acceptedAnswer: { "@type": "Answer", text: "All plans include minor text edits..." }
            },
            {
              "@type": "Question",
              name: "Can I cancel my subscription anytime?",
              acceptedAnswer: { "@type": "Answer", text: "Yes! All subscriptions can be cancelled at any time..." }
            }
          ]
        }
      ]
    };

    const JSONLD_ID = "live-templates-jsonld";
    let scriptTag = document.getElementById(JSONLD_ID);
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.type = "application/ld+json";
      scriptTag.id = JSONLD_ID;
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

    return () => {
      if (scriptTag && scriptTag.parentNode) scriptTag.parentNode.removeChild(scriptTag);
    };
  }, []);
}

/* ======================================================================
    Auto Festival Discount (max 3 days)
    ====================================================================== */
function useFestivalDiscount() {
  return useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const mk = (m, d) => new Date(y, m - 1, d, 23, 59, 59);

    const windows = [
      { label: "New Year Sale", from: new Date(y, 0, 1), to: mk(1, 5), percent: 10 },
      { label: "Holi Special", from: new Date(y, 2, 20), to: mk(3, 31), percent: 12 },
      { label: "Independence Sale", from: new Date(y, 7, 10), to: mk(8, 18), percent: 10 },
      { label: "Festive Season Sale", from: new Date(y, 9, 1), to: mk(10, 31), percent: 10 },
      { label: "Diwali Mega Sale", from: new Date(y, 10, 1), to: mk(11, 20), percent: 15 },
      { label: "Year End Sale", from: new Date(y, 11, 20), to: mk(12, 31), percent: 12 }
    ];

    const activeOffer = windows.find(w => now >= w.from && now <= w.to);

    if (activeOffer) {
      const maxEndsAt = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
      let actualEndsAt = activeOffer.to;
      let label = activeOffer.label;

      if (activeOffer.to.getTime() > maxEndsAt.getTime()) {
        actualEndsAt = maxEndsAt;
        label = `Limited Time: ${activeOffer.percent}% OFF`;
      }

      return {
        active: true,
        label: label,
        percent: activeOffer.percent,
        endsAt: actualEndsAt
      };
    }

    return { active: false, label: "", percent: 0, endsAt: null };
  }, []);
}

/* ======================================================================
    Template data (BGMI × 2)
    ====================================================================== */
const DATA = [
  {
    id: "bgmi-1",
    name: "BGMI Live Template A",
    gameName: "BGMI",
    niche: "Battle Royale • Mobile Gaming",
    beforeAfterPairs: [
      { before: { src: bgmiBase, label: "Base Template" }, after: { src: bgmiCreator1, label: "Creator 1" } },
      { before: { src: bgmiBase, label: "Base Template" }, after: { src: bgmiCreator2, label: "Creator 2" } }
    ],
    notes: ["Bold title space", "Face-cam ready", "High contrast colors"],
    stats: { avgCTR: "12.5%", creators: "5+" }
  },
  {
    id: "bgmi-2",
    name: "BGMI Live Template B",
    gameName: "BGMI",
    niche: "Battle Royale • Mobile Gaming",
    beforeAfterPairs: [
      { before: { src: bgmiBase2, label: "Base Template" }, after: { src: bgmiCreator3, label: "Creator 3" } },
      { before: { src: bgmiBase2, label: "Base Template" }, after: { src: bgmiCreator4, label: "Creator 4" } }
    ],
    notes: ["Creator-focused crop", "Punchy color blocking", "Legible at 10% size"],
    stats: { avgCTR: "14.2%", creators: "8+" }
  }
];

/* ======================================================================
    Testimonials data
    ====================================================================== */
const TESTIMONIALS = [
  {
    name: "Raj Kumar",
    role: "BGMI Streamer",
    avatar: "👨‍💻",
    text: "My CTR jumped from 8% to 14% in just 2 months. The templates keep my brand consistent while saving me hours every week.",
    rating: 5
  },
  {
    name: "Priya Sharma",
    role: "Gaming Content Creator",
    avatar: "👩‍🎨",
    text: "Best investment for my channel! The turnaround time is incredible and the quality is always top-notch.",
    rating: 5
  },
  {
    name: "Arjun Singh",
    role: "Esports Streamer",
    avatar: "🎮",
    text: "I used to spend 2-3 hours designing each thumbnail. Now I just send my photos and get professional results in hours!",
    rating: 5
  }
];

/* ======================================================================
    FAQ
    ====================================================================== */
const FAQ_DATA = [
  { q: "How does the template system work?", a: "We create one high-converting base template design for your channel; then each month we swap your photo, name and stream title to ship 5–15 thumbnails consistently." },
  { q: "What's the turnaround time?", a: "Express orders are delivered in 3–4 hours. Subscription thumbnails are typically delivered in batches within 24 hours." },
  { q: "Can I use these templates for different games?", a: "Each template is designed for a specific game to maximise CTR. We can build additional base templates for other games if you need." },
  { q: "What file formats do you provide?", a: "YouTube-optimised 1280×720 JPG/PNG. PSD can be provided on Studio plan if needed." },
  { q: "What about revisions?", a: "All plans include minor text updates. Pro/Studio include monthly refinements based on your analytics." },
  { q: "Can I cancel anytime?", a: "Yes — subscriptions are month-to-month with no lock-in." },
  { q: "Do you offer custom template design?", a: "Yes. If none of these fit your goals, we can design a custom base template for your channel." }
];

/* ======================================================================
   ✅ TripleBeforeAfterSlider — FINAL (mobile + desktop)
   - Drag from handles OR anywhere on the track
   + Document-level listeners (pointer) with passive listeners for move
   - pos1 <= pos2 enforced, no stale closures
   ====================================================================== */
const TripleBeforeAfterSlider = ({ images, device }) => {
  const [pos1, setPos1] = useState(33);
  const [pos2, setPos2] = useState(66);

  const containerRef = useRef(null);
  const activeHandleRef = useRef(null); // 1 | 2 | null
  const rafRef = useRef(null);

  // avoid stale closure during RAF
  const pos1Ref = useRef(pos1);
  const pos2Ref = useRef(pos2);
  useEffect(() => { pos1Ref.current = pos1; }, [pos1]);
  useEffect(() => { pos2Ref.current = pos2; }, [pos2]);

  const clamp = (v) => Math.max(0, Math.min(100, v));

  const setFromPct = useCallback((pct, which) => {
    const p = clamp(pct);
    if (which === 1) {
      const next1 = p;
      const next2 = Math.max(next1, pos2Ref.current);
      if (next1 !== pos1Ref.current) setPos1(next1);
      if (next2 !== pos2Ref.current) setPos2(next2);
    } else if (which === 2) {
      const next2 = p;
      const next1 = Math.min(next2, pos1Ref.current);
      if (next2 !== pos2Ref.current) setPos2(next2);
      if (next1 !== pos1Ref.current) setPos1(next1);
    }
  }, []);

  const updateByClientX = useCallback((clientX) => {
    const which = activeHandleRef.current;
    if (!which || !containerRef.current) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = (x / rect.width) * 100;
      setFromPct(pct, which);
    });
  }, [setFromPct]);

  const bindDrag = useCallback(() => {
    const onPointerMove = (ev) => updateByClientX(ev.clientX);

    const endDrag = () => {
      activeHandleRef.current = null;
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", endDrag);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    // we never call preventDefault in onPointerMove, so passive is fine
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerup", endDrag, { passive: true });
    document.addEventListener("pointercancel", endDrag, { passive: true });

    return endDrag;
  }, [updateByClientX]);

  const startDrag = useCallback((which, clientX) => {
    activeHandleRef.current = which;
    bindDrag();
    if (typeof clientX === "number") updateByClientX(clientX);
  }, [bindDrag, updateByClientX]);

  // Drag from anywhere on the container: choose nearest handle
  const onContainerPointerDown = (e) => {
    if (!containerRef.current) return;
    if (e && e.cancelable) e.preventDefault();
    e?.stopPropagation?.();

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = clamp((x / rect.width) * 100);
    const d1 = Math.abs(pct - pos1Ref.current);
    const d2 = Math.abs(pct - pos2Ref.current);
    const which = d1 <= d2 ? 1 : 2;
    startDrag(which, e.clientX);
  };


  // Handle UI
  const Handle = ({ xPct, which }) => (
    <div
      className="absolute top-0 bottom-0"
      style={{
        left: `${xPct}%`,
        transform: "translateX(-50%)",
        zIndex: 15,
        touchAction: "none",
        cursor: "ew-resize",
      }}
      onPointerDown={(e) => {
        if (e && e.cancelable) e.preventDefault();
        e.stopPropagation();
        startDrag(which, e.clientX);
      }}
      role="slider"
      aria-orientation="horizontal"
      tabIndex={0}
      aria-label={which === 1 ? "Divide Base & Variation 1" : "Divide Variation 1 & Variation 2"}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(xPct)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 5 : 1;
        if (e.key === "ArrowLeft") {
          setFromPct(xPct - step, which);
          e.preventDefault();
        } else if (e.key === "ArrowRight") {
          setFromPct(xPct + step, which);
          e.preventDefault();
        } else if (e.key === "Home") {
          setFromPct(which === 1 ? 0 : Math.max(pos1Ref.current, 0), which);
          e.preventDefault();
        } else if (e.key === "End") {
          setFromPct(which === 2 ? 100 : Math.min(pos2Ref.current, 100), which);
          e.preventDefault();
        }
      }}
    >
      {/* bar */}
      <div
        className="absolute top-0 bottom-0 left-1/2"
        style={{
          width: "4px",
          background: "linear-gradient(180deg, var(--orange), #ff9357, var(--orange))",
          transform: "translateX(-50%)",
          boxShadow: "0 0 0 2px rgba(255,255,255,0.6), 0 0 24px rgba(232,80,2,0.6)",
          pointerEvents: "none",
        }}
      />
      {/* knob */}
      <div
        className="absolute top-1/2 left-1/2 rounded-full flex items-center justify-center"
        style={{
          width: device.isMobile ? "54px" : device.isTablet ? "58px" : device.isLaptop ? "62px" : "66px",
          height: device.isMobile ? "54px" : device.isTablet ? "58px" : device.isLaptop ? "62px" : "66px",
          transform: "translate(-50%, -50%)",
          background: "linear-gradient(135deg, var(--orange), #ff9357)",
          boxShadow: "0 6px 20px rgba(232,80,2,0.4), inset 0 -2px 10px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.3)",
          border: device.isMobile ? "4px solid white" : "5px solid white",
          pointerEvents: "none",
        }}
      >
        <svg
          width={device.isMobile ? 24 : device.isTablet ? 26 : device.isLaptop ? 30 : 32}
          height={device.isMobile ? 24 : device.isTablet ? 26 : device.isLaptop ? 30 : 32}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M15 18l-6-6 6-6" />
          <path d="M9 18l-6-6 6-6" />
        </svg>
      </div>
    </div>
  );


  return (
    <div>
      {/* header */}
      <div
        className="rounded-lg p-3 md:p-4 mb-3"
        style={{
          background: "linear-gradient(135deg, rgba(232,80,2,0.08), rgba(255,147,87,0.03))",
          border: "1px solid rgba(232,80,2,0.2)",
        }}
      >
        <p className="text-center font-medium" style={{ fontSize: device.isMobile ? "12px" : "13px", color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--orange)" }}>Same base template</strong> against two creator variations.
          Drag to compare <em>Base → V1 → V2</em>.
        </p>
      </div>

      {/* labels */}
      <div className="flex justify-between mb-2 px-1">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--orange)" }}>📋 Base</span>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--orange)" }}>✨ Variation 1</span>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--orange)" }}>⚡ Variation 2</span>
      </div>

      {/* slider */}
      <div
        ref={containerRef}
        className="relative rounded-lg md:rounded-xl overflow-hidden border select-none"
        style={{
          borderColor: "rgba(232,80,2,0.25)",
          background: "var(--surface)",
          aspectRatio: "16/9",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
        onPointerDown={onContainerPointerDown}
      >
        {/* bottom: V2 */}
        <div className="absolute inset-0">
          <img
            src={images.c?.src}
            alt={images.c?.label || "Variation 2"}
            className="w-full h-full object-cover"
            draggable="false"
            decoding="async"
            loading="lazy"
            style={{ pointerEvents: "none", userSelect: "none" }}
          />
        </div>

        {/* middle: V1 */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos2}% 0 ${pos1}%)` }}>
          <img
            src={images.b?.src}
            alt={images.b?.label || "Variation 1"}
            className="w-full h-full object-cover"
            draggable="false"
            decoding="async"
            loading="lazy"
            style={{ pointerEvents: "none", userSelect: "none" }}
          />
        </div>

        {/* top: Base */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos1}% 0 0)` }}>
          <img
            src={images.a?.src}
            alt={images.a?.label || "Base Template"}
            className="w-full h-full object-cover"
            draggable="false"
            decoding="async"
            loading="lazy"
            style={{ pointerEvents: "none", userSelect: "none" }}
          />
        </div>

        {/* handles */}
        <Handle xPct={pos1} which={1} />
        <Handle xPct={pos2} which={2} />

        {/* hint */}
        <div
          className="absolute left-1/2 backdrop-blur-md"
          style={{
            bottom: device.isMobile ? "10px" : "12px",
            transform: "translateX(-50%)",
            background: "rgba(0, 0, 0, 0.7)",
            padding: device.isMobile ? "6px 14px" : "7px 16px",
            borderRadius: 20,
            fontSize: device.isMobile ? "11px" : "12px",
            color: "#fff",
            fontWeight: 700,
            border: "1px solid rgba(255, 255, 255, 0.15)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {device.isMobile ? "👆 Drag sliders" : "Drag the two sliders"}
        </div>
      </div>
    </div>
  );
};

/* ======================================================================
    UI bits
    ====================================================================== */
const Bullet = ({ children, device }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full font-medium"
    style={{
      padding: device.isMobile ? "6px 10px" : "6px 12px",
      fontSize: device.isMobile ? "11px" : "12px",
      border: "1px solid rgba(232, 80, 2, 0.25)",
      background: "rgba(232, 80, 2, 0.06)",
      color: "var(--text)"
    }}
  >
    {children}
  </span>
);

const StatBadge = ({ icon: Icon, value, label, device }) => (
  <div
    className="flex flex-col items-center text-center"
    style={{ padding: device.isMobile ? "16px 12px" : "20px 16px", position: "relative" }}
  >
    <div
      className="rounded-full flex items-center justify-center"
      style={{
        width: device.isMobile ? "48px" : "56px",
        height: device.isMobile ? "48px" : "56px",
        background: "linear-gradient(135deg, rgba(232,80,2,0.15), rgba(255,147,87,0.05))",
        border: "2px solid rgba(232,80,2,0.3)",
        marginBottom: "12px",
        boxShadow: "0 4px 12px rgba(232,80,2,0.15)"
      }}
    >
      <Icon size={device.isMobile ? 22 : 26} style={{ color: "var(--orange)" }} />
    </div>
    <div
      className="font-bold"
      style={{ fontSize: device.isMobile ? "22px" : "28px", color: "var(--text)", marginBottom: "4px" }}
    >
      {value}
    </div>
    <div className="font-medium" style={{ fontSize: device.isMobile ? "12px" : "14px", color: "var(--text-muted)" }}>
      {label}
    </div>
  </div>
);

const FAQItem = ({ question, answer, device }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div
      className="border-b"
      style={{ borderColor: "rgba(232,80,2,0.15)", padding: device.isMobile ? "16px 0" : "20px 0" }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start justify-between gap-4 text-left"
        style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
        aria-expanded={isOpen}
      >
        <h3 className="font-bold" style={{ fontSize: device.isMobile ? "15px" : "17px", color: "var(--text)", flex: 1 }}>
          {question}
        </h3>
        <ChevronDown
          size={device.isMobile ? 18 : 20}
          style={{
            color: "var(--orange)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 250ms ease-out",
            flexShrink: 0,
            marginTop: "2px"
          }}
        />
      </button>
      <div
        style={{
          maxHeight: isOpen ? "600px" : "0",
          opacity: isOpen ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 300ms ease-out, opacity 250ms ease-out",
          marginTop: isOpen ? "12px" : "0"
        }}
      >
        <p style={{ fontSize: device.isMobile ? "13px" : "14px", color: "var(--text-muted)", lineHeight: 1.6 }}>{answer}</p>
      </div>
    </div>
  );
};

const TestimonialCard = ({ testimonial, device }) => {
  const stars = Array(testimonial.rating).fill("⭐").join("");
  return (
    <div
      className="rounded-xl border"
      style={{
        padding: device.isMobile ? "20px" : "24px",
        background: "var(--surface)",
        borderColor: "rgba(232,80,2,0.15)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: device.isMobile ? "48px" : "56px",
            height: device.isMobile ? "48px" : "56px",
            background: "linear-gradient(135deg, rgba(232,80,2,0.15), rgba(255,147,87,0.05))",
            border: "2px solid rgba(232,80,2,0.3)",
            fontSize: device.isMobile ? "24px" : "28px"
          }}
        >
          {testimonial.avatar}
        </div>
        <div>
          <div className="font-bold" style={{ fontSize: device.isMobile ? "15px" : "16px", color: "var(--text)" }}>
            {testimonial.name}
          </div>
          <div style={{ fontSize: device.isMobile ? "12px" : "13px", color: "var(--text-muted)" }}>
            {testimonial.role}
          </div>
        </div>
      </div>
      <div className="mb-3" style={{ fontSize: device.isMobile ? "16px" : "18px" }}>
        {stars}
      </div>
      <p style={{ fontSize: device.isMobile ? "13px" : "14px", color: "var(--text-muted)", lineHeight: 1.6 }}>
        "{testimonial.text}"
      </p>
    </div>
  );
};

/* ======================================================================
   Price Card (Express fixed price; only two plans discounted via allowDiscount)
   ====================================================================== */
const PriceCard = ({
  title,
  qty,
  basePrice,
  perMonth,
  sub,
  bullets = [],
  highlight,
  popular,
  device,
  festival,
  allowDiscount = true, // Only set true on exactly two packages (e.g., Starter & Pro)
  isExpress = false     // Set true only for "Express" plan
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const shouldAnimate = !device.isMobile;

  // ---------------- Pricing logic ----------------
  // Express: always show ₹150 → ₹120 (independent of festival)
  // Others: show crossed price only if festival is active AND allowDiscount === true
  let displayMRP = 0;
  let finalPrice = basePrice;
  let savings = 0;
  let showStruckPrice = false;
  let showFestivalRibbon = false;

  if (isExpress) {
    displayMRP = 150;
    finalPrice = 120;
    savings = Math.max(0, displayMRP - finalPrice); // 30
    showStruckPrice = true;
    showFestivalRibbon = false; // express should NOT show the festival ribbon
  } else if (festival?.active && allowDiscount) {
    // Festival applies
    displayMRP = basePrice;
    finalPrice = Math.max(0, Math.round(basePrice * (1 - (festival.percent || 0) / 100)));
    savings = Math.max(0, displayMRP - finalPrice);
    showStruckPrice = true;
    showFestivalRibbon = true;
  } else {
    // No discount for this plan
    displayMRP = 0;
    finalPrice = basePrice;
    savings = 0;
    showStruckPrice = false;
    showFestivalRibbon = false;
  }

  // ---------------- Styles ----------------
  const cardStyle = {
    padding: device.isMobile ? "20px" : "24px",
    borderColor: highlight ? "var(--orange)" : "rgba(232,80,2,0.15)",
    background: highlight ? "rgba(232,80,2,0.05)" : "var(--surface)",
    transform: shouldAnimate && isHovered ? "translate3d(0, -4px, 0)" : "translate3d(0, 0, 0)",
    transition: shouldAnimate
      ? "transform 300ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)"
      : "none",
    boxShadow: highlight
      ? "0 12px 40px rgba(232,80,2,0.25)"
      : isHovered && shouldAnimate
        ? "0 8px 30px rgba(0, 0, 0, 0.4)"
        : "0 4px 20px rgba(0, 0, 0, 0.3)",
    willChange: shouldAnimate && isHovered ? "transform" : "auto"
  };

  const buttonStyle = {
    padding: device.isMobile ? "14px 16px" : "16px",
    fontSize: device.isMobile ? "15px" : "16px",
    background: highlight ? "linear-gradient(135deg, var(--orange), #ff9357)" : "rgba(232,80,2,0.1)",
    color: highlight ? "#fff" : "var(--orange)",
    border: highlight ? "none" : "1px solid rgba(232,80,2,0.3)",
    transform: shouldAnimate && isHovered ? "scale3d(1.02, 1.02, 1)" : "scale3d(1, 1, 1)",
    transition: shouldAnimate ? "transform 200ms cubic-bezier(0.4, 0, 0.2, 1)" : "none",
    minHeight: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    willChange: shouldAnimate && isHovered ? "transform" : "auto"
  };

  return (
    <div
      className="rounded-xl md:rounded-2xl border relative"
      style={cardStyle}
      onMouseEnter={() => !device.isMobile && setIsHovered(true)}
      onMouseLeave={() => !device.isMobile && setIsHovered(false)}
    >
      {popular && (
        <div
          className="absolute left-1/2 text-xs font-bold uppercase px-3 md:px-4 py-1 md:py-1.5 rounded-full"
          style={{
            top: device.isMobile ? "-12px" : "-14px",
            background: "linear-gradient(135deg, var(--orange), #ff9357)",
            color: "#fff",
            transform: "translateX(-50%)",
            boxShadow: "0 4px 16px rgba(232,80,2,0.5)",
            fontSize: device.isMobile ? "10px" : "12px",
            animation: "pulse 2s ease-in-out infinite",
            border: "2px solid rgba(255, 255, 255, 0.3)"
          }}
        >
          ⭐ Most Popular
        </div>
      )}

      {/* Festival ribbon only for discounted (non-Express) plans */}
      {showFestivalRibbon && (
        <div
          className="absolute -right-2 top-3 rotate-12 flex items-center gap-1 px-3 py-1 rounded"
          style={{
            background: "rgba(232,80,2,0.12)",
            border: "1px dashed var(--orange)",
            color: "var(--orange)",
            fontWeight: 800,
            fontSize: "11px"
          }}
          aria-label={`${festival.percent}% festival discount`}
        >
          <Gift size={14} /> {festival.percent}% OFF
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <Wallet size={device.isMobile ? 16 : 18} style={{ color: "var(--orange)" }} />
        <h3 className="font-bold" style={{ fontSize: device.isMobile ? "16px" : "18px", color: "var(--text)" }}>
          {title}
        </h3>
      </div>

      {/* Price Row */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          {showStruckPrice && (
            <span
              className="line-through font-semibold"
              style={{ fontSize: device.isMobile ? "14px" : "15px", color: "var(--text-muted)" }}
            >
              ₹{displayMRP}
            </span>
          )}

          <span
            className="font-extrabold"
            style={{ fontSize: device.isMobile ? "30px" : "38px", color: "var(--text)" }}
          >
            ₹{finalPrice}
          </span>

          {perMonth && (
            <span
              className="font-medium"
              style={{ fontSize: device.isMobile ? "12px" : "14px", color: "var(--text-muted)" }}
            >
              /month
            </span>
          )}
        </div>

        <div className="font-semibold mt-1" style={{ fontSize: device.isMobile ? "15px" : "17px", color: "var(--orange)" }}>
          {qty}
        </div>
        <div className="mt-1" style={{ fontSize: device.isMobile ? "12px" : "13px", color: "var(--text-muted)" }}>
          {sub}
        </div>

        {savings > 0 && (
          <div
            className="mt-2 inline-flex items-center gap-1 rounded px-2 py-1"
            style={{
              background: "rgba(232,80,2,0.08)",
              border: "1px dashed rgba(232,80,2,0.35)",
              color: "var(--orange)",
              fontSize: "12px",
              fontWeight: 700
            }}
          >
            <Tag size={14} /> Save ₹{savings}
          </div>
        )}
      </div>

      <ul className="space-y-2 md:space-y-3 mb-5 md:mb-6">
        {bullets.map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-2"
            style={{ fontSize: device.isMobile ? "13px" : "14px", color: "var(--text)" }}
          >
            <BadgeCheck
              size={device.isMobile ? 14 : 16}
              style={{ color: "var(--orange)", flexShrink: 0, marginTop: "2px" }}
            />
            <span style={{ color: "var(--text)" }}>{b}</span>
          </li>
        ))}
      </ul>

      <a href="#contact" className="block w-full text-center rounded-lg md:rounded-xl font-semibold" style={buttonStyle}>
        {highlight ? "Get Started Now" : "Choose Plan"}
      </a>
    </div>
  );
};

/* ======================================================================
    Floating CTA Button (Mobile)
    ====================================================================== */
const FloatingCTA = ({ device, festival }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!device.isMobile || !isVisible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.95))",
        padding: "12px 16px 16px",
        animation: "slideIn 300ms ease-out",
        backdropFilter: "blur(10px)"
      }}
    >
      <a
        href="https://wa.me/918968141585?text=Hi%20Shinel%20Studios%2C%20I%20want%20the%20Live%20Template%20subscription"
        className="flex items-center justify-center gap-2 rounded-xl font-bold"
        style={{
          width: "100%",
          padding: "16px",
          fontSize: "16px",
          background: "linear-gradient(135deg, var(--orange), #ff9357)",
          color: "#fff",
          boxShadow: "0 8px 24px rgba(232,80,2,0.5)",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          textDecoration: "none"
        }}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
        {festival?.active ? `Get ${festival.percent}% OFF Now!` : "Get Started on WhatsApp"}
      </a>
    </div>
  );
};

/* ======================================================================
    Page
    ====================================================================== */
export default function LiveTemplates() {
  useEnhancedSEO();
  const device = useDeviceType();
  const [templates] = useState(DATA);
  const festival = useFestivalDiscount();

  const discountEligibleTitles = useMemo(() => ["Starter", "Pro"], []);

  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!festival.active || !festival.endsAt) return;

    const pad = (n) => String(n).padStart(2, "0");
    const compute = () => {
      const diff = Math.max(0, festival.endsAt.getTime() - Date.now());

      if (diff <= 0) {
        setTimeLeft("0d 00h 00m 00s");
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`);
    };

    compute();
    const id = setInterval(compute, 1000);

    const onVis = () => document.visibilityState === "visible" && compute();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [festival.active, festival.endsAt]);

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Spotlight Sweep Background Animation */}
      <SpotlightSweep
        color="#E85002"
        opacity={0.35}
        beamCount={5}
        speed="fast"
      />

      <FloatingCTA device={device} festival={festival} />

      {/* HERO */}
      <section className="container mx-auto px-4 py-8 md:py-12 lg:py-16" style={{ paddingTop: "calc(var(--header-h,72px) + 16px)", position: "relative", zIndex: 1 }}>
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full font-bold mb-4 md:mb-6"
            style={{
              padding: device.isMobile ? "8px 14px" : "8px 16px",
              fontSize: device.isMobile ? "11px" : "12px",
              color: "var(--orange)",
              border: "1px solid rgba(232,80,2,0.3)",
              background: "rgba(232,80,2,0.08)"
            }}
          >
            <Layers size={device.isMobile ? 12 : 14} /> Live Stream Thumbnail Templates
          </div>

          <h1
            className="font-bold mb-3 md:mb-4 leading-tight"
            style={{
              fontSize: device.isMobile ? "28px" : device.isTablet ? "40px" : device.isLaptop ? "48px" : "56px",
              background: "linear-gradient(135deg, var(--text), #cfcfcf)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            High-CTR Templates.<br />Personalized in Minutes.
          </h1>

          <p
            className="mb-6 md:mb-8 leading-relaxed"
            style={{
              fontSize: device.isMobile ? "15px" : device.isTablet ? "17px" : device.isLaptop ? "18px" : "20px",
              color: "var(--text-muted)",
              maxWidth: "100%",
              margin: "0 auto",
              marginBottom: device.isMobile ? "24px" : "32px",
              lineHeight: 1.7
            }}
          >
            We design the base template once, then swap your{" "}
            <strong style={{ color: "var(--orange)", fontWeight: 700 }}>photo &amp; name</strong>{" "}
            for{" "}
            <strong style={{ color: "var(--orange)", fontWeight: 700 }}>5–15 thumbnails</strong>{" "}
            each month. Keep your brand consistent while staying fresh.
          </p>


          {festival.active && (
            <div
              className="flex items-center justify-center gap-3 mb-6 md:mb-8 w-full mx-auto rounded-xl flex-wrap"
              style={{
                maxWidth: 820,
                padding: "10px 14px",
                background: "linear-gradient(135deg, rgba(232,80,2,0.10), rgba(255,147,87,0.05))",
                border: "1px dashed rgba(232,80,2,0.35)"
              }}
              role="status"
            >
              <Percent size={18} style={{ color: "var(--orange)", flexShrink: 0 }} />
              <span style={{ color: "var(--text)", fontSize: device.isMobile ? "13px" : "14px" }}>
                <strong style={{ color: "var(--orange)" }}>{festival.label}</strong> — Get{" "}
                <strong style={{ color: "var(--orange)" }}>{festival.percent}% OFF</strong> on Starter & Pro plans
              </span>
              {timeLeft && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-1"
                  style={{ background: "rgba(232,80,2,0.08)", border: "1px solid rgba(232,80,2,0.20)", color: "var(--orange)", fontSize: 12, fontWeight: 800 }}>
                  <Timer size={14} /> {timeLeft}
                </span>
              )}
            </div>
          )}

          <div
            className="flex items-stretch justify-center mb-8 md:mb-10 mx-auto rounded-2xl overflow-hidden"
            style={{
              maxWidth: device.isMobile ? "100%" : "600px",
              background: "linear-gradient(135deg, rgba(232,80,2,0.08), rgba(255,147,87,0.03))",
              border: "2px solid rgba(232,80,2,0.2)",
              boxShadow: "0 8px 32px rgba(232,80,2,0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
            }}
          >
            <div style={{ flex: 1, borderRight: "1px solid rgba(232,80,2,0.15)" }}>
              <StatBadge icon={Users} value="10+" label="Happy Creators" device={device} />
            </div>
            <div style={{ flex: 1, borderRight: "1px solid rgba(232,80,2,0.15)" }}>
              <StatBadge icon={TrendingUp} value="13.8%" label="Avg CTR" device={device} />
            </div>
            <div style={{ flex: 1 }}>
              <StatBadge icon={Award} value="4.9/5" label="Rating" device={device} />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6" style={{ fontSize: device.isMobile ? "13px" : "14px", color: "var(--text-muted)" }}>
            <Clock size={device.isMobile ? 14 : 16} style={{ color: "var(--orange)" }} />
            <span>
              <strong style={{ color: "var(--text)" }}>Express delivery:</strong> ₹120 in 3–4 hours
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl font-bold"
              style={{
                padding: device.isMobile ? "16px 32px" : "18px 40px",
                fontSize: device.isMobile ? "16px" : "18px",
                background: "linear-gradient(135deg, var(--orange), #ff9357)",
                color: "#fff",
                boxShadow: "0 8px 24px rgba(232,80,2,0.4)",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                textDecoration: "none",
                minHeight: "54px"
              }}
            >
              <Sparkles size={device.isMobile ? 18 : 20} />
              View Pricing
            </a>
            <a
              href="#templates"
              className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold"
              style={{
                padding: device.isMobile ? "16px 32px" : "18px 40px",
                fontSize: device.isMobile ? "16px" : "18px",
                background: "rgba(232,80,2,0.1)",
                color: "var(--orange)",
                border: "2px solid rgba(232,80,2,0.3)",
                textDecoration: "none",
                minHeight: "54px"
              }}
            >
              See Examples
            </a>
          </div>
        </div>
      </section>

      {/* Quick Stats Banner */}
      <section className="container mx-auto px-4 pb-8">
        <div
          className="max-w-4xl mx-auto rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(232,80,2,0.1), rgba(255,147,87,0.05))",
            border: "2px solid rgba(232,80,2,0.2)",
            padding: device.isMobile ? "24px 20px" : "32px 40px"
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div>
              <div className="font-black mb-1" style={{ fontSize: device.isMobile ? "32px" : "40px", color: "var(--orange)" }}>
                50+
              </div>
              <div style={{ fontSize: device.isMobile ? "13px" : "14px", color: "var(--text-muted)" }}>
                Thumbnails Delivered
              </div>
            </div>
            <div>
              <div className="font-black mb-1" style={{ fontSize: device.isMobile ? "32px" : "40px", color: "var(--orange)" }}>
                3-4h
              </div>
              <div style={{ fontSize: device.isMobile ? "13px" : "14px", color: "var(--text-muted)" }}>
                Average Delivery Time
              </div>
            </div>
            <div>
              <div className="font-black mb-1" style={{ fontSize: device.isMobile ? "32px" : "40px", color: "var(--orange)" }}>
                100%
              </div>
              <div style={{ fontSize: device.isMobile ? "13px" : "14px", color: "var(--text-muted)" }}>
                Satisfaction Rate
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
          <h2 className="font-bold mb-3 md:mb-4"
            style={{ fontSize: device.isMobile ? "24px" : device.isTablet ? "32px" : device.isLaptop ? "36px" : "40px", color: "var(--text)" }}>
            Available Templates (BGMI)
          </h2>
          <p style={{ fontSize: device.isMobile ? "14px" : device.isTablet ? "16px" : device.isLaptop ? "17px" : "18px", color: "var(--text-muted)" }}>
            Compare <strong style={{ color: "var(--orange)" }}>Base → Variation 1 → Variation 2</strong> with the dual-handle slider.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:gap-8 lg:gap-10 max-w-4xl mx-auto">
          {templates.map((t, idx) => {
            const tripleImages = {
              a: t.beforeAfterPairs[0].before,
              b: t.beforeAfterPairs[0].after,
              c: t.beforeAfterPairs[1].after
            };

            return (
              <article
                key={t.id}
                className="rounded-xl md:rounded-2xl border"
                style={{
                  padding: device.isMobile ? "16px" : device.isTablet ? "20px" : "24px",
                  borderColor: "rgba(232,80,2,0.15)",
                  background: "var(--surface)",
                  animation: `fadeInUp 500ms ease-out ${idx * 0.08}s both`
                }}
              >
                <div className="mb-4 md:mb-5">
                  <div className="flex items-center gap-2 md:gap-3 mb-3">
                    <h3 className="font-bold" style={{ fontSize: device.isMobile ? "20px" : device.isTablet ? "24px" : "28px", color: "var(--text)" }}>
                      {t.gameName}
                    </h3>
                    <span className="px-2 md:px-3 py-1 rounded-full font-bold"
                      style={{ fontSize: device.isMobile ? "10px" : device.isTablet ? "11px" : "12px", background: "linear-gradient(135deg, var(--orange), #ff9357)", color: "#fff" }}>
                      Live
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1" style={{ fontSize: device.isMobile ? "11px" : "12px" }}>
                      <TrendingUp size={device.isMobile ? 12 : 14} style={{ color: "var(--orange)" }} />
                      <span style={{ color: "var(--orange)", fontWeight: 600 }}>{t.stats.avgCTR}</span>
                      <span style={{ color: "var(--text-muted)" }}>Avg CTR</span>
                    </div>
                    <div className="flex items-center gap-1" style={{ fontSize: device.isMobile ? "11px" : "12px" }}>
                      <Users size={device.isMobile ? 12 : 14} style={{ color: "var(--orange)" }} />
                      <span style={{ color: "var(--text)", fontWeight: 600 }}>{t.stats.creators}</span>
                      <span style={{ color: "var(--text-muted)" }}>using</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Bullet device={device}>{t.niche}</Bullet>
                    {t.notes.map((n, i) => (
                      <Bullet key={i} device={device}>
                        {n}
                      </Bullet>
                    ))}
                  </div>
                </div>

                <TripleBeforeAfterSlider images={tripleImages} device={device} />

                <a
                  href="#pricing"
                  className="mt-4 md:mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg md:rounded-xl font-semibold"
                  style={{
                    padding: device.isMobile ? "14px" : device.isTablet ? "15px" : "16px",
                    fontSize: device.isMobile ? "14px" : device.isTablet ? "15px" : "16px",
                    background: "rgba(232,80,2,0.1)",
                    color: "var(--orange)",
                    border: "1px solid rgba(232,80,2,0.3)",
                    transform: "translateZ(0)",
                    transition: device.isMobile ? "none" : "transform 200ms ease-out",
                    minHeight: "48px",
                    textDecoration: "none"
                  }}
                >
                  <Sparkles size={device.isMobile ? 16 : device.isTablet ? 17 : 18} /> Use This Template
                </a>
              </article>
            );
          })}
        </div>
      </section>

      {/* Why Choose Templates Section */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-bold mb-3"
              style={{ fontSize: device.isMobile ? "24px" : device.isTablet ? "28px" : "32px", color: "var(--text)" }}>
              Why Our System Works Better
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="rounded-xl border"
              style={{
                padding: device.isMobile ? "24px" : "32px",
                background: "rgba(232,80,2,0.03)",
                borderColor: "rgba(232,80,2,0.15)"
              }}
            >
              <div className="text-center mb-4">
                <div
                  className="inline-block rounded-full px-4 py-2 mb-3"
                  style={{
                    background: "rgba(232,80,2,0.12)",
                    border: "1px solid rgba(232,80,2,0.3)",
                    color: "var(--orange)",
                    fontWeight: 700,
                    fontSize: device.isMobile ? "13px" : "14px"
                  }}
                >
                  🚀 Our Template System
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  "✅ 3-4 hour delivery",
                  "✅ 100% consistent branding",
                  "✅ ₹500-1300 monthly (10-15 thumbnails)",
                  "✅ Same proven design every time",
                  "✅ Minor text edits included",
                  "✅ Proven 13%+ average CTR"
                ].map((item, idx) => (
                  <li key={idx} style={{ fontSize: device.isMobile ? "14px" : "15px", color: "var(--text)", fontWeight: 500 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="rounded-xl border"
              style={{
                padding: device.isMobile ? "24px" : "32px",
                background: "var(--surface)",
                borderColor: "rgba(232,80,2,0.15)"
              }}
            >
              <div className="text-center mb-4">
                <div
                  className="inline-block rounded-full px-4 py-2 mb-3"
                  style={{
                    background: "rgba(128,128,128,0.1)",
                    border: "1px solid rgba(128,128,128,0.3)",
                    color: "var(--text-muted)",
                    fontWeight: 700,
                    fontSize: device.isMobile ? "13px" : "14px"
                  }}
                >
                  ⏰ Traditional Per-Design
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  "❌ 24-48 hour wait per thumbnail",
                  "❌ Different style each time",
                  "❌ ₹300-800 × 10 = ₹3,000-8,000/mo",
                  "❌ No design consistency",
                  "❌ Revisions cost extra",
                  "❌ Unpredictable CTR results"
                ].map((item, idx) => (
                  <li key={idx} style={{ fontSize: device.isMobile ? "14px" : "15px", color: "var(--text-muted)", fontWeight: 500 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-center mt-8 p-4 rounded-xl" style={{ background: "rgba(232,80,2,0.05)", border: "1px solid rgba(232,80,2,0.15)" }}>
            <p style={{ fontSize: device.isMobile ? "14px" : "16px", color: "var(--text)", fontWeight: 600 }}>
              💡 <strong style={{ color: "var(--orange)" }}>The Result:</strong> Save 75% on costs while maintaining{" "}
              <strong style={{ color: "var(--orange)" }}>professional consistency</strong> across all streams
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-8 md:py-12 lg:py-16" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(232,80,2,0.03) 50%, transparent 100%)" }}>
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
          <h2 className="font-bold mb-3 md:mb-4"
            style={{ fontSize: device.isMobile ? "24px" : device.isTablet ? "32px" : device.isLaptop ? "36px" : "40px", color: "var(--text)" }}>
            Trusted by Gaming Creators
          </h2>
          <p style={{ fontSize: device.isMobile ? "14px" : device.isTablet ? "16px" : device.isLaptop ? "17px" : "18px", color: "var(--text-muted)" }}>
            See what other streamers say about our templates
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
          {TESTIMONIALS.map((testimonial, idx) => (
            <div key={idx} style={{ animation: `fadeInUp 500ms ease-out ${idx * 0.1}s both` }}>
              <TestimonialCard testimonial={testimonial} device={device} />
            </div>
          ))}
        </div>
      </section>

      {/* Trust & Guarantee Section */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {[
              { icon: Shield, title: "100% Satisfaction", desc: "Not happy? We'll revise until you are or refund you fully" },
              { icon: Clock, title: "Lightning Fast", desc: "Express delivery in 3-4 hours. Subscriptions within 24h" },
              { icon: CheckCircle, title: "No Lock-In", desc: "Cancel anytime. No questions asked. Month-to-month only" }
            ].map((item, idx) => (
              <div
                key={idx}
                className="text-center rounded-xl border"
                style={{
                  padding: device.isMobile ? "24px 16px" : "32px 20px",
                  background: "var(--surface)",
                  borderColor: "rgba(232,80,2,0.15)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                }}
              >
                <div
                  className="rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{
                    width: device.isMobile ? "56px" : "64px",
                    height: device.isMobile ? "56px" : "64px",
                    background: "linear-gradient(135deg, rgba(232,80,2,0.15), rgba(255,147,87,0.05))",
                    border: "2px solid rgba(232,80,2,0.3)"
                  }}
                >
                  <item.icon size={device.isMobile ? 26 : 30} style={{ color: "var(--orange)" }} />
                </div>
                <h3 className="font-bold mb-2" style={{ fontSize: device.isMobile ? "16px" : "18px", color: "var(--text)" }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: device.isMobile ? "13px" : "14px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        <div className="text-center max-w-2xl mx-auto mb-6 md:mb-8">
          <h2 className="font-bold mb-3 md:mb-4"
            style={{ fontSize: device.isMobile ? "24px" : device.isTablet ? "32px" : device.isLaptop ? "36px" : "40px", color: "var(--text)" }}>
            Simple, Creator-Friendly Pricing
          </h2>
          <p style={{ fontSize: device.isMobile ? "14px" : device.isTablet ? "16px" : device.isLaptop ? "17px" : "18px", color: "var(--text-muted)" }}>
            One template → repeatable thumbnails. Cancel anytime. No hidden fees.
          </p>
        </div>

        <div
          className="max-w-md mx-auto mb-8 rounded-xl flex items-center justify-center gap-3"
          style={{
            padding: "12px 20px",
            background: "linear-gradient(135deg, rgba(232,80,2,0.12), rgba(255,147,87,0.06))",
            border: "1px dashed rgba(232,80,2,0.35)"
          }}
        >
          <Users size={18} style={{ color: "var(--orange)" }} />
          <span style={{ fontSize: device.isMobile ? "13px" : "14px", color: "var(--text)", fontWeight: 600 }}>
            <strong style={{ color: "var(--orange)" }}>Only 3 slots left</strong> this month
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
          <PriceCard
            title="Express"
            qty="1 Thumbnail"
            basePrice={120}
            sub="One-time delivery"
            bullets={["3–4 hour turnaround", "Photo & title swap", "Stream-ready JPG/PNG"]}
            device={device}
            festival={festival}
            allowDiscount={false}
            isExpress={true}
          />
          <PriceCard
            title="Starter"
            qty="5 Thumbnails"
            basePrice={500}
            perMonth
            sub="Monthly subscription"
            bullets={["One template design", "5 thumbnails per month", "Fast delivery", "Minor text edits"]}
            device={device}
            festival={festival}
            allowDiscount={discountEligibleTitles.includes("Starter")}
          />
          <PriceCard
            title="Pro"
            qty="10 Thumbnails"
            basePrice={900}
            perMonth
            sub="Monthly subscription"
            bullets={["Priority scheduling", "10 thumbnails per month", "A/B test suggestions", "Monthly refinements"]}
            highlight
            popular
            device={device}
            festival={festival}
            allowDiscount={discountEligibleTitles.includes("Pro")}
          />
          <PriceCard
            title="Studio"
            qty="15 Thumbnails"
            basePrice={1300}
            perMonth
            sub="Monthly subscription"
            bullets={["Weekly check-ins", "15 thumbnails per month", "Variant proposals", "Brand consistency"]}
            device={device}
            festival={festival}
            allowDiscount={false}
          />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="font-bold mb-3 md:mb-4"
              style={{ fontSize: device.isMobile ? "24px" : device.isTablet ? "32px" : device.isLaptop ? "36px" : "40px", color: "var(--text)" }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontSize: device.isMobile ? "14px" : device.isTablet ? "16px" : device.isLaptop ? "17px" : "18px", color: "var(--text-muted)" }}>
              Everything you need to know about our live template service
            </p>
          </div>

          <div
            className="rounded-xl md:rounded-2xl border"
            style={{
              padding: device.isMobile ? "16px" : device.isTablet ? "20px" : "24px",
              background: "var(--surface)",
              borderColor: "rgba(232,80,2,0.15)"
            }}
          >
            {FAQ_DATA.map((faq, idx) => (
              <FAQItem key={idx} question={faq.q} answer={faq.a} device={device} />
            ))}
          </div>

          <div className="text-center mt-8" style={{ fontSize: device.isMobile ? "13px" : "14px", color: "var(--text-muted)" }}>
            Still have questions?{" "}
            <a href="#contact" style={{ color: "var(--orange)", fontWeight: 600, textDecoration: "none" }}>
              Contact us
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-2xl border text-center relative overflow-hidden"
            style={{
              padding: device.isMobile ? "40px 24px" : device.isTablet ? "48px 32px" : "56px 40px",
              background: "linear-gradient(135deg, rgba(232,80,2,0.12), rgba(255,147,87,0.06))",
              borderColor: "rgba(232,80,2,0.3)",
              boxShadow: "0 8px 32px rgba(232,80,2,0.15)"
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-50%",
                right: "-20%",
                width: 300,
                height: 300,
                background: "radial-gradient(circle, rgba(232,80,2,0.15) 0%, transparent 70%)",
                borderRadius: "50%",
                pointerEvents: "none"
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                className="inline-flex items-center justify-center rounded-full mx-auto"
                style={{
                  width: device.isMobile ? "64px" : "72px",
                  height: device.isMobile ? "64px" : "72px",
                  background: "linear-gradient(135deg, var(--orange), #ff9357)",
                  marginBottom: 20,
                  boxShadow: "0 8px 24px rgba(232,80,2,0.35)",
                  border: "3px solid rgba(255,255,255,0.2)"
                }}
              >
                <Sparkles size={device.isMobile ? 28 : 32} style={{ color: "#fff" }} />
              </div>

              <h3
                className="font-bold mb-3"
                style={{
                  fontSize: device.isMobile ? "24px" : device.isTablet ? "28px" : "32px",
                  background: "linear-gradient(135deg, var(--text), #cfcfcf)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
                Ready to Boost Your Stream?
              </h3>
              <p
                className="mb-8 md:mb-10"
                style={{
                  fontSize: device.isMobile ? "14px" : "16px",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                  maxWidth: 500,
                  margin: "0 auto",
                  marginBottom: device.isMobile ? "32px" : "40px"
                }}
              >
                Join <strong style={{ color: "var(--orange)" }}>10+ creators</strong> who trust us with their thumbnails.
                Start with express delivery or subscribe for monthly thumbnails.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://wa.me/918968141585?text=Hi%20Shinel%20Studios%2C%20I%20want%20the%20Live%20Template%20subscription"
                  className="inline-flex items-center justify-center gap-3 rounded-xl font-bold group"
                  style={{
                    padding: device.isMobile ? "18px 28px" : "20px 36px",
                    fontSize: device.isMobile ? "16px" : "18px",
                    background: "linear-gradient(135deg, var(--orange), #ff9357)",
                    color: "#fff",
                    boxShadow: "0 10px 30px rgba(232,80,2,0.4)",
                    transform: "translateZ(0)",
                    transition: device.isMobile ? "none" : "transform 250ms ease-out, box-shadow 250ms ease-out",
                    minHeight: 56,
                    textDecoration: "none",
                    border: "2px solid rgba(255, 255, 255, 0.2)"
                  }}
                >
                  <svg width={device.isMobile ? 22 : 26} height={device.isMobile ? 22 : 26} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  <span>Chat on WhatsApp</span>
                </a>

                <a
                  href="mailto:shinelstudioofficial@gmail.com?subject=Live%20Template%20Inquiry"
                  className="inline-flex items-center justify-center gap-2 rounded-xl font-bold"
                  style={{
                    padding: device.isMobile ? "18px 28px" : "20px 36px",
                    fontSize: device.isMobile ? "16px" : "18px",
                    background: "rgba(232,80,2,0.12)",
                    color: "var(--orange)",
                    border: "2px solid rgba(232,80,2,0.35)",
                    transform: "translateZ(0)",
                    transition: device.isMobile ? "none" : "transform 250ms ease-out, background 250ms ease-out",
                    minHeight: 56,
                    textDecoration: "none",
                    backdropFilter: "blur(10px)"
                  }}
                >
                  Email Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        html {
          scroll-behavior: smooth;
        }
        @keyframes fadeInUp {
          from { 
            opacity: 0; 
            transform: translate3d(0, 20px, 0); 
          }
          to { 
            opacity: 1; 
            transform: translate3d(0, 0, 0); 
          }
        }
        @keyframes pulse {
          0%, 100% { 
            box-shadow: 0 4px 16px rgba(232, 80, 2, 0.5); 
          }
          50% { 
            box-shadow: 0 4px 24px rgba(232, 80, 2, 0.7); 
          }
        }
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: translate3d(0, 10px, 0); 
          }
          to { 
            opacity: 1; 
            transform: translate3d(0, 0, 0); 
          }
        }
        * { 
          -webkit-tap-highlight-color: transparent; 
          -webkit-font-smoothing: antialiased; 
          -moz-osx-font-smoothing: grayscale; 
        }
        a, button { 
          -webkit-touch-callout: none; 
          user-select: none; 
        }
        img { 
          content-visibility: auto;
          will-change: auto;
          -webkit-user-drag: none;
          user-select: none;
        }
        .container {
          will-change: auto;
        }
        @media (hover: hover) and (pointer: fine) {
          a:hover, button:hover { 
            cursor: pointer; 
          }
          a[href="#templates"]:hover,
          a[href="#pricing"]:hover,
          a[href="#contact"]:hover,
          a[href*="wa.me"]:hover,
          a[href^="mailto"]:hover {
            transform: translate3d(0, -2px, 0);
            box-shadow: 0 12px 36px rgba(232, 80, 2, 0.4);
          }
          a[href="#pricing"].inline-flex:hover {
            transform: scale3d(1.02, 1.02, 1);
            background: rgba(232, 80, 2, 0.15);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
          *, *::before, *::after { 
            animation-duration: 0.01ms !important; 
            animation-iteration-count: 1 !important; 
            transition-duration: 0.01ms !important; 
            scroll-behavior: auto !important;
          }
        }
        @media (max-width: 768px) {
          * {
            will-change: auto !important;
          }
        }
      `}</style>
    </div>
  );
}