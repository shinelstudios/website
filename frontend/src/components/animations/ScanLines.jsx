/**
 * ScanLines.jsx
 * 
 * About: Scan lines background animation component
 * Purpose: Creates horizontal scan line effects for tech-focused aesthetic
 * 
 * Cross-Device Compatibility:
 * - iOS Safari: Uses translate3d for GPU acceleration, webkit-prefixed animations
 * - macOS Safari: Webkit-prefixed keyframes for older versions
 * - Android Chrome: Optimized with will-change and transform3d
 * - Windows Browsers: Standard CSS animations with fallbacks
 * 
 * Accessibility: Respects prefers-reduced-motion user preference
 * Performance: GPU-accelerated with translate3d for smooth scrolling
 */
import React from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Scan Lines Background Animation
 * Horizontal scan lines moving upward
 * Tech-focused, professional aesthetic
 */
const ScanLines = ({
  color = '#E85002',
  opacity = 0.08,
  lineCount = 20,
  speed = 'medium', // 'slow', 'medium', 'fast'
}) => {
  const prefersReducedMotion = useReducedMotion();

  const speedMap = {
    slow: '30s',
    medium: '20s',
    fast: '12s',
  };

  const animationDuration = speedMap[speed] || speedMap.medium;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <style>{`
        @keyframes scan-up {
          0% {
            transform: translate3d(0, 100%, 0);
          }
          100% {
            transform: translate3d(0, -100%, 0);
          }
        }
        @-webkit-keyframes scan-up {
          0% {
            -webkit-transform: translate3d(0, 100%, 0);
          }
          100% {
            -webkit-transform: translate3d(0, -100%, 0);
          }
        }

        @keyframes scan-pulse {
          0%, 100% {
            opacity: var(--line-opacity);
          }
          50% {
            opacity: calc(var(--line-opacity) * 1.5);
          }
        }
        @-webkit-keyframes scan-pulse {
          0%, 100% {
            opacity: var(--line-opacity);
          }
          50% {
            opacity: calc(var(--line-opacity) * 1.5);
          }
        }

        .scan-lines-container {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            ${color} 2px,
            ${color} 3px
          );
          animation: scan-up ${animationDuration} linear infinite;
          -webkit-animation: scan-up ${animationDuration} linear infinite;
          will-change: transform;
        }

        .scan-accent-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, ${color}, transparent);
          box-shadow: 0 0 10px ${color}, 0 0 20px ${color}80;
          animation: scan-up ${animationDuration} linear infinite,
                     scan-pulse 2s ease-in-out infinite;
          -webkit-animation: scan-up ${animationDuration} linear infinite,
                             scan-pulse 2s ease-in-out infinite;
          will-change: transform, opacity;
        }

        @media (prefers-reduced-motion: reduce) {
          .scan-lines-container,
          .scan-accent-line {
            animation: none !important;
          }
        }
      `}</style>

      {/* Base scan lines */}
      <div
        className="scan-lines-container"
        style={{
          opacity: prefersReducedMotion ? opacity * 0.5 : opacity,
        }}
      />

      {/* Accent lines */}
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="scan-accent-line"
          style={{
            '--line-opacity': opacity * 2,
            top: `${(i + 1) * 25}%`,
            animationDelay: `-${i * 5}s`,
            opacity: prefersReducedMotion ? 0 : undefined,
          }}
        />
      ))}

      {/* Subtle grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(${color}10 1px, transparent 1px),
            linear-gradient(90deg, ${color}10 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          opacity: opacity * 0.5,
        }}
      />
    </div>
  );
};

export default ScanLines;
