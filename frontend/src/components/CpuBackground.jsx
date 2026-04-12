import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const CircuitPath = ({ d, duration = 2, delay = 0, color = "#ea580c" }) => (
    <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 1, 0.5] }}
        transition={{
            duration: duration,
            delay: delay,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
        }}
    />
);

const FloatingParticle = ({ x, y, duration = 3 }) => (
    <motion.div
        className="absolute w-1 h-1 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(234,88,12,0.8)]"
        initial={{ x, y, opacity: 0 }}
        animate={{
            y: [y, y - 40, y],
            opacity: [0, 1, 0],
        }}
        transition={{
            duration: duration,
            repeat: Infinity,
            ease: "linear",
        }}
    />
);

export default function CpuBackground() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 overflow-hidden bg-black pointer-events-none z-0">
            {/* Grid Overlay */}
            <div
                className="absolute inset-0 z-0 opacity-10"
                style={{
                    backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
                    backgroundSize: "40px 40px"
                }}
            />

            {/* Radial Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] z-10" />

            {/* Hero Circuit Lines - Left */}
            <svg className="absolute top-0 left-0 w-full h-full z-0 opacity-20">
                <CircuitPath d="M0,100 L100,100 L150,150 L300,150" duration={4} delay={0} />
                <CircuitPath d="M0,200 L150,200 L200,250 L400,250" duration={5} delay={1} />
                <CircuitPath d="M50,0 L50,100" duration={3} delay={0.5} />
                <CircuitPath d="M150,0 L150,80 L200,130" duration={4} delay={1.5} />
            </svg>

            {/* Hero Circuit Lines - Right */}
            <svg className="absolute top-0 right-0 w-full h-full z-0 opacity-20" style={{ transform: 'scaleX(-1)' }}>
                <CircuitPath d="M0,150 L120,150 L180,210 L350,210" duration={6} delay={0.5} />
                <CircuitPath d="M0,300 L100,300 L150,350 L450,350" duration={7} delay={2} />
                <CircuitPath d="M100,0 L100,120" duration={4} delay={1} />
            </svg>

            {/* Hero Circuit Lines - Bottom */}
            <svg className="absolute bottom-0 left-0 w-full h-full z-0 opacity-20" style={{ transform: 'scaleY(-1)' }}>
                <CircuitPath d="M200,0 L200,150 L250,200 L500,200" duration={5} delay={1} />
                <CircuitPath d="M600,0 L600,100 L650,150 L800,150" duration={6} delay={2.5} />
            </svg>

            {/* Glowing Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/5 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />

            {/* Digital Noise / Scanline (Optional, subtle) */}
            <div className="absolute inset-0 z-20 opacity-[0.02] pointer-events-none mix-blend-overlay"
                style={{
                    backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')"
                }}
            />
        </div>
    );
}
