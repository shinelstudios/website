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
        @keyframes float-up {
          0% {
            transform: translate3d(0, 100vh, 0) scale(0.8);
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
            opacity: 0;
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            filter: blur(60px) brightness(1.2);
          }
          50% {
            filter: blur(80px) brightness(1.6);
          }
        }

        .floating-orb {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, ${color} 0%, ${color}CC 30%, ${color}66 60%, transparent 80%);
          animation: float-up var(--duration) ease-in-out infinite,
                     pulse-glow 3s ease-in-out infinite;
          animation-delay: var(--delay);
          will-change: transform, opacity;
          transform: translate3d(0, 0, 0);
        }

        @media (prefers-reduced-motion: reduce) {
          .floating-orb {
            animation: none !important;
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
