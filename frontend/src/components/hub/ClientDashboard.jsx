import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    LayoutDashboard,
    Folder,
    MessageSquare,
    Settings,
    LogOut,
    CheckCircle,
    Clock,
    AlertCircle,
    FileText,
    Video,
    Image as ImageIcon,
    ArrowRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import DriveEmbed from "./DriveEmbed";

const StatusBadge = ({ status }) => {
    const styles = {
        "active": "bg-blue-500/10 text-blue-500 border-blue-500/20",
        "in-review": "bg-orange-500/10 text-[var(--orange)] border-orange-500/20",
        "completed": "bg-green-500/10 text-green-500 border-green-500/20",
        "paused": "bg-gray-500/10 text-gray-400 border-gray-500/20"
    };

    const labels = {
        "active": "In Production",
        "in-review": "Needs Review",
        "completed": "Completed",
        "paused": "Paused"
    };

    return (
        <span className={`px-2 py-1 rounded-md text-xs font-bold border ${styles[status] || styles['paused']} uppercase tracking-wider flex items-center gap-1.5`}>
            {status === 'completed' && <CheckCircle size={10} />}
            {status === 'in-review' && <AlertCircle size={10} />}
            {status === 'active' && <Clock size={10} />}
            {labels[status]}
        </span>
    );
};

import { getProjectsForUser } from "../../data/clientRegistry";

export default function ClientDashboard() {
    const [user, setUser] = useState({
        name: localStorage.getItem("firstName") || localStorage.getItem("userFirstName") || "Client",
        email: localStorage.getItem("email") || localStorage.getItem("userEmail") || "",
        role: localStorage.getItem("role") || ""
    });

    // Fetch projects based on user identity
    const projects = getProjectsForUser(user.email, user.role);

    const [activeTab, setActiveTab] = useState("overview");
    const navigate = useNavigate();


    // ... (rest of code) ...

    return (
        <div className="font-sans">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name} 👋</h1>
                    <p className="text-[var(--text-muted)]">Here is what's happening with your projects today.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--text-muted)]">Need help?</span>
                    <button className="px-4 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-sm font-bold hover:bg-[var(--surface-2)] transition-colors">
                        Contact Manager
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mb-8 border-b border-[var(--border)] pb-1">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex items-center gap-2 px-4 py-3 rounded-t-xl border-b-2 transition-all font-medium text-sm ${activeTab === "overview"
                        ? "border-[var(--orange)] text-[var(--orange)] bg-[var(--orange)]/5"
                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)]"
                        }`}
                >
                    <LayoutDashboard size={16} /> Overview
                </button>
                <button
                    onClick={() => setActiveTab("files")}
                    className={`flex items-center gap-2 px-4 py-3 rounded-t-xl border-b-2 transition-all font-medium text-sm ${activeTab === "files"
                        ? "border-blue-500 text-blue-500 bg-blue-500/5"
                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)]"
                        }`}
                >
                    <Folder size={16} /> Assets & Drive
                </button>
                <button
                    className="flex items-center gap-2 px-4 py-3 rounded-t-xl border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] transition-all font-medium text-sm"
                >
                    <MessageSquare size={16} /> Messages
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                {/* Active Projects */}
                {activeTab === "overview" && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Video size={20} className="text-[var(--orange)]" />
                                Active Projects
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project) => (
                                <motion.div
                                    key={project.id}
                                    whileHover={{ y: -5 }}
                                    className="group bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden hover:shadow-xl transition-all hover:border-[var(--text-muted)]/30"
                                >
                                    <div className="h-40 bg-[var(--surface-alt)] relative overflow-hidden">
                                        <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
                                        <div className="absolute top-3 right-3">
                                            <StatusBadge status={project.status} />
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">{project.type}</p>
                                                <h3 className="font-bold text-lg leading-tight">{project.title}</h3>
                                            </div>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!confirm("Notify team about updates to this project?")) return;
                                                    try {
                                                        const token = localStorage.getItem("token");
                                                        const res = await fetch(`${import.meta.env.VITE_AUTH_BASE}/notify`, {
                                                            method: "POST",
                                                            headers: {
                                                                "content-type": "application/json",
                                                                "authorization": `Bearer ${token}`
                                                            },
                                                            body: JSON.stringify({
                                                                type: "upload",
                                                                message: `Client has updated project: ${project.title}`
                                                            })
                                                        });
                                                        if (res.ok) alert("Team notified! 🔔");
                                                        else alert("Failed to notify. Dev note: Is DISCORD_WEBHOOK_URL set?");
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Error sending notification");
                                                    }
                                                }}
                                                className="p-1.5 rounded-full hover:bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[#5865F2] transition-colors"
                                                title="Notify Team of Updates"
                                            >
                                                <MessageSquare size={16} />
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-[var(--border)]">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                                    <Clock size={12} /> Updated {project.lastUpdated}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                {/* Assets Link */}
                                                <button
                                                    onClick={() => window.open(project.driveLink, '_blank')}
                                                    className="px-3 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={!project.driveLink}
                                                >
                                                    <Folder size={14} className="text-blue-400" /> Assets
                                                </button>

                                                {/* Finals Link */}
                                                <button
                                                    onClick={() => window.open(project.finalsLink, '_blank')}
                                                    className="px-3 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={!project.finalsLink}
                                                >
                                                    <CheckCircle size={14} className="text-green-400" /> Finals
                                                </button>
                                            </div>

                                            {/* Financials / Status Sheet */}
                                            <button
                                                onClick={() => window.open(project.billingSheet, '_blank')}
                                                className="w-full px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-500 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!project.billingSheet}
                                            >
                                                <FileText size={14} /> Financials & Status
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Drive Embed Section */}
                {activeTab === "files" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Folder size={20} className="text-blue-500" />
                            Project Files
                        </h2>
                        <DriveEmbed />
                    </div>
                )}
            </div>
        </div>
    );
}
