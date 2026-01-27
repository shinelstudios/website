import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Grid Matrix Background Animation
 * Animated grid with pulsing nodes
 * Tech/AI aesthetic
 */
const GridMatrix = ({
    color = '#E85002',
    opacity = 0.15,
    gridSize = 50,
    nodeCount = 15,
}) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const nodesRef = useRef([]);
    const prefersReducedMotion = useReducedMotion();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let width = canvas.width = canvas.offsetWidth;
        let height = canvas.height = canvas.offsetHeight;

        const handleResize = () => {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
            initNodes();
        };

        window.addEventListener('resize', handleResize);

        // Node class
        class Node {
            constructor() {
                this.x = Math.floor(Math.random() * (width / gridSize)) * gridSize;
                this.y = Math.floor(Math.random() * (height / gridSize)) * gridSize;
                this.pulse = Math.random() * Math.PI * 2;
                this.pulseSpeed = 0.02 + Math.random() * 0.03;
            }

            update() {
                this.pulse += this.pulseSpeed;
            }

            draw() {
                const pulseValue = (Math.sin(this.pulse) + 1) / 2;
                const radius = 3 + pulseValue * 4;
                const alpha = 0.3 + pulseValue * 0.7;

                // Glow
                ctx.beginPath();
                ctx.arc(this.x, this.y, radius * 2, 0, Math.PI * 2);
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius * 2);
                gradient.addColorStop(0, `${color}${Math.floor(alpha * 100).toString(16).padStart(2, '0')}`);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.fill();

                // Core
                ctx.beginPath();
                ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            }
        }

        const initNodes = () => {
            nodesRef.current = [];
            for (let i = 0; i < nodeCount; i++) {
                nodesRef.current.push(new Node());
            }
        };

        const drawGrid = () => {
            ctx.strokeStyle = `${color}20`;
            ctx.lineWidth = 1;

            // Vertical lines
            for (let x = 0; x < width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }

            // Horizontal lines
            for (let y = 0; y < height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Draw grid
            drawGrid();

            // Update and draw nodes
            nodesRef.current.forEach(node => {
                node.update();
                node.draw();
            });

            if (!prefersReducedMotion) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        initNodes();

        if (prefersReducedMotion) {
            // Draw static frame
            drawGrid();
            nodesRef.current.forEach(node => node.draw());
        } else {
            animate();
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [color, gridSize, nodeCount, prefersReducedMotion]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: opacity }}
        />
    );
};

export default GridMatrix;
