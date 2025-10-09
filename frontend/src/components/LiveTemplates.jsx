/**
 * LiveTemplates.jsx - DEVICE-OPTIMIZED VERSION
 * =============================================
 * Device-specific optimizations:
 * - Mobile: Reduced animations, larger touch targets, optimized spacing
 * - Tablet: Balanced animations, medium spacing
 * - Desktop: Full animations, hover effects, optimal spacing
 * - Responsive typography and layouts for all breakpoints
 * - Performance optimized with GPU acceleration and will-change
 */

import React, { useEffect, useState } from "react";
import { Sparkles, Layers, BadgeCheck, Wallet, Clock } from "lucide-react";

// --- Device detection hook ---
function useDeviceType() {
  const [device, setDevice] = useState({
    isMobile: false,
    isTablet: false,
    isLaptop: false,
    isDesktop: true,
    prefersReducedMotion: false
  });

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      setDevice({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isLaptop: width >= 1024 && width < 1440,
        isDesktop: width >= 1440,
        prefersReducedMotion
      });
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return device;
}

// --- SEO injection ---
function usePageSEO() {
  useEffect(() => {
    const title = "Live Stream Thumbnail Templates | Fast, Consistent & Affordable";
    const desc =
      "Get 5–15 gaming livestream thumbnails/month from a single high-CTR template. Swap your photo & name in 3–4 hours. Starts ₹120 express or ₹500/mo.";
    const url =
      typeof window !== "undefined"
        ? window.location.origin + "/live-templates"
        : "https://shinelstudios.in/live-templates";

    document.title = `Shinel Studios — ${title}`;

    const setMeta = (selector, attr, value) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement(selector.startsWith("meta") ? "meta" : "link");
        if (selector.startsWith("meta")) el.setAttribute("name", attr);
        else el.setAttribute("rel", attr);
        document.head.appendChild(el);
      }
      if (selector.startsWith("meta")) el.setAttribute("content", value);
      else el.setAttribute("href", value);
    };

    setMeta('meta[name="description"]', "name", desc);
    setMeta('link[rel="canonical"]', "canonical", url);

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
    og("og:url", url);
    og("og:type", "website");
    og("og:image", "https://shinelstudios.in/og-image.png");

    setMeta('meta[name="twitter:card"]', "name", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", title + " — Shinel Studios");
    setMeta('meta[name="twitter:description"]', "name", desc);
    setMeta('meta[name="twitter:image"]', "name", "https://shinelstudios.in/og-image.png");
  }, []);
}

// --- Template data ---
// TODO: Add your actual template images in the public/templates/ folder:
// For each game template, you need 3 images:
// 1. Base template (the original design without any creator)
// 2. Example 1 (template customized for first creator)
// 3. Example 2 (template customized for second creator)
//
// BGMI Template Images:
// - /templates/bgmi_base.jpg (Base template design)
// - /templates/bgmi_creator1.jpg (Template with first creator's photo & name)
// - /templates/bgmi_creator2.jpg (Template with second creator's photo & name)
//
// Valorant Template Images:
// - /templates/valorant_base.jpg (Base template design)
// - /templates/valorant_creator1.jpg (Template with first creator's photo & name)
// - /templates/valorant_creator2.jpg (Template with second creator's photo & name)

const DATA = [
  {
    id: "bgmi",
    name: "BGMI Live Template",
    gameName: "BGMI",
    niche: "Battle Royale • Mobile Gaming",
    beforeAfterPairs: [
      {
        before: { src: "/templates/bgmi_base.jpg", label: "Base Template" },
        after: { src: "/templates/bgmi_creator1.jpg", label: "Creator Example 1" }
      },
      {
        before: { src: "/templates/bgmi_base.jpg", label: "Base Template" },
        after: { src: "/templates/bgmi_creator2.jpg", label: "Creator Example 2" }
      }
    ],
    notes: ["Bold title space", "Face-cam ready", "High contrast colors"],
  },
  {
    id: "valorant",
    name: "Valorant Live Template",
    gameName: "Valorant",
    niche: "FPS • Tactical Shooter",
    beforeAfterPairs: [
      {
        before: { src: "/templates/valorant_base.jpg", label: "Base Template" },
        after: { src: "/templates/valorant_creator1.jpg", label: "Creator Example 1" }
      },
      {
        before: { src: "/templates/valorant_base.jpg", label: "Base Template" },
        after: { src: "/templates/valorant_creator2.jpg", label: "Creator Example 2" }
      }
    ],
    notes: ["Agent-friendly design", "Rank display area", "Clean typography"],
  },
];

// --- Before/After Comparison Slider ---
const BeforeAfterSlider = ({ beforeImage, afterImage, device }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = React.useRef(null);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    
    setSliderPosition(Math.min(Math.max(percentage, 0), 100));
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e) => {
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className="relative rounded-lg md:rounded-xl overflow-hidden border select-none"
      style={{ 
        borderColor: "rgba(232, 80, 2, 0.2)", 
        background: "#1a1a1a",
        aspectRatio: "16/9",
        cursor: 'ew-resize',
        touchAction: 'none'
      }}
      onTouchMove={handleTouchMove}
    >
      {/* After Image (Background) */}
      <div className="absolute inset-0">
        <img 
          src={afterImage.src} 
          alt={afterImage.label}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <span
          className="absolute right-2 top-2 md:right-3 md:top-3 text-xs font-bold backdrop-blur-sm"
          style={{ 
            padding: device.isMobile ? '4px 8px' : device.isTablet ? '5px 10px' : device.isLaptop ? '6px 12px' : '7px 14px',
            fontSize: device.isMobile ? '10px' : device.isTablet ? '11px' : '12px',
            background: "rgba(232, 80, 2, 0.95)", 
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: '20px'
          }}
        >
          ✨ {afterImage.label}
        </span>
      </div>

      {/* Before Image (Clipped) */}
      <div 
        className="absolute inset-0"
        style={{
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
        }}
      >
        <img 
          src={beforeImage.src} 
          alt={beforeImage.label}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <span
          className="absolute left-2 top-2 md:left-3 md:top-3 text-xs px-2 py-1 md:px-3 md:py-1.5 rounded-full font-bold backdrop-blur-sm"
          style={{ 
            background: "rgba(0, 0, 0, 0.75)", 
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.2)"
          }}
        >
          📋 {beforeImage.label}
        </span>
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 cursor-ew-resize"
        style={{
          left: `${sliderPosition}%`,
          width: device.isMobile ? '2px' : device.isTablet ? '2px' : '3px',
          background: 'linear-gradient(135deg, #e85002, #ff9357)',
          transform: 'translateX(-50%)',
          boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.5), 0 0 20px rgba(232, 80, 2, 0.5)',
          zIndex: 10
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Handle Circle */}
        <div
          className="absolute top-1/2 left-1/2 rounded-full flex items-center justify-center"
          style={{
            width: device.isMobile ? '40px' : device.isTablet ? '44px' : device.isLaptop ? '50px' : '56px',
            height: device.isMobile ? '40px' : device.isTablet ? '44px' : device.isLaptop ? '50px' : '56px',
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, #e85002, #ff9357)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 -2px 8px rgba(0, 0, 0, 0.2)',
            border: device.isMobile ? '3px solid white' : '4px solid white'
          }}
        >
          <svg 
            width={device.isMobile ? 20 : device.isTablet ? 22 : device.isLaptop ? 26 : 30} 
            height={device.isMobile ? 20 : device.isTablet ? 22 : device.isLaptop ? 26 : 30}
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="2.5"
          >
            <path d="M15 18l-6-6 6-6M9 18l-6-6 6-6" />
          </svg>
        </div>
      </div>

      {/* Instruction Text */}
      <div 
        className="absolute left-1/2 backdrop-blur-sm"
        style={{
          bottom: device.isMobile ? '8px' : device.isTablet ? '10px' : '12px',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: device.isMobile ? '4px 10px' : device.isTablet ? '5px 12px' : '6px 14px',
          borderRadius: '20px',
          fontSize: device.isMobile ? '11px' : device.isTablet ? '12px' : '13px',
          color: '#fff',
          fontWeight: 600
        }}
      >
        {device.isMobile ? '👆 Drag to compare' : '🖱️ Drag to compare'}
      </div>
    </div>
  );
};

// --- Device-optimized bullet ---
const Bullet = ({ children, device }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full font-medium"
    style={{
      padding: device.isMobile ? '6px 10px' : '6px 12px',
      fontSize: device.isMobile ? '11px' : '12px',
      border: "1px solid rgba(232, 80, 2, 0.2)",
      background: "rgba(232, 80, 2, 0.05)",
      color: "#e0e0e0",
    }}
  >
    {children}
  </span>
);

// --- Device-optimized price card ---
const PriceCard = ({ title, qty, price, perMonth, sub, bullets = [], highlight, popular, device }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const shouldAnimate = !device.isMobile && !device.prefersReducedMotion;
  
  return (
    <div
      className="rounded-xl md:rounded-2xl border relative"
      style={{
        padding: device.isMobile ? '20px' : device.isTablet ? '24px' : '24px',
        borderColor: highlight ? "#e85002" : "rgba(232, 80, 2, 0.15)",
        background: highlight ? "rgba(232, 80, 2, 0.05)" : "#1a1a1a",
        transform: shouldAnimate && isHovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: shouldAnimate ? 'transform 300ms ease-out, box-shadow 300ms ease-out' : 'none',
        boxShadow: highlight 
          ? "0 12px 40px rgba(232, 80, 2, 0.25)" 
          : "0 4px 20px rgba(0, 0, 0, 0.3)",
        willChange: shouldAnimate ? 'transform' : 'auto'
      }}
      onMouseEnter={() => !device.isMobile && setIsHovered(true)}
      onMouseLeave={() => !device.isMobile && setIsHovered(false)}
    >
      {popular && (
        <div
          className="absolute left-1/2 text-xs font-bold uppercase px-3 md:px-4 py-1 md:py-1.5 rounded-full"
          style={{ 
            top: device.isMobile ? '-12px' : '-12px',
            background: "linear-gradient(135deg, #e85002, #ff9357)", 
            color: "#fff",
            transform: 'translateX(-50%)',
            boxShadow: '0 4px 12px rgba(232, 80, 2, 0.4)',
            fontSize: device.isMobile ? '10px' : '12px'
          }}
        >
          ⭐ Most Popular
        </div>
      )}
      
      <div className="flex items-center gap-2 mb-3">
        <Wallet size={device.isMobile ? 16 : 18} style={{ color: "#e85002" }} />
        <h3 className="font-bold" style={{ 
          fontSize: device.isMobile ? '16px' : '18px',
          color: "#fff" 
        }}>
          {title}
        </h3>
      </div>
      
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="font-bold" style={{ 
            fontSize: device.isMobile ? '32px' : device.isTablet ? '36px' : '40px',
            color: "#fff" 
          }}>
            ₹{price}
          </span>
          {perMonth && (
            <span className="font-medium" style={{ 
              fontSize: device.isMobile ? '13px' : '15px',
              color: "#999" 
            }}>
              /month
            </span>
          )}
        </div>
        <div className="font-semibold mt-1" style={{ 
          fontSize: device.isMobile ? '15px' : '17px',
          color: "#e85002" 
        }}>
          {qty}
        </div>
        <div className="mt-1" style={{ 
          fontSize: device.isMobile ? '12px' : '13px',
          color: "#999" 
        }}>
          {sub}
        </div>
      </div>
      
      <ul className="space-y-2 md:space-y-3 mb-5 md:mb-6">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2" style={{ 
            fontSize: device.isMobile ? '13px' : '14px',
            color: "#e0e0e0" 
          }}>
            <BadgeCheck size={device.isMobile ? 14 : 16} style={{ color: "#e85002", flexShrink: 0, marginTop: '2px' }} />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      
      <a
        href="#contact"
        className="block w-full text-center rounded-lg md:rounded-xl font-semibold"
        style={{
          padding: device.isMobile ? '14px 16px' : '16px',
          fontSize: device.isMobile ? '15px' : '16px',
          background: highlight 
            ? "linear-gradient(135deg, #e85002, #ff9357)" 
            : "rgba(232, 80, 2, 0.1)",
          color: highlight ? "#fff" : "#e85002",
          border: highlight ? "none" : "1px solid rgba(232, 80, 2, 0.3)",
          transform: shouldAnimate && isHovered ? 'scale(1.02)' : 'scale(1)',
          transition: shouldAnimate ? 'transform 200ms ease-out' : 'none',
          willChange: shouldAnimate ? 'transform' : 'auto',
          minHeight: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {highlight ? "Get Started Now" : "Choose Plan"}
      </a>
    </div>
  );
};

// --- Main page ---
export default function LiveTemplates() {
  usePageSEO();
  const device = useDeviceType();
  const [templates] = useState(DATA);

  const getAnimationDelay = (index) => {
    if (device.isMobile || device.prefersReducedMotion) return '0s';
    return `${index * 0.1}s`;
  };

  const getAnimationDuration = () => {
    if (device.isMobile) return '400ms';
    if (device.isTablet) return '500ms';
    if (device.isLaptop) return '550ms';
    return '600ms';
  };

  return (
    <div style={{ background: "#0a0a0a", color: "#fff", minHeight: "100vh" }}>
      {/* Hero */}
      <section className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full font-bold mb-4 md:mb-6"
            style={{
              padding: device.isMobile ? '8px 14px' : '8px 16px',
              fontSize: device.isMobile ? '11px' : '12px',
              color: "#e85002",
              border: "1px solid rgba(232, 80, 2, 0.3)",
              background: "rgba(232, 80, 2, 0.08)",
            }}
          >
            <Layers size={device.isMobile ? 12 : 14} /> Live Stream Thumbnail Templates
          </div>
          
          <h1 className="font-bold mb-3 md:mb-4 leading-tight" style={{
            fontSize: device.isMobile ? '28px' : device.isTablet ? '40px' : device.isLaptop ? '48px' : '56px',
            background: "linear-gradient(135deg, #fff, #e0e0e0)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            High-CTR Templates.<br />Personalized in Minutes.
          </h1>
          
          <p className="mb-6 md:mb-8 leading-relaxed" style={{ 
            fontSize: device.isMobile ? '15px' : device.isTablet ? '17px' : device.isLaptop ? '18px' : '19px',
            color: "#b0b0b0",
            maxWidth: device.isMobile ? '100%' : '90%',
            margin: '0 auto',
            marginBottom: device.isMobile ? '24px' : '32px'
          }}>
            We design the base template once, then swap your <span style={{ color: "#e85002", fontWeight: 600 }}>photo & name</span> for 
            {" "}<span style={{ color: "#e85002", fontWeight: 600 }}>5–15 thumbnails</span> each month.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 md:gap-4 mb-6 md:mb-8">
            <a
              href="#templates"
              className="w-full sm:w-auto text-center rounded-lg md:rounded-xl font-bold"
              style={{
                padding: device.isMobile ? '16px 28px' : device.isTablet ? '18px 32px' : '18px 36px',
                fontSize: device.isMobile ? '16px' : '18px',
                background: "linear-gradient(135deg, #e85002, #ff9357)",
                color: "#fff",
                boxShadow: "0 8px 24px rgba(232, 80, 2, 0.3)",
                transform: 'translateZ(0)',
                transition: device.isMobile ? 'none' : 'transform 200ms ease-out',
                minHeight: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              See Templates
            </a>
            <a
              href="#pricing"
              className="w-full sm:w-auto text-center rounded-lg md:rounded-xl font-bold"
              style={{
                padding: device.isMobile ? '16px 28px' : device.isTablet ? '18px 32px' : '18px 36px',
                fontSize: device.isMobile ? '16px' : '18px',
                background: "rgba(232, 80, 2, 0.1)",
                color: "#e85002",
                border: "1px solid rgba(232, 80, 2, 0.3)",
                transform: 'translateZ(0)',
                transition: device.isMobile ? 'none' : 'transform 200ms ease-out',
                minHeight: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              View Pricing
            </a>
          </div>

          <div className="flex items-center justify-center gap-2" style={{ 
            fontSize: device.isMobile ? '13px' : '14px',
            color: "#999" 
          }}>
            <Clock size={device.isMobile ? 14 : 16} style={{ color: "#e85002" }} />
            <span><b style={{ color: "#fff" }}>Express delivery:</b> ₹120 in 3–4 hours</span>
          </div>
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
          <h2 className="font-bold mb-3 md:mb-4" style={{
            fontSize: device.isMobile ? '24px' : device.isTablet ? '32px' : device.isLaptop ? '36px' : '40px'
          }}>
            Available Templates
          </h2>
          <p style={{ 
            fontSize: device.isMobile ? '14px' : device.isTablet ? '16px' : device.isLaptop ? '17px' : '18px',
            color: "#b0b0b0" 
          }}>
            {device.isMobile ? 'Drag' : 'Drag'} the slider to see how each template transforms from base design to personalized creator thumbnails
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 lg:gap-10 max-w-7xl mx-auto">
          {templates.map((t, idx) => (
            <div
              key={t.id}
              className="rounded-xl md:rounded-2xl border"
              style={{ 
                padding: device.isMobile ? '16px' : device.isTablet ? '20px' : '24px',
                borderColor: "rgba(232, 80, 2, 0.15)", 
                background: "#1a1a1a",
                animation: device.prefersReducedMotion ? 'none' : `fadeInUp ${getAnimationDuration()} ease-out ${getAnimationDelay(idx)} both`
              }}
            >
              <div className="mb-4 md:mb-5">
                <div className="flex items-center gap-2 md:gap-3 mb-3">
                  <h3 className="font-bold" style={{
                    fontSize: device.isMobile ? '20px' : device.isTablet ? '24px' : '28px'
                  }}>
                    {t.gameName}
                  </h3>
                  <span 
                    className="px-2 md:px-3 py-1 rounded-full font-bold"
                    style={{
                      fontSize: device.isMobile ? '10px' : device.isTablet ? '11px' : '12px',
                      background: "linear-gradient(135deg, #e85002, #ff9357)",
                      color: "#fff"
                    }}
                  >
                    Live
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Bullet device={device}>{t.niche}</Bullet>
                  {t.notes.map((n, i) => (
                    <Bullet key={i} device={device}>{n}</Bullet>
                  ))}
                </div>
              </div>
              
              {/* Two Before/After Sliders */}
              <div className="space-y-4 md:space-y-5">
                {t.beforeAfterPairs.map((pair, pairIdx) => (
                  <div key={pairIdx}>
                    <BeforeAfterSlider 
                      beforeImage={pair.before}
                      afterImage={pair.after}
                      device={device}
                    />
                  </div>
                ))}
              </div>
              
              <a
                href="#pricing"
                className="mt-4 md:mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg md:rounded-xl font-semibold"
                style={{
                  padding: device.isMobile ? '14px' : device.isTablet ? '15px' : '16px',
                  fontSize: device.isMobile ? '14px' : device.isTablet ? '15px' : '16px',
                  background: "rgba(232, 80, 2, 0.1)",
                  color: "#e85002",
                  border: "1px solid rgba(232, 80, 2, 0.3)",
                  transform: 'translateZ(0)',
                  transition: device.isMobile ? 'none' : 'transform 200ms ease-out',
                  minHeight: '48px'
                }}
              >
                <Sparkles size={device.isMobile ? 16 : device.isTablet ? 17 : 18} /> Use This Template
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
          <h2 className="font-bold mb-3 md:mb-4" style={{
            fontSize: device.isMobile ? '24px' : device.isTablet ? '32px' : device.isLaptop ? '36px' : '40px'
          }}>
            Simple, Creator-Friendly Pricing
          </h2>
          <p style={{ 
            fontSize: device.isMobile ? '14px' : device.isTablet ? '16px' : device.isLaptop ? '17px' : '18px',
            color: "#b0b0b0" 
          }}>
            One template → repeatable thumbnails. Cancel anytime. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
          <PriceCard
            title="Express"
            qty="1 Thumbnail"
            price={120}
            sub="One-time delivery"
            bullets={[
              "3–4 hour turnaround",
              "Your photo & title swap",
              "Stream-ready format",
            ]}
            device={device}
          />
          <PriceCard
            title="Starter"
            qty="5 Thumbnails"
            price={500}
            perMonth={true}
            sub="Monthly subscription"
            bullets={[
              "One template design",
              "5 thumbnails per month",
              "Fast delivery",
              "Minor text edits"
            ]}
            device={device}
          />
          <PriceCard
            title="Pro"
            qty="10 Thumbnails"
            price={900}
            perMonth={true}
            sub="Monthly subscription"
            bullets={[
              "Priority scheduling",
              "10 thumbnails per month",
              "A/B test suggestions",
              "Monthly refinements"
            ]}
            highlight
            popular
            device={device}
          />
          <PriceCard
            title="Studio"
            qty="15 Thumbnails"
            price={1300}
            perMonth={true}
            sub="Monthly subscription"
            bullets={[
              "Weekly check-ins",
              "15 thumbnails per month",
              "Variant proposals",
              "Brand consistency"
            ]}
            device={device}
          />
        </div>

        {/* CTA */}
        <div id="contact" className="mt-12 md:mt-16 text-center max-w-2xl mx-auto">
          <div className="rounded-xl md:rounded-2xl border" style={{
            padding: device.isMobile ? '24px' : device.isTablet ? '28px' : '32px',
            background: "linear-gradient(135deg, rgba(232, 80, 2, 0.1), rgba(255, 147, 87, 0.05))",
            borderColor: "rgba(232, 80, 2, 0.3)"
          }}>
            <h3 className="font-bold mb-2 md:mb-3" style={{
              fontSize: device.isMobile ? '20px' : device.isTablet ? '22px' : '24px'
            }}>
              Ready to Get Started?
            </h3>
            <p className="mb-5 md:mb-6" style={{ 
              fontSize: device.isMobile ? '14px' : '15px',
              color: "#b0b0b0" 
            }}>
              Chat with us on WhatsApp or send an email to discuss your needs.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <a
                href="https://wa.me/918838179165?text=Hi%20Shinel%20Studios%2C%20I%20want%20the%20Live%20Template%20subscription"
                className="inline-flex items-center justify-center gap-2 rounded-lg md:rounded-xl font-bold"
                style={{ 
                  padding: device.isMobile ? '16px 24px' : '18px 28px',
                  fontSize: device.isMobile ? '15px' : '17px',
                  background: "linear-gradient(135deg, #e85002, #ff9357)", 
                  color: "#fff",
                  boxShadow: "0 8px 24px rgba(232, 80, 2, 0.3)",
                  transform: 'translateZ(0)',
                  transition: device.isMobile ? 'none' : 'transform 200ms ease-out',
                  minHeight: '52px'
                }}
              >
                <svg width={device.isMobile ? 20 : 24} height={device.isMobile ? 20 : 24} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Chat on WhatsApp
              </a>
              
              <a
                href="mailto:hello@shinelstudiosofficial.com"
                className="inline-flex items-center justify-center gap-2 rounded-lg md:rounded-xl font-bold"
                style={{
                  padding: device.isMobile ? '16px 24px' : '18px 28px',
                  fontSize: device.isMobile ? '15px' : '17px',
                  background: "rgba(232, 80, 2, 0.1)",
                  color: "#e85002",
                  border: "1px solid rgba(232, 80, 2, 0.3)",
                  transform: 'translateZ(0)',
                  transition: device.isMobile ? 'none' : 'transform 200ms ease-out',
                  minHeight: '52px'
                }}
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer note */}
      <div className="text-center pb-12 px-4">
        <p className="text-xs" style={{ color: "#666" }}>
          *Example images shown for illustration. Your brand materials remain confidential.
        </p>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        * {
          -webkit-tap-highlight-color: transparent;
        }

        a, button {
          -webkit-touch-callout: none;
          user-select: none;
        }

        @media (hover: hover) {
          a:hover, button:hover {
            cursor: pointer;
          }
        }
      `}</style>
    </div>
  );
}