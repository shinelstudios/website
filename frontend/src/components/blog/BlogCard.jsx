import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

const BlogCard = ({ post, index }) => {
    const { slug, frontmatter } = post;
    const { title, date, excerpt, coverImage, tags, readingTime } = frontmatter;

    return (
        <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="group relative flex flex-col h-full rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)] hover:border-[var(--orange)] transition-colors"
        >
            <Link to={`/blog/${slug}`} className="flex-1 flex flex-col">
                {/* Image */}
                <div className="aspect-[16/9] w-full overflow-hidden relative">
                    {coverImage ? (
                        <img
                            src={coverImage}
                            alt={title}
                            className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
                    )}

                    {/* Tags Overlay */}
                    <div className="absolute top-4 left-4 flex gap-2">
                        {tags?.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs font-bold px-2 py-1 rounded-full bg-black/60 text-white backdrop-blur-sm border border-white/10 uppercase tracking-wider">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-3 font-medium">
                        <span className="flex items-center gap-1">
                            <Calendar size={14} className="text-[var(--orange)]" />
                            {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {readingTime && (
                            <span className="flex items-center gap-1">
                                <Clock size={14} className="text-[var(--orange)]" />
                                {readingTime} min read
                            </span>
                        )}
                    </div>

                    <h3 className="text-xl font-bold font-heading mb-3 text-[var(--text)] group-hover:text-[var(--orange)] transition-colors line-clamp-2">
                        {title}
                    </h3>

                    <p className="text-sm text-[var(--text-muted)] leading-relaxed line-clamp-3 mb-6 flex-1">
                        {excerpt}
                    </p>

                    <div className="flex items-center text-sm font-bold text-[var(--orange)] gap-2 group/link">
                        Read Article
                        <ArrowRight size={16} className="group-hover/link:translate-x-1 transition-transform" />
                    </div>
                </div>
            </Link>
        </motion.article>
    );
};

export default BlogCard;
