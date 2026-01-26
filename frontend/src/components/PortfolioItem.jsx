import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { LazyImage } from "./ProgressiveImage";
import { ExternalLink, Play, ArrowRight } from "lucide-react";

/**
 * PortfolioItem Component
 * Features Magnetic Hover Effect & Glassmorphism
 */
const PortfolioItem = ({ project, index }) => {
    const cardRef = useRef(null);

    // Magnetic effect values
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth springs for magnetic motion
    const springConfig = { damping: 20, stiffness: 150, mass: 0.5 };
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), springConfig);
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springConfig);

    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
        setIsHovered(false);
    };

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.05 }}
            style={{
                perspective: 1000,
                rotateX,
                rotateY,
                willChange: "transform",
            }}
            className="relative group aspect-[16/10] sm:aspect-[16/9] rounded-3xl overflow-hidden bg-black border border-white/10"
        >
            {/* Background Image with Lazy Loading */}
            <div className="absolute inset-0 z-0">
                <LazyImage
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />
            </div>

            {/* Glassmorphism Badge */}
            <div className="absolute top-4 left-4 z-10">
                <div className="px-3 py-1 rounded-full backdrop-blur-md bg-white/10 border border-white/20 text-[10px] uppercase tracking-widest font-bold text-white">
                    {project.category}
                </div>
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-0 z-10 p-6 flex flex-col justify-end">
                <div className="overflow-hidden">
                    <motion.h3
                        animate={{ y: isHovered ? 0 : 5 }}
                        className="text-xl sm:text-2xl font-black text-white mb-2"
                    >
                        {project.title}
                    </motion.h3>
                </div>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
                    className="text-sm text-gray-300 line-clamp-2 mb-4"
                >
                    {project.description}
                </motion.p>

                <div className="flex items-center gap-4">
                    <Link
                        to={project.link || "#"}
                        className="z-20"
                    >
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold"
                        >
                            {project.kind === "video" ? <Play size={14} fill="currentColor" /> : <ExternalLink size={14} />}
                            {project.kind === "video" ? "Watch Showreel" : "View Project"}
                        </motion.div>
                    </Link>

                    <motion.div
                        animate={{ x: isHovered ? 5 : 0 }}
                        className="text-white/50 group-hover:text-orange-400 transition-colors"
                    >
                        <ArrowRight size={20} />
                    </motion.div>
                </div>
            </div>

            {/* Hover Highlight Glow */}
            <motion.div
                className="absolute inset-0 z-0 pointer-events-none"
                animate={{
                    background: isHovered
                        ? "radial-gradient(circle at center, rgba(232,80,2,0.15) 0%, transparent 70%)"
                        : "radial-gradient(circle at center, transparent 0%, transparent 70%)"
                }}
            />
        </motion.div>
    );
};

export default PortfolioItem;
