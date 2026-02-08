import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

/**
 * Galaxy Hero Animation - Cosmic atmosphere
 * Features: Nebula clouds, star clusters, stardust, galaxy spirals
 */

const FloatingServiceBubbles = ({ className = "" }) => {
    const containerRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { width } = containerRef.current.getBoundingClientRect();
                setIsMobile(width < 768);
            }
        };

        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    // Star clusters - dense groups of stars
    const starCount = isMobile ? 50 : 120;
    const stars = Array.from({ length: starCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 0.5,
        delay: Math.random() * 5,
        duration: Math.random() * 4 + 2,
        brightness: Math.random()
    }));

    // Stardust particles - tiny glowing specks
    const dustCount = isMobile ? 30 : 80;
    const stardust = Array.from({ length: dustCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1 + 0.5,
        delay: Math.random() * 3
    }));

    return (
        <div
            ref={containerRef}
            className={`absolute inset-0 overflow-hidden ${className}`}
            style={{ zIndex: 1, pointerEvents: 'none' }}
        >
            {/* Nebula Clouds - Colorful cosmic gas */}
            <NebulaCloud index={0} position={{ right: '10%', top: '20%' }} size={600} color="orange" />
            <NebulaCloud index={1} position={{ right: '5%', top: '60%' }} size={500} color="red" />
            {!isMobile && <NebulaCloud index={2} position={{ right: '20%', top: '40%' }} size={450} color="amber" />}

            {/* Galaxy Spiral - Rotating cosmic structure */}
            {!isMobile && <GalaxySpiral />}

            {/* Star Clusters - Dense groups of twinkling stars */}
            {stars.map((star) => (
                <TwinklingStar key={star.id} star={star} />
            ))}

            {/* Stardust - Tiny glowing particles */}
            {stardust.map((dust) => (
                <StardustParticle key={dust.id} dust={dust} />
            ))}

            {/* Shooting Stars - Cosmic streaks */}
            <ShootingStar delay={3} />
            <ShootingStar delay={10} />
            {!isMobile && <ShootingStar delay={18} />}

            {/* Cosmic Glow - Ambient light */}
            <CosmicGlow />
        </div>
    );
};

// Nebula Cloud - Colorful cosmic gas clouds
const NebulaCloud = ({ index, position, size, color }) => {
    const colors = {
        orange: 'radial-gradient(ellipse, rgba(232, 80, 2, 0.15), rgba(241, 96, 1, 0.08), transparent 70%)',
        red: 'radial-gradient(ellipse, rgba(193, 8, 1, 0.12), rgba(232, 80, 2, 0.06), transparent 70%)',
        amber: 'radial-gradient(ellipse, rgba(255, 133, 52, 0.1), rgba(241, 96, 1, 0.05), transparent 70%)'
    };

    return (
        <motion.div
            className="absolute pointer-events-none"
            style={{
                right: position.right,
                top: position.top,
                width: size,
                height: size * 0.7, // Ellipse shape
                background: colors[color],
                filter: 'blur(80px)',
                zIndex: 80,
                borderRadius: '50%'
            }}
            animate={{
                scale: [1, 1.4, 1],
                rotate: [0, 10, 0],
                x: [0, 50, 0],
                y: [0, -60, 0],
                opacity: [0.4, 0.7, 0.4]
            }}
            transition={{
                duration: 30 + index * 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 3
            }}
        />
    );
};

// Galaxy Spiral - Rotating cosmic structure
const GalaxySpiral = () => {
    return (
        <motion.div
            className="absolute pointer-events-none"
            style={{
                right: '12%',
                top: '35%',
                width: 400,
                height: 400,
                zIndex: 82
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        >
            {/* Spiral arms */}
            {[0, 1, 2].map((arm) => (
                <motion.div
                    key={arm}
                    className="absolute"
                    style={{
                        left: '50%',
                        top: '50%',
                        width: '100%',
                        height: 2,
                        background: 'linear-gradient(90deg, rgba(232, 80, 2, 0.3), rgba(232, 80, 2, 0.1), transparent)',
                        transformOrigin: 'left center',
                        rotate: arm * 120,
                        filter: 'blur(3px)'
                    }}
                    animate={{
                        opacity: [0.3, 0.6, 0.3],
                        scaleX: [0.8, 1, 0.8]
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        delay: arm * 2,
                        ease: "easeInOut"
                    }}
                />
            ))}
        </motion.div>
    );
};

// Twinkling Star - Individual stars with varied brightness
const TwinklingStar = ({ star }) => {
    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size,
                height: star.size,
                background: star.brightness > 0.7 ? '#FFF' : '#E85002',
                boxShadow: `0 0 ${star.size * 3}px ${star.brightness > 0.7 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(232, 80, 2, 0.6)'}`,
                zIndex: 85
            }}
            animate={{
                opacity: [0.2, star.brightness, 0.2],
                scale: [1, 1.8, 1]
            }}
            transition={{
                duration: star.duration,
                repeat: Infinity,
                delay: star.delay,
                ease: "easeInOut"
            }}
        />
    );
};

// Stardust Particle - Tiny glowing specks
const StardustParticle = ({ dust }) => {
    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                left: `${dust.x}%`,
                top: `${dust.y}%`,
                width: dust.size,
                height: dust.size,
                background: 'rgba(255, 133, 52, 0.6)',
                boxShadow: '0 0 2px rgba(255, 133, 52, 0.8)',
                zIndex: 84
            }}
            animate={{
                opacity: [0.3, 0.8, 0.3],
                x: [0, Math.random() * 20 - 10],
                y: [0, Math.random() * 20 - 10]
            }}
            transition={{
                duration: 6,
                repeat: Infinity,
                delay: dust.delay,
                ease: "easeInOut"
            }}
        />
    );
};

// Shooting Star - Cosmic streak
const ShootingStar = ({ delay }) => {
    const startX = Math.random() * 40 + 60;
    const startY = Math.random() * 50;

    return (
        <motion.div
            className="absolute"
            style={{
                left: `${startX}%`,
                top: `${startY}%`,
                width: 150,
                height: 3,
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), rgba(232, 80, 2, 0.6), transparent)',
                filter: 'blur(1.5px)',
                transformOrigin: 'left center',
                zIndex: 90
            }}
            initial={{ opacity: 0, x: 0, y: 0, rotate: -45 }}
            animate={{
                opacity: [0, 1, 0],
                x: [-300, -600],
                y: [0, 300]
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                delay: delay,
                repeatDelay: 12,
                ease: "easeIn"
            }}
        />
    );
};

// Cosmic Glow - Ambient background light
const CosmicGlow = () => {
    return (
        <motion.div
            className="absolute pointer-events-none"
            style={{
                right: '0%',
                top: '0%',
                width: '60%',
                height: '100%',
                background: 'radial-gradient(ellipse at 70% 50%, rgba(232, 80, 2, 0.08), transparent 60%)',
                zIndex: 79
            }}
            animate={{
                opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        />
    );
};

export default FloatingServiceBubbles;
