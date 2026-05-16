// src/components/cloudflare-video-storage.js
//
// Wraps the worker's /videos endpoints. authedFetch handles the
// Bearer header + a single 401 auto-refresh + retry, so a stale
// access token doesn't surface as a permanent "Failed to fetch"
// banner — the SPA recovers transparently via /auth/refresh.

import { authedFetch } from "../utils/tokenStore";

// Throw an Error that carries the HTTP status + the worker's actual
// `error` body, so the admin UI can surface specifics ("youtube_views
// column missing" / "validation failed: ...") instead of a generic
// "Failed to save". Past incidents: the silent generic-message path
// hid a 500 from a missing column for hours.
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

export function createVideoStorage(baseUrl /*, getToken — unused, kept for signature compat */) {
    return {
        async getAll() {
            const res = await authedFetch(baseUrl, "/videos");
            if (!res.ok) await failWithBody(res, "Failed to fetch videos");
            const data = await res.json();
            return data.videos || [];
        },

        async add(payload) {
            const res = await authedFetch(baseUrl, "/videos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) await failWithBody(res, "Failed to create video record");
            return await res.json();
        },

        async update(id, payload) {
            const res = await authedFetch(baseUrl, `/videos/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) await failWithBody(res, "Failed to update video record");
            return await res.json();
        },

        async delete(id) {
            const res = await authedFetch(baseUrl, `/videos/${id}`, { method: "DELETE" });
            if (!res.ok) await failWithBody(res, "Failed to delete video record");
            return await res.json();
        },

        async bulkDelete(ids) {
            const res = await authedFetch(baseUrl, "/videos/bulk", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
            });
            if (!res.ok) await failWithBody(res, "Bulk delete failed");
            return await res.json();
        },

        async refresh(videoId) {
            const res = await authedFetch(baseUrl, `/videos/refresh/${videoId}`, { method: "POST" });
            if (!res.ok) await failWithBody(res, "Refresh failed");
            return await res.json();
        },

        async refreshAll() {
            const res = await authedFetch(baseUrl, "/videos/refresh-all", { method: "POST" });
            if (!res.ok) await failWithBody(res, "Bulk sync failed");
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
