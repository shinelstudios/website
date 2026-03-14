import React, { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Sparkles, Wand2, Zap, Search } from 'lucide-react';
import { COLORS } from '../config/constants';

/**
 * ServiceLens Component
 * Provides a magnifying-glass / circular lens effect to compare Raw vs Edited media.
 */
const ServiceLens = ({
    before,
    after,
    lensSize = 250,
    title = "The Shinel Touch",
    subtitle = "Drag the lens to see the transformation"
}) => {
    const containerRef = useRef(null);
    const [isHovering, setIsHovering] = useState(false);

    // Motion values for smooth lens tracking
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Spring physics for "organic" movement
    const smoothX = useSpring(mouseX, { stiffness: 300, damping: 30 });
    const smoothY = useSpring(mouseY, { stiffness: 300, damping: 30 });

    const handleMouseMove = useCallback((e) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
    }, [mouseX, mouseY]);

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-video rounded-[40px] overflow-hidden bg-black cursor-none select-none border border-white/10 shadow-2xl"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleMouseMove}
        >
            {/* Base Image (BEFORE) */}
            <div className="absolute inset-0 z-0">
                <img
                    src={before}
                    alt="Before"
                    className="w-full h-full object-cover grayscale-[0.5]"
                />
                {/* Visual Label */}
                <div className="absolute top-8 left-8 z-10 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60">
                    Original Footage (RAW)
                </div>
            </div>

            {/* Lens (AFTER) - Uses CSS clip-path for performance */}
            <motion.div
                className="absolute inset-0 z-20 pointer-events-none"
                style={{
                    clipPath: useTransform(
                        [smoothX, smoothY],
                        ([x, y]) => `circle(${isHovering ? lensSize / 2 : 0}px at ${x}px ${y}px)`
                    )
                }}
            >
                <img
                    src={after}
                    alt="After"
                    className="w-full h-full object-cover scale-100" // Slight zoom could be cool, but kept simple
                />

                {/* Visual Label inside lens? No, it looks messy. Just show the boundary. */}
            </motion.div>

            {/* Lens UI Boundary / Ring */}
            <motion.div
                className="absolute z-30 pointer-events-none"
                style={{
                    left: smoothX,
                    top: smoothY,
                    width: lensSize,
                    height: lensSize,
                    x: '-50%',
                    y: '-50%',
                    opacity: isHovering ? 1 : 0,
                    scale: isHovering ? 1 : 0.5
                }}
            >
                {/* Ring with Glow */}
                <div className="w-full h-full rounded-full border-2 border-orange-500 shadow-[0_0_30px_rgba(232,80,2,0.5)] flex items-center justify-center relative">
                    {/* Tiny Icon inside lens indicator */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-600 rounded-full flex items-center gap-1.5 shadow-xl">
                        <Wand2 size={10} className="text-white" />
                        <span className="text-[9px] font-black uppercase text-white">Enhanced</span>
                    </div>

                    {/* Corner accents for the circular lens */}
                    <div className="absolute top-0 right-0 p-2 text-orange-500 animate-pulse">
                        <Sparkles size={14} />
                    </div>
                </div>
            </motion.div>

            {/* Fixed Controls Overlay */}
            <div className="absolute bottom-10 left-10 right-10 z-40 flex items-center justify-between pointer-events-none">
                <div className="flex flex-col">
                    <h4 className="text-2xl font-black text-white italic tracking-tighter mb-1 uppercase">
                        {title}
                    </h4>
                    <p className="text-xs font-semibold text-gray-400 capitalize">
                        {subtitle}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 border border-orange-500/30 rounded-2xl">
                        <Zap size={14} className="text-orange-500" />
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Live Demo</span>
                    </div>
                </div>
            </div>

            {/* Instruction Overlay (if not hovering) */}
            <motion.div
                className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovering ? 0 : 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <Search size={24} className="text-white/60" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest text-white/80">Hover to Reveal Quality</p>
                </div>
            </motion.div>
        </div>
    );
};

export default ServiceLens;
