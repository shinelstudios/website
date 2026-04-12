import React, { useState } from "react";
import { ChevronDown, ChevronUp, Search, Filter } from "lucide-react";

/**
 * Standard Input with Label
 */
export const Input = ({ label, value, onChange, placeholder, type = "text", error, ...props }) => (
    <div className="flex flex-col gap-1 w-full">
        {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{label}</label>}
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border transition-all outline-none text-sm font-medium ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-orange-500/50'
                }`}
            {...props}
        />
        {error && <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>}
    </div>
);

/**
 * Input with clickable presets/recent values
 */
export const InputWithPresets = ({ label, value, onChange, placeholder, recent = [], error, ...props }) => (
    <div className="flex flex-col gap-1 w-full">
        <Input label={label} value={value} onChange={onChange} placeholder={placeholder} error={error} {...props} />
        {recent.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
                {recent.slice(0, 5).map((r) => (
                    <button
                        key={r}
                        type="button"
                        onClick={() => onChange(r)}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-bold text-gray-500 hover:text-white hover:border-white/10 transition-all uppercase tracking-tighter"
                    >
                        {r}
                    </button>
                ))}
            </div>
        )}
    </div>
);

/**
 * Select dropdown with presets
 */
export const SelectWithPresets = ({ label, value, onChange, options = [], error, ...props }) => (
    <div className="flex flex-col gap-1 w-full relative">
        {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{label}</label>}
        <div className="relative group">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border transition-all outline-none text-sm font-medium appearance-none cursor-pointer pr-10 ${error
                    ? 'border-red-500/50 focus:border-red-500'
                    : 'border-white/5 focus:border-orange-500/50'
                    }`}
                style={{
                    background: "rgba(10, 10, 10, 0.4)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                }}
                {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#1A1A1A] text-white py-2">
                        {opt.label}
                    </option>
                ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-hover:text-orange-500 transition-colors">
                <ChevronDown size={14} />
            </div>
        </div>
        {error && <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>}
    </div>
);

/**
 * Standard Text Area
 */
export const TextArea = ({ label, value, onChange, placeholder, rows = 3, error, ...props }) => (
    <div className="flex flex-col gap-1 w-full">
        {label && <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{label}</label>}
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={`w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border transition-all outline-none text-sm font-medium resize-none ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-orange-500/50'
                }`}
            {...props}
        />
        {error && <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>}
    </div>
);

/**
 * Searchable/Combinable Input (Combobox)
 */
export const ComboboxInput = ({ label, value, onChange, suggestions = [], placeholder, error }) => {
    const [open, setOpen] = useState(false);
    const filtered = suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()));

    return (
        <div className="flex flex-col gap-1 w-full relative">
            <Input
                label={label}
                value={value}
                onChange={(v) => { onChange(v); setOpen(true); }}
                placeholder={placeholder}
                error={error}
            />
            <button
                type="button"
                onFocus={() => setOpen(true)}
                className="absolute right-3 top-8 text-gray-600 hover:text-white"
            >
                <ChevronDown size={14} />
            </button>

            {open && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[100] mt-1 p-1 rounded-xl bg-[#1A1A1A] border border-white/10 shadow-2xl max-h-40 overflow-y-auto scrollbar-hide">
                    {filtered.map((s) => (
                        <button
                            key={s}
                            type="button"
                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                            onClick={() => { onChange(s); setOpen(false); }}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
            {open && <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />}
        </div>
    );
};

/**
 * Sort Button for lists
 */
export const SortBtn = ({ active, dir, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${active
            ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
            : "bg-white/5 border-white/5 text-gray-500 hover:text-white"
            }`}
    >
        {children}
        {active && (dir === "asc" ? <ChevronUp size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />)}
    </button>
);

/**
 * Loading Overlay with spinner
 */
export function LoadingOverlay({ show, label }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-[200] animate-in fade-in duration-300"
            style={{ WebkitBackdropFilter: "blur(12px)" }}>
            <div className="flex flex-col items-center gap-4 text-white">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-orange-500/20" />
                    <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-t-orange-500 animate-spin" />
                </div>
                {label && <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">{label}</span>}
            </div>
        </div>
    );
}
