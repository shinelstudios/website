/**
 * ParticleNetwork.jsx
 * 
 * About: Particle network background animation component
 * Purpose: Creates floating particles with connecting lines for dynamic visual effects
 * 
 * Cross-Device Compatibility:
 * - iOS Safari: Retina display support with devicePixelRatio scaling
 * - macOS Safari: High-DPI display optimization for Retina screens
 * - Android Chrome: Canvas willReadFrequently optimization, mobile particle count reduction
 * - Windows Browsers: Standard canvas rendering with performance optimizations
 * 
 * Accessibility: Respects prefers-reduced-motion user preference
 * Performance: RequestAnimationFrame with proper cleanup, IntersectionObserver for visibility,
 *              optimized canvas rendering, reduced particle count on mobile devices
 */
import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Particle Network Background Animation
 * Floating particles with connecting lines
 * Optimized for performance with requestAnimationFrame
 */
const ParticleNetwork = ({
    particleCount = 50,
    color = '#E85002',
    connectionDistance = 150,
    speed = 0.5,
    opacity = 0.3,
}) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const particlesRef = useRef([]);
    const prefersReducedMotion = useReducedMotion();
    const [isInView, setIsInView] = React.useState(true);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setIsInView(entry.isIntersecting),
            { threshold: 0.1 }
        );
        if (canvasRef.current) observer.observe(canvasRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Get 2D context with alpha and willReadFrequently for better performance
        // This is especially important for frequent pixel reads on mobile devices
        const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });

        // Support for high-DPI displays (Retina, etc.)
        // This ensures crisp rendering on iOS, macOS, and high-DPI Android devices
        const dpr = window.devicePixelRatio || 1;
        let width = canvas.offsetWidth;
        let height = canvas.offsetHeight;

        // Scale canvas for retina displays
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        const isMobile = window.innerWidth < 768;
        const actualCount = isMobile ? Math.min(particleCount, 25) : particleCount;

        // Handle resize
        const handleResize = () => {
            width = canvas.offsetWidth;
            height = canvas.offsetHeight;

            // Re-scale canvas for retina displays on resize
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.scale(dpr, dpr);

            initParticles();
        };

        window.addEventListener('resize', handleResize, { passive: true });

        // Particle class
        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * speed;
                this.vy = (Math.random() - 0.5) * speed;
                this.radius = Math.random() * 2 + 1;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // Bounce off edges
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;

                // Keep within bounds
                this.x = Math.max(0, Math.min(width, this.x));
                this.y = Math.max(0, Math.min(height, this.y));
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            }
        }

        // Initialize particles
        const initParticles = () => {
            particlesRef.current = [];
            for (let i = 0; i < actualCount; i++) {
                particlesRef.current.push(new Particle());
            }
        };

        // Draw connections between nearby particles
        const drawConnections = () => {
            const particles = particlesRef.current;
            const distSq = connectionDistance * connectionDistance;

            ctx.beginPath();
            ctx.lineWidth = 0.5;

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dSq = dx * dx + dy * dy;

                    if (dSq < distSq) {
                        const distance = Math.sqrt(dSq);
                        const opacityValue = (1 - distance / connectionDistance) * opacity;
                        ctx.strokeStyle = `${color}${Math.floor(opacityValue * 255).toString(16).padStart(2, '0')}`;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                    }
                }
            }
            ctx.stroke();
        };

        // Animation loop
        const animate = () => {
            if (!isInView) {
                animationRef.current = requestAnimationFrame(animate);
                return;
            }

            ctx.clearRect(0, 0, width, height);

            particlesRef.current.forEach(particle => {
                particle.update();
                particle.draw();
            });

            drawConnections();

            if (!prefersReducedMotion) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        // Start animation
        initParticles();

        if (prefersReducedMotion) {
            // Draw static frame for users who prefer reduced motion
            particlesRef.current.forEach(particle => particle.draw());
            drawConnections();
        } else {
            animate();
        }

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [particleCount, color, connectionDistance, speed, opacity, prefersReducedMotion, isInView]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: opacity, willChange: 'transform' }}
        />
    );
};

export default ParticleNetwork;
