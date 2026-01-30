import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Users, Crown, Medal, Activity } from 'lucide-react';
import MetaTags from "../MetaTags";

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE || "";

const RankBadge = ({ rank }) => {
    if (rank === 1) return <Crown className="text-yellow-400 drop-shadow-glow" size={32} fill="currentColor" />;
    if (rank === 2) return <Medal className="text-gray-300" size={28} fill="currentColor" />;
    if (rank === 3) return <Medal className="text-amber-700" size={28} fill="currentColor" />;
    return <span className="text-xl font-bold text-[var(--text-muted)] w-8 text-center">#{rank}</span>;
};

export default function EditorLeaderboardPage() {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetch(`${AUTH_BASE}/videos`);
                const data = await res.json();
                setVideos(data.videos || []);
            } catch (e) {
                console.error("Failed to load leaderboard data");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Aggregate Stats by Editor
    const leaderboard = useMemo(() => {
        const stats = {};

        videos.forEach(v => {
            const editor = v.attributedTo || "Unknown";
            // Skip unassigned or "Shinel Studios" generic if desired, but let's keep all for now
            if (!stats[editor]) {
                stats[editor] = { name: editor, views: 0, hype: 0, videos: 0 };
            }
            stats[editor].views += (v.youtubeViews || 0);
            stats[editor].hype += (v.hype || 0);
            stats[editor].videos += 1;
        });

        // Convert to array and sort
        // Sorting metric: Primarily Hype (Performance), tie-break Views
        return Object.values(stats)
            .sort((a, b) => b.hype - a.hype || b.views - a.views)
            .map((editor, index) => ({ ...editor, rank: index + 1 }));

    }, [videos]);

    return (
        <div className="min-h-screen bg-[var(--surface)] text-[var(--text)] pt-32 pb-24 relative overflow-hidden">
            <MetaTags
                title="Editor Hall of Fame - Shinel Studios"
                description="Top performing editors driving retention and views."
            />

            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[var(--surface-alt)] to-transparent pointer-events-none" />
            <div className="absolute top-20 right-0 w-96 h-96 bg-[var(--orange)]/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <div className="inline-flex items-center gap-2 text-[var(--orange)] font-bold text-sm tracking-widest uppercase mb-4">
                        <Trophy size={16} />
                        Performance Leaderboard
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black mb-6">
                        Hall of <span className="text-[var(--orange)]">Fame</span>
                    </h1>
                    <p className="text-lg text-[var(--text-muted)]">
                        Celebrating the retention architects driving millions of views.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto">
                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-24 bg-[var(--surface-alt)] rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {leaderboard.map((editor, idx) => (
                                <motion.div
                                    key={editor.name}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`relative p-6 rounded-2xl border transition-all hover:scale-[1.01] ${idx === 0
                                        ? "bg-gradient-to-r from-[var(--surface-alt)] to-[var(--orange)]/5 border-[var(--orange)] shadow-xl shadow-[var(--orange)]/10"
                                        : "bg-[var(--surface-alt)] border-[var(--border)] hover:border-[var(--text-muted)]"
                                        }`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="flex-shrink-0 w-12 flex justify-center">
                                            <RankBadge rank={editor.rank} />
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="text-xl font-black">{editor.name}</h3>
                                            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Activity size={12} /> {editor.videos} Videos
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-8">
                                            <div>
                                                <div className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Total Views</div>
                                                <div className="text-xl font-bold flex items-center gap-2">
                                                    <Users size={16} className="text-[var(--text-muted)]" />
                                                    {(editor.views / 1000000).toFixed(1)}M
                                                </div>
                                            </div>

                                            <div className="bg-[var(--surface)] px-4 py-2 rounded-xl border border-[var(--border)] min-w-[100px] text-center">
                                                <div className="text-[10px] font-black uppercase text-[var(--orange)] mb-1 flex items-center justify-center gap-1">
                                                    <TrendingUp size={10} /> Hype
                                                </div>
                                                <div className="text-2xl font-black text-[var(--orange)]">
                                                    {editor.hype.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {leaderboard.length === 0 && (
                                <div className="text-center py-12 text-[var(--text-muted)]">
                                    No editor data found. Assign editors to videos in the Admin Dashboard to populate this board.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
