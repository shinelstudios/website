import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FESTIVAL_DATABASE } from '../../config/constants';

/**
 * Automate Festival Offers Rulebook:
 * 1. Max 30% discount ever.
 * 2. National (India) festivals first, then famous international.
 * 3. Shows for a specific window (e.g., 3 days before to 1 day after).
 * 4. countdown included.
 */

const FestivalOfferBanner = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [timeLeft, setTimeLeft] = useState('');
    const navigate = useNavigate();

    const activeOffer = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();

        return FESTIVAL_DATABASE.find(fest => {
            const start = new Date(currentYear, fest.month, fest.day - 1); // 1 day before
            const end = new Date(currentYear, fest.month, fest.day + fest.durationDays);
            return now >= start && now <= end;
        });
    }, []);

    useEffect(() => {
        if (!activeOffer) return;

        const timer = setInterval(() => {
            const now = new Date();
            const end = new Date(now.getFullYear(), activeOffer.month, activeOffer.day + activeOffer.durationDays);
            const diff = end - now;

            if (diff <= 0) {
                setIsVisible(false);
                clearInterval(timer);
                return;
            }

            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / 1000 / 60) % 60);
            const s = Math.floor((diff / 1000) % 60);

            setTimeLeft(`${d > 0 ? d + 'd ' : ''}${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
        }, 1000);

        return () => clearInterval(timer);
    }, [activeOffer]);

    const handleClaim = () => {
        // Now redirects to pricing instead of scrolling
        navigate('/pricing');
    };

    if (!activeOffer || !isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="relative z-[70] border-b border-black/5"
                style={{ background: activeOffer.theme }}
            >
                <div className="container mx-auto px-4 py-2">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Offer Info */}
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={16} className="animate-bounce" style={{ color: activeOffer.badgeColor }} />
                                    <span className="font-black text-xs md:text-sm uppercase tracking-tighter" style={{ color: activeOffer.textColor }}>
                                        {activeOffer.title}
                                    </span>
                                </div>
                                <h4 className="text-lg md:text-xl font-black italic" style={{ color: activeOffer.textColor }}>
                                    FLAT {activeOffer.discount}% OFF <span className="text-xs font-medium not-italic opacity-70">on all services</span>
                                </h4>
                            </div>
                        </div>

                        {/* Countdown */}
                        <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/5 border border-black/10">
                            <Clock size={14} style={{ color: activeOffer.textColor }} />
                            <span className="text-xs font-bold font-mono" style={{ color: activeOffer.textColor }}>
                                {timeLeft}
                            </span>
                            <span className="text-[10px] uppercase font-bold opacity-50" style={{ color: activeOffer.textColor }}>Remaining</span>
                        </div>

                        {/* Action */}
                        <div className="flex items-center gap-3">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleClaim}
                                className="px-6 py-2 rounded-full bg-black text-white text-sm font-black flex items-center gap-2 shadow-2xl"
                            >
                                Claim Offer <ArrowRight size={16} />
                            </motion.button>
                            <button
                                onClick={() => setIsVisible(false)}
                                className="p-1 hover:bg-black/10 rounded-full transition-colors"
                            >
                                <X size={20} style={{ color: activeOffer.textColor }} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Countdown Row */}
                <div className="lg:hidden w-full py-1 bg-black/5 flex justify-center items-center gap-2">
                    <span className="text-[9px] font-bold uppercase opacity-50" style={{ color: activeOffer.textColor }}>Ends in:</span>
                    <span className="text-[10px] font-bold font-mono" style={{ color: activeOffer.textColor }}>{timeLeft}</span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default FestivalOfferBanner;
