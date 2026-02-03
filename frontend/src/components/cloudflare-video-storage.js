// src/components/cloudflare-video-storage.js

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
            if (!res.ok) throw new Error("Failed to fetch videos");
            const data = await res.json();
            return data.videos || [];
        },

        async add(payload) {
            const res = await fetch(`${baseUrl}/videos`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Failed to create video record");
            return await res.json();
        },

        async update(id, payload) {
            const res = await fetch(`${baseUrl}/videos/${id}`, {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Failed to update video record");
            return await res.json();
        },

        async delete(id) {
            const res = await fetch(`${baseUrl}/videos/${id}`, {
                method: "DELETE",
                headers: getHeaders()
            });
            if (!res.ok) throw new Error("Failed to delete video record");
            return await res.json();
        },

        async bulkDelete(ids) {
            const res = await fetch(`${baseUrl}/videos/bulk`, {
                method: "DELETE",
                headers: getHeaders(),
                body: JSON.stringify({ ids })
            });
            if (!res.ok) throw new Error("Bulk delete failed");
            return await res.json();
        },

        async refresh(videoId) {
            const res = await fetch(`${baseUrl}/videos/refresh/${videoId}`, {
                method: "POST",
                headers: getHeaders()
            });
            if (!res.ok) throw new Error("Refresh failed");
            return await res.json();
        },

        async refreshAll() {
            const res = await fetch(`${baseUrl}/videos/refresh-all`, {
                method: "POST",
                headers: getHeaders()
            });
            if (!res.ok) throw new Error("Bulk sync failed");
            return await res.json();
        }
    };
}
