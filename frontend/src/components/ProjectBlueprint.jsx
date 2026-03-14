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
        <div className="relative group rounded-[32px] overflow-hidden bg-black border border-white/10 shadow-2xl">
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 z-20 p-6 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
                        {title}
                    </span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">{subtitle}</h3>
            </div>

            {/* Main Visual */}
            <div className="relative aspect-video overflow-hidden">
                <img
                    src={image}
                    alt="Project Blueprint"
                    className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                />

                {/* Blueprint Grid Overlay */}
                <div className="absolute inset-0 z-10 pointer-events-none opacity-20">
                    <div className="w-full h-full" style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(232, 80, 2, 0.2) 1px, transparent 0)',
                        backgroundSize: '24px 24px'
                    }} />
                </div>

                {/* Hotspots */}
                {blueprints.map((bp, idx) => (
                    <div
                        key={idx}
                        className="absolute z-30"
                        style={{ left: `${bp.x}%`, top: `${bp.y}%` }}
                    >
                        <motion.button
                            onMouseEnter={() => setActiveBlueprint(bp)}
                            onMouseLeave={() => setActiveBlueprint(null)}
                            onClick={() => setActiveBlueprint(activeBlueprint === bp ? null : bp)}
                            className="relative flex items-center justify-center w-8 h-8 rounded-full bg-orange-600 text-white shadow-lg border-2 border-white/20"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5 + idx * 0.1, type: 'spring' }}
                            whileHover={{ scale: 1.2, backgroundColor: '#ff6b00' }}
                        >
                            {bp.icon || <Target size={14} />}

                            {/* Pulse Effect */}
                            <div className="absolute inset-0 rounded-full animate-ping bg-orange-500/50" />
                        </motion.button>

                        {/* Tooltip */}
                        <AnimatePresence>
                            {activeBlueprint === bp && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: -10, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 p-4 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-none"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-500">
                                            {bp.icon || <Info size={14} />}
                                        </div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-white">
                                            {bp.label}
                                        </h4>
                                    </div>
                                    <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                                        {bp.description}
                                    </p>

                                    {/* Link to Service (Conversion) */}
                                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-[9px] font-bold text-orange-500/80 uppercase">Impact: {bp.impact || 'High'}</span>
                                        <div className="flex items-center gap-1 text-[8px] font-black text-white/40 uppercase tracking-tighter">
                                            Learn More <Play size={8} />
                                        </div>
                                    </div>

                                    {/* Tooltip Arrow */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black/90" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {/* Bottom Footer Overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-gray-800" />
                        ))}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">Trusted by 150+ Creators</span>
                </div>
                <button className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2">
                    <Maximize2 size={12} /> View Full Breakdown
                </button>
            </div>
        </div>
    );
};

export default ProjectBlueprint;
