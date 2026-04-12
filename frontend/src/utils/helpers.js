/**
 * Formats a number of bytes into a human-readable string.
 */
export const formatBytes = (n) => {
    if (n == null) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

/**
 * Returns a human-readable "time ago" string from a timestamp.
 */
export const timeAgo = (ts) => {
    if (!ts) return "Never";
    const seconds = Math.floor((Date.now() - ts) / 1000);
    const map = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
    };
    for (const [unit, len] of Object.entries(map)) {
        const n = Math.floor(seconds / len);
        if (n >= 1) return `${n} ${unit}${n > 1 ? "s" : ""} ago`;
    }
    return "Just now";
};

/**
 * Runs a list of tasks with a specified concurrency.
 */
export async function runWithConcurrency(items, worker, concurrency = 5, onTick) {
    const results = [];
    let i = 0;
    const runners = Array.from(
        { length: Math.min(concurrency, items.length) },
        async () => {
            while (i < items.length) {
                const idx = i++;
                try {
                    const out = await worker(items[idx], idx);
                    results[idx] = out;
                } catch (e) {
                    results[idx] = e;
                } finally {
                    onTick?.(idx);
                }
            }
        }
    );
    await Promise.all(runners);
    return results;
}
