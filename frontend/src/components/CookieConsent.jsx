import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Check } from 'lucide-react';

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('shinel_cookies_accepted');
        if (!consent) {
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('shinel_cookies_accepted', 'true');
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-[200]"
                >
                    <div className="relative overflow-hidden rounded-[32px] bg-black/80 backdrop-blur-2xl border border-white/10 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full blur-[40px] -mr-16 -mt-16" />

                        <div className="relative z-10">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
                                    <Cookie size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black tracking-tight text-white mb-1">Cookie Excellence.</h3>
                                    <p className="text-gray-400 text-sm font-medium leading-relaxed">
                                        We use cookies to enhance your experience, analyze site traffic, and optimize our engine performance.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleAccept}
                                    className="flex-grow flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg shadow-orange-900/20"
                                >
                                    <Check size={16} strokeWidth={3} />
                                    Accept All
                                </button>
                                <button
                                    onClick={() => setIsVisible(false)}
                                    className="p-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CookieConsent;
