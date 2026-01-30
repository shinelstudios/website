
// This is a temporary "database" for client projects.
// In the future, this will be replaced by a real backend database.

export const CLIENT_PROJECTS = {
    // Admin sees everything (or specific demo data)
    "admin": [
        {
            id: "demo_001",
            title: "Demo: YouTube Automation",
            status: "in-review",
            type: "video",
            lastUpdated: "2 hours ago",
            driveLink: "https://drive.google.com/drive",
            thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80"
        },
        {
            id: "demo_002",
            title: "Demo: Tech Thumbnails",
            status: "completed",
            type: "thumbnail",
            lastUpdated: "1 day ago",
            driveLink: "https://drive.google.com/drive",
            thumbnail: "https://images.unsplash.com/photo-1626785774573-4b7993143a4d?w=800&q=80"
        }
    ],

    // Mapping by Email (lowercase)
    "raghav@shinelstudios.com": [
        {
            id: "p_101",
            title: "Shinel Studios Website V2",
            status: "active",
            type: "dev",
            lastUpdated: "Just now",
            driveLink: "https://github.com/shinelstudios/website",
            thumbnail: "https://images.unsplash.com/photo-1555099962-4199c345e5dd?w=800&q=80"
        }
    ],

    // Example Client
    "client@example.com": [
        {
            id: "nb_01",
            title: "Necessity Boys - Ep 4",
            status: "in-review",
            type: "video",
            lastUpdated: "4 hours ago",
            driveLink: "https://drive.google.com/drive/folders/EXAMPLE_LINK",
            thumbnail: "https://images.unsplash.com/photo-1593697821252-0c9137d9fc45?w=800&q=80"
        }
    ]
};

// --- Local Storage Helper ---
const STORAGE_KEY = "pulse_client_configs";

export function saveClientConfig(email, config) {
    if (!email) return;
    const normEmail = email.toLowerCase();

    // Get existing
    let allConfigs = {};
    try {
        allConfigs = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (e) { console.error("LS Error", e); }

    // Update
    allConfigs[normEmail] = config;

    // Save
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allConfigs));
}

export function getClientConfig(email) {
    if (!email) return null;
    try {
        const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        return all[email.toLowerCase()] || null;
    } catch { return null; }
}

export function getProjectsForUser(email, role) {
    const normalizedEmail = (email || "").toLowerCase();

    // 0. Check Local Storage Config (Dynamic)
    const dynamicConfig = getClientConfig(normalizedEmail);
    if (dynamicConfig) {
        // Construct a project object from the config
        // We'll treat "Billing" as a separate resource type if needed, 
        // but for now we attach it to the main project card or a separate card.
        return [{
            id: "dynamic_" + Date.now(),
            title: dynamicConfig.projectName || "My Project",
            status: "active",
            type: "video",
            lastUpdated: "Just now",
            // Pass all links
            driveLink: dynamicConfig.driveLink, // Main/Assets
            finalsLink: dynamicConfig.finalsLink || "", // Finals
            billingSheet: dynamicConfig.billingSheet || "", // Costs/Status
            thumbnail: "https://images.unsplash.com/photo-1626544827763-d516dce335ca?w=800&q=80"
        }];
    }

    // 1. Check for direct email match (Static Fallback)
    if (CLIENT_PROJECTS[normalizedEmail]) {
        return CLIENT_PROJECTS[normalizedEmail];
    }

    // 2. If Admin, return demo data
    if ((role || "").includes("admin")) {
        return CLIENT_PROJECTS["admin"];
    }

    // 3. Fallback for new clients
    return [];
}
