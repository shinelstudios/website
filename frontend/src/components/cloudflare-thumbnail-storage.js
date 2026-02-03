// src/components/cloudflare-thumbnail-storage.js

export function createThumbnailStorage(baseUrl, getToken) {
    const getHeaders = () => ({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`
    });

    return {
        async getAll() {
            const res = await fetch(`${baseUrl}/thumbnails`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch thumbnails");
            const data = await res.json();
            return data.thumbnails || [];
        },

        async getStats() {
            const res = await fetch(`${baseUrl}/thumbnails/stats`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch stats");
            return await res.json();
        },

        async add(payload) {
            const res = await fetch(`${baseUrl}/thumbnails`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Failed to create thumbnail");
            return await res.json();
        },

        async update(id, payload) {
            const res = await fetch(`${baseUrl}/thumbnails/${id}`, {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Failed to update thumbnail");
            return await res.json();
        },

        async delete(id) {
            const res = await fetch(`${baseUrl}/thumbnails/${id}`, {
                method: "DELETE",
                headers: getHeaders()
            });
            if (!res.ok) throw new Error("Failed to delete thumbnail");
            return await res.json();
        },

        async bulkDelete(ids) {
            const res = await fetch(`${baseUrl}/thumbnails/bulk`, {
                method: "DELETE",
                headers: getHeaders(),
                body: JSON.stringify({ ids })
            });
            if (!res.ok) throw new Error("Bulk delete failed");
            return await res.json();
        },

        async refreshOne(videoId) {
            const res = await fetch(`${baseUrl}/thumbnails/refresh/${videoId}`, {
                method: "POST",
                headers: getHeaders()
            });
            if (!res.ok) throw new Error("Refresh failed");
            return await res.json();
        },

        async refreshAll() {
            const res = await fetch(`${baseUrl}/thumbnails/refresh-all`, {
                method: "POST",
                headers: getHeaders()
            });
            if (!res.ok) throw new Error("Bulk refresh failed");
            return await res.json();
        }
    };
}
