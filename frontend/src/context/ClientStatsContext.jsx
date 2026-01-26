import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { AUTH_BASE } from "../config/constants";

const ClientStatsContext = createContext(null);

export const ClientStatsProvider = ({ children }) => {
    const [stats, setStats] = useState([]); // Array of { id, title, handle, logo, subscribers, views, videoCount }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        const fetchStats = async () => {
            try {
                // Try fetching from the main clients endpoint which contains stats
                const res = await fetch(`${AUTH_BASE}/clients`);
                if (!res.ok) throw new Error("Failed to fetch client stats");
                const data = await res.json();

                if (mounted) {
                    // Expecting { clients: [...] } where each client has subscribers, views, etc.
                    setStats(data.clients || []);
                    setLoading(false);
                }
            } catch (err) {
                console.error("ClientStats Error:", err);
                if (mounted) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };

        fetchStats();

        return () => { mounted = false; };
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
