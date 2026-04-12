/**
 * FloatingOrbs.jsx
 * 
 * About: Floating orbs background animation component
 * Purpose: Creates ambient floating orb effects for visual interest
 * 
 * Cross-Device Compatibility:
 * - iOS Safari: Uses translate3d for GPU acceleration, prevents flicker
 * - macOS Safari: Webkit-prefixed animations for older versions
 * - Android Chrome: Optimized with will-change and backface-visibility
 * - Windows Browsers: Standard CSS animations with fallbacks
 * 
 * Accessibility: Respects prefers-reduced-motion user preference
 * Performance: GPU-accelerated with translate3d and filter optimizations
 */
import React from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Floating Orbs Background Animation
 * Soft glowing orbs floating upward
 * Pure CSS with GPU acceleration
 */
const FloatingOrbs = ({
  orbCount = 6,
  color = '#E85002',
  opacity = 0.2,
  speed = 'medium',
}) => {
  const prefersReducedMotion = useReducedMotion();

  const speedMap = {
    slow: 25,
    medium: 18,
    fast: 12,
  };

  const baseDuration = speedMap[speed] || speedMap.medium;

  const orbs = Array.from({ length: orbCount }, (_, i) => ({
    id: i,
    size: Math.random() * 250 + 150,
    left: Math.random() * 100,
    delay: Math.random() * -20,
    duration: baseDuration + Math.random() * 10,
    opacity: (Math.random() * 0.4 + 0.6) * opacity,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <style>{`
        /* Floating Orbs Animation - Cross-Device Optimized
         * Uses translate3d for GPU acceleration on all devices
         * Webkit prefixes for Safari compatibility
         */
        @keyframes float-up {
          0% {
            transform: translate3d(0, 100vh, 0) scale(0.8);
            -webkit-transform: translate3d(0, 100vh, 0) scale(0.8);
            opacity: 0;
          }
          10% {
            opacity: var(--orb-opacity);
          }
          90% {
            opacity: var(--orb-opacity);
          }
          100% {
            transform: translate3d(0, -100vh, 0) scale(1.2);
            -webkit-transform: translate3d(0, -100vh, 0) scale(1.2);
            opacity: 0;
          }
        }

        /* Webkit-prefixed version for older Safari browsers */
        @-webkit-keyframes float-up {
          0% {
            -webkit-transform: translate3d(0, 100vh, 0) scale(0.8);
            opacity: 0;
          }
          10% {
            opacity: var(--orb-opacity);
          }
          90% {
            opacity: var(--orb-opacity);
          }
          100% {
            -webkit-transform: translate3d(0, -100vh, 0) scale(1.2);
            opacity: 0;
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            filter: blur(60px) brightness(1.2);
            -webkit-filter: blur(60px) brightness(1.2);
          }
          50% {
            filter: blur(80px) brightness(1.6);
            -webkit-filter: blur(80px) brightness(1.6);
          }
        }

        /* Webkit-prefixed version for older Safari browsers */
        @-webkit-keyframes pulse-glow {
          0%, 100% {
            -webkit-filter: blur(60px) brightness(1.2);
          }
          50% {
            -webkit-filter: blur(80px) brightness(1.6);
          }
        }

        .floating-orb {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, ${color} 0%, ${color}CC 30%, ${color}66 60%, transparent 80%);
          animation: float-up var(--duration) ease-in-out infinite,
                     pulse-glow 3s ease-in-out infinite;
          -webkit-animation: float-up var(--duration) ease-in-out infinite,
                             pulse-glow 3s ease-in-out infinite;
          animation-delay: var(--delay);
          -webkit-animation-delay: var(--delay);
          will-change: transform, opacity;
          /* GPU acceleration for smooth animation on all devices */
          transform: translate3d(0, 0, 0);
          -webkit-transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
        }

        /* Respect user's motion preferences (accessibility) */
        @media (prefers-reduced-motion: reduce) {
          .floating-orb {
            animation: none !important;
            -webkit-animation: none !important;
            opacity: calc(var(--orb-opacity) * 0.5) !important;
          }
        }
      `}</style>

      {orbs.map((orb) => (
        <div
          key={orb.id}
          className="floating-orb"
          style={{
            '--duration': `${orb.duration}s`,
            '--delay': `${orb.delay}s`,
            '--orb-opacity': orb.opacity,
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            left: `${orb.left}%`,
            bottom: 0,
          }}
        />
      ))}
    </div>
  );
};

export default FloatingOrbs;
