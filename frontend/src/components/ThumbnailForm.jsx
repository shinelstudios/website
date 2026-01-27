import React, { useRef } from "react";
import {
    X,
    Upload,
    Plus,
    RefreshCw,
    ExternalLink,
    Info,
    Layers,
    Search,
    Check
} from "lucide-react";
import { THUMBNAIL_VARIANTS, VIDEO_CATEGORIES } from "../utils/constants";

const ThumbnailForm = ({
    editingId,
    form,
    setForm,
    onSave,
    onCancel,
    onImageSelected,
    onFetchYouTube,
    imagePreview,
    busy,
    busyLabel,
    vErrs,
    presets
}) => {
    const fileInputRef = useRef(null);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((f) => ({
            ...f,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    return (
        <div
            className="rounded-2xl border transition-all duration-300 h-fit sticky top-24 overflow-hidden"
            style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
        >
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${editingId ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
                    <h2 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">
                        {editingId ? "Edit Thumbnail" : "Create New"}
                    </h2>
                </div>
                {editingId && (
                    <button onClick={onCancel} className="p-1 text-gray-500 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                )}
            </div>

            <form onSubmit={onSave} className="p-5 space-y-6">
                {/* Image Upload Area */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Thumbnail Asset</label>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative aspect-video rounded-xl border-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center gap-3 overflow-hidden ${imagePreview ? 'border-orange-500/50' : 'border-white/10 hover:border-orange-500/30 bg-white/[0.02]'
                            }`}
                    >
                        {imagePreview ? (
                            <>
                                <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                <div className="z-10 bg-black/60 backdrop-blur-md p-3 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                    <Upload size={20} className="text-orange-500" />
                                </div>
                                <div className="absolute bottom-3 left-3 right-3 text-[10px] font-bold text-white text-center bg-black/40 backdrop-blur-sm p-1.5 rounded-lg border border-white/5">
                                    CLICK TO CHANGE ASSET
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="p-4 rounded-full bg-white/5 border border-white/10 group-hover:scale-110 group-hover:bg-orange-500/10 group-hover:border-orange-500/20 transition-all">
                                    <Upload size={24} className="text-gray-500 group-hover:text-orange-500" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-gray-400 group-hover:text-white">Upload Thumbnail</p>
                                    <p className="text-[9px] font-medium text-gray-600 uppercase tracking-tighter mt-1">PNG, JPG up to 25MB</p>
                                </div>
                            </>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png, image/jpeg"
                            onChange={(e) => onImageSelected(e.target.files?.[0])}
                            className="hidden"
                        />
                    </div>
                    {vErrs.imageUrl && <p className="text-[10px] font-bold text-red-500 ml-1">{vErrs.imageUrl}</p>}
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Project Name</label>
                        <input
                            name="filename"
                            value={form.filename}
                            onChange={handleInputChange}
                            list="filename-presets"
                            placeholder="e.g. Minecraft Survival #1"
                            className={`w-full px-4 py-3 rounded-xl bg-white/[0.03] border transition-all outline-none text-sm font-medium ${vErrs.filename ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-orange-500/50'
                                }`}
                        />
                        <datalist id="filename-presets">
                            {presets.filenameTemplates.map(v => <option key={v} value={v} />)}
                        </datalist>
                        {vErrs.filename && <p className="text-[10px] font-bold text-red-500 ml-1">{vErrs.filename}</p>}
                    </div>

                    <div className="grid gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">YouTube URL (Automatic Views)</label>
                        <div className="relative">
                            <input
                                name="youtubeUrl"
                                value={form.youtubeUrl}
                                onChange={handleInputChange}
                                placeholder="https://youtube.com/watch?v=..."
                                className="w-full pl-4 pr-12 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-orange-500/50 transition-all outline-none text-sm font-medium"
                            />
                            {form.youtubeUrl && (
                                <button
                                    type="button"
                                    onClick={() => onFetchYouTube(form.youtubeUrl)}
                                    disabled={busy}
                                    className="absolute right-2 top-2 p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-orange-500 transition-all"
                                >
                                    <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Categorization */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Category</label>
                        <select
                            name="category"
                            value={form.category}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded-xl bg-[#0F0F0F] border border-white/5 focus:border-orange-500/50 transition-all outline-none text-sm font-medium appearance-none cursor-pointer"
                        >
                            {VIDEO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Subcategory</label>
                        <input
                            name="subcategory"
                            value={form.subcategory}
                            onChange={handleInputChange}
                            placeholder="e.g. Bedwars"
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-orange-500/50 transition-all outline-none text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="grid gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Variant Type</label>
                    <div className="flex flex-wrap gap-2">
                        {THUMBNAIL_VARIANTS.map(v => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, variant: v }))}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${form.variant === v
                                        ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20'
                                    }`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ownership */}
                <div className="pt-4 border-t border-white/5 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${form.isShinel ? 'bg-orange-500 border-orange-500' : 'bg-white/5 border-white/10 group-hover:border-orange-500/30'
                            }`}>
                            {form.isShinel && <Check size={12} className="text-white" strokeWidth={4} />}
                        </div>
                        <input
                            type="checkbox"
                            name="isShinel"
                            checked={form.isShinel}
                            onChange={handleInputChange}
                            className="hidden"
                        />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">Shinel Studios Ownership</span>
                            <span className="text-[10px] text-gray-500">Enable this to show asset in Portfolio</span>
                        </div>
                    </label>

                    <div className="grid gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Editor Attribution</label>
                        <input
                            name="attributedTo"
                            value={form.attributedTo}
                            onChange={handleInputChange}
                            placeholder="email@shinel.in or @handle"
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-orange-500/50 transition-all outline-none text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-900/20 hover:shadow-orange-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                >
                    {busy ? (
                        <>
                            <RefreshCw size={16} className="animate-spin" />
                            <span>{busyLabel || "PLEASE WAIT"}</span>
                        </>
                    ) : (
                        <>
                            {editingId ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                            <span>{editingId ? "Update Thumbnail" : "Create Asset"}</span>
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default React.memo(ThumbnailForm);
