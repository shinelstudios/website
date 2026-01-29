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

        const ctx = canvas.getContext('2d', { alpha: true });
        let width = canvas.width = canvas.offsetWidth;
        let height = canvas.height = canvas.offsetHeight;

        const isMobile = window.innerWidth < 768;
        const actualCount = isMobile ? Math.min(particleCount, 25) : particleCount;

        // Handle resize
        const handleResize = () => {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
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
            // Draw static frame
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
