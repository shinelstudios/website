import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Hash } from 'lucide-react';
import { getAllPosts } from '../../lib/blog';
import BlogCard from './BlogCard';
import MetaTags from '../MetaTags';
import ScanLines from '../animations/ScanLines';
import { Kicker, Display, Lede, RevealOnScroll } from '../../design';

const BlogIndex = () => {
    const [posts, setPosts] = useState([]);
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [selectedTag, setSelectedTag] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    const [allTags, setAllTags] = useState(['All']);

    useEffect(() => {
        const loadPosts = async () => {
            const data = await getAllPosts();
            setPosts(data);
            setFilteredPosts(data);

            // Extract unique tags
            const tags = new Set(['All']);
            data.forEach(p => p.frontmatter.tags?.forEach(t => tags.add(t)));
            setAllTags(Array.from(tags));

            setLoading(false);
        };
        loadPosts();
    }, []);

    useEffect(() => {
        let res = posts;

        if (selectedTag !== 'All') {
            res = res.filter(p => p.frontmatter.tags?.includes(selectedTag));
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            res = res.filter(p =>
                p.frontmatter.title.toLowerCase().includes(q) ||
                p.frontmatter.excerpt.toLowerCase().includes(q)
            );
        }

        setFilteredPosts(res);
    }, [selectedTag, searchQuery, posts]);

    return (
        <div className="min-h-screen pt-24 pb-20 bg-[var(--surface)] text-[var(--text)] relative overflow-hidden">
            {/* Scan Lines Background Animation */}
            <ScanLines
                color="#E85002"
                opacity={0.08}
                lineCount={20}
                speed="medium"
            />

            <MetaTags
                title="Insights & Strategies | Shinel Studios Blog"
                description="Expert guides on YouTube growth, video editing, retention strategies, and thumbnail design."
            />

            <div className="container mx-auto px-4 md:px-6 max-w-7xl relative z-10">
                {/* Editorial hero */}
                <div className="max-w-3xl mb-12 md:mb-16">
                    <RevealOnScroll>
                        <Kicker className="mb-5">The Growth Lab</Kicker>
                    </RevealOnScroll>
                    <RevealOnScroll delay="80ms">
                        <Display as="h1" size="xl" className="mb-5">
                            Field notes from <span style={{ color: "var(--orange)" }}>the edit bay.</span>
                        </Display>
                    </RevealOnScroll>
                    <RevealOnScroll delay="160ms">
                        <Lede>
                            Deep dives into retention psychology, YouTube algorithm patterns, thumbnail decisions, and the craft of post-production. Written by the people who actually cut the videos.
                        </Lede>
                    </RevealOnScroll>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 border-b border-[var(--border)] pb-8">
                    {/* Tags Scroll */}
                    <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(tag)}
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedTag === tag
                                    ? 'bg-[var(--orange)] text-white shadow-lg shadow-orange-500/20'
                                    : 'bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <input
                            type="text"
                            placeholder="Search articles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] focus:border-[var(--orange)] outline-none transition-colors text-sm font-medium text-[var(--text)]"
                        />
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map(n => (
                            <div key={n} className="h-96 rounded-2xl bg-[var(--surface-alt)] animate-pulse" />
                        ))}
                    </div>
                ) : filteredPosts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPosts.map((post, idx) => (
                            <BlogCard key={post.slug} post={post} index={idx} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-[var(--text-muted)] text-lg">No articles found matching your criteria.</p>
                        <button
                            onClick={() => { setSelectedTag('All'); setSearchQuery(''); }}
                            className="mt-4 text-[var(--orange)] font-bold hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlogIndex;
