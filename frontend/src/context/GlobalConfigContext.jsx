import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AUTH_BASE } from "../config/constants";
import { getAccessToken, clearAccessToken } from "../utils/tokenStore";

const GlobalConfigContext = createContext(null);

const LS_KEY = "shinel_global_config_cache";

export const GlobalConfigProvider = ({ children }) => {
    const [config, setConfig] = useState(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch(`${AUTH_BASE}/config`);
            if (res.ok) {
                const data = await res.json();
                setConfig(data.config || {});
                localStorage.setItem(LS_KEY, JSON.stringify(data.config || {}));
            } else if (res.status === 401 || res.status === 403) {
                // Silently ignore auth errors on the global config in case it's still protected
                // but let the admin pages handle it if needed.
            }
            setLoading(false);
        } catch (err) {
            // Only log errors if we're on an admin path or it's a critical failure
            if (window.location.pathname.startsWith('/admin')) {
                console.error("GlobalConfig fetch error:", err);
            }
            setError(err.message);
            setLoading(false);
        }
    }, []);

    const updateConfig = async (updates) => {
        const token = getAccessToken();
        try {
            const res = await fetch(`${AUTH_BASE}/config`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });
            const data = await res.json();
            if (res.ok) {
                setConfig(data.config);
                localStorage.setItem(LS_KEY, JSON.stringify(data.config));
                return { success: true };
            } else {
                // Handle session expiration
                if (data.error?.includes("exp") || res.status === 401) {
                    clearAccessToken();
                    localStorage.removeItem("role");
                    window.location.href = "/login?expired=true";
                    return { success: false, error: "Session expired. Please login again." };
                }
                return { success: false, error: data.error };
            }
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const value = {
        config,
        loading,
        error,
        refreshConfig: fetchConfig,
        updateConfig
    };

    return (
        <GlobalConfigContext.Provider value={value}>
            {children}
        </GlobalConfigContext.Provider>
    );
};

export const useGlobalConfig = () => {
    const context = useContext(GlobalConfigContext);
    if (!context) {
        throw new Error("useGlobalConfig must be used within a GlobalConfigProvider");
    }
    return context;
};
