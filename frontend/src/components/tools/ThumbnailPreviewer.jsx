// src/components/tools/ThumbnailPreviewer.jsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    Trash2,
    Layout,
    Search,
    Eye,
    EyeOff,
    Maximize2,
    Zap,
    Clock,
    Youtube,
    Monitor,
    Smartphone,
    Tablet,
    Layers,
    Sparkles,
    Contrast,
    PenTool,
    CheckCircle2,
    PlusSquare,
    PlaySquare,
    Library,
    Bell,
    MoreVertical,
    Share2,
    Download,
    Scissors,
    ListPlus,
    Menu,
    Tv,
    RotateCcw,
    X,
    Plus,
    Mic,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
    SlidersHorizontal,
    ThumbsUp,
    ThumbsDown,
    Play,
    SkipForward,
    Volume2,
    Maximize,
    Settings,
    Image as ImageIcon
} from "lucide-react";

const MOCK_VIDEOS = [
    {
        id: 1,
        title: "I Built a Secret Gaming Room in My House!",
        channel: "Gaming Frontier",
        views: "2.4M",
        time: "10 hours ago",
        duration: "22:15",
        avatar: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop",
        verified: true,
        thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80"
    },
    {
        id: 2,
        title: "The Future of AI: What 2026 Looks Like",
        channel: "Tech Insider",
        views: "890K",
        time: "2 days ago",
        duration: "15:40",
        avatar: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&h=100&fit=crop",
        verified: true,
        thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80"
    },
    {
        id: 3,
        title: "5 Healthy Breakfast Recipes for Busy Mornings",
        channel: "Health & Bloom",
        views: "1.2M",
        time: "4 days ago",
        duration: "10:12",
        avatar: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=100&h=100&fit=crop",
        verified: false,
        thumbnail: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80"
    },
    {
        id: 4,
        title: "Extreme $1,000,000 Hide and Seek!",
        channel: "Pulse Beast",
        views: "45M",
        time: "1 week ago",
        duration: "25:00",
        avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop",
        verified: true,
        thumbnail: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&q=80"
    },
    {
        id: 5,
        title: "Why Most Startups Fail in First 12 Months",
        channel: "Business Blueprint",
        views: "300K",
        time: "3 days ago",
        duration: "18:22",
        avatar: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop",
        verified: true,
        thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80"
    }
];

const OUTLIER_VIDEOS = [
    {
        id: 'o1',
        title: "I spent 100 Days in a Circle!",
        channel: "Mr. Circle",
        views: "120M",
        time: "1 month ago",
        duration: "45:00",
        avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop",
        verified: true,
        thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80"
    },
    {
        id: 'o2',
        title: "LO-FI HIP HOP RADIO - BEATS TO RELAX/STUDY TO",
        channel: "Lofi Girl",
        views: "800M",
        time: "Live now",
        duration: "LIVE",
        avatar: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=100&h=100&fit=crop",
        verified: true,
        thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
        isLive: true
    }
];

/**
 * Interactive A/B Thumbnail Previewer
 */
export default function ThumbnailPreviewer() {
    // Dashboard States
    const [viewMode, setViewMode] = useState("youtube"); // youtube | size
    const [layout, setLayout] = useState("home"); // home | search | sidebar | compare
    const [device, setDevice] = useState("desktop"); // desktop | mobile | tablet
    const [theme, setTheme] = useState("dark"); // dark | light | black

    // Variations State
    const [variations, setVariations] = useState([
        {
            id: 'v1',
            name: 'Variation A',
            image: "https://images.unsplash.com/photo-1626544823126-64981894aa4d?w=800&q=80",
            isSelected: true
        },
        {
            id: 'v2',
            name: 'Variation B',
            image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
            isSelected: false
        }
    ]);

    const [filter, setFilter] = useState("none");
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [showOutliers, setShowOutliers] = useState(false);

    // Metadata State
    const [meta, setMeta] = useState({
        title: "HOW WE REACHED 1M SUBS IN 12 MONTHS",
        channel: "Shinel Studios",
        views: "1.2M views",
        time: "2 days ago",
        duration: "12:45",
        avatar: null,
        verified: true,
        isLive: false,
        descSnippet: "In this video, we break down exactly how we scaled our channel to over 1 million subscribers in just one year."
    });

    const activeThumb = variations.find(v => v.isSelected)?.image;
    const thumbA = variations[0].image;
    const thumbB = variations[1]?.image;

    // Auto-hide notification
    useEffect(() => {
        if (showNotification) {
            const timer = setTimeout(() => setShowNotification(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [showNotification]);

    const fileInputRef = useRef(null);
    const avatarInput = useRef(null);

    const resetSimulation = () => {
        setVariations([
            { id: 'v1', name: 'Variation A', image: "https://images.unsplash.com/photo-1626544823126-64981894aa4d?w=800&q=80", isSelected: true },
            { id: 'v2', name: 'Variation B', image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80", isSelected: false }
        ]);
        setMeta({
            title: "HOW WE REACHED 1M SUBS IN 12 MONTHS",
            channel: "Shinel Studios",
            views: "1.2M views",
            time: "2 days ago",
            duration: "12:45",
            avatar: null,
            verified: true,
            isLive: false,
            descSnippet: "In this video, we break down exactly how we scaled our channel to over 1 million subscribers in just one year."
        });
        setFilter("none");
        setShowHeatmap(false);
        setShowNotification(false);
        setShowOutliers(false);
        setTheme("dark");
        setDevice("desktop");
        setLayout("home");
    };

    const handleUpload = (id, file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            setVariations(prev => prev.map(v =>
                v.id === id ? { ...v, image: e.target.result } : v
            ));
        };
        reader.readAsDataURL(file);
    };

    const handleAvatarUpload = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            setMeta(prev => ({ ...prev, avatar: e.target.result }));
        };
        reader.readAsDataURL(file);
    };

    const addVariation = () => {
        const id = `v${variations.length + 1}`;
        setVariations([...variations, { id, name: `Variation ${variations.length + 1}`, image: null, isSelected: false }]);
    };

    const removeVariation = (id) => {
        if (variations.length <= 1) return;
        setVariations(prev => {
            const updated = prev.filter(v => v.id !== id);
            if (prev.find(v => v.id === id)?.isSelected) {
                updated[0].isSelected = true;
            }
            return updated;
        });
    };

    const selectVariation = (id) => {
        setVariations(prev => prev.map(v => ({ ...v, isSelected: v.id === id })));
    };

    return (
        <div className={`flex h-screen ${theme === 'light' ? 'bg-[#f9f9f9] text-[#0f0f0f]' : theme === 'black' ? 'bg-black text-white' : 'bg-[#0f0f0f] text-white'} overflow-hidden font-sans transition-colors duration-500`}>
            {/* SVG Colorblind Filters */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                    <filter id="protanopia">
                        <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0 0.558, 0.442, 0, 0, 0 0, 0.242, 0.758, 0, 0 0, 0, 0, 1, 0" />
                    </filter>
                    <filter id="deuteranopia">
                        <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0 0.7, 0.3, 0, 0, 0 0, 0.3, 0.7, 0, 0 0, 0, 0, 1, 0" />
                    </filter>
                    <filter id="tritanopia">
                        <feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0 0, 0.433, 0.567, 0, 0 0, 0.475, 0.525, 0, 0 0, 0, 0, 1, 0" />
                    </filter>
                </defs>
            </svg>

            {/* Simulator Sidebar */}
            <SimulatorSidebar
                viewMode={viewMode} setViewMode={setViewMode}
                device={device} setDevice={setDevice}
                theme={theme} setTheme={setTheme}
                variations={variations}
                addVariation={addVariation}
                removeVariation={removeVariation}
                selectVariation={selectVariation}
                handleUpload={handleUpload}
                showOutliers={showOutliers}
                setShowOutliers={setShowOutliers}
                resetSimulation={resetSimulation}
            />

            <div className="flex-1 flex flex-col min-w-0 bg-[#0f0f0f] overflow-hidden">
                {/* YouTube UI Top Header Mock - Sticky */}
                <div className="sticky top-0 z-50">
                    <YouTubeUIHeader device={device} avatar={meta.avatar} theme={theme} />
                </div>

                <main className="flex-1 overflow-y-auto no-scrollbar relative">
                    <div className={`mx-auto transition-all duration-500 ${device === "mobile" ? "max-w-[420px] pt-8" : device === "tablet" ? "max-w-[800px] pt-8" : "w-full"}`}>
                        {viewMode === "size" ? (
                            <SizeView image={activeThumb} meta={meta} filter={filter} />
                        ) : (
                            <div className={`transition-all duration-500 ${device !== "desktop" ? "bg-[#000] rounded-[60px] border-[12px] border-[#1f1f1f] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden min-h-[85vh] mx-4" : ""}`}>
                                <div className={`${device === "desktop" ? "p-6" : "p-4"}`}>
                                    {layout === "home" && <YouTubeHomeGrid thumbA={thumbA} thumbB={thumbB} filter={filter} meta={meta} device={device} showHeatmap={showHeatmap} theme={theme} showOutliers={showOutliers} />}
                                    {layout === "search" && <YouTubeSearchList thumbA={thumbA} thumbB={thumbB} filter={filter} meta={meta} device={device} showHeatmap={showHeatmap} theme={theme} showOutliers={showOutliers} />}
                                    {layout === "sidebar" && <YouTubeSidebar thumbA={thumbA} thumbB={thumbB} filter={filter} meta={meta} device={device} showHeatmap={showHeatmap} theme={theme} showOutliers={showOutliers} />}
                                    {layout === "compare" && <YouTubeCompareView thumbA={thumbA} thumbB={thumbB} filter={filter} meta={meta} device={device} showHeatmap={showHeatmap} theme={theme} />}
                                </div>
                            </div>
                        )}
                    </div>

                    {showNotification && (
                        <div className="fixed top-20 right-8 z-[100] w-full max-w-sm pointer-events-none">
                            <NotificationMockup meta={meta} image={activeThumb} />
                        </div>
                    )}
                </main>
            </div>

            {/* Analysis Overlays & Mode Switches */}
            <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3 z-[60]">
                <AnimatePresence>
                    <ProAnalysisControls
                        filter={filter} setFilter={setFilter}
                        showHeatmap={showHeatmap} setShowHeatmap={setShowHeatmap}
                        showNotification={showNotification} setShowNotification={setShowNotification}
                        layout={layout} setLayout={setLayout}
                        meta={meta} setMeta={setMeta}
                        handleAvatarUpload={handleAvatarUpload}
                        theme={theme}
                    />
                </AnimatePresence>
            </div>
        </div>
    );
}


/**
 * Professional Sidebar for Simulation Controls
 */
function SimulatorSidebar({
    viewMode, setViewMode,
    device, setDevice,
    theme, setTheme,
    variations,
    addVariation, removeVariation, selectVariation,
    handleUpload,
    showOutliers, setShowOutliers,
    resetSimulation
}) {
    const isLight = theme === 'light';
    const bgClass = isLight ? 'bg-white border-gray-200' : 'bg-[#0f0f0f] border-[#222]';
    const textClass = isLight ? 'text-[#0f0f0f]' : 'text-white';
    const mutedText = isLight ? 'text-gray-500' : 'text-white/40';

    return (
        <aside className={`w-[300px] border-r ${bgClass} flex flex-col shrink-0 h-screen sticky top-0 overflow-hidden transition-colors duration-500`}>
            <div className={`p-6 border-b ${isLight ? 'border-gray-200' : 'border-[#222]'} shrink-0`}>
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 bg-[var(--orange)] rounded-lg flex items-center justify-center shadow-lg shadow-[var(--orange)]/20">
                        <Youtube size={20} className="text-white fill-current" />
                    </div>
                    <span className={`font-black text-xl tracking-tighter uppercase ${textClass}`}>Simulator</span>
                </div>

                <div className={`flex gap-2 p-1 ${isLight ? 'bg-black/5' : 'bg-white/5'} rounded-xl mb-6`}>
                    <button
                        onClick={() => setViewMode("youtube")}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === "youtube" ? "bg-white text-black shadow-md" : mutedText + " hover:text-white"}`}
                    >
                        YouTube View
                    </button>
                    <button
                        onClick={() => setViewMode("size")}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === "size" ? "bg-white text-black shadow-md" : mutedText + " hover:text-white"}`}
                    >
                        Size View
                    </button>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Preview Devices</span>
                </div>
                <div className="flex gap-2 mb-8">
                    {[
                        { id: 'desktop', icon: Monitor },
                        { id: 'tablet', icon: Tablet },
                        { id: 'mobile', icon: Smartphone }
                    ].map(d => (
                        <button
                            key={d.id}
                            onClick={() => setDevice(d.id)}
                            className={`flex-1 py-3 rounded-xl border flex items-center justify-center transition-all ${device === d.id ? "bg-[var(--orange)] border-[var(--orange)] shadow-lg shadow-[var(--orange)]/20" : isLight ? "border-gray-200 bg-gray-50 text-gray-400" : "border-white/10 hover:border-white/20 bg-white/5 text-white/40"}`}
                        >
                            <d.icon size={18} className={device === d.id ? "text-white" : ""} />
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    <ThemeToggle theme={theme} setTheme={setTheme} />
                    <button
                        onClick={resetSimulation}
                        className={`w-full py-3 rounded-xl border text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isLight ? 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                    >
                        <RotateCcw size={14} /> Reset Simulation
                    </button>
                </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
                <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>Thumbnails</span>
                    <button onClick={addVariation} className="w-6 h-6 rounded-md bg-[var(--orange)] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-[var(--orange)]/20">
                        <Plus size={14} />
                    </button>
                </div>

                <div className="space-y-3 mb-8">
                    {variations.map(v => (
                        <div
                            key={v.id}
                            onClick={() => selectVariation(v.id)}
                            className={`group p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${v.isSelected ? "border-[var(--orange)] bg-[var(--orange)]/5" : isLight ? "border-gray-100 bg-gray-50 hover:border-gray-200" : "border-white/5 bg-white/5 hover:border-white/20"}`}
                        >
                            <div className="flex items-start gap-3 relative z-10">
                                <div className={`w-16 aspect-video rounded-lg ${isLight ? 'bg-gray-200' : 'bg-black'} border border-white/10 overflow-hidden shrink-0 relative`}>
                                    {v.image ? (
                                        <img src={v.image} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon size={12} className={isLight ? 'text-gray-400' : 'text-white/20'} />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        className="hidden"
                                        id={`upload-${v.id}`}
                                        onChange={(e) => handleUpload(v.id, e.target.files[0])}
                                    />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); document.getElementById(`upload-${v.id}`).click(); }}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                    >
                                        <Upload size={14} className="text-white" />
                                    </button>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[11px] font-bold truncate ${textClass}`}>{v.name}</p>
                                    <p className={`text-[9px] mt-0.5 ${v.image ? 'text-[var(--orange)] font-bold' : mutedText}`}>{v.image ? "Ready" : "Empty"}</p>
                                </div>
                                {variations.length > 1 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeVariation(v.id); }}
                                        className={`p-1 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ${isLight ? 'text-gray-300' : 'text-white/20'}`}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className={`p-4 rounded-2xl border transition-all ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-bold ${textClass}`}>Show Outliers</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={showOutliers} onChange={(e) => setShowOutliers(e.target.checked)} className="sr-only peer" />
                            <div className="w-8 h-4 bg-black/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[var(--orange)]"></div>
                        </label>
                    </div>
                    <p className={`text-[9px] leading-tight ${mutedText}`}>Simulation of extremely contrasting results to test subject "pop".</p>
                </div>
            </div>
        </aside>
    );
}

function ThemeToggle({ theme, setTheme }) {
    return (
        <div className="flex gap-2">
            {[
                { id: 'dark', color: 'bg-[#0f0f0f]' },
                { id: 'black', color: 'bg-black' },
                { id: 'light', color: 'bg-white' }
            ].map(t => (
                <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`flex-1 h-8 rounded-lg border flex items-center justify-center transition-all ${theme === t.id ? "border-[var(--orange)]" : "border-white/10"}`}
                >
                    <div className={`w-3 h-3 rounded-full ${t.color} border border-white/20`} />
                </button>
            ))}
        </div>
    );
}

function YouTubeUIHeader({ device, avatar, theme }) {
    const isLight = theme === 'light';
    const bgClass = isLight ? 'bg-white border-gray-200' : 'bg-[#0f0f0f] border-white/5';
    const textClass = isLight ? 'text-[#0f0f0f]' : 'text-white';
    const inputBg = isLight ? 'bg-[#f8f8f8] border-gray-300' : 'bg-[#121212] border-[#333]';

    return (
        <header className={`h-[56px] border-b ${bgClass} px-4 flex items-center justify-between shrink-0`}>
            <div className="flex items-center gap-4">
                <Menu size={20} className={`${textClass} cursor-pointer`} />
                <div className="flex items-center gap-1 cursor-pointer">
                    <Youtube size={28} className="text-[var(--orange)] fill-current" />
                    <span className={`font-black text-lg tracking-tighter ${textClass}`}>YouTube</span>
                    <span className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-white/40'} self-start mt-1 ml-0.5`}>IN</span>
                </div>
            </div>

            <div className="hidden md:flex flex-1 max-w-[720px] items-center gap-4 px-10">
                <div className={`flex-1 flex items-center ${inputBg} border rounded-full overflow-hidden focus-within:border-blue-500`}>
                    <input
                        type="text"
                        placeholder="Search"
                        className={`flex-1 bg-transparent px-6 py-2 outline-none text-sm ${textClass}`}
                    />
                    <button className={`px-5 py-2 ${isLight ? 'bg-[#f0f0f0] border-l border-gray-300' : 'bg-[#222] border-l border-[#333]'} hover:bg-gray-200`}>
                        <Search size={18} className={isLight ? 'text-gray-600' : 'text-white/60'} />
                    </button>
                </div>
                <div className={`w-10 h-10 rounded-full ${isLight ? 'bg-[#f0f0f0]' : 'bg-[#181818]'} flex items-center justify-center hover:bg-gray-200 cursor-pointer`}>
                    <Mic size={18} className={textClass} />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-4">
                    <PlusSquare size={20} className={`${textClass} cursor-pointer`} />
                    <Bell size={20} className={`${textClass} cursor-pointer`} />
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-red-500 overflow-hidden cursor-pointer border border-white/20">
                    {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-white/10 text-[10px] font-bold">JD</div>}
                </div>
            </div>
        </header>
    );
}


function SizeView({ image, meta, filter, theme }) {
    const isLight = theme === 'light';
    const textClass = isLight ? 'text-[#0f0f0f]' : 'text-white';
    const mutedText = isLight ? 'text-gray-500' : 'text-white/40';

    const sizes = [
        { name: "Large Home", ratio: "4 columns", w: "320px" },
        { name: "Medium Grid", ratio: "3 columns", w: "280px" },
        { name: "Small Results", ratio: "Search Page", w: "240px" },
        { name: "Sidebar", ratio: "Next Up", w: "168px" },
        { name: "Notification", ratio: "Mobile Pop", w: "120px" }
    ];

    return (
        <div className="p-8 pb-32">
            <h2 className={`text-xl font-bold mb-8 ${textClass}`}>Thumbnails across YouTube</h2>
            <div className="flex flex-wrap items-start gap-12">
                {sizes.map(s => (
                    <div key={s.name} className="flex flex-col gap-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${mutedText}`}>{s.name} ({s.w})</span>
                        <div style={{ width: s.w }}>
                            <ThumbItem
                                image={image}
                                title={meta.title}
                                creator={meta.channel}
                                views={meta.views}
                                time={meta.time}
                                duration={meta.duration}
                                avatar={meta.avatar}
                                verified={meta.verified}
                                filter={filter}
                                compact={s.w === "168px" || s.w === "120px"}
                                theme={theme}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ToggleButton({ active, onClick, icon: Icon, children, theme }) {
    const isLight = theme === 'light';
    const activeClass = "bg-[var(--orange)] border-[var(--orange)] text-white";
    const inactiveClass = isLight ? "bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10";

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[11px] font-bold ${active ? activeClass : inactiveClass}`}
        >
            <Icon size={14} className={active ? "text-white" : (isLight ? "text-gray-400" : "text-white/40")} />
            {children}
        </button>
    );
}

function ProAnalysisControls({ filter, setFilter, showHeatmap, setShowHeatmap, showNotification, setShowNotification, layout, setLayout, meta, setMeta, handleAvatarUpload, theme }) {
    const [isOpen, setIsOpen] = useState(false);
    const isLight = theme === 'light';
    const bgClass = isLight ? 'bg-white' : 'bg-[#1a1a1a]';
    const textClass = isLight ? 'text-[#0f0f0f]' : 'text-white';
    const borderClass = isLight ? 'border-gray-200' : 'border-[#333]';
    const inputBg = isLight ? 'bg-gray-100' : 'bg-white/5';
    const mutedText = isLight ? 'text-gray-500' : 'text-white/40';

    return (
        <div className="flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`w-80 ${bgClass} border ${borderClass} rounded-[32px] p-6 shadow-2xl mb-2`}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <span className={`font-bold ${textClass}`}>Pro Controls</span>
                            <button onClick={() => setIsOpen(false)} className={`w-8 h-8 rounded-full ${inputBg} flex items-center justify-center hover:opacity-80`}>
                                <X size={14} className={textClass} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className={`text-[10px] font-black uppercase ${mutedText} tracking-widest`}>Metadata</label>
                                <textarea
                                    value={meta.title}
                                    onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                                    className={`w-full ${inputBg} border ${isLight ? 'border-gray-200' : 'border-white/10'} rounded-xl px-4 py-3 text-xs outline-none focus:border-[var(--orange)] h-20 resize-none ${textClass}`}
                                />
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => document.getElementById('avatar-up-pro').click()}
                                        className={`p-2 aspect-square ${inputBg} border ${isLight ? 'border-gray-200' : 'border-white/10'} rounded-xl hover:opacity-80`}
                                    >
                                        <ImageIcon size={14} className={textClass} />
                                        <input id="avatar-up-pro" type="file" className="hidden" onChange={(e) => handleAvatarUpload(e.target.files[0])} />
                                    </button>
                                    <input
                                        value={meta.channel}
                                        onChange={(e) => setMeta({ ...meta, channel: e.target.value })}
                                        className={`flex-1 ${inputBg} border ${isLight ? 'border-gray-200' : 'border-white/10'} rounded-xl px-4 py-2 text-xs ${textClass}`}
                                        placeholder="Channel Name"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <ToggleButton active={showHeatmap} onClick={() => setShowHeatmap(!showHeatmap)} icon={Zap} theme={theme}>Heatmap</ToggleButton>
                                <ToggleButton active={showNotification} onClick={() => setShowNotification(!showNotification)} icon={Bell} theme={theme}>Notify</ToggleButton>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Visual Tests</label>
                                <div className="flex flex-wrap gap-2">
                                    {['none', 'blur', 'greyscale', 'dim'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${filter === f ? "border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)]" : "border-white/10 text-white/40"}`}
                                        >
                                            {f.charAt(0).toUpperCase() + f.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Layouts</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['home', 'search', 'sidebar', 'compare'].map(l => (
                                        <button
                                            key={l}
                                            onClick={() => setLayout(l)}
                                            className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all uppercase tracking-tighter ${layout === l ? "border-[var(--orange)] bg-[var(--orange)] text-white" : "border-white/10 text-white/40"}`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-500 ${isOpen ? "bg-white text-black rotate-90" : "bg-[var(--orange)] text-white hover:scale-110"}`}
            >
                {isOpen ? <X size={24} /> : <PenTool size={24} />}
            </button>
        </div>
    );
}

function NotificationMockup({ meta, image }) {
    return (
        <div className="w-full max-w-sm bg-[var(--primary-black)]/95 backdrop-blur-xl border border-white/10 rounded-[32px] p-4 shadow-2xl animate-in slide-in-from-top duration-500 pointer-events-auto">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--orange)] flex items-center justify-center p-2 shadow-lg shrink-0">
                    <Youtube size={24} className="text-white fill-current" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[13px] font-bold">YouTube</span>
                        <span className="text-[11px] text-white/40">just now</span>
                    </div>
                    <p className="text-[14px] leading-tight line-clamp-2">
                        <span className="font-bold">{meta.channel}</span> uploaded: {meta.title}
                    </p>
                    <div className="mt-3 aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/5">
                        {image && <img src={image} className="w-full h-full object-cover" />}
                    </div>
                </div>
            </div>
        </div>
    );
}


const CATEGORIES = ["All", "Gaming", "Live", "Music", "Tech", "Podcasts", "Recently uploaded", "Watched", "New to you"];

function FilterChips({ isMobile, theme }) {
    const isLight = theme === 'light';
    return (
        <div className={`flex items-center gap-3 overflow-x-auto no-scrollbar py-4 mb-2 ${isMobile ? "px-4" : "px-0"}`}>
            {CATEGORIES.map((cat, i) => (
                <button
                    key={cat}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${i === 0
                        ? (isLight ? "bg-black text-white border-black" : "bg-white text-black border-white")
                        : (isLight ? "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200" : "bg-white/5 text-white/60 border-white/5 hover:border-white/10 hover:bg-white/10")}`}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
}

function MobileTabBar({ theme }) {
    const isLight = theme === 'light';
    const bgClass = isLight ? 'bg-white border-gray-200' : 'bg-[#0f0f0f] border-white/5';
    const textClass = isLight ? 'text-[#0f0f0f]' : 'text-white';
    const mutedText = isLight ? 'text-gray-400' : 'text-white/40';

    return (
        <div className={`fixed bottom-0 left-0 w-full ${bgClass} border-t flex items-center justify-around py-3 px-1 z-50`}>
            <div className={`flex flex-col items-center gap-1 ${textClass}`}>
                <Youtube size={22} className="fill-current" />
                <span className="text-[10px] font-bold">Home</span>
            </div>
            <div className={`flex flex-col items-center gap-1 ${mutedText}`}>
                <PlaySquare size={22} />
                <span className="text-[10px] font-bold">Shorts</span>
            </div>
            <div className={`flex flex-col items-center justify-center ${textClass}`}>
                <PlusSquare size={36} strokeWidth={1} />
            </div>
            <div className={`flex flex-col items-center gap-1 ${mutedText}`}>
                <ListPlus size={22} />
                <span className="text-[10px] font-bold">Subs</span>
            </div>
            <div className={`flex flex-col items-center gap-1 ${mutedText}`}>
                <Library size={22} />
                <span className="text-[10px] font-bold">You</span>
            </div>
        </div>
    );
}

function ThumbItem({ image, title, creator, views, time, duration, filter, avatar, verified, isLive, device, showHeatmap, compact, theme }) {
    const isMobile = device === "mobile";
    const isLight = theme === 'light';
    const textClass = isLight ? 'text-[#0f0f0f]' : 'text-white';
    const mutedText = isLight ? 'text-gray-500' : 'text-[#aaaaaa]';

    const getFilter = () => {
        if (filter === "blur") return "blur(8px)";
        if (filter === "greyscale") return "grayscale(100%)";
        if (filter === "dim") return "brightness(35%)";
        if (filter === "protanopia") return "url(#protanopia)";
        if (filter === "deuteranopia") return "url(#deuteranopia)";
        if (filter === "tritanopia") return "url(#tritanopia)";
        return "none";
    };

    if (compact) {
        return (
            <div className="flex flex-col gap-1.5 cursor-pointer group">
                <div className={`aspect-video ${isLight ? 'bg-gray-200' : 'bg-[#2f2f2f]'} rounded-lg overflow-hidden relative border border-white/5`}>
                    {image ? (
                        <img src={image} className="w-full h-full object-cover" style={{ filter: getFilter() }} />
                    ) : (
                        <div className={`w-full h-full ${isLight ? 'bg-gray-100' : 'bg-[#1a1a1a]'}`} />
                    )}
                    <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[9px] font-black text-white uppercase tracking-tighter">{duration || "10:00"}</div>
                </div>
                <div className="pt-0.5">
                    <h3 className={`text-[11px] font-bold ${textClass} line-clamp-2 leading-tight mb-0.5`}>{title}</h3>
                    <p className={`text-[9px] ${mutedText}`}>{creator}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 group cursor-pointer w-full relative">
            <div className={`aspect-video ${isLight ? 'bg-gray-200' : 'bg-[#2f2f2f]'} overflow-hidden relative transition-all duration-300 ${isMobile ? "rounded-none" : "rounded-2xl group-hover:rounded-none shadow-2xl"}`}>
                {image ? (
                    <img
                        src={image}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        style={{ filter: getFilter() }}
                    />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center ${isLight ? 'bg-gray-100 text-gray-300' : 'text-white/5 bg-[#1a1a1a]'}`}>
                        <ImageIcon size={isMobile ? 32 : 48} strokeWidth={1} />
                    </div>
                )}

                {showHeatmap && (
                    <div className="absolute inset-0 pointer-events-none opacity-60 mix-blend-screen bg-gradient-to-tr from-[#000000] via-[#C10801] to-[#F16001] animate-pulse" />
                )}

                {!isLive && (
                    <div className="absolute bottom-3 right-3 px-1.5 py-0.5 bg-black/80 rounded text-[12px] font-black text-white tracking-tight">
                        {duration || "12:45"}
                    </div>
                )}

                {isLive && (
                    <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-[#C10801] rounded-sm text-[11px] font-black text-white uppercase tracking-tighter">
                        Live
                    </div>
                )}
            </div>

            <div className={`flex gap-3 ${isMobile ? "px-4 pb-4" : "px-0"}`}>
                <div className={`w-10 h-10 rounded-full ${isLight ? 'bg-gray-100 border-gray-200' : 'bg-white/5 border-white/10'} border overflow-hidden flex-shrink-0`}>
                    {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-black bg-gradient-to-tr from-[#C10801]/20 to-[#F16001]/20 text-white/20">JD</div>}
                </div>
                <div className="flex flex-col flex-1 min-w-0 pr-4">
                    <h3 className={`text-[14px] sm:text-[16px] font-bold ${textClass} line-clamp-2 leading-tight mb-1.5 group-hover:text-white transition-colors`}>
                        {title}
                    </h3>
                    <div className={`flex flex-col text-[12px] sm:text-[14px] ${mutedText}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="hover:text-white transition-colors truncate">{creator}</span>
                            {verified && <CheckCircle2 size={12} className="fill-current" />}
                        </div>
                        <div className="flex items-center gap-1">
                            <span>{views} views</span>
                            <span>•</span>
                            <span>{time}</span>
                        </div>
                    </div>
                </div>
                <MoreVertical size={18} className={`${isLight ? 'text-gray-300' : 'text-white/20'} mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity`} />
            </div>
        </div>
    );
}

function YouTubeHomeGrid({ thumbA, thumbB, filter, meta, device, showHeatmap, theme, showOutliers }) {
    const isMobile = device === "mobile";
    const bgClass = theme === "black" ? "bg-black" : theme === "light" ? "bg-white" : theme === "dark" ? "bg-[#0f0f0f]" : "bg-[#0f0f0f]";
    const displayVideos = showOutliers ? [...OUTLIER_VIDEOS, ...MOCK_VIDEOS] : MOCK_VIDEOS;

    return (
        <div className={`flex flex-col min-h-full ${bgClass} transition-colors duration-500 pb-20`}>
            {device !== "mobile" && <FilterChips isMobile={isMobile} theme={theme} />}
            <div className={`grid gap-x-4 gap-y-10 mt-2 ${isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
                {thumbA && <ThumbItem device={device} image={thumbA} title={meta.title} creator={meta.channel} views={meta.views} time={meta.time} duration={meta.duration} avatar={meta.avatar} filter={filter} verified={meta.verified} isLive={meta.isLive} showHeatmap={showHeatmap} theme={theme} />}
                {thumbB && <ThumbItem device={device} image={thumbB} title={meta.title + " (B)"} creator={meta.channel} views={meta.views} time={meta.time} duration={meta.duration} avatar={meta.avatar} filter={filter} verified={meta.verified} showHeatmap={showHeatmap} theme={theme} />}
                {displayVideos.map(v => <ThumbItem key={v.id} device={device} image={v.thumbnail} title={v.title} creator={v.channel} views={v.views} time={v.time} duration={v.duration} avatar={v.avatar} verified={v.verified} showHeatmap={showHeatmap} theme={theme} />)}
            </div>
            {isMobile && <MobileTabBar theme={theme} />}
        </div>
    );
}

function YouTubeSearchList({ thumbA, thumbB, filter, meta, device, showHeatmap, theme, showOutliers }) {
    const isMobile = device === "mobile";
    const isLight = theme === 'light';
    const bgClass = theme === "black" ? "bg-black" : isLight ? "bg-white" : "bg-[#0f0f0f]";
    const textClass = isLight ? 'text-[#0f0f0f]' : 'text-white';
    const mutedText = isLight ? 'text-gray-500' : 'text-white/40';
    const borderClass = isLight ? 'border-gray-200' : 'border-white/10';
    const displayVideos = showOutliers ? [...OUTLIER_VIDEOS, ...MOCK_VIDEOS] : MOCK_VIDEOS;
    const [showFilters, setShowFilters] = useState(false);

    const SearchItem = ({ image, title, creator, views, time, avatar, verified, duration, desc }) => (
        <div className={`flex ${isMobile ? "flex-col" : "flex-row"} gap-4 mb-4 group cursor-pointer w-full`}>
            <div className={`${isMobile ? "w-full" : "w-[360px]"} aspect-video ${isLight ? 'bg-gray-100' : 'bg-[#2f2f2f]'} sm:rounded-2xl overflow-hidden shrink-0 relative transition-all duration-300 group-hover:rounded-none`}>
                {image ? <img src={image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" style={{ filter: filter === 'blur' ? 'blur(8px)' : 'none' }} /> : <div className="w-full h-full bg-[#1a1a1a]" />}
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-[12px] font-black text-white">{duration || "15:00"}</div>
                {showHeatmap && <div className="absolute inset-0 pointer-events-none opacity-60 mix-blend-screen bg-gradient-to-tr from-[#000000] via-[#C10801] to-[#F16001] animate-pulse" />}
            </div>
            <div className={`flex-1 py-1 ${isMobile ? "px-4" : "px-0"}`}>
                <h3 className={`text-lg font-bold ${textClass} line-clamp-2 mb-1 group-hover:text-[var(--orange)] transition-colors`}>{title}</h3>
                <div className={`flex items-center gap-1 text-[13px] ${mutedText} mb-3`}>
                    <span>{views} views</span><span>•</span><span>{time}</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                        {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <div className={`w-full h-full ${isLight ? 'bg-gray-200' : 'bg-white/10'}`} />}
                    </div>
                    <span className={`text-[13px] ${mutedText} font-bold hover:text-white transition-colors`}>{creator}</span>
                    {verified && <CheckCircle2 size={12} className={`${isLight ? 'text-gray-400' : 'text-white/20'} fill-current`} />}
                </div>
                {!isMobile && <p className={`text-[13px] ${mutedText} line-clamp-1 leading-relaxed`}>{desc || "The standard in YouTube thumbnail testing and mockup tools."}</p>}
            </div>
        </div>
    );

    return (
        <div className={`flex flex-col min-h-full ${bgClass} pb-32`}>
            {device !== "mobile" && (
                <div className="max-w-[1096px] mx-auto w-full px-4">
                    <div className={`flex items-center justify-between py-2 border-b ${borderClass} mb-4`}>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-lg transition-colors text-sm font-bold ${textClass}`}
                        >
                            <SlidersHorizontal size={16} />
                            Filters
                        </button>
                    </div>
                    {showFilters && (
                        <div className={`grid grid-cols-4 gap-8 py-6 border-b ${borderClass} mb-8 animate-in fade-in slide-in-from-top-4 duration-300`}>
                            {[
                                { title: "Upload Date", items: ["Last hour", "Today", "This week", "This month"] },
                                { title: "Type", items: ["Video", "Channel", "Playlist", "Movie"] },
                                { title: "Duration", items: ["Under 4 mins", "4-20 mins", "Over 20 mins"] },
                                { title: "Features", items: ["Live", "4K", "HD", "Subtitles"] }
                            ].map(group => (
                                <div key={group.title} className="space-y-4">
                                    <h4 className={`text-[12px] font-black uppercase tracking-widest ${mutedText}`}>{group.title}</h4>
                                    <div className="space-y-2">
                                        {group.items.map(item => (
                                            <div key={item} className={`text-sm ${mutedText} hover:text-white cursor-pointer transition-colors`}>{item}</div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            <div className="max-w-[1096px] mx-auto w-full px-4 pt-4">
                {thumbA && <SearchItem image={thumbA} title={meta.title} creator={meta.channel} views={meta.views} time={meta.time} avatar={meta.avatar} verified={meta.verified} duration={meta.duration} desc={meta.descSnippet} />}
                {thumbB && <SearchItem image={thumbB} title={meta.title + " (B)"} creator={meta.channel} views={meta.views} time={meta.time} avatar={meta.avatar} verified={meta.verified} duration={meta.duration} desc={meta.descSnippet} />}
                {displayVideos.map(v => <SearchItem key={v.id} image={v.thumbnail} title={v.title} creator={v.channel} views={v.views} time={v.time} avatar={v.avatar} verified={v.verified} duration={v.duration} />)}
            </div>
            {isMobile && <MobileTabBar theme={theme} />}
        </div>
    );
}

function YouTubeSidebar({ thumbA, thumbB, filter, meta, device, showHeatmap, theme, showOutliers }) {
    const isMobile = device === "mobile";
    const isLight = theme === 'light';
    const bgClass = theme === "black" ? "bg-black" : isLight ? "bg-white" : "bg-[#0f0f0f]";
    const textClass = isLight ? 'text-[#0f0f0f]' : 'text-white';
    const mutedText = isLight ? 'text-gray-500' : 'text-white/40';
    const borderClass = isLight ? 'border-gray-200' : 'border-white/10';
    const displayVideos = showOutliers ? [...OUTLIER_VIDEOS, ...MOCK_VIDEOS] : MOCK_VIDEOS;

    const SidebarItem = ({ image, title, creator, views, time, duration }) => (
        <div className="flex gap-2 mb-3 group cursor-pointer">
            <div className={`w-40 aspect-video ${isLight ? 'bg-gray-100' : 'bg-[#2f2f2f]'} rounded-lg overflow-hidden shrink-0 relative border border-white/5`}>
                {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-[10px] font-black text-white">{duration || "10:00"}</div>
                {showHeatmap && <div className="absolute inset-0 pointer-events-none opacity-60 mix-blend-screen bg-gradient-to-tr from-[#000000] via-[#C10801] to-[#F16001] animate-pulse" />}
            </div>
            <div className="flex-1 min-w-0 pr-4">
                <h4 className={`text-[13px] font-bold ${textClass} line-clamp-2 leading-tight group-hover:text-[var(--orange)] transition-colors`}>{title}</h4>
                <p className={`text-[11px] ${mutedText} mt-1 hover:opacity-100 transition-opacity`}>{creator}</p>
                <div className={`flex items-center gap-1 text-[11px] ${mutedText}`}>
                    <span>{views} views</span><span>•</span><span>{time}</span>
                </div>
            </div>
        </div>
    );

    const Comment = ({ user, time, text, likes }) => (
        <div className="flex gap-4 mb-6">
            <div className={`w-10 h-10 rounded-full ${isLight ? 'bg-gray-100' : 'bg-white/5'} shrink-0`} />
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${textClass}`}>{user}</span>
                    <span className={`text-[11px] ${mutedText}`}>{time}</span>
                </div>
                <p className={`text-sm ${textClass} leading-snug`}>{text}</p>
                <div className={`flex items-center gap-4 mt-2 ${mutedText}`}>
                    <div className="flex items-center gap-1 cursor-pointer hover:opacity-100"><ThumbsUp size={14} /> <span className="text-xs">{likes}</span></div>
                    <div className="cursor-pointer hover:opacity-100"><ThumbsDown size={14} /></div>
                    <span className="text-xs font-bold cursor-pointer hover:opacity-100">Reply</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`flex flex-col min-h-full ${bgClass} pb-32 transition-colors duration-500`}>
            {device !== "mobile" && <FilterChips isMobile={isMobile} theme={theme} />}
            <div className={`flex ${isMobile ? "flex-col" : "flex-row"} gap-6 px-4 md:px-6`}>
                <div className="flex-1">
                    {/* Video Player Section */}
                    <div className={`aspect-video ${isLight ? 'bg-gray-100' : 'bg-black'} rounded-2xl border ${isLight ? 'border-gray-200' : 'border-white/10'} mb-6 flex items-center justify-center overflow-hidden shadow-2xl relative group`}>
                        <Youtube size={64} className={isLight ? 'text-gray-200' : 'text-white/5'} />

                        {/* Player UI Overlay */}
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="h-1 bg-white/30 w-full rounded-full mb-3 relative overflow-hidden">
                                <div className="absolute inset-y-0 left-0 bg-[var(--orange)] w-1/3 shadow-[0_0_10px_rgba(232,80,2,0.5)]" />
                            </div>
                            <div className="flex items-center justify-between text-white">
                                <div className="flex items-center gap-4">
                                    <Play size={18} fill="currentColor" />
                                    <SkipForward size={18} fill="currentColor" />
                                    <Volume2 size={18} />
                                    <span className="text-[12px] font-bold">12:45 / 35:00</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Settings size={18} />
                                    <Maximize size={18} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h1 className={`text-xl font-bold leading-tight ${textClass}`}>{meta.title}</h1>
                        <div className={`flex items-center justify-between pb-4 border-b ${borderClass}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full ${isLight ? 'bg-gray-100' : 'bg-white/5'} border border-white/10`} />
                                <div className="flex flex-col">
                                    <span className={`font-bold ${textClass}`}>{meta.channel}</span>
                                    <span className={`text-[11px] ${mutedText}`}>1.2M subscribers</span>
                                </div>
                                <button className={`${isLight ? 'bg-black text-white' : 'bg-white text-black'} px-4 py-1.5 rounded-full text-xs font-bold ml-4 hover:scale-105 transition-transform`}>Subscribe</button>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`flex ${isLight ? 'bg-gray-100' : 'bg-white/5'} rounded-full px-4 py-2 text-xs font-bold gap-6 border ${borderClass} ${textClass}`}>
                                    <button className="flex items-center gap-2"><ThumbsUp size={16} /> 45K</button>
                                    <button className="flex items-center gap-2"><ThumbsDown size={16} /></button>
                                </div>
                                <button className={`flex items-center gap-2 ${isLight ? 'bg-gray-100' : 'bg-white/5'} rounded-full px-4 py-2 text-xs font-bold border ${borderClass} ${textClass}`}>
                                    <Share2 size={16} /> Share
                                </button>
                            </div>
                        </div>

                        {/* Description Mockup */}
                        <div className={`p-3 rounded-xl ${isLight ? 'bg-gray-100' : 'bg-white/5'} mt-4`}>
                            <div className={`flex gap-2 text-sm font-bold ${textClass} mb-1`}>
                                <span>850,234 views</span>
                                <span>Nov 24, 2024</span>
                            </div>
                            <p className={`text-sm ${textClass} line-clamp-3`}>
                                In this video we dive deep into the world of thumbnail optimization. Testing variations is key to success on the platform...
                            </p>
                            <button className={`text-sm font-bold mt-2 ${textClass}`}>...more</button>
                        </div>

                        {/* Comments Section */}
                        {!isMobile && (
                            <div className="mt-8">
                                <div className={`flex items-center gap-6 mb-8 ${textClass}`}>
                                    <span className="text-lg font-bold">1,234 Comments</span>
                                    <button className="flex items-center gap-2 text-sm font-bold"><Menu size={16} /> Sort by</button>
                                </div>
                                <div className="flex gap-4 mb-8">
                                    <div className={`w-10 h-10 rounded-full ${isLight ? 'bg-gray-100' : 'bg-white/5'} shrink-0`} />
                                    <input
                                        type="text"
                                        placeholder="Add a comment..."
                                        className={`flex-1 bg-transparent border-b ${borderClass} pb-1 outline-none text-sm ${textClass} focus:border-white`}
                                    />
                                </div>
                                <Comment user="@DesignMaster" time="2 days ago" text="Variation B is definitely popping way more on my screen. The contrast is perfect!" likes="1.2K" />
                                <Comment user="@CreatorDaily" time="1 week ago" text="Love the new format. Keep it up!" likes="432" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Recommendations */}
                <div className={`${isMobile ? "w-full" : "w-[380px]"} shrink-0`}>
                    <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                        {['All', 'Related', 'Recently uploaded', 'Watched'].map((t, i) => (
                            <button key={t} className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${i === 0
                                ? (isLight ? "bg-black text-white border-black" : "bg-white text-black border-white")
                                : (isLight ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-white/5 text-white/40 border-white/5")}`}>{t}</button>
                        ))}
                    </div>
                    {thumbA && <SidebarItem image={thumbA} title={meta.title} creator={meta.channel} views={meta.views} time={meta.time} duration={meta.duration} />}
                    {thumbB && <SidebarItem image={thumbB} title={meta.title + " (B)"} creator={meta.channel} views={meta.views} time={meta.time} duration={meta.duration} />}
                    {displayVideos.map(v => <SidebarItem key={v.id} image={v.thumbnail} title={v.title} creator={v.channel} views={v.views} time={v.time} duration={v.duration} />)}
                </div>
            </div>
            {isMobile && <MobileTabBar theme={theme} />}
        </div>
    );
}

function YouTubeCompareView({ thumbA, thumbB, filter, meta, device, showHeatmap, theme }) {
    const isMobile = device === "mobile";
    const isLight = theme === 'light';
    const bgClass = theme === "black" ? "bg-black" : isLight ? "bg-white" : "bg-[#0f0f0f]";
    const textClass = isLight ? 'text-[#0f0f0f]' : 'text-white';
    const mutedText = isLight ? 'text-gray-500' : 'text-white/40';
    const borderClass = isLight ? 'border-gray-200' : 'border-white/10';

    return (
        <div className={`flex flex-col min-h-full ${bgClass} pb-32 transition-colors duration-500 px-4 md:px-0`}>
            <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-2"} gap-8 pt-4`}>
                <div className="space-y-6">
                    <div className={`py-2 text-center ${isLight ? 'bg-black/5 border-black/5' : 'bg-white/5 border-white/5'} rounded-xl border`}>
                        <span className="text-[10px] font-black uppercase text-[var(--orange)] tracking-widest">Variation A</span>
                    </div>
                    <ThumbItem image={thumbA} title={meta.title} creator={meta.channel} views={meta.views} time={meta.time} duration={meta.duration} avatar={meta.avatar} verified={meta.verified} filter={filter} showHeatmap={showHeatmap} theme={theme} />

                    {/* Analysis Tools for A */}
                    <div className="grid grid-cols-2 gap-4">
                        <CTRGauge score={72} theme={theme} label="Current CTR" />
                        <ColorPalette theme={theme} colors={['#FF0000', '#000000', '#FFFFFF', '#4A4A4A']} />
                    </div>
                </div>
                <div className="space-y-6">
                    <div className={`py-2 text-center ${isLight ? 'bg-black/5 border-black/5' : 'bg-white/5 border-white/5'} rounded-xl border`}>
                        <span className="text-[10px] font-black uppercase text-[var(--orange)] tracking-widest">Variation B</span>
                    </div>
                    <ThumbItem image={thumbB} title={meta.title} creator={meta.channel} views={meta.views} time={meta.time} duration={meta.duration} avatar={meta.avatar} verified={meta.verified} filter={filter} showHeatmap={showHeatmap} theme={theme} />

                    {/* Analysis Tools for B */}
                    <div className="grid grid-cols-2 gap-4">
                        <CTRGauge score={94} theme={theme} label="Predicted CTR" />
                        <ColorPalette theme={theme} colors={['#FFD700', '#000000', '#FF4500', '#FFFFFF']} />
                    </div>
                </div>
            </div>

            <div className={`mt-12 p-8 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'} border rounded-[32px]`}>
                <h3 className={`text-xl font-bold mb-6 flex items-center gap-3 ${textClass}`}>
                    <Zap className="text-[var(--orange)]" size={24} />
                    Professional Intelligence Report
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                        <p className={`text-[10px] font-black uppercase ${mutedText} tracking-widest`}>Visual Composition</p>
                        <MetricItem label="Variation A (Contrast)" value="Moderate" score="good" theme={theme} />
                        <MetricItem label="Variation B (Contrast)" value="Excellent" score="great" theme={theme} />
                    </div>
                    <div className="space-y-4">
                        <p className={`text-[10px] font-black uppercase ${mutedText} tracking-widest`}>Readability Score</p>
                        <MetricItem label="Standard View" value="84%" score="good" theme={theme} />
                        <MetricItem label="Mobile View" value="96%" score="great" theme={theme} />
                    </div>
                    <div className="p-6 bg-gradient-to-br from-[#000000] via-[#C10801] to-[#F16001] rounded-2xl flex flex-col justify-between shadow-lg shadow-[var(--orange)]/20 text-white">
                        <div>
                            <span className="text-xs font-black uppercase text-white/60 tracking-widest mb-2 block">Executive Summary</span>
                            <p className="text-sm font-bold leading-tight">Variation B's high-saturation orange and centered subject focus results in a 24% higher visual saliency compared to Variation A.</p>
                        </div>
                        <button className="mt-4 bg-white text-black py-2 rounded-xl text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-transform">Export Full PDF Report</button>
                    </div>
                </div>
            </div>
            {isMobile && <MobileTabBar theme={theme} />}
        </div>
    );
}

function CTRGauge({ score, theme, label }) {
    const isLight = theme === 'light';
    const textClass = isLight ? 'text-[#0f0f0f]' : 'text-white';

    return (
        <div className={`p-4 rounded-2xl ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'} border flex flex-col items-center gap-2`}>
            <div className="relative w-16 h-16">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path className={`stroke-current ${isLight ? 'text-gray-200' : 'text-white/10'}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" />
                    <path className="stroke-current text-[var(--orange)]" strokeDasharray={`${score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-black ${textClass}`}>{score}%</div>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-gray-500' : 'text-white/40'}`}>{label}</span>
        </div>
    );
}

function ColorPalette({ colors, theme }) {
    const isLight = theme === 'light';
    return (
        <div className={`p-4 rounded-2xl ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'} border flex flex-col gap-3`}>
            <div className="flex gap-1.5 justify-center">
                {colors.map((c, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border border-white/10 shadow-sm" style={{ backgroundColor: c }} title={c} />
                ))}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest text-center ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Dominant Colors</span>
        </div>
    );
}

function MetricItem({ label, value, score, theme }) {
    const isLight = theme === 'light';
    const color = score === "great" ? "text-[#F16001]" : score === "good" ? "text-[var(--orange)]" : "text-[#C10801]";
    return (
        <div className={`flex items-center justify-between p-4 ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-black/40 border-white/5'} rounded-xl border`}>
            <span className={`text-sm font-bold ${isLight ? 'text-gray-600' : 'opacity-60 text-white'}`}>{label}</span>
            <span className={`text-sm font-black ${color}`}>{value}</span>
        </div>
    );
}
