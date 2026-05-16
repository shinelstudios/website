// src/components/cloudflare-thumbnail-storage.js
//
// authedFetch handles the Bearer header + 401 auto-refresh + retry, so
// a stale access token recovers transparently instead of leaving the
// admin UI stuck on "Failed to fetch".

import { authedFetch } from "../utils/tokenStore";

// Same error-surfacing pattern as the video helper — propagate the
// worker's error body + HTTP status so the admin form can show
// specifics instead of "Save failed".
async function failWithBody(res, fallback) {
    let serverMessage = "";
    try {
        const data = await res.json();
        serverMessage = data?.error || data?.message || "";
    } catch { /* non-JSON body */ }
    const err = new Error(serverMessage || `${fallback} — HTTP ${res.status}`);
    err.status = res.status;
    err.serverMessage = serverMessage;
    throw err;
}

export function createThumbnailStorage(baseUrl /*, getToken — unused, kept for signature compat */) {
    return {
        async getAll() {
            const res = await authedFetch(baseUrl, "/thumbnails");
            if (!res.ok) await failWithBody(res, "Failed to fetch thumbnails");
            const data = await res.json();
            return data.thumbnails || [];
        },

        async getStats() {
            const res = await authedFetch(baseUrl, "/thumbnails/stats");
            if (!res.ok) await failWithBody(res, "Failed to fetch stats");
            return await res.json();
        },

        async add(payload) {
            const res = await authedFetch(baseUrl, "/thumbnails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) await failWithBody(res, "Failed to create thumbnail");
            return await res.json();
        },

        async update(id, payload) {
            const res = await authedFetch(baseUrl, `/thumbnails/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) await failWithBody(res, "Failed to update thumbnail");
            return await res.json();
        },

        async delete(id) {
            const res = await authedFetch(baseUrl, `/thumbnails/${id}`, { method: "DELETE" });
            if (!res.ok) await failWithBody(res, "Failed to delete thumbnail");
            return await res.json();
        },

        async bulkDelete(ids) {
            const res = await authedFetch(baseUrl, "/thumbnails/bulk", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
            });
            if (!res.ok) await failWithBody(res, "Bulk delete failed");
            return await res.json();
        },

        async refreshOne(videoId) {
            const res = await authedFetch(baseUrl, `/thumbnails/refresh/${videoId}`, { method: "POST" });
            if (!res.ok) await failWithBody(res, "Refresh failed");
            return await res.json();
        },

        async refreshAll() {
            const res = await authedFetch(baseUrl, "/thumbnails/refresh-all", { method: "POST" });
            if (!res.ok) await failWithBody(res, "Bulk refresh failed");
            return await res.json();
        },

        async fetchYoutube(url) {
            const res = await authedFetch(baseUrl, "/thumbnails/fetch-youtube", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });
            if (!res.ok) await failWithBody(res, "YouTube fetch failed");
            const data = await res.json();
            return data.details || {};
        }
    };
}
