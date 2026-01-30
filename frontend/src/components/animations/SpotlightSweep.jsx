import React from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Spotlight Sweep Background Animation
 * Rotating spotlight beams
 * Gaming/streaming aesthetic
 */
const SpotlightSweep = ({
  color = '#E85002',
  opacity = 0.12,
  beamCount = 3,
  speed = 'medium',
}) => {
  const prefersReducedMotion = useReducedMotion();

  const speedMap = {
    slow: '40s',
    medium: '25s',
    fast: '15s',
  };

  const animationDuration = speedMap[speed] || speedMap.medium;

  const beams = Array.from({ length: beamCount }, (_, i) => ({
    id: i,
    delay: -(i * (parseInt(animationDuration) / beamCount)),
    rotation: i * (360 / beamCount),
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <style>{`
        @keyframes rotate-spotlight {
          0% {
            transform: translate3d(-50%, -50%, 0) rotate(0deg);
          }
          100% {
            transform: translate3d(-50%, -50%, 0) rotate(360deg);
          }
        }
        @-webkit-keyframes rotate-spotlight {
          0% {
            -webkit-transform: translate3d(-50%, -50%, 0) rotate(0deg);
          }
          100% {
            -webkit-transform: translate3d(-50%, -50%, 0) rotate(360deg);
          }
        }

        @keyframes pulse-beam {
          0%, 100% {
            opacity: var(--beam-opacity);
          }
          50% {
            opacity: calc(var(--beam-opacity) * 2);
          }
        }
        @-webkit-keyframes pulse-beam {
          0%, 100% {
            opacity: var(--beam-opacity);
          }
          50% {
            opacity: calc(var(--beam-opacity) * 2);
          }
        }

        .spotlight-container {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200%;
          height: 200%;
          animation: rotate-spotlight var(--duration) linear infinite;
          -webkit-animation: rotate-spotlight var(--duration) linear infinite;
          animation-delay: var(--delay);
          -webkit-animation-delay: var(--delay);
          will-change: transform;
        }

        .spotlight-beam {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 4px;
          height: 100%;
          transform-origin: top center;
          -webkit-transform-origin: top center;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            ${color} 15%,
            ${color} 50%,
            transparent 100%
          );
          filter: blur(30px);
          animation: pulse-beam 2s ease-in-out infinite;
          -webkit-animation: pulse-beam 2s ease-in-out infinite;
        }

        .spotlight-beam::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translate3d(-50%, 0, 0);
          -webkit-transform: translate3d(-50%, 0, 0);
          width: 150px;
          height: 100%;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            ${color}80 15%,
            ${color}80 50%,
            transparent 100%
          );
          filter: blur(60px);
        }

        @media (prefers-reduced-motion: reduce) {
          .spotlight-container {
            animation: none !important;
          }
          .spotlight-beam {
            animation: none !important;
          }
        }
      `}</style>

      {beams.map((beam) => (
        <div
          key={beam.id}
          className="spotlight-container"
          style={{
            '--duration': animationDuration,
            '--delay': `${beam.delay}s`,
            transform: prefersReducedMotion
              ? `translate(-50%, -50%) rotate(${beam.rotation}deg)`
              : undefined,
          }}
        >
          <div
            className="spotlight-beam"
            style={{
              '--beam-opacity': opacity,
              opacity: prefersReducedMotion ? opacity * 0.5 : undefined,
            }}
          />
        </div>
      ))}

      {/* Radial gradient overlay for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at center, transparent 0%, ${color}15 50%, transparent 100%)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default SpotlightSweep;
