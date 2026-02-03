// src/components/cloudflare-lead-storage.js

export function createLeadStorage(baseUrl, getToken) {
    const getHeaders = () => ({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`
    });

    return {
        async getAll() {
            const res = await fetch(`${baseUrl}/leads`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch leads");
            const data = await res.json();
            return data.leads || [];
        },

        async update(id, payload) {
            const res = await fetch(`${baseUrl}/leads/${id}`, {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Failed to update lead");
            return await res.json();
        },

        async delete(id) {
            const res = await fetch(`${baseUrl}/leads/${id}`, {
                method: "DELETE",
                headers: getHeaders()
            });
            if (!res.ok) throw new Error("Failed to delete lead");
            return await res.json();
        },

        async bulkDelete(ids) {
            const res = await fetch(`${baseUrl}/leads/bulk`, {
                method: "DELETE",
                headers: getHeaders(),
                body: JSON.stringify({ ids })
            });
            if (!res.ok) throw new Error("Bulk delete failed");
            return await res.json();
        }
    };
}
