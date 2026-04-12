/**
 * GradientWaves.jsx
 * 
 * About: Gradient waves background animation component
 * Purpose: Creates smooth flowing gradient wave effects for visual depth
 * 
 * Cross-Device Compatibility:
 * - iOS Safari: Uses translate3d for GPU acceleration, webkit-prefixed animations
 * - macOS Safari: Webkit-prefixed keyframes for older versions
 * - Android Chrome: Optimized with will-change and transform3d
 * - Windows Browsers: Standard CSS animations with fallbacks
 * 
 * Accessibility: Respects prefers-reduced-motion user preference
 * Performance: GPU-accelerated with translate3d, filter blur optimizations
 */
import React from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Gradient Waves Background Animation
 * Smooth flowing gradient waves
 * Pure CSS animation for optimal performance
 */
const GradientWaves = ({
  colors = ['#E85002', '#000000', '#1a1a1a'],
  opacity = 0.3,
  speed = 'slow', // 'slow', 'medium', 'fast'
}) => {
  const prefersReducedMotion = useReducedMotion();

  const speedMap = {
    slow: '20s',
    medium: '12s',
    fast: '8s',
  };

  const animationDuration = speedMap[speed] || speedMap.slow;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <style>{`
        @keyframes wave-1 {
          0%, 100% {
            transform: translate3d(-50%, -50%, 0) rotate(0deg);
          }
          50% {
            transform: translate3d(-50%, -60%, 0) rotate(180deg);
          }
        }
        @-webkit-keyframes wave-1 {
          0%, 100% {
            -webkit-transform: translate3d(-50%, -50%, 0) rotate(0deg);
          }
          50% {
            -webkit-transform: translate3d(-50%, -60%, 0) rotate(180deg);
          }
        }
 
        @keyframes wave-2 {
          0%, 100% {
            transform: translate3d(-50%, -50%, 0) rotate(180deg);
          }
          50% {
            transform: translate3d(-50%, -40%, 0) rotate(360deg);
          }
        }
        @-webkit-keyframes wave-2 {
          0%, 100% {
            -webkit-transform: translate3d(-50%, -50%, 0) rotate(180deg);
          }
          50% {
            -webkit-transform: translate3d(-50%, -40%, 0) rotate(360deg);
          }
        }
 
        @keyframes wave-3 {
          0%, 100% {
            transform: translate3d(-50%, -50%, 0) rotate(90deg);
          }
          50% {
            transform: translate3d(-50%, -55%, 0) rotate(270deg);
          }
        }
        @-webkit-keyframes wave-3 {
          0%, 100% {
            -webkit-transform: translate3d(-50%, -50%, 0) rotate(90deg);
          }
          50% {
            -webkit-transform: translate3d(-50%, -55%, 0) rotate(270deg);
          }
        }
 
        .gradient-wave {
          position: absolute;
          width: 200%;
          height: 200%;
          top: 50%;
          left: 50%;
          border-radius: 40%;
          filter: blur(80px);
          /* Force GPU */
          transform: translate3d(0,0,0);
          -webkit-transform: translate3d(0,0,0);
        }
 
        .wave-1 {
          background: radial-gradient(circle, ${colors[0]}90 0%, ${colors[0]}50 30%, transparent 70%);
          animation: wave-1 ${animationDuration} ease-in-out infinite;
          -webkit-animation: wave-1 ${animationDuration} ease-in-out infinite;
        }
 
        .wave-2 {
          background: radial-gradient(circle, ${colors[1]}70 0%, ${colors[1]}40 30%, transparent 70%);
          animation: wave-2 ${animationDuration} ease-in-out infinite;
          -webkit-animation: wave-2 ${animationDuration} ease-in-out infinite;
          animation-delay: -${parseInt(animationDuration) / 3}s;
          -webkit-animation-delay: -${parseInt(animationDuration) / 3}s;
        }
 
        .wave-3 {
          background: radial-gradient(circle, ${colors[2] || colors[0]}60 0%, ${colors[2] || colors[0]}30 30%, transparent 70%);
          animation: wave-3 ${animationDuration} ease-in-out infinite;
          -webkit-animation: wave-3 ${animationDuration} ease-in-out infinite;
          animation-delay: -${parseInt(animationDuration) / 1.5}s;
          -webkit-animation-delay: -${parseInt(animationDuration) / 1.5}s;
        }

        @media (prefers-reduced-motion: reduce) {
          .gradient-wave {
            animation: none !important;
          }
        }
      `}</style>

      <div
        className="gradient-wave wave-1"
        style={{
          opacity: prefersReducedMotion ? opacity * 0.5 : opacity,
          willChange: prefersReducedMotion ? 'auto' : 'transform',
        }}
      />
      <div
        className="gradient-wave wave-2"
        style={{
          opacity: prefersReducedMotion ? opacity * 0.5 : opacity,
          willChange: prefersReducedMotion ? 'auto' : 'transform',
        }}
      />
      <div
        className="gradient-wave wave-3"
        style={{
          opacity: prefersReducedMotion ? opacity * 0.5 : opacity,
          willChange: prefersReducedMotion ? 'auto' : 'transform',
        }}
      />
    </div>
  );
};

export default GradientWaves;
