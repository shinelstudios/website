// src/components/cloudflare-lead-storage.js
//
// Wraps the worker's /leads endpoints. All requests use authedFetch from
// tokenStore so a 401 auto-triggers /auth/refresh + retry once. Past bug:
// raw fetch + Bearer ${token} would return 401 on access-token expiry and
// the page would show "Failed to fetch" with no recovery; the user had
// to manually reload to bounce through ProtectedRoute.
//
// Errors propagate the worker's actual `error` body + HTTP status so the
// admin UI can show specifics ("DB binding missing", "Forbidden", etc.)
// instead of a generic message.

import { authedFetch } from "../utils/tokenStore";

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

export function createLeadStorage(baseUrl /*, getToken — unused, kept for signature compat */) {
    return {
        async getAll() {
            const res = await authedFetch(baseUrl, "/leads");
            if (!res.ok) await failWithBody(res, "Failed to fetch leads");
            const data = await res.json();
            return data.leads || [];
        },

        async update(id, payload) {
            const res = await authedFetch(baseUrl, `/leads/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) await failWithBody(res, "Failed to update lead");
            return await res.json();
        },

        async delete(id) {
            const res = await authedFetch(baseUrl, `/leads/${id}`, { method: "DELETE" });
            if (!res.ok) await failWithBody(res, "Failed to delete lead");
            return await res.json();
        },

        async bulkDelete(ids) {
            const res = await authedFetch(baseUrl, `/leads/bulk`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
            });
            if (!res.ok) await failWithBody(res, "Bulk delete failed");
            return await res.json();
        }
    };
}
