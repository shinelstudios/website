import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Target, Zap, Waves, Wand2, Search, Play, Maximize2 } from 'lucide-react';
import { COLORS, SHADOWS, TYPOGRAPHY } from '../config/constants';

/**
 * ProjectBlueprint Component
 * Interactive image/video overlay with hotspots to explain techniques.
 */
const ProjectBlueprint = ({
    image,
    blueprints = [],
    title = "Technical Blueprint",
    subtitle = "Hover over markers to see our secret sauce"
}) => {
    const [activeBlueprint, setActiveBlueprint] = useState(null);

    return (
        <div className="relative group rounded-[32px] bg-black border border-white/10 shadow-2xl">
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 z-40 p-6 rounded-t-[32px] bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(232,80,2,0.8)]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
                        {title}
                    </span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase italic">{subtitle}</h3>
            </div>

            {/* Main Visual Container - Handles rounded corners and main image */}
            <div className="relative aspect-video rounded-[32px] overflow-hidden">
                <img
                    src={image}
                    alt="Project Blueprint"
                    className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                />

                {/* Blueprint Grid Overlay */}
                <div className="absolute inset-0 z-10 pointer-events-none opacity-20">
                    <div className="w-full h-full" style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(232, 80, 2, 0.2) 1px, transparent 0)',
                        backgroundSize: '24px 24px'
                    }} />
                </div>
            </div>

            {/* Hotspots Layer - Separate from overflow-hidden container */}
            <div className="absolute inset-0 z-30 pointer-events-none">
                {blueprints.map((bp, idx) => {
                    const isTopHalf = bp.y < 40;
                    const isActive = activeBlueprint === bp;

                    return (
                        <div
                            key={idx}
                            className="absolute pointer-events-auto"
                            style={{ left: `${bp.x}%`, top: `${bp.y}%` }}
                        >
                            <motion.button
                                onMouseEnter={() => setActiveBlueprint(bp)}
                                onMouseLeave={() => setActiveBlueprint(null)}
                                onClick={() => setActiveBlueprint(isActive ? null : bp)}
                                className="relative flex items-center justify-center w-9 h-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-600 text-white shadow-xl border-2 border-white/30 backdrop-blur-sm"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5 + idx * 0.1, type: 'spring' }}
                                whileHover={{ scale: 1.1, backgroundColor: '#ff6b00' }}
                            >
                                {bp.icon || <Target size={16} />}

                                {/* Pulse Effect */}
                                <div className="absolute inset-0 rounded-full animate-ping bg-orange-500/40" />
                            </motion.button>

                            {/* Tooltip */}
                            <AnimatePresence>
                                {isActive && (
                                    <motion.div
                                        initial={{ opacity: 0, y: isTopHalf ? -10 : 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: isTopHalf ? -10 : 10, scale: 0.95 }}
                                        className={`absolute left-1/2 -translate-x-1/2 z-50 w-72 p-5 rounded-[24px] bg-black/95 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${isTopHalf ? 'top-full mt-4' : 'bottom-full mb-4'}`}
                                    >
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="p-2 rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20 shrink-0">
                                                {bp.icon || <Info size={16} />}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-black uppercase tracking-tight text-white leading-tight mb-1">
                                                    {bp.label}
                                                </h4>
                                                <div className="h-0.5 w-8 bg-orange-500 rounded-full" />
                                            </div>
                                        </div>
                                        <p className="text-[12px] text-gray-300 leading-relaxed font-medium">
                                            {bp.description}
                                        </p>

                                        {/* Meta Stats */}
                                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[9px] font-black text-orange-500 uppercase tracking-widest">
                                                    Impact: {bp.impact || 'High'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-white/50 uppercase tracking-tight group/link cursor-pointer hover:text-white transition-colors">
                                                Learn More <Play size={10} className="fill-current" />
                                            </div>
                                        </div>

                                        {/* Tooltip Arrow */}
                                        <div className={`absolute left-1/2 -translate-x-1/2 border-8 border-transparent ${isTopHalf ? 'bottom-full border-b-black/95' : 'top-full border-t-black/95'}`} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Footer Overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-40 p-6 rounded-b-[32px] bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-none">
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-9 h-9 rounded-full border-2 border-black bg-gradient-to-br from-gray-700 to-gray-900 shadow-lg" />
                        ))}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black text-white uppercase tracking-wider">Trusted by 150+ Creators</span>
                        <div className="flex gap-0.5 mt-0.5">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="w-2 h-2 rounded-full bg-orange-500/50" />
                            ))}
                        </div>
                    </div>
                </div>
                <button className="pointer-events-auto px-6 py-2.5 rounded-full bg-orange-600 hover:bg-orange-500 border border-white/10 text-[11px] font-black uppercase tracking-[0.1em] text-white shadow-xl shadow-orange-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap">
                    <Maximize2 size={14} /> View Full Breakdown
                </button>
            </div>
        </div>
    );
};

export default ProjectBlueprint;
