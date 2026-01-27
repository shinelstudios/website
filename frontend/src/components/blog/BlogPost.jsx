import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getPostBySlug } from '../../lib/blog';
import { Calendar, Clock, ArrowLeft, Share2, Tag } from 'lucide-react';
import MetaTags, { BreadcrumbSchema } from '../MetaTags';

const BlogPost = () => {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await getPostBySlug(slug);
            setPost(data);
            setLoading(false);
            // Scroll to top
            window.scrollTo(0, 0);
        };
        load();
    }, [slug]);

    if (loading) return <div className="min-h-screen pt-32 text-center text-[var(--text-muted)]">Loading article...</div>;

    if (!post) return (
        <div className="min-h-screen pt-32 text-center">
            <h1 className="text-2xl font-bold mb-4">Article not found</h1>
            <Link to="/blog" className="text-[var(--orange)] font-bold hover:underline">Return to Blog</Link>
        </div>
    );

    const { frontmatter, content } = post;

    return (
        <div className="min-h-screen pt-24 pb-20 bg-[var(--surface)] text-[var(--text)]">
            <MetaTags
                title={`${frontmatter.title} | Shinel Studios Blog`}
                description={frontmatter.excerpt}
                image={frontmatter.coverImage}
            />

            {/* Breadcrumb Schema for SEO */}
            <BreadcrumbSchema items={[
                { name: 'Home', url: '/' },
                { name: 'Blog', url: '/blog' },
                { name: frontmatter.title, url: `/blog/${slug}` },
            ]} />

            <article className="container mx-auto px-4 max-w-4xl">
                {/* Back Link */}
                <Link to="/blog" className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--orange)] transition-colors mb-8 font-medium">
                    <ArrowLeft size={18} />
                    Back to Insights
                </Link>

                {/* Header */}
                <header className="mb-12">
                    <div className="flex flex-wrap gap-2 mb-6">
                        {frontmatter.tags?.map(tag => (
                            <span key={tag} className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--surface-alt)] text-[var(--orange)] border border-[var(--border)] uppercase tracking-wider">
                                {tag}
                            </span>
                        ))}
                    </div>

                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black font-heading mb-6 leading-tight">
                        {frontmatter.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-6 text-[var(--text-muted)] text-sm font-medium border-b border-[var(--border)] pb-8">
                        <span className="flex items-center gap-2">
                            <Calendar size={16} className="text-[var(--orange)]" />
                            {new Date(frontmatter.date).toLocaleDateString('en-US', { dateStyle: 'long' })}
                        </span>
                        {frontmatter.readingTime && (
                            <span className="flex items-center gap-2">
                                <Clock size={16} className="text-[var(--orange)]" />
                                {frontmatter.readingTime} min read
                            </span>
                        )}
                        <span className="flex items-center gap-2 ml-auto">
                            <Share2 size={16} />
                            Share
                        </span>
                    </div>
                </header>

                {/* Cover Image */}
                {frontmatter.coverImage && (
                    <div className="aspect-video w-full rounded-2xl overflow-hidden mb-16 shadow-2xl border border-[var(--border)]">
                        <img
                            src={frontmatter.coverImage}
                            alt={frontmatter.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Markdown Content */}
                <div className="prose prose-lg md:prose-xl max-w-none dark:prose-invert prose-headings:font-heading prose-headings:font-bold prose-a:text-[var(--orange)] prose-img:rounded-2xl">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                    </ReactMarkdown>
                </div>

                {/* Author Bio (Optional) */}
                <div className="mt-20 p-8 rounded-3xl bg-[var(--surface-alt)] border border-[var(--border)] flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-[var(--orange)] flex items-center justify-center text-white font-black text-2xl">
                        {frontmatter.author?.[0] || 'S'}
                    </div>
                    <div>
                        <div className="text-sm text-[var(--text-muted)] uppercase tracking-widest font-bold mb-1">Written by</div>
                        <div className="text-xl font-bold font-heading">{frontmatter.author || 'Shinel Studios Team'}</div>
                    </div>
                </div>
            </article>
        </div>
    );
};

export default BlogPost;
