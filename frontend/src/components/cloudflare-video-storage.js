// src/components/cloudflare-video-storage.js

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

export function createVideoStorage(baseUrl, getToken) {
    const getHeaders = () => ({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`
    });

    return {
        async getAll() {
            const res = await fetch(`${baseUrl}/videos`, {
                headers: getHeaders()
            });
            if (!res.ok) await failWithBody(res, "Failed to fetch videos");
            const data = await res.json();
            return data.videos || [];
        },

        async add(payload) {
            const res = await fetch(`${baseUrl}/videos`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) await failWithBody(res, "Failed to create video record");
            return await res.json();
        },

        async update(id, payload) {
            const res = await fetch(`${baseUrl}/videos/${id}`, {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) await failWithBody(res, "Failed to update video record");
            return await res.json();
        },

        async delete(id) {
            const res = await fetch(`${baseUrl}/videos/${id}`, {
                method: "DELETE",
                headers: getHeaders()
            });
            if (!res.ok) await failWithBody(res, "Failed to delete video record");
            return await res.json();
        },

        async bulkDelete(ids) {
            const res = await fetch(`${baseUrl}/videos/bulk`, {
                method: "DELETE",
                headers: getHeaders(),
                body: JSON.stringify({ ids })
            });
            if (!res.ok) await failWithBody(res, "Bulk delete failed");
            return await res.json();
        },

        async refresh(videoId) {
            const res = await fetch(`${baseUrl}/videos/refresh/${videoId}`, {
                method: "POST",
                headers: getHeaders()
            });
            if (!res.ok) await failWithBody(res, "Refresh failed");
            return await res.json();
        },

        async refreshAll() {
            const res = await fetch(`${baseUrl}/videos/refresh-all`, {
                method: "POST",
                headers: getHeaders()
            });
            if (!res.ok) await failWithBody(res, "Bulk sync failed");
            return await res.json();
        },
        async fetchYoutube(url) {
            const res = await fetch(`${baseUrl}/thumbnails/fetch-youtube`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ url })
            });
            if (!res.ok) await failWithBody(res, "YouTube fetch failed");
            const data = await res.json();
            return data.details || {};
        }
    };
}
