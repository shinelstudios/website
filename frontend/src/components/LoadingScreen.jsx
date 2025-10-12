// src/components/LoadingScreen.jsx
import React, { useEffect } from "react";
import logo from "../assets/logo-loader.png"; // ✅ Your logo file

const LoadingScreen = () => {
  useEffect(() => {
    // Prevent page scrolling while loading
    document.body.style.overflow = 'hidden';
    
    // Announce loading state to screen readers
    const loadingAnnouncement = document.createElement('div');
    loadingAnnouncement.setAttribute('role', 'status');
    loadingAnnouncement.setAttribute('aria-live', 'polite');
    loadingAnnouncement.setAttribute('aria-label', 'Page is loading');
    loadingAnnouncement.className = 'sr-only';
    loadingAnnouncement.textContent = 'Loading content, please wait';
    document.body.appendChild(loadingAnnouncement);

    return () => {
      // Cleanup: restore scrolling and remove announcement
      document.body.style.overflow = '';
      if (loadingAnnouncement.parentNode) {
        loadingAnnouncement.parentNode.removeChild(loadingAnnouncement);
      }
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-[#0F0F0F] z-[9999]"
      role="progressbar"
      aria-valuetext="Loading"
      aria-label="Page loading indicator"
    >
      <div className="relative flex items-center justify-center">
        {/* Logo - Responsive sizing */}
        <img
          src={logo}
          alt="Shinel Studios - Creative Digital Agency Logo"
          width="144"
          height="144"
          className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 object-contain relative z-10 select-none pointer-events-none"
          draggable="false"
          loading="eager"
          fetchPriority="high"
          style={{
            animation: 'logoFloat 3s ease-in-out infinite',
            willChange: 'transform',
          }}
        />

        {/* Optimized loading circle with CPU-friendly animations */}
        <div 
          className="absolute w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-44 lg:h-44 rounded-full border-[3px] border-transparent"
          aria-hidden="true"
          style={{
            borderTopColor: '#E85002',
            borderRightColor: '#E85002',
            borderBottomColor: 'rgba(232, 80, 2, 0.15)',
            borderLeftColor: 'rgba(232, 80, 2, 0.15)',
            animation: 'spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite',
            willChange: 'transform',
          }}
        />

        {/* Secondary rotating ring */}
        <div 
          className="absolute w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44 lg:w-48 lg:h-48 rounded-full border-[2px] border-transparent"
          aria-hidden="true"
          style={{
            borderTopColor: 'rgba(232, 80, 2, 0.4)',
            borderBottomColor: 'rgba(232, 80, 2, 0.1)',
            animation: 'spinReverse 2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite',
            willChange: 'transform',
          }}
        />

        {/* Secondary subtle pulse effect */}
        <div 
          className="absolute w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full bg-[#E85002]/5"
          aria-hidden="true"
          style={{
            animation: 'pulse 2.5s ease-in-out infinite',
            willChange: 'opacity, transform',
          }}
        />
      </div>

      <style>{`
        /* Screen reader only class for accessibility */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes spinReverse {
          to { transform: rotate(-360deg); }
        }

        @keyframes logoFloat {
          0%, 100% { 
            transform: translateY(0px) scale(1);
          }
          50% { 
            transform: translateY(-8px) scale(1.05);
          }
        }
        
        @keyframes pulse {
          0%, 100% { 
            opacity: 0.4;
            transform: scale(1);
          }
          50% { 
            opacity: 0.2;
            transform: scale(1.15);
          }
        }

        /* Reduce motion for users who prefer it */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }

        /* Ensure smooth animations on all devices */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;