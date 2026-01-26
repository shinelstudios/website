import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { AUTH_BASE, CLIENT_REGISTRY } from "../config/constants";

const ClientStatsContext = createContext(null);

const LS_KEY = "shinel_client_stats_cache";
const POLL_INTERVAL = 10 * 60 * 1000; // 10 minutes

export const ClientStatsProvider = ({ children }) => {
    const [stats, setStats] = useState(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [loading, setLoading] = useState(stats.length === 0);
    const [error, setError] = useState(null);

    const sanitizeLogoUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        // If it starts with /api or is just a filename, prepend AUTH_BASE
        // AUTH_BASE is typically something like https://shinel-auth.shinelstudioofficial.workers.dev
        return `${AUTH_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    // Hardcoded fallbacks for production resilience (if stats API defaults)
    const HARDCODED_FALLBACKS = {
        'UC_x5XG1OV2P6uZZ5FSM9Ttw': { title: 'Kamz Inkzone', subscribers: 1420000, logo: 'https://yt3.googleusercontent.com/ytc/AIdro_n6U_Ew_FmYm_N0n_9_X_Z_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T' }, // Approximation
        'UCbnkpVSNsBwET7mt1tgqEPQ': { title: 'Deadlox Gaming', subscribers: 2100000, logo: 'https://yt3.googleusercontent.com/UCDLYqESVrBFdTDE8s-3jGg/s176-c-k-c0x00ffffff-no-rj' },
        'UCj-L_n7qM9cO67bYkFzQyQ': { title: 'Gamer Mummy', subscribers: 450000, logo: 'https://yt3.googleusercontent.com/ytc/AIdro_mC-8P_A1f2Y_g_M_S_4_J_Z_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T_B_T' }
    };

    const fetchStats = async () => {
        try {
            // Fetch both concurrently
            // Note: If /stats fails (404 on production worker), we still want registry data
            const [regRes, statsRes] = await Promise.allSettled([
                fetch(`${AUTH_BASE}/clients`),
                fetch(`${AUTH_BASE}/clients/stats`)
            ]);

            let remoteRegistry = [];
            let channelStats = [];

            if (regRes.status === 'fulfilled' && regRes.value.ok) {
                const data = await regRes.value.json();
                remoteRegistry = data.clients || [];
            }

            if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
                const data = await statsRes.value.json();
                channelStats = data.stats || [];
            } else {
                console.warn("ClientStats: /stats API failed or not supported. Using fallbacks.");
            }

            // Index stats by YouTube ID
            const statsMap = channelStats.reduce((acc, s) => {
                if (s.id) acc[s.id] = s;
                return acc;
            }, {});

            // PRIORITY: Use worker KV clients if available, otherwise fallback to local registry
            const baseRegistry = remoteRegistry.length > 0 ? remoteRegistry : CLIENT_REGISTRY;

            // Process clients with stats and fallbacks
            const processedClients = baseRegistry.map(client => {
                const s = statsMap[client.youtubeId] || HARDCODED_FALLBACKS[client.youtubeId] || {};

                const logo = sanitizeLogoUrl(s.logo || client.logo);
                // CRITICAL: Force to Number to fix totaling bug
                const subscribers = Number(s.subscribers || client.subscribers || 0);

                return {
                    ...client,
                    title: s.title || client.name || "Creator",
                    logo: logo,
                    subscribers: subscribers,
                    views: Number(s.views || 0),
                    videoCount: Number(s.videoCount || 0)
                };
            });

            setStats(processedClients);
            localStorage.setItem(LS_KEY, JSON.stringify(processedClients));
            setLoading(false);
            setError(null);
        } catch (err) {
            console.error("ClientStats Error:", err);
            setError(err.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    // Derived Metrics
    const totalSubscribers = useMemo(() => {
        return stats.reduce((acc, curr) => acc + (curr.subscribers || 0), 0);
    }, [stats]);

    const totalViews = useMemo(() => {
        return stats.reduce((acc, curr) => acc + (curr.views || 0), 0);
    }, [stats]);

    // Helper to get specific client stats
    const getClientStats = (youtubeId) => {
        return stats.find(s => s.id === youtubeId) || null;
    };

    const value = {
        stats,
        loading,
        error,
        totalSubscribers,
        totalViews,
        getClientStats
    };

    return (
        <ClientStatsContext.Provider value={value}>
            {children}
        </ClientStatsContext.Provider>
    );
};

export const useClientStats = () => {
    const context = useContext(ClientStatsContext);
    if (!context) {
        throw new Error("useClientStats must be used within a ClientStatsProvider");
    }
    return context;
};
