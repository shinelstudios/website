// src/components/AdminLeadsPage.jsx
import React, {
    useEffect,
    useMemo,
    useState,
    useTransition,
    useCallback,
} from "react";
import {
    Download,
    Trash2,
    Filter,
    Search,
    Mail,
    MessageCircle,
    MoreVertical,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Star,
} from "lucide-react";
import { createLeadStorage } from "./cloudflare-lead-storage";
import { LoadingOverlay } from "./AdminUIComponents";

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE?.replace(/\/+$/, "") || "https://shinel-auth.shinelstudioofficial.workers.dev";
const LS_TOKEN_KEY = "token";

const store = createLeadStorage(AUTH_BASE, () => localStorage.getItem(LS_TOKEN_KEY));

function toast(type, message) {
    window.dispatchEvent(
        new CustomEvent("notify", { detail: { type: type === "error" ? "error" : "success", message: String(message || "") } })
    );
}

const STATUS_COLORS = {
    new: { bg: "rgba(34,197,94,0.1)", text: "#22c55e", label: "New" },
    contacted: { bg: "rgba(59,130,246,0.1)", text: "#3b82f6", label: "Contacted" },
    qualified: { bg: "rgba(168,85,247,0.1)", text: "#a855f7", label: "Qualified" },
    lost: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", label: "Lost" },
    closed: { bg: "rgba(245,158,11,0.1)", text: "#f59e0b", label: "Closed" },
};

export default function AdminLeadsPage() {
    const [leads, setLeads] = useState([]);
    const [busy, setBusy] = useState(false);
    const [busyLabel, setBusyLabel] = useState("");
    const [err, setErr] = useState("");
    const [isPending, startTransition] = useTransition();

    // Search & Filters
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({ status: "ALL", source: "ALL" });
    const [selectedIds, setSelectedIds] = useState(new Set());

    const loadLeads = useCallback(async () => {
        setBusy(true);
        setBusyLabel("Fetching leads...");
        try {
            const rows = await store.getAll();
            startTransition(() => setLeads(rows || []));
        } catch (e) {
            setErr(e.message || "Failed to load leads");
            toast("error", "Failed to load leads");
        } finally {
            setBusy(false);
        }
    }, []);

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

    const handleUpdateStatus = async (id, status) => {
        try {
            await store.update(id, { status });
            setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
            toast("success", `Lead updated to ${status}`);
        } catch (e) {
            toast("error", "Failed to update lead");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this lead?")) return;
        try {
            await store.delete(id);
            setLeads((prev) => prev.filter((l) => l.id !== id));
            toast("success", "Lead deleted");
        } catch (e) {
            toast("error", "Delete failed");
        }
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedIds);
        if (!ids.length || !confirm(`Delete ${ids.length} selected leads?`)) return;
        setBusy(true);
        try {
            await store.bulkDelete(ids);
            setSelectedIds(new Set());
            await loadLeads();
            toast("success", "Bulk delete complete");
        } catch (e) {
            toast("error", "Bulk delete failed");
        } finally {
            setBusy(false);
        }
    };

    // Filtered & Sorted Data
    const filteredLeads = useMemo(() => {
        let out = [...leads];
        const s = search.toLowerCase().trim();
        if (s) {
            out = out.filter(
                (l) =>
                    l.name?.toLowerCase().includes(s) ||
                    l.email?.toLowerCase().includes(s) ||
                    l.handle?.toLowerCase().includes(s) ||
                    l.message?.toLowerCase().includes(s)
            );
        }
        if (filters.status !== "ALL") {
            out = out.filter((l) => l.status === filters.status);
        }
        if (filters.source !== "ALL") {
            out = out.filter((l) => l.source === filters.source);
        }
        return out.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    }, [leads, search, filters]);

    const toggleSelect = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredLeads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--surface)] text-[var(--text)]">
            <LoadingOverlay show={busy} label={busyLabel} />

            {/* Header & Filters */}
            <div className="p-4 sm:p-6 border-b border-[var(--border)] bg-[var(--surface-alt)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                            <Mail className="text-[var(--orange)]" size={24} />
                            Lead Management CRM
                        </h2>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            Tracking {leads.length} leads from all conversion points
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadLeads}
                            className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] transition-all"
                            title="Refresh"
                        >
                            <Clock size={18} />
                        </button>
                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="px-3 py-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center gap-2 text-xs font-bold"
                            >
                                <Trash2 size={14} />
                                Delete {selectedIds.size}
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <div className="relative col-span-1 lg:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or handle..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-[var(--orange)] outline-none transition-all"
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl py-2.5 pl-10 pr-4 text-sm appearance-none outline-none focus:border-[var(--orange)] text-[var(--text)]"
                        >
                            <option value="ALL" className="bg-[#1A1A1A]">All Statuses</option>
                            {Object.keys(STATUS_COLORS).map((s) => (
                                <option key={s} value={s} className="bg-[#1A1A1A]">
                                    {STATUS_COLORS[s].label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <select
                            value={filters.source}
                            onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}
                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl py-2.5 pl-10 pr-4 text-sm appearance-none outline-none focus:border-[var(--orange)] text-[var(--text)]"
                        >
                            <option value="ALL" className="bg-[#1A1A1A]">All Sources</option>
                            <option value="quick_quote" className="bg-[#1A1A1A]">Quick Quote Bar</option>
                            <option value="roi_calc" className="bg-[#1A1A1A]">ROI Calculator</option>
                            <option value="exit_intent" className="bg-[#1A1A1A]">Exit Intent Modal</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-4 sm:p-6">
                {filteredLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] py-20">
                        <Mail size={48} className="mb-4 opacity-20" />
                        <p className="font-bold">No leads found matching your criteria.</p>
                        <p className="text-xs">Incoming leads will appear here automatically.</p>
                    </div>
                ) : (
                    <div className="space-y-4 max-w-5xl mx-auto">
                        <div className="flex items-center justify-between px-2 mb-2">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === filteredLeads.length && filteredLeads.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-[var(--border)] accent-[var(--orange)]"
                                />
                                Select {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'All'}
                            </label>
                        </div>

                        {filteredLeads.map((l) => (
                            <LeadCard
                                key={l.id}
                                lead={l}
                                isSelected={selectedIds.has(l.id)}
                                onSelect={() => toggleSelect(l.id)}
                                onUpdateStatus={handleUpdateStatus}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function LeadCard({ lead, isSelected, onSelect, onUpdateStatus, onDelete }) {
    const status = STATUS_COLORS[lead.status] || STATUS_COLORS.new;
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            className={`relative group bg-[var(--surface-alt)] border-2 rounded-2xl p-4 transition-all hover:border-[var(--orange)]/30 ${isSelected ? "border-[var(--orange)]" : "border-[var(--border)]"
                }`}
        >
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Checkbox & Avatar */}
                <div className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onSelect}
                        className="w-5 h-5 mt-1 rounded border-[var(--border)] accent-[var(--orange)]"
                    />
                    <div className="w-12 h-12 rounded-xl bg-[var(--surface)] flex items-center justify-center border border-[var(--border)] overflow-hidden">
                        {lead.avatar ? (
                            <img src={lead.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <User size={24} className="text-[var(--text-muted)]" />
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-black text-base truncate max-w-[200px]">{lead.name}</h3>
                        <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                            style={{ background: status.bg, color: status.text }}
                        >
                            {status.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                            {lead.source.replace('_', ' ')}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)] mb-3">
                        <div className="flex items-center gap-1">
                            <Mail size={12} /> {lead.email}
                        </div>
                        {lead.handle && (
                            <div className="flex items-center gap-1">
                                <Star size={12} className="text-yellow-500" /> {lead.handle}
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <Clock size={12} /> {new Date(lead.dateAdded).toLocaleDateString()}
                        </div>
                    </div>

                    {lead.interests && lead.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                            {lead.interests.map((it) => (
                                <span key={it} className="px-2 py-0.5 bg-[var(--surface)] rounded-lg text-[9px] font-bold text-[var(--text)] border border-[var(--border)]">
                                    {it}
                                </span>
                            ))}
                        </div>
                    )}

                    {lead.message && (
                        <div className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)] text-xs leading-relaxed italic">
                            "{lead.message}"
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col items-center justify-between lg:justify-start gap-2 pt-2 lg:pt-0">
                    <div className="flex items-center gap-1">
                        <a
                            href={`mailto:${lead.email}`}
                            className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--orange)] transition-all"
                            title="Email Lead"
                        >
                            <Mail size={16} />
                        </a>
                        {lead.handle && (
                            <button
                                onClick={() => window.open(`https://youtube.com/${lead.handle.replace('@', '')}`, '_blank')}
                                className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--orange)] transition-all"
                                title="View Channel"
                            >
                                <ExternalLink size={16} />
                            </button>
                        )}
                    </div>

                    <div className="relative">
                        <select
                            value={lead.status}
                            onChange={(e) => onUpdateStatus(lead.id, e.target.value)}
                            className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1 text-[10px] font-black uppercase outline-none focus:border-[var(--orange)]"
                        >
                            {Object.keys(STATUS_COLORS).map(s => (
                                <option key={s} value={s}>{STATUS_COLORS[s].label}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => onDelete(lead.id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Lead"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function ExternalLink({ size }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    );
}
