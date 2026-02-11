import React, { useState, useEffect, useRef, useMemo } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Import logos for reliable loading via Vite
import logoLight from "../assets/logo_light.png";

const PremiumPlayer = ({ videoId, thumbnail, autoplay = false, className = "" }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [progress, setProgress] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const playerRef = useRef(null);
    const containerRef = useRef(null);

    // Unique ID for this specific player instance to prevent API cross-talk
    const instanceId = useMemo(() => `yt-player-${videoId}-${Math.random().toString(36).substr(2, 9)}`, [videoId]);

    // Initialize YouTube API and Player Instance
    useEffect(() => {
        let isCancelled = false;
        let initTimer = null;

        const loadAPI = () => {
            if (window.YT && window.YT.Player) return;
            if (window.ytScriptInjected) return; // SINGLETON CHECK

            window.ytScriptInjected = true;
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName("script")[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        };

        const checkAPIReady = () => {
            if (isCancelled) return;
            if (window.YT && window.YT.Player) {
                // Debounce initialization to prevent race conditions on rapid hover
                initTimer = setTimeout(() => {
                    if (!isCancelled) initPlayer();
                }, 100);
            } else {
                const existing = window.onYouTubeIframeAPIReady;
                window.onYouTubeIframeAPIReady = () => {
                    if (existing) existing();
                    checkAPIReady();
                };
                // Fallback poll
                setTimeout(checkAPIReady, 500);
            }
        };

        const initPlayer = () => {
            if (isCancelled || !window.YT || !window.YT.Player) return;

            // Double-check DOM existence
            const target = document.getElementById(instanceId);
            if (!target) return;

            // Destroy existing if any (safety)
            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch (e) { }
            }

            playerRef.current = new window.YT.Player(instanceId, {
                height: "100%",
                width: "100%",
                videoId: videoId,
                playerVars: {
                    autoplay: autoplay ? 1 : 0,
                    mute: 1,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    iv_load_policy: 3,
                    showinfo: 0,
                    disablekb: 1,
                    enablejsapi: 1,
                    origin: window.location.origin
                },
                events: {
                    onReady: (e) => {
                        if (isCancelled) return;
                        if (autoplay) {
                            e.target.mute();
                            e.target.playVideo();
                        }
                    },
                    onStateChange: (event) => {
                        if (isCancelled) return;
                        if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
                        if (event.data === window.YT.PlayerState.PAUSED) setIsPlaying(false);
                        if (event.data === window.YT.PlayerState.ENDED) setIsPlaying(false);
                    }
                }
            });
        };

        loadAPI();
        checkAPIReady();

        return () => {
            isCancelled = true;
            if (initTimer) clearTimeout(initTimer);
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                try { playerRef.current.destroy(); } catch (e) { }
            }
        };
    }, [videoId, instanceId]);

    const togglePlay = (e) => {
        e?.stopPropagation();
        if (!playerRef.current) return;
        if (isPlaying) playerRef.current.pauseVideo();
        else playerRef.current.playVideo();
    };

    const toggleMute = (e) => {
        e?.stopPropagation();
        if (!playerRef.current) return;
        if (isMuted) {
            playerRef.current.unMute();
            setIsMuted(false);
        } else {
            playerRef.current.mute();
            setIsMuted(true);
        }
    };

    // Tracking Progress
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current && isPlaying && typeof playerRef.current.getCurrentTime === 'function') {
                const current = playerRef.current.getCurrentTime();
                const duration = playerRef.current.getDuration();
                if (duration > 0) setProgress((current / duration) * 100);
            }
        }, 500);
        return () => clearInterval(interval);
    }, [isPlaying]);

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full overflow-hidden bg-black group ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* 
               ULTIMATE CINEMA FILL STRATEGY: 
               The iframe is sized to be significantly larger than the container 
               with negative offsets and min-dimensions to guarantee it covers 
               the entire card area, effectively emulating "object-fit: cover".
            */}
            <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
                style={{ overflow: 'hidden' }}
            >
                <div
                    className="relative w-[300%] h-[300%] flex-shrink-0"
                    style={{
                        minWidth: '100%',
                        minHeight: '100%',
                        aspectRatio: '16/9'
                    }}
                >
                    <div id={instanceId} className="w-full h-full" />
                </div>
            </div>

            {/* Branded Overlay (Shinel Logo) - Top Right */}
            <div className="absolute top-4 right-4 z-40 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                <img src={logoLight} alt="" className="h-[12px] md:h-[16px] w-auto object-contain brightness-110 drop-shadow-lg" />
            </div>

            {/* Premium Player Header Tag - Top Left */}
            <div className="absolute top-4 left-4 z-40 px-2 py-0.5 rounded bg-black/40 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <span className="text-[7px] font-black text-[#E85002] tracking-tighter uppercase italic">SHINEL ELITE</span>
            </div>

            {/* Custom Control Bar - Dynamic Glassmorphism */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/40 to-transparent z-40"
                    >
                        {/* Interactive Progress Bar */}
                        <div className="h-0.5 w-full bg-white/10 rounded-full mb-3 overflow-hidden group/bar cursor-pointer">
                            <motion.div
                                className="h-full bg-[#E85002] relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full scale-0 group-hover/bar:scale-100 transition-transform shadow-lg shadow-[#E85002]" />
                            </motion.div>
                        </div>

                        <div className="flex items-center justify-between text-white">
                            <div className="flex items-center gap-4">
                                <button onClick={togglePlay} className="p-1 hover:text-[#E85002] transition-colors">
                                    {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                </button>
                                <button onClick={toggleMute} className="p-1 hover:text-[#E85002] transition-colors">
                                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[7px] font-black tracking-[0.15em] uppercase text-white/30 select-none">
                                    PREMIUM BRANDED PLAYER
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Poster Overlay (Initial State) - Premium Polish */}
            {(!isPlaying && !autoplay) && (
                <div
                    className="absolute inset-0 bg-cover bg-center z-20 cursor-pointer flex items-center justify-center transition-all duration-700"
                    style={{ backgroundImage: `url(${thumbnail})` }}
                    onClick={togglePlay}
                >
                    <div className="absolute inset-0 bg-black/60 group-hover:bg-black/30 transition-colors backdrop-blur-[2px] group-hover:backdrop-blur-none" />
                    <motion.div
                        whileHover={{ scale: 1.15, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-14 h-14 rounded-full bg-[#E85002] flex items-center justify-center text-white shadow-[0_0_50px_rgba(232,80,2,0.4)] relative z-30"
                    >
                        <Play size={22} fill="currentColor" className="ml-1" />
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default PremiumPlayer;
